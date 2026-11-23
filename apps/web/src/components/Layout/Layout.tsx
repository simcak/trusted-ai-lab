import type { MouseEvent, ReactNode } from 'react';
import { Link, NavLink } from 'react-router';
import { DOCS_URL, LICENSE_URL, REPO_URL } from '../../config.ts';
import { cs } from '../../i18n/cs.ts';
import { MODULES } from '../../modules/registry.ts';
import { Disclaimer } from '../Disclaimer/Disclaimer.tsx';
import styles from './Layout.module.css';

export function Layout({ children }: { children: ReactNode }) {
  return (
    <div className={styles.shell}>
      <a className={styles.skipLink} href="#main" onClick={focusMain}>
        {cs.app.skipToContent}
      </a>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link to="/" className={styles.brand}>
            <span className={styles.brandName}>{cs.app.name}</span>
            <span className={styles.brandTagline}>{cs.app.tagline}</span>
          </Link>
          <nav aria-label={cs.app.mainNav}>
            <ol className={styles.nav}>
              {MODULES.map((m) => (
                <li key={m.id}>
                  <NavLink
                    to={m.path}
                    className={({ isActive }) =>
                      isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink
                    }
                  >
                    <span className={styles.navNumber} aria-hidden="true">
                      {m.number}
                    </span>
                    {cs.modules[m.id].title}
                  </NavLink>
                </li>
              ))}
            </ol>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1} className={styles.main}>
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
