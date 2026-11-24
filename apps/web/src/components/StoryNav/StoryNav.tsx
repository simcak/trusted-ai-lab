import { Link } from 'react-router';
import { cs } from '../../i18n/cs.ts';
import { getNeighbours, type ModuleId } from '../../modules/registry.ts';
import styles from './StoryNav.module.css';

/** Previous / next module links in story order. */
export function StoryNav({ id }: { id: ModuleId }) {
  const { prev, next } = getNeighbours(id);
  return (
    <nav aria-label={cs.placeholder.storyNav} className={styles.storyNav}>
      {prev ? (
        <Link to={prev.path} rel="prev">
          ← {cs.placeholder.prev}: {cs.modules[prev.id].title}
        </Link>
      ) : (
        <Link to="/">← {cs.placeholder.backHome}</Link>
      )}
      {next ? (
        <Link to={next.path} rel="next">
          {cs.placeholder.next}: {cs.modules[next.id].title} →
        </Link>
      ) : (
        <Link to="/">{cs.placeholder.backHome} →</Link>
      )}
    </nav>
  );
}
