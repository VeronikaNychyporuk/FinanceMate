import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import TransactionDetailsModal from "../components/TransactionDetailsModal";

const API_BASE_URL = "http://localhost:5000/api/recommendations";
const USER_API_URL = "http://localhost:5000/api/user/profile";

const OVERVIEW_PERIODS = [
  { key: "7d", label: "7 днів" },
  { key: "30d", label: "30 днів" },
  { key: "90d", label: "90 днів" },
];

const SECTION_LABELS = {
  overview: "Фінансовий звіт",
  anomalies: "Аномалії",
  forecast: "Прогноз",
  goals: "Цілі",
  patterns: "Поведінка витрат",
};

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

function GhostButton({ children, onClick, disabled, className }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn("px-3 py-2 rounded-lg border border-slate-200 text-slate-900 text-sm hover:bg-slate-50 active:bg-slate-100 disabled:opacity-60", className)}
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

/* ============ Overview Section ============ */

function OverviewSection({ data, period, onPeriodChange, currency }) {
  if (!data) return <EmptyState text="Snapshot для огляду ще не сформовано." />;

  return (
    <>
      <div className="flex items-center justify-between gap-3">
        <div className="text-lg font-semibold text-slate-900">Фінансовий звіт</div>
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
                <div key={i} className="border border-slate-200 rounded-xl p-3">
                  <div className="text-sm text-slate-800">
                    {typeof h === "string" ? h : h.text}
                  </div>
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

/* ============ Anomalies Section ============ */

function AnomalyCard({ anomaly, currency, recId, actionLoading, onOpenTransaction, onDismiss }) {
  return (
    <div className="border border-slate-200 rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="text-sm font-semibold text-slate-900">{anomaly.category || "Без категорії"}</div>
            <SeverityPill severity={anomaly.severity} />
          </div>
          <div className="text-sm text-slate-600 mt-1">{formatDate(anomaly.date)}</div>
          {Array.isArray(anomaly.reasons) && anomaly.reasons.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {anomaly.reasons.map((reason, i) => (
                <span key={i} className="px-2 py-1 text-xs border rounded-full bg-slate-50 text-slate-700">
                  {reason}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 shrink-0 items-end">
          <div className="text-base font-bold text-slate-900">{formatMoney(anomaly.amount, currency)}</div>
          {anomaly.transactionId && (
            <GhostButton className="w-full" onClick={() => onOpenTransaction(anomaly.transactionId)}>
              Переглянути транзакцію
            </GhostButton>
          )}
          <GhostButton className="w-full" onClick={() => onDismiss(recId, anomaly.transactionId?.toString())} disabled={actionLoading}>
            Відхилити аномалію
          </GhostButton>
        </div>
      </div>
    </div>
  );
}

function AnomaliesSection({ anomalies, currency, recommendations, onOpenTransaction, onDismiss, actionLoadingId }) {
  if (!anomalies.length) return <EmptyState text="Аномалій не виявлено." />;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Підозрілі транзакції</div>
        <span className="text-sm text-slate-500">Відкриті: {anomalies.length}</span>
      </div>
      <div className="grid gap-3">
        {anomalies.map((anomaly, index) => {
          const rec = recommendations.find(
            (r) => r.relatedEntity?.entityId === anomaly.transactionId?.toString()
          );
          return (
            <AnomalyCard
              key={anomaly.transactionId || index}
              anomaly={anomaly}
              currency={currency}
              recId={rec?._id}
              actionLoading={actionLoadingId === rec?._id}
              onOpenTransaction={onOpenTransaction}
              onDismiss={onDismiss}
            />
          );
        })}
      </div>
    </div>
  );
}

/* ============ Forecast Section ============ */

function fmtAxisValue(val) {
  const abs = Math.abs(val);
  if (abs >= 10000) return `${(val / 1000).toFixed(0)}K`;
  if (abs >= 1000) return `${(val / 1000).toFixed(1)}K`;
  return val.toFixed(0);
}

function findZeroCrossing(points) {
  for (let i = 1; i < points.length; i++) {
    if (points[i - 1].balance >= 0 && points[i].balance < 0) {
      const t = points[i - 1].balance / (points[i - 1].balance - points[i].balance);
      const d1 = new Date(points[i - 1].date).getTime();
      const d2 = new Date(points[i].date).getTime();
      return { t, date: new Date(d1 + t * (d2 - d1)), idx: i };
    }
  }
  return null;
}

function ForecastChart({ points, currency = "UAH", width = 580, height = 240 }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const svgRef = useRef(null);

  if (!Array.isArray(points) || points.length === 0) {
    return <div className="text-sm text-slate-500 py-4">Недостатньо даних для графіка</div>;
  }

  const leftPad = 56;
  const rightPad = 14;
  const topPad = 18;
  const bottomPad = 28;

  const balances = points.map((p) => p.balance);
  const lowers = points.map((p) => p.lower ?? p.balance);
  const uppers = points.map((p) => p.upper ?? p.balance);
  const allValues = [...balances, ...lowers, ...uppers];
  let rawMin = Math.min(...allValues);
  let rawMax = Math.max(...allValues);
  const rawRange = rawMax - rawMin || 1;
  const minY = rawMin - rawRange * 0.05;
  const maxY = rawMax + rawRange * 0.05;
  const span = maxY - minY;

  const cL = leftPad;
  const cR = width - rightPad;
  const cT = topPad;
  const cB = height - bottomPad;
  const cW = cR - cL;
  const cH = cB - cT;

  const toX = (i) => cL + (i * cW) / Math.max(1, points.length - 1);
  const toY = (y) => cB - ((y - minY) * cH) / span;

  const gridTicks = Array.from({ length: 5 }, (_, i) => {
    const val = minY + (i * span) / 4;
    return { val, y: toY(val) };
  });

  const showZero = minY < 0 && maxY > 0;
  const zeroY = toY(0);

  const hasBands = points.some((p) => p.lower != null);
  let bandPath = null;
  if (hasBands) {
    const upper = points.map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.upper ?? p.balance).toFixed(1)}`).join(" ");
    const lower = [...points].reverse().map((p, i) => `${i === 0 ? "M" : "L"} ${toX(points.length - 1 - i).toFixed(1)} ${toY(p.lower ?? p.balance).toFixed(1)}`).join(" ");
    bandPath = `${upper} ${lower} Z`;
  }

  const mainPath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(p.balance).toFixed(1)}`)
    .join(" ");

  const crossing = findZeroCrossing(points);
  let crossX = null;
  let crossLabel = null;
  if (crossing) {
    const { t, date, idx } = crossing;
    crossX = toX(idx - 1) + t * (toX(idx) - toX(idx - 1));
    crossLabel = date.toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" });
  }

  const labels = points.map((p) =>
    p.date ? new Date(p.date).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit" }) : ""
  );
  const minIdx = balances.indexOf(Math.min(...balances));
  const lastBal = balances[balances.length - 1];

  const handleMouseMove = (e) => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const rect = svgEl.getBoundingClientRect();
    const svgX = (e.clientX - rect.left) * (width / rect.width);
    let closest = 0;
    let minDx = Infinity;
    points.forEach((_, i) => {
      const dx = Math.abs(toX(i) - svgX);
      if (dx < minDx) { minDx = dx; closest = i; }
    });
    setHoveredIdx(closest);
  };

  const tooltipEl = (() => {
    if (hoveredIdx === null) return null;
    const p = points[hoveredIdx];
    const px = toX(hoveredIdx);
    const py = toY(p.balance);
    const dateStr = p.date
      ? new Date(p.date).toLocaleDateString("uk-UA", { day: "2-digit", month: "2-digit", year: "numeric" })
      : "";
    const balStr = formatMoney(p.balance, currency);
    const hasInterval = p.lower != null && p.upper != null;
    const boxW = 154;
    const boxH = hasInterval ? 74 : 46;
    let boxX = px + 12;
    if (boxX + boxW > cR) boxX = px - boxW - 12;
    let boxY = py - boxH / 2;
    if (boxY < cT + 2) boxY = cT + 2;
    if (boxY + boxH > cB - 2) boxY = cB - boxH - 2;
    const dotColor = p.balance < 0 ? "#ef4444" : "#4f46e5";

    return (
      <g>
        <line x1={px} y1={cT} x2={px} y2={cB} stroke="#94a3b8" strokeWidth="1" strokeDasharray="3 3" />
        <circle cx={px} cy={py} r="5" fill={dotColor} stroke="white" strokeWidth="2" />
        <rect x={boxX} y={boxY} width={boxW} height={boxH} rx="6" fill="white" stroke="#e2e8f0" strokeWidth="1" />
        <text x={boxX + 10} y={boxY + 16} fontSize="11" fill="#64748b">{dateStr}</text>
        <text x={boxX + 10} y={boxY + 33} fontSize="13" fill={p.balance < 0 ? "#ef4444" : "#0f172a"} fontWeight="600">{balStr}</text>
        {hasInterval && (
          <>
            <text x={boxX + 10} y={boxY + 50} fontSize="10" fill="#94a3b8">Можливий діапазон:</text>
            <text x={boxX + 10} y={boxY + 62} fontSize="10" fill="#94a3b8">
              {`${formatMoney(p.lower, currency)} — ${formatMoney(p.upper, currency)}`}
            </text>
          </>
        )}
      </g>
    );
  })();

  return (
    <div className="w-full">
      <svg
        ref={svgRef}
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="block cursor-crosshair"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <clipPath id="fc-clip">
            <rect x={cL} y={cT} width={cW} height={cH} />
          </clipPath>
        </defs>

        {maxY > 0 && (
          <rect x={cL} y={cT} width={cW} height={showZero ? Math.max(0, zeroY - cT) : cH} fill="#f0fdf4" />
        )}
        {minY < 0 && (
          <rect x={cL} y={showZero ? zeroY : cT} width={cW} height={showZero ? Math.max(0, cB - zeroY) : cH} fill="#fef2f2" />
        )}

        {gridTicks.map(({ val, y }, i) => (
          <g key={i}>
            <line x1={cL} y1={y} x2={cR} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            <text x={cL - 6} y={y + 4} fontSize="11" fill="#94a3b8" textAnchor="end">
              {fmtAxisValue(val)}
            </text>
          </g>
        ))}

        {showZero && (
          <g>
            <line x1={cL} y1={zeroY} x2={cR} y2={zeroY} stroke="#ef4444" strokeWidth="1.5" strokeDasharray="4 3" />
            <text x={cL - 6} y={zeroY + 4} fontSize="11" fill="#ef4444" textAnchor="end" fontWeight="600">0</text>
          </g>
        )}

        {hasBands && bandPath && (
          <path d={bandPath} fill="#6366f1" fillOpacity="0.12" stroke="none" clipPath="url(#fc-clip)" />
        )}

        <path d={mainPath} fill="none" stroke="#4f46e5" strokeWidth="2.5" strokeLinejoin="round" clipPath="url(#fc-clip)" />

        {crossX != null && hoveredIdx === null && (
          <g>
            <line x1={crossX} y1={cT} x2={crossX} y2={cB} stroke="#ef4444" strokeWidth="1" strokeDasharray="3 3" strokeOpacity="0.7" />
            <rect x={crossX - 19} y={cT - 1} width="38" height="13" rx="3" fill="#fef2f2" stroke="#ef4444" strokeWidth="0.5" />
            <text x={crossX} y={cT + 9} fontSize="9" fill="#ef4444" textAnchor="middle" fontWeight="600">{crossLabel}</text>
          </g>
        )}

        {balances[minIdx] < 0 && hoveredIdx === null && (
          <circle cx={toX(minIdx)} cy={toY(balances[minIdx])} r="4.5" fill="#ef4444" stroke="white" strokeWidth="1.5" clipPath="url(#fc-clip)" />
        )}

        {hoveredIdx === null && (
          <circle cx={toX(0)} cy={toY(balances[0])} r="4" fill="#4f46e5" stroke="white" strokeWidth="1.5" />
        )}

        {hoveredIdx === null && (
          <circle
            cx={toX(points.length - 1)}
            cy={toY(lastBal)}
            r="4"
            fill={lastBal < 0 ? "#ef4444" : "#4f46e5"}
            stroke="white"
            strokeWidth="1.5"
          />
        )}

        {(() => {
          const midIdx = Math.floor((points.length - 1) / 2);
          const lastIdx = points.length - 1;
          return (
            <>
              <text x={toX(0)} y={height - 6} fontSize="11" fill="#94a3b8" textAnchor="start">{labels[0]}</text>
              {midIdx > 0 && midIdx < lastIdx && (
                <text x={toX(midIdx)} y={height - 6} fontSize="11" fill="#94a3b8" textAnchor="middle">{labels[midIdx]}</text>
              )}
              <text x={toX(lastIdx)} y={height - 6} fontSize="11" fill="#94a3b8" textAnchor="end">{labels[lastIdx]}</text>
            </>
          );
        })()}

        {tooltipEl}
      </svg>

      <div className="flex flex-wrap gap-4 mt-3 text-sm text-slate-500">
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-5 border-t-2 border-indigo-600" />
          Прогноз балансу
        </span>
        {hasBands && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-4 h-3 rounded bg-indigo-200 opacity-70" />
            Можливий діапазон балансу
          </span>
        )}
        {showZero && (
          <span className="flex items-center gap-1.5">
            <span className="inline-block w-5 border-t border-dashed border-red-500" />
            Нульовий баланс
          </span>
        )}
      </div>
    </div>
  );
}

function ForecastInsight({ forecast, currency }) {
  const series = forecast.seriesBalance || [];
  const scenarios = forecast.scenarios || null;
  const monthlyBlocks = forecast.monthlyForecastBlocks || [];
  const crossing = findZeroCrossing(series);

  const startBal = series[0]?.balance ?? 0;
  const rawMonthly = forecast.averageMonthlyNet ?? 0;
  const avgMonthly = Math.round(rawMonthly) === 0 ? 0 : rawMonthly;

  const isNegativeTrend = avgMonthly < 0;
  const isNeutralTrend = avgMonthly === 0;

  const statusColor = isNegativeTrend
    ? "border-rose-200 bg-rose-50"
    : isNeutralTrend
    ? "border-slate-200 bg-slate-50"
    : "border-emerald-200 bg-emerald-50";

  const statusDot = isNegativeTrend ? "bg-rose-500" : isNeutralTrend ? "bg-amber-400" : "bg-emerald-500";

  const statusText = isNegativeTrend
    ? crossing
      ? "Баланс може стати від'ємним"
      : "Баланс поступово знижується"
    : isNeutralTrend
    ? "Баланс майже не змінюється"
    : "Баланс зростає";

  return (
    <>
      <div className={cn("rounded-xl border p-5", statusColor)}>
        <div className="flex items-center gap-2 mb-4">
          <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", statusDot)} />
          <span className="text-sm font-semibold text-slate-800">{statusText}</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div>
            <div className="text-xs text-slate-500 mb-0.5">Зараз</div>
            <div className="text-2xl font-bold text-slate-900">{formatMoney(startBal, currency)}</div>
          </div>

          <div className="text-slate-300 text-2xl font-light select-none">→</div>

          <div>
            <div className="text-xs text-slate-500 mb-0.5">Через {forecast.horizonDays || 30} днів</div>
            {scenarios ? (
              <div className="text-2xl font-bold text-slate-900">
                ~{formatMoney(scenarios.likely, currency)}
              </div>
            ) : (
              <div className="text-2xl font-bold text-slate-400">—</div>
            )}
          </div>
        </div>

        <div className="mt-4 text-sm text-slate-700 leading-relaxed">
          {isNegativeTrend ? (
            crossing ? (
              <>За поточними витратами баланс може стати від'ємним{" "}
                <b>{crossing.date.toLocaleDateString("uk-UA", { day: "2-digit", month: "long" })}</b>.{" "}
                Варто переглянути регулярні витрати або збільшити надходження.</>
            ) : (
              <>Щомісяця витрати трохи перевищують доходи. Баланс поки позитивний,
                але продовжує знижуватись — варто переглянути регулярні витрати.</>
            )
          ) : isNeutralTrend ? (
            <>Доходи й витрати майже рівні — баланс стоїть на місці.
              Щоб відкладати на майбутнє, достатньо трохи скоротити витрати або збільшити дохід.</>
          ) : (
            <>Доходи перевищують витрати — баланс поступово зростає. Так тримати.</>
          )}
        </div>
      </div>

      {monthlyBlocks.length > 0 && (
        <div>
          <div className="text-sm font-semibold text-slate-800 mb-3">Що очікується найближчими місяцями</div>
          <div className="grid sm:grid-cols-3 gap-3">
            {monthlyBlocks.reduce((acc, block, i) => {
              const prevBal = i === 0 ? startBal : acc[i - 1].projectedBal;
              const projectedBal = prevBal + block.flow;
              acc.push({ ...block, projectedBal });
              return acc;
            }, []).map((block, i) => {
              const isPositive = block.flow > 0;
              const isNeutral = block.flow === 0;
              const borderColor = isNeutral ? "border-slate-200" : isPositive ? "border-emerald-200" : "border-rose-200";
              const bgColor = isNeutral ? "bg-white" : isPositive ? "bg-emerald-50" : "bg-rose-50";
              const changeColor = isNeutral ? "text-slate-400" : isPositive ? "text-emerald-600" : "text-rose-500";
              const changeText = isNeutral
                ? "без змін"
                : isPositive
                ? `+${formatMoney(block.flow, currency)} за місяць`
                : `${formatMoney(block.flow, currency)} за місяць`;

              return (
                <div key={i} className={cn("rounded-xl border p-4 flex flex-col gap-1", borderColor, bgColor)}>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    {block.label.replace(/\s*р\./i, "").trim()}
                    {block.isPartial && (
                      <span className="ml-1 normal-case font-normal">· залишок {block.remainingDays} дн.</span>
                    )}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Очікуваний баланс на кінець місяця</div>
                  <div className="text-2xl font-bold text-slate-900">
                    ~{formatMoney(block.projectedBal, currency)}
                  </div>
                  <div className={cn("text-xs mt-0.5", changeColor)}>{changeText}</div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-slate-400">
            Прогноз базується на вашій фінансовій історії та може не враховувати непередбачені витрати.
          </div>
        </div>
      )}
    </>
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
    <div className="grid gap-4">
      <ForecastInsight forecast={forecast} currency={currency} />

      {(forecast.risks || []).length ? (
        <div>
          <div className="text-sm font-semibold text-slate-800 mb-1">Ризики та підказки</div>
          <div className="text-xs text-slate-400 mb-3">Сформовано на основі прогнозу</div>
          <div className="grid gap-2">
            {forecast.risks.map((r, i) => (
              <div key={i} className="border border-slate-200 rounded-xl p-3">
                {r.title && <div className="text-sm font-semibold text-slate-900">{r.title}</div>}
                <div className="text-sm text-slate-600 mt-0.5">{r.message}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {forecast.seriesBalance?.length > 0 && (
        <Card title="Прогноз балансу" subtitle="Динаміка на найближчі дні">
          <ForecastChart points={forecast.seriesBalance} currency={currency} />
        </Card>
      )}
    </div>
  );
}

/* ============ Goals Section ============ */

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

  const td = analysis.timeDistribution || {};
  const comment = analysis.probabilityByDeadline != null
    ? probabilityComment(analysis.probabilityByDeadline)
    : null;
  const probPct = analysis.probabilityByDeadline ?? null;
  const probColor = probPct == null ? "text-slate-500"
    : probPct >= 60 ? "text-emerald-600"
    : probPct >= 30 ? "text-amber-500"
    : "text-red-500";

  return (
    <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-5 pt-5 pb-4 border-b border-slate-100">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div className="text-base font-semibold text-slate-900">Ціль: {g.name}</div>
          {probPct != null && (
            <div className="shrink-0 flex items-baseline gap-2">
              <span className="text-sm text-slate-500">Ймовірність:</span>
              <span className={cn("text-2xl font-bold leading-none", probColor)}>
                {probPct.toFixed(0)}%
              </span>
            </div>
          )}
        </div>
        <div className="mt-1 text-sm text-slate-500">
          Накопичено {formatMoney(g.currentAmount, currency)} з {formatMoney(g.targetAmount, currency)}
          <span className="mx-3 text-slate-300">·</span>
          Дедлайн: {formatDate(g.deadline)}
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>Прогрес</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-slate-800 rounded-full" style={{ width: `${Math.min(100, progressPct)}%` }} />
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row items-start">
        <div className="p-5 md:w-1/2 md:border-r border-slate-100">
          {comment && <div className={cn("mb-3 text-sm font-medium", comment.color)}>{comment.text}</div>}
          <div className="grid gap-1.5 text-sm text-slate-600">
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

          {(td.optimistic || td.likely || td.pessimistic) && (() => {
            const isAfterDeadline = (m) => m != null && g.monthsLeft != null && m > g.monthsLeft;
            const allAfter = isAfterDeadline(td.optimistic?.months) &&
                             isAfterDeadline(td.likely?.months) &&
                             isAfterDeadline(td.pessimistic?.months);
            const rowColor = (m) =>
              !isAfterDeadline(m) ? "text-emerald-700" : "text-rose-600";

            return (
              <div className="mt-4 border-t border-slate-100 pt-3 grid gap-1.5">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                  За скільки досягнеш цілі
                </div>
                {allAfter && g.monthsLeft != null && (
                  <div className="text-s text-rose-600 mb-1">
                    Усі сценарії виходять за межі дедлайну ({g.monthsLeft} міс.). Розгляньте збільшення внесків або перенесення дедлайну.
                  </div>
                )}
                {td.optimistic?.label && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">У кращому сценарії</span>
                    <b className={rowColor(td.optimistic.months)}>{td.optimistic.label}</b>
                  </div>
                )}
                {td.likely?.label && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Найімовірніше</span>
                    <b className={rowColor(td.likely.months)}>{td.likely.label}</b>
                  </div>
                )}
                {td.pessimistic?.label && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">У гіршому сценарії</span>
                    <b className={rowColor(td.pessimistic.months)}>{td.pessimistic.label}</b>
                  </div>
                )}
                {!td.optimistic?.label && !td.likely?.label && !td.pessimistic?.label && (
                  <div className="text-sm text-slate-500">За поточного темпу ціль важко досягти — спробуйте збільшити накопичення.</div>
                )}
              </div>
            );
          })()}
        </div>

        <div className="p-5 md:w-1/2">
          {analysis.whatIf?.length ? (() => {
            const baseMonths = analysis.whatIf[0]?.medianMonths;
            return (
              <>
                <div className="text-sm font-semibold text-slate-800 mb-3">Що буде, якщо змінити темп заощаджень?</div>
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
              </>
            );
          })() : null}
        </div>
      </div>
    </div>
  );
}

function GoalsSection({ goals, currency, scrollTargetGoalId, onScrollDone }) {
  useEffect(() => {
    if (!scrollTargetGoalId) return;
    const timer = setTimeout(() => {
      const el = document.getElementById(`goal-${scrollTargetGoalId}`);
      if (el) {
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: Math.max(0, top), behavior: "instant" });
      }
      onScrollDone?.();
    }, 50);
    return () => clearTimeout(timer);
  }, [scrollTargetGoalId]);

  if (!Array.isArray(goals) || !goals.length) return <EmptyState text="Активних фінансових цілей поки немає." />;

  return (
    <div className="grid gap-6">
      {goals.map((analysis, i) => (
        <div key={analysis.goal?._id || i} id={`goal-${analysis.goal?._id}`}>
          <GoalCard analysis={analysis} currency={currency} />
        </div>
      ))}
    </div>
  );
}

/* ============ Patterns Section ============ */

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
    <div className="grid gap-4">
      <div>
        <div className="text-lg font-semibold text-slate-900">Типи поведінки витрат</div>
        <div className="text-sm text-slate-500 mt-0.5">Автоматично виявлені групи витрат за вашою історією</div>
      </div>
      {clusters.map((cluster, index) => (
        <div key={index} className="border border-slate-200 rounded-xl bg-white p-4">
          <div className="flex items-start gap-6 flex-wrap">
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">{cluster.label}</div>
              <div className="text-sm text-slate-600 mt-1">{cluster.description}</div>
              {cluster.top?.length ? (
                <div className="mt-3">
                  <span className="text-xs text-slate-500 mr-2">Топ категорій:</span>
                  <span className="inline-flex flex-wrap gap-1.5">
                    {cluster.top.map((cat, i) => (
                      <span key={i} className="px-2 py-1 text-xs border border-slate-200 rounded-full bg-slate-50 text-slate-700">
                        {cat}
                      </span>
                    ))}
                  </span>
                </div>
              ) : null}
            </div>
            {cluster.stats ? (
              <div className="flex gap-2 shrink-0">
                {Object.entries(cluster.stats).map(([key, value]) => (
                  <Metric
                    key={key}
                    label={STAT_LABELS[key] || key}
                    value={MONETARY_STAT_KEYS.has(key) ? formatMoney(value, currency) : String(value)}
                  />
                ))}
              </div>
            ) : null}
          </div>
          {cluster.recommendation ? (
            <div className="mt-3 border-t border-slate-200 pt-3">
              <div className="text-sm font-semibold">Рекомендація</div>
              <div className="text-sm text-slate-600 mt-1">{cluster.recommendation}</div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/* ============ Main Page ============ */

export default function AnalyticsPage() {
  const { section } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [overviewPeriod, setOverviewPeriod] = useState("30d");
  const [userCurrency, setUserCurrency] = useState("UAH");
  const [snapshot, setSnapshot] = useState(null);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [dismissedAnomalyTxIds, setDismissedAnomalyTxIds] = useState(new Set());
  const [scrollTargetGoalId, setScrollTargetGoalId] = useState(
    searchParams.get("goalId") || null
  );

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
        fetch(API_BASE_URL, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/snapshot`, { headers, cache: "no-store" }),
        fetch(USER_API_URL, { headers, cache: "no-store" }),
      ]);

      const recommendationsJson = await recommendationsResponse.json();
      const snapshotJson = await snapshotResponse.json();

      if (!recommendationsResponse.ok) {
        throw new Error(recommendationsJson.message || "Не вдалося отримати дані.");
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
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const source = new EventSource(
      `http://localhost:5000/api/recommendations/stream?token=${token}`
    );

    source.addEventListener("recommendation:updated", () => {
      loadData();
    });

    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        source.close();
      }
    };

    return () => {
      source.close();
    };
  }, []);

  const updateRecommendationStatus = async (id, status) => {
    try {
      setActionLoadingId(id);
      const token = getToken();
      if (!token) return;

      const response = await fetch(`${API_BASE_URL}/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      if (response.ok) await loadData();
    } catch {
      setError("Помилка при оновленні статусу.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const openTransaction = async (id) => {
    try {
      const token = getToken();
      const res = await fetch(`http://localhost:5000/api/transactions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setSelectedTransaction(data);
    } catch {
      setError("Не вдалося завантажити транзакцію.");
    }
  };

  const anomalies = (snapshot?.data?.anomalies?.items || [])
    .filter((a) => !dismissedAnomalyTxIds.has(a.transactionId?.toString()));
  const overview = snapshot?.data?.overviewByPeriod?.[overviewPeriod] || null;
  const forecast = snapshot?.data?.forecast || null;
  const goals = snapshot?.data?.goals || [];
  const patternsData = snapshot?.data?.patterns || null;

  const sectionLabel = SECTION_LABELS[section] || "Аналітика";
  const generatedAt = snapshot?.generatedAt;

  return (
    <div className="min-h-screen bg-white">
      <TransactionDetailsModal
        open={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onEdit={() => {
          navigate(`/transactions/edit/${selectedTransaction._id}`, { state: { from: `/analytics/${section}` } });
          setSelectedTransaction(null);
        }}
        onConfirmDelete={async () => {
          try {
            const token = getToken();
            await fetch(`http://localhost:5000/api/transactions/${selectedTransaction._id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${token}` },
            });
            setSelectedTransaction(null);
          } catch {
            setError("Не вдалося видалити транзакцію.");
          }
        }}
      />

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex flex-col gap-1 mb-6">
          <div className="text-2xl font-bold text-slate-900">{sectionLabel}</div>
          {generatedAt && (
            <div className="text-sm text-slate-500">
              Оновлено: {formatDate(generatedAt, true)}
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        )}

        {loading && (
          <div className="bg-white border border-slate-200 rounded-xl px-8 py-10 text-sm text-slate-500">
            Завантаження даних...
          </div>
        )}

        {!loading && (
          <div className="grid gap-4">
            {section === "overview" && (
              <OverviewSection
                data={overview}
                period={overviewPeriod}
                onPeriodChange={setOverviewPeriod}
                currency={userCurrency}
              />
            )}
            {section === "anomalies" && (
              <AnomaliesSection
                anomalies={anomalies}
                currency={userCurrency}
                recommendations={recommendations}
                onOpenTransaction={openTransaction}
                onDismiss={(id, txId) => {
                  if (txId) setDismissedAnomalyTxIds((prev) => new Set([...prev, txId]));
                  if (id) updateRecommendationStatus(id, "dismissed");
                }}
                actionLoadingId={actionLoadingId}
              />
            )}
            {section === "forecast" && (
              <ForecastSection forecast={forecast} currency={userCurrency} />
            )}
            {section === "goals" && (
              <GoalsSection
                goals={goals}
                currency={userCurrency}
                scrollTargetGoalId={scrollTargetGoalId}
                onScrollDone={() => setScrollTargetGoalId(null)}
              />
            )}
            {section === "patterns" && (
              <PatternsSection data={patternsData} currency={userCurrency} />
            )}
            {!SECTION_LABELS[section] && (
              <div className="bg-white border border-slate-200 rounded-xl px-8 py-10 text-sm text-slate-500">
                Розділ не знайдено.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
