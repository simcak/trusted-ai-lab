import { describe, expect, it } from 'vitest';
import tokens from './tokens.css?raw';

/** Custom properties declared in a CSS block, `--name: #hex` only. */
function readColours(block: string): Map<string, string> {
  const out = new Map<string, string>();
  for (const match of block.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-f]{6})\s*;/gi)) {
    out.set(match[1]!, match[2]!.toLowerCase());
  }
  return out;
}

const darkStart = tokens.indexOf(":root[data-theme='dark']");
const light = readColours(tokens.slice(0, darkStart));
const dark = new Map([...light, ...readColours(tokens.slice(darkStart))]);

function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = Number.parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(0) + 0.7152 * channel(1) + 0.0722 * channel(2);
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Text colour → backgrounds it is used on. */
const TEXT_PAIRS: Array<[string, string[]]> = [
  ['color-text', ['color-bg', 'color-surface', 'color-surface-muted', 'color-accent-soft']],
  ['color-text-muted', ['color-bg', 'color-surface', 'color-surface-muted']],
  ['color-accent', ['color-bg', 'color-surface']],
  ['color-accent-hover', ['color-accent-soft', 'color-surface']],
  ['color-on-accent', ['color-accent', 'color-accent-hover']],
  ['color-success', ['color-success-soft', 'color-surface']],
  ['color-danger', ['color-danger-soft', 'color-surface']],
  ['color-warning', ['color-warning-soft', 'color-surface']],
];

describe.each([
  ['light', light],
  ['dark', dark],
] as const)('%s theme', (_name, colours) => {
  it.each(TEXT_PAIRS)('%s meets WCAG AA (4.5:1) on its backgrounds', (text, backgrounds) => {
    for (const bg of backgrounds) {
      const fg = colours.get(text);
      const back = colours.get(bg);
      expect(fg, text).toBeDefined();
      expect(back, bg).toBeDefined();
      expect(contrast(fg!, back!), `${text} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('pixel frames are visible against the page (≥ 3:1, non-text)', () => {
    expect(contrast(colours.get('color-frame')!, colours.get('color-bg')!)).toBeGreaterThanOrEqual(
      3,
    );
  });
});

/*
 * Project pages take the project's colour (components/ProjectShell): light theme uses ramp 0
 * with white text, dark theme ramp 2 with ink text. Ramp 3 is the soft tint behind text.
 */
describe.each(['sun', 'berry', 'sky', 'leaf'])('project colour %s', (ramp) => {
  const px = (step: number | string) => light.get(`px-${ramp}-${step}`)!;

  it('light theme: accent text and buttons meet WCAG AA', () => {
    for (const bg of ['color-bg', 'color-surface']) {
      expect(contrast(px(0), light.get(bg)!), `${ramp}-0 on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(light.get('px-white')!, px(0))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light.get('color-text')!, px(3))).toBeGreaterThanOrEqual(4.5);
  });

  it('dark theme: accent text and buttons meet WCAG AA', () => {
    for (const bg of ['color-bg', 'color-surface']) {
      expect(contrast(px(2), dark.get(bg)!), `${ramp}-2 on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast(dark.get('px-ink-0')!, px(2))).toBeGreaterThanOrEqual(4.5);
  });
});

/*
 * Ochrana dat colours findings by category (modules/pii/pii.module.css): light theme puts text
 * on ramp 3 and white on ramp 0, dark theme ink on ramp 2. Ember has no ramp 3 (a tint is mixed).
 */
describe.each(['berry', 'ember', 'sun', 'sky'])('PII category colour %s', (ramp) => {
  const px = (step: number) => light.get(`px-${ramp}-${step}`);

  it('chips are readable in both themes', () => {
    expect(contrast(light.get('px-white')!, px(0)!)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(light.get('px-ink-0')!, px(2)!)).toBeGreaterThanOrEqual(4.5);
  });

  it('text on the light tint meets WCAG AA', () => {
    const tint = px(3);
    if (tint) expect(contrast(light.get('color-text')!, tint)).toBeGreaterThanOrEqual(4.5);
  });
});
