import { useId, useRef, type ReactNode } from 'react';
import { cs } from '../../i18n/cs.ts';
import styles from './InfoDrawer.module.css';

interface Props {
  /** Text of the button that opens the drawer. */
  label: string;
  title: string;
  children: ReactNode;
}

/**
 * Supplementary information in a side sheet: a native modal `<dialog>` (focus trap, Esc,
 * focus returns to the button). Clicking the backdrop closes it too.
 */
export function InfoDrawer({ label, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  return (
    <>
      <button
        type="button"
        className="button button--secondary"
        aria-haspopup="dialog"
        onClick={() => ref.current?.showModal()}
      >
        {label}
      </button>
      <dialog
        ref={ref}
        className={styles.drawer}
        aria-labelledby={headingId}
        onClick={(event) => {
          if (event.target === ref.current) ref.current.close();
        }}
      >
        <div className={styles.inner}>
          <header className={styles.header}>
            <h2 id={headingId}>{title}</h2>
            <button
              type="button"
              className="button button--secondary"
              onClick={() => ref.current?.close()}
            >
              {cs.shell.drawerClose}
            </button>
          </header>
          <div className={styles.body}>{children}</div>
        </div>
      </dialog>
    </>
  );
}
