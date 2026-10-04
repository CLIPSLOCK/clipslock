(() => {
let specificationsPromise;
let specificationsRequest = 0;
async function renderProductSpecifications(product) {
    const request = ++specificationsRequest;
    let section = document.getElementById('modalSpecifications');
    if (!section) {
        section = document.createElement('section');
        section.id = 'modalSpecifications';
        section.style.cssText = 'margin:12px 0 0;padding:12px;border:1px solid #ddd;border-radius:10px;font-size:13px';
        const image = document.getElementById('modalImg');
        const imageWrap = image.parentElement;
        const visual = document.createElement('div');
        visual.style.cssText = 'min-width:0;align-self:start';
        imageWrap.replaceWith(visual);
        visual.append(imageWrap, section);
        imageWrap.style.cssText = 'height:auto;min-height:0;display:flex;align-items:center;justify-content:center;padding:16px';
        image.style.cssText = 'width:100%;height:260px;max-height:35vh;object-fit:contain';
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
        heading.textContent = 'Розміри, мм';
        heading.style.cssText = 'font-size:14px;margin:0 0 8px';
        section.append(heading);
        const dimensions = document.createElement('div');
        dimensions.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fit,minmax(85px,1fr));gap:6px';
        for (const [label,value] of Object.entries(specs.dimensions || {})) {
            const item = document.createElement('div');
            item.style.cssText = 'background:var(--bg-secondary,#f5f5f5);border-radius:6px;padding:7px';
            const name = document.createElement('strong');
            name.textContent = label + ': ';
            item.append(name, document.createTextNode(label === 'M' ? 'M' + value : value));
            dimensions.append(item);
        }
        section.append(dimensions);
        const short = ['Колір','Матеріал'].map(key => specs.attributes?.[key]).filter(Boolean);
        if (short.length) {
            const text = document.createElement('p');
            text.textContent = short.join(' · ');
            text.style.cssText = 'margin:8px 0 0;color:var(--text-muted,#666)';
            section.append(text);
        }
        const details = document.createElement('details');
        details.style.cssText = 'margin-top:10px';
        const summary = document.createElement('summary');
        summary.textContent = 'Схема та всі характеристики';
        summary.style.cssText = 'cursor:pointer;min-height:32px;padding:4px 0';
        details.append(summary);
        for (const [label,value] of Object.entries(specs.attributes || {})) {
            const line = document.createElement('p');
            line.textContent = label + ': ' + value;
            line.style.cssText = 'margin:5px 0';
            details.append(line);
        }
        if (specs.scheme && specs.scheme.startsWith('https://mak.parts/images/shema/')) {
            const image = document.createElement('img');
            image.src = specs.scheme; image.alt = 'Схема позначень розмірів кліпси';
            image.loading = 'lazy';
            image.style.cssText = 'display:block;width:100%;max-width:220px;height:auto;margin:8px auto';
            image.onerror = () => image.remove();
            details.append(image);
        }
        const link = document.createElement('a');
        link.textContent = 'Джерело та позначення: MAK';
        link.href = specs.source; link.target = '_blank'; link.rel = 'noopener noreferrer';
        details.append(link);
        section.append(details);
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
