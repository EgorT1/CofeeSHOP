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
        
        // Define default categories
        const defaultCategories = [
            'Hot Coffee',
            'Iced Coffee',
            'Tea',
            'Pastry',
            'Snacks',
            'Equipment',
            'Accessories'
        ];
        
        // Get unique categories from products and combine with defaults
        const existingCategories = [...new Set(products.map(product => product.category))];
        const allCategories = [...new Set([...defaultCategories, ...existingCategories])]
            .filter(category => category && category !== 'undefined')
            .sort();
        
        // Populate category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.innerHTML = `
                <option value="">All Categories</option>
                ${allCategories.map(category => `
                    <option value="${category}">${category}</option>
                `).join('')}
            `;
        }
        
        displayProducts(products);
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Error loading products', 'error');
    }
}

async function loadUsers() {
    try {
        const response = await fetch('/admin/users', {
            headers: { 'Authorization': token }
        });
        if (!response.ok) throw new Error('Failed to load users');
        users = await response.json(); // Store in global variable
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
            <td>${product.category || 'No category'}</td>
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
    
    const currentUsername = localStorage.getItem('username');
    
    usersTableBody.innerHTML = usersToShow.map(user => `
        <tr>
            <td>${user.username}</td>
            <td><span class="role-badge ${user.role}">${user.role}</span></td>
            <td>${new Date(user.created_at).toLocaleDateString()}</td>
            <td>
                ${user.username === currentUsername ? 
                    `<span class="text-muted">Cannot modify own profile</span>` :
                    `<button class="btn btn-sm btn-primary" onclick="editUser(${user.id}, '${user.username}', '${user.role}')">
                        <i class="fas fa-edit"></i> Edit
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>`
                }
            </td>
        </tr>
    `).join('');
}

// Filter Functions
function filterProducts() {
    const searchTerm = productSearch?.value.toLowerCase() || '';
    const selectedCategory = categoryFilter?.value || '';

    const filtered = products.filter(product => {
        const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                            (product.description || '').toLowerCase().includes(searchTerm);
        const matchesCategory = !selectedCategory || 
                              (product.category && product.category !== 'undefined' && 
                               product.category === selectedCategory);
        return matchesSearch && matchesCategory;
    });

    displayProducts(filtered);
}

function filterUsers() {
    const searchTerm = userSearch?.value.toLowerCase() || '';
    const selectedRole = roleFilter?.value || '';

    const filtered = users.filter(user => {
        const matchesSearch = user.username.toLowerCase().includes(searchTerm);
        const matchesRole = !selectedRole || user.role === selectedRole;
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
    if (!confirm('Are you sure you want to delete this product? This will also remove it from all orders.')) {
        return;
    }

    try {
        const response = await fetch(`/products/${productId}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete product');
        }

        showNotification('Product deleted successfully', 'success');
        await loadProducts();
        await loadDashboardData();
    } catch (error) {
        console.error('Error:', error);
        showNotification(error.message || 'Error deleting product', 'error');
    }
}

// User Actions
async function editUser(id, username, role) {
    // Check if trying to edit own profile
    const currentUsername = localStorage.getItem('username');
    if (username === currentUsername) {
        showNotification("You cannot modify your own profile for security reasons", 'error');
        return;
    }

    const modal = document.getElementById('editUserModal');
    const form = document.getElementById('editUserForm');
    const userIdInput = document.getElementById('editUserId');
    const usernameInput = document.getElementById('editUsername');
    const roleInput = document.getElementById('editRole');
    const closeBtn = modal.querySelector('.close');

    if (!modal || !form || !userIdInput || !usernameInput || !roleInput) {
        showNotification('Error: Missing form elements', 'error');
        return;
    }

    // Set up close button functionality
    const closeModal = () => {
        modal.style.display = 'none';
        form.onsubmit = null; // Remove the event listener
    };

    closeBtn.onclick = closeModal;
    window.onclick = (event) => {
        if (event.target === modal) {
            closeModal();
        }
    };

    userIdInput.value = id;
    usernameInput.value = username;
    roleInput.value = role;
    modal.style.display = 'block';

    // Remove any existing event listeners
    form.onsubmit = null;

    // Add new submit event listener
    form.onsubmit = async (e) => {
        e.preventDefault();
        try {
            // Double check to prevent self-modification
            if (username === currentUsername) {
                throw new Error("You cannot modify your own profile");
            }

            const newUsername = usernameInput.value.trim();
            const newRole = roleInput.value;

            if (!newUsername) {
                throw new Error("Username cannot be empty");
            }
            
            const response = await fetch(`/admin/users/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token
                },
                body: JSON.stringify({
                    username: newUsername,
                    role: newRole
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to update user');
            }
            
            closeModal();
            showNotification('User updated successfully', 'success');
            await loadUsers(); // Reload the users list
        } catch (error) {
            console.error('Error updating user:', error);
            showNotification(error.message || 'Error updating user', 'error');
        }
    };
}

async function deleteUser(id) {
    const currentUsername = localStorage.getItem('username');
    const userToDelete = users.find(u => u.id === id);
    
    if (userToDelete && userToDelete.username === currentUsername) {
        showNotification("You cannot delete your own account", 'error');
        return;
    }

    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }

    try {
        const response = await fetch(`/admin/users/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': token }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to delete user');
        }
        
        showNotification('User deleted successfully', 'success');
        await loadUsers(); // Make sure to await the reload
        await loadDashboardData(); // Refresh dashboard data after deletion
    } catch (error) {
        console.error('Error deleting user:', error);
        showNotification(error.message || 'Error deleting user', 'error');
    }
}

// Add this helper function for notifications
function showNotification(message, type = 'info') {
    // Remove any existing notifications first
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '15px 25px';
    notification.style.borderRadius = '5px';
    notification.style.zIndex = '10000';
    notification.style.backgroundColor = type === 'error' ? '#ff4444' : '#44b544';
    notification.style.color = 'white';
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 5000); // Show for 5 seconds
} 