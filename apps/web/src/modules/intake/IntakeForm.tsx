import { FIELD_OPTIONS, type FactField, type IntakeInput } from '@trusted-ai-lab/intake-rules';
import { useId } from 'react';
import { cs } from '../../i18n/cs.ts';
import { factLabel } from './labels.ts';
import styles from './intake.module.css';

const GROUPS: { id: keyof typeof cs.intake.groups; fields: FactField[] }[] = [
  { id: 'work', fields: ['task', 'deterministic', 'labeledData', 'dataSensitivity', 'audience'] },
  {
    id: 'impact',
    fields: [
      'decisionAboutPeople',
      'automation',
      'explainability',
      'errorTolerance',
      'practice',
      'volume',
      'latency',
    ],
  },
];

interface Props {
  input: IntakeInput;
  onField: (field: FactField, value: IntakeInput[FactField]) => void;
  onDescription: (text: string) => void;
}

export function IntakeForm({ input, onField, onDescription }: Props) {
  const t = cs.intake;
  const descriptionId = useId();
  const hintId = useId();

  return (
    <form className={styles.form} onSubmit={(e) => e.preventDefault()}>
      <div className={styles.field}>
        <label htmlFor={descriptionId} className={styles.legend}>
          {t.descriptionLabel}
        </label>
        <textarea
          id={descriptionId}
          className={styles.textarea}
          rows={3}
          value={input.description}
          aria-describedby={hintId}
          onChange={(e) => onDescription(e.currentTarget.value)}
        />
        <span id={hintId} className={styles.small}>
          {t.descriptionHint}
        </span>
      </div>

      {GROUPS.map((group) => (
        <div key={group.id} className={styles.group}>
          <h3 className={styles.groupLabel}>{t.groups[group.id]}</h3>
          {group.fields.map((field) => (
            <fieldset key={field} className={styles.field}>
              <legend className={styles.legend}>{t.fields[field].legend}</legend>
              <div className={styles.chips}>
                {(FIELD_OPTIONS[field] as readonly IntakeInput[FactField][]).map((value) => (
                  <label key={String(value)} className={styles.chip}>
                    <input
                      type="radio"
                      name={`intake-${field}`}
                      checked={input[field] === value}
                      onChange={() => onField(field, value)}
                    />
                    <span>{factLabel(field, value)}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          ))}
        </div>
      ))}
    </form>
  );
}
