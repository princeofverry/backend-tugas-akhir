const express = require("express");
const pool = require("../db");

const router = express.Router();

// GET semua kategori
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, name FROM product_categories");
    res.json(rows);
  } catch (err) {
    console.error("Gagal ambil kategori:", err);
    res.status(500).json({ message: "Gagal ambil kategori" });
  }
});

module.exports = router;
