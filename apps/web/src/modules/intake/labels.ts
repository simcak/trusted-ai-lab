import {
  TECHNICAL_PATTERNS,
  type ControlId,
  type FactField,
  type IntakeFacts,
  type IntakeResult,
  type OutcomeFacts,
  type RejectedPattern,
  type RuleId,
  type TechnicalPattern,
} from '@trusted-ai-lab/intake-rules';
import { cs } from '../../i18n/cs.ts';
import type { ModuleId } from '../registry.ts';

const t = cs.intake;

/** Headline of the recommendation, e.g. „Klasické strojové učení + člověk ve smyčce“. */
export function patternHeadline(result: IntakeResult): string {
  if (result.blocked) return t.blocked.label;
  const label = t.patterns[result.pattern].label;
  return result.humanInTheLoop && result.pattern !== 'human-in-the-loop'
    ? `${label} ${t.withHuman}`
    : label;
}

export function patternSummary(result: IntakeResult): string {
  return result.blocked ? t.blocked.summary : t.patterns[result.pattern].summary;
}

export function fieldLabel(field: keyof OutcomeFacts): string {
  return field === 'pattern' ? t.rules.patternField : t.fields[field].short;
}

export function valueLabel(field: keyof OutcomeFacts, value: unknown): string {
  const options: Record<string, string> =
    field === 'pattern'
      ? Object.fromEntries(Object.entries(t.patterns).map(([id, p]) => [id, p.label]))
      : t.fields[field].options;
  return options[String(value)] ?? String(value);
}

export function factLabel<K extends FactField>(field: K, value: IntakeFacts[K]): string {
  return valueLabel(field, value);
}

/** Controls that one of the demo modules shows in practice. */
export const CONTROL_MODULE: Partial<Record<ControlId, ModuleId>> = {
  pseudonymization: 'pii',
  'local-processing': 'local',
  'prompt-injection-defense': 'agent',
  'agent-guardrails': 'agent',
  'action-approval': 'agent',
};

export interface RejectedGroup {
  ruleId: RuleId;
  patterns: TechnicalPattern[];
}

/**
 * Rejected patterns grouped by a shared reason, so the same sentence is not repeated
 * (greedy: the rule that explains most of the remaining patterns first). Simplest first.
 */
export function groupRejected(rejected: readonly RejectedPattern[]): RejectedGroup[] {
  const remaining = new Set(rejected.map((r) => r.pattern));
  const groups: RejectedGroup[] = [];
  while (remaining.size > 0) {
    const byRule = new Map<RuleId, TechnicalPattern[]>();
    for (const r of rejected) {
      if (!remaining.has(r.pattern)) continue;
      for (const id of r.ruleIds) byRule.set(id, [...(byRule.get(id) ?? []), r.pattern]);
    }
    let best: RejectedGroup | undefined;
    for (const [ruleId, patterns] of byRule) {
      if (!best || patterns.length > best.patterns.length) best = { ruleId, patterns };
    }
    if (!best) break;
    groups.push(best);
    for (const p of best.patterns) remaining.delete(p);
  }
  const first = (g: RejectedGroup) => TECHNICAL_PATTERNS.indexOf(g.patterns[0] ?? 'agent');
  return groups.sort((a, b) => first(a) - first(b));
}
