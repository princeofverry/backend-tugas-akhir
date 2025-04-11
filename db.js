const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "verry",
  database: "tugas_akhir_sbd",
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
