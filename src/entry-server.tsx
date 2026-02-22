import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import {
  createStaticHandler,
  createStaticRouter,
  StaticRouterProvider,
} from 'react-router';
import AppProviders from '@/AppProviders';
import { appRoutes } from '@/router';

export type SsrRenderResult = {
  html: string;
  status: number;
  redirectTo?: string;
};

export async function render(url: string): Promise<SsrRenderResult> {
  const { query, dataRoutes } = createStaticHandler(appRoutes);
  const request = new Request(`http://localhost${url}`, {
    method: 'GET',
    headers: {
      'x-ssr': '1',
    },
  });

  const context = await query(request);

  if (context instanceof Response) {
    return {
      html: '',
      status: context.status,
      redirectTo: context.headers.get('Location') ?? undefined,
    };
  }

  const router = createStaticRouter(dataRoutes, context);
  const html = renderToString(
    <StrictMode>
      <AppProviders>
        <StaticRouterProvider router={router} context={context} />
      </AppProviders>
    </StrictMode>,
  );

  return {
    html,
    status: context.statusCode ?? 200,
  };
}
