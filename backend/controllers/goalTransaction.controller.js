const {
    fetchGoalTransactions,
    createTransactionForGoal,
    deleteTransactionForGoal,
} = require("../services/goalTransaction.service");

exports.getGoalTransactions = async (req, res) => {
  try {
    const transactions = await fetchGoalTransactions(req.userId, req.params.goalId, req.query);
    res.status(200).json(transactions);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.createGoalTransaction = async (req, res) => {
  try {
    const transaction = await createTransactionForGoal(req.userId, req.params.goalId, req.body);
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteGoalTransaction = async (req, res) => {
  try {
    await deleteTransactionForGoal(req.userId, req.params.goalId, req.params.transactionId);
    res.status(200).json({ message: "Операція успішно видалена." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};