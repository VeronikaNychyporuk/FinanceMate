const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const Goal = require("../models/Goal");
const Recommendation = require("../models/Recommendation");
const RecommendationSnapshot = require("../models/RecommendationSnapshot");

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

const buildOverviewPeriod = (transactions, days) => {
  const from = buildDateRangeFilter(days).$gte;
  const periodTransactions = transactions.filter((tx) => tx.date >= from);

  const income = periodTransactions
    .filter((tx) => tx.type === "income")
    .reduce((sum, tx) => sum + tx.amountInBaseCurrency, 0);

  const expense = periodTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((sum, tx) => sum + tx.amountInBaseCurrency, 0);

  const net = income - expense;

  const topDrivers = groupExpenseByCategory(
    periodTransactions.filter((tx) => tx.type === "expense")
  )
    .slice(0, 3)
    .map((item) => ({
      categoryId: item.categoryId,
      category: item.categoryName,
      amount: round(item.amount),
      share: expense > 0 ? round((item.amount / expense) * 100) : 0,
    }));

  const highlights = [];

  if (expense > income) {
    highlights.push("Витрати перевищують доходи в обраному періоді.");
  }

  if (topDrivers[0]) {
    highlights.push(
      `Найбільший вплив на витрати має категорія «${topDrivers[0].category}».`
    );
  }

  if (!highlights.length) {
    highlights.push("Фінансовий баланс у межах періоду виглядає стабільним.");
  }

  return {
    label: `${days} днів`,
    income: round(income),
    expense: round(expense),
    net: round(net),
    topDrivers,
    highlights,
  };
};

const detectAnomalies = (expenseTransactions) => {
  const grouped = new Map();

  expenseTransactions.forEach((tx) => {
    const key =
      tx.categoryId?._id?.toString() ||
      tx.categoryId?.toString() ||
      "unknown";

    const bucket = grouped.get(key) || [];
    bucket.push(tx);
    grouped.set(key, bucket);
  });

  const anomalies = [];

  grouped.forEach((transactions) => {
    if (transactions.length < 3) return;

    const amounts = transactions.map((tx) => tx.amountInBaseCurrency);
    const mean = average(amounts);
    const std = stdDeviation(amounts, mean);
    const threshold = Math.max(mean * 1.6, mean + std * 1.5);

    transactions.forEach((tx) => {
      if (tx.amountInBaseCurrency <= threshold) return;

      const reasons = [];
      reasons.push(
        `Сума ${round(
          tx.amountInBaseCurrency
        )} є значно вищою за типове значення ${round(mean)}.`
      );

      if (!tx.note || tx.note.trim().length === 0) {
        reasons.push("Операція не містить пояснювальної нотатки.");
      }

      anomalies.push({
        transactionId: tx._id,
        date: tx.date,
        merchant: tx.note || "Без назви",
        category: tx.categoryId?.name || "Без категорії",
        categoryId: tx.categoryId?._id || null,
        amount: round(tx.amountInBaseCurrency),
        severity: tx.amountInBaseCurrency > threshold * 1.25 ? "high" : "medium",
        reasons,
        reviewStatus: "new",
      });
    });
  });

  return anomalies.sort((a, b) => b.amount - a.amount).slice(0, 10);
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

const buildBudgetAnalysis = (budget, expenseTransactions) => {
  if (!budget) {
    return null;
  }

  const monthStart = new Date(budget.period.year, budget.period.month - 1, 1);
  const monthEnd = new Date(budget.period.year, budget.period.month, 1);

  const monthlyExpenses = expenseTransactions.filter(
    (tx) => tx.date >= monthStart && tx.date < monthEnd
  );

  const totalSpent = monthlyExpenses.reduce(
    (sum, tx) => sum + tx.amountInBaseCurrency,
    0
  );

  const percentage =
    budget.totalLimit > 0 ? (totalSpent / budget.totalLimit) * 100 : 0;

  return {
    month: budget.period.month,
    year: budget.period.year,
    totalLimit: round(budget.totalLimit),
    totalSpent: round(totalSpent),
    usagePercent: round(percentage),
  };
};

const buildRecommendationDocument = (userId, partial) => ({
  userId,
  status: "active",
  availableActions: ["dismiss", "snooze", "mark_done"],
  generatedAt: new Date(),
  ...partial,
});

const buildRecommendations = ({
  userId,
  overview30,
  anomalies,
  goalsAnalysis,
  patterns,
  budgetAnalysis,
}) => {
  const recommendations = [];
  const topDriver = overview30.topDrivers[0] || null;

  if (overview30.expense > overview30.income) {
    recommendations.push(
      buildRecommendationDocument(userId, {
        type: "balance_warning",
        module: "forecast",
        priority: "high",
        groupKey: "immediate_actions",
        groupLabel: GROUP_LABELS.immediate_actions,
        title: "Витрати вже перевищують доходи",
        message:
          "За останні 30 днів витрати перевищили доходи. Варто скоригувати витрати, щоб уникнути подальшого погіршення фінансового балансу.",
        facts: [
          `Доходи: ${overview30.income}`,
          `Витрати: ${overview30.expense}`,
          `Нетто: ${overview30.net}`,
        ],
        explanation:
          "Рекомендація сформована на основі співвідношення доходів і витрат за останні 30 днів.",
        primaryAction: {
          label: "Відкрити прогноз",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "forecast",
        },
        secondaryAction: {
          label: "Переглянути огляд",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "overview",
        },
        context: {
          income30: overview30.income,
          expense30: overview30.expense,
          net30: overview30.net,
        },
        expiresAt: addDays(new Date(), 14),
      })
    );
  }

  if (topDriver && topDriver.share >= 35) {
    recommendations.push(
      buildRecommendationDocument(userId, {
        type: "spending_optimization",
        module: "overview",
        priority: "medium",
        groupKey: "spending_optimization",
        groupLabel: GROUP_LABELS.spending_optimization,
        title: `Категорія «${topDriver.category}» формує найбільшу частку витрат`,
        message: `Категорія «${topDriver.category}» становить ${topDriver.share}% витрат за останні 30 днів. Саме тут потенціал оптимізації виглядає найбільшим.`,
        facts: [
          `Категорія: ${topDriver.category}`,
          `Частка: ${topDriver.share}%`,
          `Сума: ${topDriver.amount}`,
        ],
        explanation:
          "Рекомендація ґрунтується на аналізі структури витрат за останні 30 днів.",
        relatedEntity: topDriver.categoryId
          ? {
              entityType: "category",
              entityId: topDriver.categoryId,
              label: topDriver.category,
            }
          : null,
        primaryAction: {
          label: "Переглянути огляд",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "overview",
        },
        secondaryAction: {
          label: "До патернів витрат",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "patterns",
        },
        context: {
          topDriver,
        },
        expiresAt: addDays(new Date(), 21),
      })
    );
  }

  if (anomalies.length) {
    const anomaly = anomalies[0];

    recommendations.push(
      buildRecommendationDocument(userId, {
        type: "anomaly_alert",
        module: "anomalies",
        priority: anomaly.severity === "high" ? "high" : "medium",
        groupKey: "immediate_actions",
        groupLabel: GROUP_LABELS.immediate_actions,
        title: "Виявлено нетипову витрату",
        message: `Система зафіксувала нетипову операцію в категорії «${anomaly.category}» на суму ${anomaly.amount}. Варто перевірити цю транзакцію.`,
        facts: [
          `Категорія: ${anomaly.category}`,
          `Сума: ${anomaly.amount}`,
          `Причини: ${anomaly.reasons.length}`,
        ],
        explanation: anomaly.reasons.join(" "),
        relatedEntity: anomaly.transactionId
          ? {
              entityType: "transaction",
              entityId: anomaly.transactionId,
              label: anomaly.merchant,
            }
          : null,
        primaryAction: {
          label: "Переглянути аномалії",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "anomalies",
        },
        secondaryAction: {
          label: "Відкрити транзакцію",
          actionType: "open_entity",
          targetType: "transaction",
          targetValue: anomaly.transactionId.toString(),
        },
        context: anomaly,
        expiresAt: addDays(new Date(), 7),
      })
    );
  }

  if (budgetAnalysis && budgetAnalysis.usagePercent >= 80) {
    recommendations.push(
      buildRecommendationDocument(userId, {
        type: "budget_risk",
        module: "overview",
        priority: budgetAnalysis.usagePercent >= 95 ? "high" : "medium",
        groupKey: "immediate_actions",
        groupLabel: GROUP_LABELS.immediate_actions,
        title: "Є ризик перевищення бюджету",
        message: `Поточні витрати вже використали ${budgetAnalysis.usagePercent}% місячного бюджету. Варто скоригувати витрати до кінця періоду.`,
        facts: [
          `Ліміт: ${budgetAnalysis.totalLimit}`,
          `Витрачено: ${budgetAnalysis.totalSpent}`,
          `Використано: ${budgetAnalysis.usagePercent}%`,
        ],
        explanation:
          "Рекомендація сформована на основі аналізу поточного бюджету користувача та фактичних витрат за місяць.",
        primaryAction: {
          label: "Переглянути огляд",
          actionType: "navigate",
          targetType: "tab",
          targetValue: "overview",
        },
        secondaryAction: null,
        context: budgetAnalysis,
        expiresAt: addDays(new Date(), 10),
      })
    );
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

  const overview7 = buildOverviewPeriod(transactions, 7);
  const overview30 = buildOverviewPeriod(transactions, 30);
  const overview90 = buildOverviewPeriod(transactions, 90);

  const anomalies = detectAnomalies(expenseTransactions);
  const forecast = buildForecast(transactions);
  const goalsAnalysis = buildGoalsAnalysis(goals, transactions);
  const patterns = buildPatterns(expenseTransactions);
  const budgetAnalysis = buildBudgetAnalysis(budget, expenseTransactions);

  await archiveCurrentRecommendations(userId);

  const recommendationPayload = buildRecommendations({
    userId,
    overview30,
    anomalies,
    goalsAnalysis,
    patterns,
    budgetAnalysis,
  });

  const createdRecommendations = recommendationPayload.length
    ? await Recommendation.insertMany(recommendationPayload)
    : [];

  const snapshotData = {
    recommendations: {
      groups: buildRecommendationGroups(createdRecommendations),
    },
    overviewByPeriod: {
      "7d": overview7,
      "30d": overview30,
      "90d": overview90,
    },
    anomalies: {
      items: anomalies,
      total: anomalies.length,
    },
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
          anomalyCount: anomalies.length,
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