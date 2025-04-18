const { 
    fetchTransactions,
    fetchTransactionById,
    createUserTransaction,
    updateUserTransaction,
    deleteUserTransaction,
} = require("../services/transaction.service");

exports.getTransactions = async (req, res) => {
  try {
    const transactions = await fetchTransactions(req.userId, req.query);
    res.status(200).json(transactions);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const transaction = await fetchTransactionById(req.userId, req.params.id);

    if (!transaction) {
      return res.status(404).json({ message: "Транзакцію не знайдено." });
    }

    res.status(200).json(transaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.createTransaction = async (req, res) => {
  try {
    const transaction = await createUserTransaction(req.userId, req.body);
    res.status(201).json(transaction);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateTransaction = async (req, res) => {
  try {
    const updated = await updateUserTransaction(req.userId, req.params.id, req.body);
    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteTransaction = async (req, res) => {
  try {
    await deleteUserTransaction(req.userId, req.params.id);
    res.status(200).json({ message: "Транзакція успішно видалена." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};