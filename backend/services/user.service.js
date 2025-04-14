const User = require("../models/User");

exports.getUserProfile = async (userId) => {
  const user = await User.findById(userId).select("email name currency emailVerified");

  if (!user) {
    throw new Error("Користувача не знайдено.");
  }

  return user;
};

exports.updateUserProfile = async (userId, updates) => {
  const allowedFields = ["name", "currency"];

  const updateData = {};
  for (let key of allowedFields) {
    if (updates[key] !== undefined) {
      updateData[key] = updates[key];
    }
  }

  const user = await User.findByIdAndUpdate(userId, updateData, {
    new: true,
    runValidators: true,
  }).select("email name currency emailVerified");

  if (!user) {
    throw new Error("Користувача не знайдено.");
  }

  return user;
};

exports.changeUserPassword = async (userId, currentPassword, newPassword) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("Користувача не знайдено.");
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    throw new Error("Неправильний поточний пароль.");
  }

  user.password = newPassword;
  await user.save();
};