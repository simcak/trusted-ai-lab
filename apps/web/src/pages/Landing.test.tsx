import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { cs } from '../i18n/cs.ts';
import { Landing } from './Landing.tsx';

describe('Landing', () => {
  it('shows the four modules in story order, each linking to its route', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );

    const cards = screen.getAllByTestId('module-card');
    const expected = [
      ['intake', '/intake'],
      ['pii', '/pii'],
      ['agent', '/agent'],
      ['local', '/local'],
    ] as const;

    expect(cards).toHaveLength(expected.length);
    expected.forEach(([id, path], i) => {
      const card = within(cards[i]!);
      const texts = cs.modules[id];
      const link = card.getByRole('link', { name: cs.landing.openModule(texts.title) });
      expect(link.getAttribute('href')).toBe(path);
      expect(card.getByText(texts.question)).toBeTruthy();
      expect(card.getByText(texts.proof)).toBeTruthy();
    });
  });

  it('marks implemented modules as done', () => {
    render(
      <MemoryRouter>
        <Landing />
      </MemoryRouter>,
    );
    for (const card of screen.getAllByTestId('module-card')) {
      expect(within(card).getByText(cs.status.ready)).toBeTruthy();
    }
  });
});
