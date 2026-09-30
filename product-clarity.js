(() => {
    const description = document.getElementById('modalDesc');
    const name = document.getElementById('modalName');
    if (!description || !name) return;
    const normalize = text => text.trim().replace(/\s+/g, ' ').toLocaleLowerCase('uk-UA');
    function update() {
        const text = normalize(description.textContent);
        description.hidden = !text || text === normalize(name.textContent);
    }
    const observer = new MutationObserver(update);
    observer.observe(description, { childList:true, characterData:true, subtree:true });
    observer.observe(name, { childList:true, characterData:true, subtree:true });
    update();
})();
