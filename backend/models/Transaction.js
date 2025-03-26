const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Операція повинна бути прив’язана до користувача."],
    },
    amount: {
      type: Number,
      required: [true, "Сума операції є обов’язковою."],
      min: [0.01, "Сума операції повинна бути більшою за 0."],
    },
    type: {
      type: String,
      enum: {
        values: ["income", "expense"],
        message: "Тип операції має бути 'income' (дохід) або 'expense' (витрата).",
      },
      required: [true, "Тип операції є обов’язковим."],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Операція повинна мати категорію."],
    },
    currency: {
      type: String,
      enum: {
        values: ["UAH", "USD", "EUR"],
        message: "Непідтримувана валюта. Дозволені значення: UAH, USD, EUR.",
      },
      required: [true, "Валюта операції є обов’язковою."],
    },
    date: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      trim: true,
    },
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);

module.exports = Transaction;
