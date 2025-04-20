const mongoose = require("mongoose");
const Goal = require("./Goal");

const goalTransactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Операція повинна бути прив’язана до користувача."],
    },
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      required: [true, "Операція повинна бути прив’язана до фінансової цілі."],
    },
    amount: {
      type: Number,
      required: [true, "Сума операції є обов’язковою."],
      min: [0.01, "Сума операції повинна бути більшою за 0."],
    },
    currency: {
      type: String,
      enum: {
        values: ["UAH", "USD", "EUR"],
        message: "Підтримуються лише валюти: UAH, USD, EUR.",
      },
      required: [true, "Валюта операції є обов’язковою."],
    },
    amountInBaseCurrency: {
      type: Number,
      required: [true, "Сума у валюті користувача є обов’язковою."],
      min: [0.01, "Сума повинна бути більшою за 0."],
    },
    type: {
      type: String,
      enum: {
        values: ["deposit", "withdrawal"],
        message: "Тип операції має бути 'deposit' (поповнення) або 'withdrawal' (зняття).",
      },
      required: [true, "Тип операції є обов’язковим."],
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

// Автоматичне оновлення currentAmount у Goal при додаванні операції
goalTransactionSchema.post("save", async function (doc, next) {
  try {
    const goal = await Goal.findById(doc.goalId);
    if (goal) {
      if (doc.type === "deposit") {
        goal.currentAmount += doc.amount;
      } else if (doc.type === "withdrawal") {
        goal.currentAmount -= doc.amount;
        if (goal.currentAmount < 0) {
          goal.currentAmount = 0; // Запобігає від'ємному балансу
        
          // Створення системного сповіщення
          await Notification.create({
            userId: doc.userId,
            type: "system",
            message: `Сума зняття перевищує баланс цілі "${goal.name}". Поточна сума обнулена.`,
            status: "unread",
          });
        }
      }
      await goal.save();
    }
    next();
  } catch (error) {
    next(error);
  }
});

const GoalTransaction = mongoose.model("GoalTransaction", goalTransactionSchema);

module.exports = GoalTransaction;