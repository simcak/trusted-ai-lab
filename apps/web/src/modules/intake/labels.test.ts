import {
  evaluate,
  FACT_FIELDS,
  FIELD_OPTIONS,
  PRESET_IDS,
  PRESETS,
  RULES,
  VOLUME_RANGES,
  VOLUMES,
} from '@trusted-ai-lab/intake-rules';
import { describe, expect, it } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import { describeCondition } from './describe-condition.ts';
import { formatInt } from './format.ts';
import { factLabel, groupRejected } from './labels.ts';

const normalise = (s: string) => s.replace(/\s/g, ' ');

describe('intake labels', () => {
  it('every option of every field has a Czech label', () => {
    for (const field of FACT_FIELDS) {
      for (const value of FIELD_OPTIONS[field]) {
        const options = cs.intake.fields[field].options as Record<string, string>;
        expect(options[String(value)], `${field}=${String(value)}`).toBeTruthy();
      }
    }
  });

  it('volume labels state the same ranges the cost estimate uses', () => {
    for (const v of VOLUMES) {
      const { min, max } = VOLUME_RANGES[v];
      expect(normalise(factLabel('volume', v))).toBe(
        normalise(`${formatInt(min)}–${formatInt(max)}`),
      );
    }
  });

  it('every rule condition reads as Czech text without raw identifiers', () => {
    for (const rule of RULES) {
      const text = describeCondition(rule.when);
      expect(text.length, rule.id).toBeGreaterThan(0);
      // Raw values such as `document-qa` or `true` would mean a missing label.
      expect(text, rule.id).not.toMatch(/\b[a-z]+-[a-z]+\b|\btrue\b|\bfalse\b/);
    }
  });

  it('renders a compound condition readably', () => {
    const rule = RULES.find((r) => r.id === 'pattern.needs-system');
    expect(rule && describeCondition(rule.when)).toBe(
      'Přesné řešení: Ano a zároveň Úloha: Odpovídat z dokumentů / Provádět kroky v systémech',
    );
  });
});

describe('groupRejected', () => {
  it('merges alternatives rejected for the same reason', () => {
    const { rejected } = evaluate(PRESETS['credit-decision']);
    expect(groupRejected(rejected)).toEqual([
      { ruleId: 'pattern.no-exact-solution', patterns: ['no-ai', 'classic-software'] },
      { ruleId: 'pattern.explainable-decisions', patterns: ['llm', 'rag', 'agent'] },
    ]);
  });

  it('lists every rejected pattern exactly once, with one of its own reasons', () => {
    for (const id of PRESET_IDS) {
      const { rejected } = evaluate(PRESETS[id]);
      const groups = groupRejected(rejected);
      const listed = groups.flatMap((g) => g.patterns);
      expect([...listed].sort(), id).toEqual(rejected.map((r) => r.pattern).sort());
      for (const g of groups) {
        for (const p of g.patterns) {
          expect(rejected.find((r) => r.pattern === p)?.ruleIds, id).toContain(g.ruleId);
        }
      }
    }
  });
});
