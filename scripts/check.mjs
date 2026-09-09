import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const files = [];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist'].includes(entry.name)) continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await walk(path); else files.push(path);
  }
}
await walk(root);
const sourceFiles = files.filter((file) => !file.endsWith('check.mjs'));
const secrets = /(-----BEGIN (?:RSA|OPENSSH|EC|DSA) PRIVATE KEY-----|AKIA[0-9A-Z]{16}|(?:api[_-]?key|secret|token)\s*[:=]\s*['"][A-Za-z0-9_\-]{20,}['"])/i;
for (const file of sourceFiles) {
  const text = await readFile(file, 'utf8');
  if (secrets.test(text) && !file.endsWith('SECURITY.md')) throw new Error(`possible secret marker in ${file}`);
}
const manifest = JSON.parse(await readFile(join(root, 'extension/manifest.json'), 'utf8'));
if (manifest.manifest_version !== 3) throw new Error('extension must use Manifest V3');
if (!manifest.permissions.includes('storage')) throw new Error('extension must have durable storage permission');
if (!manifest.permissions.includes('alarms')) throw new Error('extension must have alarms permission');
if (!manifest.content_security_policy?.extension_pages?.includes("script-src 'self'")) throw new Error('extension CSP must be self-only');
const serviceWorker = await readFile(join(root, 'extension/service-worker.js'), 'utf8');
for (const forbidden of ['keydown', 'screenshot', 'screenCapture']) if (serviceWorker.includes(forbidden)) throw new Error(`forbidden capture primitive: ${forbidden}`);
console.log(`Checked ${sourceFiles.length} source files: no known secret markers, Manifest V3 policy, and privacy guards passed.`);
