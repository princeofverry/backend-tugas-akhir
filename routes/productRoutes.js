const express = require("express");
const pool = require("../db");
const { authenticateJWT } = require("../middleware/authMiddleware");
const checkRole = require("../middleware/checkRole");

const router = express.Router();

// GET semua produk
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM products");
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil produk" });
  }
});

// GET produk by id
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM products WHERE id = ?", [
      req.params.id,
    ]);
    if (rows.length === 0)
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil produk" });
  }
});

// POST tambah produk (butuh login & role penjual)
router.post("/", authenticateJWT, checkRole("penjual"), async (req, res) => {
  const { name, description, price, stock, category_id } = req.body;
  const user_id = req.user.id;

  try {
    await pool.query(
      "INSERT INTO products (name, description, price, stock, user_id, category_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [name, description, price, stock, user_id, category_id]
    );
    res.status(201).json({ message: "Produk ditambahkan" });
  } catch (err) {
    res.status(500).json({ message: "Gagal tambah produk" });
  }
});

module.exports = router;
