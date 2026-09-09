const stateEl = document.getElementById('state');
const queuedEl = document.getElementById('queued');
const toggle = document.getElementById('toggle');

async function refresh() {
  const state = await chrome.storage.local.get({ trackingEnabled: true, eventQueue: [] });
  stateEl.textContent = state.trackingEnabled ? 'Active' : 'Paused';
  toggle.textContent = state.trackingEnabled ? 'Pause tracking' : 'Resume tracking';
  queuedEl.textContent = `${state.eventQueue.length} events`;
}

toggle.addEventListener('click', async () => {
  const state = await chrome.storage.local.get({ trackingEnabled: true });
  await chrome.storage.local.set({ trackingEnabled: !state.trackingEnabled });
  await refresh();
});
refresh();
