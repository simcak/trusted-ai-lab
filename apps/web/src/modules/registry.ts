/** The four modules in story order (CLAUDE.md §1). Texts live in i18n/cs.ts under the same id. */
export type ModuleId = 'intake' | 'pii' | 'agent' | 'local';

export interface ModuleMeta {
  id: ModuleId;
  number: number;
  path: `/${string}`;
  /** Development phase in which the module gets implemented. */
  phase: number;
}

export const MODULES: readonly ModuleMeta[] = [
  { id: 'intake', number: 1, path: '/intake', phase: 2 },
  { id: 'pii', number: 2, path: '/pii', phase: 1 },
  { id: 'agent', number: 3, path: '/agent', phase: 3 },
  { id: 'local', number: 4, path: '/local', phase: 4 },
];

export function getModule(id: ModuleId): ModuleMeta {
  const meta = MODULES.find((m) => m.id === id);
  if (!meta) throw new Error(`Unknown module "${id}"`);
  return meta;
}

export function getNeighbours(id: ModuleId): { prev?: ModuleMeta; next?: ModuleMeta } {
  const index = MODULES.findIndex((m) => m.id === id);
  return { prev: MODULES[index - 1], next: MODULES[index + 1] };
}
