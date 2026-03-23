const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");
const Recommendation = require("../models/Recommendation");
const RecommendationSnapshot = require("../models/RecommendationSnapshot");

const {
  analyzeRuleBasedFinancials,
} = require("./recommendations/algorithms/ruleBasedFinancialAnalytics");
const {
  analyzeAnomalies,
} = require("./recommendations/algorithms/anomalyDetection");

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




const buildForecast = (transactions) => {
  const last60Days = transactions.filter(
    (tx) => tx.date >= buildDateRangeFilter(60).$gte
  );

  const today = startOfDay(new Date());
  const horizonDays = 30;

  const cashFlowByDay = new Map();

  for (let i = 0; i < 60; i += 1) {
    const day = addDays(today, -i);
    cashFlowByDay.set(day.toISOString().slice(0, 10), 0);
  }

  last60Days.forEach((tx) => {
    const key = startOfDay(tx.date).toISOString().slice(0, 10);
    const current = cashFlowByDay.get(key) || 0;
    const signedAmount =
      tx.type === "income" ? tx.amountInBaseCurrency : -tx.amountInBaseCurrency;

    cashFlowByDay.set(key, current + signedAmount);
  });

  const averageDailyNet = average([...cashFlowByDay.values()]);

  const baseBalance = round(
    last60Days.reduce((sum, tx) => {
      return (
        sum +
        (tx.type === "income"
          ? tx.amountInBaseCurrency
          : -tx.amountInBaseCurrency)
      );
    }, 0)
  );

  const seriesBalance = [];
  let runningBalance = baseBalance;

  for (let i = 0; i < horizonDays; i += 1) {
    const day = addDays(today, i);
    runningBalance += averageDailyNet;

    seriesBalance.push({
      date: day.toISOString(),
      balance: round(runningBalance),
    });
  }

  const risks = [];
  const minProjected = seriesBalance.reduce(
    (min, point) => Math.min(min, point.balance),
    Infinity
  );

  if (minProjected < 0) {
    risks.push({
      level: "high",
      title: "Ймовірний дефіцит коштів",
      message:
        "За поточним фінансовим темпом прогнозується від’ємний залишок у межах 30 днів.",
    });
  } else if (averageDailyNet < 0) {
    risks.push({
      level: "medium",
      title: "Негативний середній грошовий потік",
      message:
        "Середній добовий баланс зменшується, варто переглянути витрати найближчим часом.",
    });
  } else {
    risks.push({
      level: "low",
      title: "Стабільний прогноз",
      message:
        "Поточна динаміка не сигналізує про критичні ризики в короткостроковому горизонті.",
    });
  }

  return {
    horizonDays,
    averageDailyNet: round(averageDailyNet),
    seriesBalance,
    risks,
  };
};

const buildGoalsAnalysis = (goals, transactions) => {
  const activeGoal = goals
    .filter((goal) => goal.status === "in_progress")
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];

  const income90 = transactions
    .filter((tx) => tx.type === "income" && tx.date >= buildDateRangeFilter(90).$gte)
    .reduce((sum, tx) => sum + tx.amountInBaseCurrency, 0);

  const expense90 = transactions
    .filter((tx) => tx.type === "expense" && tx.date >= buildDateRangeFilter(90).$gte)
    .reduce((sum, tx) => sum + tx.amountInBaseCurrency, 0);

  const monthlyFreeCashFlow = (income90 - expense90) / 3;

  if (!activeGoal) {
    return {
      goal: null,
      probability: null,
      whatIf: [],
      distribution: [],
      monthlyFreeCashFlow: round(monthlyFreeCashFlow),
    };
  }

  const remainingAmount = Math.max(
    0,
    activeGoal.targetAmount - activeGoal.currentAmount
  );

  const monthsLeft = monthsBetween(new Date(), new Date(activeGoal.deadline));
  const requiredMonthlySavings = remainingAmount / monthsLeft;

  const baseProbability = clamp(
    (monthlyFreeCashFlow / Math.max(requiredMonthlySavings, 1)) * 100,
    5,
    95
  );

  const whatIf = [0.8, 1, 1.2].map((multiplier) => {
    const projectedSavings = monthlyFreeCashFlow * multiplier;

    const probability = clamp(
      (projectedSavings / Math.max(requiredMonthlySavings, 1)) * 100,
      5,
      95
    );

    return {
      scenario:
        multiplier === 1
          ? "Поточний темп"
          : multiplier < 1
          ? "-20% до вільного залишку"
          : "+20% до вільного залишку",
      monthlySavings: round(projectedSavings),
      probability: round(probability),
    };
  });

  const distribution = [25, 50, 75].map((percentilePoint) => ({
    percentile: percentilePoint,
    amountByDeadline: round(
      activeGoal.currentAmount +
        monthlyFreeCashFlow * monthsLeft * (percentilePoint / 50)
    ),
  }));

  return {
    goal: {
      _id: activeGoal._id,
      name: activeGoal.name,
      targetAmount: round(activeGoal.targetAmount),
      currentAmount: round(activeGoal.currentAmount),
      deadline: activeGoal.deadline,
      remainingAmount: round(remainingAmount),
      monthsLeft,
      requiredMonthlySavings: round(requiredMonthlySavings),
    },
    probability: round(baseProbability),
    whatIf,
    distribution,
    monthlyFreeCashFlow: round(monthlyFreeCashFlow),
  };
};

const buildPatterns = (expenseTransactions) => {
  if (!expenseTransactions.length) {
    return { clusters: [] };
  }

  const amounts = expenseTransactions.map((tx) => tx.amountInBaseCurrency);
  const smallThreshold = percentile(amounts, 40);
  const largeThreshold = percentile(amounts, 85);

  const regularSmall = expenseTransactions.filter(
    (tx) => tx.amountInBaseCurrency <= smallThreshold
  );

  const rareLarge = expenseTransactions.filter(
    (tx) => tx.amountInBaseCurrency >= largeThreshold
  );

  const groupedByCategory = groupExpenseByCategory(expenseTransactions);
  const totalExpense = expenseTransactions.reduce(
    (sum, tx) => sum + tx.amountInBaseCurrency,
    0
  );

  const dominant = groupedByCategory[0] || null;

  const clusters = [];

  if (regularSmall.length) {
    clusters.push({
      label: "Регулярні дрібні витрати",
      description:
        "Часті невеликі покупки, які накопичуються в помітну суму.",
      stats: {
        transactions: regularSmall.length,
        totalAmount: round(
          regularSmall.reduce((sum, tx) => sum + tx.amountInBaseCurrency, 0)
        ),
      },
      top: groupExpenseByCategory(regularSmall)
        .slice(0, 3)
        .map((item) => item.categoryName),
      recommendation:
        regularSmall.length >= 8
          ? "Варто перевірити мікровитрати та оцінити, які з них можна скоротити без втрати комфорту."
          : "Патерн присутній, але поки не створює критичного навантаження.",
    });
  }

  if (rareLarge.length) {
    clusters.push({
      label: "Рідкі великі покупки",
      description:
        "Окремі операції з високою сумою мають суттєвий вплив на фінансовий стан.",
      stats: {
        transactions: rareLarge.length,
        totalAmount: round(
          rareLarge.reduce((sum, tx) => sum + tx.amountInBaseCurrency, 0)
        ),
      },
      top: groupExpenseByCategory(rareLarge)
        .slice(0, 3)
        .map((item) => item.categoryName),
      recommendation:
        "Для великих покупок доцільно планувати окремий резерв або ліміт за категорією.",
    });
  }

  if (dominant) {
    clusters.push({
      label: "Домінантна категорія витрат",
      description:
        "Одна категорія формує найбільшу частку загальних витрат.",
      stats: {
        category: dominant.categoryName,
        share: totalExpense > 0 ? round((dominant.amount / totalExpense) * 100) : 0,
        amount: round(dominant.amount),
      },
      top: [dominant.categoryName],
      recommendation: `Категорія «${dominant.categoryName}» потребує окремої уваги під час планування бюджету.`,
    });
  }

  return { clusters };
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
          message: `Система зафіксувала нетипову операцію в категорії «${actionableAnomaly.category}» на суму ${actionableAnomaly.amount}. Рекомендується перевірити цю транзакцію.`,
          facts: [
            `Категорія: ${actionableAnomaly.category}`,
            `Сума: ${actionableAnomaly.amount}`,
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
          `Потрібно щомісяця: ${goalsAnalysis.goal.requiredMonthlySavings}`,
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
          `Сума: ${regularSmallCluster.stats.totalAmount}`,
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