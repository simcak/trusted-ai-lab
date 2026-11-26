import {
  isToolName,
  PERSONA_TOOLS,
  TOOL_NAMES,
  type Persona,
  type RunStatus,
  type ToolName,
} from '@trusted-ai-lab/agent-runtime';
import type { TraceEvent } from '@trusted-ai-lab/llm-core';
import { cs } from '../../../i18n/cs.ts';

/** Who acts in a row of the run lane. */
export type Actor = 'user' | 'model' | 'rules' | 'tools';
export type BeatTone = 'user' | 'model' | 'ok' | 'block' | 'wait' | 'pii' | 'tool' | 'end';
export type BeatIcon = 'person' | 'robot' | 'shield' | 'lock' | ToolName | 'flag';

export interface Beat {
  /** Id of the trace event the row comes from. */
  id: string;
  actor: Actor;
  tone: BeatTone;
  icon: BeatIcon;
  text: string;
  /** Small chips next to the text (placeholders). */
  chips?: string[];
  /** Small print (tokens). */
  note?: string;
  /** A tool call the rules let through first: the row spans rules → tools. */
  checked?: boolean;
  /** The last row: how the run ended. */
  status?: RunStatus;
}

interface Pending extends Beat {
  /** `step:tool` of a check that runs on the tool's output; the tool row goes before it. */
  after?: string;
}

const t = cs.agent.beats;
const integer = new Intl.NumberFormat('cs-CZ');

const toolNames = (names: readonly string[]) => {
  const counts = new Map<string, number>();
  for (const n of names) counts.set(n, (counts.get(n) ?? 0) + 1);
  return [...counts]
    .map(([n, k]) => {
      const label = isToolName(n) ? t.toolName[n] : n;
      return k > 1 ? `${label} ×${k}` : label;
    })
    .join(', ');
};

const record = (value: unknown): Record<string, unknown> =>
  typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};

/**
 * The trace as rows of a sequence diagram. Texts come only from structured fields (rule ids,
 * decisions, tool names, counts), never from what the model wrote. Unknown events still get a
 * row, so nothing in the trace disappears from the lane.
 */
export function toBeats(events: readonly TraceEvent[]): Beat[] {
  const beats: Pending[] = [];
  let persona: Persona = 'klient';
  /** Tools whose next call already passed the rules (allowlist or a human approval). */
  const passed = new Set<string>();

  for (const e of events) {
    const out = record(e.output);
    const base = { id: e.id };

    if (e.type === 'info' && e.name === 'run_start') {
      const input = record(e.input);
      if (input.persona === 'poradce' || input.persona === 'klient') persona = input.persona;
      beats.push({ ...base, actor: 'user', tone: 'user', icon: 'person', text: t.start[persona] });
      continue;
    }

    if (e.type === 'info' && e.name === 'run_end') {
      const status = out.status as RunStatus | undefined;
      const usage = record(out.usage);
      const tokens = Number(usage.inputTokens ?? 0) + Number(usage.outputTokens ?? 0);
      beats.push({
        ...base,
        actor: 'user',
        tone: 'end',
        icon: 'flag',
        text: status ? cs.agent.result.status[status] : t.other,
        note: t.summary(Number(out.modelCalls ?? 0), integer.format(tokens)),
        ...(status && { status }),
      });
      continue;
    }

    if (e.type === 'llm_call') {
      const calls = Array.isArray(out.toolCalls) ? (out.toolCalls as { name?: unknown }[]) : [];
      const names = calls.map((c) => String(c.name));
      const tokens = e.usage ? e.usage.inputTokens + e.usage.outputTokens : undefined;
      beats.push({
        ...base,
        actor: 'model',
        tone: 'model',
        icon: 'robot',
        text: names.length > 0 ? t.wants(toolNames(names)) : t.answers,
        ...(tokens !== undefined && { note: t.tokens(integer.format(tokens)) }),
      });
      continue;
    }

    if (e.type === 'tool_call') {
      const name = e.name ?? '';
      const tool = isToolName(name) ? name : undefined;
      const ok = out.ok !== false;
      const row: Pending = {
        ...base,
        actor: 'tools',
        tone: ok ? 'tool' : 'block',
        icon: tool ?? 'shield',
        text: ok ? (tool ? t.tool[tool] : name) : t.toolError(tool ? t.toolName[tool] : name),
        ...(passed.has(name) && { checked: true }),
      };
      passed.delete(name);
      // Checks on the tool's output are traced before the call itself; show them after it.
      const key = `${e.step ?? ''}:${name}`;
      let at = beats.length;
      while (at > 0 && beats[at - 1]?.after === key) at -= 1;
      beats.splice(at, 0, row);
      continue;
    }

    if (e.type === 'pii') {
      const rawTarget = record(e.input).target;
      const target = typeof rawTarget === 'string' ? rawTarget : '';
      if (e.name === 'reidentify') {
        beats.push({
          ...base,
          actor: 'rules',
          tone: 'pii',
          icon: 'lock',
          text: t.restored(Number(out.restored ?? 0)),
        });
      } else {
        const placeholders = Array.isArray(out.placeholders) ? out.placeholders.map(String) : [];
        const fromTool = target.startsWith('tool_output:');
        beats.push({
          ...base,
          actor: 'rules',
          tone: 'pii',
          icon: 'lock',
          text: (fromTool ? t.maskedTool : t.masked)(Number(out.replaced ?? 0)),
          ...(placeholders.length > 0 && { chips: placeholders }),
          ...(fromTool && { after: `${e.step ?? ''}:${target.slice('tool_output:'.length)}` }),
        });
      }
      continue;
    }

    if (e.type === 'policy_decision' && e.policy) {
      const { rule, decision } = e.policy;
      const name = e.name ?? rule;
      const tool = isToolName(name) ? t.toolName[name] : name;
      const block = (text: string, after?: string): Pending => ({
        ...base,
        actor: 'rules',
        tone: 'block',
        icon: 'shield',
        text,
        ...(after && { after }),
      });
      const key = `${e.step ?? ''}:${name}`;

      if (rule === 'tool-allowlist' && name === rule) {
        const hidden = TOOL_NAMES.filter((n) => !PERSONA_TOOLS[persona].includes(n));
        beats.push(
          decision === 'modify' && hidden.length > 0
            ? block(t.toolsHidden(toolNames(hidden)))
            : { ...base, actor: 'rules', tone: 'ok', icon: 'shield', text: t.toolsOffered },
        );
      } else if (rule === 'tool-allowlist' && decision === 'allow') {
        passed.add(name);
      } else if (rule === 'tool-allowlist') {
        beats.push(block(t.denied(tool)));
      } else if (rule === 'tool-args') {
        beats.push(block(t.badArgs(tool)));
      } else if (rule === 'loop-detection') {
        beats.push(block(t.loop, key));
      } else if (rule === 'step-budget' || rule === 'token-budget') {
        beats.push(block(t.budget));
      } else if (rule === 'content-advice') {
        beats.push(block(decision === 'deny' ? t.adviceRefused : t.adviceRemoved));
      } else if (rule === 'prompt-injection') {
        beats.push(block(t.injection, key));
      } else if (rule === 'human-approval') {
        if (decision === 'require_approval') {
          beats.push({
            ...base,
            actor: 'user',
            tone: 'wait',
            icon: 'person',
            text: t.approvalWait,
          });
        } else if (decision === 'allow') {
          passed.add(name);
          beats.push({ ...base, actor: 'user', tone: 'ok', icon: 'person', text: t.approved });
        } else {
          beats.push({ ...base, actor: 'user', tone: 'block', icon: 'person', text: t.rejected });
        }
      } else {
        beats.push({
          ...base,
          actor: 'rules',
          tone: decision === 'allow' ? 'ok' : 'block',
          icon: 'shield',
          text: t.other,
        });
      }
      continue;
    }

    if (e.type === 'error') {
      beats.push({ ...base, actor: 'model', tone: 'block', icon: 'robot', text: t.error });
      continue;
    }

    beats.push({ ...base, actor: 'rules', tone: 'ok', icon: 'shield', text: t.other });
  }

  return beats.map(({ after: _after, ...beat }) => beat);
}

/** Persona and guardrails of the traced run (also for live runs, where the page does not know). */
export function runSetup(events: readonly TraceEvent[]): {
  persona?: Persona;
  guardrails?: boolean;
} {
  const input = record(events.find((e) => e.type === 'info' && e.name === 'run_start')?.input);
  return {
    ...((input.persona === 'klient' || input.persona === 'poradce') && { persona: input.persona }),
    ...(typeof input.guardrails === 'boolean' && { guardrails: input.guardrails }),
  };
}
