import { RULE_IDS } from '@trusted-ai-lab/agent-runtime';
import type { TraceEvent } from '@trusted-ai-lab/llm-core';
import { DrawerSection } from '../../components/InfoDrawer/DrawerSection.tsx';
import machine from '../../components/Machine/machine.module.css';
import { TracePanel } from '../../components/TracePanel/TracePanel.tsx';
import { cs } from '../../i18n/cs.ts';
import styles from './agent.module.css';

/** "Under the hood" for the agent: the rules, the limits and the full trace of the last run. */
export function AgentDetails({ events }: { events: readonly TraceEvent[] }) {
  const t = cs.agent;
  return (
    <>
      <DrawerSection title={t.rules.heading}>
        <p>{t.rules.intro}</p>
        <dl className={styles.rules}>
          {RULE_IDS.map((id) => (
            <div key={id}>
              <dt>
                <code>{id}</code>
              </dt>
              <dd>{t.rules.items[id]}</dd>
            </div>
          ))}
        </dl>
      </DrawerSection>

      <DrawerSection title={t.limits.heading}>
        <ul className={machine.list}>
          {t.limits.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </DrawerSection>

      <DrawerSection title={t.result.traceTitle}>
        {events.length === 0 && <p className={machine.muted}>{t.result.empty}</p>}
        <TracePanel events={events} title={t.result.traceTitle} headingLevel={3} />
      </DrawerSection>
    </>
  );
}
