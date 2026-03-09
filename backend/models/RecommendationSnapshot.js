const mongoose = require("mongoose");

const recommendationSnapshotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Snapshot рекомендацій повинен бути прив’язаний до користувача."],
      index: true,
    },

    snapshotType: {
      type: String,
      enum: {
        values: ["main_dashboard"],
        message: "Недійсний тип snapshot рекомендацій.",
      },
      required: [true, "Тип snapshot є обов’язковим."],
      default: "main_dashboard",
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: ["ready", "stale", "failed"],
        message: "Статус snapshot може бути лише 'ready', 'stale' або 'failed'.",
      },
      required: [true, "Статус snapshot є обов’язковим."],
      default: "ready",
      index: true,
    },

    generatedAt: {
      type: Date,
      required: [true, "Дата генерації snapshot є обов’язковою."],
      default: Date.now,
      index: true,
    },

    validUntil: {
      type: Date,
      default: null,
      index: true,
    },

    data: {
      type: mongoose.Schema.Types.Mixed,
      required: [true, "Дані snapshot є обов’язковими."],
    },

    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

recommendationSnapshotSchema.index(
  { userId: 1, snapshotType: 1 },
  { unique: true }
);

recommendationSnapshotSchema.index({ userId: 1, status: 1, generatedAt: -1 });

const RecommendationSnapshot = mongoose.model(
  "RecommendationSnapshot",
  recommendationSnapshotSchema
);

module.exports = RecommendationSnapshot;