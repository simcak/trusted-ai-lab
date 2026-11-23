import { useEffect } from 'react';
import { cs } from '../i18n/cs.ts';

export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    document.title = title ? `${title} · ${cs.app.name}` : cs.app.name;
  }, [title]);
}
