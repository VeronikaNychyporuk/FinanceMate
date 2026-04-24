"use strict";

const K = 3;       // optimal k, confirmed via silhouette analysis (see scripts/analyzeOptimalK.js)
const N_RUNS = 5;
const MAX_ITER = 100;

// ─── Math helpers ─────────────────────────────────────────────────────────────

const round2 = (v) => Math.round((v || 0) * 100) / 100;

const euclidean = (a, b) => {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += (a[i] - b[i]) ** 2;
  return Math.sqrt(sum);
};

const meanOf = (arr) => arr.reduce((s, x) => s + x, 0) / arr.length;

// ─── Feature extraction ───────────────────────────────────────────────────────

const extractFeatures = (transactions) => {
  const catMap = new Map();

  transactions.forEach((tx) => {
    const id =
      tx.categoryId?._id?.toString() || tx.categoryId?.toString() || "unknown";
    const name = tx.categoryId?.name || "Без категорії";
    const entry = catMap.get(id) || { id, name, total: 0, count: 0 };
    entry.total += tx.amountInBaseCurrency;
    entry.count += 1;
    catMap.set(id, entry);
  });

  const total = transactions.length;
  const categories = [...catMap.values()].map(({ id, name, total: amt, count }) => ({
    id,
    name,
    count,
    frequency: count / total,
    avgAmount: amt / count,
    totalAmount: amt,
  }));

  const freqs = categories.map((c) => c.frequency);
  const amts  = categories.map((c) => c.avgAmount);

  const minFreq = Math.min(...freqs), maxFreq = Math.max(...freqs);
  const minAmt  = Math.min(...amts),  maxAmt  = Math.max(...amts);

  const freqRange = maxFreq - minFreq || 1;
  const amtRange  = maxAmt  - minAmt  || 1;

  return categories.map((c) => ({
    ...c,
    point: [
      (c.frequency - minFreq) / freqRange,
      (c.avgAmount - minAmt)  / amtRange,
    ],
  }));
};

// ─── K-Means++ initialization ─────────────────────────────────────────────────

const kmeansppInit = (points, k) => {
  const centers = [points[Math.floor(Math.random() * points.length)].slice()];

  while (centers.length < k) {
    const weights = points.map((p) => {
      const d = Math.min(...centers.map((c) => euclidean(p, c)));
      return d * d;
    });
    const total = weights.reduce((s, w) => s + w, 0);
    let r = Math.random() * total;
    let chosen = points.length - 1;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) { chosen = i; break; }
    }
    centers.push(points[chosen].slice());
  }

  return centers;
};

// ─── Single K-Means run ───────────────────────────────────────────────────────

const kmeansOnce = (points, k) => {
  let centers = kmeansppInit(points, k);
  let assignments = new Array(points.length).fill(0);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const next = points.map((p) => {
      let best = 0, bestDist = Infinity;
      centers.forEach((c, ci) => {
        const d = euclidean(p, c);
        if (d < bestDist) { bestDist = d; best = ci; }
      });
      return best;
    });

    const changed = next.some((a, i) => a !== assignments[i]);
    assignments = next;
    if (!changed) break;

    centers = centers.map((_, ci) => {
      const pts = points.filter((_, i) => assignments[i] === ci);
      if (!pts.length) return centers[ci];
      return [meanOf(pts.map((p) => p[0])), meanOf(pts.map((p) => p[1]))];
    });
  }

  const wcss = points.reduce(
    (s, p, i) => s + euclidean(p, centers[assignments[i]]) ** 2,
    0
  );

  return { assignments, centers, wcss };
};

// ─── Multi-run wrapper ────────────────────────────────────────────────────────

const kmeans = (points, k) => {
  let best = null;
  for (let r = 0; r < N_RUNS; r++) {
    const run = kmeansOnce(points, k);
    if (!best || run.wcss < best.wcss) best = run;
  }
  return best;
};

// ─── Cluster label from centroid position ─────────────────────────────────────

const interpretCluster = (cx, cy) => {
  const hi = (v) => v > 0.5;

  if (hi(cx) && !hi(cy))
    return {
      label: "Регулярні дрібні витрати",
      description: "Часті невеликі покупки, що в сумі формують помітне навантаження на бюджет.",
      recommendation: "Проаналізуйте ці витрати — частину з них можна скоротити без відчутних незручностей.",
    };

  if (!hi(cx) && hi(cy))
    return {
      label: "Рідкісні великі витрати",
      description: "Нечасті операції з великою сумою суттєво впливають на загальний бюджет.",
      recommendation: "Формуйте окремий резерв або встановіть ліміт для таких витрат.",
    };

  if (hi(cx) && hi(cy))
    return {
      label: "Систематичні значні витрати",
      description: "Часті й дорогі покупки — найбільш витратний патерн у вашому бюджеті.",
      recommendation: "Розгляньте можливість встановлення щомісячного ліміту на такі витрати.",
    };

  return {
    label: "Нерегулярні витрати середнього обсягу",
    description: "Витрати середнього розміру без чіткої регулярності.",
    recommendation: "Відстежуйте цей кластер — він може зростати непомітно.",
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

const buildPatterns = (expenseTransactions) => {
  if (!expenseTransactions.length) {
    return { clusters: [] };
  }

  const categories = extractFeatures(expenseTransactions);
  const categoryCount = categories.length;

  if (categoryCount < 2) {
    const only = categories[0];
    return {
      clusters: [
        {
          label: "Єдина категорія витрат",
          description: `Всі витрати зосереджені в категорії «${only.name}».`,
          stats: {
            transactions: only.count,
            avgAmount: round2(only.avgAmount),
            totalAmount: round2(only.totalAmount),
          },
          top: [only.name],
          recommendation: `Категорія «${only.name}» потребує окремої уваги під час планування бюджету.`,
        },
      ],
    };
  }

  const points = categories.map((c) => c.point);
  const k = Math.min(K, categoryCount - 1);

  const { assignments, centers } = kmeans(points, k);

  const clusterGroups = Array.from({ length: k }, (_, ci) =>
    categories.filter((_, i) => assignments[i] === ci)
  );

  const clusters = clusterGroups
    .map((cats, ci) => {
      if (!cats.length) return null;
      const [cx, cy] = centers[ci];
      const { label, description, recommendation } = interpretCluster(cx, cy);
      const txCount  = cats.reduce((s, c) => s + c.count, 0);
      const totalAmt = cats.reduce((s, c) => s + c.totalAmount, 0);
      return {
        label,
        description,
        stats: {
          transactions: txCount,
          avgAmount: round2(txCount > 0 ? totalAmt / txCount : 0),
          totalAmount: round2(totalAmt),
        },
        top: [...cats].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 3).map((c) => c.name),
        recommendation,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.stats.totalAmount - a.stats.totalAmount);

  return { clusters };
};

module.exports = { buildPatterns };
