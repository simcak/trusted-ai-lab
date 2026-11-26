import { createNerDetector, type AsyncDetector, type Mode } from '@trusted-ai-lab/pii-cz';
import { useMemo, useState } from 'react';
import { ProjectShell } from '../../components/ProjectShell/ProjectShell.tsx';
import { NER_MODEL } from '../../../../../evals/pii/ner-model.ts';
import { runFlow } from './flow.ts';
import type { NerState } from './NerPanel.tsx';
import { loadNerClassifier } from './ner/load-ner.ts';
import { PiiDetails } from './PiiDetails.tsx';
import { PiiMachine } from './PiiMachine.tsx';
import { SAMPLES, type SampleId } from './samples.ts';
import { usePiiFindings } from './usePiiFindings.ts';

const INITIAL_SAMPLE: SampleId = 'client-email';

export default function PiiPage() {
  const [text, setText] = useState(SAMPLES[INITIAL_SAMPLE]);
  const [sample, setSample] = useState<SampleId | null>(INITIAL_SAMPLE);
  // Reversible first: the first view tells the whole story (the AI never saw the name).
  const [mode, setMode] = useState<Mode>('reversible');
  const [editing, setEditing] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const [nerState, setNerState] = useState<NerState>({ status: 'idle' });
  const [nerDetector, setNerDetector] = useState<AsyncDetector | undefined>();
  const [nerEnabled, setNerEnabled] = useState(true);

  const plugin = nerEnabled ? nerDetector : undefined;
  const analysed = usePiiFindings(text, plugin);
  const flow = useMemo(
    () => runFlow(analysed.text, analysed.findings),
    [analysed.text, analysed.findings],
  );
  const replay = () => setRunKey((k) => k + 1);

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

  const ner = { state: nerState, enabled: nerEnabled, analysing: analysed.pluginPending };
  const nerHandlers = { onNerLoad: () => void loadNer(), onNerToggle: setNerEnabled };

  return (
    <ProjectShell
      id="pii"
      info={<PiiDetails findings={analysed.findings} flow={flow} ner={ner} {...nerHandlers} />}
    >
      <PiiMachine
        text={text}
        analysed={analysed}
        flow={flow}
        sample={sample}
        mode={mode}
        editing={editing}
        runKey={runKey}
        ner={ner}
        onText={(value) => {
          setText(value);
          setSample(null);
        }}
        onSample={(id) => {
          setText(SAMPLES[id]);
          setSample(id);
          setEditing(false);
          replay();
        }}
        onMode={(m) => {
          setMode(m);
          replay();
        }}
        onEditing={(next) => {
          setEditing(next);
          if (!next) replay();
        }}
        onCustom={() => {
          setSample(null);
          setEditing(true);
        }}
        {...nerHandlers}
      />
    </ProjectShell>
  );
}
