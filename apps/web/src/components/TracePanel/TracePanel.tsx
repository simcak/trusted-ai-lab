import type { TraceEvent } from '@trusted-ai-lab/llm-core';
import { useId, useMemo, useState } from 'react';
import { cs } from '../../i18n/cs.ts';
import styles from './TracePanel.module.css';

interface TracePanelProps {
  events: readonly TraceEvent[];
  title?: string;
  /** Heading level of the panel title, so it fits into the surrounding outline. */
  headingLevel?: 2 | 3;
}

type CopyStatus = 'copied' | 'failed';

const numberFormat = new Intl.NumberFormat('cs-CZ');
const formatMs = (ms: number) => `${numberFormat.format(Math.round(ms))} ms`;

/** Shared timeline of trace events (LLM calls, tool calls, policy decisions…) used by all modules. */
export function TracePanel({
  events,
  title = cs.trace.defaultTitle,
  headingLevel = 2,
}: TracePanelProps) {
  const headingId = useId();
  const Heading = headingLevel === 2 ? 'h2' : 'h3';
  const json = useMemo(() => JSON.stringify(events, null, 2), [events]);
  // Remember which JSON the status belongs to, so a stale "copied" never shows for newer events.
  const [copy, setCopy] = useState<{ status: CopyStatus; json: string } | null>(null);
  const copyStatus = copy?.json === json ? copy.status : null;

  const totals = useMemo(
    () =>
      events.reduce(
        (acc, e) => ({
          inputTokens: acc.inputTokens + (e.usage?.inputTokens ?? 0),
          outputTokens: acc.outputTokens + (e.usage?.outputTokens ?? 0),
          latencyMs: acc.latencyMs + (e.latencyMs ?? 0),
        }),
        { inputTokens: 0, outputTokens: 0, latencyMs: 0 },
      ),
    [events],
  );

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json);
      setCopy({ status: 'copied', json });
    } catch {
      setCopy({ status: 'failed', json });
    }
  };

  return (
    <section className={styles.panel} aria-labelledby={headingId} data-testid="trace-panel">
      <div className={styles.toolbar}>
        <Heading id={headingId} className={styles.title}>
          {title}
        </Heading>
        <button
          type="button"
          className="button button--secondary"
          onClick={() => void handleCopy()}
          disabled={events.length === 0}
        >
          {cs.trace.copy}
        </button>
      </div>

      <p className={styles.copyStatus} role="status" aria-live="polite">
        {copyStatus === 'copied' && cs.trace.copied}
        {copyStatus === 'failed' && cs.trace.copyFailed}
      </p>
      {copyStatus === 'failed' && (
        <textarea
          className={styles.manualCopy}
          readOnly
          value={json}
          aria-label={cs.trace.manualCopyLabel}
          onFocus={(e) => e.currentTarget.select()}
        />
      )}

      <dl className={styles.summary} aria-label={cs.trace.summary}>
        <div>
          <dt>{cs.trace.eventCount}</dt>
          <dd>{numberFormat.format(events.length)}</dd>
        </div>
        <div>
          <dt>{cs.trace.tokens}</dt>
          <dd>
            {numberFormat.format(totals.inputTokens)} / {numberFormat.format(totals.outputTokens)}
          </dd>
        </div>
        <div>
          <dt>{cs.trace.totalLatency}</dt>
          <dd>{formatMs(totals.latencyMs)}</dd>
        </div>
      </dl>

      {events.length === 0 ? (
        <p className={styles.empty}>{cs.trace.empty}</p>
      ) : (
        <ol className={styles.timeline}>
          {events.map((event) => (
            <TraceEventItem key={event.id} event={event} />
          ))}
        </ol>
      )}
    </section>
  );
}

function TraceEventItem({ event }: { event: TraceEvent }) {
  const isReplay = event.provider === 'replay';
  const hasDetails = event.input !== undefined || event.output !== undefined;

  return (
    <li className={styles.event} data-type={event.type} data-testid="trace-event">
      <div className={styles.eventHeader}>
        <span className={styles.seq}>#{event.seq}</span>
        <span className={styles.typeBadge} data-type={event.type}>
          {cs.trace.types[event.type]}
        </span>
        {event.name && <code className={styles.name}>{event.name}</code>}
        {event.step !== undefined && (
          <span className={styles.meta}>
            {cs.trace.step} {event.step}
          </span>
        )}
      </div>

      {event.policy && (
        <p className={styles.policy} data-decision={event.policy.decision}>
          <strong className={styles.decision}>{cs.trace.decisions[event.policy.decision]}</strong>
          <span>
            {cs.trace.rule}: <code>{event.policy.rule}</code>
          </span>
          <span className={styles.reason}>{event.policy.reason}</span>
        </p>
      )}

      {event.error && (
        <p className={styles.error}>
          <code>{event.error.name}</code>: {event.error.message}
        </p>
      )}

      {(event.usage || event.latencyMs !== undefined || event.model) && (
        <dl className={styles.metrics}>
          {event.usage && (
            <div>
              <dt>{cs.trace.tokens}</dt>
              <dd>
                {numberFormat.format(event.usage.inputTokens)} /{' '}
                {numberFormat.format(event.usage.outputTokens)}
              </dd>
            </div>
          )}
          {event.latencyMs !== undefined && (
            <div>
              <dt>{cs.trace.latency}</dt>
              <dd>
                {formatMs(event.latencyMs)}
                {isReplay && ` (${cs.trace.recordedSuffix})`}
              </dd>
            </div>
          )}
          {event.model && (
            <div>
              <dt>{cs.trace.model}</dt>
              <dd>
                <code>{event.model}</code>
              </dd>
            </div>
          )}
        </dl>
      )}

      {hasDetails && (
        <details className={styles.details}>
          <summary>{cs.trace.details}</summary>
          {event.input !== undefined && (
            <>
              <h4 className={styles.detailHeading}>{cs.trace.input}</h4>
              <pre className={styles.json}>{JSON.stringify(event.input, null, 2)}</pre>
            </>
          )}
          {event.output !== undefined && (
            <>
              <h4 className={styles.detailHeading}>{cs.trace.output}</h4>
              <pre className={styles.json}>{JSON.stringify(event.output, null, 2)}</pre>
            </>
          )}
        </details>
      )}
    </li>
  );
}
