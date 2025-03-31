const User = require("../models/User");
const generateCode = require("../utils/generateCode");
const sendEmail = require("../utils/sendEmail");

exports.registerUser = async (email, password) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Користувач з таким email вже існує.");
  }

  const verificationCode = generateCode();

  const user = new User({
    email,
    password,
    verificationCode,
    emailVerified: false,
  });

  await user.save();

  const message = `Дякуємо за реєстрацію у FinanceMate! Щоб активувати ваш акаунт, будь ласка, введіть код підтвердження:\n\n${verificationCode}\n\nЯкщо ви не реєструвались, просто ігноруйте цей лист.\n\n\nЗ найкращими побажаннями,\nКоманда FinanceMate!`;

  await sendEmail(email, "Підтвердження email", message);

  return user;
};

exports.verifyUserEmail = async (email, code) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Користувача не знайдено.");
  }

  if (user.emailVerified) {
    throw new Error("Email вже підтверджено.");
  }

  if (user.verificationCode !== code) {
    throw new Error("Невірний код підтвердження.");
  }

  user.emailVerified = true;
  user.verificationCode = undefined;
  await user.save();
};
