// Catalog sorting and result count; loaded after script.js.
(() => {
    const originalRenderProducts = renderProducts;
    function sortedProducts(items, order) {
        const sorted = [...items];
        if (order === 'price-asc') sorted.sort((a, b) => Number(a.price) - Number(b.price));
        if (order === 'price-desc') sorted.sort((a, b) => Number(b.price) - Number(a.price));
        if (order === 'newest') sorted.sort((a, b) => Number(b.id) - Number(a.id));
        return sorted;
    }
    renderProducts = function(items, page = 1) {
        const order = document.getElementById('sortOrder').value;
        document.getElementById('resultsCount').textContent =
            'Знайдено товарів: ' + items.length.toLocaleString('uk-UA');
        originalRenderProducts(sortedProducts(items, order), page);
    };
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('sortOrder').addEventListener('change', filterProducts);
    });
})();
