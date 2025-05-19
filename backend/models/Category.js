const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null, // Якщо null → це дефолтна категорія
    },
    name: {
      type: String,
      required: [true, "Назва категорії є обов’язковою."],
      trim: true,
    },
    type: {
      type: String,
      enum: {
        values: ["income", "expense"],
        message: "Тип категорії має бути 'income' (дохід) або 'expense' (витрата).",
      },
      required: [true, "Тип категорії є обов’язковим."],
    },
  },
  { timestamps: true }
);

// Унікальність категорії для одного користувача
categorySchema.index({ userId: 1, name: 1 }, { unique: true });

const Category = mongoose.model("Category", categorySchema);

module.exports = Category;
