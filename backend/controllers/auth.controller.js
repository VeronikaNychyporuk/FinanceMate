const {
    registerUser,
    verifyUserEmail,
    resendVerificationCode,
    loginUser,
    sendResetPasswordCode,
    resetUserPassword,
  } = require("../services/auth.service");

exports.register = async (req, res) => {
  const { email, password, name } = req.body;

  try {
    await registerUser(email, password, name);
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

exports.resendVerificationCode = async (req, res) => {
  const { email } = req.body;

  try {
    await resendVerificationCode(email);
    res.status(200).json({ success: true, message: "Код підтвердження надіслано на електронну адресу." });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
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