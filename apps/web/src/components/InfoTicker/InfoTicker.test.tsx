import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import { InfoTicker } from './InfoTicker.tsx';

const TIPS = ['První tip.', 'Druhý tip.', 'Třetí tip.'];

/** jsdom has no AnimationEvent, so React listens for the prefixed name there. */
function endAnimation(el: HTMLElement) {
  const name = 'AnimationEvent' in window ? 'animationend' : 'webkitAnimationEnd';
  fireEvent(el, new Event(name, { bubbles: true }));
}

describe('InfoTicker', () => {
  it('shows one tip and gives screen readers all of them', () => {
    render(<InfoTicker tips={TIPS} />);
    expect(screen.getByTestId('ticker-tip').textContent).toBe(TIPS[0]);
    const list = screen.getByRole('list', { name: cs.ticker.label });
    expect(
      within(list)
        .getAllByRole('listitem')
        .map((li) => li.textContent),
    ).toEqual(TIPS);
  });

  it('moves on when the progress bar ends and when asked, and wraps around', () => {
    render(<InfoTicker tips={TIPS} />);
    endAnimation(screen.getByTestId('ticker-progress'));
    expect(screen.getByTestId('ticker-tip').textContent).toBe(TIPS[1]);
    const next = screen.getByRole('button', { name: cs.ticker.next });
    fireEvent.click(next);
    fireEvent.click(next);
    expect(screen.getByTestId('ticker-tip').textContent).toBe(TIPS[0]);
  });

  it('pauses on click (WCAG 2.2.2) and resumes on a second click', () => {
    render(<InfoTicker tips={TIPS} />);
    fireEvent.click(screen.getByRole('button', { name: cs.ticker.pause }));
    const resume = screen.getByRole('button', { name: cs.ticker.resume });
    expect(resume.closest('[data-stopped]')).not.toBeNull();
    fireEvent.click(resume);
    expect(screen.getByRole('button', { name: cs.ticker.pause })).toBeTruthy();
  });

  it('a single tip stands still, without controls', () => {
    render(<InfoTicker tips={['Jen jeden.']} />);
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByTestId('ticker-progress')).toBeNull();
  });

  it('every project has tips', () => {
    for (const module of Object.values(cs.modules)) expect(module.tips.length).toBeGreaterThan(1);
  });
});
