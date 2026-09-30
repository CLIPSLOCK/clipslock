// Favorites are saved in this browser; catalog/cart behavior is preserved.
(() => {
    const storageKey = 'clipslock_favorites';
    let favoriteIds;
    try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
        favoriteIds = new Set(Array.isArray(stored) ? stored.map(String) : []);
    } catch { favoriteIds = new Set(); }
    let favoritesOnly = false;
    let modalProductId = null;
    let lastItems = [];
    let lastPage = 1;
    function refreshFavorites() {
        renderProducts(lastItems, lastPage);
    }
    const headerButton = document.getElementById('favoritesBtn');
    const badge = document.getElementById('favoritesBadge');
    const modalButton = document.getElementById('modalFavoriteBtn');
    const heart = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/></svg>';
    function persist() {
        try { localStorage.setItem(storageKey, JSON.stringify([...favoriteIds])); } catch {}
    }
    function updateHeader() {
        badge.textContent = products.length
            ? products.filter(p => favoriteIds.has(String(p.id))).length : favoriteIds.size;
        headerButton.setAttribute('aria-pressed', String(favoritesOnly));
    }
    function updateModal() {
        const saved = favoriteIds.has(modalProductId);
        modalButton.setAttribute('aria-pressed', String(saved));
        modalButton.innerHTML = heart + '<span>' + (saved ? 'В обраному' : 'Додати в обране') + '</span>';
    }
    function toggleFavorite(id) {
        id = String(id);
        if (favoriteIds.has(id)) favoriteIds.delete(id);
        else favoriteIds.add(id);
        persist();
        refreshFavorites();
        if (modalProductId) updateModal();
    }
    function decorateCards() {
        document.querySelectorAll('#productsGrid .product-card').forEach(card => {
            const id = card.querySelector('.card-qty-control')?.dataset.id;
            const product = products.find(p => String(p.id) === String(id));
            if (!product) return;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'favorite-heart';
            button.innerHTML = heart;
            button.setAttribute('aria-pressed', String(favoriteIds.has(String(id))));
            button.setAttribute('aria-label', (favoriteIds.has(String(id)) ? 'Прибрати з обраного: ' : 'Додати в обране: ') + product.name);
            button.title = favoriteIds.has(String(id)) ? 'Прибрати з обраного' : 'Додати в обране';
            button.addEventListener('click', event => { event.stopPropagation(); toggleFavorite(id); });
            card.querySelector('.pc-image-wrap').append(button);
        });
    }
    const originalRender = renderProducts;
    renderProducts = function(items, page = 1) {
        lastItems = [...items];
        const visible = favoritesOnly ? items.filter(p => favoriteIds.has(String(p.id))) : items;
        lastPage = Math.max(1, Math.min(page, Math.ceil(visible.length / itemsPerPage) || 1));
        originalRender(visible, lastPage);
        decorateCards();
        updateHeader();
        if (favoritesOnly && visible.length === 0) {
            const message = document.getElementById('productsGrid').querySelector('p');
            if (message) message.textContent = favoriteIds.size
                ? 'Обраних товарів за цими фільтрами не знайдено.'
                : 'В обраному ще немає товарів. Натисніть сердечко на потрібній кліпсі.';
        }
    };
    const originalOpen = window.openProductModal;
    window.openProductModal = function(id) {
        originalOpen(id);
        modalProductId = String(id);
        updateModal();
    };
    headerButton.addEventListener('click', () => {
        favoritesOnly = !favoritesOnly;
        filterProducts();
        document.getElementById('catalog').scrollIntoView({behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    });
    modalButton.addEventListener('click', () => { if (modalProductId) toggleFavorite(modalProductId); });
    window.addEventListener('storage', event => {
        if (event.key !== storageKey) return;
        try {
            const ids = JSON.parse(event.newValue || '[]');
            favoriteIds = new Set(Array.isArray(ids) ? ids.map(String) : []);
        } catch { favoriteIds = new Set(); }
        refreshFavorites();
        if (modalProductId) updateModal();
    });
    document.querySelector('.logo').addEventListener('click', event => {
        event.preventDefault();
        favoritesOnly = false;
        document.getElementById('searchInput').value = '';
        ['brandFilter', 'modelFilter', 'categoryFilter'].forEach(id => {
            document.getElementById(id).value = '';
        });
        document.getElementById('sortOrder').value = 'default';
        ['brandFilter', 'modelFilter', 'categoryFilter', 'sortOrder'].forEach(id => {
            document.getElementById(id).dispatchEvent(new Event('change', {bubbles: true}));
        });
        filterProducts();
        const url = new URL(window.location.href);
        url.searchParams.delete('product');
        url.hash = '';
        window.history.replaceState(null, '', url);
        window.scrollTo({top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    });
    updateHeader();
})();
