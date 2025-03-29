-- Insert sample products
INSERT INTO products (name, description, price, image_url, stock_quantity) VALUES
(
    'Ethiopian Yirgacheffe',
    'A bright and floral coffee with notes of jasmine, bergamot, and citrus. Grown at high altitudes in Ethiopia.',
    24.99,
    'images/products/ethiopian-yirgacheffe.jpg',
    50
),
(
    'Colombian Supremo',
    'Rich and balanced with notes of caramel, chocolate, and nuts. Medium roast for perfect everyday coffee.',
    22.99,
    'images/products/colombian-supremo.jpg',
    75
),
(
    'Kenya AA',th
    'Complex and winey with notes of blackberry, grapefruit, and black currant. One of our most popular single-origin coffees.',
    27.99,
    'images/products/kenya-aa.jpg',
    40
),
(
    'Costa Rica Tarrazu',
    'Clean and bright with notes of honey, orange, and almond. Grown in the famous Tarrazu region.',
    25.99,
    'images/products/costa-rica-tarrazu.jpg',
    60
),
(
    'Brazilian Santos',
    'Smooth and nutty with notes of chocolate and hazelnut. Perfect for espresso and dark roasts.',
    21.99,
    'images/products/brazilian-santos.jpg',
    100
),
(
    'Guatemala Antigua',
    'Complex and balanced with notes of cocoa, apple, and spices. Grown in the Antigua Valley.',
    23.99,
    'images/products/guatemala-antigua.jpg',
    55
),
(
    'Sumatra Mandheling',
    'Full-bodied with low acidity and notes of earth, cedar, and dark chocolate. Perfect for dark roast lovers.',
    26.99,
    'images/products/sumatra-mandheling.jpg',
    45
),
(
    'Jamaica Blue Mountain',
    'Premium coffee with a mild, smooth flavor and notes of chocolate, nuts, and citrus. One of the world''s most sought-after coffees.',
    49.99,
    'images/products/jamaica-blue-mountain.jpg',
    30
),
(
    'Tanzania Peaberry',
    'Bright and complex with notes of blackberry, citrus, and floral tones. Unique peaberry beans for a distinctive cup.',
    29.99,
    'images/products/tanzania-peaberry.jpg',
    35
),
(
    'Hawaiian Kona',
    'Smooth and rich with notes of nuts, chocolate, and a hint of fruit. Grown in the volcanic soil of Hawaii.',
    39.99,
    'images/products/hawaiian-kona.jpg',
    25
),
(
    'Nicaragua Maragogype',
    'Large beans with a mild, clean flavor and notes of chocolate and nuts. Known as the "elephant bean" coffee.',
    28.99,
    'images/products/nicaragua-maragogype.jpg',
    40
),
(
    'Rwanda Bourbon',
    'Complex and bright with notes of red berries, citrus, and floral tones. Grown at high altitudes in Rwanda.',
    31.99,
    'images/products/rwanda-bourbon.jpg',
    30
);

-- Insert a default admin user (password: admin123)
INSERT INTO users (username, password, role) VALUES
(
    'admin',
    '$2a$10$rQEk6CA.2/Rk3YWHVPmhKOXHqFH.U8NqrY0nIA9pIFJO.T3H3LKyC',
    'admin'
)
ON CONFLICT (username) DO UPDATE SET password = '$2a$10$rQEk6CA.2/Rk3YWHVPmhKOXHqFH.U8NqrY0nIA9pIFJO.T3H3LKyC';

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role VARCHAR(10) CHECK (role IN ('admin', 'user')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    image_url TEXT,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create orders table
CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    total_amount DECIMAL(10,2) NOT NULL,
    status VARCHAR(20) CHECK (status IN ('pending', 'processing', 'completed', 'cancelled')) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create order_items table
CREATE TABLE IF NOT EXISTS order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER REFERENCES orders(id),
    product_id INTEGER REFERENCES products(id),
    quantity INTEGER NOT NULL,
    price_at_time DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 