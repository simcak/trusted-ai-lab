import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import { TermList } from './TermList.tsx';

describe('TermList', () => {
  it('opens all terms with their explanations from one button', () => {
    render(<TermList terms={['rag', 'token']} />);
    const button = screen.getByRole('button', { name: cs.glossary.label });
    const targetId = button.getAttribute('popovertarget');
    expect(targetId).toBeTruthy();
    const popover = document.getElementById(targetId!);
    expect(popover?.getAttribute('popover')).toBe('auto');
    expect(popover?.textContent).toContain(cs.glossary.terms.rag.text);
    expect(popover?.textContent).toContain(cs.glossary.terms.token.term);
  });

  it('lists terms for every module', () => {
    for (const terms of Object.values(cs.glossary.byModule))
      expect(terms.length).toBeGreaterThan(0);
  });
});
