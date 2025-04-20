const Goal = require("../models/Goal");
const GoalTransaction = require("../models/GoalTransaction");
const User = require("../models/User");
const Notification = require("../models/Notification");
const { fetchExchangeRates } = require("./exchange.service");

exports.fetchGoalTransactions = async (userId, goalId, query) => {
  const { type, from, to } = query;

  const filter = {
    userId,
    goalId,
  };

  if (type === "deposit" || type === "withdrawal") {
    filter.type = type;
  }

  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = new Date(from);
    if (to) filter.date.$lte = new Date(to);
  }

  const transactions = await GoalTransaction.find(filter)
    .sort({ date: -1 }); // найновіші спочатку

  return transactions;
};

exports.createTransactionForGoal = async (userId, goalId, data) => {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw new Error("Ціль не знайдено або не належить користувачу.");

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
      const inUAH = data.amount * rates[from];
      amountInBaseCurrency = inUAH / rates[to];
    }
  }

  amountInBaseCurrency = +amountInBaseCurrency.toFixed(2);

  // Перевірка перед зняттям
  if (data.type === "withdrawal" && goal.currentAmount < amountInBaseCurrency) {
    await Notification.create({
      userId,
      type: "system",
      message: `Операція зняття по цілі "${goal.name}" не була додана, оскільки призвела б до від’ємного балансу.`,
      status: "unread",
    });

    throw new Error("Недостатньо коштів у цілі для зняття.");
  }

  const transaction = await GoalTransaction.create({
    userId,
    goalId,
    amount: data.amount,
    currency: data.currency,
    amountInBaseCurrency,
    type: data.type,
    date: data.date || Date.now(),
    note: data.note,
  });

  // Оновлення балансу
  if (data.type === "deposit") {
    goal.currentAmount += amountInBaseCurrency;
  } else if (data.type === "withdrawal") {
    goal.currentAmount -= amountInBaseCurrency;
  }

  await goal.save();

  return transaction;
};

exports.deleteTransactionForGoal = async (userId, goalId, transactionId) => {
  const transaction = await GoalTransaction.findOne({ _id: transactionId, goalId, userId });
  if (!transaction) throw new Error("Операцію не знайдено або вона не належить користувачу.");

  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw new Error("Ціль не знайдено.");

  // Симуляція майбутнього балансу
  let futureBalance = goal.currentAmount;

  if (transaction.type === "deposit") {
    futureBalance -= transaction.amountInBaseCurrency;
  } else if (transaction.type === "withdrawal") {
    futureBalance += transaction.amountInBaseCurrency;
  }

  if (futureBalance < 0) {
    await Notification.create({
      userId,
      type: "system",
      message: `Операцію по цілі "${goal.name}" не було видалено, оскільки це призвело б до від’ємного балансу.`,
      status: "unread",
    });

    throw new Error("Видалення операції призведе до від’ємного балансу цілі.");
  }

  goal.currentAmount = futureBalance;

  await goal.save();
  await GoalTransaction.deleteOne({ _id: transactionId });
};