import { MODES, type Finding, type Mode, type PiiType } from '@trusted-ai-lab/pii-cz';
import { useId, useMemo } from 'react';
import { InfoTip } from '../../components/InfoTip/InfoTip.tsx';
import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { envelope } from '../../pixel/sprites/hero.ts';
import { guardShield } from '../../pixel/sprites/icons.ts';
import type { Flow } from './flow.ts';
import { HighlightedText } from './HighlightedText.tsx';
import { TYPE_CATEGORY } from './labels.ts';
import type { NerState } from './NerPanel.tsx';
import { NerToggle } from './NerToggle.tsx';
import { RoundTrip } from './RoundTrip.tsx';
import { SAMPLE_IDS, type SampleId } from './samples.ts';
import { redactReplacements, segmentsFromReplacements } from './segments.ts';
import { SegmentText } from './SegmentText.tsx';
import machine from '../../components/Machine/machine.module.css';
import styles from './pii.module.css';

interface Props {
  text: string;
  /** Text and findings that belong together (detection runs on a deferred copy of `text`). */
  analysed: { text: string; findings: readonly Finding[] };
  flow: Flow;
  sample: SampleId | null;
  mode: Mode;
  editing: boolean;
  /** Changes when the machine should play its animation again (new sample, mode, edit done). */
  runKey: number;
  ner: { state: NerState; enabled: boolean; analysing: boolean };
  onText: (text: string) => void;
  onSample: (id: SampleId) => void;
  onMode: (mode: Mode) => void;
  onEditing: (editing: boolean) => void;
  /** Own text: unselects the sample and opens the editor. */
  onCustom: () => void;
  onNerLoad: () => void;
  onNerToggle: (enabled: boolean) => void;
}

/**
 * The tool as a three-step machine: your text with findings lit up → what the AI gets →
 * (in reversible mode) the reply restored in the browser. An envelope travels between the
 * steps each time the machine runs; while you type, it updates without animation.
 */
export function PiiMachine(props: Props) {
  const { analysed, flow, sample, mode, editing, runKey, ner } = props;
  const t = cs.pii.machine;
  const textareaId = useId();
  const reversible = mode === 'reversible';

  const masked = useMemo(
    () =>
      segmentsFromReplacements(
        analysed.text,
        mode === 'redact' ? redactReplacements(analysed.findings) : flow.replacements,
      ),
    [analysed, mode, flow],
  );

  return (
    <section className={styles.machine} aria-label={t.label}>
      <div className={machine.deck}>
        <div className={machine.group} role="group" aria-label={t.samplesLabel}>
          <span className={machine.groupLabel} aria-hidden="true">
            {t.samplesLabel}
          </span>
          <div className={machine.choices}>
            {SAMPLE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                className={machine.choice}
                aria-pressed={sample === id}
                onClick={() => props.onSample(id)}
              >
                {t.samples[id]}
              </button>
            ))}
            <button
              type="button"
              className={machine.choice}
              aria-pressed={sample === null}
              onClick={props.onCustom}
            >
              <span aria-hidden="true">✎ </span>
              {t.custom}
            </button>
          </div>
        </div>

        <fieldset className={machine.group}>
          <legend className={machine.groupLabel}>
            {t.modesLabel}
            <InfoTip label={t.modesTip} title={t.modesTip} icon="bulb">
              <dl className={machine.why}>
                {MODES.map((m) => (
                  <div key={m}>
                    <dt>{t.modes[m].label}</dt>
                    <dd>{t.modes[m].hint}</dd>
                  </div>
                ))}
              </dl>
            </InfoTip>
          </legend>
          <div className={machine.choices}>
            {MODES.map((m) => (
              <label key={m} className={machine.tile}>
                <input
                  type="radio"
                  name="pii-mode"
                  value={m}
                  checked={mode === m}
                  onChange={() => props.onMode(m)}
                />
                <span className={machine.tileLabel}>{t.modes[m].label}</span>
                <span className={styles.modeExample} data-mode={m} aria-hidden="true">
                  {t.modes[m].example}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <ol
        key={runKey}
        className={styles.pipeline}
        data-reversible={reversible ? '' : undefined}
        data-live={editing ? '' : undefined}
      >
        <li className={machine.panel} data-tone="sun">
          <header className={machine.panelHeader}>
            <span className={machine.stepNo}>1</span>
            <h2>{t.steps.input}</h2>
            <button
              type="button"
              className={machine.headerButton}
              aria-pressed={editing}
              onClick={() => props.onEditing(!editing)}
            >
              {editing ? t.done : `✎ ${t.edit}`}
            </button>
          </header>
          <div className={machine.panelBody}>
            {editing ? (
              <>
                <label htmlFor={textareaId} className="visually-hidden">
                  {t.textareaLabel}
                </label>
                <textarea
                  id={textareaId}
                  className={styles.textarea}
                  value={props.text}
                  rows={10}
                  spellCheck={false}
                  // Opened on request, so focusing it saves a click.
                  autoFocus
                  onChange={(e) => props.onText(e.currentTarget.value)}
                />
              </>
            ) : (
              <>
                <span className={styles.scan} aria-hidden="true" />
                <HighlightedText text={analysed.text} findings={analysed.findings} />
              </>
            )}
          </div>
          <footer className={machine.panelFooter}>
            <p className={machine.count} aria-live="polite">
              {t.found(analysed.findings.length)}
            </p>
            <TypeSummary findings={analysed.findings} />
            <NerToggle
              state={ner.state}
              enabled={ner.enabled}
              analysing={ner.analysing}
              onLoad={props.onNerLoad}
              onToggle={props.onNerToggle}
            />
          </footer>
        </li>

        <li className={machine.arrow} aria-hidden="true">
          <span className={machine.arrowStop}>
            <Sprite sprite={guardShield} scale={2} />
            <span>{t.guard}</span>
          </span>
          <span className={machine.traveller} data-leg="1">
            <Sprite sprite={envelope} scale={2} />
          </span>
        </li>

        <li className={machine.panel} data-tone="berry">
          <header className={machine.panelHeader}>
            <span className={machine.stepNo}>2</span>
            <h2>{t.steps.masked}</h2>
          </header>
          <div className={machine.panelBody}>
            <SegmentText
              segments={masked}
              variant={mode === 'redact' ? 'redact' : 'pseudonym'}
              testId="pii-output"
            />
          </div>
        </li>

        {reversible && (
          <>
            <li className={machine.arrow} aria-hidden="true">
              <span className={machine.arrowStop} data-stop="ai">
                <span className={styles.aiChip}>{t.ai}</span>
              </span>
              <span className={machine.traveller} data-leg="2">
                <Sprite sprite={envelope} scale={2} />
              </span>
            </li>
            <li className={machine.panel} data-tone="leaf">
              <header className={machine.panelHeader}>
                <span className={machine.stepNo}>3</span>
                <h2>{t.steps.reply}</h2>
              </header>
              <div className={machine.panelBody}>
                <RoundTrip flow={flow} />
              </div>
            </li>
          </>
        )}
      </ol>
    </section>
  );
}

/** "2× Jméno osoby · 1× Rodné číslo …" as chips in the category colours. */
function TypeSummary({ findings }: { findings: readonly Finding[] }) {
  const counts = new Map<PiiType, number>();
  for (const f of findings) counts.set(f.type, (counts.get(f.type) ?? 0) + 1);
  if (counts.size === 0) return <p className={machine.muted}>{cs.pii.machine.none}</p>;
  return (
    <ul className={styles.types}>
      {[...counts].map(([type, n]) => (
        <li key={type} className={styles.typeChip} data-category={TYPE_CATEGORY[type]}>
          {cs.pii.machine.typeCount(n, cs.pii.types[type])}
        </li>
      ))}
    </ul>
  );
}
