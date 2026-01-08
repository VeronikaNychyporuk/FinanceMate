import React, { useMemo, useState } from "react";

/**
 * RecommendationsMockPage.jsx
 * Оновлений макет:
 * - Перша підсторінка: "Рекомендації" (як inbox)
 * - "Огляд" з перемикачем 7/30/90 днів
 * - Інші підсторінки: докази/візуалізація (аномалії/прогноз/цілі/патерни)
 *
 * Без залежностей: графіки — простий SVG.
 */

const TABS = [
  { key: "recs", label: "Рекомендації" },
  { key: "overview", label: "Огляд" },
  { key: "anomalies", label: "Аномалії" },
  { key: "forecast", label: "Прогноз" },
  { key: "goals", label: "Цілі (Monte-Carlo)" },
  { key: "patterns", label: "Поведінка витрат" },
];

const OVERVIEW_PERIODS = [
  { key: "7d", label: "7 днів" },
  { key: "30d", label: "30 днів" },
  { key: "90d", label: "90 днів" },
];

function cn(...cls) {
  return cls.filter(Boolean).join(" ");
}

function formatMoney(amount, currency = "UAH") {
  try {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount} ${currency}`;
  }
}

function SeverityPill({ severity }) {
  const map = {
    low: { label: "Низька", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    medium: { label: "Середня", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    high: { label: "Висока", cls: "bg-rose-100 text-rose-800 border-rose-200" },
  };
  const s = map[severity] ?? map.low;
  return (
    <span className={cn("inline-flex items-center px-2 py-1 text-xs border rounded-full", s.cls)}>
      {s.label}
    </span>
  );
}

function ModulePill({ moduleKey }) {
  const map = {
    anomalies: "Аномалії",
    forecast: "Прогноз",
    goals: "Цілі",
    patterns: "Поведінка",
    overview: "Огляд",
  };
  return (
    <span className="inline-flex items-center px-2 py-1 text-xs border rounded-full bg-slate-50 text-slate-700">
      {map[moduleKey] ?? moduleKey}
    </span>
  );
}

function Gauge({ value, labelLeft = "0%", labelRight = "100%" }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>{labelLeft}</span>
        <span>{labelRight}</span>
      </div>
      <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-slate-900" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-sm mt-2">
        Ймовірність: <b>{pct.toFixed(0)}%</b>
      </div>
    </div>
  );
}

function MiniSparkline({ points, width = 520, height = 140 }) {
  const padding = 12;
  const w = width;
  const h = height;
  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = maxY - minY || 1;

  const toX = (i) => padding + (i * (w - padding * 2)) / Math.max(1, points.length - 1);
  const toY = (y) => h - padding - ((y - minY) * (h - padding * 2)) / span;

  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(2)} ${toY(p.y).toFixed(2)}`)
    .join(" ");

  const xLabels = points.map((p) => p.xLabel);

  return (
    <div className="w-full overflow-x-auto">
      <svg width={w} height={h} className="block">
        <rect x="0" y="0" width={w} height={h} fill="white" />
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding + (i * (h - padding * 2)) / 4;
          return <line key={i} x1={padding} y1={y} x2={w - padding} y2={y} stroke="#e2e8f0" />;
        })}
        <path d={d} fill="none" stroke="#0f172a" strokeWidth="2.5" />
        {points.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.y)} r="3.5" fill="#0f172a" />
        ))}
        <text x={padding} y={padding - 2} fontSize="11" fill="#64748b">
          max {maxY.toFixed(0)}
        </text>
        <text x={padding} y={h - 2} fontSize="11" fill="#64748b">
          min {minY.toFixed(0)}
        </text>
      </svg>

      <div className="flex justify-between text-xs text-slate-500 mt-2">
        <span>{xLabels[0]}</span>
        <span>{xLabels[Math.floor((xLabels.length - 1) / 2)]}</span>
        <span>{xLabels[xLabels.length - 1]}</span>
      </div>
    </div>
  );
}

function Card({ title, subtitle, right, children }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-base font-semibold text-slate-900">{title}</div>
          {subtitle ? <div className="text-sm text-slate-600 mt-0.5">{subtitle}</div> : null}
        </div>
        {right ? <div className="shrink-0">{right}</div> : null}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function PrimaryButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 active:bg-slate-950"
      type="button"
    >
      {children}
    </button>
  );
}
function GhostButton({ children, onClick }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-2 rounded-lg border border-slate-200 text-slate-900 text-sm hover:bg-slate-50 active:bg-slate-100"
      type="button"
    >
      {children}
    </button>
  );
}

function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1">
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={cn(
            "px-3 py-1.5 text-sm rounded-md",
            value === o.key ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export default function RecommendationsMockPage() {
  const [tab, setTab] = useState("recs");
  const [overviewPeriod, setOverviewPeriod] = useState("30d");

  const fake = useMemo(() => {
    // Один "snapshot", який UI отримує одним запитом.
    // Overview залежить від overviewPeriod (7/30/90), інші секції — незалежні.
    // Це відповідає вашому рішенню: рекомендації загальні, а період — лише для огляду.
    return {
      generatedAt: "2026-01-08 22:40",
      recommendations: {
        groups: [
          {
            title: "Негайні дії",
            items: [
              {
                id: "r1",
                module: "anomalies",
                severity: "high",
                title: "Перевірте підозрілу транзакцію",
                message: "Покупка на 2 450 UAH у невідомого мерчанта. Рекомендуємо підтвердити, що це ваша операція.",
                facts: ["Новий мерчант", "Сума в 4.1× більша за типову", "Рідкісна категорія"],
                primaryCta: { label: "Перевірити", goto: "anomalies" },
                secondaryCta: { label: "Докази", goto: "anomalies" },
              },
              {
                id: "r2",
                module: "goals",
                severity: "medium",
                title: "Підвищіть шанс досягнення фінансової цілі",
                message: "Ймовірність досягнення “Подушки безпеки” до 01.09.2026 зараз 42%. Є прості сценарії для покращення.",
                facts: ["Поточний шанс: 42%", "+500 UAH/міс → 68%", "Дедлайн: 01.09.2026"],
                primaryCta: { label: "Подивитись сценарії", goto: "goals" },
                secondaryCta: { label: "Докази", goto: "goals" },
              },
            ],
          },
          {
            title: "Оптимізація витрат",
            items: [
              {
                id: "r3",
                module: "patterns",
                severity: "medium",
                title: "Регулярні дрібні витрати формують значну частку бюджету",
                message:
                  "Виявлено кластер дрібних повторюваних витрат (кава/снеки/доставка). Невеликі ліміти дадуть відчутний ефект.",
                facts: ["74 транзакції", "Сума: 11 200 UAH", "Медіана: 140 UAH"],
                primaryCta: { label: "Переглянути кластери", goto: "patterns" },
                secondaryCta: { label: "Докази", goto: "patterns" },
              },
            ],
          },
          {
            title: "Планування наперед",
            items: [
              {
                id: "r4",
                module: "forecast",
                severity: "low",
                title: "Прогноз показує зменшення фінансової “подушки”",
                message:
                  "За поточним трендом баланс лишається позитивним, але очікується поступове зниження. Перевірте прогноз і ризики.",
                facts: ["Горизонт: 60 днів", "Баланс: 8 200 → 2 500", "Є ризик росту витрат на їжу"],
                primaryCta: { label: "Відкрити прогноз", goto: "forecast" },
                secondaryCta: { label: "Докази", goto: "forecast" },
              },
            ],
          },
        ],
      },
      overviewByPeriod: {
        "7d": {
          label: "Останні 7 днів",
          net: 2200,
          income: 11200,
          expense: 9000,
          topDrivers: [
            { name: "Їжа та доставка", amount: 2100 },
            { name: "Транспорт", amount: 1200 },
            { name: "Підписки", amount: 400 },
          ],
          highlights: [
            { severity: "medium", text: "Витрати на доставку зросли порівняно з попередніми 7 днями." },
            { severity: "low", text: "Нетто позитивне, але темп витрат високий." },
          ],
        },
        "30d": {
          label: "Останні 30 днів",
          net: 12400,
          income: 48600,
          expense: 36200,
          topDrivers: [
            { name: "Їжа та доставка", amount: 9800 },
            { name: "Транспорт", amount: 5200 },
            { name: "Підписки", amount: 1600 },
          ],
          highlights: [
            { severity: "medium", text: "Категорія “Їжа та доставка” близька до ліміту бюджету." },
            { severity: "low", text: "Стабільний дохід, але великі покупки впливають на баланс." },
          ],
        },
        "90d": {
          label: "Останні 90 днів",
          net: 28300,
          income: 141000,
          expense: 112700,
          topDrivers: [
            { name: "Їжа та доставка", amount: 29800 },
            { name: "Оренда/житло", amount: 27000 },
            { name: "Транспорт", amount: 14600 },
          ],
          highlights: [
            { severity: "medium", text: "Тренд витрат на їжу зростає вже 3 місяці." },
            { severity: "low", text: "Середній баланс позитивний, але волатильність витрат підвищена." },
          ],
        },
      },
      anomalies: {
        items: [
          {
            id: "a1",
            date: "2026-01-06",
            merchant: "Unknown Merchant",
            category: "Інше",
            amount: 2450,
            severity: "high",
            reasons: ["Новий мерчант", "Сума в 4.1× більша за типову", "Рідкісна категорія"],
            status: "open",
          },
          {
            id: "a2",
            date: "2026-01-03",
            merchant: "ElectroMarket",
            category: "Техніка",
            amount: 3999,
            severity: "medium",
            reasons: ["Найбільша покупка в категорії за 90 днів", "Відхилення від середнього"],
            status: "open",
          },
        ],
      },
      forecast: {
        horizon: "60 днів",
        seriesBalance: [
          { xLabel: "Сьогодні", y: 8200 },
          { xLabel: "7 днів", y: 7600 },
          { xLabel: "14 днів", y: 6900 },
          { xLabel: "21 день", y: 6100 },
          { xLabel: "30 днів", y: 5400 },
          { xLabel: "45 днів", y: 3800 },
          { xLabel: "60 днів", y: 2500 },
        ],
        risks: [
          { severity: "medium", text: "Ймовірне зростання витрат у категорії “Їжа та доставка” наступні 2 тижні." },
          { severity: "low", text: "Баланс очікувано позитивний, але “подушка” зменшується." },
        ],
      },
      goals: {
        goal: {
          id: "g1",
          name: "Подушка безпеки",
          target: 60000,
          saved: 18500,
          deadline: "2026-09-01",
        },
        probability: 42,
        whatIf: [
          { label: "+500 UAH/міс", probability: 68 },
          { label: "+1000 UAH/міс", probability: 82 },
          { label: "Дедлайн +2 міс", probability: 74 },
        ],
        distribution: [
          { xLabel: "07/2026", y: 0.08 },
          { xLabel: "08/2026", y: 0.13 },
          { xLabel: "09/2026", y: 0.21 },
          { xLabel: "10/2026", y: 0.20 },
          { xLabel: "11/2026", y: 0.16 },
          { xLabel: "12/2026", y: 0.12 },
          { xLabel: "01/2027", y: 0.10 },
        ],
      },
      patterns: {
        clusters: [
          {
            id: "c1",
            label: "Регулярні дрібні витрати",
            description: "Повторювані транзакції 50–250 UAH, часто в категорії “Їжа/кава”.",
            stats: { count: 74, total: 11200, median: 140 },
            top: ["Кава", "Снек", "Доставка"],
            recommendation: "Спробуйте ліміт 150 UAH/день або бюджет на “каву”.",
          },
          {
            id: "c2",
            label: "Рідкі великі покупки",
            description: "1–3 транзакції на місяць > 2500 UAH. Значно впливають на баланс.",
            stats: { count: 3, total: 9500, median: 3100 },
            top: ["Техніка", "Побут", "Одяг"],
            recommendation: "Плануйте великі покупки завчасно: відкладати 800 UAH/міс.",
          },
          {
            id: "c3",
            label: "Нетипові витрати / нові патерни",
            description: "Нові мерчанти або категорії, яких раніше майже не було.",
            stats: { count: 5, total: 4200, median: 700 },
            top: ["Інше", "Сервіси"],
            recommendation: "Перегляньте ці витрати та, за потреби, налаштуйте категорії/правила.",
          },
        ],
      },
    };
  }, []);

  const overview = fake.overviewByPeriod[overviewPeriod];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold text-slate-900">Центр рекомендацій</div>
            <div className="text-sm text-slate-600">Згенеровано: {fake.generatedAt}</div>
          </div>

          <div className="flex items-center gap-2">
            <GhostButton onClick={() => alert("У реальному проєкті: GET snapshot (cache/TTL)")}>
              Оновити дані
            </GhostButton>
            <PrimaryButton onClick={() => alert("У реальному проєкті: POST recompute → оновити snapshot")}>
              Перерахувати
            </PrimaryButton>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              type="button"
              className={cn(
                "px-3 py-2 rounded-lg text-sm",
                tab === t.key ? "bg-slate-900 text-white" : "hover:bg-slate-100 text-slate-800"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="mt-6 grid gap-4">
          {tab === "recs" && <RecommendationsSection data={fake.recommendations} onGoto={setTab} />}
          {tab === "overview" && (
            <OverviewSection
              data={overview}
              period={overviewPeriod}
              onPeriodChange={setOverviewPeriod}
            />
          )}
          {tab === "anomalies" && <AnomaliesSection data={fake.anomalies} />}
          {tab === "forecast" && <ForecastSection data={fake.forecast} />}
          {tab === "goals" && <GoalsSection data={fake.goals} />}
          {tab === "patterns" && <PatternsSection data={fake.patterns} />}
        </div>
      </div>
    </div>
  );
}

/* =======================
   1) Рекомендації (Inbox)
   ======================= */

function RecommendationsSection({ data, onGoto }) {
  return (
    <div className="grid gap-4">
      <Card
        title="Усі рекомендації"
        subtitle="Головна сторінка: короткі повідомлення + переходи до пояснень/візуалізацій"
        right={<span className="text-sm text-slate-500">Груп: {data.groups.length}</span>}
      >
        <div className="grid gap-4">
          {data.groups.map((g, idx) => (
            <div key={idx} className="border border-slate-200 rounded-xl p-4">
              <div className="text-sm font-semibold text-slate-900">{g.title}</div>
              <div className="mt-3 grid gap-3">
                {g.items.map((r) => (
                  <RecommendationCard key={r.id} rec={r} onGoto={onGoto} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RecommendationCard({ rec, onGoto }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-semibold text-slate-900">{rec.title}</div>
            <ModulePill moduleKey={rec.module} />
            <SeverityPill severity={rec.severity} />
          </div>

          <div className="text-sm text-slate-600 mt-1">{rec.message}</div>

          {rec.facts?.length ? (
            <div className="flex flex-wrap gap-2 mt-3">
              {rec.facts.slice(0, 3).map((f, i) => (
                <span key={i} className="px-2 py-1 text-xs border rounded-full bg-slate-50 text-slate-700">
                  {f}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <PrimaryButton onClick={() => onGoto(rec.primaryCta.goto)}>{rec.primaryCta.label}</PrimaryButton>
          <GhostButton onClick={() => onGoto(rec.secondaryCta.goto)}>{rec.secondaryCta.label}</GhostButton>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <GhostButton onClick={() => alert("У реальному проєкті: dismiss (persist action)")}>Відхилити</GhostButton>
        <GhostButton onClick={() => alert("У реальному проєкті: snooze (persist action)")}>Відкласти</GhostButton>
        <GhostButton onClick={() => alert("У реальному проєкті: mark done (persist action)")}>Виконано</GhostButton>
      </div>
    </div>
  );
}

/* =======================
   2) Огляд (7/30/90)
   ======================= */

function OverviewSection({ data, period, onPeriodChange }) {
  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-lg font-semibold text-slate-900">Огляд</div>
          <div className="text-sm text-slate-600">{data.label}</div>
        </div>

        <Segmented options={OVERVIEW_PERIODS} value={period} onChange={onPeriodChange} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card title="Доходи" subtitle="Сума за період">
          <div className="text-2xl font-bold">{formatMoney(data.income)}</div>
        </Card>
        <Card title="Витрати" subtitle="Сума за період">
          <div className="text-2xl font-bold">{formatMoney(data.expense)}</div>
        </Card>
        <Card title="Чистий результат" subtitle="Доходи − витрати">
          <div className="text-2xl font-bold">{formatMoney(data.net)}</div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Основні драйвери витрат" subtitle="Категорії з найбільшими сумами">
          <div className="grid gap-2">
            {data.topDrivers.map((d) => (
              <div key={d.name} className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2">
                <span className="text-sm text-slate-800">{d.name}</span>
                <b className="text-sm">{formatMoney(d.amount)}</b>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Ключові спостереження" subtitle="Швидкі висновки саме для обраного періоду">
          <div className="grid gap-2">
            {data.highlights.map((h, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3">
                <div className="text-sm text-slate-800">{h.text}</div>
                <SeverityPill severity={h.severity} />
              </div>
            ))}
          </div>

          <div className="mt-4 text-sm text-slate-600">
            Примітка: огляд — періодозалежний. Рекомендації (в першій вкладці) — загальні і не “стрибнуть” від перемикача.
          </div>
        </Card>
      </div>
    </>
  );
}

/* =======================
   3) Аномалії
   ======================= */

function AnomaliesSection({ data }) {
  return (
    <Card
      title="Аномалії у витратах"
      subtitle="Підозрілі або нетипові транзакції з поясненнями"
      right={<span className="text-sm text-slate-500">Відкриті: {data.items.length}</span>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-2 pr-3">Дата</th>
              <th className="py-2 pr-3">Мерчант</th>
              <th className="py-2 pr-3">Категорія</th>
              <th className="py-2 pr-3">Сума</th>
              <th className="py-2 pr-3">Причини</th>
              <th className="py-2 pr-3">Дії</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((x) => (
              <tr key={x.id} className="border-t border-slate-200">
                <td className="py-3 pr-3">{x.date}</td>
                <td className="py-3 pr-3">{x.merchant}</td>
                <td className="py-3 pr-3">{x.category}</td>
                <td className="py-3 pr-3 font-semibold">{formatMoney(x.amount)}</td>
                <td className="py-3 pr-3">
                  <div className="flex flex-wrap gap-2">
                    <SeverityPill severity={x.severity} />
                    {x.reasons.slice(0, 2).map((r, i) => (
                      <span key={i} className="px-2 py-1 text-xs border rounded-full bg-slate-50">
                        {r}
                      </span>
                    ))}
                    {x.reasons.length > 2 ? (
                      <span className="px-2 py-1 text-xs border rounded-full bg-slate-50">
                        +{x.reasons.length - 2}
                      </span>
                    ) : null}
                  </div>
                </td>
                <td className="py-3 pr-3">
                  <div className="flex flex-wrap gap-2">
                    <GhostButton onClick={() => alert("Mark as normal (persist action)")}>Це нормально</GhostButton>
                    <PrimaryButton onClick={() => alert("Flag suspicious (persist action)")}>Підозріло</PrimaryButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

/* =======================
   4) Прогноз
   ======================= */

function ForecastSection({ data }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Прогноз балансу" subtitle={`Горизонт: ${data.horizon}`}>
        <MiniSparkline points={data.seriesBalance} />
        <div className="text-sm text-slate-600 mt-3">
          Тут легко додати другу лінію (доходи/витрати), але для макета вистачає балансу.
        </div>
      </Card>

      <Card title="Ризики та підказки" subtitle="Сформовано на основі прогнозу">
        <div className="grid gap-2">
          {data.risks.map((r, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3">
              <div className="text-sm text-slate-800">{r.text}</div>
              <SeverityPill severity={r.severity} />
            </div>
          ))}
        </div>
        <div className="mt-4 text-sm text-slate-600">
          У реальному UI тут зазвичай є CTA “переглянути витрати по категорії” або “налаштувати бюджет”.
        </div>
      </Card>
    </div>
  );
}

/* =======================
   5) Цілі (Monte-Carlo)
   ======================= */

function GoalsSection({ data }) {
  const g = data.goal;
  const progressPct = Math.round((g.saved / g.target) * 100);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card
        title={`Ціль: ${g.name}`}
        subtitle={`Накопичено ${formatMoney(g.saved)} з ${formatMoney(g.target)} · Дедлайн: ${g.deadline}`}
        right={<span className="text-sm text-slate-500">Прогрес: {progressPct}%</span>}
      >
        <Gauge value={data.probability} />
        <div className="mt-4 text-sm text-slate-600">
          Це “візуальна суть” Монте-Карло: ймовірність досягнення до дедлайну + сценарії.
        </div>
      </Card>

      <Card title="What-if сценарії" subtitle="Як зміниться ймовірність при різних діях">
        <div className="grid gap-2">
          {data.whatIf.map((w, i) => (
            <div key={i} className="border border-slate-200 rounded-xl p-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">{w.label}</div>
                <div className="text-sm">
                  <b>{w.probability}%</b>
                </div>
              </div>
              <div className="mt-2">
                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-slate-900" style={{ width: `${w.probability}%` }} />
                </div>
              </div>
              <div className="mt-3">
                <PrimaryButton onClick={() => alert("Apply scenario: update goal/plan")}>Застосувати</PrimaryButton>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Розподіл часу досягнення" subtitle="Ймовірність по місяцях (приклад)">
        <MiniSparkline
          points={data.distribution.map((d) => ({ xLabel: d.xLabel, y: d.y * 100 }))}
          width={900}
          height={160}
        />
        <div className="text-sm text-slate-600 mt-3">
          У реальній реалізації це буде гістограма/area-chart, але макет вже дає правильну структуру.
        </div>
      </Card>
    </div>
  );
}

/* =======================
   6) Патерни (кластеризація)
   ======================= */

function PatternsSection({ data }) {
  return (
    <div className="grid gap-4">
      <Card title="Кластери поведінки витрат" subtitle="Сегменти, що описують типові патерни">
        <div className="grid md:grid-cols-2 gap-4">
          {data.clusters.map((c) => (
            <div key={c.id} className="border border-slate-200 rounded-xl p-4">
              <div className="text-base font-semibold">{c.label}</div>
              <div className="text-sm text-slate-600 mt-1">{c.description}</div>

              <div className="grid grid-cols-3 gap-2 mt-4">
                <Metric label="К-ть" value={String(c.stats.count)} />
                <Metric label="Сума" value={formatMoney(c.stats.total)} />
                <Metric label="Медіана" value={formatMoney(c.stats.median)} />
              </div>

              <div className="text-sm text-slate-700 mt-4">
                <b>Топ:</b> {c.top.join(", ")}
              </div>

              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="text-sm font-semibold">Рекомендація</div>
                <div className="text-sm text-slate-600 mt-1">{c.recommendation}</div>
                <div className="mt-3 flex gap-2">
                  <PrimaryButton onClick={() => alert("Create budget / rule / review transactions")}>Дія</PrimaryButton>
                  <GhostButton onClick={() => alert("Open details: transactions in this cluster")}>Деталі</GhostButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="border border-slate-200 rounded-lg p-2">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}
