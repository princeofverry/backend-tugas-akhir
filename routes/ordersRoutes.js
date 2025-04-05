// routes/orders.js
const express = require("express");
const pool = require("../db");
const { authenticateJWT } = require("../middleware/authMiddleware");

const router = express.Router();

// POST buat pesanan baru dari keranjang user
router.post("/", authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { shipping_address } = req.body;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [cartItems] = await conn.query(
      `SELECT c.product_id, c.quantity, p.price, p.name
       FROM carts c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ?`,
      [userId]
    );

    if (cartItems.length === 0) {
      await conn.release();
      return res.status(400).json({ message: "Keranjang kosong" });
    }

    const totalPrice = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    const [orderResult] = await conn.query(
      `INSERT INTO orders (user_id, total_price, status, shipping_address, created_at, updated_at)
       VALUES (?, ?, 'pending', ?, NOW(), NOW())`,
      [userId, totalPrice, shipping_address]
    );

    const orderId = orderResult.insertId;

    for (const item of cartItems) {
      await conn.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, price)
         VALUES (?, ?, ?, ?, ?)`,
        [orderId, item.product_id, item.name, item.quantity, item.price]
      );
    }

    await conn.query(`DELETE FROM carts WHERE user_id = ?`, [userId]);

    await conn.commit();
    res.status(201).json({ message: "Pesanan berhasil dibuat", orderId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: "Gagal buat pesanan", error: err.message });
  } finally {
    conn.release();
  }
});

// GET semua pesanan milik user yang login
router.get("/", authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    const [orders] = await pool.query(
      `SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC`,
      [userId]
    );
    res.json(orders);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal ambil pesanan", error: err.message });
  }
});

// GET detail order by ID milik user
router.get("/:id", authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const orderId = req.params.id;

  try {
    const [[order]] = await pool.query(
      `SELECT * FROM orders WHERE id = ? AND user_id = ?`,
      [orderId, userId]
    );

    if (!order)
      return res.status(404).json({ message: "Pesanan tidak ditemukan" });

    const [items] = await pool.query(
      `SELECT product_name, quantity, price FROM order_items WHERE order_id = ?`,
      [orderId]
    );

    res.json({ ...order, items });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal ambil detail pesanan", error: err.message });
  }
});

module.exports = router;
