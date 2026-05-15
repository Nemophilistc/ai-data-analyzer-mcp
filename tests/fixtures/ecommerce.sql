CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  last_login_at TEXT
);

CREATE TABLE products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  price REAL NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending',
  total_amount REAL NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  paid_at TEXT
);

CREATE TABLE order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price REAL NOT NULL
);

CREATE TABLE cart_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  added_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_reviews_product_id ON reviews(product_id);
CREATE INDEX idx_cart_items_user_id ON cart_items(user_id);

-- Test data: Users
INSERT INTO users (name, email, phone, created_at, last_login_at) VALUES
  ('Alice Wang', 'alice@example.com', '13800000001', '2025-01-15', '2026-05-10'),
  ('Bob Li', 'bob@example.com', '13800000002', '2025-02-20', '2026-05-12'),
  ('Charlie Zhang', NULL, '13800000003', '2025-03-10', '2026-04-01'),
  ('Diana Chen', 'diana@example.com', NULL, '2025-04-05', '2026-05-14'),
  ('Eve Wu', 'eve@example.com', '13800000005', '2025-05-01', '2025-06-01'),
  ('Frank Zhao', 'frank@example.com', '13800000006', '2025-06-15', '2026-05-01'),
  ('Grace Liu', 'grace@example.com', '13800000007', '2025-07-20', '2026-03-15'),
  ('Henry Sun', 'henry@example.com', '13800000008', '2025-08-01', '2026-05-13'),
  ('Ivy Ma', 'ivy@example.com', '13800000009', '2025-09-10', '2025-10-01'),
  ('Jack Huang', 'jack@example.com', '13800000010', '2025-10-15', '2026-05-11');

-- Test data: Products
INSERT INTO products (name, category, price, stock, created_at) VALUES
  ('iPhone 15', 'Electronics', 7999.00, 100, '2025-01-01'),
  ('MacBook Pro', 'Electronics', 14999.00, 50, '2025-01-01'),
  ('AirPods Pro', 'Electronics', 1899.00, 200, '2025-01-15'),
  ('Nike Air Max', 'Shoes', 899.00, 300, '2025-02-01'),
  ('Adidas Ultraboost', 'Shoes', 1099.00, 150, '2025-02-15'),
  ('Levis 501', 'Clothing', 499.00, 500, '2025-03-01'),
  ('Uniqlo T-Shirt', 'Clothing', 99.00, 1000, '2025-03-15'),
  ('Kindle Paperwhite', 'Electronics', 999.00, 80, '2025-04-01'),
  ('Yoga Mat', 'Sports', 199.00, 0, '2025-04-15'),
  ('Water Bottle', 'Sports', 59.00, 2000, '2025-05-01');

-- Test data: Orders
INSERT INTO orders (user_id, status, total_amount, created_at, paid_at) VALUES
  (1, 'completed', 9898.00, '2026-01-10', '2026-01-10'),
  (1, 'completed', 1899.00, '2026-02-15', '2026-02-15'),
  (2, 'completed', 14999.00, '2026-01-20', '2026-01-20'),
  (2, 'shipped', 899.00, '2026-05-01', '2026-05-01'),
  (3, 'pending', 1099.00, '2026-05-10', NULL),
  (4, 'completed', 499.00, '2026-03-01', '2026-03-01'),
  (4, 'completed', 99.00, '2026-04-01', '2026-04-01'),
  (5, 'cancelled', 7999.00, '2025-12-01', NULL),
  (6, 'completed', 2598.00, '2026-04-15', '2026-04-15'),
  (7, 'completed', 999.00, '2026-02-01', '2026-02-01'),
  (8, 'shipped', 1899.00, '2026-05-05', '2026-05-05'),
  (1, 'pending', 199.00, '2026-05-12', NULL),
  (9, 'completed', 99999.99, '2026-01-15', '2026-01-15');

-- Test data: Order items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
  (1, 1, 1, 7999.00),
  (1, 3, 1, 1899.00),
  (2, 3, 1, 1899.00),
  (3, 2, 1, 14999.00),
  (4, 4, 1, 899.00),
  (5, 5, 1, 1099.00),
  (6, 6, 1, 499.00),
  (7, 7, 1, 99.00),
  (8, 1, 1, 7999.00),
  (9, 3, 1, 1899.00),
  (9, 7, 7, 99.00),
  (10, 8, 1, 999.00),
  (11, 3, 1, 1899.00),
  (12, 9, 1, 199.00),
  (13, 2, 1, 99999.99);

-- Test data: Cart items (abandoned carts)
INSERT INTO cart_items (user_id, product_id, quantity, added_at) VALUES
  (3, 1, 1, '2026-05-10'),
  (3, 3, 2, '2026-05-10'),
  (5, 2, 1, '2026-04-20'),
  (10, 4, 1, '2026-05-13');

-- Test data: Reviews
INSERT INTO reviews (user_id, product_id, rating, comment, created_at) VALUES
  (1, 1, 5, 'Great phone!', '2026-02-01'),
  (1, 3, 4, 'Good sound quality', '2026-03-01'),
  (2, 2, 5, 'Best laptop ever', '2026-02-15'),
  (4, 6, 3, 'Average quality', '2026-04-01'),
  (6, 3, 5, 'Love it!', '2026-05-01'),
  (7, 8, 4, 'Good for reading', '2026-03-01');
