(function () {
  const DEFAULT_URL = 'https://muse.ai';

  function getSafeTargetUrl(raw) {
    if (!raw) {
      return DEFAULT_URL;
    }
    try {
      const parsed = new URL(raw);
      const isLocalHttp =
        parsed.protocol === 'http:' &&
        (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
      if (parsed.protocol === 'https:' || isLocalHttp) {
        return parsed.toString();
      }
    } catch {
      // Ignore malformed URLs
    }
    return DEFAULT_URL;
  }

  const params = new URLSearchParams(window.location.search);
  const targetUrl = getSafeTargetUrl(params.get('url'));
  const errorMsg = params.get('error') || 'Network unavailable';

  const detailsEl = document.getElementById('errorDetails');
  if (detailsEl) {
    detailsEl.textContent = targetUrl + '\n' + errorMsg;
  }

  const retryBtn = document.getElementById('retryBtn');
  const browserBtn = document.getElementById('browserBtn');

  function retry() {
    if (window.museDesktop && typeof window.museDesktop.retryConnection === 'function') {
      window.museDesktop.retryConnection();
    } else {
      window.location.href = targetUrl;
    }
  }

  if (retryBtn) {
    retryBtn.addEventListener('click', retry);
  }

  if (browserBtn) {
    browserBtn.addEventListener('click', function () {
      if (window.museDesktop && typeof window.museDesktop.openInBrowser === 'function') {
        window.museDesktop.openInBrowser(targetUrl);
      }
    });
  }

  window.addEventListener('online', retry);
  window.addEventListener('keydown', function (event) {
    if (event.key === 'Enter' || event.key === 'r' || event.key === 'R') {
      retry();
    }
  });
})();
