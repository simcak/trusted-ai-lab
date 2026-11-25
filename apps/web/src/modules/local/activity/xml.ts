import { ActivityParseError } from './types.ts';

/** Parses XML with the browser's own parser (no library) and rejects malformed files. */
export function parseXml(text: string): Document {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new ActivityParseError('invalid_file', 'Malformed XML');
  }
  return doc;
}

/** Elements by local name in any namespace (GPX and TCX files use varying prefixes). */
export function byName(root: Document | Element, localName: string): Element[] {
  return Array.from(root.getElementsByTagNameNS('*', localName));
}

/** Direct child by local name. */
export function child(el: Element, localName: string): Element | undefined {
  for (const c of Array.from(el.children)) if (c.localName === localName) return c;
  return undefined;
}

/** Text of the first descendant with the given local name, trimmed. */
export function text(el: Element, localName: string): string | undefined {
  const value = byName(el, localName)[0]?.textContent?.trim();
  return value ? value : undefined;
}

export function num(value: string | null | undefined): number | undefined {
  if (value === null || value === undefined || value.trim() === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

export function time(value: string | null | undefined): number | undefined {
  if (!value) return undefined;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : undefined;
}
