import { Suspense, lazy } from 'react';
import { HashRouter, Route, Routes, useLocation } from 'react-router';
import { ErrorBoundary } from './components/ErrorBoundary/ErrorBoundary.tsx';
import { Layout } from './components/Layout/Layout.tsx';
import { cs } from './i18n/cs.ts';
import { Landing } from './pages/Landing.tsx';
import { NotFound } from './pages/NotFound.tsx';

// Each module is its own lazy chunk (performance budget, CLAUDE.md §3).
const IntakePage = lazy(() => import('./modules/intake/IntakePage.tsx'));
const PiiPage = lazy(() => import('./modules/pii/PiiPage.tsx'));
const AgentPage = lazy(() => import('./modules/agent/AgentPage.tsx'));
const LocalPage = lazy(() => import('./modules/local/LocalPage.tsx'));

export function App() {
  return (
    <HashRouter>
      <Layout>
        <AppRoutes />
      </Layout>
    </HashRouter>
  );
}

function AppRoutes() {
  const location = useLocation();
  return (
    // Keyed by path so an error on one page does not stick after navigating away.
    <ErrorBoundary key={location.pathname}>
      <Suspense fallback={<p aria-busy="true">{cs.app.loading}</p>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/intake" element={<IntakePage />} />
          <Route path="/pii" element={<PiiPage />} />
          <Route path="/agent" element={<AgentPage />} />
          <Route path="/local" element={<LocalPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
