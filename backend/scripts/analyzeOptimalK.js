/**
 * Дослідницький скрипт: підбір оптимального k для K-Means кластеризації витрат.
 *
 * Запуск:  node scripts/analyzeOptimalK.js
 *
 * Виводить:
 *   - метод ліктя (WCSS для k=2..5)
 *   - коефіцієнт силуету для k=2..5
 *   - характеристики кластерів для оптимального k
 */

"use strict";

require("dotenv").config();
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
require("../models/Category"); // реєструємо схему щоб populate("categoryId") працював

// ─── Константи ────────────────────────────────────────────────────────────────

const K_RANGE  = [2, 3, 4, 5];
const N_RUNS   = 10;
const MAX_ITER = 200;

// ─── Математичні утиліти ──────────────────────────────────────────────────────

const euclidean = (a, b) => Math.sqrt(a.reduce((s, v, i) => s + (v - b[i]) ** 2, 0));
const meanOf    = (arr)  => arr.reduce((s, x) => s + x, 0) / arr.length;
const round2    = (v)    => Math.round((v || 0) * 100) / 100;

// ─── Підготовка ознак ─────────────────────────────────────────────────────────

function extractFeatures(transactions) {
  const catMap = new Map();
  transactions.forEach((tx) => {
    const id   = tx.categoryId?._id?.toString() || tx.categoryId?.toString() || "unknown";
    const name = tx.categoryId?.name || "Без категорії";
    const e    = catMap.get(id) || { id, name, total: 0, count: 0 };
    e.total += tx.amountInBaseCurrency;
    e.count += 1;
    catMap.set(id, e);
  });

  const total = transactions.length;
  const cats  = [...catMap.values()].map(({ id, name, total: amt, count }) => ({
    id, name, count,
    frequency:   count / total,
    avgAmount:   amt / count,
    totalAmount: amt,
  }));

  const freqs = cats.map((c) => c.frequency);
  const amts  = cats.map((c) => c.avgAmount);
  const minF  = Math.min(...freqs), maxF = Math.max(...freqs);
  const minA  = Math.min(...amts),  maxA = Math.max(...amts);
  const fR    = maxF - minF || 1;
  const aR    = maxA - minA || 1;

  return cats.map((c) => ({
    ...c,
    point: [(c.frequency - minF) / fR, (c.avgAmount - minA) / aR],
  }));
}

// ─── K-Means++ + core ─────────────────────────────────────────────────────────

function init(points, k) {
  const centers = [points[Math.floor(Math.random() * points.length)].slice()];
  while (centers.length < k) {
    const w = points.map((p) => {
      const d = Math.min(...centers.map((c) => euclidean(p, c)));
      return d * d;
    });
    const tot = w.reduce((s, x) => s + x, 0);
    let r = Math.random() * tot;
    let chosen = points.length - 1;
    for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) { chosen = i; break; } }
    centers.push(points[chosen].slice());
  }
  return centers;
}

function kmeansOnce(points, k) {
  let centers = init(points, k);
  let asgn    = new Array(points.length).fill(0);

  for (let iter = 0; iter < MAX_ITER; iter++) {
    const next = points.map((p) => {
      let best = 0, bestD = Infinity;
      centers.forEach((c, ci) => { const d = euclidean(p, c); if (d < bestD) { bestD = d; best = ci; } });
      return best;
    });
    const changed = next.some((a, i) => a !== asgn[i]);
    asgn = next;
    if (!changed) break;
    centers = centers.map((_, ci) => {
      const pts = points.filter((_, i) => asgn[i] === ci);
      if (!pts.length) return centers[ci];
      return [meanOf(pts.map((p) => p[0])), meanOf(pts.map((p) => p[1]))];
    });
  }

  const wcss = points.reduce((s, p, i) => s + euclidean(p, centers[asgn[i]]) ** 2, 0);
  return { asgn, centers, wcss };
}

function kmeans(points, k) {
  let best = null;
  for (let r = 0; r < N_RUNS; r++) {
    const run = kmeansOnce(points, k);
    if (!best || run.wcss < best.wcss) best = run;
  }
  return best;
}

// ─── Силует ───────────────────────────────────────────────────────────────────

function silhouette(points, asgn, k) {
  if (k < 2 || points.length < 2) return 0;
  const scores = points.map((p, i) => {
    const my   = asgn[i];
    const same = points.filter((_, j) => j !== i && asgn[j] === my);
    const a    = same.length ? meanOf(same.map((q) => euclidean(p, q))) : 0;
    let b = Infinity;
    for (let c = 0; c < k; c++) {
      if (c === my) continue;
      const other = points.filter((_, j) => asgn[j] === c);
      if (!other.length) continue;
      const avg = meanOf(other.map((q) => euclidean(p, q)));
      if (avg < b) b = avg;
    }
    if (!isFinite(b)) return 0;
    return (b - a) / Math.max(a, b) || 0;
  });
  return meanOf(scores);
}

// ─── Головна логіка ───────────────────────────────────────────────────────────

async function main() {
  console.log("\n🔌 Підключення до MongoDB...");
  await mongoose.connect(process.env.MONGO_URI);
  console.log("✅ Підключено.\n");

  const transactions = await Transaction.find({ type: "expense" })
    .populate("categoryId", "name")
    .lean();

  console.log(`📊 Знайдено транзакцій типу expense: ${transactions.length}`);

  if (transactions.length < 10) {
    console.error("❌ Замало транзакцій для аналізу (потрібно мінімум 10).");
    process.exit(1);
  }

  const categories = extractFeatures(transactions);
  console.log(`🗂  Унікальних категорій: ${categories.length}\n`);

  if (categories.length < 3) {
    console.error("❌ Замало категорій для аналізу (потрібно мінімум 3).");
    process.exit(1);
  }

  const points = categories.map((c) => c.point);

  // ─── Метод ліктя ────────────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log("  МЕТОД ЛІКТЯ (WCSS — внутрішньокластерна дисперсія)");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Менший WCSS = щільніші кластери (але к=1 завжди мінімальний)");
  console.log("  Шукаємо «лікоть» — точку де падіння WCSS сповільнюється.\n");

  const elbowData = [];
  for (const k of K_RANGE) {
    if (k >= categories.length) break;
    const { wcss } = kmeans(points, k);
    elbowData.push({ k, wcss: round2(wcss) });
    console.log(`  k=${k}  WCSS = ${round2(wcss).toFixed(4)}`);
  }

  // ─── Силует ─────────────────────────────────────────────────────────────────
  console.log("\n═══════════════════════════════════════════════════════");
  console.log("  МЕТРИКА СИЛУЕТУ (вища = краще, максимум = 1.0)");
  console.log("═══════════════════════════════════════════════════════");
  console.log("  Показує наскільки добре кожна точка належить своєму кластеру.\n");

  let bestK = K_RANGE[0], bestSil = -Infinity;
  const silData = [];
  for (const k of K_RANGE) {
    if (k >= categories.length) break;
    const { asgn } = kmeans(points, k);
    const s = silhouette(points, asgn, k);
    silData.push({ k, silhouette: round2(s) });
    const marker = s === Math.max(...silData.map((d) => d.silhouette)) ? " ← поки найкращий" : "";
    console.log(`  k=${k}  Силует = ${round2(s).toFixed(4)}${marker}`);
    if (s > bestSil) { bestSil = s; bestK = k; }
  }

  console.log(`\n  ✅ Оптимальний k = ${bestK}  (силует = ${round2(bestSil).toFixed(4)})\n`);

  // ─── Характеристики кластерів для оптимального k ──────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log(`  КЛАСТЕРИ ПРИ k=${bestK}`);
  console.log("═══════════════════════════════════════════════════════\n");

  const { asgn, centers } = kmeans(points, bestK);

  for (let ci = 0; ci < bestK; ci++) {
    const cats = categories.filter((_, i) => asgn[i] === ci);
    if (!cats.length) continue;

    const [cx, cy] = centers[ci];
    const txCount  = cats.reduce((s, c) => s + c.count, 0);
    const totalAmt = cats.reduce((s, c) => s + c.totalAmount, 0);
    const avgAmt   = txCount > 0 ? totalAmt / txCount : 0;
    const top3     = [...cats].sort((a, b) => b.totalAmount - a.totalAmount).slice(0, 3);

    console.log(`  Кластер C${ci + 1}`);
    console.log(`  ┌─ Категорій:       ${cats.length}`);
    console.log(`  ├─ Транзакцій:      ${txCount}`);
    console.log(`  ├─ Загальна сума:   ${totalAmt.toFixed(2)}`);
    console.log(`  ├─ Середня сума:    ${avgAmt.toFixed(2)}`);
    console.log(`  ├─ Центроїд [нормалізований]:`);
    console.log(`  │    частота    = ${cx.toFixed(4)}  (${cx > 0.5 ? "висока ↑" : "низька ↓"})`);
    console.log(`  │    сер. сума  = ${cy.toFixed(4)}  (${cy > 0.5 ? "велика  ↑" : "мала    ↓"})`);
    console.log(`  └─ Топ категорій:`);
    top3.forEach((c) => {
      console.log(`       • ${c.name}  (${c.count} транз., сума ${c.totalAmount.toFixed(2)})`);
    });
    console.log();
  }

  // ─── Підсумок для звіту ─────────────────────────────────────────────────────
  console.log("═══════════════════════════════════════════════════════");
  console.log("  ПІДСУМОК ДЛЯ ЗВІТУ");
  console.log("═══════════════════════════════════════════════════════\n");
  console.log("  Метод ліктя (WCSS):");
  elbowData.forEach((e) => console.log(`    k=${e.k}: ${e.wcss}`));
  console.log("\n  Метрика силуету:");
  silData.forEach((s) => console.log(`    k=${s.k}: ${s.silhouette}${s.k === bestK ? "  ← оптимальний" : ""}`));
  console.log(`\n  Висновок: оптимальна кількість кластерів k=${bestK}.`);
  console.log("  У застосунку використовується k=3 відповідно до цього аналізу.\n");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Помилка:", err);
  process.exit(1);
});
