// Catalog sorting and result count; loaded after script.js.
(() => {
    const originalRenderProducts = renderProducts;
    const randomRanks = new Map();
    let recommendationScores = null;
    const normalizeRecommendation = value => String(value || '').trim().toLowerCase().replace(/^volkswagen$/, 'vw');
    function prepareRecommendations() {
        let viewedIds = [];
        try {
            const saved = JSON.parse(localStorage.getItem('clipslock_recently_viewed') || '[]');
            if (Array.isArray(saved)) viewedIds = saved.map(String).slice(0, 8);
        } catch {}
        const brands = new Map();
        const categories = new Map();
        viewedIds.forEach((id, index) => {
            const product = products.find(p => String(p.id) === id);
            if (!product) return;
            const weight = 8 - index;
            const brand = normalizeRecommendation(product.brand);
            const category = normalizeRecommendation(product.category);
            if (brand && brand !== 'універсальний') brands.set(brand, (brands.get(brand) || 0) + weight);
            if (category) categories.set(category, (categories.get(category) || 0) + weight);
        });
        recommendationScores = new Map(products.map(product => {
            const id = String(product.id);
            if (!randomRanks.has(id)) randomRanks.set(id, Math.random());
            const score = 3 * (brands.get(normalizeRecommendation(product.brand)) || 0) +
                2 * (categories.get(normalizeRecommendation(product.category)) || 0);
            return [id, viewedIds.includes(id) ? -1 : score];
        }));
    }
    function sortedProducts(items, order) {
        const sorted = [...items];
        if (order === 'price-asc') sorted.sort((a, b) => Number(a.price) - Number(b.price));
        if (order === 'price-desc') sorted.sort((a, b) => Number(b.price) - Number(a.price));
        if (order === 'newest') sorted.sort((a, b) => Number(b.id) - Number(a.id));
        if (order === 'recommended') {
            if (!recommendationScores) prepareRecommendations();
            sorted.sort((a, b) =>
                (recommendationScores.get(String(b.id)) || 0) - (recommendationScores.get(String(a.id)) || 0) ||
                (randomRanks.get(String(a.id)) || 0) - (randomRanks.get(String(b.id)) || 0) ||
                String(a.id).localeCompare(String(b.id)));
        }
        return sorted;
    }
    renderProducts = function(items, page = 1) {
        const order = document.getElementById('sortOrder').value;
        document.getElementById('resultsCount').textContent =
            'Знайдено товарів: ' + items.length.toLocaleString('uk-UA');
        originalRenderProducts(sortedProducts(items, order), page);
    };
    document.addEventListener('DOMContentLoaded', () => {
        document.getElementById('sortOrder').addEventListener('change', () => {
            recommendationScores = null;
            filterProducts();
        });
    });
})();

// Моделі беруться лише з явно зазначеної сумісності товарів.
(() => {
    const modelFilter = document.getElementById('modelFilter');
    const universalToggle = document.getElementById('includeUniversal');
    const universalControl = document.getElementById('universalControl');
    const {normalize,canonical,build} = window.ClipslockFitment;
    window.ClipslockSelectedBrands = () => [...brandFilter.selectedOptions].map(option=>canonical(option.value)).filter(Boolean);
    const selectedBrands = window.ClipslockSelectedBrands;
    let cachedProducts = null, index, previousBrand = '';
    let previousUniversalSelection = false;
    function ensureIndex() {
        if (cachedProducts === products) return;
        cachedProducts = products;
        index = build(products);
        const selected = selectedBrands();
        brandFilter.replaceChildren(new Option('Усі марки',''));
        [...index.brands].sort((a,b)=>a.localeCompare(b,'uk')).forEach(brand=>brandFilter.add(new Option(brand,brand)));
        [...brandFilter.options].forEach(option=>{option.selected = selected.length ? selected.includes(option.value) : !option.value;});
    }
    function refreshModels() {
        ensureIndex();
        const brands = selectedBrands();
        const brand = brands.length === 1 ? brands[0] : '';
        const selectionKey = brands.join('|');
        const selected = selectionKey !== previousBrand ? '' : modelFilter.value;
        previousBrand = selectionKey;
        const options = [...(index.models.get(brand)?.entries() || [])].sort((a,b)=>a[1].localeCompare(b[1],'uk',{numeric:true}));
        modelFilter.replaceChildren(new Option(brands.length > 1 ? 'Одна марка — для вибору моделі' : !brand ? 'Спершу виберіть марку' : options.length ? 'Усі моделі' : 'Моделі не зазначені',''));
        options.forEach(([key,label])=>modelFilter.add(new Option(label,key)));
        modelFilter.disabled = !brand || !options.length;
        modelFilter.value = selected;
        const universalSelected = brands.includes('Універсальний');
        universalControl.hidden = !brands.some(b=>b !== 'Універсальний');
        if (universalSelected) universalToggle.checked = true;
        else if (previousUniversalSelection || universalControl.hidden) universalToggle.checked = false;
        previousUniversalSelection = universalSelected;
    }
    const originalPopulateFilters = populateFilters;
    populateFilters = function() {
        originalPopulateFilters();
        cachedProducts = null;
        refreshModels();
    };
    filterProducts = function() {
        refreshModels();
        const query = normalize(searchInput.value), cleanQuery = query.replace(/[\s-]/g,'');
        const brands = selectedBrands(), brand = brands.length === 1 ? brands[0] : '', model = modelFilter.value;
        const filtered = products.filter(product => {
            const fitment = index.fitments.get(product);
            const universalExtra = Boolean(brands.length && universalToggle.checked && fitment.universal);
            const searchMatch = normalize(product.name).includes(query) ||
                normalize(product.oem).replace(/[\s-]/g,'').includes(cleanQuery) ||
                [...fitment.brands].some(b=>normalize(b).includes(query)) ||
                normalize(product.brand).includes(query) ||
                (product.compatibility || []).some(c=>normalize(c).includes(query));
            const brandMatch = !brands.length || brands.some(b=>b === 'Універсальний' ? fitment.universal : fitment.brands.has(b)) || universalExtra;
            const modelMatch = !model || universalExtra || fitment.pairs.some(pair=>pair.brand === brand && pair.key === model);
            return searchMatch && brandMatch && modelMatch && (!categoryFilter.value || product.category === categoryFilter.value);
        });
        renderProducts(filtered,1);
    };
    const originalRender = renderProducts;
    renderProducts = function(items,page) {
        ensureIndex();
        const result = originalRender(items,page);
        document.querySelectorAll('.product-card').forEach(card => {
            const id = card.querySelector('.card-qty-control')?.dataset.id;
            const product = products.find(p=>String(p.id) === String(id));
            const label = card.querySelector('.pc-brand');
            if (!product || !label) return;
            const fitment = index.fitments.get(product);
            const brands = [...fitment.brands];
            const selected = canonical(brandFilter.value);
            brands.sort((a,b)=>(a === selected ? -1 : b === selected ? 1 : a === canonical(product.brand) ? -1 : b === canonical(product.brand) ? 1 : a.localeCompare(b)));
            label.textContent = fitment.universal && !brands.length ? 'Універсальний' : brands.slice(0,2).join(' · ') + (brands.length > 2 ? ' · +' + (brands.length-2) : '');
            label.title = brands.join(' · ') || 'Універсальний — підбір за розмірами';
        });
        return result;
    };
    const originalModal = window.openProductModal;
    window.openProductModal = function(...args) {
        const result = originalModal.apply(this,args);
        const product = products.find(p=>String(p.id) === String(args[0]));
        if (product) {
            ensureIndex();
            const label = document.getElementById('modalBrand');
            if (label) label.textContent = [...index.fitments.get(product).brands].join(' · ') || 'Універсальний';
        }
        return result;
    };
    document.addEventListener('DOMContentLoaded',()=> {
        modelFilter.addEventListener('change',filterProducts);
        universalToggle.addEventListener('change',()=>{
            if (!universalToggle.checked) {
                const option = [...brandFilter.options].find(option=>option.value === 'Універсальний');
                if (option?.selected) {option.selected=false; brandFilter.dispatchEvent(new Event('change',{bubbles:true})); return;}
            }
            filterProducts();
        });
        for (const element of [document.getElementById('resetFiltersBtn'),document.querySelector('.logo')]) {
            element?.addEventListener('click',()=>{ universalToggle.checked=false; },true);
        }
        document.getElementById('resetFiltersBtn').addEventListener('click',()=>{modelFilter.value='';filterProducts();});
    });
})();
