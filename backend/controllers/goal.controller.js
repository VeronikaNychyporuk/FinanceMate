const { 
    fetchGoals,
    fetchGoalById,
    createUserGoal,
    updateUserGoal,
    deleteUserGoal,
} = require("../services/goal.service");

exports.getGoals = async (req, res) => {
  try {
    const goals = await fetchGoals(req.userId);
    res.status(200).json(goals);
  } catch (err) {
    res.status(500).json({ message: "Не вдалося отримати цілі." });
  }
};

exports.getGoalById = async (req, res) => {
  try {
    const goal = await fetchGoalById(req.userId, req.params.id);
    if (!goal) {
      return res.status(404).json({ message: "Ціль не знайдено." });
    }
    res.status(200).json(goal);
  } catch (err) {
    res.status(400).json({ message: "Помилка при отриманні цілі." });
  }
};

exports.createGoal = async (req, res) => {
  try {
    const goal = await createUserGoal(req.userId, req.body);
    res.status(201).json(goal);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateGoal = async (req, res) => {
  try {
    const updated = await updateUserGoal(req.userId, req.params.id, req.body);
    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteGoal = async (req, res) => {
  try {
    await deleteUserGoal(req.userId, req.params.id);
    res.status(200).json({ message: "Ціль успішно видалена." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};