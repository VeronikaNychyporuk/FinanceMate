const {
    registerUser,
    verifyUserEmail,
    loginUser,
    sendResetPasswordCode,
    resetUserPassword,
    logoutUser,
  } = require("../services/auth.service");

exports.register = async (req, res) => {
  const { email, password } = req.body;

  try {
    await registerUser(email, password);
    res.status(201).json({
      message: "Користувача створено. Перевірте пошту для підтвердження e-mail.",
    });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  try {
    await verifyUserEmail(email, code);
    res.status(200).json({ message: "Email підтверджено успішно." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const tokens = await loginUser(email, password);
    res.status(200).json(tokens);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    await sendResetPasswordCode(email);
    res.status(200).json({ message: "Код для скидання пароля надіслано на пошту." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  try {
    await resetUserPassword(email, code, newPassword);
    res.status(200).json({ message: "Пароль успішно скинуто." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

exports.logout = async (req, res) => {
  const { refreshToken } = req.body;

  try {
    await logoutUser(refreshToken);
    res.status(200).json({ message: "Вихід успішний." });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};
