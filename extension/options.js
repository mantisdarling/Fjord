const domains = document.getElementById('domains');
const api = document.getElementById('api');
const token = document.getElementById('token');
const save = document.getElementById('save');
const saved = document.getElementById('saved');

chrome.storage.local.get({ excludedDomains: [], apiBaseUrl: '', accessToken: '' }).then((state) => { domains.value = state.excludedDomains.join('\n'); api.value = state.apiBaseUrl; token.value = state.accessToken; });
save.addEventListener('click', async () => {
  const excludedDomains = [...new Set(domains.value.split(/\s+/).map((value) => value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')).filter(Boolean))].slice(0, 200);
  const apiBaseUrl = api.value.trim().replace(/\/$/, '');
  const accessToken = token.value.trim();
  if (apiBaseUrl && !/^https:\/\//.test(apiBaseUrl) && !/^http:\/\/localhost/.test(apiBaseUrl)) { saved.textContent = 'Use HTTPS'; return; }
  await chrome.storage.local.set({ excludedDomains, apiBaseUrl, accessToken });
  saved.textContent = 'Saved';
  window.setTimeout(() => { saved.textContent = ''; }, 1800);
});
