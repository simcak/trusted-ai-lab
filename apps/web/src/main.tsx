import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
// Pixel font for headings and UI labels, self-hosted (OFL-1.1). Latin + Latin Extended
// cover Czech; checked glyph by glyph against the fallback font (2026-11-25).
import '@fontsource/pixelify-sans/latin-400.css';
import '@fontsource/pixelify-sans/latin-ext-400.css';
import '@fontsource/pixelify-sans/latin-600.css';
import '@fontsource/pixelify-sans/latin-ext-600.css';
import './styles/tokens.css';
import './styles/global.css';
import './styles/pixel.css';

const root = document.getElementById('root');
if (!root) throw new Error('Missing #root element');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
