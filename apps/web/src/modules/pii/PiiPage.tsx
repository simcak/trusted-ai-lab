import { createNerDetector, type AsyncDetector, type Mode } from '@trusted-ai-lab/pii-cz';
import { useState } from 'react';
import { ProjectShell } from '../../components/ProjectShell/ProjectShell.tsx';
import { cs } from '../../i18n/cs.ts';
import { NER_MODEL } from '../../../../../evals/pii/ner-model.ts';
import { EvalResults } from './EvalResults.tsx';
import type { NerState } from './NerPanel.tsx';
import { loadNerClassifier } from './ner/load-ner.ts';
import { PiiPlayground } from './PiiPlayground.tsx';
import { ReversibleDemo } from './ReversibleDemo.tsx';
import { SAMPLES, type SampleId } from './samples.ts';
import { usePiiFindings } from './usePiiFindings.ts';
import styles from './pii.module.css';

const INITIAL_SAMPLE: SampleId = 'client-email';

export default function PiiPage() {
  const [text, setText] = useState(SAMPLES[INITIAL_SAMPLE]);
  const [sample, setSample] = useState<SampleId | null>(INITIAL_SAMPLE);
  const [mode, setMode] = useState<Mode>('pseudonymize');
  const [nerState, setNerState] = useState<NerState>({ status: 'idle' });
  const [nerDetector, setNerDetector] = useState<AsyncDetector | undefined>();
  const [nerEnabled, setNerEnabled] = useState(true);

  const plugin = nerEnabled ? nerDetector : undefined;
  const analysed = usePiiFindings(text, plugin);

  const loadNer = async () => {
    setNerState({ status: 'loading', progress: null });
    try {
      const { classify, runtimeTransferBytes } = await loadNerClassifier((progress) =>
        setNerState({ status: 'loading', progress }),
      );
      // Wrapped in a function: useState would otherwise call the detector as an initialiser.
      setNerDetector(() => createNerDetector(classify, NER_MODEL.detector));
      setNerState({ status: 'ready', runtimeTransferBytes });
    } catch {
      setNerState({ status: 'error' });
    }
  };

  const t = cs.pii;
  return (
    <ProjectShell id="pii">
      <div className={styles.page}>
        <PiiPlayground
          text={text}
          analysed={analysed}
          sample={sample}
          mode={mode}
          ner={{
            state: nerState,
            enabled: nerEnabled,
            analysing: analysed.pluginPending,
          }}
          onText={(value) => {
            setText(value);
            setSample(null);
          }}
          onSample={(id) => {
            setText(SAMPLES[id]);
            setSample(id);
          }}
          onMode={setMode}
          onNerLoad={() => void loadNer()}
          onNerToggle={setNerEnabled}
        />

        <ReversibleDemo text={analysed.text} findings={analysed.findings} />

        <EvalResults />

        <section className={styles.section} aria-labelledby="limits-heading">
          <h2 id="limits-heading">{t.limits.heading}</h2>
          <ul className={styles.list}>
            {t.limits.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className={styles.section} aria-labelledby="managed-heading">
          <h2 id="managed-heading">{t.managed.heading}</h2>
          <div className={styles.compare}>
            {[t.managed.own, t.managed.managedService].map((option) => (
              <div key={option.heading} className={styles.compareCard}>
                <h3>{option.heading}</h3>
                <h4 className={styles.groupLabel}>{t.managed.prosLabel}</h4>
                <ul className={styles.pros}>
                  {option.pros.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <h4 className={styles.groupLabel}>{t.managed.consLabel}</h4>
                <ul className={styles.cons}>
                  {option.cons.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <p>{t.managed.recommendation}</p>
        </section>
      </div>
    </ProjectShell>
  );
}
