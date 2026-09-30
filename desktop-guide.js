// The desktop guide follows scrolling between the top and bottom viewport edges.
(() => {
    const guide = document.querySelector('.desktop-fit-guide');
    if (!guide) return;
    const desktop = window.matchMedia('(min-width: 1100px)');
    let previousScroll = window.scrollY;
    let inset = 88;
    let scheduled = false;
    function bounds() {
        return Math.max(88, window.innerHeight - guide.offsetHeight - 24);
    }
    function update() {
        scheduled = false;
        const currentScroll = window.scrollY;
        if (desktop.matches) {
            inset = Math.max(88, Math.min(bounds(), inset - (currentScroll - previousScroll)));
            guide.style.top = inset + 'px';
        } else {
            inset = 88;
            guide.style.removeProperty('top');
        }
        previousScroll = currentScroll;
    }
    window.addEventListener('scroll', () => {
        if (!scheduled) {
            scheduled = true;
            window.requestAnimationFrame(update);
        }
    }, {passive: true});
    window.addEventListener('resize', update);
    desktop.addEventListener('change', update);
    update();
})();
