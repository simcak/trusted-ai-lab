import {
  AI_ACT_STATUS,
  getMilestone,
  getRule,
  type CostEstimate,
  type IntakeInput,
  type IntakeResult as Result,
  type Pricing,
} from '@trusted-ai-lab/intake-rules';
import { Link } from 'react-router';
import { cs } from '../../i18n/cs.ts';
import { getModule } from '../registry.ts';
import { formatRange, humanRules } from './adr.ts';
import { formatDay, formatInt } from './format.ts';
import { CONTROL_MODULE, groupRejected, patternHeadline, patternSummary } from './labels.ts';
import { ReferenceLink } from './ReferenceLink.tsx';
import { RulesList } from './RulesList.tsx';
import styles from './intake.module.css';

const t = cs.intake;

interface Props {
  input: IntakeInput;
  result: Result;
  cost: CostEstimate;
  pricing: Pricing;
  /** ISO date, decides „platí od“ vs „bude platit od“. */
  today: string;
  onDownload: () => void;
}

export function IntakeResult({ input, result, cost, pricing, today, onDownload }: Props) {
  const human = result.pattern === 'human-in-the-loop' ? [] : humanRules(result);

  return (
    <section
      className={styles.result}
      aria-labelledby="intake-result-heading"
      aria-live="polite"
      data-testid="intake-result"
    >
      <p className={styles.groupLabel}>{t.resultLabel}</p>
      <h2
        id="intake-result-heading"
        className={styles.headline}
        data-blocked={result.blocked}
        data-testid="intake-pattern"
      >
        {patternHeadline(result)}
      </h2>
      <p className={styles.summary}>{patternSummary(result)}</p>
      {human.length > 0 && (
        <div className={styles.why}>
          <strong>{t.humanWhy}</strong>
          <ul>
            {human.map((id) => (
              <li key={id}>{getRule(id).rationale}</li>
            ))}
          </ul>
        </div>
      )}

      <div className={styles.cards}>
        <AiActCard result={result} today={today} />
        <DataCard input={input} result={result} />
        <CostCard cost={cost} pricing={pricing} blocked={result.blocked} />
        <RejectedCard result={result} />
      </div>

      <RulesList ruleIds={result.fired} />

      <div className={styles.adr}>
        <button type="button" className="button" onClick={onDownload}>
          {t.adr.button}
        </button>
        <span className={styles.small}>{t.adr.hint}</span>
      </div>
    </section>
  );
}

function AiActCard({ result, today }: { result: Result; today: string }) {
  const { category, findings } = result.aiAct;
  return (
    <div className={styles.card} data-testid="intake-ai-act">
      <h3>{t.aiAct.heading}</h3>
      <p>
        <span className={styles.category} data-category={category}>
          {t.aiAct.categories[category]}
        </span>
      </p>
      <ul className={styles.plain}>
        {findings.map((f) => {
          const milestone = getMilestone(f.appliesFrom);
          return (
            <li key={f.ruleId}>
              <ReferenceLink reference={getRule(f.ruleId).reference} />
              <span className={styles.small}>
                {t.aiAct.appliesFrom(formatDay(milestone.date), milestone.date <= today)}
              </span>
            </li>
          );
        })}
      </ul>
      <details className={styles.sources}>
        <summary>{t.aiAct.asOf(formatDay(AI_ACT_STATUS.asOf))}</summary>
        <p className={styles.small}>{t.aiAct.amendedBy}</p>
        <ul className={styles.small}>
          {[AI_ACT_STATUS.regulation, AI_ACT_STATUS.amendment, ...AI_ACT_STATUS.sources].map(
            (s) => (
              <li key={s.url}>
                <a href={s.url} rel="noreferrer">
                  {s.label}
                </a>
              </li>
            ),
          )}
        </ul>
      </details>
    </div>
  );
}

function DataCard({ input, result }: { input: IntakeInput; result: Result }) {
  return (
    <div className={styles.card} data-testid="intake-controls">
      <h3>{t.data.heading}</h3>
      <p>
        <strong>{t.data.classes[input.dataSensitivity]}</strong>
      </p>
      {result.controls.length === 0 ? (
        <p className={styles.small}>{t.data.none}</p>
      ) : (
        <ul className={styles.plain}>
          {result.controls.map(({ control }) => {
            const moduleId = CONTROL_MODULE[control];
            const meta = moduleId ? getModule(moduleId) : undefined;
            return (
              <li key={control}>
                {t.data.controls[control]}
                {meta && (
                  <Link to={meta.path} className={styles.moduleLink}>
                    → {t.data.moduleLink(cs.modules[meta.id].title)}
                  </Link>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function CostCard({
  cost,
  pricing,
  blocked,
}: {
  cost: CostEstimate;
  pricing: Pricing;
  blocked: boolean;
}) {
  return (
    <div className={styles.card} data-testid="intake-cost">
      <h3>{t.cost.heading}</h3>
      {blocked ? (
        <p className={styles.small}>—</p>
      ) : cost.kind !== 'estimate' ? (
        <p className={styles.small}>
          {cost.kind === 'no-tokens' ? t.cost.noTokens : t.cost.notTokenBased}
        </p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <td />
                <th scope="col" className={styles.num}>
                  {t.cost.perMonth}
                </th>
              </tr>
            </thead>
            <tbody>
              {cost.tiers.map((tier) => (
                <tr key={tier.tier}>
                  <th scope="row">{t.cost.tiers[tier.tier]}</th>
                  <td className={styles.num}>
                    {tier.monthlyUsd ? formatRange(tier.monthlyUsd) : t.cost.unverified}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className={styles.small}>
            {t.cost.assumption(
              `${formatInt(cost.profile.input.min)}–${formatInt(cost.profile.input.max)}`,
              `${formatInt(cost.profile.output.min)}–${formatInt(cost.profile.output.max)}`,
            )}
            {cost.batch && ` ${t.cost.batch}`}
          </p>
          <p className={styles.small}>
            {t.cost.sources}:{' '}
            {pricing.providers.map((p, i) => (
              <span key={p.id}>
                {i > 0 && ', '}
                {p.source ? (
                  <a href={p.source} rel="noreferrer">
                    {p.name}
                  </a>
                ) : (
                  p.name
                )}
                {p.retrievedAt && ` ${t.cost.retrievedAt(formatDay(p.retrievedAt))}`}
              </span>
            ))}
          </p>
        </>
      )}
    </div>
  );
}

function RejectedCard({ result }: { result: Result }) {
  return (
    <div className={styles.card} data-testid="intake-rejected">
      <h3>{t.rejected.heading}</h3>
      {result.blocked ? (
        <p className={styles.small}>{t.rejected.allBlocked}</p>
      ) : (
        <ul className={styles.plain}>
          {groupRejected(result.rejected).map((g) => (
            <li key={g.ruleId}>
              <strong>{g.patterns.map((p) => t.patterns[p].label).join(', ')}</strong>
              <span className={styles.small}>{getRule(g.ruleId).rationale}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
