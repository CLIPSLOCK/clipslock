// Only explicit catalog compatibility is indexed; universal fitment is opt-in.
(function(root) {
    const normalize = value => String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();
    const canonical = value => {
        const text = String(value || '').trim();
        if (/^(vw|volkswagen)$/i.test(text)) return 'VW';
        if (/^(skoda|škoda)$/i.test(text)) return 'Skoda';
        if (/^saab$/i.test(text)) return 'Saab';
        return text;
    };
    function build(items) {
        const aliases = [...new Set(items.map(p => p.brand).concat(
            ['Volkswagen','Škoda','SAAB','Saab','Dacia','Scion','SsangYong','VAZ-LADA','Smart','Daihatsu','Isuzu','Rover']
        ))].filter(b => b && b !== 'Універсальний').sort((a,b) => b.length-a.length);
        const escape = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp('(^|[\\s,;/:])(' + aliases.map(escape).join('|') + ')(?=$|[\\s,;/:—–])', 'gi');
        const fitments = new Map(), models = new Map(), brands = new Set();
        for (const product of items) {
            const primary = canonical(product.brand);
            const carBrands = new Set(primary && primary !== 'Універсальний' ? [primary] : []);
            const pairs = [];
            for (const entry of product.compatibility || []) {
                const text = String(entry).trim(), matches = [...text.matchAll(pattern)];
                const sections = matches.length ? matches.map((match,i) => ({
                    brand: canonical(match[2]),
                    text: text.slice(match.index + match[0].length, matches[i+1]?.index ?? text.length)
                })) : [{brand: primary, text}];
                matches.forEach(match => carBrands.add(canonical(match[2])));
                for (const section of sections) {
                    if (!section.brand || section.brand === 'Універсальний' || section.brand === 'MAK') continue;
                    for (let label of section.text.replace(/\([^)]*\)/g, ';').split(/[,;]/)) {
                        label = label.replace(/^[\s—–:-]+|[\s—–:-]+$/g,'').replace(/\s+/g,' ').trim();
                        if (!label || /багато|універс|many|всі моделі/i.test(label) || label.length > 40 || label.split(' ').length > 4) continue;
                        const key = normalize(label);
                        if (!models.has(section.brand)) models.set(section.brand,new Map());
                        models.get(section.brand).set(key,label);
                        pairs.push({brand:section.brand,key});
                    }
                }
            }
            carBrands.forEach(brand => brands.add(brand));
            if (primary === 'Універсальний') brands.add(primary);
            fitments.set(product,{brands:carBrands,pairs,universal:primary === 'Універсальний'});
        }
        return {fitments,models,brands};
    }
    root.ClipslockFitment = {normalize,canonical,build};
})(typeof window !== 'undefined' ? window : globalThis);
