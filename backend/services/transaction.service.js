const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Notification = require("../models/Notification");
const Category = require("../models/Category");
const User = require("../models/User");
const { fetchExchangeRates } = require("./exchange.service");

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
  const mongoose = require("mongoose");
  const objectUserId = new mongoose.Types.ObjectId(userId);

  const user = await User.findById(userId);
  if (!user) throw new Error("Користувача не знайдено.");

  const txDate = new Date(data.date || Date.now());
  const month = txDate.getMonth() + 1;
  const year = txDate.getFullYear();

  const budget = await Budget.findOne({
    userId,
    "period.month": month,
    "period.year": year,
  });

  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));

  const monthNames = [
    "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
    "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
  ];
  const periodText = `${monthNames[month - 1]} ${year}`;

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

  if (data.type !== "expense" || !budget) return transaction;

  const categoryLimit = budget.categoryLimits.find((cl) =>
    cl.categoryId.toString() === data.categoryId.toString()
  );

  let categoryName = "";

  if (categoryLimit) {
    const category = await Category.findById(data.categoryId).select("name");
    categoryName = category?.name || "Категорія";

    const catSpentAgg = await Transaction.aggregate([
      {
        $match: {
          userId: objectUserId,
          type: "expense",
          categoryId: new mongoose.Types.ObjectId(data.categoryId),
          date: { $gte: start, $lt: end },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$amountInBaseCurrency" },
        },
      },
    ]);

    const catSpent = catSpentAgg[0]?.total || 0;
    const catPercent = (catSpent / categoryLimit.limit) * 100;

    if (catPercent >= 100) {
      await Notification.create({
        userId,
        type: "budget_limit",
        message: `Категорія "${categoryName}" у бюджеті за ${periodText} перевищила ліміт: витрачено ${catPercent.toFixed(1)}%`,
        status: "unread",
      });
    } else if (catPercent >= 90) {
      await Notification.create({
        userId,
        type: "budget_limit",
        message: `Категорія "${categoryName}" у бюджеті за ${periodText} майже вичерпала ліміт: витрачено ${catPercent.toFixed(1)}%`,
        status: "unread",
      });
    }
  }

  const totalAgg = await Transaction.aggregate([
    {
      $match: {
        userId: objectUserId,
        type: "expense",
        date: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: null,
        total: { $sum: "$amountInBaseCurrency" },
      },
    },
  ]);

  const totalSpent = totalAgg[0]?.total || 0;
  const totalPercent = (totalSpent / budget.totalLimit) * 100;

  if (totalPercent >= 100) {
    await Notification.create({
      userId,
      type: "budget_limit",
      message: `Загальний бюджет за ${periodText} перевищено: витрачено ${totalPercent.toFixed(1)}%`,
      status: "unread",
    });
  } else if (totalPercent >= 90) {
    await Notification.create({
      userId,
      type: "budget_limit",
      message: `Ліміт загального бюджету за ${periodText} майже вичерпано: витрачено (${totalPercent.toFixed(1)}%)`,
      status: "unread",
    });
  }
  
  return transaction;
};

exports.updateUserTransaction = async (userId, transactionId, updates) => {
  const transaction = await Transaction.findOne({ _id: transactionId, userId });
  if (!transaction) throw new Error("Транзакцію не знайдено або вона не ваша.");

  // Оновлюємо значення
  if (updates.amount !== undefined) transaction.amount = updates.amount;
  if (updates.currency !== undefined) transaction.currency = updates.currency;
  if (updates.type !== undefined) transaction.type = updates.type;
  if (updates.categoryId !== undefined) transaction.categoryId = updates.categoryId;
  if (updates.date !== undefined) transaction.date = new Date(updates.date);
  if (updates.note !== undefined) transaction.note = updates.note;

  // Отримуємо користувача
  const user = await User.findById(userId);
  if (!user) throw new Error("Користувача не знайдено.");

  // 🔁 Переобчислюємо amountInBaseCurrency
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
  return transaction;
};

exports.deleteUserTransaction = async (userId, transactionId) => {
  const transaction = await Transaction.findOne({ _id: transactionId, userId });
  if (!transaction) {
    throw new Error("Транзакцію не знайдено або вона не належить користувачу.");
  }

  await Transaction.deleteOne({ _id: transactionId });
};