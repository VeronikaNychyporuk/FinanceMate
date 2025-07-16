const RecurringTransaction = require("../models/RecurringTransaction");
const Category = require("../models/Category");
const User = require("../models/User");

exports.fetchRecurringTransactions = async (userId, query) => {
  const { type, category, isActive, frequency } = query;

  const filter = { userId };

  if (type === "income" || type === "expense") {
    filter.type = type;
  }

  if (category) {
    filter.categoryId = category;
  }

  if (isActive !== undefined) {
    if (isActive === "true") filter.isActive = true;
    else if (isActive === "false") filter.isActive = false;
  }

  if (["daily", "weekly", "monthly", "yearly"].includes(frequency)) {
    filter.frequency = frequency;
  }

  const transactions = await RecurringTransaction.find(filter)
    .sort({ nextRun: 1 })
    .populate("categoryId", "name type icon");

  return transactions;
};

exports.fetchRecurringTransactionById = async (userId, transactionId) => {
  const transaction = await RecurringTransaction.findOne({
    _id: transactionId,
    userId,
  }).populate("categoryId", "name type icon");

  return transaction;
};


exports.createRecurringTransaction = async (userId, data) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("Користувача не знайдено.");

  const recurring = await RecurringTransaction.create({
    ...data,
    userId,
    nextRun: data.startDate,
  });

  return recurring;
};

exports.updateRecurringTransaction = async (userId, transactionId, updates) => {
  const transaction = await RecurringTransaction.findOne({ _id: transactionId, userId });
  if (!transaction) throw new Error("Регулярний платіж не знайдено або не належить користувачу.");

  const originalStartDate = transaction.startDate;
  const originalFrequency = transaction.frequency;

  // --- Оновлення полів, які напряму записуються ---
  if (updates.amount !== undefined) transaction.amount = updates.amount;
  if (updates.currency !== undefined) transaction.currency = updates.currency;
  if (updates.note !== undefined) transaction.note = updates.note;
  if (updates.frequency !== undefined) transaction.frequency = updates.frequency;
  if (updates.startDate !== undefined) transaction.startDate = new Date(updates.startDate);
  if (updates.endDate !== undefined) transaction.endDate = new Date(updates.endDate);
  if (updates.isActive !== undefined) transaction.isActive = updates.isActive;

  // --- Перевірка: чи існує категорія ---
  if (updates.categoryId !== undefined) {
    const newCategory = await Category.findById(updates.categoryId);
    if (!newCategory) throw new Error("Нову категорію не знайдено.");
    transaction.categoryId = updates.categoryId;

    // Оновлення типу, якщо він відрізняється
    if (newCategory.type !== transaction.type) {
      transaction.type = newCategory.type;
    }
  }

  // --- Перевірка валідності дат ---
  if (transaction.endDate && transaction.startDate > transaction.endDate) {
    throw new Error("Дата початку не може бути пізнішою за дату завершення.");
  }

  // --- Перерахунок nextRun ---
  const startDateChanged = updates.startDate !== undefined;
  const frequencyChanged = updates.frequency !== undefined;

  if (startDateChanged || frequencyChanged) {
    // Якщо дата змінилась — nextRun завжди оновлюється на нову стартову дату
    transaction.nextRun = new Date(transaction.startDate);
  }

  // --- Оновлення isActive на основі дат (тільки якщо isActive не було явно задано) ---
  if (updates.isActive === undefined && transaction.endDate) {
    if (transaction.nextRun > transaction.endDate) {
      transaction.isActive = false;
    } else {
      transaction.isActive = true;
    }
  }

  await transaction.save();

  return transaction;
};

exports.deleteRecurringTransaction = async (userId, id) => {
  const transaction = await RecurringTransaction.findOne({ _id: id, userId });
  if (!transaction) throw new Error("Регулярний платіж не знайдено або не належить користувачу.");

  await RecurringTransaction.deleteOne({ _id: id });
};
