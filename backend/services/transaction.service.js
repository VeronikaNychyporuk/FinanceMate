const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Notification = require("../models/Notification");
const Category = require("../models/Category");
const User = require("../models/User");
const { fetchExchangeRates } = require("./exchange.service");
const { checkBudgetLimits } = require("../utils/transactionBudgetChecker");

exports.fetchTransactions = async (userId, query) => {
  const { type, from, to, category } = query;

  const filter = { userId };

  if (type === "income" || type === "expense") {
    filter.type = type;
  }

  if (category) {
    filter.categoryId = category;
  }

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const transactions = await Transaction.find(filter)
    .sort({ date: -1 })
    .populate("categoryId", "name type icon");

  return transactions;
};

exports.fetchTransactionById = async (userId, transactionId) => {
  const transaction = await Transaction.findOne({
    _id: transactionId,
    userId,
  }).populate("categoryId", "name type icon");

  return transaction;
};

exports.createUserTransaction = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("Користувача не знайдено.");

  const rates = await fetchExchangeRates();
  let amountInBaseCurrency = data.amount;

  if (data.currency !== user.currency) {
    const from = data.currency;
    const to = user.currency;

    if (from === "UAH") {
      amountInBaseCurrency = data.amount / rates[to];
    } else if (to === "UAH") {
      amountInBaseCurrency = data.amount * rates[from];
    } else {
      const amountInUAH = data.amount * rates[from];
      amountInBaseCurrency = amountInUAH / rates[to];
    }
  }

  amountInBaseCurrency = +amountInBaseCurrency.toFixed(2);

  const transaction = await Transaction.create({
    ...data,
    userId,
    amountInBaseCurrency,
  });

  await checkBudgetLimits(transaction);

  return transaction;
};

exports.updateUserTransaction = async (userId, transactionId, updates) => {
  const transaction = await Transaction.findOne({ _id: transactionId, userId });
  if (!transaction) throw new Error("Транзакцію не знайдено або вона не ваша.");

  if (updates.amount !== undefined) transaction.amount = updates.amount;
  if (updates.currency !== undefined) transaction.currency = updates.currency;
  if (updates.categoryId !== undefined) {
    transaction.categoryId = updates.categoryId;

    // 🔁 Якщо змінилася категорія — перевірити її тип
    const newCategory = await Category.findById(updates.categoryId);
    if (!newCategory) throw new Error("Нову категорію не знайдено.");

    if (newCategory.type !== transaction.type) {
      transaction.type = newCategory.type;
    }
  }
  if (updates.date !== undefined) transaction.date = new Date(updates.date);
  if (updates.note !== undefined) transaction.note = updates.note;

  // 🔁 Перерахунок валюти
  const user = await User.findById(userId);
  if (!user) throw new Error("Користувача не знайдено.");

  const rates = await fetchExchangeRates();
  const from = transaction.currency;
  const to = user.currency;

  let amountInBase = transaction.amount;

  if (from !== to) {
    if (from === "UAH") {
      amountInBase = transaction.amount / rates[to];
    } else if (to === "UAH") {
      amountInBase = transaction.amount * rates[from];
    } else {
      const inUAH = transaction.amount * rates[from];
      amountInBase = inUAH / rates[to];
    }
  }

  transaction.amountInBaseCurrency = +amountInBase.toFixed(2);

  await transaction.save();
  await checkBudgetLimits(transaction);

  return transaction;
};

exports.deleteUserTransaction = async (userId, transactionId) => {
  const transaction = await Transaction.findOne({ _id: transactionId, userId });
  if (!transaction) {
    throw new Error("Транзакцію не знайдено або вона не належить користувачу.");
  }

  await Transaction.deleteOne({ _id: transactionId });
};