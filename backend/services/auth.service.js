const User = require("../models/User");
const generateCode = require("../utils/generateCode");
const sendEmail = require("../utils/sendEmail");
const jwt = require("jsonwebtoken");
const {generateAccessToken,} = require("../utils/generateTokens");

exports.registerUser = async (email, password, name) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error("Користувач з таким email вже існує.");
  }

  const verificationCode = generateCode();

  const user = new User({
    email,
    password,
    name,
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

exports.resendVerificationCode = async (email) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Користувача не знайдено.");
  }

  if (user.emailVerified) {
    throw new Error("Email вже підтверджено.");
  }

  const verificationCode = generateCode();
  user.verificationCode = verificationCode;
  await user.save();

  const message = `Щоб підтвердити вашу електронну пошту для FinanceMate, введіть код підтвердження:\n\n${verificationCode}\n\nЯкщо ви не реєструвались, просто ігноруйте цей лист.\n\n\nЗ найкращими побажаннями,\nКоманда FinanceMate!`;

  await sendEmail(email, "Підтвердження email", message);

  return { success: true };
};

exports.loginUser = async (email, password) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw new Error("Користувача не знайдено.");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error("Неправильний пароль.");
  }

  if (!user.emailVerified) {
    // Якщо не підтверджено — повертаємо статус і прапорець
    return {
      emailConfirmed: false,
    };
  }

  const accessToken = generateAccessToken(user._id);

  return {
    accessToken,
    emailConfirmed: true,
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