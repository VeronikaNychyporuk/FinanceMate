import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import TransactionDetailsModal from "../components/TransactionDetailsModal";

const API_BASE_URL = "http://localhost:5000/api/recommendations";
const USER_API_URL = "http://localhost:5000/api/user/profile";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
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

function getModuleLabel(value) {
  switch (value) {
    case "overview": return "Фінансовий звіт";
    case "anomalies": return "Аномалії";
    case "forecast": return "Прогноз";
    case "goals": return "Цілі";
    case "patterns": return "Поведінка";
    default: return value || "—";
  }
}

/* ============ UI Primitives ============ */

function PrimaryButton({ children, onClick, disabled, className }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn("px-3 py-2 rounded-lg bg-slate-900 text-white text-sm hover:bg-slate-800 active:bg-slate-950 disabled:opacity-60", className)}
      type="button"
    >
      {children}
    </button>
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

function EmptyState({ text }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl px-8 py-10 text-sm text-slate-500">
      {text}
    </div>
  );
}

const TAB_ACTION_LABELS = {
  overview:  "Переглянути звіт",
  forecast:  "Переглянути прогноз",
  goals:     "Аналіз цілей",
  patterns:  "Переглянути поведінку",
  anomalies: "Переглянути аномалії",
};

function resolveActionLabel(action) {
  if (!action) return "";
  if (action.actionType === "navigate" && action.targetType === "tab" && TAB_ACTION_LABELS[action.targetValue]) {
    return TAB_ACTION_LABELS[action.targetValue];
  }
  return action.label || "";
}

/* ============ Recommendation Components ============ */

function RecommendationCard({ recommendation, onDismiss, onAction, actionLoading }) {
  const { primaryAction, secondaryAction } = recommendation;
  const handleAction = (action) => onAction(action, recommendation);
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
          {primaryAction && (
            <PrimaryButton className="w-full" onClick={() => handleAction(primaryAction)}>
              {resolveActionLabel(primaryAction)}
            </PrimaryButton>
          )}
          {secondaryAction && (
            <GhostButton className="w-full" onClick={() => handleAction(secondaryAction)}>
              {resolveActionLabel(secondaryAction)}
            </GhostButton>
          )}
          <GhostButton className="w-full" onClick={() => onDismiss(recommendation._id)} disabled={actionLoading}>
            Відхилити рекомендацію
          </GhostButton>
        </div>
      </div>
    </div>
  );
}

function RecommendationGroup({ title, items, onDismiss, onAction, actionLoadingId }) {
  return (
    <div>
      <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">{title}</div>
      <div className="grid gap-3">
        {items.map((item) => (
          <RecommendationCard
            key={item._id}
            recommendation={item}
            onDismiss={onDismiss}
            onAction={onAction}
            actionLoading={actionLoadingId === item._id}
          />
        ))}
      </div>
    </div>
  );
}

function RecommendationsSection({ groupList, onDismiss, onAction, actionLoadingId }) {
  if (!groupList.length) {
    return <EmptyState text="Активні рекомендації відсутні." />;
  }
  return (
    <div className="grid gap-6">
      {groupList.map((group, index) => (
        <RecommendationGroup
          key={`${group.title}-${index}`}
          title={group.title}
          items={group.items}
          onDismiss={onDismiss}
          onAction={onAction}
          actionLoadingId={actionLoadingId}
        />
      ))}
    </div>
  );
}

/* ============ Main Page ============ */

export default function RecommendationsPage() {
  const navigate = useNavigate();

  const [recommendations, setRecommendations] = useState([]);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [error, setError] = useState("");
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [dismissedAnomalyTxIds, setDismissedAnomalyTxIds] = useState(new Set());

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

      const [recommendationsResponse, snapshotResponse] = await Promise.all([
        fetch(API_BASE_URL, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/snapshot`, { headers, cache: "no-store" }),
      ]);

      const recommendationsJson = await recommendationsResponse.json();
      const snapshotJson = await snapshotResponse.json();

      if (!recommendationsResponse.ok) {
        throw new Error(recommendationsJson.message || "Не вдалося отримати рекомендації.");
      }

      if (snapshotResponse.ok) {
        setSnapshot(snapshotJson);
      } else if (snapshotResponse.status === 404) {
        setSnapshot(null);
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

  const handleRecommendationAction = (action, recommendation) => {
    if (!action) return;
    const { actionType, targetType, targetValue } = action;
    if (actionType === "navigate") {
      if (targetType === "tab") {
        const goalId = recommendation?.relatedEntity?.entityId;
        if (targetValue === "goals" && goalId) {
          navigate(`/analytics/goals?goalId=${goalId}`);
        } else {
          navigate(`/analytics/${targetValue}`);
        }
      } else if (targetType === "route") {
        navigate(targetValue);
      }
    } else if (actionType === "open_entity") {
      if (targetType === "goal") navigate(`/goals/${targetValue}`);
      else if (targetType === "budget") navigate(`/budgets/${targetValue}`);
      else if (targetType === "transaction") openTransaction(targetValue);
      else if (targetType === "category") navigate(`/transactions`);
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

  const GROUP_ORDER = ["immediate_actions", "spending_optimization", "planning_ahead"];
  const groupList = Object.entries(groupedRecommendations)
    .sort(([a], [b]) => {
      const ai = GROUP_ORDER.indexOf(a);
      const bi = GROUP_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    })
    .map(([, group]) => group);

  const anomalies = (snapshot?.data?.anomalies?.items || [])
    .filter((a) => !dismissedAnomalyTxIds.has(a.transactionId?.toString()));

  const liveHighCount = anomalies.filter((a) => a.severity === "high").length;
  const liveMediumCount = anomalies.filter((a) => a.severity === "medium").length;
  const liveLowCount = anomalies.filter((a) => a.severity === "low").length;

  const patchedGroupList = groupList
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => item.type !== "anomaly_summary" || anomalies.length > 0)
        .map((item) => {
          if (item.type !== "anomaly_summary") return item;
          return {
            ...item,
            message: `Виявлено ${anomalies.length} аномалій у ваших витратах.`,
            facts: [
              ...(liveHighCount > 0 ? [`Високий рівень: ${liveHighCount}`] : []),
              ...(liveMediumCount > 0 ? [`Середній рівень: ${liveMediumCount}`] : []),
              ...(liveLowCount > 0 ? [`Низький рівень: ${liveLowCount}`] : []),
            ],
          };
        }),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <div className="min-h-screen bg-white">
      <TransactionDetailsModal
        open={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onEdit={() => {
          navigate(`/transactions/edit/${selectedTransaction._id}`, { state: { from: "/recommendations" } });
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
        <div className="flex items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <div className="text-2xl font-bold text-slate-900">Рекомендації</div>
            <div className="text-sm text-slate-600">
              Оновлено:{" "}
              {snapshot?.generatedAt ? formatDate(snapshot.generatedAt, true) : "—"}
            </div>
          </div>

        </div>

        {error ? (
          <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="mt-6 bg-white border border-slate-200 rounded-xl px-8 py-10 text-sm text-slate-500">
            Завантаження даних...
          </div>
        ) : null}

        {!loading && (
          <div className="mt-6 grid gap-4">
            <RecommendationsSection
              groupList={patchedGroupList}
              onDismiss={(id) => {
                const rec = recommendations.find((r) => r._id === id);
                if (rec?.module === "anomalies" && rec?.relatedEntity?.entityId) {
                  setDismissedAnomalyTxIds((prev) => new Set([...prev, rec.relatedEntity.entityId.toString()]));
                }
                updateRecommendationStatus(id, "dismissed");
              }}
              onAction={handleRecommendationAction}
              actionLoadingId={actionLoadingId}
            />
          </div>
        )}
      </div>
    </div>
  );
}
