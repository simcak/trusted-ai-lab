import type { TraceEvent } from '@trusted-ai-lab/llm-core';
import { DrawerSection } from '../../../components/InfoDrawer/DrawerSection.tsx';
import machine from '../../../components/Machine/machine.module.css';
import { TracePanel } from '../../../components/TracePanel/TracePanel.tsx';
import { cs } from '../../../i18n/cs.ts';
import { WEBLLM_VERSION } from '../coach/model.ts';
import { COACH_SYSTEM_PROMPT } from '../coach/prompt.ts';
import type { useCoach } from '../coach/useCoach.ts';
import type { NetworkSnapshot } from '../network/network-monitor.ts';
import styles from '../local.module.css';
import { NetworkPanel } from './NetworkPanel.tsx';

interface Props {
  network: NetworkSnapshot;
  coach: ReturnType<typeof useCoach>;
  events: readonly TraceEvent[];
}

/** "Under the hood" for Lokálně: limits, the network log, the prompt, sources, the model. */
export function LocalDetails({ network, coach, events }: Props) {
  const t = cs.local;
  const d = t.details;
  const canDelete =
    coach.gpu?.status === 'ok' && coach.cached[coach.modelKey] && coach.load.status !== 'loading';
  return (
    <>
      <DrawerSection title={t.limits.heading}>
        <ul className={machine.list}>
          {t.limits.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </DrawerSection>

      <DrawerSection title={d.network}>
        <NetworkPanel snapshot={network} />
      </DrawerSection>

      <DrawerSection title={d.prompt}>
        <p>{t.payload.intro}</p>
        <pre className={styles.json}>{COACH_SYSTEM_PROMPT}</pre>
      </DrawerSection>

      <DrawerSection title={d.sources}>
        <p>{t.hr.sources}</p>
        <p>{t.week.acwrNote}</p>
      </DrawerSection>

      <DrawerSection title={d.model}>
        <p>{t.coach.intro}</p>
        <p className={machine.small}>{t.coach.credits(WEBLLM_VERSION)}</p>
        {canDelete && (
          <button
            type="button"
            className={machine.linkButton}
            onClick={() => void coach.deleteModel()}
          >
            {t.coach.delete}
          </button>
        )}
      </DrawerSection>

      <DrawerSection title={d.trace}>
        {events.length === 0 && <p className={machine.muted}>{t.coach.selectFirst}</p>}
        <TracePanel events={events} title={t.traceTitle} headingLevel={3} />
      </DrawerSection>
    </>
  );
}
