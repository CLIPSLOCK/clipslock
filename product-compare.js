(() => {
    const key = 'clipslock_compare';
    let ids = [];
    try { const value = JSON.parse(localStorage.getItem(key) || '[]'); if (Array.isArray(value)) ids = [...new Set(value.map(String))].slice(0, 3); } catch {}
    let currentId = null;
    let returnFocus = null;
    let differencesOnly = false;
    const icon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M8 4v16M16 4v16M5 7h6M13 17h6M5 20h6M13 4h6"/></svg>';
    const header = document.createElement('button');
    header.type = 'button'; header.className = 'cart-btn compare-header'; header.id = 'compareBtn';
    document.querySelector('.header-actions').prepend(header);
    const modalButton = document.createElement('button');
    modalButton.type = 'button'; modalButton.className = 'product-share-btn'; modalButton.id = 'modalCompareBtn';
    document.querySelector('.product-share').prepend(modalButton);
    const dialog = document.createElement('dialog');
    dialog.className = 'compare-dialog'; dialog.id = 'compareDialog';
    dialog.innerHTML = '<div class="compare-heading"><h2 id="compareTitle">Порівняння товарів</h2><button type="button" class="compare-close" aria-label="Закрити порівняння">×</button></div><p class="compare-note">Виберіть до трьох товарів. На телефоні таблицю можна гортати вбік.</p><label class="compare-differences"><input id="compareDifferences" type="checkbox" role="switch"> Лише відмінності</label><p class="compare-differences-status" role="status" hidden></p><div class="compare-scroll" tabindex="0" aria-label="Таблиця порівняння"></div><button type="button" class="product-share-btn compare-clear">Очистити порівняння</button>';
    dialog.setAttribute('aria-labelledby', 'compareTitle'); document.body.append(dialog);
    const notice = document.createElement('div'); notice.className = 'compare-notice'; notice.setAttribute('role', 'status'); document.body.append(notice);
    let noticeTimer;
    function announce(message) { notice.textContent = message; notice.classList.add('visible'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => notice.classList.remove('visible'), 2600); }
    function selected() { return products.filter(p => ids.includes(String(p.id))).sort((a,b) => ids.indexOf(String(a.id)) - ids.indexOf(String(b.id))); }
    function persist() { try { localStorage.setItem(key, JSON.stringify(ids)); } catch {} }
    function sync() {
        if (products.length) ids = ids.filter(id => products.some(p => String(p.id) === id));
        header.innerHTML = icon + '<span class="header-action-label">Порівняти</span><span class="badge">' + ids.length + '</span>';
        document.querySelectorAll('[data-compare-id]').forEach(button => {
            const saved = ids.includes(button.dataset.compareId);
            button.setAttribute('aria-pressed', String(saved));
            button.innerHTML = icon + '<span>' + (saved ? 'У порівнянні' : 'Порівняти') + '</span>';
        });
        modalButton.dataset.compareId = currentId || '';
        modalButton.setAttribute('aria-pressed', String(ids.includes(currentId)));
        modalButton.innerHTML = icon + '<span>' + (ids.includes(currentId) ? 'У порівнянні' : 'Порівняти') + '</span>';
        if (dialog.open) draw();
    }
    function toggle(id) {
        id = String(id);
        if (ids.includes(id)) ids = ids.filter(value => value !== id);
        else { if (ids.length >= 3) { announce('У порівнянні вже три товари. Приберіть один, щоб додати інший.'); return; } ids.push(id); }
        persist(); sync();
    }
    function cell(row, text, tag = 'td') { const el = document.createElement(tag); el.textContent = text; row.append(el); return el; }
    function draw() {
        const wrap = dialog.querySelector('.compare-scroll'); wrap.replaceChildren();
        const list = selected();
        const control = dialog.querySelector('#compareDifferences');
        control.disabled = list.length < 2;
        control.checked = differencesOnly;
        const differenceStatus = dialog.querySelector('.compare-differences-status');
        differenceStatus.hidden = !differencesOnly;
        differenceStatus.textContent = list.length < 2 ? 'Додайте ще один товар, щоб побачити відмінності.' : '';
        dialog.querySelector('.compare-clear').hidden = !list.length;
        if (!list.length) { const p = document.createElement('p'); p.className = 'compare-empty'; p.textContent = 'Натисніть «Порівняти» на потрібних товарах у каталозі.'; wrap.append(p); return; }
        const table = document.createElement('table'); table.className = 'compare-table';
        const caption = document.createElement('caption'); caption.textContent = 'Фото та характеристики вибраних товарів'; table.append(caption);
        const head = document.createElement('thead'); const row = document.createElement('tr'); cell(row, 'Товар', 'th').scope = 'col';
        list.forEach(product => {
            const th = cell(row, '', 'th'); th.scope = 'col';
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'compare-remove'; remove.textContent = 'Прибрати'; remove.setAttribute('aria-label', 'Прибрати з порівняння ' + product.oem); remove.onclick = () => { toggle(product.id); dialog.querySelector('.compare-close').focus(); };
            const image = document.createElement('img'); image.src = product.img; image.alt = product.name;
            const name = document.createElement('button'); name.type = 'button'; name.className = 'compare-product-link'; name.textContent = product.name; name.onclick = () => { dialog.close(); window.openProductModal(product.id); };
            th.append(remove, image, name);
        }); head.append(row); table.append(head);
        const body = document.createElement('tbody');
        const fields = [['OEM', p => p.oem], ['Ціна', p => p.price + ' грн / шт'], ['Марка', p => p.brand], ['Категорія', p => p.category], ['Сумісність', p => Array.isArray(p.compatibility) ? p.compatibility.join(', ') : p.compatibility], ['Опис', p => p.description]];
        let hiddenRows = 0;
        fields.forEach(([label, value]) => { const values = list.map(p => String(value(p) || 'Не вказано').trim().replace(/\s+/g, ' ')); if (differencesOnly && list.length >= 2 && values.every(value => value === values[0])) { hiddenRows++; return; } const tr = document.createElement('tr'); cell(tr, label, 'th').scope = 'row'; list.forEach(p => { const td = cell(tr, value(p) || 'Не вказано'); if (label === 'OEM') { td.replaceChildren(copyButton(String(p.oem))); } }); body.append(tr); });
        table.append(body); wrap.append(table);
        if (differencesOnly && list.length >= 2) differenceStatus.textContent = hiddenRows ? 'Приховано однакових характеристик: ' + hiddenRows : 'Усі характеристики відрізняються.';
    }
    dialog.querySelector('#compareDifferences').addEventListener('change', event => { differencesOnly = event.target.checked; draw(); });
    header.onclick = () => { returnFocus = document.activeElement; draw(); dialog.showModal(); dialog.querySelector('.compare-close').focus(); };
    dialog.querySelector('.compare-close').onclick = () => dialog.close();
    dialog.querySelector('.compare-clear').onclick = () => { ids = []; persist(); sync(); dialog.querySelector('.compare-close').focus(); };
    dialog.addEventListener('close', () => returnFocus?.focus());
    dialog.addEventListener('click', event => { if (event.target === dialog) { const r = dialog.getBoundingClientRect(); if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close(); } });
    modalButton.onclick = event => { event.stopPropagation(); if (currentId) toggle(currentId); };
    function decorate() {
        document.querySelectorAll('#productsGrid .product-card').forEach(card => {
            const id = card.querySelector('.card-qty-control')?.dataset.id;
            if (!id || card.querySelector('.card-compare')) return;
            const button = document.createElement('button'); button.type = 'button'; button.className = 'product-share-btn card-compare'; button.dataset.compareId = id;
            button.onclick = event => { event.stopPropagation(); toggle(id); }; card.append(button);
            const badge = card.querySelector('.pc-oem');
            if (badge) { const p = products.find(p => String(p.id) === String(id)); if (p) badge.replaceWith(copyButton(String(p.oem))); }
        }); sync();
    }
    const originalRender = renderProducts;
    renderProducts = function(...args) { const result = originalRender(...args); decorate(); return result; };
    const originalOpen = window.openProductModal;
    window.openProductModal = function(id) { currentId = String(id); const result = originalOpen(id); sync(); return result; };
    async function copy(text) {
        try { if (!navigator.clipboard?.writeText) throw new Error(); await navigator.clipboard.writeText(text); }
        catch { const field = document.createElement('textarea'); field.value = text; field.style.cssText = 'position:fixed;opacity:0;pointer-events:none'; const parent = dialog.open ? dialog : document.body; const focused = document.activeElement; parent.append(field); field.select(); const ok = document.execCommand('copy'); field.remove(); focused?.focus(); if (!ok) throw new Error(); }
    }
    function copyButton(oem) {
        const button = document.createElement('button'); button.type = 'button'; button.className = 'oem-copy'; button.textContent = oem; button.title = 'Скопіювати OEM-код'; button.setAttribute('aria-label', 'Скопіювати OEM-код ' + oem);
        const status = document.createElement('span'); status.className = 'oem-copy-status'; status.setAttribute('role', 'status'); button.append(status);
        let timer;
        button.onclick = async event => { event.stopPropagation(); try { await copy(oem); status.textContent = 'Скопійовано'; } catch { status.textContent = 'Не вдалося'; } clearTimeout(timer); timer = setTimeout(() => { status.textContent = ''; }, 2200); };
        return button;
    }
    const modalOem = document.getElementById('modalOem');
    const modalCopy = document.createElement('button'); modalCopy.type = 'button'; modalCopy.className = 'oem-copy modal-oem-copy'; modalCopy.textContent = 'Копіювати'; modalCopy.setAttribute('aria-label', 'Скопіювати OEM-код товару');
    const modalStatus = document.createElement('span'); modalStatus.setAttribute('role', 'status'); modalStatus.className = 'oem-copy-status'; modalCopy.append(modalStatus); modalOem.parentElement.append(modalCopy);
    let modalTimer;
    modalCopy.onclick = async () => { const code = modalOem.textContent.trim(); try { await copy(code); modalStatus.textContent = 'Скопійовано'; } catch { modalStatus.textContent = 'Не вдалося'; } clearTimeout(modalTimer); modalTimer = setTimeout(() => modalStatus.textContent = '', 2200); };
    new MutationObserver(() => { modalStatus.textContent = ''; clearTimeout(modalTimer); }).observe(modalOem, {childList:true, characterData:true, subtree:true});
    window.addEventListener('storage', event => { if (event.key !== key) return; try { const value = JSON.parse(event.newValue || '[]'); ids = Array.isArray(value) ? [...new Set(value.map(String))].slice(0,3) : []; } catch { ids = []; } sync(); });
    decorate();
})();
