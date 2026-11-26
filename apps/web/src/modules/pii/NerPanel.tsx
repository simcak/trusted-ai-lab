import { cs } from '../../i18n/cs.ts';
import { NER_MODEL } from '../../../../../evals/pii/ner-model.ts';
import { formatBytes } from './format.ts';
import { RUNTIME_WASM_BYTES, type NerProgress } from './ner/load-ner.ts';
import machine from '../../components/Machine/machine.module.css';
import styles from './pii.module.css';

export type NerState =
  | { status: 'idle' }
  | { status: 'loading'; progress: NerProgress | null }
  | { status: 'ready'; runtimeTransferBytes: number | undefined }
  | { status: 'error' };

interface Props {
  state: NerState;
  enabled: boolean;
  analysing: boolean;
  onLoad: () => void;
  onToggle: (enabled: boolean) => void;
}

export function NerPanel({ state, enabled, analysing, onLoad, onToggle }: Props) {
  const t = cs.pii.ner;
  return (
    <div className={machine.section}>
      <p>{t.intro}</p>

      {state.status === 'idle' && (
        <>
          <button type="button" className="button button--secondary" onClick={onLoad}>
            {t.load(formatBytes(NER_MODEL.downloadBytes))}
          </button>
          <p className={machine.small}>{t.downloadNote(formatBytes(RUNTIME_WASM_BYTES))}</p>
        </>
      )}

      {state.status === 'loading' && (
        <div role="status" aria-live="polite">
          <p>{t.loading}</p>
          {state.progress && (
            <>
              <progress max={state.progress.total} value={state.progress.loaded} />
              <p className={machine.small}>
                {t.progress(formatBytes(state.progress.loaded), formatBytes(state.progress.total))}
              </p>
            </>
          )}
        </div>
      )}

      {state.status === 'ready' && (
        <div>
          <p role="status">{t.ready}</p>
          {state.runtimeTransferBytes !== undefined && (
            <p className={machine.small}>
              {t.runtimeMeasured(formatBytes(state.runtimeTransferBytes))}
            </p>
          )}
          <label className={styles.checkbox}>
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => onToggle(e.currentTarget.checked)}
            />
            {t.use}
          </label>
          {enabled && analysing && <p className={machine.small}>{t.analysing}</p>}
        </div>
      )}

      {state.status === 'error' && (
        <p role="alert" className={styles.error}>
          {t.error}
        </p>
      )}

      <p className={machine.small}>
        {t.attribution}{' '}
        <a href={NER_MODEL.modelCard} rel="noreferrer">
          {NER_MODEL.id}
        </a>
        . {t.revision(NER_MODEL.revision.slice(0, 7))}
      </p>
    </div>
  );
}
