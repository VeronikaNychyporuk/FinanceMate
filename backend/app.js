const express = require('express');
require('dotenv').config();

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const notificationRoutes = require("./routes/notification.routes");
const exchangeRoutes = require("./routes/exchange.routes");

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/exchange-rates", exchangeRoutes);

module.exports = app;