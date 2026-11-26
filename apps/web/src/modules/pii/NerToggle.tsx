import { InfoTip } from '../../components/InfoTip/InfoTip.tsx';
import { cs } from '../../i18n/cs.ts';
import { NER_MODEL } from '../../../../../evals/pii/ner-model.ts';
import { formatBytes } from './format.ts';
import { RUNTIME_WASM_BYTES } from './ner/load-ner.ts';
import type { NerState } from './NerPanel.tsx';
import styles from './pii.module.css';

interface Props {
  state: NerState;
  enabled: boolean;
  analysing: boolean;
  onLoad: () => void;
  onToggle: (enabled: boolean) => void;
}

/** The optional name model in one line: load it (size shown), then switch it on and off. */
export function NerToggle({ state, enabled, analysing, onLoad, onToggle }: Props) {
  const t = cs.pii.ner;
  return (
    <div className={styles.ner}>
      {state.status === 'idle' && (
        <button type="button" className={styles.linkButton} onClick={onLoad}>
          {t.toggle(formatBytes(NER_MODEL.downloadBytes))}
        </button>
      )}
      {state.status === 'loading' && (
        <span role="status" className={styles.small}>
          {state.progress
            ? t.progress(formatBytes(state.progress.loaded), formatBytes(state.progress.total))
            : t.loading}
        </span>
      )}
      {state.status === 'ready' && (
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => onToggle(e.currentTarget.checked)}
          />
          {t.toggleOn}
          {enabled && analysing && <span className={styles.small}>{t.analysing}</span>}
        </label>
      )}
      {state.status === 'error' && (
        <span role="alert" className={styles.error}>
          {t.error}
        </span>
      )}
      <InfoTip label={t.toggleOn} icon="bulb" title={t.toggleOn}>
        <p>{t.tip}</p>
        <p>{t.downloadNote(formatBytes(RUNTIME_WASM_BYTES))}</p>
        <p>
          {t.attribution}{' '}
          <a href={NER_MODEL.modelCard} rel="noreferrer">
            {NER_MODEL.id}
          </a>
        </p>
      </InfoTip>
    </div>
  );
}
