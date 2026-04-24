const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");
const User = require("../models/User");
const Recommendation = require("../models/Recommendation");
const RecommendationSnapshot = require("../models/RecommendationSnapshot");

const {
  analyzeRuleBasedFinancials,
} = require("./recommendations/algorithms/ruleBasedFinancialAnalytics");
const {
  analyzeAnomalies,
} = require("./recommendations/algorithms/anomalyDetection");
const {
  buildForecast,
} = require("./recommendations/algorithms/forecastEngine");
const {
  buildGoalsAnalysis,
} = require("./recommendations/algorithms/monteCarloGoals");
const {
  buildPatterns,
} = require("./recommendations/algorithms/kmeansPatterns");

const DAY_MS = 24 * 60 * 60 * 1000;
const SNAPSHOT_TTL_HOURS = 24;

const GROUP_LABELS = {
  immediate_actions: "Негайні дії",
  spending_optimization: "Оптимізація витрат",
  planning_ahead: "Планування наперед",
};

const PRIORITY_WEIGHT = {
  low: 1,
  medium: 2,
  high: 3,
};

const fmtAmount = (amount, currency = "UAH") => {
  try {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  } catch {
    return `${amount} ${currency}`;
  }
};

const round = (value) => Number((value || 0).toFixed(2));
const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const startOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

const monthsBetween = (from, to) => {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const raw = years * 12 + months;
  return Math.max(1, raw + (to.getDate() >= from.getDate() ? 0 : 1));
};

const percentile = (values, p) => {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.floor((p / 100) * sorted.length)
  );
  return sorted[index];
};

const average = (values) => {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const stdDeviation = (values, mean) => {
  if (!values.length) return 0;
  const variance =
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const buildDateRangeFilter = (days) => {
  const now = new Date();
  return {
    $gte: addDays(startOfDay(now), -(days - 1)),
    $lte: now,
  };
};

const groupExpenseByCategory = (transactions) => {
  const map = new Map();

  transactions.forEach((tx) => {
    const categoryId =
      tx.categoryId?._id?.toString() ||
      tx.categoryId?.toString() ||
      "unknown";
    const categoryName = tx.categoryId?.name || "Без категорії";

    const current = map.get(categoryId) || {
      categoryId,
      categoryName,
      amount: 0,
      count: 0,
    };

    current.amount += tx.amountInBaseCurrency;
    current.count += 1;

    map.set(categoryId, current);
  });

  return [...map.values()].sort((a, b) => b.amount - a.amount);
};







const buildRecommendationDocument = (userId, partial) => ({
  userId,
  status: "active",
  availableActions: ["dismiss", "snooze", "mark_done"],
  generatedAt: new Date(),
  ...partial,
});

const buildRuleBasedRecommendations = ({ userId, findings }) => {
  if (!Array.isArray(findings) || !findings.length) {
    return [];
  }

  return findings.map((finding) => {
    let groupKey = "spending_optimization";
    let groupLabel = GROUP_LABELS.spending_optimization;

    if (
      finding.priority === "high" ||
      finding.type === "balance_warning" ||
      finding.type === "budget_risk"
    ) {
      groupKey = "immediate_actions";
      groupLabel = GROUP_LABELS.immediate_actions;
    } else if (
      finding.type === "behavior_insight" ||
      finding.type === "trend_change"
    ) {
      groupKey = "planning_ahead";
      groupLabel = GROUP_LABELS.planning_ahead;
    }

    return buildRecommendationDocument(userId, {
      type: finding.type,
      module: finding.module,
      priority: finding.priority,
      groupKey,
      groupLabel,
      title: finding.title,
      message: finding.message,
      facts: finding.facts || [],
      explanation: finding.explanation || null,
      relatedEntity: finding.relatedEntity || null,
      primaryAction: finding.primaryAction || null,
      secondaryAction: finding.secondaryAction || null,
      context: finding.context || null,
      expiresAt:
        finding.priority === "high"
          ? addDays(new Date(), 10)
          : finding.priority === "medium"
          ? addDays(new Date(), 21)
          : addDays(new Date(), 30),
    });
  });
};

const buildRecommendations = ({
  userId,
  ruleBasedAnalysis,
  anomalyAnalysis,
  goalsAnalysis,
  patterns,
  currency,
}) => {
  const recommendations = [];

  recommendations.push(
    ...buildRuleBasedRecommendations({
      userId,
      findings: ruleBasedAnalysis.findings,
    })
  );

  if (anomalyAnalysis?.topAnomalies?.length) {
    const actionableAnomaly = anomalyAnalysis.topAnomalies.find(
      (item) => item.severity === "high" || item.severity === "medium"
    );

    if (actionableAnomaly) {
      recommendations.push(
        buildRecommendationDocument(userId, {
          type: "anomaly_alert",
          module: "anomalies",
          priority: actionableAnomaly.severity === "high" ? "high" : "medium",
          groupKey: "immediate_actions",
          groupLabel: GROUP_LABELS.immediate_actions,
          title: "Виявлено нетипову витрату",
          message: `Система зафіксувала нетипову операцію в категорії «${actionableAnomaly.category}» на суму ${fmtAmount(actionableAnomaly.amount, currency)}. Рекомендується перевірити цю транзакцію.`,
          facts: [
            `Категорія: ${actionableAnomaly.category}`,
            `Сума: ${fmtAmount(actionableAnomaly.amount, currency)}`,
            `Anomaly score: ${actionableAnomaly.anomalyScore}/100`,
            `Рівень: ${actionableAnomaly.severity}`,
          ],
          explanation: actionableAnomaly.reasons.join(" "),
          relatedEntity: actionableAnomaly.transactionId
            ? {
                entityType: "transaction",
                entityId: actionableAnomaly.transactionId,
                label: actionableAnomaly.label,
              }
            : null,
          primaryAction: {
            label: "Переглянути аномалії",
            actionType: "navigate",
            targetType: "tab",
            targetValue: "anomalies",
          },
          secondaryAction: actionableAnomaly.transactionId
            ? {
                label: "Відкрити транзакцію",
                actionType: "open_entity",
                targetType: "transaction",
                targetValue: actionableAnomaly.transactionId.toString(),
              }
            : null,
          context: actionableAnomaly,
          expiresAt: addDays(new Date(), 7),
        })
      );
    }
  }

  if (goalsAnalysis.goal && goalsAnalysis.probability < 65) {
    recommendations.push(
      buildRecommendationDocument(userId, {
        type: "goal_feasibility",
        module: "goals",
        priority: goalsAnalysis.probability < 40 ? "high" : "medium",
        groupKey: "planning_ahead",
        groupLabel: GROUP_LABELS.planning_ahead,
        title: `Ціль «${goalsAnalysis.goal.name}» під ризиком`,
        message: `За поточного темпу накопичення ймовірність досягнення цілі до дедлайну становить близько ${goalsAnalysis.probability}%.`,
        facts: [
          `Ціль: ${goalsAnalysis.goal.name}`,
          `Потрібно щомісяця: ${fmtAmount(goalsAnalysis.goal.requiredMonthlySavings, currency)}`,
          `Ймовірність: ${goalsAnalysis.probability}%`,
        ],
        explanation:
          "Оцінка базується на співставленні потрібного щомісячного темпу накопичення та середнього вільного грошового потоку користувача.",
        relatedEntity: {
          entityType: "goal",
          entityId: goalsAnalysis.goal._id,
          label: goalsAnalysis.goal.name,
        },
        primaryAction: {
          label: "Переглянути ціль",
          actionType: "open_entity",
          targetType: "goal",
          targetValue: goalsAnalysis.goal._id.toString(),
        },
        secondaryAction: {
          label: "Відкрити сценарії",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "goals",
        },
        context: goalsAnalysis,
        expiresAt: addDays(new Date(), 30),
      })
    );
  }

  const regularSmallCluster = patterns.clusters.find(
    (cluster) => cluster.label === "Регулярні дрібні витрати"
  );

  if (regularSmallCluster && regularSmallCluster.stats.transactions >= 8) {
    recommendations.push(
      buildRecommendationDocument(userId, {
        type: "behavior_insight",
        module: "patterns",
        priority: "medium",
        groupKey: "spending_optimization",
        groupLabel: GROUP_LABELS.spending_optimization,
        title: "Дрібні регулярні витрати накопичуються в суттєву суму",
        message:
          "Часті невеликі покупки формують помітну частину витрат. Їх варто переглянути окремо як поведінковий патерн.",
        facts: [
          `Кількість операцій: ${regularSmallCluster.stats.transactions}`,
          `Сума: ${fmtAmount(regularSmallCluster.stats.totalAmount, currency)}`,
        ],
        explanation: regularSmallCluster.recommendation,
        primaryAction: {
          label: "Відкрити патерни",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "patterns",
        },
        secondaryAction: {
          label: "Переглянути огляд",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "overview",
        },
        context: regularSmallCluster,
        expiresAt: addDays(new Date(), 21),
      })
    );
  }

  return recommendations;
};

const mapRecommendationForSnapshot = (recommendation) => ({
  recommendationId: recommendation._id,
  module: recommendation.module,
  severity: recommendation.priority,
  title: recommendation.title,
  message: recommendation.message,
  facts: recommendation.facts,
  primaryCta: recommendation.primaryAction
    ? {
        label: recommendation.primaryAction.label,
        target: recommendation.primaryAction.targetValue,
      }
    : null,
  secondaryCta: recommendation.secondaryAction
    ? {
        label: recommendation.secondaryAction.label,
        target: recommendation.secondaryAction.targetValue,
      }
    : null,
});

const buildRecommendationGroups = (recommendations) => {
  const grouped = new Map();

  recommendations
    .sort((a, b) => {
      const priorityDiff =
        PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];

      if (priorityDiff !== 0) return priorityDiff;

      return new Date(b.generatedAt) - new Date(a.generatedAt);
    })
    .forEach((item) => {
      const current = grouped.get(item.groupKey) || {
        key: item.groupKey,
        title: item.groupLabel,
        items: [],
      };

      current.items.push(mapRecommendationForSnapshot(item));
      grouped.set(item.groupKey, current);
    });

  return [...grouped.values()];
};

const archiveCurrentRecommendations = async (userId) => {
  await Recommendation.updateMany(
    {
      userId,
      status: { $ne: "archived" },
    },
    {
      $set: {
        status: "archived",
        snoozedUntil: null,
        lastInteractedAt: new Date(),
      },
    }
  );
};

exports.generateRecommendationsForUser = async (userId) => {
  const now = new Date();

  const user = await User.findById(userId).select("currency");
  const currency = user?.currency || "UAH";

  const transactions = await Transaction.find({
    userId,
    date: { $gte: addDays(startOfDay(now), -180) },
  })
    .populate("categoryId", "name type icon")
    .sort({ date: -1 });

  const expenseTransactions = transactions.filter((tx) => tx.type === "expense");

  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const [budget, goals] = await Promise.all([
    Budget.findOne({
      userId,
      "period.month": currentMonth,
      "period.year": currentYear,
    }).populate("categoryLimits.categoryId", "name type icon"),

    Goal.find({ userId }).sort({ deadline: 1 }),
  ]);

  const ruleBasedAnalysis = analyzeRuleBasedFinancials({
    transactions,
    expenseTransactions,
    budget,
    now,
  });

  const anomalyAnalysis = analyzeAnomalies({
    transactions,
    budget,
    now,
  });
  const forecast = buildForecast(transactions);
  const goalsAnalysis = buildGoalsAnalysis(goals, transactions);
  const patterns = buildPatterns(expenseTransactions);

  await archiveCurrentRecommendations(userId);

  const recommendationPayload = buildRecommendations({
    userId,
    ruleBasedAnalysis,
    anomalyAnalysis,
    goalsAnalysis,
    patterns,
    currency,
  });

  const createdRecommendations = recommendationPayload.length
    ? await Recommendation.insertMany(recommendationPayload)
    : [];

  const snapshotData = {
    recommendations: {
      groups: buildRecommendationGroups(createdRecommendations),
    },
    overviewByPeriod: ruleBasedAnalysis.metrics.overviewByPeriod,
    ruleBasedAnalysis: {
      comparison30: ruleBasedAnalysis.metrics.comparison30,
      budgetAnalysis: ruleBasedAnalysis.metrics.budgetAnalysis,
      dataSufficiency: ruleBasedAnalysis.metrics.dataSufficiency,
      signals: ruleBasedAnalysis.signals,
    },
    anomalies: anomalyAnalysis,
    forecast,
    goals: goalsAnalysis,
    patterns,
  };

  const snapshot = await RecommendationSnapshot.findOneAndUpdate(
    {
      userId,
      snapshotType: "main_dashboard",
    },
    {
      $set: {
        status: "ready",
        generatedAt: now,
        validUntil: new Date(
          now.getTime() + SNAPSHOT_TTL_HOURS * 60 * 60 * 1000
        ),
        data: snapshotData,
        meta: {
          recommendationCount: createdRecommendations.length,
          anomalyCount: anomalyAnalysis.items.length,
          transactionCount: transactions.length,
        },
      },
    },
    {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    }
  );

  return {
    recommendationsCreated: createdRecommendations.length,
    snapshotId: snapshot._id,
    generatedAt: snapshot.generatedAt,
    recommendationIds: createdRecommendations.map((item) => item._id),
  };
};