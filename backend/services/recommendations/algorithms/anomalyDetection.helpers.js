const DAY_MS = 24 * 60 * 60 * 1000;

const round = (value, precision = 2) => {
  const numeric = Number(value || 0);
  return Number(numeric.toFixed(precision));
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const startOfDay = (date = new Date()) => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);

const getCategoryId = (transaction) =>
  transaction?.categoryId?._id?.toString() ||
  transaction?.categoryId?.toString() ||
  "unknown";

const getCategoryName = (transaction) =>
  transaction?.categoryId?.name || "Без категорії";

const getTransactionAmount = (transaction) =>
  Number(transaction?.amountInBaseCurrency || 0);

const sortNumbersAsc = (values) => [...values].sort((a, b) => a - b);

const computeMedian = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;

  const sorted = sortNumbersAsc(values);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }

  return sorted[middle];
};

const computeMad = (values, medianValue = null) => {
  if (!Array.isArray(values) || values.length === 0) return 0;

  const median = medianValue ?? computeMedian(values);
  const deviations = values.map((value) => Math.abs(value - median));

  return computeMedian(deviations);
};

const computeRobustZScore = (value, median, mad) => {
  if (!Number.isFinite(value) || !Number.isFinite(median) || !Number.isFinite(mad) || mad <= 0) {
    return 0;
  }

  return 0.6745 * ((value - median) / mad);
};

const calculateAmountRatio = (amount, baselineMedian) => {
  const safeMedian = Math.max(Number(baselineMedian || 0), 1);
  return amount / safeMedian;
};

const mapRatioToAmountScore = (ratio, mode = "category") => {
  if (!Number.isFinite(ratio) || ratio <= 1) return 0;

  if (mode === "user") {
    if (ratio < 1.5) return 0;
    if (ratio < 2) return 0.3;
    if (ratio < 3) return 0.6;
    return 1;
  }

  if (ratio < 1.4) return 0;
  if (ratio < 2) return 0.4;
  if (ratio < 3) return 0.7;
  return 1;
};

const normalizeRobustZScore = (robustZ, offset, range) => {
  const absZ = Math.abs(Number(robustZ || 0));
  return clamp((absZ - offset) / range, 0, 1);
};

const getSeverityByScore = (score) => {
  if (score >= 80) return "high";
  if (score >= 60) return "medium";
  if (score >= 40) return "low";
  return "normal";
};

const getConfidenceLabel = (value) => {
  if (value >= 0.8) return "high";
  if (value >= 0.45) return "medium";
  return "low";
};

const getMonthKey = (date) => {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  return `${year}-${month}`;
};

const daysBetween = (from, to) => {
  const start = startOfDay(from).getTime();
  const end = startOfDay(to).getTime();
  return Math.max(0, Math.floor((end - start) / DAY_MS));
};

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const buildCategoryLimitMap = (budget) => {
  const map = new Map();

  if (!budget || !Array.isArray(budget.categoryLimits)) {
    return map;
  }

  budget.categoryLimits.forEach((item) => {
    const categoryId =
      item?.categoryId?._id?.toString() ||
      item?.categoryId?.toString();

    if (!categoryId) return;

    map.set(categoryId, Number(item.limit || 0));
  });

  return map;
};

const prepareExpenseTransactions = (transactions = []) => {
  const expensesSorted = [];
  let skippedCount = 0;

  transactions.forEach((tx) => {
    const amount = getTransactionAmount(tx);
    const hasCategory = Boolean(tx?.categoryId);
    const hasDate = Boolean(tx?.date);

    if (tx?.type !== "expense" || amount <= 0 || !hasCategory || !hasDate) {
      skippedCount += 1;
      return;
    }

    expensesSorted.push(tx);
  });

  expensesSorted.sort((a, b) => new Date(a.date) - new Date(b.date));

  return {
    expensesSorted,
    skippedCount,
  };
};

const splitBaselineAndCandidates = (
  expenses,
  {
    now = new Date(),
    baselineWindowDays = 180,
    candidateWindowDays = 30,
  } = {}
) => {
  const today = startOfDay(now);
  const baselineStart = addDays(today, -(baselineWindowDays - 1));
  const candidateStart = addDays(today, -(candidateWindowDays - 1));

  const baselineTransactions = [];
  const candidateTransactions = [];

  expenses.forEach((tx) => {
    const txDate = new Date(tx.date);

    if (txDate < baselineStart || txDate > now) {
      return;
    }

    if (txDate >= candidateStart) {
      candidateTransactions.push(tx);
    } else {
      baselineTransactions.push(tx);
    }
  });

  return {
    baselineTransactions,
    candidateTransactions,
    baselineStart,
    candidateStart,
  };
};

const buildUserAmountStats = (baselineTransactions = []) => {
  const amounts = baselineTransactions.map(getTransactionAmount);
  const median = computeMedian(amounts);
  const mad = computeMad(amounts, median);

  return {
    count: amounts.length,
    median: round(median),
    mad: round(mad),
    minAmount: amounts.length ? round(Math.min(...amounts)) : 0,
    maxAmount: amounts.length ? round(Math.max(...amounts)) : 0,
  };
};

const buildCategoryStatsMap = (baselineTransactions = []) => {
  const grouped = new Map();

  baselineTransactions.forEach((tx) => {
    const categoryId = getCategoryId(tx);
    const current = grouped.get(categoryId) || {
      categoryId,
      categoryName: getCategoryName(tx),
      amounts: [],
      dates: [],
      totalAmount: 0,
    };

    const amount = getTransactionAmount(tx);
    current.amounts.push(amount);
    current.dates.push(new Date(tx.date));
    current.totalAmount += amount;

    grouped.set(categoryId, current);
  });

  const categoryStatsMap = new Map();

  grouped.forEach((bucket, categoryId) => {
    const sortedDates = bucket.dates.sort((a, b) => a - b);
    const median = computeMedian(bucket.amounts);
    const mad = computeMad(bucket.amounts, median);

    const monthSet = new Set(sortedDates.map(getMonthKey));
    const averageMonthlyFrequency =
      monthSet.size > 0 ? bucket.amounts.length / monthSet.size : bucket.amounts.length;

    categoryStatsMap.set(categoryId, {
      categoryId,
      categoryName: bucket.categoryName,
      count: bucket.amounts.length,
      median: round(median),
      mad: round(mad),
      totalAmount: round(bucket.totalAmount),
      averageMonthlyFrequency: round(averageMonthlyFrequency),
      firstSeenAt: sortedDates[0] || null,
      lastSeenAt: sortedDates[sortedDates.length - 1] || null,
    });
  });

  return categoryStatsMap;
};

const buildCurrentCategoryFrequencyMap = (candidateTransactions = []) => {
  const map = new Map();

  candidateTransactions.forEach((tx) => {
    const categoryId = getCategoryId(tx);
    map.set(categoryId, (map.get(categoryId) || 0) + 1);
  });

  return map;
};

const buildBudgetState = ({ budget, baselineTransactions = [], candidateTransactions = [] }) => {
  const categoryLimitMap = buildCategoryLimitMap(budget);

  const baselineCategorySpentMap = new Map();
  let baselineTotalSpent = 0;

  baselineTransactions.forEach((tx) => {
    const categoryId = getCategoryId(tx);
    const amount = getTransactionAmount(tx);

    baselineCategorySpentMap.set(
      categoryId,
      (baselineCategorySpentMap.get(categoryId) || 0) + amount
    );

    baselineTotalSpent += amount;
  });

  const candidateSorted = [...candidateTransactions].sort(
    (a, b) => new Date(a.date) - new Date(b.date)
  );

  const transactionBudgetProgressMap = new Map();
  const runningCategorySpentMap = new Map();
  let runningTotalSpent = baselineTotalSpent;

  candidateSorted.forEach((tx) => {
    const txId = tx._id.toString();
    const categoryId = getCategoryId(tx);
    const amount = getTransactionAmount(tx);

    const categorySpentBefore =
      (baselineCategorySpentMap.get(categoryId) || 0) + 
      (runningCategorySpentMap.get(categoryId) || 0);

    const totalSpentBefore = runningTotalSpent;

    const categorySpentAfter = categorySpentBefore + amount;
    const totalSpentAfter = totalSpentBefore + amount;

    transactionBudgetProgressMap.set(txId, {
      categorySpentBefore: round(categorySpentBefore),
      categorySpentAfter: round(categorySpentAfter),
      totalSpentBefore: round(totalSpentBefore),
      totalSpentAfter: round(totalSpentAfter),
      categoryLimit: round(categoryLimitMap.get(categoryId) || 0),
      totalLimit: round(Number(budget?.totalLimit || 0)),
    });

    runningCategorySpentMap.set(
      categoryId,
      (runningCategorySpentMap.get(categoryId) || 0) + amount
    );

    runningTotalSpent += amount;
  });

  return {
    hasBudget: Boolean(budget),
    totalLimit: round(Number(budget?.totalLimit || 0)),
    categoryLimitMap,
    transactionBudgetProgressMap,
  };
};

const computeUserAmountScore = (amount, userStats) => {
  if (!userStats || userStats.count < 5 || userStats.median <= 0) {
    return {
      score: 0,
      reason: null,
      metrics: {
        userMedian: round(userStats?.median || 0),
        userMad: round(userStats?.mad || 0),
        userRobustZ: 0,
        userRatio: 0,
      },
    };
  }

  const robustZ = userStats.mad > 0
    ? computeRobustZScore(amount, userStats.median, userStats.mad)
    : 0;

  const ratio = calculateAmountRatio(amount, userStats.median);

  const score = userStats.mad > 0
    ? normalizeRobustZScore(robustZ, 1.5, 3.5)
    : mapRatioToAmountScore(ratio, "user");

  let reason = null;

  if (score >= 0.45 && ratio >= 1.5) {
    reason = `Сума транзакції у ${round(ratio, 1)} раза перевищує типову медіанну витрату користувача.`;
  }

  return {
    score: round(score, 4),
    reason,
    metrics: {
      userMedian: round(userStats.median),
      userMad: round(userStats.mad),
      userRobustZ: round(robustZ),
      userRatio: round(ratio, 2),
    },
  };
};

const computeCategoryAmountScore = (amount, categoryStats) => {
  if (!categoryStats || categoryStats.count === 0 || categoryStats.median <= 0) {
    return {
      score: 0,
      reason: null,
      metrics: {
        categoryMedian: 0,
        categoryMad: 0,
        categoryRobustZ: 0,
        categoryRatio: 0,
        categoryCount: 0,
      },
    };
  }

  const robustZ = categoryStats.mad > 0
    ? computeRobustZScore(amount, categoryStats.median, categoryStats.mad)
    : 0;

  const ratio = calculateAmountRatio(amount, categoryStats.median);

  const score = categoryStats.mad > 0
    ? normalizeRobustZScore(robustZ, 1.5, 3.0)
    : mapRatioToAmountScore(ratio, "category");

  let reason = null;

  if (score >= 0.4 && ratio >= 1.4) {
    reason = `Сума у ${round(ratio, 1)} раза перевищує типову медіанну витрату в категорії «${categoryStats.categoryName}».`;
  }

  return {
    score: round(score, 4),
    reason,
    metrics: {
      categoryMedian: round(categoryStats.median),
      categoryMad: round(categoryStats.mad),
      categoryRobustZ: round(robustZ),
      categoryRatio: round(ratio, 2),
      categoryCount: categoryStats.count,
    },
  };
};

const computeNoveltyScore = ({ categoryStats, transactionDate, now = new Date() }) => {
  if (!categoryStats || categoryStats.count === 0) {
    return {
      score: 1,
      reason: "Категорія є новою для користувача в межах історичного вікна аналізу.",
      metrics: {
        isNewCategory: true,
        daysSinceLastSeen: null,
      },
    };
  }

  const daysSinceLastSeen = categoryStats.lastSeenAt
    ? daysBetween(categoryStats.lastSeenAt, transactionDate || now)
    : null;

  let score = 0;
  let reason = null;

  if (Number.isFinite(daysSinceLastSeen) && daysSinceLastSeen > 60) {
    score = 0.6;
    reason = `Категорія не використовувалась ${daysSinceLastSeen} днів.`;
  } else if (Number.isFinite(daysSinceLastSeen) && daysSinceLastSeen > 30) {
    score = 0.3;
    reason = `Категорія не використовувалась ${daysSinceLastSeen} днів.`;
  }

  return {
    score,
    reason,
    metrics: {
      isNewCategory: false,
      daysSinceLastSeen,
    },
  };
};

const computeFrequencyScore = ({ categoryStats, currentCategoryFrequency }) => {
  if (!categoryStats || categoryStats.count === 0) {
    return {
      score: 0,
      reason: null,
      metrics: {
        currentCategoryFrequency,
        averageMonthlyFrequency: 0,
        frequencyRatio: 0,
      },
    };
  }

  const averageMonthlyFrequency = Math.max(
    Number(categoryStats.averageMonthlyFrequency || 0),
    1
  );

  const frequencyRatio = currentCategoryFrequency / averageMonthlyFrequency;

  let score = 0;
  let reason = null;

  if (frequencyRatio > 3) {
    score = 1;
  } else if (frequencyRatio > 2) {
    score = 0.7;
  } else if (frequencyRatio > 1.5) {
    score = 0.4;
  }

  if (score >= 0.4) {
    reason = `Частота витрат у цій категорії перевищує звичний темп у ${round(frequencyRatio, 1)} раза.`;
  }

  return {
    score,
    reason,
    metrics: {
      currentCategoryFrequency,
      averageMonthlyFrequency: round(categoryStats.averageMonthlyFrequency),
      frequencyRatio: round(frequencyRatio, 2),
    },
  };
};

const computeBudgetImpactScore = ({ transaction, budgetState }) => {
  if (!budgetState?.hasBudget) {
    return {
      score: 0,
      reason: null,
      metrics: {
        categoryBudgetUsageAfterTx: null,
        totalBudgetUsageAfterTx: null,
      },
    };
  }

  const progress = budgetState.transactionBudgetProgressMap.get(transaction._id.toString());

  if (!progress) {
    return {
      score: 0,
      reason: null,
      metrics: {
        categoryBudgetUsageAfterTx: null,
        totalBudgetUsageAfterTx: null,
      },
    };
  }

  const categoryUsage = progress.categoryLimit > 0
    ? (progress.categorySpentAfter / progress.categoryLimit) * 100
    : null;

  const totalUsage = progress.totalLimit > 0
    ? (progress.totalSpentAfter / progress.totalLimit) * 100
    : null;

  let score = 0;
  let reason = null;

  if (Number.isFinite(categoryUsage) && categoryUsage > 100) {
    score = 1;
    reason = `Після транзакції ліміт категорії буде перевищено на ${round(categoryUsage - 100)}%.`;
  } else if (Number.isFinite(categoryUsage) && categoryUsage > 90) {
    score = 0.6;
    reason = `Після транзакції використання ліміту категорії сягне ${round(categoryUsage)}%.`;
  }

  if (score < 0.8) {
    if (Number.isFinite(totalUsage) && totalUsage > 100) {
      score = Math.max(score, 0.8);
      reason = `Після транзакції загальний бюджет буде перевищено на ${round(totalUsage - 100)}%.`;
    } else if (Number.isFinite(totalUsage) && totalUsage > 90) {
      score = Math.max(score, 0.4);
      reason = reason || `Після транзакції використання загального бюджету сягне ${round(totalUsage)}%.`;
    }
  }

  return {
    score,
    reason,
    metrics: {
      categoryBudgetUsageAfterTx: Number.isFinite(categoryUsage) ? round(categoryUsage) : null,
      totalBudgetUsageAfterTx: Number.isFinite(totalUsage) ? round(totalUsage) : null,
    },
  };
};

const computeConfidence = ({ userStats, categoryStats }) => {
  let userConfidence = 0.2;
  let categoryConfidence = 0.2;

  if (userStats?.count >= 30) userConfidence = 1;
  else if (userStats?.count >= 15) userConfidence = 0.7;
  else if (userStats?.count >= 8) userConfidence = 0.4;

  if (categoryStats?.count >= 10) categoryConfidence = 1;
  else if (categoryStats?.count >= 5) categoryConfidence = 0.7;
  else if (categoryStats?.count >= 3) categoryConfidence = 0.4;

  const combined = round(0.6 * categoryConfidence + 0.4 * userConfidence, 4);

  return {
    userConfidence,
    categoryConfidence,
    combined,
    label: getConfidenceLabel(combined),
  };
};

const combineAnomalyScore = (featureScores, confidenceCombined) => {
  const rawScore =
    0.3 * Number(featureScores.categoryAmount || 0) +
    0.2 * Number(featureScores.userAmount || 0) +
    0.2 * Number(featureScores.novelty || 0) +
    0.15 * Number(featureScores.frequency || 0) +
    0.15 * Number(featureScores.budgetImpact || 0);

  const adjustedScore = rawScore * (0.6 + 0.4 * Number(confidenceCombined || 0));
  const anomalyScore = Math.round(clamp(adjustedScore, 0, 1) * 100);

  return {
    rawScore: round(rawScore, 4),
    adjustedScore: round(adjustedScore, 4),
    anomalyScore,
    severity: getSeverityByScore(anomalyScore),
  };
};

const buildAnomalyReasons = (featureResults) =>
  Object.values(featureResults)
    .map((item) => item?.reason)
    .filter(Boolean)
    .slice(0, 5);

module.exports = {
  DAY_MS,
  round,
  clamp,
  startOfDay,
  addDays,
  getCategoryId,
  getCategoryName,
  getTransactionAmount,
  computeMedian,
  computeMad,
  computeRobustZScore,
  calculateAmountRatio,
  mapRatioToAmountScore,
  normalizeRobustZScore,
  getSeverityByScore,
  getConfidenceLabel,
  daysBetween,
  average,
  prepareExpenseTransactions,
  splitBaselineAndCandidates,
  buildUserAmountStats,
  buildCategoryStatsMap,
  buildCurrentCategoryFrequencyMap,
  buildBudgetState,
  computeUserAmountScore,
  computeCategoryAmountScore,
  computeNoveltyScore,
  computeFrequencyScore,
  computeBudgetImpactScore,
  computeConfidence,
  combineAnomalyScore,
  buildAnomalyReasons,
};