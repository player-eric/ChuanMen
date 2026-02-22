import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router';
import AppProviders from '@/AppProviders';
import { createAppRouter } from '@/router';
import './tailwind.css';

declare global {
  interface Window {
    __staticRouterHydrationData?: unknown;
  }
}

const router = createAppRouter(window.__staticRouterHydrationData);

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </StrictMode>,
);
