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

  return forecastValues.map((f, i) => {
    running += f;
    const h = i + 1;
    const margin = sigma > 0 ? round(Z95 * sigma * Math.sqrt(h)) : null;
    return {
      date: new Date(today.getTime() + h * DAY_MS).toISOString(),
      balance: round(running),
      ...(margin != null && { lower: round(running - margin), upper: round(running + margin) }),
    };
  });
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

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Tiered forecasting:
 *   Tier 0 — < 30 days or < 20 transactions : "insufficient" (no forecast)
 *   Tier 1 — 30–89 days                     : Double Exponential Smoothing (Holt)
 *   Tier 2 — ≥ 90 days and ≥ 60 transactions: Holt-Winters Triple ES (weekly seasonality)
 */
const buildForecast = (transactions, horizonDays = 30) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dataSpanDays = getDataSpanDays(transactions);
  const txCount = transactions.length;

  // Tier 0: not enough data for any meaningful model
  if (dataSpanDays < 30 || txCount < 20) {
    return {
      method: "insufficient",
      methodLabel: "Недостатньо даних",
      insufficientReason:
        `Для прогнозування потрібно мінімум 30 днів даних і 20 транзакцій. ` +
        `Наразі: ${dataSpanDays} дн., ${txCount} транз. ` +
        `Продовжуйте вести облік — прогноз з'явиться автоматично.`,
      horizonDays,
      seriesBalance: null,
      averageDailyNet: null,
      risks: [],
      model: { dataSpanDays, dataPoints: txCount, dataConfidence: "none" },
    };
  }

  // Net cumulative balance of the full available window as a starting point
  const baseBalance = round(
    transactions.reduce(
      (sum, tx) =>
        sum + (tx.type === "income" ? tx.amountInBaseCurrency : -tx.amountInBaseCurrency),
      0
    )
  );

  let method, methodLabel, forecastValues, fittedPairs, params;

  if (dataSpanDays >= 90 && txCount >= 60) {
    // Tier 2: Holt-Winters with weekly seasonality
    const m = 7;
    const series = buildDailySeries(transactions, dataSpanDays);
    const y = series.map((p) => p.value);
    const hwParams = optimizeHoltWinters(y, m);
    const hwModel = holtWinters(y, hwParams.alpha, hwParams.beta, hwParams.gamma, m);

    if (hwModel) {
      method = "holt_winters";
      methodLabel = "Holt-Winters (Triple ES)";
      params = { ...hwParams, seasonPeriod: m };
      fittedPairs = hwModel.fitted;
      forecastValues = forecastHW(hwModel, horizonDays);
    } else {
      // Fallback — shouldn't happen given tier thresholds, but be safe
      method = "double_es";
      methodLabel = "Подвійне згладжування (Holt)";
      params = optimizeDoubleES(y);
      const desModel = doubleES(y, params.alpha, params.beta);
      fittedPairs = desModel.fitted;
      forecastValues = forecastDoubleES(desModel, horizonDays);
    }
  } else {
    // Tier 1: Double ES — estimate level and trend, skip seasonality
    const windowDays = Math.min(dataSpanDays, 90);
    const series = buildDailySeries(transactions, windowDays);
    const y = series.map((p) => p.value);
    params = optimizeDoubleES(y);
    method = "double_es";
    methodLabel = "Подвійне згладжування (Holt)";
    const desModel = doubleES(y, params.alpha, params.beta);
    fittedPairs = desModel.fitted;
    forecastValues = forecastDoubleES(desModel, horizonDays);
  }

  const { mae, mape, residuals } = computeMetrics(fittedPairs);
  const sigma = stddev(residuals);
  const seriesBalance = buildBalanceSeries(baseBalance, forecastValues, today, sigma);

  const dataConfidence =
    txCount >= 120 && dataSpanDays >= 180
      ? "high"
      : txCount >= 60 && dataSpanDays >= 90
      ? "medium"
      : "low";

  return {
    method,
    methodLabel,
    horizonDays,
    seriesBalance,
    averageDailyNet: round(mean(forecastValues)),
    risks: buildRisks(seriesBalance, mean(forecastValues)),
    model: {
      ...params,
      mae,
      mape,
      dataConfidence,
      dataPoints: txCount,
      dataSpanDays,
    },
  };
};

module.exports = { buildForecast };
