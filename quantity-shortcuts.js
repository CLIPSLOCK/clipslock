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

(() => {
    const container = document.getElementById('cartItems');
    if (!container) return;
    const originalRenderCart = renderCart;
    renderCart = function (...args) {
        const result = originalRenderCart(...args);
        container.querySelectorAll('.cart-item').forEach(row => {
            const input = row.querySelector('.qty-control input');
            const button = row.querySelector('.qty-control button');
            const match = button?.getAttribute('onclick')?.match(/changeCartQty\((\d+),/);
            if (!input || !match) return;
            input.readOnly = false;
            input.min = '1';
            input.step = '1';
            input.inputMode = 'numeric';
            input.dataset.cartIndex = match[1];
            input.setAttribute('aria-label', 'Кількість: ' + row.querySelector('.ci-title').textContent);
        });
        return result;
    };
    function commit(input) {
        const index = Number(input.dataset.cartIndex);
        const quantity = Number(input.value);
        if (!cart[index] || !Number.isSafeInteger(quantity) || quantity < 1 || input.value.trim() === '') return false;
        cart[index].qty = quantity;
        saveCart();
        container.querySelectorAll('.cart-item').forEach(row => {
            const field = row.querySelector('input[data-cart-index]');
            const item = field && cart[Number(field.dataset.cartIndex)];
            const product = item && products.find(p => String(p.id) === String(item.id));
            if (product) row.querySelector('.ci-price').textContent = (product.price * item.qty) + ' грн';
        });
        const total = cart.reduce((sum, item) => {
            const product = products.find(p => String(p.id) === String(item.id));
            return sum + (product ? product.price * item.qty : 0);
        }, 0);
        document.getElementById('cartTotalSum').textContent = total + ' грн';
        updateDeliveryProgress(total);
        return true;
    }
    container.addEventListener('input', event => {
        if (event.target.matches('input[data-cart-index]')) commit(event.target);
    });
    container.addEventListener('blur', event => {
        const input = event.target;
        if (!input.matches('input[data-cart-index]')) return;
        if (!commit(input)) input.value = String(cart[Number(input.dataset.cartIndex)]?.qty || 1);
    }, true);
    container.addEventListener('keydown', event => {
        if (event.key === 'Enter' && event.target.matches('input[data-cart-index]')) {
            event.preventDefault();
            event.target.blur();
        }
    });
})();
