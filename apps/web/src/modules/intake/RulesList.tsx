import { getRule, type RuleId } from '@trusted-ai-lab/intake-rules';
import { cs } from '../../i18n/cs.ts';
import { describeCondition } from './describe-condition.ts';
import { ReferenceLink } from './ReferenceLink.tsx';
import styles from './intake.module.css';

/** „Proč to systém doporučil“: every rule that applied, with its condition, reason and source. */
export function RulesList({ ruleIds }: { ruleIds: readonly RuleId[] }) {
  const t = cs.intake.rules;
  return (
    <details className={styles.rules} data-testid="intake-rules">
      <summary>{t.summary(ruleIds.length)}</summary>
      <ol>
        {ruleIds.map((id) => {
          const rule = getRule(id);
          return (
            <li key={id}>
              <code>{id}</code>
              <span>{rule.rationale}</span>
              <span className={styles.small}>
                {t.condition}: {describeCondition(rule.when)}
              </span>
              <span className={styles.small}>
                <ReferenceLink reference={rule.reference} />
              </span>
            </li>
          );
        })}
      </ol>
    </details>
  );
}
