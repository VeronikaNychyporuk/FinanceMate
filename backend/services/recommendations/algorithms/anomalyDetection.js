const {
  round,
  getCategoryId,
  getCategoryName,
  getTransactionAmount,
  prepareExpenseTransactions,
  splitBaselineAndCandidates,
  buildUserAmountStats,
  buildCategoryStatsMap,
  buildCurrentCategoryFrequencyMap,
  buildBudgetState,
  buildPreviousCategoryTransactionMap,
  computeUserAmountScore,
  computeCategoryAmountScore,
  computeNoveltyScore,
  computeFrequencyScore,
  computeBudgetImpactScore,
  computeConfidence,
  combineAnomalyScore,
  buildAnomalyReasons,
} = require("./anomalyDetection.helpers");

const DEFAULT_OPTIONS = {
  baselineWindowDays: 180,
  candidateWindowDays: 30,
  minGlobalBaselineCount: 8,
  minCategoryBaselineCount: 3,
  minAbsoluteAmount: 5,
  minRelativeAmountFactor: 0.35,
  maxItems: 20,
  minScoreForListing: 40,
};

const buildSummary = (
  items,
  totalAnalyzed,
  baselineTransactions,
  candidateTransactions,
  userStats
) => {
  const flagged = items.filter((item) => item.severity !== "normal");

  const averageScore = flagged.length
    ? round(flagged.reduce((sum, item) => sum + item.anomalyScore, 0) / flagged.length)
    : 0;

  const confidenceBase =
    userStats.count >= 30 ? "high" : userStats.count >= 12 ? "medium" : "low";

  return {
    totalAnalyzed,
    totalFlagged: flagged.length,
    high: flagged.filter((item) => item.severity === "high").length,
    medium: flagged.filter((item) => item.severity === "medium").length,
    low: flagged.filter((item) => item.severity === "low").length,
    averageScore,
    dataConfidence: confidenceBase,
    baselineTransactionCount: baselineTransactions.length,
    candidateTransactionCount: candidateTransactions.length,
  };
};

const shouldAnalyzeTransaction = ({
  transaction,
  userStats,
  categoryStats,
  options,
}) => {
  const amount = getTransactionAmount(transaction);

  const minimumRelative = Math.max(
    Number(userStats?.median || 0) * options.minRelativeAmountFactor,
    options.minAbsoluteAmount
  );

  const hasEnoughGlobalHistory = userStats.count >= options.minGlobalBaselineCount;
  const hasEnoughCategoryHistory =
    (categoryStats?.count || 0) >= options.minCategoryBaselineCount;
  const isNewCategory = !categoryStats || categoryStats.count === 0;

  if (amount < minimumRelative) {
    return false;
  }

  if (hasEnoughGlobalHistory || hasEnoughCategoryHistory) {
    return true;
  }

  if (isNewCategory && amount >= Math.max(options.minAbsoluteAmount, userStats.median || 0)) {
    return true;
  }

  return false;
};

const scoreTransactionAnomaly = ({
  transaction,
  userStats,
  categoryStats,
  currentCategoryFrequency,
  budgetState,
  previousCategoryTransactionDate,
}) => {
  const amount = getTransactionAmount(transaction);

  const userAmount = computeUserAmountScore(amount, userStats);

  const categoryAmount = computeCategoryAmountScore(amount, categoryStats);

  const novelty = computeNoveltyScore({
    categoryStats,
    previousCategoryTransactionDate,
    transactionDate: new Date(transaction.date),
  });

  const frequency = computeFrequencyScore({
    categoryStats,
    currentCategoryFrequency,
  });

  const budgetImpact = computeBudgetImpactScore({
    transaction,
    budgetState,
  });

  const confidence = computeConfidence({
    userStats,
    categoryStats,
  });

  const combined = combineAnomalyScore(
    {
      categoryAmount: categoryAmount.score,
      userAmount: userAmount.score,
      novelty: novelty.score,
      frequency: frequency.score,
      budgetImpact: budgetImpact.score,
    },
    confidence.combined
  );

  const reasons = buildAnomalyReasons({
    categoryAmount,
    userAmount,
    novelty,
    frequency,
    budgetImpact,
  });

  return {
    transactionId: transaction._id,
    date: transaction.date,
    categoryId: getCategoryId(transaction),
    category: getCategoryName(transaction),
    label: transaction.note || "Транзакція без нотатки",
    amount: round(amount),
    anomalyScore: combined.anomalyScore,
    severity: combined.severity,
    confidence: confidence.label,
    reasons,
    reviewStatus: "new",
    metrics: {
      ...userAmount.metrics,
      ...categoryAmount.metrics,
      ...novelty.metrics,
      ...frequency.metrics,
      ...budgetImpact.metrics,
      rawScore: combined.rawScore,
      adjustedScore: combined.adjustedScore,
      userConfidence: confidence.userConfidence,
      categoryConfidence: confidence.categoryConfidence,
      confidenceCombined: confidence.combined,
    },
  };
};

const analyzeAnomalies = ({
  transactions = [],
  budget = null,
  now = new Date(),
  options = {},
}) => {
  const mergedOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const { expensesSorted, skippedCount } = prepareExpenseTransactions(transactions);

  const {
    baselineTransactions,
    candidateTransactions,
    baselineStart,
    candidateStart,
  } = splitBaselineAndCandidates(expensesSorted, {
    now,
    baselineWindowDays: mergedOptions.baselineWindowDays,
    candidateWindowDays: mergedOptions.candidateWindowDays,
  });

  const userStats = buildUserAmountStats(baselineTransactions);
  const categoryStatsMap = buildCategoryStatsMap(baselineTransactions);
  const currentCategoryFrequencyMap = buildCurrentCategoryFrequencyMap(candidateTransactions);
  const budgetState = buildBudgetState({
    budget,
    baselineTransactions,
    candidateTransactions,
  });

  const previousCategoryTransactionMap =
    buildPreviousCategoryTransactionMap(expensesSorted);

  const scoredItems = [];

  candidateTransactions.forEach((transaction) => {
    const categoryId = getCategoryId(transaction);
    const categoryStats = categoryStatsMap.get(categoryId) || null;

    const shouldAnalyze = shouldAnalyzeTransaction({
      transaction,
      userStats,
      categoryStats,
      options: mergedOptions,
    });

    if (!shouldAnalyze) {
      return;
    }

    const previousCategoryInfo =
      previousCategoryTransactionMap.get(transaction._id.toString()) || {};

    const result = scoreTransactionAnomaly({
      transaction,
      userStats,
      categoryStats,
      currentCategoryFrequency: currentCategoryFrequencyMap.get(categoryId) || 0,
      budgetState,
      previousCategoryTransactionDate:
        previousCategoryInfo.previousCategoryTransactionDate || null,
    });

    if (result.anomalyScore >= mergedOptions.minScoreForListing) {
      scoredItems.push(result);
    }
  });

  scoredItems.sort((a, b) => {
    if (b.anomalyScore !== a.anomalyScore) {
      return b.anomalyScore - a.anomalyScore;
    }

    return new Date(b.date) - new Date(a.date);
  });

  const items = scoredItems.slice(0, mergedOptions.maxItems);
  const topAnomalies = items.slice(0, 5);

  return {
    summary: buildSummary(
      items,
      candidateTransactions.length,
      baselineTransactions,
      candidateTransactions,
      userStats
    ),
    items,
    topAnomalies,
    meta: {
      baselineWindowDays: mergedOptions.baselineWindowDays,
      candidateWindowDays: mergedOptions.candidateWindowDays,
      generatedAt: now,
      skippedCount,
      baselineStart,
      candidateStart,
    },
  };
};

module.exports = {
  analyzeAnomalies,
};