"use strict";

const N_SIMULATIONS = 1000;
const MIN_SIGMA_RATIO = 0.15; // minimum σ = 15% of μ when historical data is sparse

// ─── Math utilities ───────────────────────────────────────────────────────────

const round = (v) => Number(((v || 0)).toFixed(2));

const mean = (arr) => {
  if (!arr.length) return 0;
  return arr.reduce((s, x) => s + x, 0) / arr.length;
};

const stddev = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
};

const percentileOf = (sortedArr, p) => {
  if (!sortedArr.length) return 0;
  const idx = Math.min(
    sortedArr.length - 1,
    Math.floor((p / 100) * sortedArr.length)
  );
  return sortedArr[idx];
};

// ─── Normal random variable via Box-Muller transform ─────────────────────────

const gaussian = (mu, sigma) => {
  if (sigma <= 0) return mu;
  const u1 = Math.max(Math.random(), 1e-10);
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mu + sigma * z;
};

// ─── Data preparation ────────────────────────────────────────────────────────

const aggregateByMonth = (transactions) => {
  const map = new Map();

  transactions.forEach((tx) => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    const entry = map.get(key) || { income: 0, expense: 0 };
    if (tx.type === "income") entry.income += tx.amountInBaseCurrency;
    else entry.expense += tx.amountInBaseCurrency;
    map.set(key, entry);
  });

  return [...map.values()];
};

const monthsBetween = (from, to) => {
  const years = to.getFullYear() - from.getFullYear();
  const months = to.getMonth() - from.getMonth();
  const raw = years * 12 + months;
  return Math.max(0, raw + (to.getDate() >= from.getDate() ? 0 : -1));
};

// ─── Core simulation ─────────────────────────────────────────────────────────

/**
 * Run N Monte Carlo paths.
 * Each month: income ~ N(μInc, σInc), expense ~ N(μExp, σExp), clamped to ≥ 0.
 * An optional fixedMonthly is added unconditionally (for what-if scenarios).
 * Returns sorted finalAmounts array and success probability.
 */
const runSimulation = (
  n,
  monthsLeft,
  startAmount,
  targetAmount,
  μInc,
  σInc,
  μExp,
  σExp,
  fixedMonthly = 0
) => {
  const finalAmounts = new Array(n);
  let successes = 0;

  for (let i = 0; i < n; i++) {
    let savings = startAmount;
    for (let m = 0; m < monthsLeft; m++) {
      const inc = Math.max(0, gaussian(μInc, σInc));
      const exp = Math.max(0, gaussian(μExp, σExp));
      savings += Math.max(0, inc - exp) + fixedMonthly;
    }
    finalAmounts[i] = savings;
    if (savings >= targetAmount) successes++;
  }

  finalAmounts.sort((a, b) => a - b);

  return {
    probability: round((successes / n) * 100),
    finalAmounts,
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

const buildGoalsAnalysis = (goals, transactions) => {
  const activeGoal = goals
    .filter((g) => g.status === "in_progress")
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))[0];

  // Aggregate transactions into monthly income/expense buckets
  const monthlyData = aggregateByMonth(transactions);
  const incomes  = monthlyData.map((m) => m.income);
  const expenses = monthlyData.map((m) => m.expense);

  const μInc = mean(incomes);
  const μExp = mean(expenses);

  // Raw stddev — zero when only one month of data
  const rawσInc = stddev(incomes);
  const rawσExp = stddev(expenses);

  // Apply minimum spread so simulation doesn't collapse to a single line
  const σInc = Math.max(rawσInc, μInc * MIN_SIGMA_RATIO);
  const σExp = Math.max(rawσExp, μExp * MIN_SIGMA_RATIO);

  const monthlyFreeCashFlow = round(μInc - μExp);
  const dataMonths = monthlyData.length;

  const simulationMeta = {
    n: N_SIMULATIONS,
    dataMonths,
    monthlyIncome:  { mean: round(μInc),  stddev: round(rawσInc) },
    monthlyExpense: { mean: round(μExp),  stddev: round(rawσExp) },
  };

  if (!activeGoal) {
    return {
      goal: null,
      probability: null,
      whatIf: [],
      distribution: [],
      monthlyFreeCashFlow,
      simulation: simulationMeta,
    };
  }

  const now = new Date();
  const deadline = new Date(activeGoal.deadline);
  const monthsLeft = monthsBetween(now, deadline);
  const remainingAmount = Math.max(0, activeGoal.targetAmount - activeGoal.currentAmount);
  const requiredMonthlySavings =
    monthsLeft > 0 ? remainingAmount / monthsLeft : remainingAmount;

  const goalBase = {
    _id: activeGoal._id,
    name: activeGoal.name,
    targetAmount: round(activeGoal.targetAmount),
    currentAmount: round(activeGoal.currentAmount),
    deadline: activeGoal.deadline,
    remainingAmount: round(remainingAmount),
    monthsLeft,
    requiredMonthlySavings: round(requiredMonthlySavings),
  };

  // Goal is at or past deadline — deterministic outcome
  if (monthsLeft === 0) {
    return {
      goal: goalBase,
      probability: activeGoal.currentAmount >= activeGoal.targetAmount ? 100 : 0,
      whatIf: [],
      distribution: [],
      monthlyFreeCashFlow,
      simulation: { ...simulationMeta, n: 0 },
    };
  }

  // Base Monte Carlo simulation
  const base = runSimulation(
    N_SIMULATIONS,
    monthsLeft,
    activeGoal.currentAmount,
    activeGoal.targetAmount,
    μInc,
    σInc,
    μExp,
    σExp
  );

  // What-if scenarios — each runs a full simulation with modified parameters
  const scenarios = [
    {
      scenario: "Поточний темп",
      μInc,       σInc,
      μExp,       σExp,
      extra: 0,
    },
    {
      scenario: "+20% доходів",
      μInc: μInc * 1.2, σInc: σInc * 1.2,
      μExp,             σExp,
      extra: 0,
    },
    {
      scenario: "-20% витрат",
      μInc,             σInc,
      μExp: μExp * 0.8, σExp: σExp * 0.8,
      extra: 0,
    },
    {
      scenario: "+10% доходів, -10% витрат",
      μInc: μInc * 1.1, σInc,
      μExp: μExp * 0.9, σExp,
      extra: 0,
    },
  ];

  const whatIf = scenarios.map((s) => {
    const result = runSimulation(
      N_SIMULATIONS,
      monthsLeft,
      activeGoal.currentAmount,
      activeGoal.targetAmount,
      s.μInc,
      s.σInc,
      s.μExp,
      s.σExp,
      s.extra
    );
    return {
      scenario: s.scenario,
      monthlySavings: round(s.μInc - s.μExp + s.extra),
      probability: result.probability,
    };
  });

  // Distribution: P10/P25/P50/P75/P90 of simulated final amounts
  const distribution = [10, 25, 50, 75, 90].map((p) => ({
    percentile: p,
    amountByDeadline: round(percentileOf(base.finalAmounts, p)),
  }));

  return {
    goal: goalBase,
    probability: base.probability,
    whatIf,
    distribution,
    monthlyFreeCashFlow,
    simulation: simulationMeta,
  };
};

module.exports = { buildGoalsAnalysis };
