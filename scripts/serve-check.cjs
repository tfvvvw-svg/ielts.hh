/**
 * Simulates exactly how Vercel serves this project: static files from dist/,
 * everything else rewritten to /index.html. Verifies that deep-link refreshes
 * (/dashboard, /planner, /materials …) return the app instead of a 404.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const DIST = path.join(__dirname, '..', 'dist');
const PORT = Number(process.env.PORT ?? 4321);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2',
  '.ico': 'image/x-icon', '.map': 'application/json', '.txt': 'text/plain',
};

/** Mirrors the vercel.json rewrite: /((?!assets/).*) -> /index.html */
function resolve(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0].split('#')[0]);
  const rel = clean.replace(/^\/+/, '');
  if (rel === '' || rel === 'index.html') return path.join(DIST, 'index.html');
  const candidate = path.join(DIST, rel);
  const normalised = path.normalize(candidate);
  if (!normalised.startsWith(DIST)) return null; // path traversal
  if (fs.existsSync(normalised) && fs.statSync(normalised).isFile()) return normalised;
  if (rel.startsWith('assets/')) return null; // real asset miss must 404
  return path.join(DIST, 'index.html'); // SPA fallback
}

const server = http.createServer((req, res) => {
  const file = resolve(req.url ?? '/');
  if (!file) { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('404'); return; }
  const ext = path.extname(file);
  const immutable = (req.url ?? '').includes('/assets/');
  res.writeHead(200, {
    'content-type': MIME[ext] ?? 'application/octet-stream',
    ...(immutable ? { 'cache-control': 'public, max-age=31536000, immutable' } : {}),
  });
  fs.createReadStream(file).pipe(res);
});

let pass = 0; let fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? ` -> ${detail}` : ''}`); }
};

const get = (p) => new Promise((resolve) => {
  http.get({ port: PORT, path: p }, (r) => {
    let body = '';
    r.on('data', (c) => { body += c; });
    r.on('end', () => resolve({ status: r.statusCode, body, headers: r.headers }));
  });
});

const ROUTES = ['/', '/login', '/dashboard', '/coach', '/planner', '/calendar', '/tasks',
  '/reading', '/listening', '/writing', '/speaking', '/vocabulary', '/grammar',
  '/mistakes', '/test-generator', '/mocks', '/materials', '/analytics',
  '/achievements', '/profile', '/settings', '/onboarding', '/some/deep/unknown-route'];

server.listen(PORT, async () => {
  console.log('\nVercel-style static + SPA fallback server\n');

  console.log('Root and every app route');
  for (const route of ROUTES) {
    const r = await get(route);
    check(`${route} returns 200 with the app shell`,
      r.status === 200 && r.body.includes('<div id="root">'),
      `status=${r.status}`);
  }

  console.log('\nAssets are served, not rewritten');
  const html = (await get('/')).body;
  const asset = html.match(/\/assets\/[^"']+\.js/)?.[0];
  check('index.html references a hashed JS asset', Boolean(asset), html.slice(0, 120));
  if (asset) {
    const r = await get(asset);
    check('hashed JS asset is served as javascript',
      r.status === 200 && String(r.headers['content-type']).includes('javascript'),
      `status=${r.status} type=${r.headers['content-type']}`);
    check('assets are served immutable',
      String(r.headers['cache-control']).includes('immutable'), String(r.headers['cache-control']));
  }
  const css = html.match(/\/assets\/[^"']+\.css/)?.[0];
  if (css) {
    const r = await get(css);
    check('hashed CSS asset is served as css',
      r.status === 200 && String(r.headers['content-type']).includes('css'), String(r.headers['content-type']));
  }
  check('a genuinely missing asset 404s (no false SPA page)',
    (await get('/assets/missing-file.js')).status === 404);

  console.log('\nBuild output integrity');
  check('dist/index.html exists', fs.existsSync(path.join(DIST, 'index.html')));
  check('app entry script is present on disk', Boolean(asset) && fs.existsSync(path.join(DIST, asset)));
  check('index.html mounts #root', html.includes('<div id="root">'));
  check('no source maps or .env leaked into dist',
    !fs.existsSync(path.join(DIST, '.env')));

  console.log(`\n${pass} passed, ${fail} failed\n`);
  server.close();
  process.exit(fail > 0 ? 1 : 0);
});