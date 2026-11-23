import { Link } from 'react-router';
import { useDocumentTitle } from '../hooks/useDocumentTitle.ts';
import { cs } from '../i18n/cs.ts';

export function NotFound() {
  useDocumentTitle(cs.notFound.title);
  return (
    <div>
      <h1>{cs.notFound.title}</h1>
      <p>{cs.notFound.text}</p>
      <Link to="/">{cs.notFound.back}</Link>
    </div>
  );
}
