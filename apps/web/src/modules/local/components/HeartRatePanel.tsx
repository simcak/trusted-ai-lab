import { InfoTip } from '../../../components/InfoTip/InfoTip.tsx';
import machine from '../../../components/Machine/machine.module.css';
import { cs } from '../../../i18n/cs.ts';
import { estimateMaxHr, type TrimpCoefficient } from '../activity/heart-rate.ts';
import { clamp, type HeartRateForm } from '../heart-rate-form.ts';
import { formatDuration } from '../format.ts';
import styles from '../local.module.css';

/** Time in heart-rate zones as one coloured bar with a short legend. */
export function ZonesBar({ zonesS }: { zonesS: number[] | null }) {
  const t = cs.local.hr;
  const total = zonesS?.reduce((a, b) => a + b, 0) ?? 0;
  if (!zonesS || total === 0) return null;
  return (
    <figure className={styles.zones}>
      <figcaption className={styles.zonesCaption}>{t.zonesLabel}</figcaption>
      <div className={styles.zonesBar} aria-hidden="true">
        {zonesS.map((s, zone) =>
          s > 0 ? (
            <span key={zone} style={{ flexGrow: s, background: `var(--zone-${zone})` }} />
          ) : null,
        )}
      </div>
      <ul className={styles.zonesLegend}>
        {zonesS.map((s, zone) =>
          s > 0 ? (
            <li key={zone} title={`${t.zone(zone)} (${t.zoneNames[zone]}): ${formatDuration(s)}`}>
              <span className={styles.swatch} style={{ background: `var(--zone-${zone})` }} />
              {t.zone(zone)} {Math.round((100 * s) / total)} %
            </li>
          ) : null,
        )}
      </ul>
    </figure>
  );
}

interface Props {
  form: HeartRateForm;
  onForm: (f: HeartRateForm) => void;
  isSample: boolean;
}

/** Heart-rate settings behind a small button: max and resting rate, the TRIMP formula. */
export function HeartRateSettings({ form, onForm, isSample }: Props) {
  const t = cs.local.hr;
  const m = cs.local.machine;
  const set = (patch: Partial<HeartRateForm>) => onForm({ ...form, ...patch });

  return (
    <InfoTip
      bare
      label={m.settingsTitle}
      title={m.settingsTitle}
      text={`⚙ ${m.settings}`}
      role="dialog"
      className={machine.headerButton}
    >
      <p className={styles.small}>{t.intro}</p>
      <fieldset className={styles.settings}>
        <legend className="visually-hidden">{t.settings}</legend>
        {isSample && <p className={styles.small}>{t.sampleValues}</p>}
        <div className={styles.fields}>
          {form.useAge ? (
            <label className={styles.field}>
              {t.age}
              <input
                type="number"
                min={10}
                max={100}
                value={form.age}
                onChange={(e) => set({ age: e.currentTarget.valueAsNumber })}
              />
            </label>
          ) : (
            <label className={styles.field}>
              {t.maxHr}
              <input
                type="number"
                min={120}
                max={240}
                value={form.maxHr}
                onChange={(e) => set({ maxHr: e.currentTarget.valueAsNumber })}
              />
            </label>
          )}
          <label className={styles.field}>
            {t.restHr}
            <input
              type="number"
              min={30}
              max={120}
              value={form.restHr}
              onChange={(e) => set({ restHr: e.currentTarget.valueAsNumber })}
            />
          </label>
          <label className={styles.field}>
            {t.coefficient}
            <select
              value={form.coefficient}
              onChange={(e) => set({ coefficient: e.currentTarget.value as TrimpCoefficient })}
            >
              {(Object.keys(t.coefficients) as TrimpCoefficient[]).map((c) => (
                <option key={c} value={c}>
                  {t.coefficients[c]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className={styles.checkbox}>
          <input
            type="checkbox"
            checked={form.useAge}
            onChange={(e) => set({ useAge: e.currentTarget.checked })}
          />
          {t.useAge}
        </label>
        {form.useAge && (
          <p className={styles.warning}>
            {t.estimate(estimateMaxHr(clamp(form.age, 10, 100)))} {t.estimateWarning}
          </p>
        )}
        <p className={styles.small}>
          {t.restHint} {t.coefficientHint}
        </p>
      </fieldset>
    </InfoTip>
  );
}
