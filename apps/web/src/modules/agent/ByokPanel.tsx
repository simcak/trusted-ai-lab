import {
  AGENT_MODEL,
  PERSONAS,
  SCENARIOS,
  runAgent,
  type AgentRunResult,
  type Persona,
} from '@trusted-ai-lab/agent-runtime';
import type { LlmProvider } from '@trusted-ai-lab/llm-core';
import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { key as keyIcon } from '../../pixel/sprites/actors.ts';
import styles from './agent.module.css';
import { createByokProvider } from './byok.ts';
import { FUNDS } from './funds.ts';
import type { RunContext, RunKind } from './useAgentRun.ts';

const DOCS_URL =
  'https://platform.claude.com/docs/en/manage-claude/authentication#browser-based-applications';

interface Props {
  running: boolean;
  start: (
    kind: RunKind,
    userMessage: string,
    job: (ctx: RunContext) => Promise<AgentRunResult>,
  ) => Promise<void>;
}

/**
 * Optional live mode. The key is read from the input only when a run starts and lives inside the
 * provider object, kept in a ref: never in React state, storage, the URL or the trace.
 */
export function ByokPanel({ running, start }: Props) {
  const t = cs.agent.byok;
  const ids = { key: useId(), query: useId() };
  const keyRef = useRef<HTMLInputElement>(null);
  const providerRef = useRef<{ key: string; provider: LlmProvider } | null>(null);
  const [query, setQuery] = useState(SCENARIOS['s1-bezny-dotaz'].userMessage);
  const [persona, setPersona] = useState<Persona>('klient');
  const [guardrails, setGuardrails] = useState(true);

  // Leaving the page drops the provider and with it the key.
  useEffect(
    () => () => {
      providerRef.current = null;
    },
    [],
  );

  const forget = () => {
    providerRef.current = null;
    if (keyRef.current) keyRef.current.value = '';
  };

  // The SDK chunk is loaded inside the run, so a failed download shows up like any run error.
  const providerFor = async (key: string): Promise<LlmProvider> => {
    if (providerRef.current?.key !== key) {
      providerRef.current = { key, provider: await createByokProvider(key) };
    }
    return providerRef.current.provider;
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const key = keyRef.current?.value.trim() ?? '';
    const userMessage = query.trim();
    if (!key || !userMessage) return;
    void start('live', userMessage, async ({ log, signal, approve }) =>
      runAgent({
        provider: await providerFor(key),
        log,
        funds: FUNDS,
        persona,
        guardrails,
        userMessage,
        approve: (request) => approve(request),
        scenario: `byok/${guardrails ? 'on' : 'off'}`,
        signal,
      }),
    );
  };

  return (
    <details className={styles.byok} data-testid="byok-panel">
      <summary>
        <Sprite sprite={keyIcon} scale={2} className={styles.summaryIcon} />
        {t.summary}
      </summary>
      <p>{t.intro}</p>
      <ul className={styles.warnings}>
        {t.warnings.map((w) => (
          <li key={w}>{w}</li>
        ))}
      </ul>
      <p className={styles.small}>
        <a href={DOCS_URL} target="_blank" rel="noreferrer">
          {t.sourceLink}
        </a>
      </p>

      <form className={styles.byokForm} onSubmit={submit}>
        <label htmlFor={ids.key}>{t.keyLabel}</label>
        <input
          id={ids.key}
          ref={keyRef}
          className={styles.input}
          type="password"
          autoComplete="off"
          spellCheck={false}
          required
        />

        <label htmlFor={ids.query}>{t.queryLabel}</label>
        <textarea
          id={ids.query}
          className={styles.textarea}
          value={query}
          maxLength={1000}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />

        <div className={styles.toggles}>
          <fieldset className={styles.inlineRadios}>
            <legend className={styles.groupLabel}>{t.personaLegend}</legend>
            {PERSONAS.map((p) => (
              <label key={p}>
                <input
                  type="radio"
                  name="byok-persona"
                  checked={persona === p}
                  onChange={() => setPersona(p)}
                />
                {cs.agent.run.personas[p]}
              </label>
            ))}
          </fieldset>
          <fieldset className={styles.inlineRadios}>
            <legend className={styles.groupLabel}>{cs.agent.run.guardrailsLegend}</legend>
            {[true, false].map((on) => (
              <label key={String(on)}>
                <input
                  type="radio"
                  name="byok-guardrails"
                  checked={guardrails === on}
                  onChange={() => setGuardrails(on)}
                />
                {on ? cs.agent.run.guardrailsOn : cs.agent.run.guardrailsOff}
              </label>
            ))}
          </fieldset>
        </div>

        <p className={styles.small}>{t.model(AGENT_MODEL)}</p>
        <div className={styles.actions}>
          <button type="submit" className="button" disabled={running}>
            {running ? cs.agent.run.running : t.start}
          </button>
          <button type="button" className="button button--secondary" onClick={forget}>
            {t.forget}
          </button>
        </div>
      </form>
    </details>
  );
}
