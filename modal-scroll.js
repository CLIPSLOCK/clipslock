// Keep the catalogue position across product/cart dialogs and preserve sticky headers.
(() => {
    const body = document.body;
    const dialogs = Array.from(document.querySelectorAll('.modal'));
    const isOpen = () => dialogs.some(dialog => getComputedStyle(dialog).display !== 'none');
    let wasOpen = isOpen();
    let position = { x:window.scrollX, y:window.scrollY };
    let restoreFrame = null;
    function remember() {
        if (!wasOpen && !isOpen()) position = { x:window.scrollX, y:window.scrollY };
    }
    // Capture before click handlers hide overflow or open a dialog.
    document.addEventListener('click', remember, true);
    document.addEventListener('pointerdown', remember, true);
    window.addEventListener('scroll', remember, { passive:true });
    for (const name of ['openProductModal', 'openCartModal']) {
        const original = window[name];
        if (typeof original !== 'function') continue;
        window[name] = function (...args) {
            remember();
            return original.apply(this, args);
        };
    }
    function sync() {
        const open = isOpen();
        if (open && !wasOpen) {
            if (restoreFrame !== null) cancelAnimationFrame(restoreFrame);
            restoreFrame = null;
        }
        if (!open && wasOpen) {
            const saved = { ...position };
            restoreFrame = requestAnimationFrame(() => {
                restoreFrame = null;
                if (!isOpen()) window.scrollTo({ left:saved.x, top:saved.y, behavior:'instant' });
            });
        }
        wasOpen = open;
        // 'auto' creates a scroll container and breaks the sticky header.
        if (body.style.overflow === 'auto') body.style.removeProperty('overflow');
    }
    const observer = new MutationObserver(sync);
    observer.observe(body, { attributes:true, attributeFilter:['style'] });
    dialogs.forEach(dialog => observer.observe(dialog, { attributes:true, attributeFilter:['style','class'] }));
    sync();
})();
