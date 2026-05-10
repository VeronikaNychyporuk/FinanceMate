"use strict";

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

const calcMSE = (actual, predicted) => {
  const n = Math.min(actual.length, predicted.length);
  if (!n) return Infinity;
  return actual.slice(0, n).reduce((s, y, i) => s + (y - predicted[i]) ** 2, 0) / n;
};

const DAY_MS = 24 * 60 * 60 * 1000;

// ─── Data preparation ────────────────────────────────────────────────────────

const buildDailySeries = (transactions, windowDays) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today.getTime() - (windowDays - 1) * DAY_MS);

  const dayMap = new Map();
  for (let i = 0; i < windowDays; i++) {
    const d = new Date(start.getTime() + i * DAY_MS);
    dayMap.set(d.toISOString().slice(0, 10), 0);
  }

  transactions.forEach((tx) => {
    const d = new Date(tx.date);
    d.setHours(0, 0, 0, 0);
    const key = d.toISOString().slice(0, 10);
    if (dayMap.has(key)) {
      const sign = tx.type === "income" ? 1 : -1;
      dayMap.set(key, dayMap.get(key) + sign * tx.amountInBaseCurrency);
    }
  });

  return [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, value]) => ({ date, value }));
};

const getDataSpanDays = (transactions) => {
  if (!transactions.length) return 0;
  const minDate = Math.min(...transactions.map((t) => new Date(t.date).getTime()));
  return Math.ceil((Date.now() - minDate) / DAY_MS);
};

// ─── Double Exponential Smoothing — Holt's linear (рівень + тренд) ──────────

const doubleES = (y, alpha, beta) => {
  if (y.length < 2) return { fitted: [], L: y[0] || 0, T: 0 };

  let L = y[0];
  let T = y[1] - y[0];
  const fitted = [];

  for (let t = 1; t < y.length; t++) {
    const Lp = L;
    const Tp = T;
    L = alpha * y[t] + (1 - alpha) * (Lp + Tp);
    T = beta * (L - Lp) + (1 - beta) * Tp;
    fitted.push({ actual: y[t], predicted: Lp + Tp });
  }

  return { fitted, L, T };
};

const forecastDoubleES = ({ L, T }, horizonDays) =>
  Array.from({ length: horizonDays }, (_, h) => L + (h + 1) * T);

// ─── Triple Exponential Smoothing — Holt-Winters additive ───────────────────

const holtWinters = (y, alpha, beta, gamma, m) => {
  const n = y.length;
  if (n < 2 * m) return null;

  const L_init = mean(y.slice(0, m));
  const T_init = (mean(y.slice(m, Math.min(2 * m, n))) - L_init) / m;

  const S = new Array(n).fill(0);
  for (let i = 0; i < m; i++) S[i] = y[i] - L_init;

  let L = L_init;
  let T = T_init;
  const fitted = [];

  for (let t = m; t < n; t++) {
    const Lp = L;
    const Tp = T;
    L = alpha * (y[t] - S[t - m]) + (1 - alpha) * (Lp + Tp);
    T = beta * (L - Lp) + (1 - beta) * Tp;
    S[t] = gamma * (y[t] - L) + (1 - gamma) * S[t - m];
    fitted.push({ actual: y[t], predicted: Lp + Tp + S[t - m] });
  }

  return { fitted, L, T, S, m };
};

const forecastHW = ({ L, T, S, m }, horizonDays) => {
  const n = S.length;
  return Array.from({ length: horizonDays }, (_, h) => {
    const sIdx = n - m + (h % m);
    return L + (h + 1) * T + (S[sIdx] || 0);
  });
};

// ─── Grid search for optimal smoothing parameters ────────────────────────────

const ALPHA_GRID = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9];
const BETA_GRID  = [0.05, 0.1, 0.2, 0.3, 0.5];
const GAMMA_GRID = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.9];

const splitTrainTest = (y) => {
  const splitAt = Math.max(Math.floor(y.length * 0.8), y.length - 14);
  return { train: y.slice(0, splitAt), test: y.slice(splitAt) };
};

const optimizeDoubleES = (y) => {
  const { train, test } = splitTrainTest(y);
  if (!test.length || train.length < 4) return { alpha: 0.3, beta: 0.1 };

  let best = { alpha: 0.3, beta: 0.1, score: Infinity };
  for (const alpha of ALPHA_GRID) {
    for (const beta of BETA_GRID) {
      const model = doubleES(train, alpha, beta);
      const preds = forecastDoubleES(model, test.length);
      const score = calcMSE(test, preds);
      if (score < best.score) best = { alpha, beta, score };
    }
  }
  return { alpha: best.alpha, beta: best.beta };
};

const optimizeHoltWinters = (y, m) => {
  const { train, test } = splitTrainTest(y);
  if (!test.length || train.length < 2 * m) return { alpha: 0.3, beta: 0.1, gamma: 0.2 };

  let best = { alpha: 0.3, beta: 0.1, gamma: 0.2, score: Infinity };
  for (const alpha of ALPHA_GRID) {
    for (const beta of BETA_GRID) {
      for (const gamma of GAMMA_GRID) {
        const model = holtWinters(train, alpha, beta, gamma, m);
        if (!model) continue;
        const preds = forecastHW(model, test.length);
        const score = calcMSE(test, preds);
        if (score < best.score) best = { alpha, beta, gamma, score };
      }
    }
  }
  return { alpha: best.alpha, beta: best.beta, gamma: best.gamma };
};

// ─── Metrics ─────────────────────────────────────────────────────────────────

const computeMetrics = (fittedPairs) => {
  if (!fittedPairs.length) return { mae: null, mape: null, residuals: [] };

  const residuals = fittedPairs.map((p) => p.actual - p.predicted);
  const mae = round(mean(residuals.map(Math.abs)));

  const valid = fittedPairs.filter((p) => Math.abs(p.actual) > 1);
  const mape =
    valid.length > 0
      ? round(mean(valid.map((p) => Math.abs(p.actual - p.predicted) / Math.abs(p.actual))) * 100)
      : null;

  return { mae, mape, residuals };
};

// ─── Output builders ─────────────────────────────────────────────────────────

const buildBalanceSeries = (baseBalance, forecastValues, today, sigma) => {
  const Z95 = 1.96;
  let running = baseBalance;

  // Include today as the starting anchor point so the chart starts from the real balance
  const points = [{ date: today.toISOString(), balance: round(baseBalance) }];

  forecastValues.forEach((f, i) => {
    running += f;
    const h = i + 1;
    const margin = sigma > 0 ? round(Z95 * sigma * Math.sqrt(h)) : null;
    points.push({
      date: new Date(today.getTime() + h * DAY_MS).toISOString(),
      balance: round(running),
      ...(margin != null && { lower: round(running - margin), upper: round(running + margin) }),
    });
  });

  return points;
};

const buildRisks = (seriesBalance, avgForecast) => {
  const minBalance = Math.min(...seriesBalance.map((p) => p.balance));

  if (minBalance < 0) {
    return [{
      level: "high",
      title: "Ймовірний дефіцит коштів",
      message:
        "Модель прогнозує від'ємний баланс у межах горизонту прогнозу. Рекомендується переглянути витрати.",
    }];
  }
  if (avgForecast < 0) {
    return [{
      level: "medium",
      title: "Спадний грошовий потік",
      message:
        "Прогнозований середній денний потік від'ємний — баланс поступово зменшується.",
    }];
  }
  return [{
    level: "low",
    title: "Стабільний прогноз",
    message: "Модель не виявляє критичних ризиків у межах прогнозного горизонту.",
  }];
};

// ─── Monthly series builders ──────────────────────────────────────────────────

const buildMonthlySeries = (transactions) => {
  const monthMap = new Map();
  transactions.forEach((tx) => {
    const d = new Date(tx.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!monthMap.has(key)) {
      monthMap.set(key, { key, year: d.getFullYear(), month: d.getMonth(), value: 0 });
    }
    monthMap.get(key).value +=
      (tx.type === "income" ? 1 : -1) * (tx.amountInBaseCurrency || 0);
  });
  return [...monthMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
};

// Distribute monthly forecast values evenly across calendar days
const buildDailyFromMonthly = (monthlyForecasts, today, horizonDays) =>
  Array.from({ length: horizonDays }, (_, h) => {
    const date = new Date(today.getTime() + (h + 1) * DAY_MS);
    const monthsAhead =
      (date.getFullYear() - today.getFullYear()) * 12 +
      (date.getMonth() - today.getMonth());
    const mIdx = Math.min(Math.max(monthsAhead, 0), monthlyForecasts.length - 1);
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    return monthlyForecasts[mIdx] / daysInMonth;
  });

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Monthly-aggregated tiered forecasting (current month excluded if incomplete):
 *   Tier 0 — < 3 complete months or < 10 transactions : "insufficient"
 *   Tier 1 — 3–23 complete months                     : Double Exponential Smoothing on monthly data
 *   Tier 2 — ≥ 24 complete months                     : Holt-Winters with annual seasonality (m=12)
 *
 * Working on monthly aggregates avoids the daily-noise problem where a single
 * salary payment creates a spike that the daily ES interprets as a huge trend.
 * The current partial month is excluded so mid-month bias does not distort trend detection.
 */
const buildForecast = (transactions, horizonDays = 30, startingBalance = null) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const txCount = transactions.length;
  const monthlySeries = buildMonthlySeries(transactions);

  // Exclude the current calendar month from training unless today is the last day,
  // because partial-month data biases trend detection (e.g. salary arriving late in the month
  // makes the current month look like a loss even when the full month will be positive).
  const currentMonthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
  const daysInCurrentMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const isLastDayOfMonth = today.getDate() === daysInCurrentMonth;
  const trainingMonths = isLastDayOfMonth
    ? monthlySeries
    : monthlySeries.filter((m) => m.key !== currentMonthKey);

  const monthCount = trainingMonths.length;

  // Tier 0: not enough data
  if (monthCount < 3 || txCount < 10) {
    return {
      method: "insufficient",
      methodLabel: "Недостатньо даних",
      insufficientReason:
        `Для прогнозування потрібно мінімум 3 місяці даних і 10 транзакцій. ` +
        `Наразі: ${monthCount} міс., ${txCount} транз. ` +
        `Продовжуйте вести облік — прогноз з'явиться автоматично.`,
      horizonDays,
      seriesBalance: null,
      averageDailyNet: null,
      risks: [],
      model: { dataSpanDays: monthCount * 30, dataPoints: txCount, dataConfidence: "none" },
    };
  }

  const baseBalance = startingBalance !== null
    ? round(startingBalance)
    : round(
        transactions.reduce(
          (sum, tx) =>
            sum + (tx.type === "income" ? tx.amountInBaseCurrency : -tx.amountInBaseCurrency),
          0
        )
      );

  const y = trainingMonths.map((m) => m.value);
  // Forecast enough months to cover the full horizon (+1 for safety)
  const forecastMonths = Math.ceil(horizonDays / 28) + 1;

  let method, methodLabel, monthlyForecastValues, fittedPairs, params;

  if (monthCount >= 12) {
    // Tier 2: Holt-Winters with annual seasonality
    const m = 12;
    const hwParams = optimizeHoltWinters(y, m);
    const hwModel = holtWinters(y, hwParams.alpha, hwParams.beta, hwParams.gamma, m);
    if (hwModel) {
      method = "holt_winters";
      methodLabel = "Holt-Winters (річна сезонність)";
      params = { ...hwParams, seasonPeriod: m };
      fittedPairs = hwModel.fitted;
      monthlyForecastValues = forecastHW(hwModel, forecastMonths);
    }
  }

  if (!monthlyForecastValues) {
    // Tier 1: Double ES on monthly data
    params = optimizeDoubleES(y);
    method = "double_es";
    methodLabel = "Подвійне згладжування (Holt)";
    const desModel = doubleES(y, params.alpha, params.beta);
    fittedPairs = desModel.fitted;
    monthlyForecastValues = forecastDoubleES(desModel, forecastMonths);
  }

  const { mae, mape, residuals } = computeMetrics(fittedPairs);
  const monthlySigma = stddev(residuals);

  // ─── Monthly forecast blocks (current month remaining + next 2 full months) ─
  const remainingDaysInCurrentMonth = daysInCurrentMonth - today.getDate();
  const monthlyForecastBlocks = [];

  if (remainingDaysInCurrentMonth > 0 && monthlyForecastValues[0] != null) {
    const d = new Date(today.getFullYear(), today.getMonth(), 1);
    monthlyForecastBlocks.push({
      label: d.toLocaleDateString("uk-UA", { month: "long", year: "numeric" }),
      flow: round(monthlyForecastValues[0] * remainingDaysInCurrentMonth / daysInCurrentMonth),
      isPartial: true,
      remainingDays: remainingDaysInCurrentMonth,
    });
  }
  for (let i = 1; i <= 2; i++) {
    if (monthlyForecastValues[i] == null) break;
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
    monthlyForecastBlocks.push({
      label: d.toLocaleDateString("uk-UA", { month: "long", year: "numeric" }),
      flow: round(monthlyForecastValues[i]),
      isPartial: false,
    });
  }

  const dataConfidence =
    monthCount >= 24 ? "high" : monthCount >= 12 ? "medium" : "low";

  // ─── Daily series for the exact horizon window (used for scenarios + risks) ───
  const forecastValues = buildDailyFromMonthly(monthlyForecastValues, today, horizonDays);
  const dailySigma = monthlySigma > 0 ? monthlySigma / Math.sqrt(30) : 0;
  const seriesBalance = buildBalanceSeries(baseBalance, forecastValues, today, dailySigma);

  // ─── Scenarios: use the last point of the daily series for the exact 30-day balance ─
  const likelyBalance = seriesBalance[seriesBalance.length - 1]?.balance ?? baseBalance;
  const scenarios = {
    pessimistic: round(likelyBalance - (monthlySigma || 0)),
    likely: round(likelyBalance),
    optimistic: round(likelyBalance + (monthlySigma || 0)),
    hasRange: monthlySigma > 0,
  };

  return {
    method,
    methodLabel,
    horizonDays,
    seriesBalance,
    scenarios,
    monthlyForecastBlocks,
    averageMonthlyNet: round(mean(monthlyForecastValues.slice(0, forecastMonths))),
    risks: buildRisks(seriesBalance, mean(forecastValues)),
    model: {
      ...params,
      mae,
      mape,
      dataConfidence,
      dataPoints: txCount,
      dataSpanDays: monthlySeries.length * 30,
    },
  };
};

module.exports = { buildForecast };
