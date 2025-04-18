const Budget = require("../models/Budget");
const Notification = require("../models/Notification");
const Category = require("../models/Category");
const mongoose = require("mongoose");

const monthNames = [
  "Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень",
  "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"
];

exports.checkBudgetLimits = async (transaction) => {
  if (transaction.type !== "expense") return;

  const userId = transaction.userId;
  const objectUserId = new mongoose.Types.ObjectId(userId);
  const txDate = new Date(transaction.date || Date.now());
  const month = txDate.getMonth() + 1;
  const year = txDate.getFullYear();
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 1));
  const periodText = `${monthNames[month - 1]} ${year}`;

  const budget = await Budget.findOne({
    userId,
    "period.month": month,
    "period.year": year,
  });

  if (!budget) return;

  // === Перевірка по категорії (якщо є)
  const categoryLimit = budget.categoryLimits.find((cl) =>
    cl.categoryId.toString() === transaction.categoryId.toString()
  );

  if (categoryLimit) {
    const category = await Category.findById(transaction.categoryId).select("name");
    const categoryName = category?.name || "Категорія";

    const catSpentAgg = await transaction.constructor.aggregate([
      {
        $match: {
          userId: objectUserId,
          type: "expense",
          categoryId: new mongoose.Types.ObjectId(transaction.categoryId),
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

  // === Перевірка загального бюджету
  const totalAgg = await transaction.constructor.aggregate([
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
};