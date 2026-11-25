import { cs } from '../../../i18n/cs.ts';
import { estimateMaxHr, type TrimpCoefficient } from '../activity/heart-rate.ts';
import { clamp, type HeartRateForm } from '../heart-rate-form.ts';
import { formatDuration } from '../format.ts';
import styles from '../local.module.css';

interface Props {
  form: HeartRateForm;
  onForm: (f: HeartRateForm) => void;
  zonesS: number[] | null;
  isSample: boolean;
}

export function HeartRatePanel({ form, onForm, zonesS, isSample }: Props) {
  const t = cs.local.hr;
  const total = zonesS?.reduce((a, b) => a + b, 0) ?? 0;
  const set = (patch: Partial<HeartRateForm>) => onForm({ ...form, ...patch });

  return (
    <div className={styles.hrPanel}>
      <h3>{t.heading}</h3>
      <p>{t.intro}</p>

      {zonesS && total > 0 && (
        <figure className={styles.zones}>
          <figcaption className={styles.groupLabel}>{t.zonesLabel}</figcaption>
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
                <li key={zone}>
                  <span className={styles.swatch} style={{ background: `var(--zone-${zone})` }} />
                  {t.zone(zone)} ({t.zoneNames[zone]}): {formatDuration(s)} ·{' '}
                  {Math.round((100 * s) / total)} %
                </li>
              ) : null,
            )}
          </ul>
        </figure>
      )}

      <fieldset className={styles.settings}>
        <legend className={styles.groupLabel}>{t.settings}</legend>
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
      <p className={styles.small}>{t.sources}</p>
    </div>
  );
}
