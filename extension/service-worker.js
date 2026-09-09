const DEFAULTS = { trackingEnabled: true, excludedDomains: [], eventQueue: [], lastSyncAt: null };
const SENSITIVE_DOMAIN_PARTS = ['bank', 'wallet', 'payment', 'paypal', 'stripe', 'creditcard'];

async function readState() { return chrome.storage.local.get(DEFAULTS); }
function isSensitive(domain) { return SENSITIVE_DOMAIN_PARTS.some((part) => domain.toLowerCase().includes(part)); }
function shouldSkip(url, excludedDomains) {
  try {
    const parsed = new URL(url);
    return ['chrome:', 'chrome-extension:', 'file:', 'about:'].includes(parsed.protocol) || isSensitive(parsed.hostname) || excludedDomains.some((domain) => parsed.hostname === domain || parsed.hostname.endsWith(`.${domain}`));
  } catch { return true; }
}

async function enqueue(event) {
  const state = await readState();
  if (!state.trackingEnabled || shouldSkip(event.url || `https://${event.domain}`, state.excludedDomains)) return;
  const next = [...state.eventQueue, { ...event, eventId: crypto.randomUUID(), ts: new Date().toISOString() }].slice(-5000);
  await chrome.storage.local.set({ eventQueue: next });
}

chrome.runtime.onInstalled.addListener(() => chrome.storage.local.set(DEFAULTS));
chrome.tabs.onActivated.addListener(async ({ tabId }) => {
  const tab = await chrome.tabs.get(tabId);
  if (tab.url) await enqueue({ type: 'tab_switch', url: tab.url, title: tab.title || '' });
});
chrome.webNavigation.onCommitted.addListener(async ({ tabId, frameId, url }) => {
  if (frameId !== 0) return;
  const tab = await chrome.tabs.get(tabId).catch(() => null);
  await enqueue({ type: 'page_visit', url, title: tab?.title || '' });
});
chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message?.payload || !sender.tab?.url) return;
  enqueue({ type: message.type, url: sender.tab.url, ...message.payload });
});

// Sync is intentionally a safe seam: production wiring must add authenticated HTTPS
// ingestion and never send raw events without the user's configured consent.
chrome.alarms?.create('sync', { periodInMinutes: 1 });
chrome.alarms?.onAlarm.addListener(async ({ name }) => {
  if (name !== 'sync') return;
  const state = await readState();
  if (state.eventQueue.length === 0) return;
  // Keep events durable until an authenticated API acknowledges the batch.
  await chrome.storage.local.set({ lastSyncAt: new Date().toISOString() });
});
