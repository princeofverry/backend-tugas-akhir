Build from heart to heart........

there is our query:

CREATE TABLE users (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(255),
email VARCHAR(255) UNIQUE,
password VARCHAR(255),
role ENUM('penjual', 'pembeli'),
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE product_categories (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(255),
description TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
id INT AUTO_INCREMENT PRIMARY KEY,
name VARCHAR(255),
description TEXT,
price DECIMAL(10,2),
stock INT CHECK (stock >= 0),
user_id INT,
category_id INT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users(id),
FOREIGN KEY (category_id) REFERENCES product_categories(id)
);

CREATE TABLE carts (
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
product_id INT,
quantity INT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users(id),
FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE orders (
id INT AUTO_INCREMENT PRIMARY KEY,
user_id INT,
total_price DECIMAL(10,2),
status ENUM('pending', 'processing', 'shipped', 'completed', 'cancelled'),
shipping_address TEXT,
created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE order_items (
id INT AUTO_INCREMENT PRIMARY KEY,
order_id INT,
product_id INT,
product_name VARCHAR(255),
quantity INT,
price DECIMAL(10,2),
FOREIGN KEY (order_id) REFERENCES orders(id),
FOREIGN KEY (product_id) REFERENCES products(id)
);

INSERT INTO product_categories (name, description, created_at, updated_at) VALUES
("Elektronik", "Produk elektronik seperti HP, laptop, dll", NOW(), NOW()),
("Fashion", "Pakaian, sepatu, dan aksesoris", NOW(), NOW()),
("Makanan", "Makanan ringan, minuman, dll", NOW(), NOW()),
("Alat Rumah Tangga", "Peralatan dapur, kebersihan, dll", NOW(), NOW());

ALTER TABLE products
ADD COLUMN deleted_at DATETIME DEFAULT NULL;
