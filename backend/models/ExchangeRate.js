const mongoose = require("mongoose");

const exchangeRateSchema = new mongoose.Schema(
  {
    baseCurrency: {
      type: String,
      required: [true, "Базова валюта є обов’язковою."],
      enum: {
        values: ["UAH", "USD", "EUR"],
        message: "Базова валюта має бути 'UAH', 'USD' або 'EUR'.",
      },
    },
    targetCurrency: {
      type: String,
      required: [true, "Цільова валюта є обов’язковою."],
      enum: {
        values: ["UAH", "USD", "EUR"],
        message: "Цільова валюта має бути 'UAH', 'USD' або 'EUR'.",
      },
    },
    rate: {
      type: Number,
      required: [true, "Курс обміну є обов’язковим."],
      min: [0.0001, "Курс повинен бути більше 0."],
    },
  },
  { timestamps: { createdAt: false, updatedAt: true } } // Оновлює тільки updatedAt
);

// Унікальність для кожної пари валют (щоб не дублювати записи)
exchangeRateSchema.index({ baseCurrency: 1, targetCurrency: 1 }, { unique: true });

const ExchangeRate = mongoose.model("ExchangeRate", exchangeRateSchema);

module.exports = ExchangeRate;