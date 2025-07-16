const {
  fetchRecurringTransactions,
  fetchRecurringTransactionById,
  createRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
} = require("../services/recurringTransaction.service");

exports.getRecurringTransactions = async (req, res) => {
  try {
    const transactions = await fetchRecurringTransactions(req.userId, req.query);
    res.status(200).json(transactions);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getRecurringTransactionById = async (req, res) => {
  try {
    const transaction = await fetchRecurringTransactionById(req.userId, req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Регулярний платіж не знайдено." });
    }

    res.status(200).json(transaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.createRecurringTransaction = async (req, res) => {
  try {
    const transaction = await createRecurringTransaction(req.userId, req.body);
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateRecurringTransaction = async (req, res) => {
  try {
    const updated = await updateRecurringTransaction(req.userId, req.params.id, req.body);
    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteRecurringTransaction = async (req, res) => {
  try {
    await deleteRecurringTransaction(req.userId, req.params.id);
    res.status(200).json({ message: "Регулярний платіж успішно видалено." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};