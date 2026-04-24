import React, { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:5000/api/recommendations";
const USER_API_URL = "http://localhost:5000/api/user/profile";

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

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function formatMoney(amount, currency = "UAH") {
  try {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(amount || 0));
  } catch {
    return `${amount} ${currency}`;
  }
}

function formatDate(dateValue, withTime = false) {
  if (!dateValue) return "—";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "—";
  if (withTime) {
    return date.toLocaleString("uk-UA", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  }
  return date.toLocaleDateString("uk-UA");
}

function getSeverityLabel(value) {
  switch (String(value || "").toLowerCase()) {
    case "high":
    case "critical":
      return "Висока";
    case "medium":
      return "Середня";
    case "low":
      return "Низька";
    default:
      return value || "—";
  }
}

function getModuleLabel(value) {
  switch (value) {
    case "overview": return "Огляд";
    case "anomalies": return "Аномалії";
    case "forecast": return "Прогноз";
    case "goals": return "Цілі";
    case "patterns": return "Поведінка";
    default: return value || "—";
  }
}

/* ============ UI Primitives ============ */

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

function PrimaryButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60"
      type="button"
    >
      {children}
    </button>
  );
}

function GhostButton({ children, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-2 rounded-lg border border-slate-200 text-slate-900 text-sm hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60"
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

function SeverityPill({ severity }) {
  const map = {
    low: { label: "Низька", cls: "bg-emerald-100 text-emerald-800 border-emerald-200" },
    medium: { label: "Середня", cls: "bg-amber-100 text-amber-800 border-amber-200" },
    high: { label: "Висока", cls: "bg-rose-100 text-rose-800 border-rose-200" },
    critical: { label: "Висока", cls: "bg-rose-100 text-rose-800 border-rose-200" },
  };
  const s = map[String(severity || "").toLowerCase()] ?? map.low;
  return (
    <span className={cn("inline-flex items-center px-2 py-1 text-xs border rounded-full", s.cls)}>
      {s.label}
    </span>
  );
}

function ModulePill({ moduleKey }) {
  return (
    <span className="inline-flex items-center px-2 py-1 text-xs border rounded-full bg-slate-50 text-slate-700">
      {getModuleLabel(moduleKey)}
    </span>
  );
}

function Gauge({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value || 0)));
  return (
    <div className="w-full">
      <div className="flex justify-between text-xs text-slate-500 mb-1">
        <span>0%</span>
        <span>100%</span>
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
  if (!Array.isArray(points) || points.length === 0) {
    return (
      <div className="text-sm text-slate-500 py-4">Недостатньо даних для графіка</div>
    );
  }

  const padding = 12;
  const w = width;
  const h = height;
  const ys = points.map((p) => Number(p.y ?? p.balance ?? 0));
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const span = maxY - minY || 1;

  const toX = (i) => padding + (i * (w - padding * 2)) / Math.max(1, points.length - 1);
  const toY = (y) => h - padding - ((y - minY) * (h - padding * 2)) / span;

  const d = points
    .map((p, i) => {
      const y = Number(p.y ?? p.balance ?? 0);
      return `${i === 0 ? "M" : "L"} ${toX(i).toFixed(2)} ${toY(y).toFixed(2)}`;
    })
    .join(" ");

  const xLabels = points.map((p) => p.xLabel || p.date || "");

  return (
    <div className="w-full overflow-x-auto">
      <svg width={w} height={h} className="block">
        <rect x="0" y="0" width={w} height={h} fill="white" />
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding + (i * (h - padding * 2)) / 4;
          return <line key={i} x1={padding} y1={y} x2={w - padding} y2={y} stroke="#e2e8f0" />;
        })}
        <path d={d} fill="none" stroke="#0f172a" strokeWidth="2.5" />
        {points.map((p, i) => {
          const y = Number(p.y ?? p.balance ?? 0);
          return <circle key={i} cx={toX(i)} cy={toY(y)} r="3.5" fill="#0f172a" />;
        })}
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

function EmptyState({ text }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-8 py-10 text-sm text-slate-500">
      {text}
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

/* ============ Recommendation Components ============ */

function RecommendationCard({ recommendation, onDismiss, onSnooze, onDone, actionLoading }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-semibold text-slate-900">{recommendation.title}</div>
            <ModulePill moduleKey={recommendation.module} />
            <SeverityPill severity={recommendation.priority} />
          </div>

          <div className="text-sm text-slate-600 mt-1">{recommendation.message}</div>

          {Array.isArray(recommendation.facts) && recommendation.facts.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-3">
              {recommendation.facts.map((fact, index) => (
                <span
                  key={`${recommendation._id}-fact-${index}`}
                  className="px-2 py-1 text-xs border rounded-full bg-slate-50 text-slate-700"
                >
                  {fact}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 shrink-0">
          <PrimaryButton>{recommendation.primaryAction?.label || "Переглянути"}</PrimaryButton>
          <GhostButton>{recommendation.secondaryAction?.label || "Докази"}</GhostButton>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <GhostButton onClick={() => onDismiss(recommendation._id)} disabled={actionLoading}>
          Відхилити
        </GhostButton>
        <GhostButton onClick={() => onSnooze(recommendation._id)} disabled={actionLoading}>
          Відкласти
        </GhostButton>
        <GhostButton onClick={() => onDone(recommendation._id)} disabled={actionLoading}>
          Виконано
        </GhostButton>
      </div>
    </div>
  );
}

function RecommendationGroup({ title, items, onDismiss, onSnooze, onDone, actionLoadingId }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4">
      <div className="text-sm font-semibold text-slate-900">{title}</div>
      <div className="mt-3 grid gap-3">
        {items.map((item) => (
          <RecommendationCard
            key={item._id}
            recommendation={item}
            onDismiss={onDismiss}
            onSnooze={onSnooze}
            onDone={onDone}
            actionLoading={actionLoadingId === item._id}
          />
        ))}
      </div>
    </div>
  );
}

/* ============ Tab Sections ============ */

function RecommendationsSection({ groupList, onDismiss, onSnooze, onDone, actionLoadingId }) {
  return (
    <Card
      title="Усі рекомендації"
      subtitle="Головна сторінка: короткі повідомлення + переходи до пояснень/візуалізацій"
      right={<span className="text-sm text-slate-500">Груп: {groupList.length}</span>}
    >
      {groupList.length > 0 ? (
        <div className="grid gap-4">
          {groupList.map((group, index) => (
            <RecommendationGroup
              key={`${group.title}-${index}`}
              title={group.title}
              items={group.items}
              onDismiss={onDismiss}
              onSnooze={onSnooze}
              onDone={onDone}
              actionLoadingId={actionLoadingId}
            />
          ))}
        </div>
      ) : (
        <div className="text-sm text-slate-500">Активні рекомендації відсутні.</div>
      )}
    </Card>
  );
}

function OverviewSection({ data, period, onPeriodChange, currency }) {
  if (!data) return <EmptyState text="Snapshot для огляду ще не сформовано." />;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-semibold text-slate-900">Огляд</div>
        <Segmented options={OVERVIEW_PERIODS} value={period} onChange={onPeriodChange} />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <Card title="Доходи" subtitle="Сума за період">
          <div className="text-2xl font-bold">{formatMoney(data.income, currency)}</div>
        </Card>
        <Card title="Витрати" subtitle="Сума за період">
          <div className="text-2xl font-bold">{formatMoney(data.expense, currency)}</div>
        </Card>
        <Card title="Чистий результат" subtitle="Доходи − витрати">
          <div className="text-2xl font-bold">{formatMoney(data.net, currency)}</div>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card title="Основні драйвери витрат" subtitle="Категорії з найбільшими сумами">
          {data.topDrivers?.length ? (
            <div className="grid gap-2">
              {data.topDrivers.map((d, index) => (
                <div
                  key={`${d.category || d.name}-${index}`}
                  className="flex items-center justify-between border border-slate-100 rounded-lg px-3 py-2"
                >
                  <div>
                    <span className="text-sm text-slate-800">{d.category || d.name}</span>
                    {d.share != null ? (
                      <span className="ml-2 text-xs text-slate-500">({d.share}%)</span>
                    ) : null}
                  </div>
                  <b className="text-sm">{formatMoney(d.amount, currency)}</b>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">Немає даних.</div>
          )}
        </Card>

        <Card title="Ключові спостереження" subtitle="Швидкі висновки для обраного періоду">
          {data.highlights?.length ? (
            <div className="grid gap-2">
              {data.highlights.map((h, i) => (
                <div
                  key={i}
                  className="border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3"
                >
                  <div className="text-sm text-slate-800">
                    {typeof h === "string" ? h : h.text}
                  </div>
                  {h.severity ? <SeverityPill severity={h.severity} /> : null}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500">Немає даних.</div>
          )}
        </Card>
      </div>
    </>
  );
}

function AnomaliesSection({ anomalies, currency }) {
  if (!anomalies.length) return <EmptyState text="Аномалій не виявлено." />;

  return (
    <Card
      title="Аномалії у витратах"
      subtitle="Підозрілі або нетипові транзакції з поясненнями"
      right={<span className="text-sm text-slate-500">Відкриті: {anomalies.length}</span>}
    >
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-slate-500">
            <tr>
              <th className="py-2 pr-3">Дата</th>
              <th className="py-2 pr-3">Категорія</th>
              <th className="py-2 pr-3">Мерчант</th>
              <th className="py-2 pr-3">Сума</th>
              <th className="py-2 pr-3">Причини</th>
            </tr>
          </thead>
          <tbody>
            {anomalies.map((anomaly, index) => (
              <tr key={anomaly.transactionId || index} className="border-t border-slate-200">
                <td className="py-3 pr-3">{formatDate(anomaly.date)}</td>
                <td className="py-3 pr-3">{anomaly.category || "—"}</td>
                <td className="py-3 pr-3">{anomaly.merchant || "Без назви"}</td>
                <td className="py-3 pr-3 font-semibold">{formatMoney(anomaly.amount, currency)}</td>
                <td className="py-3 pr-3">
                  <div className="flex flex-wrap gap-2">
                    <SeverityPill severity={anomaly.severity} />
                    {(anomaly.reasons || []).slice(0, 2).map((r, i) => (
                      <span key={i} className="px-2 py-1 text-xs border rounded-full bg-slate-50">
                        {r}
                      </span>
                    ))}
                    {(anomaly.reasons || []).length > 2 ? (
                      <span className="px-2 py-1 text-xs border rounded-full bg-slate-50">
                        +{anomaly.reasons.length - 2}
                      </span>
                    ) : null}
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

function MethodBadge({ method }) {
  const map = {
    holt_winters: { label: "Holt-Winters (Triple ES)", color: "bg-indigo-100 text-indigo-700" },
    double_es:    { label: "Подвійне згладжування (Holt)", color: "bg-sky-100 text-sky-700" },
    insufficient: { label: "Недостатньо даних", color: "bg-slate-100 text-slate-500" },
  };
  const cfg = map[method] || { label: "Аналіз балансу", color: "bg-slate-100 text-slate-500" };
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.color)}>
      {cfg.label}
    </span>
  );
}

function ConfidenceBadge({ level }) {
  const map = {
    high:   { label: "Висока надійність", color: "bg-emerald-100 text-emerald-700" },
    medium: { label: "Середня надійність", color: "bg-yellow-100 text-yellow-700" },
    low:    { label: "Низька надійність", color: "bg-orange-100 text-orange-700" },
    none:   { label: "Немає даних", color: "bg-slate-100 text-slate-400" },
  };
  const cfg = map[level] || map.none;
  return (
    <span className={cn("text-xs font-medium px-2 py-0.5 rounded-full", cfg.color)}>
      {cfg.label}
    </span>
  );
}

function ForecastChart({ points, width = 520, height = 150 }) {
  if (!Array.isArray(points) || points.length === 0) {
    return <div className="text-sm text-slate-500 py-4">Недостатньо даних для графіка</div>;
  }

  const padding = 14;
  const balances = points.map((p) => p.balance);
  const lowers   = points.map((p) => p.lower ?? p.balance);
  const uppers   = points.map((p) => p.upper ?? p.balance);

  const allValues = [...balances, ...lowers, ...uppers];
  const minY = Math.min(...allValues);
  const maxY = Math.max(...allValues);
  const span = maxY - minY || 1;

  const toX = (i) => padding + (i * (width - padding * 2)) / Math.max(1, points.length - 1);
  const toY = (y) => height - padding - ((y - minY) * (height - padding * 2)) / span;

  const mainPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.balance).toFixed(1)}`)
    .join(" ");

  const hasBands = points.some((p) => p.lower != null);
  let bandPath = null;
  if (hasBands) {
    const upper = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.upper ?? p.balance).toFixed(1)}`).join(" ");
    const lower = [...points].reverse().map((p, i) => `${i === 0 ? "M" : "L"} ${toX(points.length - 1 - i).toFixed(1)} ${toY(p.lower ?? p.balance).toFixed(1)}`).join(" ");
    bandPath = `${upper} ${lower} Z`;
  }

  const zeroY = toY(0);
  const showZero = minY < 0 && maxY > 0;

  const labels = points.map((p) => p.date ? new Date(p.date).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" }) : "");

  return (
    <div className="w-full overflow-x-auto">
      <svg width={width} height={height} className="block">
        <rect x="0" y="0" width={width} height={height} fill="white" />
        {[0, 1, 2, 3, 4].map((i) => {
          const y = padding + (i * (height - padding * 2)) / 4;
          return <line key={i} x1={padding} y1={y} x2={width - padding} y2={y} stroke="#e2e8f0" strokeWidth="1" />;
        })}
        {showZero && (
          <line x1={padding} y1={zeroY} x2={width - padding} y2={zeroY} stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3" />
        )}
        {hasBands && (
          <path d={bandPath} fill="#6366f1" fillOpacity="0.1" stroke="none" />
        )}
        <path d={mainPath} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round" />
        <text x={padding} y={padding - 2} fontSize="10" fill="#94a3b8">{maxY.toFixed(0)}</text>
        <text x={padding} y={height - 2} fontSize="10" fill="#94a3b8">{minY.toFixed(0)}</text>
      </svg>
      <div className="flex justify-between text-xs text-slate-500 mt-1">
        <span>{labels[0]}</span>
        <span>{labels[Math.floor((labels.length - 1) / 2)]}</span>
        <span>{labels[labels.length - 1]}</span>
      </div>
    </div>
  );
}

function ForecastSection({ forecast, currency }) {
  if (!forecast) return <EmptyState text="Дані прогнозу ще не сформовано." />;

  if (forecast.method === "insufficient") {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        <div className="text-base font-semibold text-slate-900 mb-2">Прогноз недоступний</div>
        <p className="text-sm text-slate-600">
          Для побудови прогнозу потрібно більше транзакцій. Продовжуйте вести облік — прогноз з'явиться автоматично.
        </p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card
        title="Прогноз балансу"
        subtitle={`Очікувана динаміка на ${forecast.horizonDays || 0} днів вперед`}
      >
        <ForecastChart points={forecast.seriesBalance || []} />
        {forecast.averageDailyNet != null ? (
          <div className="text-sm text-slate-600 mt-3">
            Середній щоденний приріст балансу:{" "}
            <b className={forecast.averageDailyNet < 0 ? "text-red-600" : "text-emerald-700"}>
              {formatMoney(forecast.averageDailyNet, currency)}
            </b>
          </div>
        ) : null}
      </Card>

      <Card title="Ризики та підказки" subtitle="Сформовано на основі прогнозу">
        {(forecast.risks || []).length ? (
          <div className="grid gap-2">
            {forecast.risks.map((r, i) => (
              <div
                key={i}
                className="border border-slate-200 rounded-xl p-3 flex items-start justify-between gap-3"
              >
                <div>
                  {r.title ? (
                    <div className="text-sm font-semibold text-slate-900">{r.title}</div>
                  ) : null}
                  <div className="text-sm text-slate-800 mt-0.5">{r.message}</div>
                </div>
                <SeverityPill severity={r.level} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-500">Ризики відсутні.</div>
        )}
      </Card>
    </div>
  );
}

function probabilityComment(pct) {
  if (pct >= 80) return { text: "Дуже високий шанс досягти цілі — продовжуйте в тому ж темпі.", color: "text-emerald-700" };
  if (pct >= 60) return { text: "Хороший шанс. Підтримуйте поточний рівень заощаджень.", color: "text-emerald-600" };
  if (pct >= 40) return { text: "Помірний шанс. Варто трохи збільшити щомісячні відрахування.", color: "text-yellow-600" };
  if (pct >= 20) return { text: "Шанс невисокий. Розгляньте сценарії нижче.", color: "text-orange-600" };
  return { text: "Шанс дуже низький. Варто переглянути суму або термін цілі.", color: "text-red-600" };
}

function GoalCard({ analysis, currency }) {
  const { goal: g, status } = analysis;
  const progressPct = Math.round(((g.currentAmount || 0) / (g.targetAmount || 1)) * 100);

  if (status === "achieved") {
    return (
      <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4">
        <div className="font-semibold text-emerald-800 mb-1">Ціль досягнута: {g.name}</div>
        <div className="text-sm text-emerald-700">
          Накопичено {formatMoney(g.currentAmount, currency)} — ціль виконана. Вітаємо!
        </div>
      </div>
    );
  }

  if (status === "expired") {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-xl p-4">
        <div className="font-semibold text-amber-800 mb-1">Термін минув: {g.name}</div>
        <div className="text-sm text-amber-700">
          Накопичено {formatMoney(g.currentAmount, currency)} з {formatMoney(g.targetAmount, currency)}.
          Не вистачало {formatMoney(g.remainingAmount, currency)}.
          Рекомендуємо оновити ціль або встановити новий дедлайн.
        </div>
      </div>
    );
  }

  if (status === "insufficient_history") {
    return (
      <Card
        title={`Ціль: ${g.name}`}
        subtitle={`Накопичено ${formatMoney(g.currentAmount, currency)} з ${formatMoney(g.targetAmount, currency)} · Дедлайн: ${formatDate(g.deadline)}`}
        right={<span className="text-sm text-slate-500">Прогрес: {progressPct}%</span>}
      >
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
          <div className="font-semibold mb-1">Недостатньо даних для прогнозу</div>
          {analysis.lastMonthDeposit != null
            ? `Знайдено лише один місяць поповнень (${formatMoney(analysis.lastMonthDeposit, currency)}). Додайте транзакції за щонайменше 2 місяці — і симуляція запрацює.`
            : "До цієї цілі ще не було жодного поповнення. Почніть відкладати кошти — і система побудує прогноз на основі вашої реальної поведінки."}
        </div>
        <div className="mt-3 text-sm text-slate-600">
          Щомісяця потрібно відкладати: <b>{formatMoney(g.requiredMonthlySavings, currency)}</b>
          {g.monthsLeft != null && <span> · До дедлайну: <b>{g.monthsLeft} міс.</b></span>}
        </div>
      </Card>
    );
  }

  // status === "active"
  const td = analysis.timeDistribution || {};
  const comment = analysis.probabilityByDeadline != null
    ? probabilityComment(analysis.probabilityByDeadline)
    : null;

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Основна картка */}
      <Card
        title={`Ціль: ${g.name}`}
        subtitle={`Накопичено ${formatMoney(g.currentAmount, currency)} з ${formatMoney(g.targetAmount, currency)} · Дедлайн: ${formatDate(g.deadline)}`}
        right={<span className="text-sm text-slate-500">Прогрес: {progressPct}%</span>}
      >
        <Gauge value={analysis.probabilityByDeadline} />
        {comment && <div className={cn("mt-2 text-sm font-medium", comment.color)}>{comment.text}</div>}

        <div className="mt-3 grid gap-1 text-sm text-slate-600">
          {g.monthsLeft != null && <div>До дедлайну: <b>{g.monthsLeft} міс.</b></div>}
          {g.requiredMonthlySavings != null && (
            <div>Щомісяця потрібно: <b>{formatMoney(g.requiredMonthlySavings, currency)}</b></div>
          )}
          {analysis.forecastedMonthly != null && (
            <div>
              Прогноз ваших накопичень:{" "}
              <b className={analysis.forecastedMonthly >= g.requiredMonthlySavings ? "text-emerald-700" : "text-red-600"}>
                {formatMoney(analysis.forecastedMonthly, currency)} / міс.
              </b>
              {analysis.trend && <span className="text-xs text-slate-400 ml-1">({analysis.trend} тренд)</span>}
            </div>
          )}
        </div>

        {/* Коли буде досягнута ціль */}
        {(td.optimistic || td.likely || td.pessimistic) && (
          <div className="mt-4 border-t border-slate-100 pt-3 grid gap-1.5">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
              За скільки досягнеш цілі
            </div>
            {td.optimistic?.label && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">У кращому сценарії</span>
                <b className="text-emerald-700">{td.optimistic.label}</b>
              </div>
            )}
            {td.likely?.label && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Найімовірніше</span>
                <b className="text-slate-800">{td.likely.label}</b>
              </div>
            )}
            {td.pessimistic?.label && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">У гіршому сценарії</span>
                <b className={td.pessimistic.months > g.monthsLeft ? "text-red-600" : "text-slate-800"}>
                  {td.pessimistic.label}
                  {td.pessimistic.months > g.monthsLeft ? " (після дедлайну)" : ""}
                </b>
              </div>
            )}
            {!td.optimistic?.label && !td.likely?.label && !td.pessimistic?.label && (
              <div className="text-sm text-slate-500">За поточного темпу ціль важко досягти — спробуйте збільшити накопичення.</div>
            )}
          </div>
        )}
      </Card>

      {/* Сценарії */}
      {analysis.whatIf?.length ? (() => {
        const baseMonths = analysis.whatIf[0]?.medianMonths;
        return (
          <Card title="Що буде, якщо змінити темп заощаджень?">
            <div className="grid gap-2">
              {analysis.whatIf.map((w, i) => {
                const diff = baseMonths != null && w.medianMonths != null && i !== 0
                  ? w.medianMonths - baseMonths
                  : null;
                return (
                  <div key={i} className={cn(
                    "border rounded-xl p-3",
                    i === 0 ? "border-slate-300 bg-slate-50" : "border-slate-200"
                  )}>
                    <div className="text-sm font-semibold text-slate-800">{w.label}</div>
                    <div className="text-sm text-slate-600 mt-0.5">
                      Внесок: <b>{formatMoney(w.monthlyContribution, currency)} / міс.</b>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {w.medianLabel
                        ? `Найімовірніше досягнеш за ${w.medianLabel}`
                        : "За такого темпу ціль недосяжна у прийнятний строк"}
                      {diff != null && (
                        <span className={cn("ml-2 font-medium", diff < 0 ? "text-emerald-600" : "text-rose-600")}>
                          ({diff < 0 ? `на ${Math.abs(diff)} міс. швидше` : `на ${diff} міс. повільніше`})
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Прогноз базується на реальній історії ваших поповнень цієї цілі.
            </div>
          </Card>
        );
      })() : null}
    </div>
  );
}

function GoalsSection({ goals, currency }) {
  if (!Array.isArray(goals) || !goals.length) return <EmptyState text="Активних фінансових цілей поки немає." />;

  return (
    <div className="grid gap-6">
      {goals.map((analysis, i) => (
        <GoalCard key={analysis.goal?._id || i} analysis={analysis} currency={currency} />
      ))}
    </div>
  );
}

const MONETARY_STAT_KEYS = new Set(["totalAmount", "avgAmount"]);
const STAT_LABELS = {
  transactions: "Транзакцій",
  avgAmount: "Середня сума",
  totalAmount: "Загальна сума",
};

function PatternsSection({ data, currency }) {
  const clusters = data?.clusters || [];

  if (!clusters.length) return <EmptyState text="Патерни витрат ще не сформовано." />;

  return (
    <Card title="Типи поведінки витрат" subtitle="Автоматично виявлені групи витрат за вашою історією">
      <div className="grid md:grid-cols-2 gap-4">
        {clusters.map((cluster, index) => (
          <div key={index} className="border border-slate-200 rounded-xl p-4">
            <div className="text-base font-semibold">{cluster.label}</div>
            <div className="text-sm text-slate-600 mt-1">{cluster.description}</div>

            {cluster.stats ? (
              <div className="grid grid-cols-3 gap-2 mt-4">
                {Object.entries(cluster.stats).map(([key, value]) => (
                  <Metric
                    key={key}
                    label={STAT_LABELS[key] || key}
                    value={MONETARY_STAT_KEYS.has(key) ? formatMoney(value, currency) : String(value)}
                  />
                ))}
              </div>
            ) : null}

            {cluster.top?.length ? (
              <div className="text-sm text-slate-700 mt-4">
                <b>Топ категорій:</b> {cluster.top.join(", ")}
              </div>
            ) : null}

            {cluster.recommendation ? (
              <div className="mt-3 border-t border-slate-200 pt-3">
                <div className="text-sm font-semibold">Рекомендація</div>
                <div className="text-sm text-slate-600 mt-1">{cluster.recommendation}</div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ============ Main Page ============ */

export default function RecommendationsPage() {
  const [activeTab, setActiveTab] = useState("recs");
  const [overviewPeriod, setOverviewPeriod] = useState("30d");

  const [userCurrency, setUserCurrency] = useState("UAH");

  const [recommendations, setRecommendations] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [recalculateLoading, setRecalculateLoading] = useState(false);
  const [error, setError] = useState("");

  const getToken = () =>
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken");

  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();
      if (!token) throw new Error("Не знайдено токен авторизації.");

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const [recommendationsResponse, snapshotResponse, profileResponse] = await Promise.all([
        fetch(API_BASE_URL, { headers }),
        fetch(`${API_BASE_URL}/snapshot`, { headers }),
        fetch(USER_API_URL, { headers }),
      ]);

      const recommendationsJson = await recommendationsResponse.json();
      const snapshotJson = await snapshotResponse.json();

      if (!recommendationsResponse.ok) {
        throw new Error(recommendationsJson.message || "Не вдалося отримати рекомендації.");
      }

      if (profileResponse.ok) {
        const profileJson = await profileResponse.json();
        setUserCurrency(profileJson.currency || "UAH");
      }

      if (snapshotResponse.ok) {
        setSnapshot(snapshotJson);
      } else if (snapshotResponse.status === 404) {
        setSnapshot(null);
      } else {
        throw new Error(snapshotJson.message || "Не вдалося отримати snapshot.");
      }

      setRecommendations(
        Array.isArray(recommendationsJson.items) ? recommendationsJson.items : []
      );
    } catch (err) {
      setError(err.message || "Помилка при завантаженні даних.");
      setRecommendations([]);
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const updateRecommendationStatus = async (id, status) => {
    try {
      setActionLoadingId(id);
      setError("");

      const token = getToken();
      if (!token) throw new Error("Не знайдено токен авторизації.");

      const response = await fetch(`${API_BASE_URL}/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Не вдалося оновити статус.");

      await loadData();
    } catch (err) {
      setError(err.message || "Помилка при оновленні статусу.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const snoozeRecommendation = async (id) => {
    try {
      setActionLoadingId(id);
      setError("");

      const token = getToken();
      if (!token) throw new Error("Не знайдено токен авторизації.");

      const until = new Date();
      until.setDate(until.getDate() + 7);

      const response = await fetch(`${API_BASE_URL}/${id}/snooze`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ until: until.toISOString() }),
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Не вдалося відкласти рекомендацію.");

      await loadData();
    } catch (err) {
      setError(err.message || "Помилка при відкладенні рекомендації.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const recalculateRecommendations = async () => {
    try {
      setRecalculateLoading(true);
      setError("");

      const token = getToken();
      if (!token) throw new Error("Не знайдено токен авторизації.");

      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await response.json();
      if (!response.ok) throw new Error(json.message || "Не вдалося перерахувати рекомендації.");

      await loadData();
    } catch (err) {
      setError(err.message || "Помилка при перерахунку рекомендацій.");
    } finally {
      setRecalculateLoading(false);
    }
  };

  const groupedRecommendations = recommendations.reduce((acc, item) => {
    const key = item.groupKey || "other";
    if (!acc[key]) {
      acc[key] = { title: item.groupLabel || "Інше", items: [] };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const groupList = Object.values(groupedRecommendations);

  const overview = snapshot?.data?.overviewByPeriod?.[overviewPeriod] || null;
  const anomalies = snapshot?.data?.anomalies?.items || [];
  const forecast = snapshot?.data?.forecast || null;
  const goals = snapshot?.data?.goals || [];
  const patternsData = snapshot?.data?.patterns || null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold text-slate-900">Центр рекомендацій</div>
            <div className="text-sm text-slate-600">
              Згенеровано:{" "}
              {snapshot?.generatedAt ? formatDate(snapshot.generatedAt, true) : "—"}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GhostButton onClick={loadData} disabled={loading}>
              Оновити дані
            </GhostButton>
            <PrimaryButton onClick={recalculateRecommendations} disabled={recalculateLoading}>
              {recalculateLoading ? "Перерахунок..." : "Перерахувати"}
            </PrimaryButton>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 bg-white border border-slate-200 rounded-xl p-2 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              type="button"
              className={cn(
                "px-3 py-2 rounded-lg text-sm",
                activeTab === tab.key
                  ? "bg-slate-900 text-white"
                  : "hover:bg-slate-100 text-slate-800"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Error */}
        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {/* Loading */}
        {loading ? (
          <div className="mt-6 bg-white border border-slate-200 rounded-xl px-8 py-10 text-sm text-slate-500">
            Завантаження даних...
          </div>
        ) : null}

        {/* Content */}
        {!loading && (
          <div className="mt-6 grid gap-4">
            {activeTab === "recs" && (
              <RecommendationsSection
                groupList={groupList}
                onDismiss={(id) => updateRecommendationStatus(id, "dismissed")}
                onSnooze={snoozeRecommendation}
                onDone={(id) => updateRecommendationStatus(id, "done")}
                actionLoadingId={actionLoadingId}
              />
            )}
            {activeTab === "overview" && (
              <OverviewSection
                data={overview}
                period={overviewPeriod}
                onPeriodChange={setOverviewPeriod}
                currency={userCurrency}
              />
            )}
            {activeTab === "anomalies" && <AnomaliesSection anomalies={anomalies} currency={userCurrency} />}
            {activeTab === "forecast" && <ForecastSection forecast={forecast} currency={userCurrency} />}
            {activeTab === "goals" && <GoalsSection goals={goals} currency={userCurrency} />}
            {activeTab === "patterns" && <PatternsSection data={patternsData} currency={userCurrency} />}
          </div>
        )}
      </div>
    </div>
  );
}
