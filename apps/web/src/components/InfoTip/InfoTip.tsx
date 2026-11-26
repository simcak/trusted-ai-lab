import { useId, type ReactNode } from 'react';
import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { bulb } from '../../pixel/sprites/icons.ts';
import styles from './InfoTip.module.css';

interface Props {
  /** Accessible name of the button (and the panel's heading when `title` is missing). */
  label: string;
  /** Visible button text; without it the button shows `icon`. */
  text?: ReactNode;
  /** Icon of a text-less button: "?" for explanations, a bulb for good-to-know hints. */
  icon?: 'question' | 'bulb';
  title?: string;
  children: ReactNode;
  className?: string;
  /** Panel role: `note` for explanations, `dialog` for panels with controls. */
  role?: 'note' | 'dialog';
}

/**
 * Extra information on demand: a button that opens a native popover (light dismiss, Esc,
 * no library). Anchored next to its button where the browser supports anchor positioning,
 * centred otherwise.
 */
export function InfoTip({
  label,
  text,
  icon = 'question',
  title,
  children,
  className,
  role = 'note',
}: Props) {
  const raw = useId();
  const id = `tip-${raw.replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const anchor = `--${id}`;
  return (
    <>
      <button
        type="button"
        className={`${text ? 'button button--secondary' : styles.iconButton} ${className ?? ''}`}
        data-icon={text ? undefined : icon}
        popoverTarget={id}
        aria-label={text ? undefined : label}
        style={{ anchorName: anchor }}
      >
        {text ?? (icon === 'bulb' ? <Sprite sprite={bulb} scale={2} /> : '?')}
      </button>
      <div
        id={id}
        popover="auto"
        role={role}
        aria-label={title ?? label}
        className={styles.panel}
        style={{ positionAnchor: anchor }}
      >
        {title && <p className={styles.title}>{title}</p>}
        {children}
        <button
          type="button"
          className={styles.close}
          popoverTarget={id}
          popoverTargetAction="hide"
        >
          {cs.glossary.close}
        </button>
      </div>
    </>
  );
}
