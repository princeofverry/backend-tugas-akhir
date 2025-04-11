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

router.get("/all", authenticateJWT, async (req, res) => {
  // Pastikan user adalah admin atau penjual
  if (req.user.role !== "admin" && req.user.role !== "penjual") {
    return res.status(403).json({ message: "Akses ditolak" });
  }

  try {
    const [rows] = await pool.query(
      `SELECT 
         o.id AS order_id,
         o.user_id,
         o.status,
         o.created_at,
         oi.product_name,
         oi.quantity,
         oi.price
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       ORDER BY o.created_at DESC`
    );

    const orders = {};
    rows.forEach((row) => {
      const {
        order_id,
        user_id,
        status,
        created_at,
        product_name,
        quantity,
        price,
      } = row;

      if (!orders[order_id]) {
        orders[order_id] = {
          order_id,
          user_id,
          status,
          created_at,
          items: [],
        };
      }

      orders[order_id].items.push({
        product_name,
        quantity,
        price,
      });
    });

    res.json(Object.values(orders));
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil semua pesanan",
      error: err.message,
    });
  }
});

// PATCH update status pesanan (admin/penjual)
router.patch("/:id/status", authenticateJWT, async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  const allowedStatuses = [
    "pending",
    "processing",
    "shipped",
    "completed",
    "cancelled",
  ];

  // Hanya admin atau penjual yang bisa mengubah status pesanan
  if (req.user.role !== "admin" && req.user.role !== "penjual") {
    return res.status(403).json({ message: "Akses ditolak" });
  }

  // Validasi status
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ message: "Status tidak valid" });
  }

  try {
    const [result] = await pool.query(
      `UPDATE orders SET status = ?, updated_at = NOW() WHERE id = ?`,
      [status, orderId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan" });
    }

    res.json({
      message: "Status pesanan berhasil diperbarui",
      orderId,
      status,
    });
  } catch (err) {
    res.status(500).json({
      message: "Gagal memperbarui status pesanan",
      error: err.message,
    });
  }
});

// GET semua pesanan lengkap beserta item-nya (riwayat belanja user)
router.get("/detail", authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT 
         o.id AS order_id,
         o.status,
         o.created_at,
         oi.product_name,
         oi.quantity,
         oi.price
       FROM orders o
       JOIN order_items oi ON o.id = oi.order_id
       WHERE o.user_id = ?
       ORDER BY o.created_at DESC`,
      [userId]
    );

    // Kelompokkan data per order_id
    const orders = {};
    rows.forEach((row) => {
      const { order_id, status, created_at, product_name, quantity, price } =
        row;

      if (!orders[order_id]) {
        orders[order_id] = {
          order_id,
          status,
          created_at,
          items: [],
        };
      }

      orders[order_id].items.push({
        product_name,
        quantity,
        price,
      });
    });

    res.json(Object.values(orders));
  } catch (err) {
    res.status(500).json({
      message: "Gagal mengambil detail pesanan",
      error: err.message,
    });
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
