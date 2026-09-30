(() => {
    const cartButton = document.getElementById('cartBtn');
    if (!cartButton || !window.addToCart) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const clip = '<svg viewBox="0 0 48 56" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 15C8 9 15 5 24 5s16 4 16 10c0 3-5 4-11 4v21l-5 10-5-10V19c-6 0-11-1-11-4Z"/><ellipse cx="24" cy="10" rx="4" ry="2.5"/><path d="M17 26h5m4 0h5m-14 7h5m4 0h5m-14 7h5m4 0h5"/></svg>';
    let active = 0;
    let lastFlight = 0;
    function pulse() {
        if (reducedMotion.matches) return;
        cartButton.getAnimations().filter(animation => animation.id === 'cart-arrival').forEach(animation => animation.cancel());
        const animation = cartButton.animate([
            {boxShadow:'0 0 0 0 rgba(197,128,19,0)', backgroundColor:'var(--bg-body)'},
            {boxShadow:'0 0 0 5px rgba(197,128,19,.13)', backgroundColor:'var(--accent-mustard-light)',offset:.45},
            {boxShadow:'0 0 0 0 rgba(197,128,19,0)', backgroundColor:'var(--bg-body)'}
        ], {duration:360,easing:'ease-out'});
        animation.id = 'cart-arrival';
    }
    function fly(source) {
        if (reducedMotion.matches || !source || active >= 3 || performance.now() - lastFlight < 120) return;
        const from = source.getBoundingClientRect();
        const to = cartButton.getBoundingClientRect();
        if (!from.width) return;
        lastFlight = performance.now();
        const startX = Math.max(24, Math.min(innerWidth - 24, from.left + from.width / 2));
        const startY = Math.max(24, Math.min(innerHeight - 24, from.top + from.height / 2));
        const endX = to.width ? Math.max(20, Math.min(innerWidth - 20, to.left + to.width / 2)) : innerWidth - 32;
        const endY = !to.width || to.bottom <= 0 ? -24 : to.top >= innerHeight ? innerHeight + 24 : to.top + to.height / 2;
        const dx = endX - startX;
        const dy = endY - startY;
        const lift = Math.min(75, Math.abs(dy) * .18 + 25);
        const duration = Math.min(900, Math.max(620, Math.hypot(dx,dy) * .55));
        const flying = document.createElement('span');
        flying.className = 'cart-flying-clip';
        flying.innerHTML = clip;
        flying.setAttribute('aria-hidden','true');
        flying.style.left = startX + 'px'; flying.style.top = startY + 'px';
        document.body.append(flying);
        active++;
        const animations = [];
        const elements = [flying];
        const path = (scale, opacity) => [
            {transform:'translate(-50%,-50%) translate(0,0) scale(' + scale + ') rotate(-12deg)',opacity},
            {transform:'translate(-50%,-50%) translate(' + dx*.35 + 'px,' + (dy*.25-lift) + 'px) scale(' + scale*.9 + ') rotate(3deg)',opacity,offset:.4},
            {transform:'translate(-50%,-50%) translate(' + dx*.78 + 'px,' + (dy*.72-lift*.4) + 'px) scale(' + scale*.55 + ') rotate(12deg)',opacity:opacity*.8,offset:.78},
            {transform:'translate(-50%,-50%) translate(' + dx + 'px,' + dy + 'px) scale(.18) rotate(12deg)',opacity:0}
        ];
        const main = flying.animate(path(1,1),{duration,easing:'cubic-bezier(.25,.65,.35,1)',fill:'forwards'});
        animations.push(main);
        for (let i=0;i<2;i++) {
            const dot = document.createElement('span'); dot.className = 'cart-flight-dot'; dot.setAttribute('aria-hidden','true');
            dot.style.left = startX + (i ? 6 : -6) + 'px'; dot.style.top = startY + 8 + 'px';
            document.body.append(dot); elements.push(dot);
            animations.push(dot.animate(path(1,.45),{duration:duration-80,delay:50+i*60,easing:'cubic-bezier(.25,.65,.35,1)',fill:'both'}));
        }
        let removed = false;
        function cleanup() { if (removed) return; removed = true; elements.forEach(element => element.remove()); active--; }
        main.onfinish = () => { cleanup(); pulse(); };
        main.oncancel = cleanup;
        setTimeout(cleanup,duration+250);
        const cancel = () => { animations.forEach(animation => animation.cancel()); cleanup(); };
        reducedMotion.addEventListener('change',cancel,{once:true});
        setTimeout(() => reducedMotion.removeEventListener('change',cancel),duration+300);
    }
    let clickedSource = null;
    let clickedRect = null;
    let clickedAt = 0;
    document.addEventListener('click', event => { const button = event.target.closest?.('.card-add-btn, #modalAddToCart'); if (button) { clickedSource = button; clickedRect = button.getBoundingClientRect(); clickedAt = performance.now(); } }, true);
    const originalAdd = window.addToCart;
    window.addToCart = function(event,id,qty) {
        const source = event?.target?.closest?.('button') || (performance.now() - clickedAt < 500 ? clickedSource : null) || document.activeElement?.closest?.('.card-add-btn, #modalAddToCart');
        const sourceRect = performance.now() - clickedAt < 500 && clickedRect ? clickedRect : source?.getBoundingClientRect();
        const before = Number(document.getElementById('cartBadge').textContent);
        const result = originalAdd.apply(this,arguments);
        const after = Number(document.getElementById('cartBadge').textContent);
        if (after > before) {
            try { fly(sourceRect ? {getBoundingClientRect: () => sourceRect} : null); } catch {}
        }
        return result;
    };
})();
