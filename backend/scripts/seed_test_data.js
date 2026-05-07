"use strict";
// Seed script: fills test data for veronikanychyporuk@gmail.com (2026-01-01 → 2026-05-07)
// Run: node backend/scripts/seed_test_data.js
// Requires backend running on http://localhost:5000

const BASE = "http://localhost:5000/api";
const EMAIL = "veronikanychyporuk@gmail.com";
const PASS = "Test1234!";

let token = "";

async function api(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(data)}`);
  }
  return data;
}

async function getOrCreateCat(catMap, name, type) {
  if (catMap[name]) return catMap[name];
  const created = await api("POST", "/categories", { name, type });
  catMap[name] = created._id;
  console.log(`  ✓ категорія «${name}» (${type}) створена`);
  return created._id;
}

async function tx(date, type, amount, catId, note) {
  return api("POST", "/transactions", {
    amount,
    type,
    categoryId: catId,
    currency: "EUR",
    date: new Date(date).toISOString(),
    note,
  });
}

async function main() {
  console.log("=== FinanceMate seed script ===\n");

  // 1. Login
  console.log("1. Авторизація...");
  const auth = await api("POST", "/auth/login", { email: EMAIL, password: PASS });
  token = auth.accessToken;
  console.log("   JWT отримано ✓\n");

  // 2. Categories
  console.log("2. Категорії...");
  const existing = await api("GET", "/categories");
  const catMap = {};
  existing.forEach((c) => (catMap[c.name] = c._id));
  console.log(`   Знайдено ${existing.length} категорій`);

  const E = {
    food:         await getOrCreateCat(catMap, "Продукти", "expense"),
    cafe:         await getOrCreateCat(catMap, "Кафе та ресторани", "expense"),
    transport:    await getOrCreateCat(catMap, "Транспорт", "expense"),
    rent:         await getOrCreateCat(catMap, "Оренда", "expense"),
    utilities:    await getOrCreateCat(catMap, "Комунальні послуги", "expense"),
    health:       await getOrCreateCat(catMap, "Здоров'я", "expense"),
    entertainment:await getOrCreateCat(catMap, "Розваги", "expense"),
    clothes:      await getOrCreateCat(catMap, "Одяг", "expense"),
    electronics:  await getOrCreateCat(catMap, "Електроніка", "expense"),
    coffee:       await getOrCreateCat(catMap, "Кофе та снеки", "expense"),
  };
  const I = {
    salary:    await getOrCreateCat(catMap, "Зарплата", "income"),
    freelance: await getOrCreateCat(catMap, "Фріланс", "income"),
  };
  console.log();

  // 3. Transactions
  console.log("3. Транзакції...");

  // ── JANUARY (baseline: small regular + anomaly seeds) ──────────────────────
  console.log("   Січень 2026...");
  await tx("2026-01-04", "expense",  4, E.coffee,       "Кава вранці");
  await tx("2026-01-06", "expense",  3, E.transport,    "Метро");
  await tx("2026-01-08", "expense", 48, E.food,         "Супермаркет");
  await tx("2026-01-10", "expense",  5, E.coffee,       "Кава та круасан");
  await tx("2026-01-12", "expense",  3, E.transport,    "Автобус");
  await tx("2026-01-14", "expense", 22, E.cafe,         "Обід у кафе");
  await tx("2026-01-16", "expense",  4, E.coffee,       "Кава з колегами");
  await tx("2026-01-18", "expense",  3, E.transport,    "Трамвай");
  await tx("2026-01-20", "expense", 52, E.food,         "Тижневий запас");
  await tx("2026-01-22", "expense",  4, E.coffee,       "Снеки");
  await tx("2026-01-24", "expense", 25, E.health,       "Аптека (вітаміни)");
  await tx("2026-01-26", "expense",  3, E.transport,    "Метро");
  await tx("2026-01-27", "expense", 35, E.electronics,  "Кабель USB-C");
  await tx("2026-01-29", "expense",  4, E.coffee,       "Кава");
  await tx("2026-01-31", "expense", 28, E.entertainment,"Кіно");

  // ── FEBRUARY (baseline enrichment) ────────────────────────────────────────
  console.log("   Лютий 2026...");
  await tx("2026-02-03", "expense",  5, E.coffee,       "Кава та снеки");
  await tx("2026-02-05", "expense",  3, E.transport,    "Автобус");
  await tx("2026-02-07", "expense", 55, E.food,         "Продукти на тиждень");
  await tx("2026-02-09", "expense",  4, E.coffee,       "Кава");
  await tx("2026-02-11", "expense",  3, E.transport,    "Метро");
  await tx("2026-02-13", "expense", 27, E.cafe,         "Вечеря з другом");
  await tx("2026-02-15", "expense", 68, E.clothes,      "Светр");
  await tx("2026-02-17", "expense",  5, E.coffee,       "Кава вранці");
  await tx("2026-02-19", "expense",  4, E.transport,    "Таксі");
  await tx("2026-02-21", "expense", 58, E.food,         "Великий закуп");
  await tx("2026-02-23", "expense", 32, E.health,       "Ліки (антибіотики)");
  await tx("2026-02-25", "expense",  4, E.coffee,       "Кава");
  await tx("2026-02-27", "expense",  3, E.transport,    "Автобус");
  await tx("2026-02-28", "expense", 42, E.electronics,  "Чохол для телефону");

  // ── MARCH 1–6 (before previous-30d window) ────────────────────────────────
  console.log("   Березень (до 7-го)...");
  await tx("2026-03-03", "expense",  4, E.coffee,       "Кава");
  await tx("2026-03-04", "expense",  3, E.transport,    "Метро");
  await tx("2026-03-06", "expense", 50, E.food,         "Продукти");

  // ── MARCH 7–31 (previous-30d window starts) ───────────────────────────────
  console.log("   Березень 7–31 (previous-30d)...");
  await tx("2026-03-08", "income",  950, I.freelance,   "Фріланс: розробка сайту");
  await tx("2026-03-10", "expense",   4, E.coffee,      "Кава");
  await tx("2026-03-12", "expense",   3, E.transport,   "Метро");
  await tx("2026-03-14", "expense",  46, E.food,        "Продукти");
  await tx("2026-03-16", "expense",   5, E.coffee,      "Кава та бутерброд");
  await tx("2026-03-18", "expense",   3, E.transport,   "Автобус");
  await tx("2026-03-20", "expense",  20, E.cafe,        "Кафе");
  await tx("2026-03-22", "expense",   4, E.coffee,      "Кава");
  await tx("2026-03-24", "expense",  58, E.health,      "Прийом лікаря");
  await tx("2026-03-26", "expense",   3, E.transport,   "Метро");
  await tx("2026-03-28", "expense",  52, E.food,        "Продукти на тиждень");
  await tx("2026-03-29", "expense",   4, E.coffee,      "Кава");

  // ── APRIL 1–6 (still in previous-30d window) ──────────────────────────────
  console.log("   Квітень 1–6 (previous-30d)...");
  await tx("2026-04-02", "expense",  88, E.utilities,   "Комунальні: квітень");
  await tx("2026-04-04", "expense",   3, E.transport,   "Автобус");
  await tx("2026-04-05", "expense",  42, E.food,        "Продукти");

  // ── APRIL 7 – MAY 7 (current-30d window: income ≈ 0, expenses >> previous) ─
  console.log("   Квітень 7–30 (current-30d)...");
  await tx("2026-04-07", "expense",  92, E.utilities,   "Комунальні (зросли)");
  await tx("2026-04-10", "expense",   4, E.coffee,      "Кава");
  await tx("2026-04-11", "expense",   3, E.transport,   "Метро");
  await tx("2026-04-12", "expense",  55, E.food,        "Продукти");
  await tx("2026-04-14", "expense",   5, E.coffee,      "Кава та снеки");
  await tx("2026-04-15", "expense", 550, E.rent,        "Оренда квартири");
  await tx("2026-04-17", "expense",   4, E.transport,   "Таксі");
  await tx("2026-04-18", "expense",  34, E.cafe,        "Вечеря");
  await tx("2026-04-20", "expense",   5, E.coffee,      "Кава");
  await tx("2026-04-22", "expense",  48, E.food,        "Продукти");
  await tx("2026-04-24", "expense",   3, E.transport,   "Автобус");
  // АНОМАЛІЯ #1: Електроніка 1200 EUR (базова лінія 35+42 EUR, тобто середнє ~38 EUR)
  await tx("2026-04-25", "expense", 1200, E.electronics,"Ноутбук (терміновий)");
  await tx("2026-04-27", "expense",   4, E.coffee,      "Кава");
  await tx("2026-04-28", "expense",  80, E.entertainment,"Концерт");

  console.log("   Травень 1–7 (current-30d + budget May)...");
  await tx("2026-05-01", "expense",  60, E.food,        "Продукти");
  await tx("2026-05-02", "expense",   3, E.transport,   "Метро");
  await tx("2026-05-03", "expense",   5, E.coffee,      "Кава");
  // АНОМАЛІЯ #2: Здоров'я 650 EUR (базова лінія 25+32+58 EUR, тобто середнє ~38 EUR)
  await tx("2026-05-04", "expense", 650, E.health,      "Госпіталізація (операція)");
  await tx("2026-05-05", "expense", 120, E.clothes,     "Спортивний одяг");
  await tx("2026-05-06", "expense",  45, E.cafe,        "Вечеря");
  await tx("2026-05-07", "expense",   4, E.coffee,      "Кава");

  console.log("   Транзакції додано ✓\n");

  // 4. Goals + goal transactions
  console.log("4. Цілі...");

  // Goal 1: Відпустка — ризикована (probability ≈ 0%, HIGH)
  const g1 = await api("POST", "/goals", {
    name: "Відпустка до Іспанії",
    targetAmount: 2500,
    deadline: "2026-08-01",
  });
  const gid1 = g1._id;
  await api("POST", `/goals/${gid1}/transactions`, { amount: 50,  currency: "EUR", type: "deposit", date: "2026-01-15", note: "Перший внесок" });
  await api("POST", `/goals/${gid1}/transactions`, { amount: 80,  currency: "EUR", type: "deposit", date: "2026-02-15", note: "Лютневий внесок" });
  await api("POST", `/goals/${gid1}/transactions`, { amount: 30,  currency: "EUR", type: "deposit", date: "2026-03-15", note: "Менше грошей" });
  await api("POST", `/goals/${gid1}/transactions`, { amount: 10,  currency: "EUR", type: "deposit", date: "2026-04-15", note: "Майже нічого" });
  console.log(`   Ціль «Відпустка до Іспанії» (${gid1}) — внески: 50, 80, 30, 10 EUR ✓`);

  // Goal 2: Резервний фонд — дуже ризикована (probability ≈ 0%, HIGH)
  const g2 = await api("POST", "/goals", {
    name: "Резервний фонд",
    targetAmount: 8000,
    deadline: "2026-12-31",
  });
  const gid2 = g2._id;
  await api("POST", `/goals/${gid2}/transactions`, { amount: 200, currency: "EUR", type: "deposit", date: "2026-01-20", note: "Старт накопичень" });
  await api("POST", `/goals/${gid2}/transactions`, { amount: 150, currency: "EUR", type: "deposit", date: "2026-02-20", note: "Лютий" });
  await api("POST", `/goals/${gid2}/transactions`, { amount: 50,  currency: "EUR", type: "deposit", date: "2026-03-20", note: "Менше — проблеми з доходом" });
  await api("POST", `/goals/${gid2}/transactions`, { amount: 10,  currency: "EUR", type: "deposit", date: "2026-04-20", note: "Майже нічого" });
  console.log(`   Ціль «Резервний фонд» (${gid2}) — внески: 200, 150, 50, 10 EUR ✓`);

  // Goal 3: Новий телефон — на правильному шляху (probability > 65%, без рекомендації)
  const g3 = await api("POST", "/goals", {
    name: "Новий телефон",
    targetAmount: 600,
    deadline: "2026-09-30",
  });
  const gid3 = g3._id;
  await api("POST", `/goals/${gid3}/transactions`, { amount: 100, currency: "EUR", type: "deposit", date: "2026-01-25", note: "Перший внесок" });
  await api("POST", `/goals/${gid3}/transactions`, { amount: 100, currency: "EUR", type: "deposit", date: "2026-02-25", note: "Лютий" });
  await api("POST", `/goals/${gid3}/transactions`, { amount: 80,  currency: "EUR", type: "deposit", date: "2026-03-25", note: "Березень" });
  await api("POST", `/goals/${gid3}/transactions`, { amount: 80,  currency: "EUR", type: "deposit", date: "2026-04-25", note: "Квітень" });
  console.log(`   Ціль «Новий телефон» (${gid3}) — внески: 100, 100, 80, 80 EUR ✓\n`);

  // 5. Budget for May 2026
  console.log("5. Бюджет на травень 2026...");
  const budget = await api("POST", "/budgets", {
    totalLimit: 700,
    period: { month: 5, year: 2026 },
    categoryLimits: [
      { categoryId: E.food,          limit: 150 },
      { categoryId: E.health,        limit: 100 },
      { categoryId: E.transport,     limit: 30  },
      { categoryId: E.clothes,       limit: 100 },
      { categoryId: E.cafe,          limit: 80  },
      { categoryId: E.entertainment, limit: 50  },
      { categoryId: E.coffee,        limit: 80  },
    ],
  });
  console.log(`   Бюджет травень 2026: ліміт 700 EUR (id: ${budget._id}) ✓`);
  console.log("   Очікувано: витрачено 887 EUR = 127% → budget_over_limit HIGH\n");

  // 6. Recurring transactions
  console.log("6. Регулярні транзакції...");
  const rec1 = await api("POST", "/recurring-transactions", {
    amount: 15,
    type: "expense",
    categoryId: E.entertainment,
    currency: "EUR",
    frequency: "monthly",
    startDate: "2026-01-01",
    note: "Netflix",
  });
  console.log(`   Netflix 15 EUR/міс (id: ${rec1._id}) ✓`);

  const rec2 = await api("POST", "/recurring-transactions", {
    amount: 10,
    type: "expense",
    categoryId: E.entertainment,
    currency: "EUR",
    frequency: "monthly",
    startDate: "2026-01-01",
    note: "Spotify",
  });
  console.log(`   Spotify 10 EUR/міс (id: ${rec2._id}) ✓`);

  const rec3 = await api("POST", "/recurring-transactions", {
    amount: 25,
    type: "expense",
    categoryId: E.utilities,
    currency: "EUR",
    frequency: "monthly",
    startDate: "2026-01-01",
    note: "Інтернет",
  });
  console.log(`   Інтернет 25 EUR/міс (id: ${rec3._id}) ✓\n`);

  // Summary
  console.log("=== ГОТОВО ===\n");
  console.log("Очікувані рекомендації після генерації:\n");
  console.log("  GROUP: immediate_actions (Негайні дії)");
  console.log("   [HIGH]   balance_warning       — витрати ~2974 EUR > доходи 0 EUR (last 30d)");
  console.log("   [HIGH]   trend_change           — витрати +456%: поточні ~2974 vs попередні ~535 EUR");
  console.log("   [HIGH]   trend_change           — доходи -100%: поточні ~0 vs попередні ~1030 EUR");
  console.log("   [HIGH]   trend_change           — баланс -700%: поточне -2974 vs попереднє +495 EUR");
  console.log("   [HIGH]   anomaly_alert          — Електроніка 1200 EUR (baseline avg ~38 EUR)");
  console.log("   [HIGH]   budget_risk            — бюджет травень 887/700 = 127% (over limit)");
  console.log("   [HIGH]   budget_risk (category) — Здоров'я 650/100 = 650%");
  console.log("   [HIGH]   budget_risk (category) — Одяг 120/100 = 120%");
  console.log();
  console.log("  GROUP: planning_ahead (Планування наперед)");
  console.log("   [HIGH]   goal_feasibility       — «Відпустка до Іспанії» ~0% (треба 1165 EUR/міс)");
  console.log("   [HIGH]   spending_optimization  — Електроніка домінує: 1200/2974 = 40%");
  console.log();
  console.log("  GROUP: spending_optimization (Оптимізація витрат)");
  console.log("   [MEDIUM] behavior_insight       — «Регулярні дрібні витрати» ~38 операцій");
  console.log();
  console.log("Тепер зайди в застосунок → POST /api/recommendations/generate → перевір рекомендації.");
}

main().catch((err) => {
  console.error("\n❌ Помилка:", err.message);
  process.exit(1);
});
