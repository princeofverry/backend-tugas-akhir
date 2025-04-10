const express = require("express");
const pool = require("../db");
const { authenticateJWT } = require("../middleware/authMiddleware");
const checkRole = require("../middleware/checkRole");

const router = express.Router();

// ✅ GET semua produk yang sudah dihapus (butuh login & role penjual)
router.get(
  "/deleted",
  authenticateJWT,
  checkRole("penjual"),
  async (req, res) => {
    const user_id = req.user.id;

    try {
      const [rows] = await pool.query(
        "SELECT * FROM products WHERE deleted_at IS NOT NULL AND user_id = ?",
        [user_id]
      );
      res.json(rows);
    } catch (err) {
      res.status(500).json({ message: "Gagal ambil produk yang dihapus" });
    }
  }
);

// ✅ PUT untuk memulihkan produk (soft delete undo)
router.put(
  "/restore/:id",
  authenticateJWT,
  checkRole("penjual"),
  async (req, res) => {
    const productId = req.params.id;
    const user_id = req.user.id;

    try {
      const [result] = await pool.query(
        "UPDATE products SET deleted_at = NULL, updated_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL",
        [productId, user_id]
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Produk tidak ditemukan atau bukan milik Anda" });
      }

      res.json({ message: "Produk berhasil dipulihkan" });
    } catch (err) {
      res.status(500).json({ message: "Gagal memulihkan produk" });
    }
  }
);

// ✅ GET semua produk (yang belum dihapus)
router.get("/", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM products WHERE deleted_at IS NULL"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil produk" });
  }
});

// ✅ GET produk by id (HARUS DITARUH SETELAH /deleted agar tidak konflik)
router.get("/:id", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM products WHERE id = ? AND deleted_at IS NULL",
      [req.params.id]
    );
    if (rows.length === 0)
      return res.status(404).json({ message: "Produk tidak ditemukan" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil produk" });
  }
});

// ✅ POST tambah produk
router.post("/", authenticateJWT, checkRole("penjual"), async (req, res) => {
  const { name, description, price, stock, category_id, image_url } = req.body; // tambah image_url
  const user_id = req.user.id;

  try {
    await pool.query(
      "INSERT INTO products (name, description, price, stock, user_id, category_id, image_url, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [name, description, price, stock, user_id, category_id, image_url] // tambah image_url
    );
    res.status(201).json({ message: "Produk ditambahkan" });
  } catch (err) {
    res.status(500).json({ message: "Gagal tambah produk" });
  }
});

// ✅ PUT edit produk
router.put("/:id", authenticateJWT, checkRole("penjual"), async (req, res) => {
  const { name, description, price, stock, category_id, image_url } = req.body; // tambah image_url
  const productId = req.params.id;
  const user_id = req.user.id;

  try {
    const [result] = await pool.query(
      "UPDATE products SET name = ?, description = ?, price = ?, stock = ?, category_id = ?, image_url = ?, updated_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
      [
        name,
        description,
        price,
        stock,
        category_id,
        image_url,
        productId,
        user_id,
      ] // tambah image_url
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Produk tidak ditemukan atau bukan milik Anda" });
    }

    res.json({ message: "Produk berhasil diperbarui" });
  } catch (err) {
    res.status(500).json({ message: "Gagal edit produk" });
  }
});

// ✅ DELETE soft delete produk
router.delete(
  "/:id",
  authenticateJWT,
  checkRole("penjual"),
  async (req, res) => {
    const productId = req.params.id;
    const user_id = req.user.id;

    try {
      const [result] = await pool.query(
        "UPDATE products SET deleted_at = NOW() WHERE id = ? AND user_id = ? AND deleted_at IS NULL",
        [productId, user_id]
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ message: "Produk tidak ditemukan atau sudah dihapus" });
      }

      res.json({ message: "Produk berhasil dihapus" });
    } catch (err) {
      res.status(500).json({ message: "Gagal hapus produk" });
    }
  }
);

// ✅ DELETE permanen produk
router.delete(
  "/permanent/:id",
  authenticateJWT,
  checkRole("penjual"),
  async (req, res) => {
    const productId = req.params.id;
    const user_id = req.user.id;

    try {
      const [result] = await pool.query(
        "DELETE FROM products WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL",
        [productId, user_id]
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({
            message:
              "Produk tidak ditemukan, bukan milik Anda, atau belum dihapus",
          });
      }

      res.json({ message: "Produk berhasil dihapus secara permanen" });
    } catch (err) {
      res
        .status(500)
        .json({ message: "Gagal menghapus produk secara permanen" });
    }
  }
);

module.exports = router;
