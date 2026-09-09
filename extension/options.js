const domains = document.getElementById('domains');
const save = document.getElementById('save');
const saved = document.getElementById('saved');

chrome.storage.local.get({ excludedDomains: [] }).then(({ excludedDomains }) => { domains.value = excludedDomains.join('\n'); });
save.addEventListener('click', async () => {
  const excludedDomains = [...new Set(domains.value.split(/\s+/).map((value) => value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')).filter(Boolean))].slice(0, 200);
  await chrome.storage.local.set({ excludedDomains });
  saved.textContent = 'Saved';
  window.setTimeout(() => { saved.textContent = ''; }, 1800);
});
