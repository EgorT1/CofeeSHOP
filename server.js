const express = require('express');
const bodyParser = require('body-parser');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// Database connection
const pool = new Pool({
    connectionString: `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`
});

// Add connection error handling
pool.on('error', (err) => {
    console.error('Database connection error:', err);
    // Don't exit the process, just log the error
});

// Add connection logging
pool.on('connect', () => {
    console.log('Connected to PostgreSQL database');
});

// Test database connection
pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Error connecting to the database:', err);
    } else {
        console.log('Database connection successful');
    }
});

// Add global error handler
process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
    // Don't exit the process
});

process.on('unhandledRejection', (err) => {
    console.error('Unhandled Rejection:', err);
    // Don't exit the process
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET;

// Authentication middleware
const verifyToken = (req, res, next) => {
    const token = req.headers['authorization'];

    if (!token) {
        return res.status(401).json({ message: 'No token provided' });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(401).json({ message: 'Invalid token' });
        }
        req.user = decoded;
        next();
    });
};

// Admin middleware
const isAdmin = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    try {
        const result = await pool.query('SELECT role FROM users WHERE id = $1;', [req.user.userId]);
        
        if (result.rows[0] && result.rows[0].role === 'admin') {
            next();
        } else {
            res.status(403).json({ message: 'Access denied. Admin privileges required.' });
        }
    } catch (error) {
        console.error('Error checking admin status:', error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Add request logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// Add error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ message: 'Internal server error', error: err.message });
});

// Routes
// User Authentication
app.post('/register', async (req, res) => {
    const { username, password, role } = req.body;

    try {
        const userExists = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (userExists.rows.length > 0) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3)',
            [username, hashedPassword, role || 'user']
        );
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (user.rows.length === 0) {
            return res.status(400).json({ message: 'User not found' });
        }

        const validPassword = await bcrypt.compare(password, user.rows[0].password);
        if (!validPassword) {
            return res.status(400).json({ message: 'Invalid password' });
        }

        const token = jwt.sign(
            { userId: user.rows[0].id, role: user.rows[0].role },
            JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({ token, role: user.rows[0].role });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Products
app.get('/products', async (req, res) => {
    try {
        const products = await pool.query('SELECT * FROM products ORDER BY created_at DESC');
        res.json(products.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/products', verifyToken, isAdmin, async (req, res) => {
    const { name, description, price, image_url, stock_quantity } = req.body;

    try {
        const result = await pool.query(
            'INSERT INTO products (name, description, price, image_url, stock_quantity) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, description, price, image_url, stock_quantity]
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/products/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, description, price, image_url, stock_quantity } = req.body;

    try {
        const result = await pool.query(
            'UPDATE products SET name = $1, description = $2, price = $3, image_url = $4, stock_quantity = $5, updated_at = CURRENT_TIMESTAMP WHERE id = $6 RETURNING *',
            [name, description, price, image_url, stock_quantity, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json(result.rows[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.delete('/products/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        // First delete related order_items
        await pool.query('DELETE FROM order_items WHERE product_id = $1', [id]);
        // Then delete the product
        const result = await pool.query('DELETE FROM products WHERE id = $1 RETURNING *', [id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ message: 'Error deleting product' });
    }
});

// Orders
app.post('/orders', verifyToken, async (req, res) => {
    const { items } = req.body;
    const userId = req.userId;

    try {
        // Start transaction
        await pool.query('BEGIN');

        // Calculate total amount
        let totalAmount = 0;
        for (const item of items) {
            const product = await pool.query('SELECT price FROM products WHERE id = $1', [item.product_id]);
            if (product.rows.length === 0) {
                throw new Error(`Product ${item.product_id} not found`);
            }
            totalAmount += product.rows[0].price * item.quantity;
        }

        // Create order
        const orderResult = await pool.query(
            'INSERT INTO orders (user_id, total_amount) VALUES ($1, $2) RETURNING *',
            [userId, totalAmount]
        );
        const orderId = orderResult.rows[0].id;

        // Create order items
        for (const item of items) {
            await pool.query(
                'INSERT INTO order_items (order_id, product_id, quantity, price_at_time) VALUES ($1, $2, $3, (SELECT price FROM products WHERE id = $2))',
                [orderId, item.product_id, item.quantity]
            );

            // Update stock
            await pool.query(
                'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
                [item.quantity, item.product_id]
            );
        }

        await pool.query('COMMIT');
        res.status(201).json(orderResult.rows[0]);
    } catch (error) {
        await pool.query('ROLLBACK');
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.get('/orders', verifyToken, async (req, res) => {
    try {
        const query = req.role === 'admin'
            ? 'SELECT o.*, u.username FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.created_at DESC'
            : 'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC';
        
        const result = await pool.query(query, req.role === 'admin' ? [] : [req.userId]);
        res.json(result.rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin routes
app.get('/admin/dashboard', verifyToken, isAdmin, async (req, res) => {
    try {
        const [totalProductsResult, totalUsersResult, totalOrdersResult, revenueResult] = await Promise.all([
            pool.query('SELECT COUNT(*) FROM products'),
            pool.query('SELECT COUNT(*) FROM users'),
            pool.query('SELECT COUNT(*) FROM orders'),
            pool.query('SELECT COALESCE(SUM(total_amount), 0) as total FROM orders')
        ]);

        res.json({
            totalProducts: parseInt(totalProductsResult.rows[0].count),
            totalUsers: parseInt(totalUsersResult.rows[0].count),
            totalOrders: parseInt(totalOrdersResult.rows[0].count),
            totalRevenue: parseFloat(revenueResult.rows[0].total) || 0
        });
    } catch (error) {
        console.error('Error fetching dashboard data:', error);
        res.status(500).json({ message: 'Error fetching dashboard data' });
    }
});

app.get('/admin/users', verifyToken, isAdmin, async (req, res) => {
    try {
        const users = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY created_at DESC');
        res.json(users.rows);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.post('/admin/create', verifyToken, isAdmin, async (req, res) => {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, hashedPassword, role]
        );
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Error creating user' });
    }
});

// Update user with isAdmin middleware
app.put('/admin/users/:id', verifyToken, isAdmin, async (req, res) => {
    try {
        const userId = req.params.id;
        const { username, role } = req.body;
        
        if (!['user', 'admin'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        // Check if user exists
        const userResult = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if new username is already taken (if username is being changed)
        if (username !== userResult.rows[0].username) {
            const existingUser = await pool.query('SELECT id FROM users WHERE username = $1 AND id != $2', [username, userId]);
            if (existingUser.rows.length > 0) {
                return res.status(400).json({ message: 'Username already taken' });
            }
        }

        // Update user without updated_at field
        await pool.query(
            'UPDATE users SET username = $1, role = $2 WHERE id = $3',
            [username, role, userId]
        );
        
        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Error updating user' });
    }
});

// Delete user with isAdmin middleware
app.delete('/admin/users/:id', verifyToken, isAdmin, async (req, res) => {
    const userId = req.params.id;
    
    try {
        // Check if trying to delete yourself
        if (userId === req.user.userId.toString()) {
            return res.status(400).json({ message: 'Cannot delete your own account' });
        }

        // Delete the user
        const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING *', [userId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
});

// Token verification endpoint
app.get('/verify-token', verifyToken, (req, res) => {
    res.json({ valid: true });
});

// Delete user
app.delete('/users/:id', verifyToken, async (req, res) => {
    try {
        const userId = req.params.id;
        const [user] = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
        
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Allow deleting any user, including admins
        await pool.query('DELETE FROM users WHERE id = $1', [userId]);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Error deleting user' });
    }
});

// Start server
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});


