/* Dark & Light mode */

(function () {
  // ─── Apply saved theme instantly (before paint) ───────
  const saved = localStorage.getItem('fa-theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);

  // ─── Inject toggle button into navbar ────────────────
  function injectToggle() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks || document.getElementById('themeToggle')) return;

    const btn = document.createElement('button');
    btn.id        = 'themeToggle';
    btn.className = 'theme-toggle nav-link';
    btn.setAttribute('aria-label', 'Toggle dark mode');
    btn.onclick   = toggleTheme;
    updateBtnIcon(btn, saved);
    navLinks.prepend(btn);
  }

  function updateBtnIcon(btn, theme) {
    btn.innerHTML = theme === 'dark'
      ? '<span title="Light mode">☀</span>'
      : '<span title="Dark mode">🌙</span>';
  }

  function toggleTheme() {
    const curr = document.documentElement.getAttribute('data-theme') || 'light';
    const next = curr === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('fa-theme', next);
    updateBtnIcon(document.getElementById('themeToggle'), next);
  }

  // Run after DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggle);
  } else {
    injectToggle();
  }
})();
