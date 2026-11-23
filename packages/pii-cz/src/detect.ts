import { detectAddress } from './detectors/address.ts';
import {
  detectEmail,
  detectIdCard,
  detectPassport,
  detectPhone,
  detectPsc,
} from './detectors/contact.ts';
import {
  detectBankAccount,
  detectDic,
  detectIban,
  detectIco,
  detectRodneCislo,
} from './detectors/numbers.ts';
import { detectPerson } from './names/person.ts';
import { resolveOverlaps } from './resolve.ts';
import {
  DEFAULT_MIN_SCORE,
  type AsyncDetector,
  type DetectOptions,
  type Detector,
  type Finding,
} from './types.ts';

export const RULE_DETECTORS: readonly Detector[] = [
  detectRodneCislo,
  detectIco,
  detectDic,
  detectBankAccount,
  detectIban,
  detectPhone,
  detectEmail,
  detectPsc,
  detectIdCard,
  detectPassport,
  detectAddress,
  detectPerson,
];

function filter(findings: readonly Finding[], options: DetectOptions): Finding[] {
  const minScore = options.minScore ?? DEFAULT_MIN_SCORE;
  return findings.filter(
    (f) => f.score >= minScore && (options.types === undefined || options.types.includes(f.type)),
  );
}

/** All rule candidates, unresolved and unfiltered — for debugging and the eval's error analysis. */
export function detectCandidates(text: string, options: DetectOptions = {}): Finding[] {
  const ctx = { today: options.today ?? new Date() };
  return RULE_DETECTORS.flatMap((detector) => detector(text, ctx));
}

/** Synchronous, deterministic detection with the rule detectors only. */
export function detect(text: string, options: DetectOptions = {}): Finding[] {
  return resolveOverlaps(filter(detectCandidates(text, options), options));
}

/**
 * Merges findings of plugin detectors (e.g. NER) into rule findings. Defined as
 * `resolve(rules ∪ plugins)` so the eval can replay cached plugin output exactly.
 */
export function mergeFindings(
  ruleFindings: readonly Finding[],
  pluginFindings: readonly Finding[],
  options: DetectOptions = {},
): Finding[] {
  return resolveOverlaps([...ruleFindings, ...filter(pluginFindings, options)]);
}

/** Rule detection plus plugin detectors (which may be asynchronous, e.g. a model in the browser). */
export async function detectAsync(
  text: string,
  plugins: readonly AsyncDetector[],
  options: DetectOptions = {},
): Promise<Finding[]> {
  const rules = detect(text, options);
  const extra = (await Promise.all(plugins.map((plugin) => plugin(text)))).flat();
  return mergeFindings(rules, extra, options);
}
