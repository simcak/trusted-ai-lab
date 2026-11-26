import type { SpriteDef } from '../pixel/pixel-art.ts';
import { agentThumb, intakeThumb, localThumb, piiThumb } from '../pixel/sprites/projects.ts';

/**
 * Projects in the gallery, in display order. A pure gallery: no numbering, each project
 * stands on its own. Texts live in i18n/cs.ts under `modules[id]`.
 */
export type ModuleId = 'intake' | 'pii' | 'agent' | 'local';
export type TagId = 'privacy' | 'local' | 'llm' | 'agents' | 'decisions' | 'aiAct';
/** Pixel-palette ramp used for the project's card and display frame (see styles/pixel.css). */
export type Accent = 'sun' | 'berry' | 'sky' | 'leaf';

export interface ModuleMeta {
  id: ModuleId;
  path: `/${string}`;
  /** `ready` once implemented; `planned` would show as a locked card. */
  status: 'ready' | 'planned';
  tags: readonly TagId[];
  accent: Accent;
  thumb: SpriteDef;
}

export const MODULES: readonly ModuleMeta[] = [
  {
    id: 'intake',
    path: '/intake',
    status: 'ready',
    tags: ['decisions', 'aiAct'],
    accent: 'sun',
    thumb: intakeThumb,
  },
  {
    id: 'pii',
    path: '/pii',
    status: 'ready',
    tags: ['privacy', 'llm'],
    accent: 'berry',
    thumb: piiThumb,
  },
  {
    id: 'agent',
    path: '/agent',
    status: 'ready',
    tags: ['agents', 'llm'],
    accent: 'sky',
    thumb: agentThumb,
  },
  {
    id: 'local',
    path: '/local',
    status: 'ready',
    tags: ['local', 'privacy'],
    accent: 'leaf',
    thumb: localThumb,
  },
];

export function getModule(id: ModuleId): ModuleMeta {
  const meta = MODULES.find((m) => m.id === id);
  if (!meta) throw new Error(`Unknown module "${id}"`);
  return meta;
}
