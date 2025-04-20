const express = require('express');
require('dotenv').config();

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const notificationRoutes = require("./routes/notification.routes");
const exchangeRoutes = require("./routes/exchange.routes");
const budgetRoutes = require("./routes/budget.routes");
const categoryRoutes = require("./routes/category.routes");
const transactionRoutes = require("./routes/transaction.routes");
const goalRoutes = require("./routes/goal.routes");
const goalTransactionRoutes = require("./routes/goalTransaction.routes");

const app = express();

app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/exchange-rates", exchangeRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/goals", goalRoutes);
app.use("/api/goals/:id/transactions", goalTransactionRoutes);

module.exports = app;