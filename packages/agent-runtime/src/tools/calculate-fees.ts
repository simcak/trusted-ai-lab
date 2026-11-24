import type { Fund } from '../funds.ts';
import type { CalculateFeesInput } from './schemas.ts';

export interface FeeBreakdown {
  fundId: string;
  fundName: string;
  amount: number;
  years: number;
  entryFeePct: number;
  annualFeePct: number;
  entryFee: number;
  annualFeesTotal: number;
  totalFees: number;
  /** Total fees as % of the invested amount. */
  totalFeesPct: number;
  assumption: string;
}

export const FEE_ASSUMPTION =
  'Zhodnocení 0 % ročně, roční poplatek se strhává z aktuální hodnoty investice. Ilustrativní výpočet, ne předpověď.';

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Deterministic fee calculation — the model never does arithmetic itself.
 * The entry fee is taken from the amount; the annual fee is charged each year from the remaining
 * value, assuming zero return (stated in the result, so the number is not mistaken for a forecast).
 */
export function calculateFees(fund: Fund, input: CalculateFeesInput): FeeBreakdown {
  const entryFee = (input.amount * fund.entryFeePct) / 100;
  let balance = input.amount - entryFee;
  let annualFeesTotal = 0;
  for (let year = 0; year < input.years; year += 1) {
    const fee = (balance * fund.annualFeePct) / 100;
    annualFeesTotal += fee;
    balance -= fee;
  }
  const totalFees = entryFee + annualFeesTotal;
  return {
    fundId: fund.id,
    fundName: fund.name,
    amount: input.amount,
    years: input.years,
    entryFeePct: fund.entryFeePct,
    annualFeePct: fund.annualFeePct,
    entryFee: round2(entryFee),
    annualFeesTotal: round2(annualFeesTotal),
    totalFees: round2(totalFees),
    totalFeesPct: round2((totalFees / input.amount) * 100),
    assumption: FEE_ASSUMPTION,
  };
}
