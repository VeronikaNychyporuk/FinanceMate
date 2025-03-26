const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Створюємо схему користувача
const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "E-mail є обов’язковим полем."],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
        "Некоректний формат e-mail. Введіть правильну адресу.",
      ],
    },
    password: {
      type: String,
      required: [true, "Пароль є обов’язковим полем."],
      minlength: [8, "Пароль має містити мінімум 8 символів."],
      match: [
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/,
        "Пароль повинен містити хоча б одну велику і малу літеру, цифру та спеціальний символ.",
      ],
    },
    name: {
      type: String,
      trim: true,
    },
    currency: {
      type: String,
      enum: {
        values: ["UAH", "USD", "EUR"],
        message: "Непідтримувана валюта. Дозволені значення: UAH, USD, EUR.",
      },
      default: "UAH",
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
    },
  },
  { timestamps: true } // Автоматично створює createdAt і updatedAt
);

// Хешування пароля перед збереженням
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Метод для перевірки пароля
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model("User", userSchema);

module.exports = User;