import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const worker = await readFile(new URL('../extension/service-worker.js', import.meta.url), 'utf8');
const manifest = JSON.parse(await readFile(new URL('../extension/manifest.json', import.meta.url), 'utf8'));

test('uses Manifest V3 and durable storage', () => {
  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.permissions.includes('storage'));
  assert.ok(manifest.permissions.includes('alarms'));
});

test('service worker contains explicit sensitive-domain and scheme guards', () => {
  assert.match(worker, /SENSITIVE_DOMAIN_PARTS/);
  assert.match(worker, /chrome:/);
  assert.match(worker, /excludedDomains/);
});

test('does not contain invasive capture APIs', () => {
  assert.doesNotMatch(worker, /keydown|captureVisibleTab|desktopCapture|screenCapture/);
});
