// Small catalog conveniences, layered over the existing catalog features.
(() => {
    const key = 'clipslock_catalog_position_v1';
    const byId = id => document.getElementById(id);
    const controls = ['searchInput','brandFilter','modelFilter','categoryFilter','sortOrder'];
    const toolbar = document.querySelector('.catalog-toolbar');
    const chips = document.createElement('div');
    chips.className = 'catalog-filter-chips';
    chips.setAttribute('role','group');
    chips.setAttribute('aria-label','Вибрані фільтри');
    chips.hidden = true;
    toolbar.after(chips);
    let ready = false, restoring = false, lastItems = [], scrollTimer;
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(key) || 'null'); } catch {}
    const favoritesActive = () => byId('favoritesBtn').getAttribute('aria-pressed') === 'true';
    const hasProductLink = () => new URL(location.href).searchParams.has('product');
    const specialCatalog = () => favoritesActive() || !byId('visualZonePill').hidden || byId('sortOrder').value === 'photo';
    function persist() {
        if (!ready || restoring || hasProductLink() || document.body.style.overflow === 'hidden') return;
        const state = {version:1,page:specialCatalog() ? 1 : currentPage,scroll:window.scrollY};
        controls.forEach(id => {state[id] = byId(id).value;});
        if (state.sortOrder === 'photo') state.sortOrder = 'default';
        state.brands = window.ClipslockSelectedBrands();
        state.universal = byId('includeUniversal').checked;
        try { localStorage.setItem(key,JSON.stringify(state)); } catch {}
    }
    function clearControl(id) {
        const control = byId(id);
        control.value = '';
        control.dispatchEvent(new Event(id === 'searchInput' ? 'input' : 'change',{bubbles:true}));
    }
    function action(label, callback, className) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = className;
        button.textContent = label;
        button.addEventListener('click',callback);
        return button;
    }
    function refreshConveniences() {
        chips.replaceChildren();
        for (const brand of window.ClipslockSelectedBrands()) {
            const button = action(brand,()=> {
                const option = [...byId('brandFilter').options].find(option=>option.value === brand);
                if (option) option.selected=false;
                if (!window.ClipslockSelectedBrands().length) byId('brandFilter').value='';
                byId('brandFilter').dispatchEvent(new Event('change',{bubbles:true}));
            },'catalog-filter-chip');
            button.setAttribute('aria-label','Прибрати фільтр: ' + brand);
            const cross = document.createElement('span'); cross.textContent='×'; cross.setAttribute('aria-hidden','true'); button.append(cross); chips.append(button);
        }
        for (const id of ['searchInput','modelFilter','categoryFilter']) {
            const control = byId(id);
            if (!control.value.trim()) continue;
            const label = id === 'searchInput' ? 'Пошук: ' + control.value.trim() : control.selectedOptions[0]?.textContent;
            if (!label) continue;
            const button = action(label,()=>clearControl(id),'catalog-filter-chip');
            button.setAttribute('aria-label','Прибрати фільтр: ' + label);
            const cross = document.createElement('span');
            cross.textContent = '×';
            cross.setAttribute('aria-hidden','true');
            button.append(cross);
            chips.append(button);
        }
        if (byId('includeUniversal').checked && !byId('universalControl').hidden && !window.ClipslockSelectedBrands().includes('Універсальний')) {
            chips.append(action('Універсальні ×',()=> {
                byId('includeUniversal').checked=false;
                byId('includeUniversal').dispatchEvent(new Event('change',{bubbles:true}));
            },'catalog-filter-chip'));
        }
        chips.hidden = !chips.childElementCount;
        const grid = byId('productsGrid');
        if (grid.querySelector('.product-card')) return;
        const empty = document.createElement('div');
        empty.className = 'catalog-empty-help';
        const heading = document.createElement('p');
        heading.textContent = 'Спробуйте розширити пошук';
        empty.append(heading);
        const actions = document.createElement('div');
        actions.className = 'catalog-empty-actions';
        if (byId('modelFilter').value) actions.append(action('Усі моделі',()=>clearControl('modelFilter'),'catalog-help-button'));
        if (byId('categoryFilter').value) actions.append(action('Усі категорії',()=>clearControl('categoryFilter'),'catalog-help-button'));
        if (byId('searchInput').value.trim()) actions.append(action('Прибрати пошуковий запит',()=>clearControl('searchInput'),'catalog-help-button'));
        if (window.ClipslockSelectedBrands().some(b=>b !== 'Універсальний') && !byId('includeUniversal').checked) {
            actions.append(action('Додати універсальні',()=>{
                byId('includeUniversal').checked=true;
                byId('includeUniversal').dispatchEvent(new Event('change',{bubbles:true}));
            },'catalog-help-button'));
        }
        if (favoritesActive()) actions.append(action('Шукати в усьому каталозі',()=>byId('favoritesBtn').click(),'catalog-help-button'));
        actions.append(action('Показати весь каталог',()=>document.querySelector('.logo').click(),'catalog-help-button'));
        empty.append(actions);
        grid.append(empty);
    }
    const originalRender = renderProducts;
    renderProducts = function(items,page=1) {
        lastItems = items;
        const result = originalRender(items,page);
        refreshConveniences();
        persist();
        return result;
    };
    const originalPopulate = populateFilters;
    populateFilters = function() {
        const result = originalPopulate();
        if (ready) return result;
        ready = true;
        if (!saved || saved.version !== 1 || hasProductLink()) {persist(); return result;}
        restoring = true;
        try {
            for (const id of ['searchInput','brandFilter','categoryFilter','sortOrder']) {
                const control = byId(id);
                const value = typeof saved[id] === 'string' ? saved[id] : '';
                control.value = id === 'searchInput' || Array.from(control.options).some(option=>option.value === value) ? value : (id === 'sortOrder' ? 'default' : '');
            }
            if (Array.isArray(saved.brands)) {
                const wanted = saved.brands.filter(value=>typeof value === 'string');
                [...byId('brandFilter').options].forEach(option=>{option.selected = Boolean(option.value && wanted.includes(option.value));});
                if (!window.ClipslockSelectedBrands().length) byId('brandFilter').value='';
            }
            // Brand change builds the model options before restoring a model.
            byId('brandFilter').dispatchEvent(new Event('change',{bubbles:true}));
            const model = byId('modelFilter');
            model.value = Array.from(model.options).some(option=>option.value === saved.modelFilter) ? saved.modelFilter : '';
            byId('includeUniversal').checked = Boolean(saved.universal && !byId('universalControl').hidden);
            ['modelFilter','categoryFilter','sortOrder'].forEach(id=>byId(id).dispatchEvent(new Event('change',{bubbles:true})));
            filterProducts();
            const page = Math.max(1,Math.min(Number.isInteger(saved.page) ? saved.page : 1,Math.ceil(lastItems.length/itemsPerPage) || 1));
            renderProducts(lastItems,page);
            const top = Number.isFinite(saved.scroll) ? Math.max(0,saved.scroll) : 0;
            requestAnimationFrame(()=>requestAnimationFrame(()=>{
                window.scrollTo({top,behavior:'instant'});
                restoring=false;
                persist();
            }));
        } finally { saved=null; }
        return result;
    };
    window.addEventListener('scroll',()=>{
        clearTimeout(scrollTimer);
        scrollTimer=setTimeout(persist,120);
    },{passive:true});
    window.addEventListener('pagehide',persist);
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState === 'hidden')persist();});
    for (const element of [document.querySelector('.logo'),byId('resetFiltersBtn')]) {
        element.addEventListener('click',()=>{
            saved=null;
            restoring=false;
            clearTimeout(scrollTimer);
            try {localStorage.removeItem(key);} catch {}
        },true);
        element.addEventListener('click',()=>{refreshConveniences();persist();});
    }
})();
