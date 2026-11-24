import { PII_TYPES } from '@trusted-ai-lab/pii-cz';
import { useState } from 'react';
import type { ConfigId, Report, TypeMetrics } from '../../../../../evals/pii/schema.ts';
import { cs } from '../../i18n/cs.ts';
import { RESULTS } from './eval-results.ts';
import { formatDate, formatInt, formatPercent } from './format.ts';
import styles from './pii.module.css';

function MetricsRow({ label, m, header }: { label: string; m: TypeMetrics; header?: boolean }) {
  const Cell = header ? 'th' : 'td';
  return (
    <tr className={header ? styles.totalRow : undefined}>
      <th scope="row">{label}</th>
      <Cell className={styles.num}>{formatInt(m.support)}</Cell>
      <Cell className={styles.num}>{formatPercent(m.strict.precision)}</Cell>
      <Cell className={styles.num}>{formatPercent(m.strict.recall)}</Cell>
      <Cell className={styles.num}>{formatPercent(m.strict.f1)}</Cell>
      <Cell className={styles.num}>{formatPercent(m.overlap.f1)}</Cell>
    </tr>
  );
}

function MetricsTable({ report, caption }: { report: Report; caption: string }) {
  const c = cs.pii.eval.columns;
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table} data-testid="pii-eval-table">
        <caption className={styles.caption}>{caption}</caption>
        <thead>
          <tr>
            <th scope="col">{c.type}</th>
            <th scope="col" className={styles.num}>
              {c.support}
            </th>
            <th scope="col" className={styles.num}>
              {c.precision}
            </th>
            <th scope="col" className={styles.num}>
              {c.recall}
            </th>
            <th scope="col" className={styles.num}>
              {c.f1}
            </th>
            <th scope="col" className={styles.num}>
              {c.overlapF1}
            </th>
          </tr>
        </thead>
        <tbody>
          {PII_TYPES.map((type) => (
            <MetricsRow key={type} label={cs.pii.types[type]} m={report.perType[type]} />
          ))}
        </tbody>
        <tfoot>
          <MetricsRow label={cs.pii.eval.micro} m={report.micro} header />
        </tfoot>
      </table>
    </div>
  );
}

function PersonComparison() {
  const t = cs.pii.eval;
  const both = RESULTS.configs['rules+ner'];
  const nerOnly = RESULTS.nerOnlyPerson;
  if (!both || !nerOnly) return null;
  const rules = RESULTS.configs.rules.test.perType.PERSON;
  const modelWeaker = (nerOnly.test.strict.f1 ?? 0) < (rules.strict.f1 ?? 0);
  const c = t.columns;
  return (
    <>
      <h3>{t.personHeading}</h3>
      <div className={styles.tableWrap}>
        <table className={styles.table} data-testid="pii-person-comparison">
          <thead>
            <tr>
              <th scope="col">{c.type}</th>
              <th scope="col" className={styles.num}>
                {c.support}
              </th>
              <th scope="col" className={styles.num}>
                {c.precision}
              </th>
              <th scope="col" className={styles.num}>
                {c.recall}
              </th>
              <th scope="col" className={styles.num}>
                {c.f1}
              </th>
              <th scope="col" className={styles.num}>
                {c.overlapF1}
              </th>
            </tr>
          </thead>
          <tbody>
            <MetricsRow label={t.personRows.rules} m={rules} />
            <MetricsRow label={t.personRows.ner} m={nerOnly.test} />
            <MetricsRow label={t.personRows.both} m={both.test.perType.PERSON} />
          </tbody>
        </table>
      </div>
      <p>{modelWeaker ? t.personNoteModelWeaker : t.personNoteModelStronger}</p>
    </>
  );
}

function Errors({ report }: { report: Report }) {
  const t = cs.pii.eval;
  if (report.errors.length === 0) return <p className={styles.muted}>{t.noErrors}</p>;
  const types = PII_TYPES.filter((type) => report.errors.some((e) => e.type === type));
  return (
    <div className={styles.errors}>
      {types.map((type) => {
        const items = report.errors.filter((e) => e.type === type);
        return (
          <details key={type}>
            <summary>
              {cs.pii.types[type]} ({formatInt(items.length)})
            </summary>
            <ul>
              {items.map((e, i) => (
                <li key={`${e.docId}-${e.kind}-${i}`}>
                  <strong>{t.kinds[e.kind]}</strong> ({t.notes[e.note]}
                  {e.otherType ? `: ${cs.pii.types[e.otherType]}` : ''}) <code>{e.context}</code>
                </li>
              ))}
            </ul>
          </details>
        );
      })}
    </div>
  );
}

export function EvalResults() {
  const t = cs.pii.eval;
  const available: ConfigId[] = RESULTS.configs['rules+ner'] ? ['rules', 'rules+ner'] : ['rules'];
  const [config, setConfig] = useState<ConfigId>(available.at(-1)!);
  const report = (RESULTS.configs[config] ?? RESULTS.configs.rules).test;
  const { leakage } = report;
  const { corpus, ner } = RESULTS;

  return (
    <section className={styles.section} aria-labelledby="eval-heading">
      <h2 id="eval-heading">{t.heading}</h2>
      <p>{t.intro}</p>
      <p className={styles.warning} role="note" data-testid="synthetic-warning">
        {t.warning}
      </p>

      <fieldset className={styles.inlineRadios}>
        <legend className={styles.groupLabel}>{t.configLegend}</legend>
        {available.map((id) => (
          <label key={id}>
            <input
              type="radio"
              name="pii-eval-config"
              value={id}
              checked={config === id}
              onChange={() => setConfig(id)}
            />
            {t.configs[id]}
          </label>
        ))}
      </fieldset>
      {available.length === 1 && <p className={styles.muted}>{t.noNer}</p>}

      <MetricsTable report={report} caption={t.caption(t.configs[config])} />
      <p className={styles.small}>{t.metricsNote}</p>

      <h3>{t.leakageHeading}</h3>
      <p data-testid="pii-leakage">
        {t.leakage(
          formatInt(leakage.leakedSpans),
          formatInt(leakage.goldSpans),
          formatPercent(leakage.spanRate),
        )}{' '}
        {t.leakagePartial(formatInt(leakage.partialSpans))}
      </p>
      <p className={styles.small}>{t.leakageNote}</p>

      <PersonComparison />

      <h3>{t.errorsHeading}</h3>
      <p className={styles.small}>{t.errorsIntro}</p>
      <Errors report={report} />

      <h3>{t.provenanceHeading}</h3>
      <dl className={styles.provenance}>
        <div>
          <dt>{t.provenance.testLabel}</dt>
          <dd>
            {t.provenance.test(
              corpus.splits.test.documents,
              corpus.splits.test.goldSpans,
              corpus.splits.test.seed,
            )}
          </dd>
        </div>
        <div>
          <dt>{t.provenance.devLabel}</dt>
          <dd>{t.provenance.dev(corpus.splits.dev.documents)}</dd>
        </div>
        <div>
          <dt>{t.provenance.library}</dt>
          <dd>
            <code>
              {RESULTS.library.name} {RESULTS.library.version}
            </code>
          </dd>
        </div>
        {ner && (
          <div>
            <dt>{t.provenance.nerModel}</dt>
            <dd>
              {t.provenance.nerValue(
                ner.model.id,
                ner.model.revision.slice(0, 7),
                formatDate(ner.recordedAt),
              )}
            </dd>
          </div>
        )}
        <div>
          <dt>{t.provenance.generatedAt}</dt>
          <dd>{formatDate(RESULTS.generatedAt)}</dd>
        </div>
      </dl>
    </section>
  );
}
