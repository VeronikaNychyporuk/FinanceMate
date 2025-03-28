const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Сесія повинна бути прив’язана до користувача."],
    },
    refreshToken: {
      type: String,
      required: [true, "Refresh токен є обов’язковим."],
      unique: true, // Кожен токен має бути унікальним
    },
    expiresAt: {
      type: Date,
      required: [true, "Дата завершення сесії є обов’язковою."],
    },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
