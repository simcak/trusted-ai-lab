import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { cs } from '../../i18n/cs.ts';
import { getTheme } from '../../theme/theme.ts';
import { ThemeToggle } from './ThemeToggle.tsx';

afterEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe('ThemeToggle', () => {
  it('without a stored choice follows the system (light in jsdom)', () => {
    expect(getTheme()).toBe('light');
    render(<ThemeToggle />);
    expect(screen.getByRole('switch', { name: cs.theme.dark }).getAttribute('aria-checked')).toBe(
      'false',
    );
  });

  it('switches the theme on <html> and remembers the choice', () => {
    render(<ThemeToggle />);
    const toggle = screen.getByRole('switch', { name: cs.theme.dark });

    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(window.localStorage.getItem('theme')).toBe('dark');
    expect(toggle.getAttribute('aria-checked')).toBe('true');

    fireEvent.click(toggle);
    expect(document.documentElement.dataset.theme).toBe('light');
    expect(window.localStorage.getItem('theme')).toBe('light');
  });

  it('starts from the theme already set before the first paint', () => {
    document.documentElement.dataset.theme = 'dark';
    render(<ThemeToggle />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });
});
