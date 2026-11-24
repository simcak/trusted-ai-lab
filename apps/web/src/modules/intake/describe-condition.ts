import type { Condition, OutcomeFacts } from '@trusted-ai-lab/intake-rules';
import { cs } from '../../i18n/cs.ts';
import { fieldLabel, valueLabel } from './labels.ts';

type AnyCondition = Condition<OutcomeFacts>;

const t = cs.intake.rules;

function values(field: keyof OutcomeFacts, list: readonly unknown[]): string {
  return list.map((v) => valueLabel(field, v)).join(t.oneOf);
}

const isCompound = (c: AnyCondition) => 'all' in c || 'any' in c;

/** A rule condition in plain Czech, e.g. „Úloha: Odpovídat z dokumentů a zároveň …“. */
export function describeCondition(c: AnyCondition): string {
  if ('always' in c) return t.always;
  if ('all' in c || 'any' in c) {
    const parts = 'all' in c ? c.all : c.any;
    return parts
      .map((p) => (isCompound(p) ? `(${describeCondition(p)})` : describeCondition(p)))
      .join('all' in c ? t.and : t.or);
  }
  if ('not' in c) {
    const inner = c.not;
    if ('field' in inner) {
      const value =
        'is' in inner ? valueLabel(inner.field, inner.is) : values(inner.field, inner.in);
      return t.isNot(fieldLabel(inner.field), value);
    }
    return t.not(describeCondition(inner));
  }
  const value = 'is' in c ? valueLabel(c.field, c.is) : values(c.field, c.in);
  return t.is(fieldLabel(c.field), value);
}
