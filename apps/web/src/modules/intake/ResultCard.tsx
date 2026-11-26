import {
  AI_ACT_STATUS,
  getMilestone,
  getRule,
  type CostEstimate,
  type IntakeFacts,
  type IntakeResult,
} from '@trusted-ai-lab/intake-rules';
import type { CSSProperties } from 'react';
import { Link } from 'react-router';
import { InfoTip } from '../../components/InfoTip/InfoTip.tsx';
import machine from '../../components/Machine/machine.module.css';
import { Panel } from '../../components/Machine/Panel.tsx';
import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { getModule } from '../registry.ts';
import { formatRange, humanRules } from './adr.ts';
import { formatDay, formatInt } from './format.ts';
import { CONTROL_MODULE, patternHeadline, patternSummary } from './labels.ts';
import { iconOf, toneOf } from './look.ts';
import { PatternLadder } from './PatternLadder.tsx';
import { ReferenceLink } from './ReferenceLink.tsx';
import { RulesList } from './RulesList.tsx';
import styles from './intake.module.css';

const t = cs.intake;

interface Props {
  facts: IntakeFacts;
  result: IntakeResult;
  cost: CostEstimate;
  /** ISO date, decides „platí od“ vs „bude platit od“. */
  today: string;
  /** Start the card's animation this many ms after it mounts (in step with the chat). */
  startMs: number;
  onDownload: () => void;
  onRestart: () => void;
}

/** The recommendation: verdict, the pattern ladder, three tiles, the rules and the ADR. */
export function ResultCard({ facts, result, cost, today, startMs, onDownload, onRestart }: Props) {
  const human = result.pattern === 'human-in-the-loop' ? [] : humanRules(result);
  return (
    <Panel
      as="section"
      step={2}
      tone={toneOf(result)}
      title={t.resultLabel}
      className={styles.result}
      bodyClassName={styles.resultBody}
      testId="intake-result"
    >
      <div className={styles.resultInner} style={{ '--start': `${startMs}ms` } as CSSProperties}>
        <div className={styles.verdict}>
          <span className={styles.verdictIcon} aria-hidden="true">
            <Sprite sprite={iconOf(result)} scale={4} />
          </span>
          <div className={styles.verdictText}>
            <h3 data-blocked={result.blocked} data-testid="intake-pattern">
              {patternHeadline(result)}
            </h3>
            <p>{patternSummary(result)}</p>
          </div>
          {human.length > 0 && (
            <InfoTip
              label={t.humanWhy}
              title={t.humanWhy}
              text={t.humanTip}
              className={styles.humanTip}
            >
              <ul className={machine.list}>
                {human.map((id) => (
                  <li key={id}>{getRule(id).rationale}</li>
                ))}
              </ul>
            </InfoTip>
          )}
        </div>

        <PatternLadder result={result} />

        <div className={styles.tiles}>
          <AiActTile result={result} today={today} />
          <DataTile facts={facts} result={result} />
          <CostTile cost={cost} blocked={result.blocked} />
        </div>

        <RulesList ruleIds={result.fired} />

        <div className={styles.actions}>
          <button type="button" className="button" onClick={onDownload}>
            <span aria-hidden="true">⬇ </span>
            {t.adr.button}
          </button>
          <button type="button" className="button button--secondary" onClick={onRestart}>
            <span aria-hidden="true">↺ </span>
            {t.restart}
          </button>
          <InfoTip label={t.adr.what} title={cs.glossary.terms.adr.term} icon="bulb">
            <p>{cs.glossary.terms.adr.text}</p>
            <p>{t.adr.hint}</p>
          </InfoTip>
        </div>
      </div>
    </Panel>
  );
}

function AiActTile({ result, today }: { result: IntakeResult; today: string }) {
  const { category, findings } = result.aiAct;
  return (
    <div className={styles.tile} data-testid="intake-ai-act" style={{ '--i': 0 } as CSSProperties}>
      <h4>{t.aiAct.heading}</h4>
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
              <span className={machine.small}>
                {t.aiAct.appliesFrom(formatDay(milestone.date), milestone.date <= today)}
              </span>
            </li>
          );
        })}
      </ul>
      <p className={machine.small}>{t.aiAct.asOfShort(formatDay(AI_ACT_STATUS.asOf))}</p>
    </div>
  );
}

function DataTile({ facts, result }: { facts: IntakeFacts; result: IntakeResult }) {
  return (
    <div
      className={styles.tile}
      data-testid="intake-controls"
      style={{ '--i': 1 } as CSSProperties}
    >
      <h4>{t.data.heading}</h4>
      <p>
        <strong>{t.data.classes[facts.dataSensitivity]}</strong>
      </p>
      {result.controls.length === 0 ? (
        <p className={machine.small}>{t.data.none}</p>
      ) : (
        <ul className={styles.controls}>
          {result.controls.map(({ control }) => {
            const moduleId = CONTROL_MODULE[control];
            const meta = moduleId ? getModule(moduleId) : undefined;
            return (
              <li key={control} data-linked={meta ? '' : undefined}>
                {t.data.controls[control]}
                {meta && (
                  <Link to={meta.path} className={styles.moduleLink} data-accent={meta.accent}>
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

function CostTile({ cost, blocked }: { cost: CostEstimate; blocked: boolean }) {
  return (
    <div className={styles.tile} data-testid="intake-cost" style={{ '--i': 2 } as CSSProperties}>
      <h4>{t.cost.heading}</h4>
      {blocked ? (
        <p className={styles.bigValue}>—</p>
      ) : cost.kind !== 'estimate' ? (
        <>
          <p className={styles.bigValue}>{cost.kind === 'no-tokens' ? t.cost.none : '—'}</p>
          <p className={machine.small}>
            {cost.kind === 'no-tokens' ? t.cost.noTokens : t.cost.notTokenBased}
          </p>
        </>
      ) : (
        <>
          <table className={styles.costTable}>
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
          <div className={styles.assumption}>
            <span className={machine.small}>{t.cost.assumptionShort}</span>
            <InfoTip label={t.cost.assumptionTip} title={t.cost.assumptionTip}>
              <p>
                {t.cost.assumption(
                  `${formatInt(cost.profile.input.min)}–${formatInt(cost.profile.input.max)}`,
                  `${formatInt(cost.profile.output.min)}–${formatInt(cost.profile.output.max)}`,
                )}
              </p>
              {cost.batch && <p>{t.cost.batch}</p>}
            </InfoTip>
          </div>
        </>
      )}
    </div>
  );
}
