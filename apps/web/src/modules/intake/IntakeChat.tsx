import {
  PRESET_IDS,
  RULES,
  type FactField,
  type IntakeFacts,
  type PresetId,
  type RuleId,
} from '@trusted-ai-lab/intake-rules';
import type { CSSProperties, ReactNode } from 'react';
import machine from '../../components/Machine/machine.module.css';
import { Panel } from '../../components/Machine/Panel.tsx';
import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { person } from '../../pixel/sprites/actors.ts';
import { intakeThumb } from '../../pixel/sprites/projects.ts';
import { answeredCount, optionsOf, QUESTION_ORDER, type Answers } from './chat/script.ts';
import { factLabel } from './labels.ts';
import styles from './intake.module.css';

export type Source = { kind: 'preset'; id: PresetId } | { kind: 'custom' };

interface Props {
  /** `null` right after „start again“: only the greeting and the sample situations. */
  source: Source | null;
  /** A fact of the preset was changed, so it is no longer the preset. */
  edited: boolean;
  answers: Answers;
  /** The question the answer tray offers (the next one, or one reopened from a fact chip). */
  question: FactField | null;
  /** The question was reopened, not asked for the first time. */
  reopened: boolean;
  /** Rules that applied, once all facts are known. */
  fired: readonly RuleId[] | null;
  verdict: string | null;
  /** Play the whole conversation as one staged animation (a sample was just chosen). */
  staged: boolean;
  runKey: number;
  onPreset: (id: PresetId) => void;
  onCustom: () => void;
  onAnswer: <K extends FactField>(field: K, value: IntakeFacts[K]) => void;
  onReopen: (field: FactField) => void;
  onKeep: () => void;
  onRestart: () => void;
}

const TOTAL = QUESTION_ORDER.length;

/** Delays of one staged run (ms): the reply, the facts one by one, the verdict, the rules. */
const AT = { you: 0, bot: 450, facts: 650, verdict: 1350, rules: 1450 };

const delay = (ms: number, staged: boolean): CSSProperties | undefined =>
  staged ? ({ '--delay': `${ms}ms` } as CSSProperties) : undefined;

/**
 * Rozcestník as a chat in which nobody types: the bot asks, the visitor picks an answer from the
 * tray where a text field would be. A sample situation answers everything at once.
 */
export function IntakeChat(props: Props) {
  const { source, answers, question, reopened, fired, verdict, staged } = props;
  const t = cs.intake.chat;
  const preset = source?.kind === 'preset' ? source.id : null;
  const known = QUESTION_ORDER.filter((f) => answers[f] !== undefined);

  return (
    <Panel
      as="section"
      step={1}
      tone="sun"
      title={t.title}
      className={styles.chat}
      bodyClassName={styles.chatBody}
      footer={<Tray {...props} />}
    >
      <ol key={props.runKey} className={styles.messages} aria-label={t.label} aria-live="polite">
        <Bubble from="bot">{t.hello}</Bubble>

        {source && (
          <Bubble from="you" style={delay(AT.you, staged)}>
            {preset ? (
              <>
                <strong className={styles.presetName}>{cs.intake.presets[preset].label}</strong>
                {cs.intake.presets[preset].description}
              </>
            ) : (
              t.customIntro
            )}
          </Bubble>
        )}

        {source && (
          <Bubble from="bot" style={delay(AT.bot, staged)}>
            <p>{preset ? t.understood : t.askIntro}</p>
            {known.length > 0 && (
              <ul className={styles.facts} aria-label={t.factsLabel}>
                {known.map((field, i) => {
                  const short = cs.intake.fields[field].short;
                  const value = factLabel(field, answers[field] as IntakeFacts[typeof field]);
                  return (
                    <li
                      key={field}
                      className={machine.popIn}
                      style={
                        staged
                          ? ({
                              '--delay': `${AT.facts}ms`,
                              '--i': i,
                              '--stagger': '50ms',
                            } as CSSProperties)
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className={styles.fact}
                        aria-pressed={question === field}
                        aria-label={t.change(short, value)}
                        onClick={() => props.onReopen(field)}
                      >
                        <span className={styles.factField}>{short}</span>
                        {value}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Bubble>
        )}

        {question && (
          <Bubble from="bot" key={`q-${question}`}>
            {reopened && <span className={styles.reopen}>{t.reopen} </span>}
            {t.questions[question]}
          </Bubble>
        )}

        {!question && fired !== null && verdict && (
          <Bubble from="bot" style={delay(AT.verdict, staged)}>
            <p>
              {t.verdict} <strong data-testid="intake-chat-verdict">{verdict}</strong>
            </p>
            <RuleStrip fired={fired} staged={staged} />
          </Bubble>
        )}
      </ol>
    </Panel>
  );
}

function Bubble({
  from,
  style,
  children,
}: {
  from: 'bot' | 'you';
  style?: CSSProperties | undefined;
  children: ReactNode;
}) {
  const t = cs.intake.chat;
  return (
    <li className={`${styles.message} ${machine.popIn}`} data-from={from} style={style}>
      <span className={styles.avatar} aria-hidden="true">
        <Sprite sprite={from === 'bot' ? intakeThumb : person} scale={from === 'bot' ? 1 : 2} />
      </span>
      <div className={styles.bubble}>
        <span className="visually-hidden">{from === 'bot' ? t.bot : t.you}: </span>
        {children}
      </div>
    </li>
  );
}

/** One square per rule, in rule order; the ones that applied light up. */
function RuleStrip({ fired, staged }: { fired: readonly RuleId[]; staged: boolean }) {
  const on = new Set(fired);
  return (
    <div className={styles.ruleStrip}>
      <span className={styles.squares} aria-hidden="true">
        {RULES.map((rule, i) => (
          <span
            key={rule.id}
            data-on={on.has(rule.id) ? '' : undefined}
            style={
              staged
                ? ({ '--delay': `${AT.rules}ms`, '--i': i, '--stagger': '18ms' } as CSSProperties)
                : undefined
            }
          />
        ))}
      </span>
      <span className={machine.small}>{cs.intake.chat.rules(on.size, RULES.length)}</span>
    </div>
  );
}

/** Where a text field would be: the answers to pick from. */
function Tray(props: Props) {
  const { source, edited, answers, question, reopened } = props;
  const t = cs.intake.chat;
  const preset = source?.kind === 'preset' ? source.id : null;

  if (question) {
    const progress =
      source?.kind === 'custom' && !reopened
        ? ` ${t.progress(answeredCount(answers) + 1, TOTAL)}`
        : '';
    return (
      <div className={styles.tray}>
        <p className={machine.groupLabel} aria-hidden="true">
          {t.trayAnswer}
          {progress}
        </p>
        <div className={machine.choices} role="group" aria-label={t.questions[question]}>
          {optionsOf(question).map((value) => (
            <button
              key={String(value)}
              type="button"
              className={machine.choice}
              aria-pressed={answers[question] === value}
              onClick={() => props.onAnswer(question, value)}
            >
              {factLabel(question, value)}
            </button>
          ))}
        </div>
        {reopened ? (
          <button type="button" className={machine.linkButton} onClick={props.onKeep}>
            {t.keep}
          </button>
        ) : (
          <button type="button" className={machine.linkButton} onClick={props.onRestart}>
            {t.backToPresets}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={styles.tray}>
      <p className={machine.groupLabel} aria-hidden="true">
        {t.trayPresets}
      </p>
      <div className={machine.choices} role="group" aria-label={t.trayPresets}>
        {PRESET_IDS.map((id) => (
          <button
            key={id}
            type="button"
            className={machine.choice}
            aria-pressed={preset === id && !edited}
            onClick={() => props.onPreset(id)}
          >
            {cs.intake.presets[id].label}
          </button>
        ))}
        <button
          type="button"
          className={machine.choice}
          aria-pressed={source?.kind === 'custom'}
          onClick={props.onCustom}
        >
          <span aria-hidden="true">✎ </span>
          {t.custom}
        </button>
      </div>
    </div>
  );
}
