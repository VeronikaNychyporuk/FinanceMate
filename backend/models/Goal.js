const mongoose = require("mongoose");

const goalSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Фінансова ціль повинна бути прив’язана до користувача."],
    },
    name: {
      type: String,
      required: [true, "Назва цілі є обов’язковою."],
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: [true, "Сума накопичення є обов’язковою."],
      min: [0.01, "Сума накопичення повинна бути більшою за 0."],
    },
    currentAmount: {
      type: Number,
      default: 0,
      min: [0, "Поточна сума не може бути від’ємною."],
    },
    deadline: {
      type: Date,
      required: [true, "Дата завершення цілі є обов’язковою."],
    },
    status: {
      type: String,
      enum: {
        values: ["in_progress", "achieved"],
        message: "Статус може бути лише 'in_progress' або 'achieved'.",
      },
      default: "in_progress",
    },
  },
  { timestamps: true }
);

// Автоматичне оновлення статусу цілі при зміні суми накопичення
goalSchema.pre("save", async function (next) {
  if (this.currentAmount >= this.targetAmount) {
    this.status = "achieved";

    if (this.isModified("status")) {
      const Notification = require("../models/Notification");
      await Notification.create({
        userId: this.userId,
        type: "goal_progress",
        message: `Вітаємо! Ціль "${this.name}" досягнута.`,
        status: "unread",
      });
    }
  }
  next();
});

const Goal = mongoose.model("Goal", goalSchema);

module.exports = Goal;