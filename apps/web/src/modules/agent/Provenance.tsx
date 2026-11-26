import type { AgentRecording } from '@trusted-ai-lab/agent-runtime';
import { InfoTip } from '../../components/InfoTip/InfoTip.tsx';
import machine from '../../components/Machine/machine.module.css';
import { cs } from '../../i18n/cs.ts';
import styles from './agent.module.css';

const dateFormat = new Intl.DateTimeFormat('cs-CZ', { dateStyle: 'long', timeZone: 'UTC' });

/** Where the model's answers come from: a chip that stays visible, the details on demand. */
export function Provenance({ recording }: { recording: AgentRecording }) {
  const t = cs.agent.provenance;
  if (recording.steps.length === 0) {
    return (
      <p className={styles.provenance} data-kind="none" data-testid="agent-provenance">
        {t.noModel}
      </p>
    );
  }
  const models = [...new Set(recording.steps.map((s) => s.response.model))];
  return (
    <div className={styles.provenanceRow}>
      <p className={styles.provenance} data-kind={recording.kind} data-testid="agent-provenance">
        {recording.kind === 'recorded' ? t.recorded : t.fixture}
      </p>
      <InfoTip label={t.details} title={t.label}>
        <dl className={machine.why}>
          <div>
            <dt>{t.model}</dt>
            <dd>
              <code>{models.join(', ')}</code>
            </dd>
          </div>
          <div>
            <dt>{t.provider}</dt>
            <dd>{t.providers[recording.run.provider]}</dd>
          </div>
          <div>
            <dt>{t.recordedAt}</dt>
            <dd>{dateFormat.format(new Date(recording.recordedAt))}</dd>
          </div>
          <div>
            <dt>{t.promptVersion}</dt>
            <dd>
              <code>{recording.promptVersion}</code>
            </dd>
          </div>
        </dl>
        {recording.run.provider === 'claude-code' && <p>{t.claudeCodeNote}</p>}
      </InfoTip>
    </div>
  );
}
