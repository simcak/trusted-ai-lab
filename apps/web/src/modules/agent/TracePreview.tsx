import {
  ReplayProvider,
  createTraceLog,
  withTracing,
  type LlmMessage,
} from '@trusted-ai-lab/llm-core';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { TracePanel } from '../../components/TracePanel/TracePanel.tsx';
import { cs } from '../../i18n/cs.ts';
import styles from './TracePreview.module.css';
import { PREVIEW_SCENARIO, previewRecording, previewScript } from './trace-preview.fixture.ts';

const dateFormat = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'long', timeZone: 'UTC' });
const messages: LlmMessage[] = [{ role: 'user', content: cs.tracePreview.userMessage }];

/** Component preview: fixture → ReplayProvider → withTracing → TracePanel. */
export function TracePreview() {
  const [log] = useState(() => createTraceLog());
  const [provider] = useState(() =>
    withTracing(new ReplayProvider([previewRecording], { delayMs: 300 }), log),
  );
  const events = useSyncExternalStore(log.subscribe, log.getSnapshot);
  const [running, setRunning] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    log.clear();
    setRunning(true);
    try {
      for (const item of previewScript) {
        if (item.kind === 'llm') {
          await provider.complete(
            {
              messages,
              context: {
                scenario: PREVIEW_SCENARIO,
                step: item.step,
                promptVersion: previewRecording.promptVersion,
              },
            },
            controller.signal,
          );
        } else {
          log.emit(item.event);
        }
      }
    } catch {
      // Failures are already recorded as `error` trace events by withTracing.
    } finally {
      if (controllerRef.current === controller) setRunning(false);
    }
  };

  const clear = () => {
    controllerRef.current?.abort();
    log.clear();
    setRunning(false);
  };

  return (
    <section className={styles.preview} aria-labelledby="trace-preview-heading">
      <h2 id="trace-preview-heading">{cs.tracePreview.heading}</h2>
      <p className={styles.badge} data-testid="fixture-badge">
        {cs.tracePreview.fixtureBadge}
      </p>
      <p>{cs.tracePreview.description}</p>

      <dl className={styles.provenance} aria-label={cs.tracePreview.provenance}>
        <div>
          <dt>{cs.tracePreview.model}</dt>
          <dd>
            <code>{previewRecording.model}</code>
          </dd>
        </div>
        <div>
          <dt>{cs.tracePreview.recordedAt}</dt>
          <dd>{dateFormat.format(new Date(previewRecording.recordedAt))}</dd>
        </div>
        <div>
          <dt>{cs.tracePreview.promptVersion}</dt>
          <dd>
            <code>{previewRecording.promptVersion}</code>
          </dd>
        </div>
      </dl>

      <div className={styles.actions}>
        <button type="button" className="button" onClick={() => void run()} disabled={running}>
          {running ? cs.tracePreview.running : cs.tracePreview.run}
        </button>
        <button
          type="button"
          className="button button--secondary"
          onClick={clear}
          disabled={events.length === 0 && !running}
        >
          {cs.tracePreview.clear}
        </button>
      </div>

      <TracePanel events={events} title={cs.tracePreview.panelTitle} headingLevel={3} />
    </section>
  );
}
