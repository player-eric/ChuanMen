import type { IncomingMessage, ServerResponse } from 'node:http';

let appPromise: Promise<any> | null = null;

function getApp() {
  if (!appPromise) {
    appPromise = (async () => {
      const { createApp } = await import('../server/src_v2/app.js');
      const app = await createApp();
      await app.ready();
      return app;
    })();
  }
  return appPromise;
}

function readBody(req: IncomingMessage): Promise<Buffer | undefined> {
  if (!req.method || req.method === 'GET' || req.method === 'HEAD') {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(chunks.length ? Buffer.concat(chunks) : undefined));
    req.on('error', reject);
  });
}

export const config = {
  api: { bodyParser: false },
};

export default async function handler(
  req: IncomingMessage & { url: string },
  res: ServerResponse & { status: (code: number) => any; json: (data: any) => void; send: (data: any) => void },
) {
  try {
    const app = await getApp();
    const body = await readBody(req);

    const response = await app.inject({
      method: req.method,
      url: req.url,
      headers: req.headers,
      payload: body,
    });

    res.statusCode = response.statusCode;
    for (const [key, value] of Object.entries(response.headers)) {
      if (value !== undefined && value !== null) {
        res.setHeader(key, value as string);
      }
    }
    res.end(response.rawPayload);
  } catch (err) {
    console.error('API error:', err);
    res.statusCode = 500;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
}
