// Глобальні налаштування контактів
const CONTACTS = {
    telegram: "https://t.me/KEFFIR123",
    viber: "viber://chat?number=380679993271"
};

// Стан додатку
let products = [];
let cart = JSON.parse(localStorage.getItem('clipslock_cart')) || [];
const FREE_SHIPPING_THRESHOLD = 600;
let currentModalProduct = null;

// Налаштування пагінації (сторінок)
const itemsPerPage = 12;
let currentPage = 1;

// DOM елементи
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const brandFilter = document.getElementById('brandFilter');
const categoryFilter = document.getElementById('categoryFilter');
const resetFiltersBtn = document.getElementById('resetFiltersBtn');
const cartBadge = document.getElementById('cartBadge');

document.addEventListener('DOMContentLoaded', () => {
    // Встановлення контактів
    const tgBtn = document.getElementById('tgBtn');
    const vbBtn = document.getElementById('vbBtn');
    if (tgBtn) tgBtn.href = CONTACTS.telegram;
    if (vbBtn) vbBtn.href = CONTACTS.viber;
    
    const yearEl = document.getElementById('currentYear');
    if (yearEl) yearEl.textContent = new Date().getFullYear();

    fetchProducts();
    updateCartBadge();
    setupEventListeners();
});

// Завантаження товарів
async function fetchProducts() {
    try {
        const response = await fetch('products.json');
        products = await response.json();
        renderProducts(products, 1);
        populateFilters();
    } catch (error) {
        console.error('Помилка завантаження товарів:', error);
        if (productsGrid) {
            productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-muted);">Не вдалося завантажити товари. Перевірте з\'єднання.</p>';
        }
    }
}

// Рендер каталогу з підтримкою пагінації
function renderProducts(productsArray, page = 1) {
    currentPage = page;
    if (!productsGrid) return;
    productsGrid.innerHTML = '';

    if (productsArray.length === 0) {
        productsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; padding: 40px 0; color: var(--text-muted);">Товарів не знайдено за вашим запитом.</p>';
        renderPagination(0, page, productsArray);
        return;
    }

    const startIndex = (page - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = productsArray.slice(startIndex, endIndex);

    paginatedItems.forEach(product => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = (e) => {
            if (!e.target.closest('.card-qty-control') && !e.target.closest('.card-add-btn')) {
                openProductModal(product.id);
            }
        };
        
        card.innerHTML = `
            <div class="pc-image-wrap">
                <img src="${product.img}" alt="${product.name}" loading="lazy">
            </div>
            <div class="pc-meta">
                <span class="pc-oem">${product.oem}</span>
                <span class="pc-brand">${product.brand}</span>
            </div>
            <div class="pc-title">${product.name}</div>
            
            <div class="product-card-footer">
                <div class="product-price-info">
                    <span class="product-price">${product.price}</span>
                    <span class="product-unit">грн/шт</span>
                </div>
                
                <div class="card-qty-control" data-id="${product.id}">
                    <button class="qty-btn minus-btn" type="button">−</button>
                    <input type="number" class="qty-input" value="1" min="1" max="999" readonly>
                    <button class="qty-btn plus-btn" type="button">+</button>
                </div>
            </div>

            <button class="btn btn-primary btn-full card-add-btn" onclick="addCatalogItemToCart(event, '${product.id}')">
                У кошик
            </button>
        `;
        productsGrid.appendChild(card);
    });

    renderPagination(productsArray.length, page, productsArray);
}

// Пагінація
function renderPagination(totalItems, current, productsArray) {
    const paginationContainer = document.getElementById('pagination');
    if (!paginationContainer) return;

    paginationContainer.innerHTML = '';
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    if (totalPages <= 1) return;

    // Кнопка "Назад"
    const prevBtn = document.createElement('button');
    prevBtn.className = 'page-btn';
    prevBtn.innerHTML = '‹';
    prevBtn.disabled = current === 1;
    prevBtn.onclick = () => {
        currentPage--;
        renderProducts(productsArray, currentPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    paginationContainer.appendChild(prevBtn);

    let startPage = Math.max(1, current - 1);
    let endPage = Math.min(totalPages, current + 1);

    if (current === 1) endPage = Math.min(totalPages, 3);
    if (current === totalPages) startPage = Math.max(1, totalPages - 2);

    if (startPage > 1) {
        createPageBtn(1, current, productsArray, paginationContainer);
        if (startPage > 2) {
            const dots = document.createElement('span');
            dots.className = 'page-dots';
            dots.textContent = '...';
            paginationContainer.appendChild(dots);
        }
    }

    for (let i = startPage; i <= endPage; i++) {
        createPageBtn(i, current, productsArray, paginationContainer);
    }

    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const dots = document.createElement('span');
            dots.className = 'page-dots';
            dots.textContent = '...';
            paginationContainer.appendChild(dots);
        }
        createPageBtn(totalPages, current, productsArray, paginationContainer);
    }

    // Кнопка "Вперед"
    const nextBtn = document.createElement('button');
    nextBtn.className = 'page-btn';
    nextBtn.innerHTML = '›';
    nextBtn.disabled = current === totalPages;
    nextBtn.onclick = () => {
        currentPage++;
        renderProducts(productsArray, currentPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    paginationContainer.appendChild(nextBtn);
}

function createPageBtn(i, current, productsArray, container) {
    const pageBtn = document.createElement('button');
    pageBtn.className = `page-btn ${i === current ? 'active' : ''}`;
    pageBtn.innerText = i;
    pageBtn.onclick = () => {
        currentPage = i;
        renderProducts(productsArray, currentPage);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    container.appendChild(pageBtn);
}

// Заповнення фільтрів унікальними значеннями
function populateFilters() {
    if (!brandFilter || !categoryFilter) return;

    const brands = [...new Set(products.map(p => p.brand).filter(Boolean))].sort();
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();

    brandFilter.innerHTML = '<option value="">Усі марки</option>';
    brands.forEach(b => {
        const opt = document.createElement('option');
        opt.value = b;
        opt.textContent = b;
        brandFilter.appendChild(opt);
    });

    categoryFilter.innerHTML = '<option value="">Усі категорії</option>';
    categories.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.textContent = c;
        categoryFilter.appendChild(opt);
    });
}

// Пошук та фільтрація
function filterProducts() {
    const query = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const cleanQuery = query.replace(/[\s-]/g, '');
    const selBrand = brandFilter ? brandFilter.value : '';
    const selCat = categoryFilter ? categoryFilter.value : '';

    const filtered = products.filter(p => {
        const cleanOem = (p.oem || '').replace(/[\s-]/g, '').toLowerCase();
        const searchMatch = 
            !query ||
            (p.name && p.name.toLowerCase().includes(query)) ||
            cleanOem.includes(cleanQuery) ||
            (p.brand && p.brand.toLowerCase().includes(query)) ||
            (Array.isArray(p.compatibility) && p.compatibility.some(c => c.toLowerCase().includes(query)));

        const brandMatch = selBrand === "" || p.brand === selBrand;
        const catMatch = selCat === "" || p.category === selCat;

        return searchMatch && brandMatch && catMatch;
    });

    currentPage = 1;
    renderProducts(filtered, 1);
}

// Обробники подій
function setupEventListeners() {
    if (searchInput) searchInput.addEventListener('input', filterProducts);
    if (brandFilter) brandFilter.addEventListener('change', filterProducts);
    if (categoryFilter) categoryFilter.addEventListener('change', filterProducts);

    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            if (searchInput) searchInput.value = '';
            if (brandFilter) brandFilter.value = '';
            if (categoryFilter) categoryFilter.value = '';
            filterProducts();
        });
    }

    // Закриття модалок
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.closest('.modal').style.display = 'none';
            document.body.style.overflow = 'auto';
        });
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    });

    // Зміна кількості на картці
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('plus-btn')) {
            const wrapper = e.target.closest('.card-qty-control');
            const input = wrapper.querySelector('.qty-input');
            input.value = parseInt(input.value) + 1;
        }
        if (e.target.classList.contains('minus-btn')) {
            const wrapper = e.target.closest('.card-qty-control');
            const input = wrapper.querySelector('.qty-input');
            if (parseInt(input.value) > 1) {
                input.value = parseInt(input.value) - 1;
            }
        }
    });

    // Відкриття кошика
    const cartBtn = document.getElementById('cartBtn');
    if (cartBtn) cartBtn.addEventListener('click', openCartModal);
    
    // Кнопка оформлення
    const checkoutBtn = document.getElementById('checkoutBtn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', () => {
            if (cart.length > 0) {
                document.getElementById('cartModal').style.display = 'none';
                document.getElementById('checkoutModal').style.display = 'flex';
            }
        });
    }

    const checkoutForm = document.getElementById('checkoutForm');
    if (checkoutForm) checkoutForm.addEventListener('submit', handleCheckout);

    // Калькулятор модалки
    const minusBtn = document.getElementById('modalQtyMinus');
    const plusBtn = document.getElementById('modalQtyPlus');
    const qtyInput = document.getElementById('modalQtyInput');

    if (minusBtn && qtyInput) {
        minusBtn.addEventListener('click', () => {
            if (parseInt(qtyInput.value) > 1) {
                qtyInput.value = parseInt(qtyInput.value) - 1;
                updateModalTotal();
            }
        });
    }
    
    if (plusBtn && qtyInput) {
        plusBtn.addEventListener('click', () => {
            qtyInput.value = parseInt(qtyInput.value) + 1;
            updateModalTotal();
        });
    }

    if (qtyInput) qtyInput.addEventListener('input', updateModalTotal);

    const modalAddBtn = document.getElementById('modalAddToCart');
    if (modalAddBtn) {
        modalAddBtn.addEventListener('click', () => {
            const qty = parseInt(document.getElementById('modalQtyInput').value);
            if (qty > 0 && currentModalProduct) {
                addToCart(null, currentModalProduct.id, qty);
                document.getElementById('productModal').style.display = 'none';
                document.body.style.overflow = 'auto';
                openCartModal();
            }
        });
    }
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
    document.getElementById('modalCompat').textContent = Array.isArray(currentModalProduct.compatibility) ? currentModalProduct.compatibility.join(', ') : '';
    document.getElementById('modalDesc').textContent = currentModalProduct.description || '';
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

// Додавання товару з картки
window.addCatalogItemToCart = function(event, id) {
    event.stopPropagation();
    const card = event.target.closest('.product-card');
    const qtyInput = card.querySelector('.qty-input');
    const qty = parseInt(qtyInput.value) || 1;
    
    addToCart(null, id, qty);
    
    const btn = event.target;
    const originalText = btn.textContent;
    btn.textContent = 'Додано ✓';
    btn.style.background = '#28a745';
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '';
    }, 1000);
};

// Робота з кошиком
window.addToCart = function(event, id, qty) {
    if (event) event.stopPropagation();
    
    const existing = cart.find(item => item.id === id);
    if (existing) {
        existing.qty += qty;
    } else {
        cart.push({ id, qty });
    }
    saveCart();
    
    if (cartBadge) {
        cartBadge.style.transform = 'scale(1.3)';
        setTimeout(() => cartBadge.style.transform = 'scale(1)', 200);
    }
};

function saveCart() {
    localStorage.setItem('clipslock_cart', JSON.stringify(cart));
    updateCartBadge();
}

function updateCartBadge() {
    const totalQty = cart.reduce((sum, item) => sum + item.qty, 0);
    if (cartBadge) cartBadge.textContent = totalQty;
}

function openCartModal() {
    renderCart();
    document.getElementById('cartModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function renderCart() {
    const cartItemsContainer = document.getElementById('cartItems');
    if (!cartItemsContainer) return;

    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; padding: 40px 0; color: var(--text-muted);">Кошик порожній</p>';
        document.getElementById('cartTotalSum').textContent = '0 грн';
        updateDeliveryProgress(0);
        document.getElementById('checkoutBtn').disabled = true;
        return;
    }

    document.getElementById('checkoutBtn').disabled = false;
    let totalSum = 0;

    cart.forEach((cartItem, index) => {
        const product = products.find(p => p.id === cartItem.id);
        if (!product) return; 

        const itemTotal = product.price * cartItem.qty;
        totalSum += itemTotal;

        const div = document.createElement('div');
        div.className = 'cart-item';
        div.innerHTML = `
            <img src="${product.img}" alt="${product.name}" class="ci-img">
            <div class="ci-info">
                <div class="ci-title">${product.name}</div>
                <div class="ci-oem">${product.oem}</div>
                <div class="ci-price-block">
                    <div class="qty-control">
                        <button onclick="changeCartQty(${index}, -1)">−</button>
                        <input type="number" value="${cartItem.qty}" readonly>
                        <button onclick="changeCartQty(${index}, 1)">+</button>
                    </div>
                    <div class="ci-price">${itemTotal} грн</div>
                </div>
            </div>
            <button class="btn-remove" onclick="removeFromCart(${index})" title="Видалити">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="20" height="20"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
            </button>
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
    const statusBox = document.querySelector('.delivery-status-box');
    if (!textEl || !barEl || !statusBox) return;
    
    if (sum === 0) {
        textEl.textContent = `Безкоштовна доставка від ${FREE_SHIPPING_THRESHOLD} грн`;
        barEl.style.width = '0%';
        barEl.classList.remove('success');
        statusBox.classList.remove('success');
    } else if (sum >= FREE_SHIPPING_THRESHOLD) {
        textEl.textContent = 'Безкоштовна доставка НП';
        barEl.style.width = '100%';
        barEl.classList.add('success');
        statusBox.classList.add('success');
    } else {
        const left = FREE_SHIPPING_THRESHOLD - sum;
        const percent = (sum / FREE_SHIPPING_THRESHOLD) * 100;
        textEl.textContent = `До безкоштовної доставки ще ${left} грн`;
        barEl.style.width = `${percent}%`;
        barEl.classList.remove('success');
        statusBox.classList.remove('success');
    }
}

// Оформлення замовлення
function handleCheckout(e) {
    e.preventDefault();

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

// Відправка замовлення в Telegram
async function sendOrder(order) {
    const BOT_TOKEN = '8717638807:AAESob1XqKvNJV3TE315QyMeh79Grh9vFCo'; 
    const CHAT_ID = '979529637';

    let message = `🛒 <b>НОВЕ ЗАМОВЛЕННЯ (${order.orderId})</b>\n\n`;
    message += `👤 <b>Клієнт:</b> ${order.customer.name}\n`;
    message += `📞 <b>Телефон:</b> ${order.customer.phone}\n`;
    message += `🏙 <b>Місто:</b> ${order.customer.city}\n`;
    message += `📦 <b>Відділення НП:</b> ${order.customer.branch}\n`;
    if (order.customer.comment) {
        message += `💬 <b>Коментар:</b> ${order.customer.comment}\n`;
    }
    
    message += `\n🛍 <b>Товари:</b>\n`;
    order.items.forEach((item, index) => {
        message += `${index + 1}. ${item.name} (OEM: ${item.oem})\n   ${item.qty} шт x ${item.price} грн = ${item.sum} грн\n`;
    });

    message += `\n💰 <b>Всього до оплати: ${order.totalSum} грн</b>`;
    message += order.freeShipping ? `\n✅ <i>Безкоштовна доставка</i>` : `\n🚚 <i>Доставка за рахунок клієнта</i>`;

    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const submitBtn = document.querySelector('#checkoutForm button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';

    try {
        if (submitBtn) {
            submitBtn.textContent = 'Відправка...';
            submitBtn.disabled = true;
        }

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'HTML'
            })
        });

        if (response.ok) {
            cart = [];
            saveCart();
            document.getElementById('checkoutModal').style.display = 'none';
            document.getElementById('checkoutForm').reset();
            
            document.getElementById('successOrderId').textContent = order.orderId;
            document.getElementById('successModal').style.display = 'flex';
            document.body.style.overflow = 'hidden';
        } else {
            alert('Помилка відправки замовлення. Спробуйте ще раз або зв’яжіться з нами.');
        }
    } catch (error) {
        console.error('Помилка відправки:', error);
        alert('Помилка мережі. Перевірте зʼєднання.');
    } finally {
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}
