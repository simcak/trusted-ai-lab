/** Controls the Intake can require. Labels and links to the demo modules live in the web app. */
export const CONTROLS = [
  'pseudonymization',
  'local-processing',
  'provider-terms',
  'permission-aware-retrieval',
  'prompt-injection-defense',
  'agent-guardrails',
  'action-approval',
  'human-intervention',
  'dpia',
  'human-oversight',
  'logging',
  'fria',
  'evals',
] as const;
export type ControlId = (typeof CONTROLS)[number];
