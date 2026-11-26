import { useSyncExternalStore } from 'react';

/**
 * Light / dark theme. The visitor's choice is kept in localStorage (a display preference, not
 * a secret); without one the system setting applies and is followed live. index.html applies
 * the same logic before the first paint, so the page never flashes the wrong theme.
 */
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';
/** Browser chrome colour per theme: the header surface (--color-surface). */
const THEME_COLOR: Record<Theme, string> = { light: '#ffffff', dark: '#151a35' };

const listeners = new Set<() => void>();

function stored(): Theme | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

function systemTheme(): Theme {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_QUERY).matches
    ? 'dark'
    : 'light';
}

function apply(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLOR[theme]);
}

export function getTheme(): Theme {
  const current = document.documentElement.dataset.theme;
  return current === 'dark' || current === 'light' ? current : (stored() ?? systemTheme());
}

export function setTheme(theme: Theme) {
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage blocked (private mode, policy): the choice holds until the page is closed.
  }
  apply(theme);
  for (const notify of listeners) notify();
}

function onSystemChange() {
  if (stored()) return;
  apply(systemTheme());
  for (const notify of listeners) notify();
}

export function subscribe(onChange: () => void): () => void {
  if (listeners.size === 0 && typeof window.matchMedia === 'function') {
    window.matchMedia(DARK_QUERY).addEventListener('change', onSystemChange);
  }
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
    if (listeners.size === 0 && typeof window.matchMedia === 'function') {
      window.matchMedia(DARK_QUERY).removeEventListener('change', onSystemChange);
    }
  };
}

export function useTheme(): [Theme, (theme: Theme) => void] {
  const theme = useSyncExternalStore(subscribe, getTheme, () => 'light' as const);
  return [theme, setTheme];
}
