const express = require("express");
const cors = require("cors");
const app = express();
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");

app.use(cors());

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/products", productRoutes);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
