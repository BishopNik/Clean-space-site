(function () {
  const duration = 5000;
  let overlay;
  let closeButton;
  let titleNode;
  let messageNode;
  let animationFrame;
  let timeout;
  let onClose;
  let previousFocus;

  function ensureUi() {
    if (overlay) return;
    const style = document.createElement('style');
    style.textContent = `
      .submission-success-overlay[hidden]{display:none}
      .submission-success-overlay{position:fixed;z-index:10000;inset:0;display:grid;place-items:center;padding:20px;background:rgba(8,10,9,.68);backdrop-filter:blur(8px)}
      .submission-success-card{position:relative;width:min(460px,100%);padding:54px 34px 38px;border-radius:24px;background:#fff;color:#171816;box-shadow:0 28px 90px rgba(0,0,0,.28);text-align:center}
      .submission-success-card strong{display:block;margin:0 36px 12px;font:600 26px/1.2 Arial,sans-serif}
      .submission-success-card p{margin:0;color:#5f625d;font:15px/1.55 Arial,sans-serif}
      .submission-success-close{--progress:1;position:absolute;right:16px;top:16px;width:46px;height:46px;padding:3px;border:0;border-radius:50%;background:conic-gradient(#d43b32 calc(var(--progress)*360deg),rgba(212,59,50,.16) 0);cursor:pointer}
      .submission-success-close:before{content:"";position:absolute;inset:3px;border-radius:50%;background:#fff}
      .submission-success-close span{position:relative;z-index:1;display:grid;place-items:center;width:100%;height:100%;color:#252724;font:300 27px/1 Arial,sans-serif}
      .submission-success-close:focus-visible{outline:2px solid #d43b32;outline-offset:3px}
      @media(max-width:520px){.submission-success-card{padding:52px 24px 32px;border-radius:18px}.submission-success-card strong{font-size:22px}}
      @media(prefers-reduced-motion:reduce){.submission-success-overlay{backdrop-filter:none}}
    `;
    document.head.append(style);
    overlay = document.createElement('div');
    overlay.className = 'submission-success-overlay';
    overlay.hidden = true;
    overlay.innerHTML = `<section class="submission-success-card" role="dialog" aria-modal="true" aria-labelledby="submission-success-title"><button class="submission-success-close" type="button" aria-label="Close in 5 seconds"><span aria-hidden="true">×</span></button><strong id="submission-success-title"></strong><p></p></section>`;
    document.body.append(overlay);
    closeButton = overlay.querySelector('.submission-success-close');
    titleNode = overlay.querySelector('strong');
    messageNode = overlay.querySelector('p');
    closeButton.addEventListener('click', close);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !overlay.hidden) close();
    });
  }

  function show(options = {}) {
    ensureUi();
    clearTimers();
    previousFocus = document.activeElement;
    titleNode.textContent = options.title || 'Thank you';
    messageNode.textContent = options.message || '';
    onClose = typeof options.onClose === 'function' ? options.onClose : null;
    overlay.hidden = false;
    closeButton.style.setProperty('--progress', 1);
    closeButton.focus();
    const startedAt = performance.now();
    const update = now => {
      const remaining = Math.max(0, 1 - (now - startedAt) / duration);
      closeButton.style.setProperty('--progress', remaining);
      closeButton.setAttribute('aria-label', `Close in ${Math.ceil(remaining * 5)} seconds`);
      if (remaining > 0) animationFrame = requestAnimationFrame(update);
    };
    animationFrame = requestAnimationFrame(update);
    timeout = setTimeout(close, duration);
  }

  function close() {
    if (!overlay || overlay.hidden) return;
    clearTimers();
    overlay.hidden = true;
    const callback = onClose;
    onClose = null;
    if (callback) callback();
    if (previousFocus?.isConnected) previousFocus.focus();
  }

  function clearTimers() {
    cancelAnimationFrame(animationFrame);
    clearTimeout(timeout);
  }

  window.submissionSuccess = { show, close };
})();
