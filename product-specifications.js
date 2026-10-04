(() => {
let specificationsPromise;
let specificationsRequest = 0;
async function renderProductSpecifications(product) {
    const request = ++specificationsRequest;
    let section = document.getElementById('modalSpecifications');
    if (!section) {
        section = document.createElement('section');
        section.id = 'modalSpecifications';
        section.style.cssText = 'margin:18px 0;padding:14px;border:1px solid #ddd;border-radius:10px';
        document.getElementById('modalDesc').insertAdjacentElement('afterend', section);
    }
    section.hidden = true;
    section.replaceChildren();
    try {
        if (!specificationsPromise) specificationsPromise = fetch('product-specifications.json')
            .then(response => { if (!response.ok) throw new Error('Specifications unavailable'); return response.json(); })
            .catch(error => { specificationsPromise = null; throw error; });
        const all = await specificationsPromise;
        if (request !== specificationsRequest) return;
        const specs = all[String(product.oem)];
        if (!specs) return;
        const heading = document.createElement('h3');
        heading.textContent = 'Характеристики та розміри';
        section.append(heading);
        const table = document.createElement('table');
        table.style.cssText = 'width:100%;border-collapse:collapse';
        for (const [label,value] of Object.entries(specs.attributes || {})) addRow(label,value);
        for (const [label,value] of Object.entries(specs.dimensions || {})) addRow(label,label === 'M' ? 'M' + value : value + ' мм');
        function addRow(label,value) {
            const row = table.insertRow();
            const name = document.createElement('th');
            name.scope = 'row'; name.textContent = label;
            name.style.cssText = 'text-align:left;padding:6px;border-bottom:1px solid #eee';
            const cell = row.insertCell(); cell.textContent = value;
            cell.style.cssText = 'padding:6px;border-bottom:1px solid #eee';
            row.prepend(name);
        }
        section.append(table);
        if (specs.scheme && specs.scheme.startsWith('https://mak.parts/images/shema/')) {
            const image = document.createElement('img');
            image.src = specs.scheme; image.alt = 'Схема позначень розмірів кліпси';
            image.loading = 'lazy'; image.style.cssText = 'display:block;width:100%;max-width:320px;height:auto;margin:12px auto';
            image.onerror = () => image.remove();
            section.append(image);
        }
        const note = document.createElement('p');
        note.textContent = 'Позначення розмірів відповідають схемі MAK.';
        note.style.cssText = 'font-size:13px;margin:10px 0';
        section.append(note);
        const link = document.createElement('a');
        link.textContent = 'Характеристики на MAK';
        link.href = specs.source; link.target = '_blank'; link.rel = 'noopener noreferrer';
        section.append(link);
        section.hidden = false;
    } catch (error) { console.warn('Product specifications:', error); }
}

const originalOpen = window.openProductModal;
window.openProductModal = function(id) {
    const result = originalOpen.apply(this, arguments);
    const product = products.find(item => String(item.id) === String(id));
    if (product) renderProductSpecifications(product);
    return result;
};
})();
