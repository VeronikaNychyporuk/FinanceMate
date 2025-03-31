const { registerUser } = require("../services/auth.service");
const { verifyUserEmail } = require("../services/auth.service");

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
