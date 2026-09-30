(() => {
    const zones = [
        {id:'bumper', name:'Бампер', hint:'Передній і задній', categories:['Кріплення бампера'], parts:['front','rear']},
        {id:'arches', name:'Підкрилки', hint:'Колісні арки', categories:['Кріплення підкрилки'], parts:['arches']},
        {id:'trim', name:'Обшивка та молдинги', hint:'Салон і зовнішні накладки', categories:['Кріплення обшивки та молдингів'], parts:['trim']},
        {id:'doors', name:'Двері та замки', hint:'Кліпси й склопідйомники', categories:['Кліпси дверей та замків','Склопідйомники'], parts:['doors']},
        {id:'body', name:'Кузов', hint:'Кріплення кузовних деталей', categories:['Кріплення кузова'], parts:['body']},
        {id:'hood', name:'Під капотом', hint:'Опора капота, шланги та дроти', categories:['Кріплення опори капота, шлангів та дротів'], parts:['hood']},
        {id:'lights', name:'Фари та освітлення', hint:'Кріплення й деталі освітлення', categories:['Кріплення фари','Деталі освітлення','Світловідбивачі'], parts:['lights']},
        {id:'seals', name:'Ущільнювачі', hint:'Ущільнення кузова', categories:['Ущільнювачі'], parts:['seals']}
    ];
    const modal = document.getElementById('visualCatalogModal');
    const grid = document.getElementById('visualCatalogGrid');
    const button = document.getElementById('visualCatalogBtn');
    const host = document.getElementById('visualCatalogEntry');
    const category = document.getElementById('categoryFilter');
    const pill = document.getElementById('visualZonePill');
    let selected = null;
    let returnFocus = null;
    const carIcon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m3 13 2-6h14l2 6v6H3zM3 13h18M7 19v2m10-2v2M6 16h2m8 0h2"/></svg>';
    button.innerHTML = carIcon + '<span>Візуальний каталог</span>';
    function car(parts) {
        const active = name => parts.includes(name) ? 'vc-highlight' : 'vc-region';
        return '<svg class="vc-car" viewBox="0 0 300 150" fill="none" aria-hidden="true">' +
        '<path d="M23 118h254" stroke="currentColor" opacity=".12"/>' +
        '<path class="'+active('body')+'" d="m24 91 7-19 50-12 31-26h72l43 29 39 10 12 17-4 20h-18a25 25 0 0 0-50 0H89a25 25 0 0 0-50 0H25z"/>' +
        '<path class="'+active('hood')+'" d="m32 72 49-12 11 15-61 8z"/>' +
        '<path class="'+active('doors')+'" d="m96 76 99 1 16 23-12 8H95z"/>' +
        '<path class="'+active('trim')+'" d="M95 94h105v12H95z"/>' +
        '<path class="'+active('front')+'" d="M25 94h14l-2 13H25z"/>' +
        '<path class="'+active('rear')+'" d="M262 94h15l-3 13h-13z"/>' +
        '<path class="'+active('lights')+'" d="m31 80 19-3-3 9-20 2zm225-3 13 4 4 8-15-3z"/>' +
        '<path class="vc-window" d="m96 61 23-20h25v24H93zm56-20h28l33 23-61 1z"/>' +
        '<path class="'+active('seals')+'" d="m94 63 24-24h64l36 27-126-1z"/>' +
        '<path d="M145 69v38m57-37 18 25M84 78l7 12m25-11h10m37 1h10m49-5h28" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<path class="'+active('arches')+'" d="M38 109a26 26 0 0 1 52 0m114 0a26 26 0 0 1 52 0"/>' +
        '<circle class="vc-wheel" cx="64" cy="110" r="18"/><circle cx="64" cy="110" r="9" stroke="currentColor" opacity=".45"/>' +
        '<circle class="vc-wheel" cx="230" cy="110" r="18"/><circle cx="230" cy="110" r="9" stroke="currentColor" opacity=".45"/>' +
        '<path d="M18 91h13m243 0h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>' +
        '</svg>';
    }
    zones.forEach(zone => {
        const tile = document.createElement('button');
        tile.type = 'button';
        tile.className = 'vc-tile';
        tile.dataset.zone = zone.id;
        tile.setAttribute('aria-pressed','false');
        tile.innerHTML = car(zone.parts) + '<span class="vc-zone-name">'+zone.name+'</span><span class="vc-zone-hint">'+zone.hint+'</span>';
        tile.addEventListener('click', () => select(zone));
        grid.append(tile);
    });
    function placeButton() {
        if (window.matchMedia('(min-width: 901px)').matches) {
            document.querySelector('.header-actions').insertBefore(button, document.getElementById('compareBtn'));
        } else host.append(button);
    }
    window.matchMedia('(min-width: 901px)').addEventListener('change', placeButton);
    placeButton();
    function sync() {
        pill.hidden = !selected;
        pill.querySelector('span').textContent = selected ? selected.name : '';
        grid.querySelectorAll('[data-zone]').forEach(tile => tile.setAttribute('aria-pressed',String(tile.dataset.zone === selected?.id)));
    }
    function close() {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        button.setAttribute('aria-expanded','false');
        returnFocus?.focus({preventScroll:true});
    }
    function scrollResults() {
        // Let the normal dialog-close scroll restoration finish first.
        requestAnimationFrame(() => requestAnimationFrame(() => {
            const target = document.querySelector('#productsGrid .product-card') || document.getElementById('productsGrid');
            const header = document.querySelector('.header');
            const top = window.scrollY + target.getBoundingClientRect().top - (header?.getBoundingClientRect().height || 0) - 12;
            window.scrollTo({top:Math.max(0,top), behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'});
        }));
    }
    function select(zone) {
        category.value = '';
        category.dispatchEvent(new Event('change',{bubbles:true}));
        selected = zone;
        sync();
        filterProducts();
        close();
        scrollResults();
    }
    button.addEventListener('click', () => {
        returnFocus = document.activeElement;
        sync();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        button.setAttribute('aria-expanded','true');
        (grid.querySelector('[aria-pressed="true"]') || grid.querySelector('button')).focus({preventScroll:true});
    });
    modal.querySelector('.close-modal').addEventListener('click', close);
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    modal.addEventListener('keydown', event => {
        if (event.key === 'Escape') { event.preventDefault(); close(); }
        if (event.key === 'Tab') {
            const controls = [...modal.querySelectorAll('button')].filter(e=>!e.disabled);
            const first = controls[0], last = controls[controls.length-1];
            if (event.shiftKey && document.activeElement === first) {event.preventDefault(); last.focus();}
            else if (!event.shiftKey && document.activeElement === last) {event.preventDefault(); first.focus();}
        }
    });
    function clear() { selected = null; sync(); }
    pill.addEventListener('click', () => {clear(); filterProducts();});
    category.addEventListener('change', () => { clear(); filterProducts(); });
    document.getElementById('resetFiltersBtn').addEventListener('click', () => {clear(); filterProducts();});
    document.querySelector('.logo').addEventListener('click', () => {clear(); filterProducts();});
    const originalRender = renderProducts;
    renderProducts = function(items, page=1) {
        if (selected) items = items.filter(product => selected.categories.includes(product.category));
        return originalRender(items,page);
    };
    sync();
})();
