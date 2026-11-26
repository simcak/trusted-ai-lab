import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { cs } from '../i18n/cs.ts';
import { Landing } from './Landing.tsx';

function renderLanding() {
  render(
    <MemoryRouter>
      <Landing />
    </MemoryRouter>,
  );
}

describe('Landing', () => {
  it('shows a gallery card per project, each linking to its route', () => {
    renderLanding();
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
      const link = card.getByRole('link', { name: cs.landing.openProject(texts.title) });
      expect(link.getAttribute('href')).toBe(path);
      expect(card.getByText(texts.question)).toBeTruthy();
      expect(card.getByText(texts.card)).toBeTruthy();
    });
  });

  it('announces that more projects are coming, without a link', () => {
    renderLanding();
    const soon = screen.getByText(cs.landing.comingSoon.title).closest('div')!;
    expect(within(soon).queryByRole('link')).toBeNull();
  });

  it('keeps the hero scene out of the accessibility tree but describes it in text', () => {
    renderLanding();
    expect(screen.getByRole('heading', { level: 1, name: cs.app.name })).toBeTruthy();
    expect(screen.getByText(cs.landing.hero.description)).toBeTruthy();
    expect(screen.getByRole('button', { name: cs.landing.hero.pause })).toBeTruthy();
  });
});
