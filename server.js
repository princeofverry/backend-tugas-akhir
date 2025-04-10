const express = require("express");
const cors = require("cors");
const app = express();
const authRoutes = require("./routes/authRoutes");
const productRoutes = require("./routes/productRoutes");
const cartsRoutes = require("./routes/cartsRoutes");
const ordersRoutes = require("./routes/ordersRoutes");
const categoryRoutes = require("./routes/categoryRoutes");

app.use(cors());

app.use(express.json());
app.use("/auth", authRoutes);
app.use("/products", productRoutes);

app.use("/orders", ordersRoutes);
app.use("/carts", cartsRoutes);
app.use("/categories", categoryRoutes);

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
