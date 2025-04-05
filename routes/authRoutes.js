const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const { SECRET } = require("../middleware/authMiddleware");

const router = express.Router();

// Register
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  try {
    await pool.query(
      "INSERT INTO users (name, email, password, role, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())",
      [name, email, hashedPassword, role]
    );
    res.status(201).json({ message: "Registrasi berhasil" });
  } catch (err) {
    res.status(500).json({ message: "Gagal registrasi", error: err.message });
  }
});

// Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const [users] = await pool.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);
    if (users.length === 0)
      return res.status(404).json({ message: "User tidak ditemukan" });

    const user = users[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Password salah" });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      SECRET
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ message: "Gagal login", error: err.message });
  }
});

// Lihat semua users, dengan optional filter berdasarkan role
router.get("/users", async (req, res) => {
  const { role } = req.query;

  try {
    let query = "SELECT id, name, email, role, created_at FROM users";
    const params = [];

    if (role) {
      query += " WHERE role = ?";
      params.push(role);
    }

    const [rows] = await pool.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Gagal ambil data users" });
  }
});

module.exports = router;
