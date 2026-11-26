import type { ReactNode } from 'react';
import m from './machine.module.css';

export type Tone = 'sun' | 'berry' | 'leaf' | 'sky' | 'ember';

interface Props {
  step: number;
  tone: Tone;
  title: ReactNode;
  /** Right side of the header: a count, a toggle button… */
  extra?: ReactNode;
  footer?: ReactNode;
  /** `li` inside a pipeline `<ol>`, otherwise a section. */
  as?: 'li' | 'section' | 'div';
  className?: string;
  bodyClassName?: string;
  testId?: string;
  children: ReactNode;
}

/** One numbered step of a project machine: coloured header, body, optional footer. */
export function Panel({
  step,
  tone,
  title,
  extra,
  footer,
  as: Tag = 'li',
  className,
  bodyClassName,
  testId,
  children,
}: Props) {
  return (
    <Tag
      className={className ? `${m.panel} ${className}` : m.panel}
      data-tone={tone}
      data-testid={testId}
    >
      <header className={m.panelHeader}>
        <span className={m.stepNo}>{step}</span>
        <h2>{title}</h2>
        {extra}
      </header>
      <div className={bodyClassName ? `${m.panelBody} ${bodyClassName}` : m.panelBody}>
        {children}
      </div>
      {footer && <footer className={m.panelFooter}>{footer}</footer>}
    </Tag>
  );
}
