(() => {
    const input = document.getElementById('modalQtyInput');
    const group = document.querySelector('.qty-quick-add');
    if (!input || !group) return;
    group.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-qty-add]');
        if (!button || !group.contains(button)) return;
        const quantity = Math.max(1, Math.floor(Number(input.value) || 1));
        input.value = String(quantity + Number(button.dataset.qtyAdd));
        input.dispatchEvent(new Event('input', { bubbles: true }));
    });
})();
