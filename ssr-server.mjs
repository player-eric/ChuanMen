import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createHttpServer, request as httpRequest } from 'node:http';
import { request as httpsRequest } from 'node:https';
import { fork } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isProd = process.env.NODE_ENV === 'production';
const defaultPort = isProd ? 4173 : 3000;
const port = Number(process.env.PORT ?? defaultPort);
const API_INTERNAL_PORT = 4000;
const apiTarget = process.env.API_TARGET ?? `http://localhost:${API_INTERNAL_PORT}`;

/**
 * In production, start the Fastify API server as a child process
 * so that the SSR server can reverse-proxy /api requests to it.
 */
function startApiServer() {
  const serverDir = path.resolve(__dirname, 'server');
  const entryPoint = path.resolve(serverDir, 'dist/index.js');

  if (!fs.existsSync(entryPoint)) {
    console.error(`❌ API server entry not found: ${entryPoint}`);
    console.error('   Run: cd server && npm run build');
    process.exit(1);
  }

  const child = fork(entryPoint, [], {
    cwd: serverDir,
    env: { ...process.env, PORT: String(API_INTERNAL_PORT) },
    stdio: 'inherit',
  });

  child.on('exit', (code, signal) => {
    console.error(`❌ API server exited (code=${code}, signal=${signal}). Shutting down.`);
    process.exit(1);
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('API server start timeout (30s)')), 30_000);
    const interval = setInterval(() => {
      const req = httpRequest(
        { hostname: '127.0.0.1', port: API_INTERNAL_PORT, path: '/api/health', method: 'GET', timeout: 1000 },
        (res) => {
          if (res.statusCode && res.statusCode < 500) {
            clearInterval(interval);
            clearTimeout(timeout);
            resolve(child);
          }
          res.resume();
        },
      );
      req.on('error', () => {}); // ignore until ready
      req.end();
    }, 500);
  });
}

/**
 * Reverse-proxy an incoming request to the API backend.
 */
function proxyToApi(req, res) {
  const target = new URL(apiTarget);
  const isHttps = target.protocol === 'https:';
  const doRequest = isHttps ? httpsRequest : httpRequest;

  const proxyReq = doRequest(
    {
      hostname: target.hostname,
      port: target.port || (isHttps ? 443 : 80),
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: target.host },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    },
  );

  proxyReq.on('error', (err) => {
    console.error('API proxy error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json' });
    }
    res.end(JSON.stringify({ error: 'Bad Gateway', message: err.message }));
  });

  req.pipe(proxyReq, { end: true });
}

const mimeTypes = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.map': 'application/json; charset=utf-8',
};

const setHeaders = (res, filePath) => {
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);
};

async function serveStaticFile(req, res, filePath) {
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return false;
  }

  setHeaders(res, filePath);
  const content = await fsp.readFile(filePath);
  res.statusCode = 200;
  res.end(content);
  return true;
}

async function createSsrServer() {
  let vite;
  let template;
  let render;

  if (!isProd) {
    // Only import vite in development
    const { createServer: createViteServer } = await import('vite');
    vite = await createViteServer({
      root: __dirname,
      appType: 'custom',
      server: {
        middlewareMode: true,
      },
    });
  } else {
    // Start the API backend as a child process (unless API_TARGET points elsewhere)
    if (!process.env.API_TARGET) {
      console.log('🚀 Starting API server as child process...');
      await startApiServer();
      console.log(`✅ API server ready on localhost:${API_INTERNAL_PORT}`);
    }

    template = await fsp.readFile(path.resolve(__dirname, 'dist/client/index.html'), 'utf-8');
    ({ render } = await import(path.resolve(__dirname, 'dist/server/entry-server.js')));
  }

  const server = createHttpServer(async (req, res) => {
    const reqUrl = req.url ?? '/';
    const url = reqUrl.split('?')[0] || '/';

    // Forward /api requests — dev: Vite proxy, prod: reverse proxy to backend
    if (url.startsWith('/api')) {
      if (!isProd && vite) {
        await new Promise((resolve) => {
          vite.middlewares(req, res, () => resolve(null));
        });
      } else {
        proxyToApi(req, res);
      }
      return;
    }

    if (req.method !== 'GET') {
      res.statusCode = 405;
      res.end('Method Not Allowed');
      return;
    }

    try {
      if (!isProd && vite) {
        const isAssetRequest =
          url.startsWith('/@') ||
          url.startsWith('/src/') ||
          url.includes('/node_modules/') ||
          /\.[a-zA-Z0-9]+$/.test(url);

        if (isAssetRequest) {
          await new Promise((resolve) => {
            vite.middlewares(req, res, () => resolve(null));
          });
          return;
        }

        const rawTemplate = await fsp.readFile(path.resolve(__dirname, 'index.html'), 'utf-8');
        const transformedTemplate = await vite.transformIndexHtml(url, rawTemplate);
        const mod = await vite.ssrLoadModule('/src/entry-server.tsx');
        const result = await mod.render(url);

        if (result.redirectTo) {
          res.statusCode = result.status || 302;
          res.setHeader('Location', result.redirectTo);
          res.end();
          return;
        }

        const html = transformedTemplate.replace('<!--ssr-outlet-->', result.html);
        res.statusCode = result.status || 200;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(html);
        return;
      }

      const distClientRoot = path.resolve(__dirname, 'dist/client');
      const staticPath = path.resolve(distClientRoot, `.${url}`);
      const isInsideDistClient = staticPath.startsWith(distClientRoot);

      if (isInsideDistClient && (await serveStaticFile(req, res, staticPath))) {
        return;
      }

      if (!render || !template) {
        res.statusCode = 500;
        res.end('SSR runtime not ready');
        return;
      }

      const result = await render(url);

      if (result.redirectTo) {
        res.statusCode = result.status || 302;
        res.setHeader('Location', result.redirectTo);
        res.end();
        return;
      }

      const html = template.replace('<!--ssr-outlet-->', result.html);
      res.statusCode = result.status || 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(html);
    } catch (error) {
      if (!isProd && vite) {
        vite.ssrFixStacktrace(error);
      }
      console.error(error);
      res.statusCode = 500;
      res.end('SSR Internal Server Error');
    }
  });

  server.listen(port, () => {
    console.log(`✅ SSR server running at http://localhost:${port}`);
    console.log(`模式: ${isProd ? 'production' : 'development'}`);
    console.log(`API target: ${apiTarget}`);
  });
}

createSsrServer();
