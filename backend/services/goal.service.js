const Goal = require("../models/Goal");
const GoalTransaction = require("../models/GoalTransaction");

exports.fetchGoals = async (userId) => {
  const goals = await Goal.find({ userId }).sort({ createdAt: -1 });

  const result = goals.map((goal) => {
    const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

    return {
      _id: goal._id,
      name: goal.name,
      targetAmount: goal.targetAmount,
      currentAmount: +goal.currentAmount.toFixed(2),
      deadline: goal.deadline,
      status: goal.status,
      createdAt: goal.createdAt,
      progress: +progress.toFixed(1),
    };
  });

  return result;
};

exports.fetchGoalById = async (userId, goalId) => {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) return null;

  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

  return {
    _id: goal._id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: +goal.currentAmount.toFixed(2),
    deadline: goal.deadline,
    status: goal.status,
    createdAt: goal.createdAt,
    progress: +progress.toFixed(1),
  };
};

exports.createUserGoal = async (userId, data) => {
  const goal = await Goal.create({
    userId,
    name: data.name,
    targetAmount: data.targetAmount,
    deadline: data.deadline,
  });

  return {
    _id: goal._id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    deadline: goal.deadline,
    status: goal.status,
    createdAt: goal.createdAt,
    progress: 0,
  };
};

exports.updateUserGoal = async (userId, goalId, updates) => {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) throw new Error("Ціль не знайдено або вона не належить користувачу.");

  if (updates.name !== undefined) goal.name = updates.name;
  if (updates.targetAmount !== undefined) goal.targetAmount = updates.targetAmount;
  if (updates.deadline !== undefined) goal.deadline = new Date(updates.deadline);

  await goal.save();

  const progress = Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);

  return {
    _id: goal._id,
    name: goal.name,
    targetAmount: goal.targetAmount,
    currentAmount: +goal.currentAmount.toFixed(2),
    deadline: goal.deadline,
    status: goal.status,
    createdAt: goal.createdAt,
    progress: +progress.toFixed(1),
  };
};

exports.deleteUserGoal = async (userId, goalId) => {
  const goal = await Goal.findOne({ _id: goalId, userId });
  if (!goal) {
    throw new Error("Ціль не знайдено або вона не належить користувачу.");
  }

  await GoalTransaction.deleteMany({ goalId, userId });
  await Goal.deleteOne({ _id: goalId });
};