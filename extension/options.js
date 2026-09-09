const domains = document.getElementById('domains');
const api = document.getElementById('api');
const token = document.getElementById('token');
const save = document.getElementById('save');
const saved = document.getElementById('saved');

Promise.all([chrome.storage.local.get({ excludedDomains: [], apiBaseUrl: '' }), chrome.storage.session.get({ accessToken: '' })]).then(([local, session]) => { domains.value = local.excludedDomains.join('\n'); api.value = local.apiBaseUrl; token.value = session.accessToken; });
save.addEventListener('click', async () => {
  const excludedDomains = [...new Set(domains.value.split(/\s+/).map((value) => value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '')).filter(Boolean))].slice(0, 200);
  const apiBaseUrl = api.value.trim().replace(/\/$/, '');
  const accessToken = token.value.trim();
  if (apiBaseUrl && !/^https:\/\//.test(apiBaseUrl) && !/^http:\/\/localhost/.test(apiBaseUrl)) { saved.textContent = 'Use HTTPS'; return; }
  await Promise.all([chrome.storage.local.set({ excludedDomains, apiBaseUrl }), chrome.storage.session.set({ accessToken })]);
  saved.textContent = 'Saved';
  window.setTimeout(() => { saved.textContent = ''; }, 1800);
});
