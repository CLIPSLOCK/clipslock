(() => {
    const threshold = 600;
    const cartButton = document.getElementById('cartBtn');
    const totalElement = document.getElementById('cartTotalSum');
    if (!cartButton || !totalElement) return;
    const wrapper = document.createElement('div');
    wrapper.className = 'header-cart-delivery';
    cartButton.before(wrapper);
    wrapper.append(cartButton);
    const indicator = document.createElement('div');
    indicator.className = 'header-delivery-indicator';
    const label = document.createElement('span');
    label.className = 'header-delivery-label';
    label.setAttribute('role', 'status');
    const track = document.createElement('div');
    track.className = 'header-delivery-track';
    track.setAttribute('role', 'progressbar');
    track.setAttribute('aria-label', 'До безкоштовної доставки');
    track.setAttribute('aria-valuemin', '0');
    track.setAttribute('aria-valuemax', String(threshold));
    const fill = document.createElement('span');
    track.append(fill);
    indicator.append(label, track);
    wrapper.append(indicator);
    function update() {
        const number = totalElement.textContent.replace(/\s/g, '').replace(',', '.').match(/\d+(?:\.\d+)?/);
        const total = number ? Number(number[0]) : 0;
        const remaining = Math.max(0, Math.ceil((threshold - total) * 100) / 100);
        const formatted = remaining.toLocaleString('uk-UA', {maximumFractionDigits: 2});
        label.textContent = total >= threshold ? 'Безкоштовна доставка ✓' : total > 0 ? 'Ще ' + formatted + ' грн до безкоштовної доставки' : 'Безкоштовна доставка від 600 грн';
        indicator.classList.toggle('is-free', total >= threshold);
        fill.style.width = Math.min(100, total / threshold * 100) + '%';
        track.setAttribute('aria-valuenow', String(Math.min(threshold, total)));
        track.setAttribute('aria-valuetext', label.textContent);
    }
    new MutationObserver(update).observe(totalElement, {childList:true, characterData:true, subtree:true});
    update();
})();
