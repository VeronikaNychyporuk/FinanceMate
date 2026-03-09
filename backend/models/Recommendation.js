const mongoose = require("mongoose");

const recommendationActionSchema = new mongoose.Schema(
  {
    label: {
      type: String,
      required: [true, "Назва дії є обов’язковою."],
      trim: true,
      maxlength: [100, "Назва дії не може перевищувати 100 символів."],
    },
    actionType: {
      type: String,
      enum: {
        values: ["navigate", "open_entity", "api_action"],
        message: "Недійсний тип дії рекомендації.",
      },
      required: [true, "Тип дії є обов’язковим."],
    },
    targetType: {
      type: String,
      enum: {
        values: [
          "tab",
          "route",
          "transaction",
          "goal",
          "budget",
          "category",
          "endpoint",
        ],
        message: "Недійсний тип цільового об’єкта дії.",
      },
      required: [true, "Тип цілі дії є обов’язковим."],
    },
    targetValue: {
      type: String,
      required: [true, "Цільове значення дії є обов’язковим."],
      trim: true,
      maxlength: [255, "Цільове значення не може перевищувати 255 символів."],
    },
  },
  { _id: false }
);

const relatedEntitySchema = new mongoose.Schema(
  {
    entityType: {
      type: String,
      enum: {
        values: ["transaction", "goal", "budget", "category"],
        message: "Недійсний тип пов’язаної сутності.",
      },
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
    },
    label: {
      type: String,
      trim: true,
      maxlength: [120, "Назва пов’язаної сутності не може перевищувати 120 символів."],
    },
  },
  { _id: false }
);

const recommendationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Рекомендація повинна бути прив’язана до користувача."],
      index: true,
    },

    type: {
      type: String,
      enum: {
        values: [
          "spending_optimization",
          "anomaly_alert",
          "balance_warning",
          "budget_risk",
          "goal_adjustment",
          "goal_feasibility",
          "behavior_insight",
          "trend_change",
        ],
        message: "Недійсний тип рекомендації.",
      },
      required: [true, "Тип рекомендації є обов’язковим."],
      index: true,
    },

    module: {
      type: String,
      enum: {
        values: ["overview", "anomalies", "forecast", "goals", "patterns"],
        message: "Недійсний модуль рекомендації.",
      },
      required: [true, "Модуль рекомендації є обов’язковим."],
      index: true,
    },

    priority: {
      type: String,
      enum: {
        values: ["low", "medium", "high"],
        message: "Пріоритет може бути лише 'low', 'medium' або 'high'.",
      },
      required: [true, "Пріоритет рекомендації є обов’язковим."],
      default: "medium",
      index: true,
    },

    status: {
      type: String,
      enum: {
        values: ["active", "seen", "dismissed", "done", "archived"],
        message:
          "Статус може бути лише 'active', 'seen', 'dismissed', 'done' або 'archived'.",
      },
      required: [true, "Статус рекомендації є обов’язковим."],
      default: "active",
      index: true,
    },

    snoozedUntil: {
      type: Date,
      default: null,
      index: true,
    },

    groupKey: {
      type: String,
      enum: {
        values: ["immediate_actions", "spending_optimization", "planning_ahead"],
        message: "Недійсний ключ групи рекомендацій.",
      },
      required: [true, "Ключ групи є обов’язковим."],
      index: true,
    },

    groupLabel: {
      type: String,
      required: [true, "Назва групи є обов’язковою."],
      trim: true,
      maxlength: [120, "Назва групи не може перевищувати 120 символів."],
    },

    title: {
      type: String,
      required: [true, "Заголовок рекомендації є обов’язковим."],
      trim: true,
      maxlength: [160, "Заголовок не може перевищувати 160 символів."],
    },

    message: {
      type: String,
      required: [true, "Текст рекомендації є обов’язковим."],
      trim: true,
      maxlength: [2000, "Текст рекомендації не може перевищувати 2000 символів."],
    },

    facts: {
      type: [String],
      default: [],
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.length <= 6;
        },
        message: "Список фактів не може містити більше 6 елементів.",
      },
    },

    explanation: {
      type: String,
      trim: true,
      maxlength: [1000, "Пояснення не може перевищувати 1000 символів."],
      default: null,
    },

    relatedEntity: {
      type: relatedEntitySchema,
      default: null,
    },

    primaryAction: {
      type: recommendationActionSchema,
      default: null,
    },

    secondaryAction: {
      type: recommendationActionSchema,
      default: null,
    },

    availableActions: {
      type: [
        {
          type: String,
          enum: {
            values: ["dismiss", "snooze", "mark_done"],
            message: "Недійсна доступна дія рекомендації.",
          },
        },
      ],
      default: ["dismiss", "snooze", "mark_done"],
    },

    context: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    generatedAt: {
      type: Date,
      required: [true, "Дата генерації рекомендації є обов’язковою."],
      default: Date.now,
      index: true,
    },

    expiresAt: {
      type: Date,
      default: null,
      index: true,
    },

    lastInteractedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

recommendationSchema.index({ userId: 1, status: 1, generatedAt: -1 });
recommendationSchema.index({ userId: 1, module: 1, status: 1, generatedAt: -1 });
recommendationSchema.index({ userId: 1, groupKey: 1, priority: -1, generatedAt: -1 });
recommendationSchema.index({ userId: 1, type: 1, status: 1 });

recommendationSchema.index(
  { userId: 1, "relatedEntity.entityType": 1, "relatedEntity.entityId": 1 },
  { sparse: true }
);

const Recommendation = mongoose.model("Recommendation", recommendationSchema);

module.exports = Recommendation;