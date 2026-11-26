import { AI_ACT_STATUS, type Pricing } from '@trusted-ai-lab/intake-rules';
import { DrawerSection } from '../../components/InfoDrawer/DrawerSection.tsx';
import machine from '../../components/Machine/machine.module.css';
import { cs } from '../../i18n/cs.ts';
import { formatDay } from './format.ts';

/** "Under the hood" for Rozcestník: how the rules decide and where the facts come from. */
export function IntakeDetails({ pricing }: { pricing: Pricing }) {
  const t = cs.intake;
  return (
    <>
      <DrawerSection title={t.details.how}>
        {t.details.howText.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </DrawerSection>

      <DrawerSection title={t.details.aiActSources}>
        <p>{t.aiAct.asOfShort(formatDay(AI_ACT_STATUS.asOf))}</p>
        <p>{t.aiAct.amendedBy}</p>
        <ul className={machine.list}>
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
      </DrawerSection>

      <DrawerSection title={t.details.pricing}>
        <ul className={machine.list}>
          {pricing.providers.map((p) => (
            <li key={p.id}>
              {p.source ? (
                <a href={p.source} rel="noreferrer">
                  {p.name}
                </a>
              ) : (
                p.name
              )}
              {p.retrievedAt && ` ${t.cost.retrievedAt(formatDay(p.retrievedAt))}`}
            </li>
          ))}
        </ul>
      </DrawerSection>
    </>
  );
}
