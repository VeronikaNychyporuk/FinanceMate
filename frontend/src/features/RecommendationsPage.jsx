import React, { useEffect, useState } from "react";

const API_BASE_URL = "http://localhost:5000/api/recommendations";

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
  const numericAmount = Number(amount || 0);

  try {
    return new Intl.NumberFormat("uk-UA", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(numericAmount);
  } catch (error) {
    return `${numericAmount} ${currency}`;
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
    case "overview":
      return "Огляд";
    case "anomalies":
      return "Аномалії";
    case "forecast":
      return "Прогноз";
    case "goals":
      return "Цілі";
    case "patterns":
      return "Поведінка";
    default:
      return value || "—";
  }
}

function EmptyState({ text }) {
  return (
    <div className="rounded-[24px] border border-[#d7dde7] bg-white px-8 py-10 text-[16px] text-[#64748b]">
      {text}
    </div>
  );
}

function Pill({ children, tone = "neutral" }) {
  const toneClasses = {
    neutral: "border-[#d7dde7] bg-[#f8fafc] text-[#475569]",
    severityHigh: "border-[#f3c9d0] bg-[#fdecef] text-[#c24155]",
    severityMedium: "border-[#f0dfab] bg-[#fff6dc] text-[#b7791f]",
    severityLow: "border-[#cfe5d5] bg-[#edf8f0] text-[#2f855a]",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-[6px] text-[14px] leading-none",
        toneClasses[tone] || toneClasses.neutral
      )}
    >
      {children}
    </span>
  );
}

function StatCard({ title, value, subtitle }) {
  return (
    <div className="rounded-[22px] border border-[#d7dde7] bg-white p-6">
      <div className="text-[14px] text-[#64748b]">{title}</div>
      <div className="mt-2 text-[28px] font-semibold leading-none text-[#0f172a]">
        {value}
      </div>
      {subtitle ? (
        <div className="mt-2 text-[13px] text-[#94a3b8]">{subtitle}</div>
      ) : null}
    </div>
  );
}

function Gauge({ value }) {
  const safeValue = Math.max(0, Math.min(100, Number(value || 0)));

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-[14px]">
        <span className="text-[#64748b]">Ймовірність</span>
        <span className="font-medium text-[#0f172a]">{safeValue}%</span>
      </div>
      <div className="h-[10px] w-full rounded-full bg-[#e8edf5]">
        <div
          className="h-full rounded-full bg-[#08152f]"
          style={{ width: `${safeValue}%` }}
        />
      </div>
    </div>
  );
}

function MiniSparkline({ points }) {
  if (!Array.isArray(points) || points.length === 0) {
    return (
      <div className="rounded-[22px] border border-[#d7dde7] bg-white p-6 text-[14px] text-[#94a3b8]">
        Недостатньо даних для графіка
      </div>
    );
  }

  const values = points.map((point) => Number(point.balance || 0));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 900;
  const height = 220;

  const normalizeX = (index) =>
    points.length === 1 ? 0 : (index / (points.length - 1)) * width;

  const normalizeY = (value) => {
    if (max === min) return height / 2;
    return height - ((value - min) / (max - min)) * height;
  };

  const path = points
    .map((point, index) => {
      const x = normalizeX(index);
      const y = normalizeY(Number(point.balance || 0));
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="rounded-[22px] border border-[#d7dde7] bg-white p-5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-[220px] w-full"
        preserveAspectRatio="none"
      >
        <path
          d={path}
          fill="none"
          stroke="#08152f"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

function RecommendationCard({
  recommendation,
  onDismiss,
  onSnooze,
  onDone,
  actionLoading,
}) {
  const severityTone =
    recommendation.priority === "high" || recommendation.priority === "critical"
      ? "severityHigh"
      : recommendation.priority === "medium"
      ? "severityMedium"
      : "severityLow";

  const primaryLabel =
    recommendation.primaryAction?.label || "Переглянути";
  const secondaryLabel =
    recommendation.secondaryAction?.label || "Докази";

  return (
    <div className="rounded-[22px] border border-[#d7dde7] bg-white px-7 py-7">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Pill tone="neutral">{getModuleLabel(recommendation.module)}</Pill>
            <Pill tone={severityTone}>
              {getSeverityLabel(recommendation.priority)}
            </Pill>
          </div>

          <h3 className="mb-3 text-[18px] font-semibold leading-[1.35] text-[#0f172a]">
            {recommendation.title}
          </h3>

          <p className="mb-4 max-w-[860px] text-[16px] leading-[1.6] text-[#475569]">
            {recommendation.message}
          </p>

          {Array.isArray(recommendation.facts) && recommendation.facts.length > 0 ? (
            <div className="mb-6 flex flex-wrap gap-2">
              {recommendation.facts.map((fact, index) => (
                <Pill key={`${recommendation._id}-fact-${index}`}>{fact}</Pill>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onDismiss(recommendation._id)}
              disabled={actionLoading}
              className="rounded-[14px] border border-[#d7dde7] bg-white px-6 py-3 text-[15px] font-medium text-[#0f172a] transition hover:bg-[#f8fafc] disabled:opacity-60"
            >
              Відхилити
            </button>

            <button
              type="button"
              onClick={() => onSnooze(recommendation._id)}
              disabled={actionLoading}
              className="rounded-[14px] border border-[#d7dde7] bg-white px-6 py-3 text-[15px] font-medium text-[#0f172a] transition hover:bg-[#f8fafc] disabled:opacity-60"
            >
              Відкласти
            </button>

            <button
              type="button"
              onClick={() => onDone(recommendation._id)}
              disabled={actionLoading}
              className="rounded-[14px] border border-[#d7dde7] bg-white px-6 py-3 text-[15px] font-medium text-[#0f172a] transition hover:bg-[#f8fafc] disabled:opacity-60"
            >
              Виконано
            </button>
          </div>
        </div>

        <div className="flex w-[190px] shrink-0 flex-col gap-3">
          <button
            type="button"
            className="rounded-[14px] bg-[#08152f] px-6 py-3 text-[15px] font-medium text-white"
          >
            {primaryLabel}
          </button>

          <button
            type="button"
            className="rounded-[14px] border border-[#d7dde7] bg-white px-6 py-3 text-[15px] font-medium text-[#0f172a]"
          >
            {secondaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function RecommendationGroup({
  title,
  items,
  onDismiss,
  onSnooze,
  onDone,
  actionLoadingId,
}) {
  return (
    <div className="rounded-[26px] border border-[#d7dde7] bg-white p-7">
      <h3 className="mb-6 text-[18px] font-semibold text-[#0f172a]">{title}</h3>

      <div className="space-y-5">
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

export default function RecommendationsPage() {
  const [activeTab, setActiveTab] = useState("recs");
  const [overviewPeriod, setOverviewPeriod] = useState("30d");

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

      if (!token) {
        throw new Error("Не знайдено токен авторизації.");
      }

      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      };

      const [recommendationsResponse, snapshotResponse] = await Promise.all([
        fetch(API_BASE_URL, { headers }),
        fetch(`${API_BASE_URL}/snapshot`, { headers }),
      ]);

      const recommendationsJson = await recommendationsResponse.json();
      const snapshotJson = await snapshotResponse.json();

      if (!recommendationsResponse.ok) {
        throw new Error(
          recommendationsJson.message || "Не вдалося отримати рекомендації."
        );
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

      if (!response.ok) {
        throw new Error(json.message || "Не вдалося оновити статус.");
      }

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

      if (!response.ok) {
        throw new Error(json.message || "Не вдалося відкласти рекомендацію.");
      }

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

      if (!response.ok) {
        throw new Error(json.message || "Не вдалося перерахувати рекомендації.");
      }

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
      acc[key] = {
        title: item.groupLabel || "Інше",
        items: [],
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const groupList = Object.values(groupedRecommendations);

  const overview = snapshot?.data?.overviewByPeriod?.[overviewPeriod] || null;
  const anomalies = snapshot?.data?.anomalies?.items || [];
  const forecast = snapshot?.data?.forecast || null;
  const goals = snapshot?.data?.goals || null;
  const patterns = snapshot?.data?.patterns?.clusters || [];

  return (
    <div className="min-h-screen px-8 py-8">
      <div className="mx-auto max-w-[1300px]">
        <div className="mb-8 flex items-start justify-between gap-6">
          <div>
            <h1 className="text-[28px] font-semibold leading-none text-[#0f172a]">
              Центр рекомендацій
            </h1>
            <div className="mt-3 text-[16px] text-[#475569]">
              Згенеровано: {snapshot?.generatedAt ? formatDate(snapshot.generatedAt, true) : "—"}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={recalculateRecommendations}
              disabled={recalculateLoading}
              className="rounded-[14px] bg-[#08152f] px-6 py-3 text-[15px] font-medium text-white disabled:opacity-60"
            >
              {recalculateLoading ? "Перерахунок..." : "Перерахувати"}
            </button>
          </div>
        </div>

        <div className="mb-8 rounded-[22px] border border-[#d7dde7] bg-white px-3 py-3 inline-flex items-center text-xs border bg-slate-50 text-slate-700 min-w-[1100px]">
          <div className="flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "rounded-[14px] px-4 py-3 text-[14px] font-medium transition",
                  activeTab === tab.key
                    ? "bg-[#08152f] text-white"
                    : "text-[#0f172a] hover:bg-[#f8fafc]"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mb-6 rounded-[20px] border border-[#f3c9d0] bg-[#fdecef] px-5 py-4 text-[15px] text-[#c24155]">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-[24px] border border-[#d7dde7] bg-white px-8 py-10 text-[16px] text-[#64748b]">
            Завантаження даних...
          </div>
        ) : null}

        {!loading && activeTab === "recs" && (
          <div className="rounded-[26px] border border-[#d7dde7] bg-white p-7">
            <div className="mb-8 flex items-start justify-between gap-6">
              <div>
                <h2 className="text-[18px] font-semibold text-[#0f172a]">
                  Усі рекомендації
                </h2>
              </div>

              <div className="text-[16px] text-[#64748b]">
                Груп: {groupList.length}
              </div>
            </div>

            {groupList.length > 0 ? (
              <div className="space-y-8">
                {groupList.map((group, index) => (
                  <RecommendationGroup
                    key={`${group.title}-${index}`}
                    title={group.title}
                    items={group.items}
                    onDismiss={(id) => updateRecommendationStatus(id, "dismissed")}
                    onSnooze={snoozeRecommendation}
                    onDone={(id) => updateRecommendationStatus(id, "done")}
                    actionLoadingId={actionLoadingId}
                  />
                ))}
              </div>
            ) : (
              <EmptyState text="Активні рекомендації відсутні." />
            )}
          </div>
        )}

        {!loading && activeTab === "overview" && (
          <div className="space-y-6">
            <div className="flex flex-wrap gap-3">
              {OVERVIEW_PERIODS.map((period) => (
                <button
                  key={period.key}
                  type="button"
                  onClick={() => setOverviewPeriod(period.key)}
                  className={cn(
                    "rounded-[14px] border px-5 py-3 text-[15px] font-medium transition",
                    overviewPeriod === period.key
                      ? "border-[#08152f] bg-[#08152f] text-white"
                      : "border-[#d7dde7] bg-white text-[#0f172a]"
                  )}
                >
                  {period.label}
                </button>
              ))}
            </div>

            {overview ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <StatCard title="Доходи" value={formatMoney(overview.income)} />
                  <StatCard title="Витрати" value={formatMoney(overview.expense)} />
                  <StatCard title="Баланс" value={formatMoney(overview.net)} />
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-[22px] border border-[#d7dde7] bg-white p-6">
                    <h3 className="mb-4 text-[18px] font-semibold text-[#0f172a]">
                      Основні драйвери витрат
                    </h3>

                    {overview.topDrivers?.length ? (
                      <div className="space-y-3">
                        {overview.topDrivers.map((driver, index) => (
                          <div
                            key={`${driver.category}-${index}`}
                            className="flex items-center justify-between rounded-[16px] bg-[#f8fafc] px-4 py-4"
                          >
                            <div>
                              <div className="font-medium text-[#0f172a]">
                                {driver.category}
                              </div>
                              <div className="mt-1 text-[14px] text-[#64748b]">
                                Частка: {driver.share}%
                              </div>
                            </div>
                            <div className="font-medium text-[#0f172a]">
                              {formatMoney(driver.amount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[15px] text-[#64748b]">Немає даних.</div>
                    )}
                  </div>

                  <div className="rounded-[22px] border border-[#d7dde7] bg-white p-6">
                    <h3 className="mb-4 text-[18px] font-semibold text-[#0f172a]">
                      Highlights
                    </h3>

                    {overview.highlights?.length ? (
                      <div className="space-y-3">
                        {overview.highlights.map((item, index) => (
                          <div
                            key={index}
                            className="rounded-[16px] bg-[#f8fafc] px-4 py-4 text-[15px] text-[#475569]"
                          >
                            {item}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[15px] text-[#64748b]">Немає даних.</div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <EmptyState text="Snapshot для огляду ще не сформовано." />
            )}
          </div>
        )}

        {!loading && activeTab === "anomalies" && (
          <>
            {anomalies.length > 0 ? (
              <div className="space-y-4">
                {anomalies.map((anomaly, index) => (
                  <div
                    key={anomaly.transactionId || index}
                    className="rounded-[22px] border border-[#d7dde7] bg-white p-6"
                  >
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div>
                        <div className="mb-3 flex flex-wrap gap-2">
                          <Pill tone="neutral">Аномалії</Pill>
                          <Pill
                            tone={
                              anomaly.severity === "high"
                                ? "severityHigh"
                                : "severityMedium"
                            }
                          >
                            {getSeverityLabel(anomaly.severity)}
                          </Pill>
                        </div>

                        <h3 className="text-[18px] font-semibold text-[#0f172a]">
                          {anomaly.category || "Аномальна транзакція"}
                        </h3>
                      </div>

                      <div className="text-[14px] text-[#94a3b8]">
                        {formatDate(anomaly.date)}
                      </div>
                    </div>

                    <div className="mb-3 text-[18px] font-medium text-[#0f172a]">
                      {formatMoney(anomaly.amount)}
                    </div>

                    <div className="mb-4 text-[15px] text-[#64748b]">
                      {anomaly.merchant || "Без назви"}
                    </div>

                    {anomaly.reasons?.length ? (
                      <div className="space-y-2">
                        {anomaly.reasons.map((reason, reasonIndex) => (
                          <div
                            key={reasonIndex}
                            className="rounded-[14px] bg-[#f8fafc] px-4 py-3 text-[15px] text-[#475569]"
                          >
                            {reason}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Аномалій не виявлено." />
            )}
          </>
        )}

        {!loading && activeTab === "forecast" && (
          <>
            {forecast ? (
              <div className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <StatCard
                    title="Середній денний cash flow"
                    value={formatMoney(forecast.averageDailyNet)}
                  />
                  <StatCard
                    title="Горизонт прогнозу"
                    value={`${forecast.horizonDays || 0} днів`}
                  />
                </div>

                <MiniSparkline points={forecast.seriesBalance || []} />

                <div className="space-y-4">
                  {(forecast.risks || []).map((risk, index) => (
                    <div
                      key={index}
                      className="rounded-[22px] border border-[#d7dde7] bg-white p-6"
                    >
                      <div className="mb-3">
                        <Pill
                          tone={
                            risk.level === "high"
                              ? "severityHigh"
                              : risk.level === "medium"
                              ? "severityMedium"
                              : "severityLow"
                          }
                        >
                          {getSeverityLabel(risk.level)}
                        </Pill>
                      </div>

                      <h3 className="mb-2 text-[18px] font-semibold text-[#0f172a]">
                        {risk.title}
                      </h3>

                      <p className="text-[15px] leading-[1.6] text-[#475569]">
                        {risk.message}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState text="Дані прогнозу ще не сформовано." />
            )}
          </>
        )}

        {!loading && activeTab === "goals" && (
          <>
            {goals && goals.goal ? (
              <div className="space-y-6">
                <div className="rounded-[22px] border border-[#d7dde7] bg-white p-6">
                  <div className="mb-5 flex items-start justify-between gap-6">
                    <div>
                      <h2 className="text-[22px] font-semibold text-[#0f172a]">
                        {goals.goal.name}
                      </h2>
                      <div className="mt-2 text-[15px] text-[#64748b]">
                        Дедлайн: {formatDate(goals.goal.deadline)}
                      </div>
                    </div>

                    <div className="w-[280px] max-w-full">
                      <Gauge value={goals.probability} />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <StatCard
                      title="Цільова сума"
                      value={formatMoney(goals.goal.targetAmount)}
                    />
                    <StatCard
                      title="Поточна сума"
                      value={formatMoney(goals.goal.currentAmount)}
                    />
                    <StatCard
                      title="Потрібно щомісяця"
                      value={formatMoney(goals.goal.requiredMonthlySavings)}
                    />
                  </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="rounded-[22px] border border-[#d7dde7] bg-white p-6">
                    <h3 className="mb-4 text-[18px] font-semibold text-[#0f172a]">
                      What-if сценарії
                    </h3>

                    {goals.whatIf?.length ? (
                      <div className="space-y-3">
                        {goals.whatIf.map((scenario, index) => (
                          <div
                            key={index}
                            className="rounded-[16px] bg-[#f8fafc] px-4 py-4"
                          >
                            <div className="font-medium text-[#0f172a]">
                              {scenario.scenario}
                            </div>
                            <div className="mt-1 text-[14px] text-[#64748b]">
                              Щомісячні заощадження:{" "}
                              {formatMoney(scenario.monthlySavings)}
                            </div>
                            <div className="mt-1 text-[14px] text-[#64748b]">
                              Ймовірність: {scenario.probability}%
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[15px] text-[#64748b]">Сценарії відсутні.</div>
                    )}
                  </div>

                  <div className="rounded-[22px] border border-[#d7dde7] bg-white p-6">
                    <h3 className="mb-4 text-[18px] font-semibold text-[#0f172a]">
                      Розподіл результатів
                    </h3>

                    {goals.distribution?.length ? (
                      <div className="space-y-3">
                        {goals.distribution.map((point, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded-[16px] bg-[#f8fafc] px-4 py-4"
                          >
                            <div className="text-[15px] text-[#475569]">
                              {point.percentile}-й перцентиль
                            </div>
                            <div className="font-medium text-[#0f172a]">
                              {formatMoney(point.amountByDeadline)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[15px] text-[#64748b]">Дані відсутні.</div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState text="Для вкладки цілей поки немає даних." />
            )}
          </>
        )}

        {!loading && activeTab === "patterns" && (
          <>
            {patterns.length > 0 ? (
              <div className="space-y-4">
                {patterns.map((cluster, index) => (
                  <div
                    key={index}
                    className="rounded-[22px] border border-[#d7dde7] bg-white p-6"
                  >
                    <h3 className="mb-2 text-[18px] font-semibold text-[#0f172a]">
                      {cluster.label}
                    </h3>

                    <p className="mb-4 text-[15px] leading-[1.6] text-[#475569]">
                      {cluster.description}
                    </p>

                    <div className="mb-4 rounded-[16px] bg-[#f8fafc] px-4 py-4 text-[15px] text-[#475569]">
                      {cluster.recommendation}
                    </div>

                    {cluster.stats ? (
                      <div className="mb-4 grid gap-3 md:grid-cols-3">
                        {Object.entries(cluster.stats).map(([key, value]) => (
                          <div
                            key={key}
                            className="rounded-[16px] border border-[#d7dde7] bg-white px-4 py-4"
                          >
                            <div className="text-[12px] uppercase tracking-wide text-[#94a3b8]">
                              {key}
                            </div>
                            <div className="mt-2 font-medium text-[#0f172a]">
                              {String(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {cluster.top?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {cluster.top.map((item, topIndex) => (
                          <Pill key={topIndex}>{item}</Pill>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="Патерни витрат ще не сформовано." />
            )}
          </>
        )}
      </div>
    </div>
  );
}