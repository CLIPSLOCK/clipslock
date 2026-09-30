(() => {
  const endpoint = 'https://clipslock-nova-poshta.thekilfox.workers.dev/';
  const city = document.getElementById('orderCity');
  const branch = document.getElementById('orderBranch');
  if (!city || !branch) return;
  let selectedCity = null, selectedBranch = null;
  const cache = new Map();
  const status = document.createElement('p');
  status.className = 'np-status';
  status.setAttribute('role', 'status');
  branch.parentElement.append(status);
  const manual = document.createElement('button');
  manual.type = 'button';
  manual.className = 'np-manual';
  manual.textContent = 'Ввести адресу вручну';
  branch.parentElement.append(manual);
  let manualMode = false;
  async function request(params, signal) {
    const url = new URL(endpoint);
    Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
    const key = url.href;
    if (cache.has(key)) return cache.get(key);
    const response = await fetch(url, { signal, credentials: 'omit' });
    if (!response.ok) throw new Error('Delivery unavailable');
    const data = await response.json();
    if (!Array.isArray(data.items)) throw new Error('Invalid delivery response');
    cache.set(key, data);
    if (cache.size > 80) cache.delete(cache.keys().next().value);
    return data;
  }
  function autocomplete(input, load, select) {
    const wrap = document.createElement('div');
    wrap.className = 'np-autocomplete';
    input.before(wrap);
    wrap.append(input);
    const list = document.createElement('div');
    list.className = 'np-options';
    list.id = input.id + 'Options';
    list.setAttribute('role', 'listbox');
    list.hidden = true;
    wrap.append(list);
    input.autocomplete = 'off';
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-controls', list.id);
    input.setAttribute('aria-expanded', 'false');
    let timer, controller, serial = 0, active = -1, items = [];
    const close = () => {
      list.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
      active = -1;
    };
    const cancel = () => { clearTimeout(timer); controller?.abort(); serial++; close(); };
    const choose = item => {
      input.focus(); cancel(); input.value = item.label; input.setCustomValidity('');
      select(item);
    };
    const search = async () => {
      clearTimeout(timer); controller?.abort();
      const token = ++serial;
      controller = new AbortController();
      close();
      if (manualMode) return;
      input.setAttribute('aria-busy', 'true');
      try {
        const data = await load(input.value.trim(), controller.signal);
        if (token !== serial || manualMode) return;
        items = data.items;
        list.replaceChildren();
        for (const [i, item] of items.entries()) {
          const option = document.createElement('div');
          option.id = list.id + '-' + i;
          option.className = 'np-option';
          option.setAttribute('role', 'option');
          option.setAttribute('aria-selected', 'false');
          option.textContent = item.label;
          option.addEventListener('mousedown', event => event.preventDefault());
          option.addEventListener('click', () => choose(item));
          list.append(option);
        }
        if (items.length) {
          list.hidden = false; input.setAttribute('aria-expanded', 'true');
          status.textContent = data.hasMore ? 'Є ще результати — введіть номер або частину адреси.' : '';
        } else if (input.value.trim().length >= 2 || input === branch) {
          status.textContent = 'Нічого не знайдено. Уточніть пошук або введіть адресу вручну.';
        }
      } catch (error) {
        if (token === serial && error.name !== 'AbortError') status.textContent = 'Не вдалося завантажити підказки. Спробуйте ще раз або введіть адресу вручну.';
      } finally {
        if (token === serial) input.removeAttribute('aria-busy');
      }
    };
    input.addEventListener('input', () => { cancel(); timer = setTimeout(search, 300); });
    input.addEventListener('focus', search);
    input.addEventListener('blur', () => { clearTimeout(timer); controller?.abort(); serial++; input.removeAttribute('aria-busy'); });
    document.addEventListener('click', event => { if (!wrap.contains(event.target)) cancel(); });
    input.addEventListener('keydown', event => {
      if (event.key === 'Tab') cancel();
      if (event.key === 'Escape') { event.stopPropagation(); cancel(); }
      if (list.hidden) return;
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        active = (active + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length;
        Array.from(list.children).forEach((option, i) => option.setAttribute('aria-selected', String(i === active)));
        input.setAttribute('aria-activedescendant', list.children[active].id);
        list.children[active].scrollIntoView({ block: 'nearest' });
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (active >= 0) choose(items[active]);
      }
    });
    return { cancel, search };
  }
  city.placeholder = 'Почніть вводити місто або селище';
  city.maxLength = 80;
  branch.placeholder = 'Спершу виберіть населений пункт';
  branch.disabled = true;
  const branchPicker = autocomplete(branch, async (q, signal) => {
    if (!selectedCity) return { items: [] };
    const data = await request({ action: 'warehouses', city: selectedCity.ref, q }, signal);
    const needle = q.toLocaleLowerCase('uk');
    return { ...data, items: data.items.filter(item => !needle || item.label.toLocaleLowerCase('uk').includes(needle))
      .sort((a, b) => Number(b.number === q) - Number(a.number === q)) };
  }, item => { selectedBranch = item; status.textContent = ''; });
  branch.addEventListener('input', () => { selectedBranch = null; branch.setCustomValidity(''); });
  const cityPicker = autocomplete(city, (q, signal) => q.length >= 2
    ? request({ action: 'cities', q }, signal)
    : Promise.resolve({ items: [] }), item => {
      selectedCity = item;
      selectedBranch = null; branch.value = ''; branch.disabled = false;
      branch.placeholder = 'Номер відділення або адреса поштомата';
      branch.setCustomValidity(''); status.textContent = '';
      setTimeout(() => { if (selectedCity === item && !manualMode) branch.focus(); }, 0);
  });
  city.addEventListener('input', () => {
    selectedCity = null; selectedBranch = null; branchPicker.cancel(); branch.value = '';
    branch.disabled = !manualMode;
    branch.placeholder = manualMode ? 'Відділення / поштомат та адреса' : 'Спершу виберіть населений пункт';
    branch.setCustomValidity(''); status.textContent = '';
  });
  manual.addEventListener('click', () => {
    manualMode = !manualMode;
    cityPicker.cancel(); branchPicker.cancel();
    manual.textContent = manualMode ? 'Повернутися до підказок Нової пошти' : 'Ввести адресу вручну';
    selectedCity = null; selectedBranch = null; branch.value = ''; branch.disabled = !manualMode;
    city.setCustomValidity(''); branch.setCustomValidity('');
    branch.placeholder = manualMode ? 'Відділення / поштомат та адреса' : 'Спершу виберіть населений пункт';
    status.textContent = manualMode ? 'Вкажіть населений пункт з областю та адресу відділення.' : '';
    city.focus();
  });
  document.getElementById('checkoutForm').addEventListener('submit', event => {
    if (!manualMode && !selectedCity) {
      event.preventDefault(); event.stopImmediatePropagation();
      city.setCustomValidity('Виберіть населений пункт із підказок або увімкніть ручне введення.');
      city.reportValidity();
    } else if (!manualMode && !selectedBranch) {
      event.preventDefault(); event.stopImmediatePropagation();
      branch.setCustomValidity('Виберіть відділення із підказок або увімкніть ручне введення.');
      branch.reportValidity();
    }
  }, true);
  city.addEventListener('input', () => city.setCustomValidity(''));
})();
