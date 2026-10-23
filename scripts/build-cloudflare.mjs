import './build-pages.mjs';
import { cp, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'publicacao-cloudflare');
await cp(path.join(root, 'publicacao-github-pages'), destination, { recursive: true });
await build({ entryPoints: [path.join(root, 'backend/worker.js')], outfile: path.join(destination, '_worker.js'), bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true });
await writeFile(path.join(destination, '_routes.json'), JSON.stringify({ version: 1, include: ['/api/*'], exclude: [] }));
await writeFile(path.join(destination, '_headers'), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(self), camera=(), microphone=()
  Cross-Origin-Opener-Policy: same-origin-allow-popups
  X-Frame-Options: DENY
`);
console.log(`Versão com backend preparada em: ${destination}`);
