import {
  estimateCost,
  evaluate,
  PRESET_IDS,
  PRESETS,
  type FactField,
  type IntakeInput,
  type PresetId,
} from '@trusted-ai-lab/intake-rules';
import { useMemo, useState } from 'react';
import { ModuleHeader } from '../../components/ModuleHeader/ModuleHeader.tsx';
import { StoryNav } from '../../components/StoryNav/StoryNav.tsx';
import { cs } from '../../i18n/cs.ts';
import { adrFileName, adrName, toAdrMarkdown } from './adr.ts';
import { downloadText } from './download.ts';
import { todayIso } from './format.ts';
import { IntakeForm } from './IntakeForm.tsx';
import { IntakeResult } from './IntakeResult.tsx';
import { PRICING } from './pricing.ts';
import styles from './intake.module.css';

const INITIAL_PRESET: PresetId = 'fee-calculation';

const fromPreset = (id: PresetId): IntakeInput => ({
  ...PRESETS[id],
  description: cs.intake.presets[id].description,
});

export default function IntakePage() {
  const [input, setInput] = useState<IntakeInput>(() => fromPreset(INITIAL_PRESET));
  const [preset, setPreset] = useState<PresetId | null>(INITIAL_PRESET);

  const result = useMemo(() => evaluate(input), [input]);
  const cost = useMemo(
    () => estimateCost(result.pattern, input.volume, input.latency, PRICING),
    [result.pattern, input.volume, input.latency],
  );

  const t = cs.intake;

  const choosePreset = (id: PresetId) => {
    setInput(fromPreset(id));
    setPreset(id);
  };
  const update = (patch: Partial<IntakeInput>) => {
    setInput((prev) => ({ ...prev, ...patch }));
    setPreset(null);
  };
  const download = () => {
    const date = todayIso();
    const name = adrName(input.description, preset ? t.presets[preset].label : null);
    const markdown = toAdrMarkdown({ name, input, result, cost, pricing: PRICING, date });
    downloadText(adrFileName(name, date), markdown);
  };

  return (
    <article className={styles.page}>
      <ModuleHeader id="intake">
        <p className={styles.notice}>{t.notice}</p>
      </ModuleHeader>

      <div className={styles.workspace}>
        <div className={styles.presets} role="group" aria-label={t.presetsLabel}>
          <span className={styles.groupLabel}>{t.presetsLabel}</span>
          {PRESET_IDS.map((id) => (
            <button
              key={id}
              type="button"
              className="button button--secondary"
              aria-pressed={preset === id}
              onClick={() => choosePreset(id)}
            >
              {t.presets[id].label}
            </button>
          ))}
        </div>

        <section className={styles.formColumn} aria-labelledby="intake-form-heading">
          <h2 id="intake-form-heading">{t.formHeading}</h2>
          <IntakeForm
            input={input}
            onField={(field: FactField, value) => update({ [field]: value })}
            onDescription={(description) => update({ description })}
          />
        </section>

        <IntakeResult
          input={input}
          result={result}
          cost={cost}
          pricing={PRICING}
          today={todayIso()}
          onDownload={download}
        />
      </div>

      <StoryNav id="intake" />
    </article>
  );
}
