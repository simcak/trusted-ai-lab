import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cs } from '../../../i18n/cs.ts';
import { SCENES } from './index.ts';

describe.each(SCENES.map((s) => [s.id, s] as const))('scene %s', (id, scene) => {
  const World = scene.World;
  const setup = () =>
    render(
      <div>
        <World />
        {cs.landing.scenes[id].captions.map((text, i) => (
          <p key={text} data-part={`caption-${i}`}>
            {text}
          </p>
        ))}
      </div>,
    ).container;

  it('animates only parts that exist, on one clock within its duration', () => {
    const timeline = scene.timeline(setup());
    expect(timeline.duration).toBeGreaterThan(8000);
    expect(timeline.duration).toBeLessThanOrEqual(12_000);
    for (const track of timeline.tracks) {
      expect(track.target, JSON.stringify(track.keys[0])).toBeTruthy();
      const times = track.keys.map(([ms]) => ms);
      expect(times).toEqual([...times].sort((a, b) => a - b));
      expect(Math.max(...times)).toBeLessThanOrEqual(timeline.duration);
    }
  });

  it('has three captions and a label for every place', () => {
    const texts = cs.landing.scenes[id];
    expect(texts.captions).toHaveLength(3);
    const places = texts.places as Record<string, string>;
    for (const p of scene.places) {
      expect(places[p.key], p.key).toBeTruthy();
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(400);
    }
  });
});
