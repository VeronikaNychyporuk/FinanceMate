"use strict";

const N_SIMULATIONS = 1000;
const MAX_SIM_MONTHS = 120;    // горизонт симуляції — 10 років
const MIN_SIGMA_RATIO = 0.20;  // мінімальне σ = 20% від μ при малій кількості даних

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
  if (!sortedArr.length) return null;
  const idx = Math.min(sortedArr.length - 1, Math.floor((p / 100) * sortedArr.length));
  return sortedArr[idx];
};

const gaussian = (mu, sigma) => {
  if (sigma <= 0) return mu;
  const u1 = Math.max(Math.random(), 1e-10);
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mu + sigma * z;
};

// ─── Double Exponential Smoothing (Holt) — для тренду внесків ─────────────────

const doubleES = (series, alpha, beta) => {
  let L = series[0];
  let T = series.length > 1 ? series[1] - series[0] : 0;
  const fitted = [L + T];

  for (let i = 1; i < series.length; i++) {
    const prevL = L;
    L = alpha * series[i] + (1 - alpha) * (L + T);
    T = beta * (L - prevL) + (1 - beta) * T;
    fitted.push(L + T);
  }

  return { L, T, fitted };
};

const optimizeDoubleES = (series) => {
  if (series.length < 3) return { alpha: 0.3, beta: 0.1 };

  let bestAlpha = 0.3, bestBeta = 0.1, bestMSE = Infinity;

  for (const alpha of [0.1, 0.2, 0.3, 0.5, 0.7, 0.9]) {
    for (const beta of [0.05, 0.1, 0.2, 0.3]) {
      const { fitted } = doubleES(series, alpha, beta);
      const mse = mean(series.slice(1).map((v, i) => (v - fitted[i]) ** 2));
      if (mse < bestMSE) { bestMSE = mse; bestAlpha = alpha; bestBeta = beta; }
    }
  }

  return { alpha: bestAlpha, beta: bestBeta };
};

// ─── Агрегація GoalTransaction по місяцях ────────────────────────────────────

const aggregateGoalByMonth = (goalTxs) => {
  const map = new Map();

  goalTxs.forEach((tx) => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, "0")}`;
    const entry = map.get(key) || { key, net: 0 };
    const delta = tx.type === "deposit"
      ? tx.amountInBaseCurrency
      : -tx.amountInBaseCurrency;
    entry.net += delta;
    map.set(key, entry);
  });

  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
};

const monthsBetween = (from, to) => {
  const years  = to.getFullYear() - from.getFullYear();
  const months = to.getMonth()    - from.getMonth();
  const raw    = years * 12 + months;
  return Math.max(0, raw + (to.getDate() >= from.getDate() ? 0 : -1));
};

// ─── Одна Monte Carlo симуляція ───────────────────────────────────────────────

const runSimulation = (currentAmount, targetAmount, μ, σ, multiplier = 1) => {
  const adjμ = Math.max(0, μ * multiplier);
  const adjσ = σ * Math.abs(multiplier);

  const monthsToReach = new Array(N_SIMULATIONS);

  for (let i = 0; i < N_SIMULATIONS; i++) {
    let savings = currentAmount;
    let months  = 0;

    while (savings < targetAmount && months < MAX_SIM_MONTHS) {
      savings += Math.max(0, gaussian(adjμ, adjσ));
      months++;
    }

    monthsToReach[i] = savings >= targetAmount ? months : MAX_SIM_MONTHS + 1;
  }

  monthsToReach.sort((a, b) => a - b);
  return monthsToReach;
};

// ─── Форматування місяців ─────────────────────────────────────────────────────

const formatMonths = (m) => {
  if (m == null || m > MAX_SIM_MONTHS) return null;
  if (m < 1) return "менше місяця";
  if (m < 12) return `${m} міс.`;
  const years = Math.floor(m / 12);
  const rem   = m % 12;
  return rem === 0 ? `${years} р.` : `${years} р. ${rem} міс.`;
};

// ─── Аналіз однієї цілі ───────────────────────────────────────────────────────

const analyzeGoal = (goal, goalTxs) => {
  const now      = new Date();
  const deadline = new Date(goal.deadline);
  const monthsLeft      = monthsBetween(now, deadline);
  const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
  const requiredMonthly = monthsLeft > 0
    ? round(remainingAmount / monthsLeft)
    : round(remainingAmount);

  const goalBase = {
    _id:                  goal._id,
    name:                 goal.name,
    targetAmount:         round(goal.targetAmount),
    currentAmount:        round(goal.currentAmount),
    remainingAmount:      round(remainingAmount),
    deadline:             goal.deadline,
    monthsLeft,
    requiredMonthlySavings: requiredMonthly,
  };

  // Ціль вже досягнута
  if (goal.currentAmount >= goal.targetAmount) {
    return { goal: goalBase, status: "achieved" };
  }

  // Дедлайн минув
  if (monthsLeft === 0) {
    return { goal: goalBase, status: "expired" };
  }

  // Агрегуємо GoalTransaction по місяцях
  const monthlyData  = aggregateGoalByMonth(goalTxs);
  const netDeposits  = monthlyData.map((m) => Math.max(0, m.net));

  // Недостатньо даних для симуляції
  if (netDeposits.length < 2) {
    return {
      goal: goalBase,
      status: "insufficient_history",
      lastMonthDeposit: netDeposits.length === 1 ? round(netDeposits[0]) : null,
    };
  }

  // Підбираємо параметри Double ES та отримуємо прогноз наступного місяця
  const { alpha, beta } = optimizeDoubleES(netDeposits);
  const { L, T, fitted } = doubleES(netDeposits, alpha, beta);

  const forecastedMonthly = Math.max(0, L + T);

  // σ за залишками моделі
  const residuals = netDeposits.slice(1).map((v, i) => v - fitted[i]);
  const rawσ = stddev(residuals);
  const σ = Math.max(rawσ, forecastedMonthly * MIN_SIGMA_RATIO);

  const trend = T > 0 ? "зростаючий" : T < -1 ? "спадний" : "стабільний";

  // Базова симуляція
  const basePaths = runSimulation(
    goal.currentAmount, goal.targetAmount, forecastedMonthly, σ
  );

  const probabilityByDeadline = round(
    (basePaths.filter((m) => m <= monthsLeft).length / N_SIMULATIONS) * 100
  );

  const p10 = percentileOf(basePaths, 10);
  const p50 = percentileOf(basePaths, 50);
  const p90 = percentileOf(basePaths, 90);

  const timeDistribution = {
    optimistic:  { months: p10 <= MAX_SIM_MONTHS ? p10 : null, label: formatMonths(p10) },
    likely:      { months: p50 <= MAX_SIM_MONTHS ? p50 : null, label: formatMonths(p50) },
    pessimistic: { months: p90 <= MAX_SIM_MONTHS ? p90 : null, label: formatMonths(p90) },
  };

  // What-if сценарії
  const scenarioDefs = [
    { label: "Поточний темп",      multiplier: 1.0 },
    { label: "+30% заощаджень",    multiplier: 1.3 },
    { label: "-30% заощаджень",    multiplier: 0.7 },
  ];

  const whatIf = scenarioDefs.map(({ label, multiplier }) => {
    const paths = runSimulation(
      goal.currentAmount, goal.targetAmount, forecastedMonthly, σ, multiplier
    );
    const sp50  = percentileOf(paths, 50);
    const probD = round(
      (paths.filter((m) => m <= monthsLeft).length / N_SIMULATIONS) * 100
    );
    return {
      label,
      monthlyContribution: round(forecastedMonthly * multiplier),
      medianMonths:        sp50 <= MAX_SIM_MONTHS ? sp50 : null,
      medianLabel:         formatMonths(sp50),
      probabilityByDeadline: probD,
    };
  });

  return {
    goal: goalBase,
    status: "active",
    probabilityByDeadline,
    forecastedMonthly:  round(forecastedMonthly),
    avgMonthlyDeposit:  round(mean(netDeposits)),
    dataMonths:         netDeposits.length,
    trend,
    timeDistribution,
    whatIf,
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

const buildGoalsAnalysis = (goals, goalTransactions) => {
  const activeGoals = goals.filter((g) => g.status === "in_progress");

  return activeGoals.map((goal) => {
    const goalTxs = goalTransactions.filter(
      (tx) => tx.goalId?.toString() === goal._id?.toString()
    );
    return analyzeGoal(goal, goalTxs);
  });
};

module.exports = { buildGoalsAnalysis };
