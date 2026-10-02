// Share product links and open the linked product after catalog loading.
(() => {
    const button = document.getElementById('shareProductBtn');
    const status = document.getElementById('shareProductStatus');
    let sharedProduct = null;
    const originalOpen = window.openProductModal;
    const productModal = document.getElementById('productModal');
    let syncingHistory = false;
    function productUrl(id) {
        const url = new URL(window.location.href);
        url.searchParams.set('product', id);
        url.hash = '';
        return url;
    }
    function clearProductUrl() {
        const url = new URL(window.location.href);
        if (!url.searchParams.has('product')) return;
        if (history.state?.clipslockProduct) {
            history.back();
        } else {
            url.searchParams.delete('product');
            history.replaceState(history.state, '', url);
        }
        sharedProduct = null;
    }
    window.openProductModal = function(id) {
        originalOpen(id);
        sharedProduct = products.find(p => String(p.id) === String(id)) || null;
        button.disabled = !sharedProduct;
        status.textContent = '';
        if (sharedProduct && !syncingHistory &&
            new URL(window.location.href).searchParams.get('product') !== String(id)) {
            if (new URL(window.location.href).searchParams.has('product')) {
                history.replaceState(history.state, '', productUrl(id));
            } else {
                history.pushState({ ...(history.state || {}), clipslockProduct: true }, '', productUrl(id));
            }
        }
    };
    window.addEventListener('popstate', () => {
        const id = new URL(window.location.href).searchParams.get('product');
        if (id && products.some(p => String(p.id) === id)) {
            syncingHistory = true;
            window.openProductModal(id);
            syncingHistory = false;
        } else {
            productModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            sharedProduct = null;
        }
    });
    document.addEventListener('click', event => {
        if (event.target.closest('.close-modal')?.closest('.modal') === productModal ||
            event.target === productModal ||
            event.target.closest('#modalAddToCart')) {
            clearProductUrl();
        }
    });
    async function copyLink(url) {
        try {
            if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
            await navigator.clipboard.writeText(url);
        } catch {
            const field = document.createElement('textarea');
            field.value = url;
            field.style.position = 'fixed';
            field.style.opacity = '0';
            document.body.append(field);
            field.select();
            const copied = document.execCommand('copy');
            field.remove();
            button.focus();
            if (!copied) throw new Error('Could not copy');
        }
    }
    button.addEventListener('click', async () => {
        if (!sharedProduct) return;
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        url.searchParams.set('product', sharedProduct.id);
        const data = {title: sharedProduct.name + ' | CLIPSLOCK',
            text: sharedProduct.name + ' — артикул ' + sharedProduct.oem,
            url: url.href};
        button.disabled = true;
        status.textContent = '';
        try {
            if (navigator.share) {
                try {
                    await navigator.share(data);
                    return;
                } catch (error) {
                    if (error.name === 'AbortError') return;
                }
            }
            await copyLink(data.url);
            status.textContent = 'Посилання скопійовано';
        } catch {
            status.replaceChildren();
            const link = document.createElement('a');
            link.href = data.url;
            link.textContent = 'Відкрити посилання на товар';
            status.append('Не вдалося скопіювати. ', link);
        } finally {
            button.disabled = false;
        }
    });
    let pendingId = new URL(window.location.href).searchParams.get('product');
    const originalRender = renderProducts;
    renderProducts = function(items, page = 1) {
        originalRender(items, page);
        if (pendingId === null) return;
        const id = pendingId;
        pendingId = null;
        if (products.some(p => String(p.id) === id)) {
            window.openProductModal(id);
        } else {
            const notice = document.createElement('p');
            notice.className = 'product-link-notice';
            notice.setAttribute('role', 'status');
            notice.textContent = 'Товар за цим посиланням більше не доступний. Скористайтеся пошуком у каталозі.';
            document.querySelector('.catalog-toolbar').after(notice);
        }
    };
})();
