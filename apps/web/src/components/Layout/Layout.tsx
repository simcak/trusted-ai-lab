import type { MouseEvent, ReactNode } from 'react';
import { Link, useLocation } from 'react-router';
import { DOCS_URL, LICENSE_URL, REPO_URL } from '../../config.ts';
import { cs } from '../../i18n/cs.ts';
import { Sprite } from '../../pixel/Sprite.tsx';
import { shield } from '../../pixel/sprites/icons.ts';
import { Disclaimer } from '../Disclaimer/Disclaimer.tsx';
import { ProjectNav } from '../ProjectNav/ProjectNav.tsx';
import { ThemeToggle } from '../ThemeToggle/ThemeToggle.tsx';
import styles from './Layout.module.css';

export function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main" onClick={focusMain}>
        {cs.app.skipToContent}
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand} aria-label={cs.app.home}>
            <Sprite sprite={shield} scale={2} />
            <span className={styles.brandName} aria-hidden="true">
              {cs.app.name}
            </span>
          </Link>
          <ProjectNav />
          <div className={styles.tools}>
            <ThemeToggle />
            <a href={REPO_URL} className={`${styles.navLink} ${styles.wideOnly}`}>
              {cs.footer.github}
            </a>
          </div>
        </div>
      </header>

      {/* Keyed by route so each page wipes in; search-param changes keep the page mounted. */}
      <main key={pathname} id="main" tabIndex={-1} className={`${styles.main} px-enter`}>
        {children}
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <Disclaimer />
          <ul className={styles.footerLinks}>
            <li>
              <a href={REPO_URL}>{cs.footer.github}</a>
            </li>
            <li>
              <a href={DOCS_URL}>{cs.footer.docs}</a>
            </li>
            <li>
              <a href={LICENSE_URL}>{cs.footer.license}</a>
            </li>
          </ul>
        </div>
      </footer>
    </div>
  );
}

// With HashRouter, "#main" would be treated as a route — move focus manually instead.
function focusMain(event: MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();
  document.getElementById('main')?.focus();
}
