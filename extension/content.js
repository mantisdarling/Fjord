const blockedSchemes = ['chrome:', 'chrome-extension:', 'file:', 'about:'];
const sensitiveInputTypes = new Set(['password', 'email', 'tel', 'number', 'search']);

function isEligible() {
  return !blockedSchemes.some((scheme) => location.protocol === scheme) && !location.hostname.endsWith('.local');
}

if (isEligible()) {
  chrome.runtime.sendMessage({
    type: 'page_context',
    payload: {
      title: document.title.slice(0, 240)
    }
  });

  document.addEventListener('focusin', (event) => {
    if (event.target instanceof HTMLInputElement && sensitiveInputTypes.has(event.target.type)) return;
    chrome.runtime.sendMessage({ type: 'form_interaction', payload: {} });
  }, { passive: true });
}
