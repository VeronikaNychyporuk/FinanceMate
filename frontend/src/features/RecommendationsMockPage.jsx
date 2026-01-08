import React, { useMemo, useState } from "react";

/**
 * RecommendationsMockPage.jsx
 * Візуальний макет "Центру рекомендацій" з фейковими даними.
 * Без залежностей (графік на SVG).
 */

const TABS = [
  { key: "overview", label: "Огляд" },
  { key: "anomalies", label: "Аномалії" },
  { key: "forecast", label: "Прогноз" },
  { key: "goals", label: "Цілі (Monte-Carlo)" },
  { key: "patterns", label: "Поведінка витрат" },
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
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 text-xs border rounded-full",
        s.cls
      )}
      title={`Серйозність: ${s.label}`}
    >
      {s.label}
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
  // points: [{xLabel, y}]
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
        {/* background grid */}
        <rect x="0" y="0" width={w} height={h} fill="white" />
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding + (i * (h - padding * 2)) / 4;
          return <line key={i} x1={padding} y1={y} x2={w - padding} y2={y} stroke="#e2e8f0" />;
        })}
        {/* line */}
        <path d={d} fill="none" stroke="#0f172a" strokeWidth="2.5" />
        {/* points */}
        {points.map((p, i) => (
          <circle key={i} cx={toX(i)} cy={toY(p.y)} r="3.5" fill="#0f172a" />
        ))}
        {/* axes labels (min/max) */}
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

export default function RecommendationsMockPage() {
  const [tab, setTab] = useState("overview");

  const fake = useMemo(() => {
    // Псевдо "snapshot" який UI отримує одним запитом
    return {
      generatedAt: "2026-01-08 22:40",
      periodLabel: "Останні 30 днів",
      overview: {
        net: 12400,
        income: 48600,
        expense: 36200,
        topDrivers: [
          { name: "Їжа та доставка", amount: 9800 },
          { name: "Транспорт", amount: 5200 },
          { name: "Підписки", amount: 1600 },
        ],
        priorityActions: [
          {
            title: "Перевірте підозрілу транзакцію",
            text: "Нова покупка на 2 450 UAH у невідомого мерчанта.",
            severity: "high",
            cta: { label: "Відкрити аномалії", goto: "anomalies" },
          },
          {
            title: "Є ризик перевищення бюджету на їжу",
            text: "Витрати на їжу вже 92% від місячного ліміту.",
            severity: "medium",
            cta: { label: "Подивитись прогноз", goto: "forecast" },
          },
          {
            title: "Щоб встигнути до цілі — збільште заощадження",
            text: "Ймовірність досягнення цілі зараз 42%. +500 UAH/міс → 68%.",
            severity: "medium",
            cta: { label: "Перейти до цілі", goto: "goals" },
          },
        ],
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
          { severity: "low", text: "Баланс очікувано залишиться позитивним, але “подушка” зменшується." },
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

  const header = (
    <div className="flex flex-col gap-1">
      <div className="text-2xl font-bold text-slate-900">Центр рекомендацій</div>
      <div className="text-sm text-slate-600">
        {fake.periodLabel} · Згенеровано: {fake.generatedAt}
      </div>
    </div>
  );

  const topBar = (
    <div className="flex items-center justify-between gap-3">
      {header}
      <div className="flex items-center gap-2">
        <GhostButton onClick={() => alert("У реальному проєкті тут: GET snapshot / кеш")}>
          Оновити дані
        </GhostButton>
        <PrimaryButton onClick={() => alert("У реальному проєкті тут: POST recompute → оновити snapshot")}>
          Перерахувати
        </PrimaryButton>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {topBar}

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
          {tab === "overview" && <OverviewSection data={fake.overview} onGoto={setTab} />}
          {tab === "anomalies" && <AnomaliesSection data={fake.anomalies} />}
          {tab === "forecast" && <ForecastSection data={fake.forecast} />}
          {tab === "goals" && <GoalsSection data={fake.goals} />}
          {tab === "patterns" && <PatternsSection data={fake.patterns} />}
        </div>
      </div>

      {/* Tailwind-free fallback: якщо у вас немає Tailwind, це все одно працюватиме,
          але вигляд буде "голий". У вашому проєкті ймовірно є стилі/компоненти — замініть класи під себе. */}
    </div>
  );
}

function OverviewSection({ data, onGoto }) {
  return (
    <>
      <div className="grid md:grid-cols-3 gap-4">
        <Card title="Доходи" subtitle="Сума за період" right={<span className="text-sm text-slate-500">30 днів</span>}>
          <div className="text-2xl font-bold">{formatMoney(data.income)}</div>
        </Card>
        <Card title="Витрати" subtitle="Сума за період" right={<span className="text-sm text-slate-500">30 днів</span>}>
          <div className="text-2xl font-bold">{formatMoney(data.expense)}</div>
        </Card>
        <Card title="Чистий результат" subtitle="Доходи − витрати" right={<span className="text-sm text-slate-500">30 днів</span>}>
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

        <Card title="Пріоритетні дії" subtitle="Що варто зробити в першу чергу">
          <div className="grid gap-3">
            {data.priorityActions.map((a, idx) => (
              <div key={idx} className="border border-slate-200 rounded-xl p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="text-sm font-semibold text-slate-900">{a.title}</div>
                  <SeverityPill severity={a.severity} />
                </div>
                <div className="text-sm text-slate-600 mt-1">{a.text}</div>
                <div className="mt-3">
                  <PrimaryButton onClick={() => onGoto(a.cta.goto)}>{a.cta.label}</PrimaryButton>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </>
  );
}

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
                    <GhostButton onClick={() => alert("Mark as normal (persist feedback)")}>Це нормально</GhostButton>
                    <PrimaryButton onClick={() => alert("Flag fraud (persist feedback)")}>Підозріло</PrimaryButton>
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

function ForecastSection({ data }) {
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Прогноз балансу" subtitle={`Горизонт: ${data.horizon}`}>
        <MiniSparkline points={data.seriesBalance} />
        <div className="text-sm text-slate-600 mt-3">
          Це приклад: тут може бути баланс або окремо доходи/витрати двома лініями (але для макета достатньо однієї).
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
          У реальному проєкті поруч доречно дати “що робити”: лінк на бюджет/категорію або CTA “переглянути витрати”.
        </div>
      </Card>
    </div>
  );
}

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
          Під “капотом” це Монте-Карло. UI не повідомленням, а конкретним показником: ймовірність до дедлайну.
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
                <PrimaryButton onClick={() => alert("Apply scenario: update plan / goal settings")}>
                  Застосувати
                </PrimaryButton>
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
          Тут можна показати гістограму/area-chart, але для макета SVG-лінія достатня.
        </div>
      </Card>
    </div>
  );
}

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
                  <PrimaryButton onClick={() => alert("Create budget / rule / review transactions")}>
                    Дія
                  </PrimaryButton>
                  <GhostButton onClick={() => alert("Open details: list of transactions in this cluster")}>
                    Деталі
                  </GhostButton>
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
