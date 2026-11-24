import { describe, expect, it } from 'vitest';
import { conditionFields, evalCondition, type Condition } from './condition.ts';

interface F {
  a: 'x' | 'y' | 'z';
  b: boolean;
}

const facts: F = { a: 'x', b: false };
const holds = (c: Condition<F>) => evalCondition(c, facts);

describe('evalCondition', () => {
  it('compares a field with `is`', () => {
    expect(holds({ field: 'a', is: 'x' })).toBe(true);
    expect(holds({ field: 'a', is: 'y' })).toBe(false);
    expect(holds({ field: 'b', is: false })).toBe(true);
  });

  it('checks membership with `in`', () => {
    expect(holds({ field: 'a', in: ['y', 'x'] })).toBe(true);
    expect(holds({ field: 'a', in: ['y', 'z'] })).toBe(false);
    expect(holds({ field: 'a', in: [] })).toBe(false);
  });

  it('combines with all / any / not', () => {
    const x = { field: 'a', is: 'x' } as const;
    const bTrue = { field: 'b', is: true } as const;
    expect(holds({ all: [x, { not: bTrue }] })).toBe(true);
    expect(holds({ all: [x, bTrue] })).toBe(false);
    expect(holds({ any: [bTrue, x] })).toBe(true);
    expect(holds({ any: [bTrue] })).toBe(false);
    expect(holds({ not: x })).toBe(false);
  });

  it('treats empty all as true and empty any as false', () => {
    expect(holds({ all: [] })).toBe(true);
    expect(holds({ any: [] })).toBe(false);
  });

  it('`always` holds', () => {
    expect(holds({ always: true })).toBe(true);
  });
});

describe('conditionFields', () => {
  it('lists each field once, in order of appearance', () => {
    expect(
      conditionFields<F>({
        all: [
          { field: 'b', is: true },
          { any: [{ field: 'a', is: 'x' }, { not: { field: 'b', is: false } }] },
        ],
      }),
    ).toEqual(['b', 'a']);
    expect(conditionFields<F>({ always: true })).toEqual([]);
  });
});
