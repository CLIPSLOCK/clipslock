// Photo search reuses catalog cards, filtering, pagination, sharing and favorites.
(() => {
    const button = document.getElementById('photoSearchBtn');
    const input = document.getElementById('photoSearchInput');
    const panel = document.getElementById('photoSearchPanel');
    const preview = document.getElementById('photoSearchPreview');
    const status = document.getElementById('photoSearchStatus');
    const sort = document.getElementById('sortOrder');
    let worker = null;
    let requestId = 0;
    let previewUrl = null;
    let matches = null;
    let running = false;
    let applyingResult = false;
    function setBusy(value) {
        running = value;
        button.disabled = value;
        panel.setAttribute('aria-busy', String(value));
    }
    function clearPhoto(refresh = true) {
        requestId++;
        matches = null;
        setBusy(false);
        panel.hidden = true;
        input.value = '';
        preview.removeAttribute('src');
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        previewUrl = null;
        const option = sort.querySelector('option[value="photo"]');
        if (sort.value === 'photo') sort.value = 'default';
        option?.remove();
        sort.dispatchEvent(new Event('change', {bubbles: true}));
        if (refresh) filterProducts();
    }
    function ensureWorker() {
        if (worker) return worker;
        worker = new Worker(new URL('photo-search-worker.js', document.baseURI), {type: 'module'});
        worker.addEventListener('message', event => {
            const data = event.data;
            if (data.id !== requestId) return;
            if (data.type === 'progress') { status.textContent = data.message; return; }
            setBusy(false);
            if (data.type === 'error') {
                status.textContent = 'Не вдалося виконати пошук. Перевірте інтернет і спробуйте ще раз.';
                console.warn('Photo search:', data.message);
                return;
            }
            if (data.type !== 'results') return;
            const current = new Map(products.map(product => [String(product.id), product.img]));
            const valid = data.matches.filter(item => current.get(String(item.id)) === item.img).slice(0, 24);
            // Start from the full catalog, including when favorites or other filters were active.
            applyingResult = true;
            document.querySelector('.logo').click();
            applyingResult = false;
            panel.hidden = false;
            matches = valid;
            const option = new Option('Схожі за фото', 'photo');
            sort.add(option);
            sort.value = 'photo';
            sort.dispatchEvent(new Event('change', {bubbles: true}));
            status.textContent = valid.length
                ? 'Схожі за фото. Перевірте форму та розміри перед замовленням.'
                : 'Немає доступних фото для порівняння. Спробуйте пошук за OEM.';
            filterProducts();
            // Reveal matches directly below the sticky header instead of the page hero.
            requestAnimationFrame(() => {
                const target = document.querySelector('#productsGrid .product-card') || document.getElementById('productsGrid');
                if (!target) return;
                const header = document.querySelector('.header');
                const offset = header ? header.getBoundingClientRect().height : 0;
                const top = Math.max(0, window.scrollY + target.getBoundingClientRect().top - offset - 12);
                window.scrollTo({
                    top,
                    behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
                });
            });
        });
        worker.addEventListener('error', () => {
            setBusy(false);
            status.textContent = 'Пошук за фото зараз недоступний у цьому браузері. Спробуйте оновити сторінку.';
            worker?.terminate();
            worker = null;
        });
        return worker;
    }
    function toPixels(image) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 224;
        const context = canvas.getContext('2d', {willReadFrequently: true});
        context.fillStyle = '#fff';
        context.fillRect(0, 0, 224, 224);
        const ratio = 208 / Math.max(image.naturalWidth, image.naturalHeight);
        const width = Math.max(1, Math.round(image.naturalWidth * ratio));
        const height = Math.max(1, Math.round(image.naturalHeight * ratio));
        context.drawImage(image, Math.floor((224 - width) / 2), Math.floor((224 - height) / 2), width, height);
        const rgba = context.getImageData(0, 0, 224, 224).data;
        const pixels = new Float32Array(3 * 224 * 224);
        const mean = [.485, .456, .406], deviation = [.229, .224, .225];
        for (let i = 0; i < 224 * 224; i++) {
            for (let channel = 0; channel < 3; channel++) pixels[channel * 224 * 224 + i] = (rgba[i * 4 + channel] / 255 - mean[channel]) / deviation[channel];
        }
        return pixels;
    }
    button.addEventListener('click', () => { if (!running) input.click(); });
    input.addEventListener('change', async () => {
        const file = input.files?.[0];
        if (!file) return;
        clearPhoto(false);
        panel.hidden = false;
        if (!file.type.startsWith('image/')) { status.textContent = 'Оберіть фотографію у форматі JPG, PNG або WebP.'; return; }
        if (file.size > 10 * 1024 * 1024) { status.textContent = 'Фото завелике. Оберіть зображення до 10 МБ.'; return; }
        const id = ++requestId;
        previewUrl = URL.createObjectURL(file);
        preview.src = previewUrl;
        status.textContent = 'Готуємо пошук. Перший запуск може тривати довше…';
        setBusy(true);
        try {
            await preview.decode();
            if (id !== requestId) return;
            if (!products.length) throw new Error('Catalog not loaded');
            const pixels = toPixels(preview);
            ensureWorker().postMessage({id, pixels}, [pixels.buffer]);
        } catch (error) {
            if (id !== requestId) return;
            setBusy(false);
            status.textContent = 'Не вдалося прочитати фото. Спробуйте JPG, PNG або WebP.';
        }
    });
    document.getElementById('clearPhotoSearch').addEventListener('click', () => clearPhoto());
    document.querySelector('.logo').addEventListener('click', () => {
        if (!applyingResult) clearPhoto(false);
    });
    document.getElementById('resetFiltersBtn').addEventListener('click', () => clearPhoto());
    const originalRender = renderProducts;
    renderProducts = function(items, page = 1) {
        if (matches && sort.value !== 'photo') {
            matches = null;
            panel.hidden = true;
            sort.querySelector('option[value="photo"]')?.remove();
        }
        if (matches) {
            const allowed = new Map(items.map(product => [String(product.id), product]));
            items = matches.map(item => allowed.get(String(item.id))).filter(Boolean);
        }
        originalRender(items, page);
    };
})();
