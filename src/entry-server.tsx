import { StrictMode } from 'react';
import { PassThrough } from 'node:stream';
import { renderToPipeableStream } from 'react-dom/server';
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
  const element = (
    <StrictMode>
      <AppProviders>
        <StaticRouterProvider router={router} context={context} />
      </AppProviders>
    </StrictMode>
  );

  const html = await new Promise<string>((resolve, reject) => {
    let content = '';
    const stream = new PassThrough();
    const timeout = setTimeout(() => abort(), 10000);

    stream.on('data', (chunk: Buffer | string) => {
      content += chunk.toString();
    });

    stream.on('end', () => {
      clearTimeout(timeout);
      resolve(content);
    });
    stream.on('error', (error: Error) => {
      clearTimeout(timeout);
      reject(error);
    });

    const { pipe, abort } = renderToPipeableStream(element, {
      onAllReady() {
        pipe(stream);
      },
      onShellError(error) {
        reject(error);
      },
      onError(error) {
        console.error('SSR stream error:', error);
      },
    });

  });

  return {
    html,
    status: context.statusCode ?? 200,
  };
}
