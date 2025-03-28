const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Сповіщення повинно бути прив’язане до користувача."],
    },
    message: {
      type: String,
      required: [true, "Текст сповіщення є обов’язковим."],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ["budget_limit", "reminder", "goal_progress", "system"],
        message: "Недійсний тип сповіщення.",
      },
      required: [true, "Тип сповіщення є обов’язковим."],
    },
    status: {
      type: String,
      enum: {
        values: ["read", "unread"],
        message: "Статус може бути лише 'read' або 'unread'.",
      },
      default: "unread",
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } } // лише createdAt
);

const Notification = mongoose.model("Notification", notificationSchema);

module.exports = Notification;