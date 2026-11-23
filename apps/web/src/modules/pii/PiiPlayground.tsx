import {
  DEFAULT_MIN_SCORE,
  MODES,
  pseudonymize,
  redact,
  type Finding,
  type Mode,
} from '@trusted-ai-lab/pii-cz';
import { useId, useMemo } from 'react';
import { cs } from '../../i18n/cs.ts';
import { FindingsTable } from './FindingsTable.tsx';
import { formatScore } from './format.ts';
import { HighlightedText } from './HighlightedText.tsx';
import { NerPanel, type NerState } from './NerPanel.tsx';
import { SAMPLE_IDS, type SampleId } from './samples.ts';
import styles from './pii.module.css';

interface Props {
  text: string;
  /** Text and findings that belong together (detection runs on a deferred copy of `text`). */
  analysed: { text: string; findings: readonly Finding[] };
  sample: SampleId | null;
  mode: Mode;
  ner: { state: NerState; enabled: boolean; analysing: boolean };
  onText: (text: string) => void;
  onSample: (id: SampleId) => void;
  onMode: (mode: Mode) => void;
  onNerLoad: () => void;
  onNerToggle: (enabled: boolean) => void;
}

export function PiiPlayground(props: Props) {
  const { text, analysed, sample, mode, ner } = props;
  const t = cs.pii.playground;
  const textareaId = useId();

  const output = useMemo(
    () =>
      mode === 'redact'
        ? redact(analysed.text, analysed.findings)
        : pseudonymize(analysed.text, analysed.findings).text,
    [mode, analysed],
  );

  return (
    <section className={styles.section} aria-labelledby="playground-heading">
      <h2 id="playground-heading">{t.heading}</h2>
      <p>{t.intro}</p>

      <div className={styles.samples} role="group" aria-label={t.samplesLabel}>
        <span className={styles.groupLabel}>{t.samplesLabel}</span>
        {SAMPLE_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="button button--secondary"
            aria-pressed={sample === id}
            onClick={() => props.onSample(id)}
          >
            {t.samples[id]}
          </button>
        ))}
      </div>

      <div className={styles.playground}>
        <div className={styles.inputColumn}>
          <label htmlFor={textareaId} className={styles.groupLabel}>
            {t.textareaLabel}
          </label>
          <textarea
            id={textareaId}
            className={styles.textarea}
            value={text}
            rows={12}
            spellCheck={false}
            onChange={(e) => props.onText(e.currentTarget.value)}
          />

          <fieldset className={styles.modes}>
            <legend className={styles.groupLabel}>{t.modeLegend}</legend>
            {MODES.map((m) => (
              <label key={m} className={styles.mode}>
                <input
                  type="radio"
                  name="pii-mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => props.onMode(m)}
                />
                <span>
                  <strong>{t.modes[m].label}</strong>
                  <span className={styles.small}>{t.modes[m].hint}</span>
                </span>
              </label>
            ))}
          </fieldset>

          <NerPanel
            state={ner.state}
            enabled={ner.enabled}
            analysing={ner.analysing}
            onLoad={props.onNerLoad}
            onToggle={props.onNerToggle}
          />
        </div>

        <div className={styles.outputColumn}>
          <h3>{t.highlightedHeading}</h3>
          <p className={styles.small} aria-live="polite">
            {t.count(analysed.findings.length)}
          </p>
          <HighlightedText text={analysed.text} findings={analysed.findings} />

          <h3>{t.outputHeading}</h3>
          <pre className={styles.textBox} data-testid="pii-output">
            {output}
          </pre>
        </div>
      </div>

      <h3>{t.findingsHeading}</h3>
      <p className={styles.small}>{t.minScoreNote(formatScore(DEFAULT_MIN_SCORE))}</p>
      <FindingsTable findings={analysed.findings} />
    </section>
  );
}
