/**
 * A tiny condition language. Conditions are plain data (no functions), so a rule can be shown
 * to a person, serialised into an ADR and checked by tests in the same form it is evaluated.
 */

export type FieldCondition<F> = {
  [K in keyof F & string]: { field: K; is: F[K] } | { field: K; in: readonly F[K][] };
}[keyof F & string];

export type Condition<F> =
  | FieldCondition<F>
  | { all: readonly Condition<F>[] }
  | { any: readonly Condition<F>[] }
  | { not: Condition<F> }
  /** Meta rules evaluated by the engine itself (see `engine.ts`). */
  | { always: true };

export function evalCondition<F>(condition: Condition<F>, facts: F): boolean {
  if ('always' in condition) return true;
  if ('all' in condition) return condition.all.every((c) => evalCondition(c, facts));
  if ('any' in condition) return condition.any.some((c) => evalCondition(c, facts));
  if ('not' in condition) return !evalCondition(condition.not, facts);
  const value = facts[condition.field];
  if ('is' in condition) return value === condition.is;
  return (condition.in as readonly unknown[]).includes(value);
}

/** Fields a condition reads, in order of first appearance. */
export function conditionFields<F>(condition: Condition<F>): (keyof F & string)[] {
  const out: (keyof F & string)[] = [];
  const visit = (c: Condition<F>): void => {
    if ('always' in c) return;
    if ('all' in c) return c.all.forEach(visit);
    if ('any' in c) return c.any.forEach(visit);
    if ('not' in c) return visit(c.not);
    if (!out.includes(c.field)) out.push(c.field);
  };
  visit(condition);
  return out;
}
