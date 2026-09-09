(() => {
  const glow = document.querySelector('.cursor-glow');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (glow && !reduceMotion) {
    window.addEventListener('pointermove', (event) => {
      glow.style.left = `${event.clientX}px`;
      glow.style.top = `${event.clientY}px`;
    }, { passive: true });
  }

  const items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduceMotion) {
    const observer = new IntersectionObserver((entries, current) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          current.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    items.forEach((item) => observer.observe(item));
  } else {
    items.forEach((item) => item.classList.add('is-visible'));
  }

  const configuredApi = window.localStorage.getItem('fjordApiUrl');
  const configuredToken = window.localStorage.getItem('fjordAccessToken');
  const focusNumber = document.querySelector('.focus-number');
  if (configuredApi && configuredToken && focusNumber) {
    fetch(`${configuredApi.replace(/\/$/, '')}/api/v1/summary`, { headers: { Authorization: `Bearer ${configuredToken}` } })
      .then((response) => response.ok ? response.json() : null)
      .then((summary) => {
        if (!summary) return;
        const hours = Math.floor(summary.activeSeconds / 3600);
        const minutes = Math.floor((summary.activeSeconds % 3600) / 60);
        focusNumber.innerHTML = `${String(hours).padStart(2, '0')}<span>h</span>${String(minutes).padStart(2, '0')}<span>m</span>`;
      })
      .catch(() => {});
  }
})();
