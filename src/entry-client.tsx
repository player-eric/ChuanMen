import { StrictMode } from 'react';
import { hydrateRoot, createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import AppProviders from '@/AppProviders';
import { createAppRouter } from '@/router';
import './tailwind.css';

declare global {
  interface Window {
    __staticRouterHydrationData?: unknown;
  }
}

const container = document.getElementById('root')!;
const hasSSRContent =
  container.childNodes.length > 0 &&
  !(container.childNodes.length === 1 && container.childNodes[0].nodeType === 8); // single comment node = no SSR

const app = (
  <StrictMode>
    <AppProviders>
      <RouterProvider router={createAppRouter(hasSSRContent ? window.__staticRouterHydrationData : undefined)} />
    </AppProviders>
  </StrictMode>
);

if (hasSSRContent) {
  // SSR mode: hydrate server-rendered HTML
  hydrateRoot(container, app);
} else {
  // CSR fallback (e.g. Amplify static hosting)
  createRoot(container).render(app);
}
