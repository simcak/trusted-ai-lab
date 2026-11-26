import type { ReactNode } from 'react';
import styles from './InfoDrawer.module.css';

/** One collapsible topic in the "under the hood" drawer, so the drawer reads as a list. */
export function DrawerSection({
  title,
  open = false,
  children,
}: {
  title: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details className={styles.section} open={open}>
      <summary>
        <h3>{title}</h3>
      </summary>
      <div className={styles.sectionBody}>{children}</div>
    </details>
  );
}
