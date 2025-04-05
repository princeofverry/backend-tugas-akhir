// routes/carts.js
const express = require("express");
const pool = require("../db");
const { authenticateJWT } = require("../middleware/authMiddleware");

const router = express.Router();

// GET semua item keranjang milik user yang login
router.get("/", authenticateJWT, async (req, res) => {
  const userId = req.user.id;

  try {
    const [rows] = await pool.query(
      `SELECT c.id, p.name, p.price, c.quantity, (p.price * c.quantity) AS total 
       FROM carts c
       JOIN products p ON c.product_id = p.id
       WHERE c.user_id = ?`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal ambil keranjang", error: err.message });
  }
});

// POST tambah item ke keranjang
router.post("/", authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const { product_id, quantity } = req.body;

  try {
    await pool.query(
      `INSERT INTO carts (user_id, product_id, quantity, created_at, updated_at) 
       VALUES (?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE quantity = quantity + VALUES(quantity), updated_at = NOW()`,
      [userId, product_id, quantity]
    );
    res.status(201).json({ message: "Item ditambahkan ke keranjang" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Gagal tambah ke keranjang", error: err.message });
  }
});

// DELETE item dari keranjang
router.delete("/:id", authenticateJWT, async (req, res) => {
  const userId = req.user.id;
  const cartId = req.params.id;

  try {
    await pool.query(`DELETE FROM carts WHERE id = ? AND user_id = ?`, [
      cartId,
      userId,
    ]);
    res.json({ message: "Item dihapus dari keranjang" });
  } catch (err) {
    res.status(500).json({ message: "Gagal hapus item", error: err.message });
  }
});

module.exports = router;
