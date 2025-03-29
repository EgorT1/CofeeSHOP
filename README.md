# Coffee Shop Online Store

A full-stack web application for an online coffee shop with user authentication and role-based access control.

## Features

- User authentication (login/register)
- Role-based access control (admin/user)
- Product management (CRUD operations)
- Shopping cart functionality
- Order management
- Responsive design

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js with Express
- Database: PostgreSQL
- Authentication: JWT (JSON Web Tokens)

## Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm (Node Package Manager)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd coffee-shop
```

2. Install dependencies:
```bash
npm install
```

3. Create a PostgreSQL database:
```bash
createdb coffee_shop_db
```

4. Run the database schema:
```bash
psql coffee_shop_db < schema.sql
```

5. Configure environment variables:
Create a `.env` file in the root directory with the following content:
```
DB_USER=cofeeSHOP
DB_HOST=localhost
DB_NAME=coffee_shop_db
DB_PASSWORD=gonga
DB_PORT=5432
JWT_SECRET=your_jwt_secret
```

6. Start the server:
```bash
node server.js
```

The application will be available at `http://localhost:3000`

## API Endpoints

### Authentication
- POST `/register` - Register a new user
- POST `/login` - Login user

### Products
- GET `/products` - Get all products
- POST `/products` - Create a new product (admin only)
- PUT `/products/:id` - Update a product (admin only)
- DELETE `/products/:id` - Delete a product (admin only)

### Orders
- POST `/orders` - Create a new order
- GET `/orders` - Get user's orders (or all orders for admin)

## Project Structure

```
coffee-shop/
├── public/
│   ├── css/
│   │   └── style.css
│   ├── js/
│   │   └── main.js
│   └── index.html
├── server.js
├── schema.sql
├── package.json
└── README.md
```

## Security Features

- Password hashing using bcrypt
- JWT-based authentication
- Role-based access control
- SQL injection prevention using parameterized queries
- CORS enabled for API security

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the ISC License.