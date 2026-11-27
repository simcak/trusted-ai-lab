import type { Finding } from '@trusted-ai-lab/pii-cz';
import { cs } from '../../i18n/cs.ts';
import { formatScore } from './format.ts';
import { reasonsText } from './labels.ts';
import machine from '../../components/Machine/machine.module.css';
import styles from './pii.module.css';

export function FindingsTable({ findings }: { findings: readonly Finding[] }) {
  const t = cs.pii.findings;
  if (findings.length === 0) return <p className={machine.muted}>{t.none}</p>;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} data-testid="pii-findings">
        <thead>
          <tr>
            <th scope="col">{t.columns.type}</th>
            <th scope="col">{t.columns.text}</th>
            <th scope="col" className={styles.num}>
              {t.columns.score}
            </th>
            <th scope="col">{t.columns.detector}</th>
            <th scope="col">{t.columns.reasons}</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((f) => (
            <tr key={`${f.start}-${f.end}`}>
              <td>{cs.pii.types[f.type]}</td>
              <td>
                <code>{f.text}</code>
              </td>
              <td className={styles.num}>{formatScore(f.score)}</td>
              <td>{t.detectors[f.detector] ?? f.detector}</td>
              <td>{reasonsText(f)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
