const DEFAULTS = { trackingEnabled: true, excludedDomains: [], eventQueue: [], lastSyncAt: null, apiBaseUrl: '', accessToken: '' };
const SENSITIVE_DOMAIN_PARTS = ['bank', 'wallet', 'payment', 'paypal', 'stripe', 'creditcard'];

async function readState() { return chrome.storage.local.get(DEFAULTS); }
function isSensitive(domain) { return SENSITIVE_DOMAIN_PARTS.some((part) => domain.toLowerCase().includes(part)); }
function shouldSkip(url, excludedDomains) {
  try {
    const parsed = new URL(url);
    return ['chrome:', 'chrome-extension:', 'file:', 'about:'].includes(parsed.protocol) || isSensitive(parsed.hostname) || excludedDomains.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
  } catch { return true; }
}
async function hashUrl(url) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url.split('#')[0]));
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
async function enqueue(event) {
  const state = await readState();
  if (!state.trackingEnabled || shouldSkip(event.url || `https://${event.domain}`, state.excludedDomains)) return;
  const parsed = event.url ? new URL(event.url) : null;
  const normalized = { eventId: crypto.randomUUID(), ts: new Date().toISOString(), eventType: event.eventType || event.type, domain: event.domain || parsed?.hostname || 'unknown', title: event.title || '', category: 'uncategorized', device: 'chrome-desktop', ...(event.url ? { urlHash: await hashUrl(event.url) } : {}) };
  const next = [...state.eventQueue, normalized].slice(-5000);
  await chrome.storage.local.set({ eventQueue: next });
}

chrome.runtime.onInstalled.addListener(() => chrome.storage.local.set(DEFAULTS));
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) await enqueue({ eventType: 'tab_switch', url: tab.url, title: tab.title || '' });
});
chrome.webNavigation.onCommitted.addListener(async ({ tabId, frameId, url }) => {
  if (frameId !== 0) return;
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  await enqueue({ eventType: 'page_visit', url, title: tab?.title || '' });
});
chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message?.payload || !sender.tab?.url) return;
  enqueue({ eventType: message.type, url: sender.tab.url, ...message.payload });
});

async function syncQueue() {
  const state = await readState();
  if (!state.apiBaseUrl || !state.accessToken || state.eventQueue.length === 0) return;
  const events = state.eventQueue.slice(0, 100);
  const response = await fetch(`${state.apiBaseUrl.replace(/\/$/, '')}/api/v1/events/batch`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${state.accessToken}` }, body: JSON.stringify({ idempotencyKey: crypto.randomUUID(), events }) });
  if (!response.ok) return;
  const latest = await readState();
  const sent = new Set(events.map((event) => event.eventId));
  await chrome.storage.local.set({ eventQueue: latest.eventQueue.filter((event) => !sent.has(event.eventId)), lastSyncAt: new Date().toISOString() });
}

chrome.alarms?.create('sync', { periodInMinutes: 1 });
chrome.alarms?.onAlarm.addListener(async ({ name }) => {
  if (name !== 'sync') return;
  try { await syncQueue(); } catch { /* retain queue for the next retry */ }
});
