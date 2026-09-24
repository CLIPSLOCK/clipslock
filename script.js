// Глобальні налаштування контактів
const CONTACTS = {
    telegram: "https://t.me/clipslock_manager",
    viber: "viber://chat?number=%2B380999999999"
};

// Стан додатку
let products = [];
let cart = JSON.parse(localStorage.getItem('clipslock_cart')) || [];
const FREE_SHIPPING_THRESHOLD = 600;
let currentModalProduct = null;

// DOM елементи
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const brandFilter = document.getElementById('brandFilter');
const categoryFilter = document.getElementById('categoryFilter');
const cartBadge = document.getElementById('cartBadge');

document.addEventListener('DOMContentLoaded', () => {
    // Встановлення контактів
    document.getElementById('tgBtn').href = CONTACTS.telegram;
    document.getElementById('vbBtn').href = CONTACTS.viber;
    document.getElementById('currentYear').textContent = new Date().getFullYear();

    fetchProducts();
    updateCartBadge();
    setupEventListeners();
});

// Завантаження товарів
async function fetchProducts() {
    try {
        const response = await fetch('products.json');
        products = await response.json();
        renderProducts(products);
        populateFilters();
    } catch (error) {
        console.error('Помилка завантаження товарів:', error);
        productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Не вдалося завантажити товари.</p>';
    }
}

// Рендер каталогу
function renderProducts(list) {
    productsGrid.innerHTML = '';
    if (list.length === 0) {
        productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">Товарів не знайдено.</p>';
        return;
    }

    list.forEach(product => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${product.img}" alt="${product.name}" class="card-img" loading="lazy">
            <div class="card-title">${product.name}</div>
            <div class="card-oem">OEM: ${product.oem}</div>
            <div class="card-price">${product.price} грн / шт</div>
            <div class="card-actions">
                <button class="btn btn-outline" onclick="openProductModal('${product.id}')">Деталі</button>
                <button class="btn btn-primary" onclick="addToCart('${product.id}', 1)">В кошик</button>
            </div>
        `;
        productsGrid.appendChild(card);
    });
}

// Заповнення фільтрів
function populateFilters() {
    const brands = [...new Set(products.map(p => p.brand))].sort();
    const categories = [...new Set(products.map(p => p.category))].sort();

    brands.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        brandFilter.appendChild(opt);
    });

    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        categoryFilter.appendChild(opt);
    });
}

// Логіка фільтрації та пошуку
function filterProducts() {
    const query = searchInput.value.toLowerCase();
    const cleanQuery = query.replace(/[\s-]/g, ''); // для ОЕМ
    const selBrand = brandFilter.value;
    const selCat = categoryFilter.value;

    const filtered = products.filter(p => {
        const cleanOem = p.oem.replace(/[\s-]/g, '').toLowerCase();
        const searchMatch = 
            p.name.toLowerCase().includes(query) ||
            cleanOem.includes(cleanQuery) ||
            p.brand.toLowerCase().includes(query) ||
            p.compatibility.some(c => c.toLowerCase().includes(query));

        const brandMatch = selBrand === "" || p.brand === selBrand;
        const catMatch = selCat === "" || p.category === selCat;

        return searchMatch && brandMatch && catMatch;
    });

    renderProducts(filtered);
}

// Слухачі подій для фільтрів
function setupEventListeners() {
    searchInput.addEventListener('input', filterProducts);
    brandFilter.addEventListener('change', filterProducts);
    categoryFilter.addEventListener('change', filterProducts);

    // Модалки - закриття
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    });

    // Клік поза модалкою
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });

    // Кошик
    document.getElementById('cartBtn').addEventListener('click', openCartModal);
    
    // Форма замовлення
    document.getElementById('checkoutBtn').addEventListener('click', () => {
        if(cart.length > 0) {
            document.getElementById('cartModal').style.display = 'none';
            document.getElementById('checkoutModal').style.display = 'flex';
        }
    });

    document.getElementById('checkoutForm').addEventListener('submit', handleCheckout);

    // Модалка товару - калькулятор кількості
    document.getElementById('modalQtyMinus').addEventListener('click', () => {
        const input = document.getElementById('modalQtyInput');
        if (input.value > 1) {
            input.value = parseInt(input.value) - 1;
            updateModalTotal();
        }
    });
    
    document.getElementById('modalQtyPlus').addEventListener('click', () => {
        const input = document.getElementById('modalQtyInput');
        input.value = parseInt(input.value) + 1;
        updateModalTotal();
    });

    document.getElementById('modalQtyInput').addEventListener('input', updateModalTotal);

    document.getElementById('modalAddToCart').addEventListener('click', () => {
        const qty = parseInt(document.getElementById('modalQtyInput').value);
        if (qty > 0 && currentModalProduct) {
            addToCart(currentModalProduct.id, qty);
            document.getElementById('productModal').style.display = 'none';
            document.body.style.overflow = 'auto';
            openCartModal(); // Одразу показуємо кошик
        }
    });
}

// Модалка товару
window.openProductModal = function(id) {
    currentModalProduct = products.find(p => p.id === id);
    if (!currentModalProduct) return;

    document.getElementById('modalImg').src = currentModalProduct.img;
    document.getElementById('modalName').textContent = currentModalProduct.name;
    document.getElementById('modalOem').textContent = currentModalProduct.oem;
    document.getElementById('modalBrand').textContent = currentModalProduct.brand;
    document.getElementById('modalCategory').textContent = currentModalProduct.category;
    document.getElementById('modalCompat').textContent = currentModalProduct.compatibility.join(', ');
    document.getElementById('modalDesc').textContent = currentModalProduct.description;
    document.getElementById('modalPrice').textContent = currentModalProduct.price;
    document.getElementById('modalQtyInput').value = 1;
    
    updateModalTotal();

    document.getElementById('productModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
};

function updateModalTotal() {
    if (!currentModalProduct) return;
    let qty = parseInt(document.getElementById('modalQtyInput').value) || 1;
    if (qty < 1) qty = 1;
    document.getElementById('modalQtyInput').value = qty;
    document.getElementById('modalTotalCalc').textContent = qty * currentModalProduct.price;
}

// Логіка кошика
function addToCart(id, qty) {
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({ id, qty });
    }
    saveCart();
}

function saveCart() {
    localStorage.setItem('clipslock_cart', JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    cartBadge.textContent = totalQty;
}

function openCartModal() {
    renderCart();
    document.getElementById('cartModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cartItems');
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; padding: 20px;">Ваш кошик порожній</p>';
        document.getElementById('cartTotalSum').textContent = '0 грн';
        updateDeliveryProgress(0);
        document.getElementById('checkoutBtn').disabled = true;
        return;
    }

    document.getElementById('checkoutBtn').disabled = false;
    let totalSum = 0;

    cart.forEach((cartItem, index) => {
        const product = products.find(p => p.id === cartItem.id);
        if (!product) return; // Якщо товар видалено з бази

        const itemTotal = product.price * cartItem.qty;
        totalSum += itemTotal;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${product.img}" alt="${product.name}" class="cart-item-img">
            <div class="cart-item-info">
                <div class="cart-item-title">${product.name}</div>
                <div class="cart-item-price">OEM: ${product.oem} | ${product.price} грн/шт</div>
                <div class="qty-selector" style="margin-top: 5px; margin-bottom: 0;">
                    <button onclick="changeCartQty(${index}, -1)">-</button>
                    <input type="number" value="${cartItem.qty}" readonly style="width: 40px; text-align:center;">
                    <button onclick="changeCartQty(${index}, 1)">+</button>
                </div>
            </div>
            <div style="font-weight:bold; white-space:nowrap;">${itemTotal} грн</div>
            <button class="cart-item-remove" onclick="removeFromCart(${index})">×</button>
        `;
        cartItemsContainer.appendChild(div);
    });

    document.getElementById('cartTotalSum').textContent = `${totalSum} грн`;
    updateDeliveryProgress(totalSum);
}

window.changeCartQty = function(index, delta) {
    if (cart[index].qty === 1 && delta === -1) {
        removeFromCart(index);
        return;
    }
    cart[index].qty += delta;
    saveCart();
    renderCart();
};

window.removeFromCart = function(index) {
    cart.splice(index, 1);
    saveCart();
    renderCart();
};

function updateDeliveryProgress(sum) {
    const textEl = document.getElementById('deliveryText');
    const barEl = document.getElementById('deliveryProgressBar');
    
    if (sum === 0) {
        textEl.textContent = `До безкоштовної доставки: ${FREE_SHIPPING_THRESHOLD} грн`;
        barEl.style.width = '0%';
        barEl.classList.remove('success');
    } else if (sum >= FREE_SHIPPING_THRESHOLD) {
        textEl.textContent = '✓ Безкоштовна доставка Новою Поштою';
        barEl.style.width = '100%';
        barEl.classList.add('success');
    } else {
        const left = FREE_SHIPPING_THRESHOLD - sum;
        const percent = (sum / FREE_SHIPPING_THRESHOLD) * 100;
        textEl.textContent = `До безкоштовної доставки залишилось ${left} грн`;
        barEl.style.width = `${percent}%`;
        barEl.classList.remove('success');
    }
}

// Оформлення замовлення
function handleCheckout(e) {
    e.preventDefault();

    // Формуємо детальну інформацію по товарах для замовлення
    let totalOrderSum = 0;
    const orderItems = cart.map(cartItem => {
        const product = products.find(p => p.id === cartItem.id);
        const itemSum = product.price * cartItem.qty;
        totalOrderSum += itemSum;
        return {
            id: product.id,
            name: product.name,
            oem: product.oem,
            price: product.price,
            qty: cartItem.qty,
            sum: itemSum
        };
    });

    const isFreeShipping = totalOrderSum >= FREE_SHIPPING_THRESHOLD;
    const orderNumber = 'CL-' + Math.floor(10000 + Math.random() * 90000);

    const order = {
        orderId: orderNumber,
        date: new Date().toISOString(),
        customer: {
            name: document.getElementById('orderName').value,
            phone: document.getElementById('orderPhone').value,
            city: document.getElementById('orderCity').value,
            branch: document.getElementById('orderBranch').value,
            comment: document.getElementById('orderComment').value
        },
        items: orderItems,
        totalSum: totalOrderSum,
        freeShipping: isFreeShipping
    };

    sendOrder(order);
}

// Функція-заглушка для відправки
function sendOrder(order) {
    // TODO: В майбутньому тут буде fetch() до API або Telegram Bot
    console.log("=== НОВЕ ЗАМОВЛЕННЯ СФОРМОВАНО ===", order);

    // Очищаємо форму та кошик
    document.getElementById('checkoutForm').reset();
    cart = [];
    saveCart();

    // Ховаємо модалку оформлення
    document.getElementById('checkoutModal').style.display = 'none';
    
    // Показуємо успіх
    document.getElementById('successOrderId').textContent = `Замовлення №${order.orderId}`;
    document.getElementById('successModal').style.display = 'flex';
}
