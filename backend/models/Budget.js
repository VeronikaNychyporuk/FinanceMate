const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Бюджет повинен бути прив’язаний до користувача."],
    },
    totalLimit: {
      type: Number,
      required: [true, "Загальний ліміт бюджету є обов’язковим."],
      min: [0.01, "Загальний ліміт повинен бути більшим за 0."],
    },
    period: {
      month: {
        type: Number,
        required: [true, "Місяць бюджету є обов’язковим."],
        min: [1, "Місяць повинен бути від 1 до 12."],
        max: [12, "Місяць повинен бути від 1 до 12."],
      },
      year: {
        type: Number,
        required: [true, "Рік бюджету є обов’язковим."],
        min: [2000, "Рік повинен бути не раніше 2000."],
      },
    },
    categoryLimits: {
      type: [
        {
          categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: [true, "Кожна категорія бюджету повинна мати категорію."],
          },
          limit: {
            type: Number,
            required: [true, "Ліміт для категорії є обов’язковим."],
            min: [0.01, "Ліміт для категорії повинен бути більшим за 0."],
          },
        },
      ],
      default: [], // Дозволяє бюджет без категорій
    },
  },
  { timestamps: true }
);

// Унікальність бюджету для одного місяця та року
budgetSchema.index({ userId: 1, "period.month": 1, "period.year": 1 }, { unique: true });

const Budget = mongoose.model("Budget", budgetSchema);

module.exports = Budget;