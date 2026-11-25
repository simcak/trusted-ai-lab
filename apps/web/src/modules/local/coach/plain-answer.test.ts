import { describe, expect, it } from 'vitest';
import { plainAnswer } from './plain-answer.ts';

describe('plainAnswer', () => {
  it('drops code blocks, headings, list markers and emphasis', () => {
    const raw =
      '```json\n{"sport":"běh"}\n```\n\n### Shrnutí:\n- **Vzdálenost**: 5,4 km\n- Tempo *5:36*\n\n\n\nDobrá práce.';
    expect(plainAnswer(raw)).toBe('Shrnutí:\nVzdálenost: 5,4 km\nTempo 5:36\n\nDobrá práce.');
  });

  it('hides an unfinished code block while the answer is still streaming', () => {
    expect(plainAnswer('Trénink byl dobrý.\n```json\n{"spo')).toBe('Trénink byl dobrý.');
  });

  it('leaves plain text alone', () => {
    const text = 'Trénink trval 31 minut. Tempo 5:36 min/km je klidné.';
    expect(plainAnswer(text)).toBe(text);
  });
});
