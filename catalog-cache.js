/* Revalidate catalog data when a returning visitor opens the shop. */
(function () {
  'use strict';
  const originalFetch = window.fetch.bind(window);
  window.fetch = function (input, options) {
    if (typeof input === 'string') {
      const url = new URL(input, document.baseURI);
      if (url.origin === location.origin && url.pathname.endsWith('/products.json')) {
        url.searchParams.set('v', 'category-audit-20260930');
        return originalFetch(url.href, Object.assign({}, options, { cache: 'no-cache' }));
      }
    }
    return originalFetch(input, options);
  };
})();
