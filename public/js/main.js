// Global variables
const token = localStorage.getItem('token');
const userRole = localStorage.getItem('role');

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const loginModal = document.getElementById('loginModal');
const registerModal = document.getElementById('registerModal');
const loginForm = document.getElementById('loginForm');
const registerForm = document.getElementById('registerForm');
const authButtons = document.querySelector('.auth-buttons');
const navLinks = document.querySelector('.nav-links');
const closeButtons = document.querySelectorAll('.close');
const productsGrid = document.getElementById('productsGrid');
const searchInput = document.getElementById('searchInput');
const priceFilter = document.getElementById('priceFilter');
const stockFilter = document.getElementById('stockFilter');

// State
let currentUser = null;
let products = [];

// Cart Elements and State
const cartModal = document.getElementById('cartModal');
const cartIcon = document.querySelector('.cart-icon');
const cartItems = document.getElementById('cartItems');
const cartTotal = document.getElementById('cartTotal');
const checkoutBtn = document.getElementById('checkoutBtn');
const cartCount = document.getElementById('cartCount');

// Initialize cart from localStorage
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Function to check if token is valid
async function checkTokenValidity() {
    if (!token) return false;
    
    try {
        const response = await fetch('/verify-token', {
            headers: { 'Authorization': token }
        });
        return response.ok;
    } catch (error) {
        console.error('Token validation error:', error);
        return false;
    }
}

// Function to handle logout
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('cart');
    cart = [];
    updateCartCount();
    showNotification('Logged out successfully', 'info');
}

// Update UI based on authentication status
function updateUI() {
    if (token && userRole) {
        // Hide login/register buttons
        if (loginBtn) loginBtn.style.display = 'none';
        if (registerBtn) registerBtn.style.display = 'none';
        
        // Update auth buttons
        authButtons.innerHTML = `
            <a href="/admin-dashboard.html" class="btn btn-primary" style="display: ${userRole === 'admin' ? 'inline-block' : 'none'}">
                <i class="fas fa-cog"></i> Admin Dashboard
            </a>
            <div class="profile-dropdown">
                <button class="btn btn-outline profile-btn">
                    <i class="fas fa-user"></i> Profile
                </button>
                <div class="dropdown-content">
                    <a href="#" id="logoutBtn">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </a>
                </div>
            </div>
        `;

        // Add event listener for logout
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                handleLogout();
                window.location.reload(); // Force page reload after logout
            });
        }
    } else {
        // Show login/register buttons
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (registerBtn) registerBtn.style.display = 'inline-block';
        
        // Clear auth buttons
        authButtons.innerHTML = `
            <button id="loginBtn" class="btn">Login</button>
            <button id="registerBtn" class="btn btn-primary">Register</button>
        `;
        
        // Reinitialize login/register button listeners
        const newLoginBtn = document.getElementById('loginBtn');
        const newRegisterBtn = document.getElementById('registerBtn');
        
        if (newLoginBtn) {
            newLoginBtn.addEventListener('click', () => {
                if (loginModal) loginModal.style.display = 'block';
            });
        }
        
        if (newRegisterBtn) {
            newRegisterBtn.addEventListener('click', () => {
                if (registerModal) registerModal.style.display = 'block';
            });
        }
    }
}

// Call updateUI on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check token validity only if there is a token
    if (token) {
        const isValidToken = await checkTokenValidity();
        if (!isValidToken) {
            handleLogout();
            return;
        }
    }
    
    loadProducts();
    updateUI();
    updateCartCount();
    
    // Initialize cart icon click handler
    if (cartIcon) {
        cartIcon.addEventListener('click', handleCartIconClick);
    }

    // Initialize modal close handlers
    document.querySelectorAll('.close').forEach(button => {
        button.addEventListener('click', () => {
            const modal = button.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        });
    });

    // Close modals when clicking outside
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
});

// Handle Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(loginForm);
    
    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password')
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('role', data.role);
            loginModal.style.display = 'none';
            loginForm.reset();
            
            // Initialize cart functionality after successful login
            cart = [];
            localStorage.setItem('cart', JSON.stringify(cart));
            
            if (data.role === 'admin') {
                window.location.href = '/admin-dashboard.html';
            } else {
                showNotification('Login successful!', 'success');
                window.location.reload();
            }
        } else {
            showNotification(data.message || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred during login', 'error');
    }
});

// Handle Register
registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(registerForm);
    
    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password'),
                role: 'user'
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            registerModal.style.display = 'none';
            alert('Registered successfully! Please login.');
            loginModal.style.display = 'block';
        } else {
            alert(data.message || 'Registration failed');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred during registration');
    }
});

// Load Products
async function loadProducts() {
    try {
        const response = await fetch('/products');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        products = await response.json();
        console.log('Loaded products:', products); // Debug log
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        if (productsGrid) {
            productsGrid.innerHTML = '<p class="error-message">Error loading products. Please try again later.</p>';
        }
    }
}

// Helper Functions
function showModal(modal) {
    modal.style.display = 'block';
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.remove();
    }, 3000);
}

function filterProducts() {
    if (!products.length) return;

    const searchTerm = searchInput?.value.toLowerCase() || '';
    const priceRange = priceFilter?.value || '';
    const stockLevel = stockFilter?.value || '';

    let filtered = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                            product.description.toLowerCase().includes(searchTerm);

        let matchesPrice = true;
        if (priceRange) {
            const [min, max] = priceRange.split('-').map(Number);
            if (max) {
                matchesPrice = product.price >= min && product.price <= max;
            } else {
                matchesPrice = product.price >= min;
            }
        }

        let matchesStock = true;
        if (stockLevel) {
            switch (stockLevel) {
                case 'low':
                    matchesStock = product.stock_quantity <= 30;
                    break;
                case 'medium':
                    matchesStock = product.stock_quantity > 30 && product.stock_quantity <= 60;
                    break;
                case 'high':
                    matchesStock = product.stock_quantity > 60;
                    break;
            }
        }

        return matchesSearch && matchesPrice && matchesStock;
    });

    displayProducts(filtered);
}

function displayProducts(productsToShow) {
    if (!productsGrid) {
        console.error('Products grid element not found');
        return;
    }
    
    if (!productsToShow || productsToShow.length === 0) {
        productsGrid.innerHTML = '<p>No products available.</p>';
        return;
    }

    console.log('Displaying products:', productsToShow); // Debug log
    
    productsGrid.innerHTML = productsToShow.map(product => `
        <div class="product-card">
            <img src="${product.image_url || 'images/placeholder.jpg'}" alt="${product.name}" onerror="this.src='images/placeholder.jpg'">
            <div class="product-info">
                <h3>${product.name}</h3>
                <p>${product.description || 'No description available'}</p>
                <p class="price">$${parseFloat(product.price || 0).toFixed(2)}</p>
                <p class="stock">In Stock: ${product.stock_quantity || 0}</p>
                <button onclick="addToCart(${product.id})" class="btn btn-primary" ${(product.stock_quantity || 0) < 1 ? 'disabled' : ''}>
                    ${(product.stock_quantity || 0) < 1 ? 'Out of Stock' : 'Add to Cart'}
                </button>
            </div>
        </div>
    `).join('');
}

// Cart functionality
updateCartCount();

function updateCartCount() {
    if (!cartCount) return;
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    cartCount.textContent = totalItems;
    cartCount.style.display = totalItems > 0 ? 'block' : 'none';
}

function handleCartIconClick() {
    if (!token) {
        showNotification('Please login to view cart', 'error');
        loginModal.style.display = 'block';
        return;
    }
    displayCart();
    cartModal.style.display = 'block';
}

function addToCart(productId) {
    if (!token) {
        showNotification('Please login to add items to cart', 'error');
        loginModal.style.display = 'block';
        return;
    }

    const product = products.find(p => p.id === productId);
    if (!product) {
        showNotification('Product not found', 'error');
        return;
    }

    const existingItem = cart.find(item => item.productId === productId);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            productId: product.id,
            name: product.name,
            price: product.price,
            quantity: 1,
            image_url: product.image_url
        });
    }

    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    showNotification('Product added to cart!', 'success');
    displayCart();
    cartModal.style.display = 'block';
}

function displayCart() {
    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML = '<p class="empty-cart">Your cart is empty</p>';
        if (cartTotal) cartTotal.textContent = '$0.00';
        if (checkoutBtn) checkoutBtn.disabled = true;
        return;
    }

    cartItems.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image_url || 'images/placeholder.jpg'}" alt="${item.name}" onerror="this.src='images/placeholder.jpg'">
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">$${(item.price * item.quantity).toFixed(2)}</div>
                <div class="cart-item-quantity">
                    <button class="quantity-btn" onclick="updateQuantity(${item.productId}, ${item.quantity - 1})">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="updateQuantity(${item.productId}, ${item.quantity + 1})">+</button>
                </div>
            </div>
            <button class="delete-btn" onclick="removeFromCart(${item.productId})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');

    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (cartTotal) cartTotal.textContent = `$${total.toFixed(2)}`;
    if (checkoutBtn) checkoutBtn.disabled = false;
}

function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) {
        removeFromCart(productId);
        return;
    }

    const item = cart.find(item => item.productId === productId);
    if (item) {
        item.quantity = newQuantity;
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        displayCart();
    }
}

function removeFromCart(productId) {
    cart = cart.filter(item => item.productId !== productId);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    displayCart();
    showNotification('Item removed from cart', 'info');
}

checkoutBtn.addEventListener('click', async () => {
    if (!token) {
        showNotification('Please login to checkout', 'error');
        cartModal.style.display = 'none';
        loginModal.style.display = 'block';
        return;
    }

    try {
        const response = await fetch('/orders', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({
                items: cart.map(item => ({
                    product_id: item.productId,
                    quantity: item.quantity
                }))
            })
        });

        if (response.ok) {
            cart = [];
            localStorage.removeItem('cart');
            updateCartCount();
            displayCart();
            showNotification('Order placed successfully!', 'success');
            cartModal.style.display = 'none';
        } else {
            const data = await response.json();
            showNotification(data.message || 'Failed to place order', 'error');
        }
    } catch (error) {
        console.error('Error:', error);
        showNotification('An error occurred while placing the order', 'error');
    }
});