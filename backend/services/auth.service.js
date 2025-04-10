const User = require("../models/User");
const generateCode = require("../utils/generateCode");
const sendEmail = require("../utils/sendEmail");
const Session = require("../models/Session");

const {
  generateAccessToken,
  generateRefreshToken,
} = require("../utils/generateTokens");

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

exports.loginUser = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Користувача не знайдено.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error("Невірний пароль.");
  }

  if (!user.emailVerified) {
    throw new Error("Електронну адресу не підтверджено.");
  }

  const accessToken = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 днів

  await Session.create({
    userId: user._id,
    refreshToken,
    expiresAt,
  });

  return {
    accessToken,
    refreshToken,
  };
};

exports.sendResetPasswordCode = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Користувача з таким email не знайдено.");
  }

  const resetCode = generateCode();

  user.resetPasswordToken = resetCode;
  await user.save();

  await sendEmail(
    email,
    "Скидання пароля",
    `Ваш код для скидання пароля: ${resetCode}`
  );
};

exports.resetUserPassword = async (email, code, newPassword) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Користувача не знайдено.");
  }

  if (user.resetPasswordToken !== code) {
    throw new Error("Невірний код підтвердження.");
  }

  user.password = newPassword;
  user.resetPasswordToken = undefined;

  await user.save();
};

exports.logoutUser = async (refreshToken) => {
  const session = await Session.findOne({ refreshToken });

  if (!session) {
    throw new Error("Сесії з таким токеном не знайдено.");
  }

  await Session.deleteOne({ refreshToken });
};