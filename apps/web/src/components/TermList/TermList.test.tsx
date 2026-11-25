import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import { TermList } from './TermList.tsx';

describe('TermList', () => {
  it('offers each term as a button that opens its explanation', () => {
    render(<TermList terms={['rag', 'token']} />);
    const button = screen.getByRole('button', { name: cs.glossary.terms.rag.term });
    const targetId = button.getAttribute('popovertarget');
    expect(targetId).toBeTruthy();
    const popover = document.getElementById(targetId!);
    expect(popover?.getAttribute('popover')).toBe('auto');
    expect(popover?.textContent).toContain(cs.glossary.terms.rag.text);
    expect(screen.getByRole('button', { name: cs.glossary.terms.token.term })).toBeTruthy();
  });

  it('lists terms for every module', () => {
    for (const terms of Object.values(cs.glossary.byModule))
      expect(terms.length).toBeGreaterThan(0);
  });
});
