import { AgentWorld } from './AgentScene.tsx';
import { agentPlaces, agentTimeline } from './agent-timeline.ts';
import { IntakeWorld } from './IntakeScene.tsx';
import { intakePlaces, intakeTimeline } from './intake-timeline.ts';
import { LocalWorld } from './LocalScene.tsx';
import { localPlaces, localTimeline } from './local-timeline.ts';
import { PiiWorld } from './PiiScene.tsx';
import { piiPlaces, piiTimeline } from './pii-timeline.ts';
import type { SceneDef } from './types.ts';

/** One scene per project, in the order of the story. */
export const SCENES: readonly SceneDef[] = [
  { id: 'intake', World: IntakeWorld, places: intakePlaces, timeline: intakeTimeline },
  { id: 'pii', World: PiiWorld, places: piiPlaces, timeline: piiTimeline },
  { id: 'agent', World: AgentWorld, places: agentPlaces, timeline: agentTimeline },
  { id: 'local', World: LocalWorld, places: localPlaces, timeline: localTimeline },
];
