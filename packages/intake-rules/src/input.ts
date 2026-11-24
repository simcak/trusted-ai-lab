/**
 * What the business describes in the Intake form. Every field is a closed list so that
 * rules can match on it and tests can enumerate all combinations.
 */

/** What the system is supposed to do. */
export const TASKS = [
  'calculation',
  'document-qa',
  'classification',
  'extraction',
  'drafting',
  'actions',
  'scoring',
] as const;
export type Task = (typeof TASKS)[number];

/** The most sensitive data the system handles, in increasing order. */
export const DATA_SENSITIVITIES = [
  'public',
  'internal',
  'confidential',
  'personal',
  'special',
] as const;
export type DataSensitivity = (typeof DATA_SENSITIVITIES)[number];

export const AUDIENCES = ['internal', 'clients'] as const;
export type Audience = (typeof AUDIENCES)[number];

/** Whether the output decides about people, and in which area (AI Act Annex III areas first). */
export const DECISIONS = ['none', 'credit', 'insurance', 'employment', 'other'] as const;
export type Decision = (typeof DECISIONS)[number];

/** Does the output only support a human, or does it decide / act on its own? */
export const AUTOMATIONS = ['assist', 'automatic'] as const;
export type Automation = (typeof AUTOMATIONS)[number];

export const EXPLAINABILITY_LEVELS = ['standard', 'high'] as const;
export type Explainability = (typeof EXPLAINABILITY_LEVELS)[number];

export const ERROR_TOLERANCES = ['low', 'medium', 'high'] as const;
export type ErrorTolerance = (typeof ERROR_TOLERANCES)[number];

/** Requests per month; the numeric ranges are in `cost.ts` (`VOLUME_RANGES`). */
export const VOLUMES = [
  'hundreds',
  'thousands',
  'tens-of-thousands',
  'hundreds-of-thousands',
] as const;
export type Volume = (typeof VOLUMES)[number];

export const LATENCIES = ['realtime', 'interactive', 'batch'] as const;
export type Latency = (typeof LATENCIES)[number];

/** Practices prohibited by AI Act Art. 5 that a finance firm could plausibly propose. */
export const PRACTICES = ['none', 'emotion-workplace', 'social-scoring'] as const;
export type Practice = (typeof PRACTICES)[number];

export const BOOLEANS = [true, false] as const;

/** Everything the rules can see. The free-text description is not a fact: rules never read it. */
export interface IntakeFacts {
  task: Task;
  dataSensitivity: DataSensitivity;
  audience: Audience;
  decisionAboutPeople: Decision;
  automation: Automation;
  /** Can the task be written down as exact rules or a formula? */
  deterministic: boolean;
  /** Are there historical examples with the correct answer? */
  labeledData: boolean;
  explainability: Explainability;
  errorTolerance: ErrorTolerance;
  volume: Volume;
  latency: Latency;
  practice: Practice;
}

export interface IntakeInput extends IntakeFacts {
  description: string;
}

export type FactField = keyof IntakeFacts;

/** Allowed values per field, in display order. Drives the form and the exhaustive tests. */
export const FIELD_OPTIONS = {
  task: TASKS,
  dataSensitivity: DATA_SENSITIVITIES,
  audience: AUDIENCES,
  decisionAboutPeople: DECISIONS,
  automation: AUTOMATIONS,
  deterministic: BOOLEANS,
  labeledData: BOOLEANS,
  explainability: EXPLAINABILITY_LEVELS,
  errorTolerance: ERROR_TOLERANCES,
  volume: VOLUMES,
  latency: LATENCIES,
  practice: PRACTICES,
} as const satisfies { [K in FactField]: readonly IntakeFacts[K][] };

export const FACT_FIELDS = Object.keys(FIELD_OPTIONS) as FactField[];

/**
 * A deliberately unremarkable starting point: internal drafting assistant with no decisions
 * about people. Tests override single fields on top of it.
 */
export const NEUTRAL_INPUT: IntakeInput = {
  description: '',
  task: 'drafting',
  dataSensitivity: 'internal',
  audience: 'internal',
  decisionAboutPeople: 'none',
  automation: 'assist',
  deterministic: false,
  labeledData: false,
  explainability: 'standard',
  errorTolerance: 'medium',
  volume: 'thousands',
  latency: 'interactive',
  practice: 'none',
};
