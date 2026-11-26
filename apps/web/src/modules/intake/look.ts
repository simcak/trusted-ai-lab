import type { IntakeResult, PatternId } from '@trusted-ai-lab/intake-rules';
import type { Tone } from '../../components/Machine/Panel.tsx';
import type { SpriteDef } from '../../pixel/pixel-art.ts';
import {
  book,
  calculator,
  chart,
  gear,
  person,
  robot,
  speech,
  stopSign,
} from '../../pixel/sprites/actors.ts';

/** A picture for every pattern, so the recommendation reads at a glance. */
export const PATTERN_ICON: Record<PatternId, SpriteDef> = {
  'no-ai': calculator,
  'classic-software': gear,
  'classic-ml': chart,
  llm: speech,
  rag: book,
  agent: robot,
  'human-in-the-loop': person,
};

export const iconOf = (result: IntakeResult) =>
  result.blocked ? stopSign : PATTERN_ICON[result.pattern];

/** Colour of the verdict: green without AI, sky for ML, berry for generative AI, ember if banned. */
export function toneOf(result: IntakeResult): Tone {
  if (result.blocked) return 'ember';
  switch (result.pattern) {
    case 'no-ai':
    case 'classic-software':
      return 'leaf';
    case 'classic-ml':
      return 'sky';
    case 'human-in-the-loop':
      return 'sun';
    default:
      return 'berry';
  }
}
