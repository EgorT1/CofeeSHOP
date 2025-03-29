// Check if user is admin
const token = localStorage.getItem('token');
const role = localStorage.getItem('role');

// Only check admin access if we're on the admin dashboard page
if (window.location.pathname.includes('admin-dashboard') && (!token || role !== 'admin')) {
    window.location.href = '/';
}

// DOM Elements
const productSearch = document.getElementById('productSearch');
const categoryFilter = document.getElementById('categoryFilter');
const userSearch = document.getElementById('userSearch');
const roleFilter = document.getElementById('roleFilter');
const productsTableBody = document.getElementById('productsTableBody');
const usersTableBody = document.getElementById('usersTableBody');
const addProductBtn = document.getElementById('addProductBtn');
const addAdminBtn = document.getElementById('addAdminBtn');
const productModal = document.getElementById('productModal');
const adminModal = document.getElementById('adminModal');
const productForm = document.getElementById('productForm');
const adminForm = document.getElementById('adminForm');
const logoutBtn = document.getElementById('logoutBtn');

// State
let products = [];
let users = [];
let editingProductId = null;

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    loadDashboardData();
    loadProducts();
    loadUsers();
});

// Add event listeners for search and filter
productSearch?.addEventListener('input', filterProducts);
categoryFilter?.addEventListener('change', filterProducts);
userSearch?.addEventListener('input', filterUsers);
roleFilter?.addEventListener('change', filterUsers);

// Modal controls
addProductBtn.addEventListener('click', () => {
    editingProductId = null;
    productForm.reset();
    document.getElementById('productModalTitle').textContent = 'Add New Product';
    productModal.style.display = 'block';
});

addAdminBtn.addEventListener('click', () => {
    adminForm.reset();
    adminModal.style.display = 'block';
});

document.querySelectorAll('.close').forEach(btn => {
    btn.addEventListener('click', () => {
        productModal.style.display = 'none';
        adminModal.style.display = 'none';
    });
});

logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    window.location.href = '/';
});

// Forms
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(productForm);
    const productData = {
        name: formData.get('name'),
        category: formData.get('category'),
        price: parseFloat(formData.get('price')),
        stock_quantity: parseInt(formData.get('stock')),
        image_url: formData.get('image_url'),
        description: formData.get('description')
    };

    try {
        const url = editingProductId ? `/products/${editingProductId}` : '/products';
        const method = editingProductId ? 'PUT' : 'POST';
        
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify(productData)
        });

        if (response.ok) {
            productModal.style.display = 'none';
            loadProducts();
            loadDashboardData();
            alert(editingProductId ? 'Product updated successfully!' : 'Product added successfully!');
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to save product');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while saving the product');
    }
});

adminForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(adminForm);
    
    try {
        const response = await fetch('/admin/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password'),
                role: 'admin'
            })
        });

        if (response.ok) {
            adminModal.style.display = 'none';
            loadUsers();
            loadDashboardData();
            alert('Admin user created successfully!');
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to create admin user');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while creating admin user');
    }
});

// API Functions
async function loadDashboardData() {
    try {
        const response = await fetch('/admin/dashboard', {
            headers: { 'Authorization': token }
        });
        const data = await response.json();
        
        document.getElementById('totalProducts').textContent = data.totalProducts;
        document.getElementById('totalUsers').textContent = data.totalUsers;
        document.getElementById('totalOrders').textContent = data.totalOrders;
        document.getElementById('totalRevenue').textContent = `$${data.totalRevenue.toFixed(2)}`;
    } catch (error) {
        console.error('Error loading dashboard data:', error);
        showNotification('Error loading dashboard data', 'error');
    }
}

async function loadProducts() {
    try {
        const response = await fetch('/products');
        products = await response.json();
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/admin/users', {
            headers: { 'Authorization': token }
        });
        if (!response.ok) throw new Error('Failed to fetch users');
        
        users = await response.json();
        displayUsers(users);
    } catch (error) {
        console.error('Error loading users:', error);
        showNotification('Error loading users', 'error');
    }
}

// Display Functions
function displayProducts(productsToShow) {
    if (!productsToShow || !productsTableBody) return;
    
    productsTableBody.innerHTML = productsToShow.map(product => `
        <tr>
            <td><img src="${product.image_url || 'images/placeholder.jpg'}" alt="${product.name}" class="product-image"></td>
            <td>${product.name}</td>
            <td>${product.description || 'No category'}</td>
            <td>$${parseFloat(product.price).toFixed(2)}</td>
            <td>${product.stock_quantity || 0}</td>
            <td>
                <div class="action-buttons">
                    <button onclick="editProduct(${product.id})" class="edit-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="deleteProduct(${product.id})" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

function displayUsers(usersToShow) {
    if (!usersTableBody) return;
    
    usersTableBody.innerHTML = usersToShow.map(user => `
        <tr>
            <td>${user.username}</td>
            <td><span class="role-badge ${user.role}">${user.role}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                ${user.role !== 'admin' ? `
                    <button onclick="deleteUser(${user.id})" class="btn btn-danger">
                        <i class="fas fa-trash"></i>
                    </button>
                ` : ''}
            </td>
        </tr>
    `).join('');
}

// Filter Functions
function filterProducts() {
    const searchTerm = productSearch?.value.toLowerCase() || '';
    const category = categoryFilter?.value || '';

    const filtered = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                            (product.description || '').toLowerCase().includes(searchTerm);
        const matchesCategory = !category || product.category === category;
        return matchesSearch && matchesCategory;
    });

    displayProducts(filtered);
}

function filterUsers() {
    const searchTerm = userSearch?.value.toLowerCase() || '';
    const role = roleFilter?.value || '';

    const filtered = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm);
        const matchesRole = !role || user.role === role;
        return matchesSearch && matchesRole;
    });

    displayUsers(filtered);
}

// Product Actions
async function editProduct(productId) {
    try {
        const product = products.find(p => p.id === productId);
        if (!product) {
            showNotification('Product not found', 'error');
            return;
        }

        editingProductId = productId;
        document.getElementById('productModalTitle').textContent = 'Edit Product';
        
        const form = document.getElementById('productForm');
        form.elements['name'].value = product.name || '';
        form.elements['category'].value = product.category || '';
        form.elements['description'].value = product.description || '';
        form.elements['price'].value = product.price || 0;
        form.elements['stock'].value = product.stock_quantity || 0;
        form.elements['image_url'].value = product.image_url || '';

        productModal.style.display = 'block';
    } catch (error) {
        console.error('Error in editProduct:', error);
        showNotification('Error editing product', 'error');
    }
}

async function deleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
        const response = await fetch(`/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });

        if (response.ok) {
            loadProducts();
            loadDashboardData();
            alert('Product deleted successfully!');
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to delete product');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while deleting the product');
    }
}

// User Actions
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
        const response = await fetch(`/admin/users/${userId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });

        if (response.ok) {
            loadUsers();
            loadDashboardData();
            alert('User deleted successfully!');
        } else {
            const data = await response.json();
            alert(data.message || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('An error occurred while deleting the user');
    }
}

// Add new admin
document.getElementById('addAdminForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    try {
        const response = await fetch('/admin/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': token
            },
            body: JSON.stringify({
                username: formData.get('username'),
                password: formData.get('password'),
                role: 'admin'
            })
        });

        if (!response.ok) {
            const data = await response.json();
            throw new Error(data.message || 'Failed to add admin');
        }

        showNotification('Admin added successfully', 'success');
        loadUsers();
        document.getElementById('adminModal').style.display = 'none';
        e.target.reset();
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message, 'error');
    }
});

// Add this helper function for notifications
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
} 