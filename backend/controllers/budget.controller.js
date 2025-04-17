const { 
  fetchAllBudgets,
  fetchBudgetByDate,
  createUserBudget,
  updateUserBudget,
  deleteUserBudget,
  generateBudgetOverview,
} = require("../services/budget.service");

exports.getAllBudgets = async (req, res) => {
  try {
    const budgets = await fetchAllBudgets(req.userId);
    res.status(200).json(budgets);
  } catch (err) {
    res.status(500).json({ message: "Помилка при отриманні бюджетів." });
  }
};

exports.getBudgetByDate = async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ message: "Потрібно вказати і місяць, і рік." });
  }

  try {
    const budget = await fetchBudgetByDate(req.userId, parseInt(month), parseInt(year));
    if (!budget) {
      return res.status(404).json({ message: "Бюджет не знайдено." });
    }

    res.status(200).json(budget);
  } catch (err) {
    res.status(500).json({ message: "Помилка при отриманні бюджету." });
  }
};

exports.createBudget = async (req, res) => {
  try {
    const budget = await createUserBudget(req.userId, req.body);
    res.status(201).json(budget);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateBudget = async (req, res) => {
  try {
    const updatedBudget = await updateUserBudget(req.userId, req.params.id, req.body);
    res.status(200).json(updatedBudget);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    await deleteUserBudget(req.userId, req.params.id);
    res.status(200).json({ message: "Бюджет успішно видалено." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.getBudgetOverview = async (req, res) => {
  const { month, year } = req.query;

  if (!month || !year) {
    return res.status(400).json({ message: "Необхідно вказати місяць і рік." });
  }

  try {
    const overview = await generateBudgetOverview(req.userId, parseInt(month), parseInt(year));
    res.status(200).json(overview);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
