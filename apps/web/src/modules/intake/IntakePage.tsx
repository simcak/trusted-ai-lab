import {
  estimateCost,
  evaluate,
  PRESETS,
  type FactField,
  type IntakeFacts,
  type PresetId,
} from '@trusted-ai-lab/intake-rules';
import { useMemo, useState } from 'react';
import { ProjectShell } from '../../components/ProjectShell/ProjectShell.tsx';
import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { intakeThumb } from '../../pixel/sprites/projects.ts';
import { adrFileName, adrName, toAdrMarkdown } from './adr.ts';
import {
  answeredCount,
  isComplete,
  nextQuestion,
  QUESTION_ORDER,
  type Answers,
} from './chat/script.ts';
import { downloadText } from './download.ts';
import { todayIso } from './format.ts';
import { IntakeChat, type Source } from './IntakeChat.tsx';
import { IntakeDetails } from './IntakeDetails.tsx';
import { patternHeadline } from './labels.ts';
import { PRICING } from './pricing.ts';
import { ResultCard } from './ResultCard.tsx';
import styles from './intake.module.css';

const INITIAL_PRESET: PresetId = 'fee-calculation';

/** When a sample plays, the result card starts after the chat has shown the facts (ms). */
const STAGED_RESULT_MS = 1600;

interface ChatState {
  source: Source | null;
  answers: Answers;
  edited: boolean;
  /** A question reopened from a fact chip. */
  reopened: FactField | null;
  /** Remounts the chat, which replays its animation. */
  runKey: number;
  /** Remounts the result card, which replays its own animation. */
  resultKey: number;
  /** The whole run animates in step (a sample was chosen); otherwise only new parts pop in. */
  staged: boolean;
}

const presetState = (id: PresetId, prev?: ChatState): ChatState => ({
  source: { kind: 'preset', id },
  answers: PRESETS[id],
  edited: false,
  reopened: null,
  runKey: prev ? prev.runKey + 1 : 0,
  resultKey: prev ? prev.resultKey + 1 : 0,
  staged: true,
});

export default function IntakePage() {
  const t = cs.intake;
  const [chat, setChat] = useState<ChatState>(() => presetState(INITIAL_PRESET));
  const { source, answers, reopened } = chat;

  const facts = isComplete(answers) ? answers : null;
  const result = useMemo(() => (facts ? evaluate(facts) : null), [facts]);
  const cost = useMemo(
    () =>
      facts && result ? estimateCost(result.pattern, facts.volume, facts.latency, PRICING) : null,
    [facts, result],
  );
  const question = reopened ?? (source?.kind === 'custom' ? nextQuestion(answers) : null);

  const next = (patch: Partial<ChatState>) =>
    setChat((prev) => ({
      ...prev,
      ...patch,
      runKey: prev.runKey + 1,
      resultKey: prev.resultKey + 1,
    }));

  const choosePreset = (id: PresetId) => setChat((prev) => presetState(id, prev));
  const startCustom = () =>
    next({ source: { kind: 'custom' }, answers: {}, edited: false, reopened: null, staged: false });
  const restart = () =>
    next({ source: null, answers: {}, edited: false, reopened: null, staged: false });

  const answer = <K extends FactField>(field: K, value: IntakeFacts[K]) =>
    setChat((prev) => {
      const changed = prev.answers[field] !== value;
      const answers = { ...prev.answers, [field]: value };
      return {
        ...prev,
        answers,
        reopened: null,
        edited: prev.edited || (prev.source?.kind === 'preset' && changed),
        staged: false,
        // A new or changed result assembles again; the chat keeps its bubbles.
        resultKey: changed && isComplete(answers) ? prev.resultKey + 1 : prev.resultKey,
      };
    });
  const reopen = (field: FactField) =>
    setChat((prev) => ({
      ...prev,
      reopened: prev.reopened === field ? null : field,
      staged: false,
    }));
  const keep = () => setChat((prev) => ({ ...prev, reopened: null }));

  const download = () => {
    if (!facts || !result || !cost) return;
    const date = todayIso();
    const preset = source?.kind === 'preset' ? source.id : null;
    const label = preset
      ? chat.edited
        ? t.adr.editedName(t.presets[preset].label)
        : t.presets[preset].label
      : t.adr.customName;
    const description = preset ? t.presets[preset].description : '';
    const name = adrName(description, label);
    const markdown = toAdrMarkdown({
      name,
      input: { ...facts, description },
      result,
      cost,
      pricing: PRICING,
      date,
    });
    downloadText(adrFileName(name, date), markdown);
  };

  return (
    <ProjectShell id="intake" info={<IntakeDetails pricing={PRICING} />}>
      <div className={styles.machine}>
        <IntakeChat
          source={source}
          edited={chat.edited}
          answers={answers}
          question={question}
          reopened={reopened !== null}
          fired={result?.fired ?? null}
          verdict={result ? patternHeadline(result) : null}
          staged={chat.staged}
          runKey={chat.runKey}
          onPreset={choosePreset}
          onCustom={startCustom}
          onAnswer={answer}
          onReopen={reopen}
          onKeep={keep}
          onRestart={restart}
        />
        {facts && result && cost ? (
          <ResultCard
            key={chat.resultKey}
            facts={facts}
            result={result}
            cost={cost}
            today={todayIso()}
            startMs={chat.staged ? STAGED_RESULT_MS : 0}
            onDownload={download}
            onRestart={restart}
          />
        ) : (
          <div className={styles.waiting} data-testid="intake-waiting">
            <Sprite sprite={intakeThumb} scale={3} fps={3} />
            <p>{t.chat.waiting}</p>
            {source?.kind === 'custom' && (
              <p className={styles.waitingProgress}>
                {t.chat.answered(answeredCount(answers), QUESTION_ORDER.length)}
              </p>
            )}
          </div>
        )}
      </div>
    </ProjectShell>
  );
}
