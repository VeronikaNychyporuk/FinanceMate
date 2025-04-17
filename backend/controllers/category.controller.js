const { 
    fetchAllCategories,
    createUserCategory,
    updateUserCategory,
    deleteUserCategory,
} = require("../services/category.service");

exports.getAllCategories = async (req, res) => {
  try {
    const categories = await fetchAllCategories(req.userId);
    res.status(200).json(categories);
  } catch (err) {
    res.status(500).json({ message: "Помилка при отриманні категорій." });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = await createUserCategory(req.userId, req.body);
    res.status(201).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const category = await updateUserCategory(req.userId, req.params.id, req.body);
    res.status(200).json(category);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    await deleteUserCategory(req.userId, req.params.id);
    res.status(200).json({ message: "Категорія успішно видалена." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
