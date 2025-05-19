const Category = require("../models/Category");

exports.fetchAllCategories = async (userId) => {
  const categories = await Category.find({
    $or: [
      { userId: null },           // дефолтні
      { userId: userId },         // особисті
    ],
  }).sort({ type: 1, name: 1 }); // сортування за типом і назвою

  return categories;
};

exports.createUserCategory = async (userId, data) => {
  // Перевірка унікальності по userId + name
  const existing = await Category.findOne({ userId, name: data.name.trim() });

  if (existing) {
    throw new Error("Категорія з такою назвою вже існує.");
  }

  const category = await Category.create({
    userId,
    name: data.name.trim(),
    type: data.type,
  });

  return category;
};

exports.updateUserCategory = async (userId, categoryId, updates) => {
  const category = await Category.findOne({ _id: categoryId, userId });

  if (!category) {
    throw new Error("Категорію не знайдено або вона не належить користувачу.");
  }

  // Якщо змінюється назва → перевірити унікальність
  if (updates.name && updates.name !== category.name) {
    const existing = await Category.findOne({
      userId,
      name: updates.name,
      _id: { $ne: categoryId },
    });

    if (existing) {
      throw new Error("Категорія з такою назвою вже існує.");
    }
  }

  if (updates.name !== undefined) category.name = updates.name;
  if (updates.type !== undefined) category.type = updates.type;

  await category.save();
  return category;
};

exports.deleteUserCategory = async (userId, categoryId) => {
  const category = await Category.findOne({ _id: categoryId });

  if (!category) {
    throw new Error("Категорію не знайдено.");
  }

  if (!category.userId || category.userId.toString() !== userId.toString()) {
    throw new Error("Можна видалити лише власну категорію.");
  }

  await Category.deleteOne({ _id: categoryId });
};