const mongoose = require("mongoose");

const recurringTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Регулярна операція повинна бути прив’язана до користувача."],
    },
    amount: {
      type: Number,
      required: [true, "Сума регулярної операції є обов’язковою."],
      min: [0.01, "Сума регулярної операції повинна бути більшою за 0."],
    },
    currency: {
      type: String,
      enum: {
        values: ["UAH", "USD", "EUR"],
        message: "Непідтримувана валюта. Дозволені значення: UAH, USD, EUR.",
      },
      required: [true, "Валюта регулярної операції є обов’язковою."],
    },
    type: {
      type: String,
      enum: {
        values: ["income", "expense"],
        message: "Тип операції має бути 'income' (дохід) або 'expense' (витрата).",
      },
      required: [true, "Тип регулярної операції є обов’язковим."],
    },
    categoryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Регулярна операція повинна мати категорію."],
    },
    note: {
      type: String,
      trim: true,
    },
    frequency: {
      type: String,
      enum: {
        values: ["daily", "weekly", "monthly", "yearly"],
        message: "Частота повинна бути 'daily', 'weekly', 'monthly' або 'yearly'.",
      },
      required: [true, "Частота виконання регулярної операції є обов’язковою."],
    },
    startDate: {
      type: Date,
      required: [true, "Дата початку регулярної операції є обов’язковою."],
    },
    endDate: {
      type: Date,
    },
    nextRun: {
      type: Date,
      required: [true, "Дата наступного виконання є обов’язковою."],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const RecurringTransaction = mongoose.model("RecurringTransaction", recurringTransactionSchema);

module.exports = RecurringTransaction;
