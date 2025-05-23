const Budget = require("../models/Budget");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");

exports.fetchAllBudgets = async (userId) => {
  const budgets = await Budget.find({ userId })
    .populate("categoryLimits.categoryId", "name type icon")
    .sort({ "period.year": -1, "period.month": -1 });

  return budgets;
};

exports.fetchBudgetByDate = async (userId, month, year) => {
  const budget = await Budget.findOne({
    userId,
    "period.month": month,
    "period.year": year,
  }).populate("categoryLimits.categoryId", "name type icon");

  return budget;
};

exports.createUserBudget = async (userId, data) => {
  const exists = await Budget.findOne({
    userId,
    "period.month": data.period.month,
    "period.year": data.period.year,
  });

  if (exists) {
    throw new Error("Бюджет на цей місяць вже існує.");
  }

  const totalCategoryLimit = (data.categoryLimits || []).reduce((sum, item) => sum + item.limit, 0);

  if (totalCategoryLimit > data.totalLimit) {
    throw new Error("Сума лімітів по категоріях перевищує загальний бюджет.");
  }

  const budget = await Budget.create({
    userId,
    totalLimit: data.totalLimit,
    period: data.period,
    categoryLimits: data.categoryLimits || [],
  });

  return budget;
};

exports.updateUserBudget = async (userId, budgetId, updates) => {
  const budget = await Budget.findOne({ _id: budgetId, userId });

  if (!budget) {
    throw new Error("Бюджет не знайдено або не належить користувачу.");
  }

  const newTotalLimit = updates.totalLimit ?? budget.totalLimit;
  const newCategoryLimits = updates.categoryLimits ?? budget.categoryLimits;

  const isChangingPeriod =
    updates.period &&
    (updates.period.month !== budget.period.month ||
     updates.period.year !== budget.period.year);

  if (isChangingPeriod) {
    const duplicate = await Budget.findOne({
      userId,
      "period.month": updates.period.month,
      "period.year": updates.period.year,
      _id: { $ne: budgetId }, // виключаємо поточний бюджет
    });

    if (duplicate) {
      throw new Error("Бюджет на цю дату вже існує.");
    }
  }

  const categoryTotal = newCategoryLimits.reduce((sum, item) => sum + item.limit, 0);
  if (categoryTotal > newTotalLimit) {
    throw new Error("Сума категорійних лімітів перевищує загальний ліміт бюджету.");
  }

  // 🛠 Оновлення полів
  if (updates.totalLimit !== undefined) budget.totalLimit = updates.totalLimit;
  if (updates.period !== undefined) budget.period = updates.period;
  if (updates.categoryLimits !== undefined) budget.categoryLimits = updates.categoryLimits;

  await budget.save();
  return budget;
};

exports.deleteUserBudget = async (userId, budgetId) => {
  const budget = await Budget.findOne({ _id: budgetId, userId });

  if (!budget) {
    throw new Error("Бюджет не знайдено або не належить користувачу.");
  }

  await Budget.deleteOne({ _id: budgetId });
};

exports.generateBudgetOverview = async (userId, month, year) => {
  const budget = await Budget.findOne({
    userId,
    "period.month": month,
    "period.year": year,
  }).populate("categoryLimits.categoryId", "name type icon");

  if (!budget) {
    throw new Error("Бюджет не знайдено.");
  }

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 1);

  const transactions = await Transaction.find({
    userId,
    type: "expense",
    date: { $gte: startDate, $lt: endDate },
  });

  // ✅ Рахуємо загальні витрати по всіх транзакціях
  const totalSpent = transactions.reduce((sum, tx) => sum + tx.amountInBaseCurrency, 0);

  // ✅ Групуємо тільки ті транзакції, які мають категорії
  const expensesByCategory = {};
  for (const tx of transactions) {
    const catId = tx.categoryId?.toString();
    if (catId) {
      expensesByCategory[catId] = (expensesByCategory[catId] || 0) + tx.amountInBaseCurrency;
    }
  }

  const categories = budget.categoryLimits.map((limit) => {
    const cat = limit.categoryId;
    const spent = expensesByCategory[cat._id.toString()] || 0;
    const percentage = Math.min((spent / limit.limit) * 100, 100).toFixed(2);

    return {
      categoryId: cat._id,
      name: cat.name,
      icon: cat.icon,
      limit: limit.limit,
      spent: +spent.toFixed(2),
      percentage: Number(percentage),
      exceeded: spent > limit.limit,
    };
  });

  const totalLimit = budget.totalLimit;
  const totalPercentage = Math.min((totalSpent / totalLimit) * 100, 100).toFixed(2);

  return {
    period: budget.period,
    totalLimit,
    totalSpent: +totalSpent.toFixed(2),
    totalPercentage: Number(totalPercentage),
    exceeded: totalSpent > totalLimit,
    categories,
  };
};
