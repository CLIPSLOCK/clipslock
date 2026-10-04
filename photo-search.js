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
    function chooseCrop(image) {
        return new Promise(resolve => {
            const dialog = document.createElement('dialog');
            dialog.style.cssText = 'width:min(420px,90vw);max-height:90vh;overflow:auto;border:0;border-radius:16px;padding:20px;background:white;color:#222';
            dialog.innerHTML = '<h2 style="margin-top:0">Виділіть кліпсу</h2><p>Тягніть кути рамки, щоб обрізати фон. Тягніть усередині рамки, щоб пересунути її.</p><canvas style="display:block;width:100%;height:auto;touch-action:none;background:#eee" width="320" height="320"></canvas><div class="crop-controls"></div><div style="display:flex;gap:10px;margin-top:16px"><button type="button" data-search>Шукати</button><button type="button" data-cancel>Скасувати</button></div>';
            const bounds = {left:5, right:95, top:5, bottom:95};
            const canvas = dialog.querySelector('canvas');
            const ctx = canvas.getContext('2d');
            const scale = 320 / Math.max(image.naturalWidth, image.naturalHeight);
            const width = image.naturalWidth * scale, height = image.naturalHeight * scale;
            const x = (320-width)/2, y = (320-height)/2;
            function draw() {
                ctx.clearRect(0,0,320,320);
                ctx.drawImage(image,x,y,width,height);
                const l=x+width*bounds.left/100, t=y+height*bounds.top/100;
                const w=width*(bounds.right-bounds.left)/100, h=height*(bounds.bottom-bounds.top)/100;
                ctx.fillStyle='rgba(0,0,0,.55)';
                ctx.fillRect(x,y,width,t-y);
                ctx.fillRect(x,t+h,width,y+height-t-h);
                ctx.fillRect(x,t,l-x,h);
                ctx.fillRect(l+w,t,x+width-l-w,h);
                ctx.strokeStyle='#ff6500';ctx.lineWidth=2;ctx.strokeRect(l,t,w,h);
                ctx.fillStyle='#ff6500';
                for (const [hx,hy] of [[l,t],[l+w,t],[l,t+h],[l+w,t+h]]) {
                    ctx.fillRect(hx-7,hy-7,14,14);
                }
            }
            let drag=null;
            const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
            function point(event) {
                const rect=canvas.getBoundingClientRect();
                return {
                    x:(event.clientX-rect.left)*320/rect.width,
                    y:(event.clientY-rect.top)*320/rect.height
                };
            }
            canvas.addEventListener('pointerdown',event=>{
                if(drag)return;
                const p=point(event);
                const l=x+width*bounds.left/100, r=x+width*bounds.right/100;
                const t=y+height*bounds.top/100, b=y+height*bounds.bottom/100;
                // Hit targets are at least 28 CSS pixels from each corner.
                const hit=28*320/canvas.getBoundingClientRect().width;
                const corners=[['lt',l,t],['rt',r,t],['lb',l,b],['rb',r,b]];
                const corner=corners.find(([,cx,cy])=>Math.abs(p.x-cx)<=hit&&Math.abs(p.y-cy)<=hit);
                const mode=corner?corner[0]:(p.x>=l&&p.x<=r&&p.y>=t&&p.y<=b?'move':null);
                if(!mode)return;
                event.preventDefault();
                drag={id:event.pointerId,mode,start:p,bounds:{...bounds}};
                canvas.setPointerCapture(event.pointerId);
            });
            canvas.addEventListener('pointermove',event=>{
                if(!drag||drag.id!==event.pointerId)return;
                event.preventDefault();
                const p=point(event), original=drag.bounds;
                const dx=(p.x-drag.start.x)/width*100, dy=(p.y-drag.start.y)/height*100;
                if(drag.mode==='move') {
                    const mx=clamp(dx,-original.left,100-original.right);
                    const my=clamp(dy,-original.top,100-original.bottom);
                    bounds.left=original.left+mx;bounds.right=original.right+mx;
                    bounds.top=original.top+my;bounds.bottom=original.bottom+my;
                } else {
                    if(drag.mode.includes('l'))bounds.left=clamp(original.left+dx,0,original.right-5);
                    if(drag.mode.includes('r'))bounds.right=clamp(original.right+dx,original.left+5,100);
                    if(drag.mode.includes('t'))bounds.top=clamp(original.top+dy,0,original.bottom-5);
                    if(drag.mode.includes('b'))bounds.bottom=clamp(original.bottom+dy,original.top+5,100);
                }
                draw();
            });
            function stopDrag(event) {
                if(drag?.id===event.pointerId)drag=null;
            }
            canvas.addEventListener('pointerup',stopDrag);
            canvas.addEventListener('pointercancel',stopDrag);
            canvas.addEventListener('lostpointercapture',stopDrag);
            const controls=dialog.querySelector('.crop-controls');
            const reset=document.createElement('button');
            reset.type='button';reset.textContent='Усе фото';
            reset.onclick=()=>{Object.assign(bounds,{left:0,right:100,top:0,bottom:100});draw();};
            controls.append(reset);
            dialog.querySelectorAll('button').forEach(button=>{
                button.style.cssText='min-height:44px;padding:10px 16px;border:1px solid #ddd;border-radius:8px;background:#f4f4f4;color:#222;font-size:16px;cursor:pointer';
            });
            let finished=false;
            function finish(result) {
                if(finished)return;finished=true;dialog.close();dialog.remove();resolve(result);
            }
            dialog.querySelector('[data-cancel]').onclick=()=>finish(null);
            dialog.addEventListener('cancel',event=>{event.preventDefault();finish(null);});
            dialog.querySelector('[data-search]').onclick=()=>finish({
                x:image.naturalWidth*bounds.left/100,
                y:image.naturalHeight*bounds.top/100,
                width:image.naturalWidth*(bounds.right-bounds.left)/100,
                height:image.naturalHeight*(bounds.bottom-bounds.top)/100
            });
            document.body.append(dialog);draw();dialog.showModal();
        });
    }
    function toPixels(image, crop, angle = 0) {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 224;
        const context = canvas.getContext('2d', {willReadFrequently: true});
        context.fillStyle = '#fff';
        context.fillRect(0, 0, 224, 224);
        const ratio = 208 / Math.max(crop.width, crop.height);
        const width = Math.max(1, Math.round(crop.width * ratio));
        const height = Math.max(1, Math.round(crop.height * ratio));
        context.translate(112,112);
        context.rotate(angle);
        context.drawImage(image, crop.x, crop.y, crop.width, crop.height, -width/2, -height/2, width, height);
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
            const crop = await chooseCrop(preview);
            if (id !== requestId) return;
            if (!crop) { clearPhoto(); return; }
            status.textContent = 'Порівнюємо форму кліпси в кількох поворотах…';
            const variants = [0, Math.PI/2, Math.PI, 3*Math.PI/2].map(angle => toPixels(preview, crop, angle));
            ensureWorker().postMessage({id, variants}, variants.map(pixels => pixels.buffer));
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
