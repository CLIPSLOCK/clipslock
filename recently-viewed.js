// Recently viewed products, kept locally in this browser.
(() => {
    const key = 'clipslock_recently_viewed';
    const section = document.getElementById('recentlyViewed');
    const grid = document.getElementById('recentlyViewedGrid');
    function read(value) {
        try {
            const ids = JSON.parse(value || '[]');
            return Array.isArray(ids) ? [...new Set(ids.filter(id => typeof id === 'string' || typeof id === 'number').map(String))].slice(0, 8) : [];
        } catch { return []; }
    }
    let ids;
    try { ids = read(localStorage.getItem(key)); } catch { ids = []; }
    function renderRecent() {
        const items = ids.map(id => products.find(p => String(p.id) === id)).filter(Boolean);
        grid.replaceChildren();
        section.hidden = !items.length;
        items.forEach(product => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'recent-product';
            button.setAttribute('aria-label', 'Переглянути: ' + product.name + ', OEM ' + product.oem);
            const img = document.createElement('img');
            img.src = product.img;
            img.alt = product.name;
            img.loading = 'lazy';
            const name = document.createElement('span');
            name.className = 'recent-product-name';
            name.textContent = product.name;
            const oem = document.createElement('span');
            oem.className = 'recent-product-oem';
            oem.textContent = 'OEM: ' + product.oem;
            const price = document.createElement('span');
            price.className = 'recent-product-price';
            price.textContent = product.price + ' грн / шт';
            button.append(img, name, oem, price);
            button.addEventListener('click', () => window.openProductModal(product.id));
            grid.append(button);
        });
    }
    const originalOpen = window.openProductModal;
    window.openProductModal = function(id) {
        originalOpen(id);
        if (!products.some(p => String(p.id) === String(id))) return;
        ids = [String(id), ...ids.filter(saved => saved !== String(id))].slice(0, 8);
        try { localStorage.setItem(key, JSON.stringify(ids)); } catch {}
        renderRecent();
    };
    const originalRender = renderProducts;
    renderProducts = function(...args) {
        originalRender(...args);
        renderRecent();
    };
    document.getElementById('clearRecentlyViewed').addEventListener('click', () => {
        ids = [];
        try { localStorage.removeItem(key); } catch {}
        renderRecent();
    });
    window.addEventListener('storage', event => {
        if (event.key === key || event.key === null) {
            ids = read(event.newValue);
            renderRecent();
        }
    });
    renderRecent();
})();
