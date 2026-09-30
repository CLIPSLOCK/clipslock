// Restore document scrolling without making body a separate sticky container.
(() => {
    const body = document.body;
    function restoreScroll() {
        if (body.style.overflow === 'auto') body.style.removeProperty('overflow');
    }
    new MutationObserver(restoreScroll).observe(body, {
        attributes: true, attributeFilter: ['style']
    });
    restoreScroll();
})();
