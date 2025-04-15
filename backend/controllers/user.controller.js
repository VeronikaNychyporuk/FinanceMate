const { 
    getUserProfile,
    updateUserProfile,
    changeUserPassword,
  } = require("../services/user.service");

exports.getProfile = async (req, res) => {
  try {
    const profile = await getUserProfile(req.userId);
    res.status(200).json(profile);
  } catch (err) {
    res.status(404).json({ message: err.message });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const updated = await updateUserProfile(req.userId, req.body);
    res.status(200).json(updated);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    await changeUserPassword(req.userId, currentPassword, newPassword);
    res.status(200).json({ message: "Пароль успішно змінено." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};