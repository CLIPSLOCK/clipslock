// Accessible custom selectors; native selects remain the source of filter values.
document.addEventListener('DOMContentLoaded', () => {
    let closeActive = () => {};
    for (const id of ['brandFilter', 'modelFilter', 'categoryFilter', 'sortOrder']) {
        const select = document.getElementById(id);
        if (!select) continue;
        const multi = id === 'brandFilter';
        if (multi) select.multiple = true;
        const label = document.querySelector('label[for="' + id + '"]');
        const wrapper = document.createElement('div');
        wrapper.className = 'modern-select';
        select.before(wrapper);
        wrapper.append(select);
        select.classList.add('modern-select-native');
        select.tabIndex = -1;
        select.setAttribute('aria-hidden', 'true');
        const trigger = document.createElement('button');
        trigger.type = 'button';
        trigger.className = 'modern-select-trigger';
        trigger.id = id + '-trigger';
        trigger.setAttribute('aria-haspopup', 'listbox');
        trigger.setAttribute('aria-expanded', 'false');
        trigger.setAttribute('aria-controls', id + '-list');
        const caption = document.createElement('span');
        trigger.append(caption);
        if (label) {
            label.htmlFor = trigger.id;
            label.id = id + '-label';
            trigger.setAttribute('aria-labelledby', label.id + ' ' + trigger.id);
        }
        const panel = document.createElement('div');
        panel.className = 'modern-select-panel';
        panel.hidden = true;
        const search = document.createElement('input');
        search.type = 'search';
        search.className = 'modern-select-search';
        search.placeholder = 'Пошук…';
        search.setAttribute('aria-label', 'Пошук: ' + (label?.textContent || id));
        if (id !== 'sortOrder') panel.append(search);
        const list = document.createElement('div');
        list.className = 'modern-select-list';
        list.id = id + '-list';
        list.setAttribute('role', 'listbox');
        list.setAttribute('aria-label', label?.textContent || 'Варіанти');
        if (multi) {
            list.setAttribute('aria-multiselectable','true');
            const hint = document.createElement('p');
            hint.className = 'modern-select-empty';
            hint.textContent = 'Можна вибрати кілька марок';
            panel.append(hint);
        }
        panel.append(list);
        wrapper.append(trigger, panel);
        function close() {
            panel.hidden = true;
            trigger.setAttribute('aria-expanded', 'false');
            wrapper.classList.remove('is-open');
        }
        function sync() {
            const chosen = [...select.selectedOptions].filter(option=>option.value);
            caption.textContent = multi ? (chosen.length ? chosen.slice(0,2).map(option=>option.textContent).join(' · ') + (chosen.length > 2 ? ' · +' + (chosen.length-2) : '') : 'Усі марки') : select.selectedOptions[0]?.textContent || '';
            trigger.disabled = select.disabled;
            if (select.disabled) close();
            if (!panel.hidden) draw();
        }
        function draw() {
            list.replaceChildren();
            const query = search.value.trim().toLocaleLowerCase('uk');
            const options = [...select.options].filter(o => !o.hidden && o.textContent.toLocaleLowerCase('uk').includes(query));
            for (const option of options) {
                const item = document.createElement('button');
                item.type = 'button';
                item.className = 'modern-select-option';
                item.textContent = option.textContent;
                if (multi && option.value) item.classList.add('modern-select-multi-option');
                item.setAttribute('role', 'option');
                item.setAttribute('aria-selected', String(multi ? (option.value ? option.selected : ![...select.selectedOptions].some(o=>o.value)) : option.value === select.value));
                item.disabled = option.disabled;
                item.addEventListener('click', () => {
                    if (multi && option.value) {
                        const checked = !option.selected;
                        select.options[0].selected = false;
                        option.selected = checked;
                        if (![...select.selectedOptions].some(o=>o.value)) select.options[0].selected = true;
                    } else {
                        select.value = option.value;
                        close();
                    }
                    select.dispatchEvent(new Event('change', {bubbles: true}));
                    sync();
                    if (multi && option.value) {
                        const match = [...list.querySelectorAll('button')].find(button=>button.textContent === option.textContent);
                        match?.focus();
                    } else trigger.focus();
                });
                list.append(item);
            }
            if (!options.length) {
                const empty = document.createElement('p');
                empty.className = 'modern-select-empty';
                empty.textContent = 'Нічого не знайдено';
                empty.setAttribute('role', 'status');
                list.append(empty);
            }
        }
        function open() {
            closeActive();
            closeActive = close;
            search.value = '';
            panel.hidden = false;
            wrapper.classList.add('is-open');
            trigger.setAttribute('aria-expanded', 'true');
            draw();
            if (id !== 'sortOrder') search.focus();
            else list.querySelector('[aria-selected="true"]')?.focus();
        }
        trigger.addEventListener('click', () => panel.hidden ? open() : close());
        trigger.addEventListener('keydown', event => {
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                open();
                list.querySelector('button:not(:disabled)')?.focus();
            }
        });
        search.addEventListener('input', draw);
        wrapper.addEventListener('keydown', event => {
            if (panel.hidden) return;
            if (event.key === 'Escape') { event.preventDefault(); close(); trigger.focus(); }
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                event.preventDefault();
                const items = [...list.querySelectorAll('button:not(:disabled)')];
                const current = items.indexOf(document.activeElement);
                const next = current < 0 ? 0 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
                items[next]?.focus();
            }
            if (event.key === 'Tab') close();
        });
        document.addEventListener('click', event => { if (!event.composedPath().includes(wrapper)) close(); });
        select.addEventListener('change', sync);
        new MutationObserver(sync).observe(select, {childList: true, subtree: true, attributes: true});
        document.getElementById('resetFiltersBtn').addEventListener('click', () => { close(); sync(); });
        sync();
    }
});
