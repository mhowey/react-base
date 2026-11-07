// Applies the saved Mantine colour scheme before first paint (avoids a flash). External file so CSP can forbid inline scripts.
(function () {
  try {
    var v = localStorage.getItem('mantine-color-scheme-value') || 'auto';
    var s = v === 'auto' ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : v;
    document.documentElement.setAttribute('data-mantine-color-scheme', s);
  } catch (e) {}
})();
