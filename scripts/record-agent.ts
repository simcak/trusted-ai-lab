/**
 * Records the agent scenarios with the real model (CLAUDE.md rule 6), or checks the recordings.
 *
 *   pnpm record:agent                                    # all 12 runs: 6 scenarios × guardrails on/off
 *   pnpm record:agent --only s1-bezny-dotaz --guardrails on
 *   pnpm record:agent --approve all                      # approvals without asking (decidedBy: flag)
 *   pnpm record:agent --check                            # offline: replay every recording, verify hashes
 *
 * Recording reads ANTHROPIC_API_KEY from .env.local (see .env.example) and never prints it.
 * Each run goes through exactly the code the web page replays: runAgent + policy + tools + pii-cz,
 * with createAnthropicProvider as the model. A run that fails writes nothing.
 * The check runs in CI (`pnpm evals:check`) without network and without a key.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createInterface } from 'node:readline/promises';
import { parseArgs } from 'node:util';
import {
  AGENT_EFFORT,
  AGENT_MAX_TOKENS,
  AGENT_MODEL,
  AgentRecordingSchema,
  DEFAULT_POLICY,
  FundsFileSchema,
  PROMPT_VERSION,
  SCENARIOS,
  SCENARIO_IDS,
  createRecorder,
  recordingFileName,
  replayRecording,
  runAgent,
  runKey,
  type AgentRecording,
  type ApprovalOutcome,
  type ApprovalRequest,
  type RecordedApproval,
  type ScenarioId,
} from '@trusted-ai-lab/agent-runtime';
import { createTraceLog, type LlmUsage } from '@trusted-ai-lab/llm-core';
import { z } from 'zod';

const root = resolve(import.meta.dirname, '..');
export const RECORDINGS_DIR = resolve(root, 'evals/agent/recordings');
const ENV_FILE = resolve(root, '.env.local');
const funds = FundsFileSchema.parse(
  JSON.parse(readFileSync(resolve(root, 'data/funds.json'), 'utf8')),
).funds;

interface Run {
  id: ScenarioId;
  guardrails: boolean;
}

const ALL_RUNS: Run[] = SCENARIO_IDS.flatMap((id) => [
  { id, guardrails: true },
  { id, guardrails: false },
]);

const PRICING_NAMES: Record<string, string> = { 'claude-sonnet-5-5': 'Claude Sonnet 5.5' };

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

// --check ----------------------------------------------------------------------------------------

async function check(): Promise<void> {
  const files = existsSync(RECORDINGS_DIR)
    ? readdirSync(RECORDINGS_DIR).filter((f) => f.endsWith('.json'))
    : [];
  if (files.length === 0) {
    console.warn('record-agent --check: zatím žádné nahrávky (spusť pnpm record:agent).');
    return;
  }
  const seen = new Set<string>();
  for (const file of files.sort()) {
    const recording = AgentRecordingSchema.parse(
      JSON.parse(readFileSync(resolve(RECORDINGS_DIR, file), 'utf8')),
    );
    const { scenarioId, guardrails } = recording.run;
    if (file !== recordingFileName(scenarioId, guardrails)) {
      fail(`${file}: název neodpovídá běhu ${runKey(scenarioId, guardrails)}`);
    }
    if (recording.scenario !== runKey(scenarioId, guardrails) || recording.kind !== 'recorded') {
      fail(`${file}: scenario musí být ${runKey(scenarioId, guardrails)} a kind „recorded“`);
    }
    try {
      await replayRecording(recording, { funds, log: createTraceLog(), verifyRequest: true });
    } catch (err) {
      fail(
        `${file}: přehrání selhalo (${err instanceof Error ? `${err.name}: ${err.message}` : String(err)}).\n` +
          'Kód od nahrání posílá modelu něco jiného. Nahraj scénář znovu: pnpm record:agent --only ' +
          `${scenarioId} --guardrails ${guardrails ? 'on' : 'off'}`,
      );
    }
    seen.add(file);
  }
  const missing = ALL_RUNS.map((r) => recordingFileName(r.id, r.guardrails)).filter(
    (f) => !seen.has(f),
  );
  if (missing.length > 0) {
    fail(`record-agent --check: chybí nahrávky ${missing.join(', ')} (spusť pnpm record:agent).`);
  }
  console.log(`record-agent --check: ${seen.size} nahrávek odpovídá kódu.`);
}

// recording --------------------------------------------------------------------------------------

type ApproveMode = 'ask' | 'all' | 'none';

async function askAuthor(request: ApprovalRequest): Promise<ApprovalOutcome> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log(`\n  Schválení: ${request.toolName} (krok ${request.step})`);
    console.log(`  Komu:     ${request.draft.toRole}`);
    console.log(`  Předmět:  ${request.draft.subject}`);
    console.log(`  Text:\n${request.draft.body.replace(/^/gm, '    ')}\n`);
    for (;;) {
      const answer = (await rl.question('  Schválit koncept? [a/n] ')).trim().toLowerCase();
      if (answer === 'a') return { decision: 'approved', decidedBy: 'author' };
      if (answer === 'n') return { decision: 'rejected', decidedBy: 'author' };
    }
  } finally {
    rl.close();
  }
}

function costUsd(usage: LlmUsage): number | null {
  const Pricing = z.object({
    providers: z.array(
      z.object({
        id: z.string(),
        models: z.array(
          z.object({ model: z.string(), inputUsd: z.number(), outputUsd: z.number() }),
        ),
      }),
    ),
  });
  const pricing = Pricing.parse(
    JSON.parse(readFileSync(resolve(root, 'data/pricing.json'), 'utf8')),
  );
  const price = pricing.providers
    .find((p) => p.id === 'anthropic')
    ?.models.find((m) => m.model === PRICING_NAMES[AGENT_MODEL]);
  if (!price) return null;
  return (usage.inputTokens * price.inputUsd + usage.outputTokens * price.outputUsd) / 1_000_000;
}

async function record(runs: readonly Run[], approveMode: ApproveMode): Promise<void> {
  if (existsSync(ENV_FILE)) process.loadEnvFile(ENV_FILE);
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) fail('Chybí ANTHROPIC_API_KEY. Zkopíruj .env.example do .env.local a vlož klíč.');
  if (approveMode === 'ask' && !process.stdin.isTTY) {
    fail('Schvalování se ptá v terminálu. Bez terminálu použij --approve all nebo --approve none.');
  }

  // Imported only here: --check (CI) never loads the SDK.
  const { createAnthropicProvider } = await import('@trusted-ai-lab/llm-core/anthropic');
  const model = createAnthropicProvider({
    model: AGENT_MODEL,
    browser: false,
    apiKey,
    effort: AGENT_EFFORT,
    maxTokens: AGENT_MAX_TOKENS,
    fallbacks: 'default',
  });
  mkdirSync(RECORDINGS_DIR, { recursive: true });

  const total: LlmUsage = { inputTokens: 0, outputTokens: 0 };
  let calls = 0;
  console.log(`Nahrávám ${runs.length} běhů modelem ${AGENT_MODEL} (effort ${AGENT_EFFORT}).`);

  for (const { id, guardrails } of runs) {
    const scenario = SCENARIOS[id];
    const key = runKey(id, guardrails);
    const recorder = createRecorder(model);
    const approvals: RecordedApproval[] = [];
    const startedAt = new Date();
    process.stdout.write(`\n${key} … `);

    const result = await runAgent({
      provider: recorder.provider,
      log: createTraceLog(),
      funds,
      persona: scenario.persona,
      guardrails,
      userMessage: scenario.userMessage,
      ...(scenario.faults && { faults: scenario.faults }),
      ...(guardrails && { policy: DEFAULT_POLICY }),
      scenario: key,
      today: startedAt,
      approve: async (request) => {
        const outcome: ApprovalOutcome =
          approveMode === 'ask'
            ? await askAuthor(request)
            : { decision: approveMode === 'all' ? 'approved' : 'rejected', decidedBy: 'flag' };
        approvals.push({
          toolName: request.toolName,
          decision: outcome.decision,
          decidedBy: outcome.decidedBy === 'author' ? 'author' : 'flag',
        });
        return outcome;
      },
    }).catch((err: unknown) =>
      fail(
        `\n${key}: běh selhal, nic se nezapsalo (${err instanceof Error ? err.message : String(err)}).`,
      ),
    );

    const recording: AgentRecording = AgentRecordingSchema.parse({
      schemaVersion: 2,
      kind: 'recorded',
      scenario: key,
      model: AGENT_MODEL,
      recordedAt: startedAt.toISOString(),
      promptVersion: PROMPT_VERSION,
      steps: recorder.steps,
      run: {
        scenarioId: id,
        guardrails,
        persona: scenario.persona,
        provider: model.id,
        effort: AGENT_EFFORT,
        ...(guardrails && { policy: DEFAULT_POLICY }),
      },
      approvals,
    });
    // The recording must replay exactly before it is written.
    await replayRecording(recording, { funds, log: createTraceLog(), verifyRequest: true });
    writeFileSync(
      resolve(RECORDINGS_DIR, recordingFileName(id, guardrails)),
      `${JSON.stringify(recording, null, 2)}\n`,
    );

    calls += result.modelCalls;
    total.inputTokens += result.usage.inputTokens;
    total.outputTokens += result.usage.outputTokens;
    const served = [...new Set(recording.steps.map((s) => s.response.model))].join(', ') || '—';
    console.log(
      `${result.status}${result.stoppedBy ? ` (${result.stoppedBy})` : ''}, ` +
        `${result.modelCalls} volání, ${result.usage.inputTokens} / ${result.usage.outputTokens} tokenů, model ${served}`,
    );
  }

  const cost = costUsd(total);
  console.log(
    `\nHotovo: ${calls} volání modelu, ${total.inputTokens} vstupních / ${total.outputTokens} výstupních tokenů` +
      (cost === null ? '.' : `, přibližně ${cost.toFixed(2)} USD podle data/pricing.json.`),
  );
  console.log(`Nahrávky: ${RECORDINGS_DIR}`);
}

// cli --------------------------------------------------------------------------------------------

if (import.meta.main) {
  const { values } = parseArgs({
    options: {
      check: { type: 'boolean', default: false },
      only: { type: 'string', multiple: true },
      guardrails: { type: 'string' },
      approve: { type: 'string', default: 'ask' },
    },
  });
  if (values.check) {
    await check();
  } else {
    const only = values.only ?? [];
    for (const id of only) {
      if (!(SCENARIO_IDS as readonly string[]).includes(id)) {
        fail(`Neznámý scénář „${id}“. Platné: ${SCENARIO_IDS.join(', ')}`);
      }
    }
    if (values.guardrails !== undefined && !['on', 'off'].includes(values.guardrails)) {
      fail('--guardrails musí být on nebo off.');
    }
    if (!['ask', 'all', 'none'].includes(values.approve))
      fail('--approve musí být ask, all nebo none.');
    const runs = ALL_RUNS.filter(
      (r) =>
        (only.length === 0 || only.includes(r.id)) &&
        (values.guardrails === undefined || r.guardrails === (values.guardrails === 'on')),
    );
    await record(runs, values.approve as ApproveMode);
  }
}
