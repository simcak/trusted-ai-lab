import { describe, expect, it } from 'vitest';
import { AI_ACT_CATEGORIES, AI_ACT_MILESTONES, AI_ACT_STATUS } from './ai-act.ts';
import { CONTROLS } from './controls.ts';
import { TECHNICAL_PATTERNS } from './patterns.ts';
import { RULES } from './rules.ts';

const isoDate = /^\d{4}-\d{2}-\d{2}$/;

describe('rule set integrity', () => {
  it('rule ids are unique', () => {
    const ids = RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('pattern rules come first and carry the `pattern.` prefix', () => {
    const stages = RULES.map((r) => r.stage);
    expect(stages.lastIndexOf('pattern')).toBeLessThan(stages.indexOf('outcome'));
    for (const r of RULES) expect(r.id.startsWith('pattern.')).toBe(r.stage === 'pattern');
  });

  it('every rule has a rationale and a reference', () => {
    for (const r of RULES) {
      expect(r.rationale.trim().length, r.id).toBeGreaterThan(20);
      expect(r.rationale.trim().endsWith('.'), r.id).toBe(true);
      expect(r.reference.label.trim().length, r.id).toBeGreaterThan(0);
      const url = 'url' in r.reference ? r.reference.url : undefined;
      if (url !== undefined) expect(url, r.id).toMatch(/^https:\/\//);
    }
  });

  it('no pattern, control or AI Act category is dead', () => {
    const excludable = new Set<string>();
    const controls = new Set<string>();
    const categories = new Set<string>();
    for (const r of RULES) {
      const e = r.effect;
      if (e.kind === 'exclude') e.patterns.forEach((p) => excludable.add(p));
      if (e.kind === 'controls') e.controls.forEach((c) => controls.add(c));
      if (e.kind === 'ai-act') categories.add(e.category);
    }
    expect([...excludable].sort()).toEqual([...TECHNICAL_PATTERNS].sort());
    expect([...controls].sort()).toEqual([...CONTROLS].sort());
    expect([...categories].sort()).toEqual([...AI_ACT_CATEGORIES].sort());
  });
});

describe('AI Act status', () => {
  it('states the date it was verified', () => {
    expect(AI_ACT_STATUS.asOf).toMatch(isoDate);
  });

  it('milestones are dated and in chronological order', () => {
    const dates = AI_ACT_MILESTONES.map((m) => m.date);
    for (const d of dates) expect(d).toMatch(isoDate);
    expect([...dates].sort()).toEqual(dates);
  });

  it('every source is an https link', () => {
    const urls = [
      AI_ACT_STATUS.regulation.url,
      AI_ACT_STATUS.amendment.url,
      ...AI_ACT_STATUS.sources.map((s) => s.url),
    ];
    for (const url of urls) expect(url).toMatch(/^https:\/\//);
  });
});
