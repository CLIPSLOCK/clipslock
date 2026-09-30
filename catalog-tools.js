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

// Моделі беруться лише з явно зазначеної сумісності товарів.
(() => {
    const modelFilter = document.getElementById('modelFilter');
    const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const canonicalBrand = value => /^(vw|volkswagen)$/i.test(value.trim()) ? 'VW' : value.trim();
    const escapeRegex = value => value.replace(/[.*+?^$\{\}()|[\]\\]/g, '\\$&');
    let cachedProducts = null;
    let modelsByBrand = new Map();
    let productModels = new Map();
    let previousBrand = '';

    function rebuildModelIndex() {
        if (cachedProducts === products) return;
        cachedProducts = products;
        modelsByBrand = new Map();
        productModels = new Map();
        const brands = [...new Set(products.map(p => p.brand).concat(['Volkswagen', 'VW']))]
            .filter(b => b && b !== 'Універсальний').sort((a, b) => b.length - a.length);
        const brandPattern = new RegExp('(^|[\\s,;])(' + brands.map(escapeRegex).join('|') + ')(?=\\s|[—–:])', 'gi');
        for (const product of products) {
            const pairs = [];
            for (const entry of product.compatibility || []) {
                const text = String(entry).trim();
                const matches = [...text.matchAll(brandPattern)];
                const sections = matches.length ? matches.map((m, i) => ({
                    brand: canonicalBrand(m[2]),
                    text: text.slice(m.index + m[0].length, matches[i + 1]?.index ?? text.length)
                })) : [{brand: canonicalBrand(product.brand), text}];
                for (const section of sections) {
                    const parts = section.text.replace(/\([^)]*\)/g, ';').split(/[,;]/);
                    for (let model of parts) {
                        model = model.replace(/^[\s—–:-]+|[\s—–:-]+$/g, '').replace(/\s+/g, ' ').trim();
                        if (!model || /багато|універс|many|всі моделі/i.test(model) ||
                            model.length > 40 || model.split(' ').length > 4 ||
                            section.brand === 'Універсальний') continue;
                        const key = normalize(model);
                        if (!modelsByBrand.has(section.brand)) modelsByBrand.set(section.brand, new Map());
                        modelsByBrand.get(section.brand).set(key, model);
                        pairs.push({brand: section.brand, key});
                    }
                }
            }
            productModels.set(product, pairs);
        }
    }
    function refreshModels() {
        rebuildModelIndex();
        const brand = canonicalBrand(brandFilter.value);
        const changed = brand !== previousBrand;
        const selected = changed ? '' : modelFilter.value;
        previousBrand = brand;
        const options = [...(modelsByBrand.get(brand)?.entries() || [])]
            .sort((a, b) => a[1].localeCompare(b[1], 'uk', {numeric: true}));
        modelFilter.replaceChildren(new Option(
            !brand ? 'Спершу виберіть марку' : options.length ? 'Усі моделі' : 'Моделі не зазначені', ''
        ));
        for (const [key, label] of options) modelFilter.add(new Option(label, key));
        modelFilter.disabled = !brand || options.length === 0;
        modelFilter.value = selected;
    }
    filterProducts = function() {
        refreshModels();
        const query = normalize(searchInput.value);
        const cleanQuery = query.replace(/[\s-]/g, '');
        const brand = canonicalBrand(brandFilter.value);
        const model = modelFilter.value;
        const filtered = products.filter(p => {
            const pairs = productModels.get(p) || [];
            const compatibility = (p.compatibility || []).map(normalize);
            const searchMatch = normalize(p.name).includes(query) ||
                normalize(p.oem).replace(/[\s-]/g, '').includes(cleanQuery) ||
                normalize(p.brand).includes(query) || compatibility.some(c => c.includes(query));
            const aliases = brand === 'VW' ? ['vw', 'volkswagen'] : [normalize(brand)];
            const brandMatch = !brand || canonicalBrand(p.brand) === brand ||
                compatibility.some(c => aliases.some(a => c.startsWith(a + ' '))) ||
                pairs.some(pair => pair.brand === brand);
            const modelMatch = !model || pairs.some(pair => pair.brand === brand && pair.key === model);
            return searchMatch && brandMatch && modelMatch &&
                (!categoryFilter.value || p.category === categoryFilter.value);
        });
        renderProducts(filtered, 1);
    };
    document.addEventListener('DOMContentLoaded', () => {
        modelFilter.addEventListener('change', filterProducts);
        document.getElementById('resetFiltersBtn').addEventListener('click', () => {
            modelFilter.value = '';
            filterProducts();
        });
    });
})();
