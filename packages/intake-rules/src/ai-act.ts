/**
 * EU AI Act status used by the Intake rules. Verified on `asOf` from EU institution pages
 * (see `sources`). The Official Journal text on EUR-Lex could not be read automatically
 * (docs/OPEN_QUESTIONS.md OQ-17), so the dates come from the Commission's consolidated text
 * (Article 113 as amended) and the Parliament's procedure file.
 */

export const AI_ACT_CATEGORIES = [
  'prohibited',
  'high-risk',
  'transparency',
  'minimal',
  'out-of-scope',
] as const;
/** In order of severity: the first one found is the headline category. */
export type AiActCategory = (typeof AI_ACT_CATEGORIES)[number];

export const AI_ACT_MILESTONES = [
  {
    id: 'chapters-i-ii',
    date: '2025-02-02',
    label: 'Obecná ustanovení včetně AI gramotnosti (čl. 4) a zakázané praktiky (čl. 5)',
    provision: 'čl. 113 písm. a)',
  },
  {
    id: 'gpai',
    date: '2025-08-02',
    label: 'Modely AI pro obecné účely, správa a sankce',
    provision: 'čl. 113 písm. b)',
  },
  {
    id: 'general',
    date: '2026-08-02',
    label: 'Většina pravidel včetně povinností transparentnosti (čl. 50)',
    provision: 'čl. 113',
  },
  {
    id: 'new-prohibitions',
    date: '2026-12-02',
    label:
      'Nové zákazy z Omnibusu (čl. 5 odst. 1 písm. ba) a bb)) a konec přechodného období pro čl. 50 odst. 2',
    provision: 'čl. 113 písm. a), čl. 111 odst. 4',
  },
  {
    id: 'annex-iii',
    date: '2027-12-02',
    label: 'Vysoce rizikové systémy podle přílohy III',
    provision: 'čl. 113 písm. c) bod i)',
  },
  {
    id: 'annex-i',
    date: '2028-08-02',
    label: 'Vysoce rizikové systémy podle přílohy I (součásti výrobků)',
    provision: 'čl. 113 písm. c) bod ii)',
  },
] as const;
export type MilestoneId = (typeof AI_ACT_MILESTONES)[number]['id'];
export type Milestone = (typeof AI_ACT_MILESTONES)[number];

export function getMilestone(id: MilestoneId): Milestone {
  const found = AI_ACT_MILESTONES.find((m) => m.id === id);
  if (!found) throw new Error(`Unknown AI Act milestone: ${id}`);
  return found;
}

export const AI_ACT_STATUS = {
  /** Date the status below was checked against the sources. */
  asOf: '2026-11-24',
  regulation: {
    label: 'Nařízení (EU) 2024/1689 (AI Act)',
    url: 'https://eur-lex.europa.eu/eli/reg/2024/1689/oj',
  },
  amendment: {
    label:
      'Nařízení (EU) 2026/1744 (Digital Omnibus on AI), Úř. věst. L 24. 7. 2026, účinné od 27. 7. 2026',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:L_202601744',
  },
  sources: [
    {
      label: 'Evropská komise, AI Act Service Desk: časová osa a konsolidované znění k 27. 7. 2026',
      url: 'https://ai-act-service-desk.ec.europa.eu/en/ai-act/timeline/timeline-implementation-eu-ai-act',
    },
    {
      label: 'Evropská komise: AI Omnibus enters into force (27. 7. 2026)',
      url: 'https://digital-strategy.ec.europa.eu/en/news/ai-omnibus-enters-force',
    },
    {
      label: 'Evropský parlament, Legislative Observatory, 2025/0359(COD)',
      url: 'https://oeil.europarl.europa.eu/oeil/en/procedure-file?reference=2025/0359(COD)',
    },
  ],
} as const;
