import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import CustomProgressBar from '../components/CustomProgressBar';
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(isSameOrAfter);
dayjs.extend(isSameOrBefore);

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement
);

export default function DashboardPage() {
  const [currency, setCurrency] = useState('UAH');
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);

  const now = dayjs();
  const currentYear = now.year();
  const currentMonthStart = now.startOf('month');

  // Лінійний графік: рік (стрілочки). За замовчуванням — поточний.
  const [selectedYear, setSelectedYear] = useState(currentYear);

  // Баланс + Pie: період місяця (стрілочки). За замовчуванням — поточний місяць.
  const [selectedMonthPeriod, setSelectedMonthPeriod] = useState(currentMonthStart);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    const fetchAll = async () => {
      try {
        const [profileRes, txRes, goalsRes] = await Promise.all([
          axios.get('http://localhost:5000/api/user/profile', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5000/api/transactions', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5000/api/goals', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setCurrency(profileRes.data.currency || 'UAH');
        setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
        setGoals(Array.isArray(goalsRes.data) ? goalsRes.data : []);
      } catch (err) {
        console.error('Помилка при завантаженні дашборду:', err);
      }
    };

    fetchAll();
  }, []);

  /**
   * Мінімальна дата (період) в історії транзакцій.
   * Якщо транзакцій немає — мінімум = поточний місяць.
   * Важливо: ми дозволяємо переходи в минуле навіть якщо там немає транзакцій,
   * але не дозволяємо виходити "до" найпершого доступного періоду (щоб не блукати без меж).
   */
  const minTxMonthStart = useMemo(() => {
    if (!transactions.length) return currentMonthStart;

    let min = null;
    for (const t of transactions) {
      const d = dayjs(t.date);
      if (!d.isValid()) continue;
      if (min === null || d.isBefore(min)) min = d;
    }

    return (min ?? currentMonthStart).startOf('month');
  }, [transactions, currentMonthStart]);

  /**
   * Діапазон років для лінійного графіка:
   * - max = поточний рік (майбутнє заборонено)
   * - min = рік найпершої транзакції (або поточний, якщо транзакцій немає)
   */
  const minYear = useMemo(() => {
    return minTxMonthStart.year();
  }, [minTxMonthStart]);

  const maxYear = currentYear;

  const canGoPrevYear = selectedYear > minYear;
  const canGoNextYear = selectedYear < maxYear;

  /**
   * Для балансу/категорій: обмеження по місяцях.
   * - max = поточний місяць (майбутнє заборонено)
   * - min = місяць найпершої транзакції (або поточний, якщо транзакцій немає)
   */
  const minAllowedMonth = minTxMonthStart;
  const maxAllowedMonth = currentMonthStart;

  // Якщо після завантаження даних selectedYear/selectedMonthPeriod стали невалідні — нормалізуємо
  useEffect(() => {
    if (selectedYear > maxYear) setSelectedYear(maxYear);
    if (selectedYear < minYear) setSelectedYear(minYear);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minYear, maxYear]);

  useEffect(() => {
    if (selectedMonthPeriod.isAfter(maxAllowedMonth)) setSelectedMonthPeriod(maxAllowedMonth);
    if (selectedMonthPeriod.isBefore(minAllowedMonth)) setSelectedMonthPeriod(minAllowedMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [minAllowedMonth, maxAllowedMonth]);

  const canGoPrevMonth = selectedMonthPeriod.subtract(1, 'month').isSameOrAfter(minAllowedMonth);
  const canGoNextMonth = selectedMonthPeriod.add(1, 'month').isSameOrBefore(maxAllowedMonth);

  const goPrevMonth = () => {
    setSelectedMonthPeriod((p) => {
      const next = p.subtract(1, 'month').startOf('month');
      return next.isBefore(minAllowedMonth) ? minAllowedMonth : next;
    });
  };

  const goNextMonth = () => {
    setSelectedMonthPeriod((p) => {
      const next = p.add(1, 'month').startOf('month');
      return next.isAfter(maxAllowedMonth) ? maxAllowedMonth : next;
    });
  };

  const goPrevYear = () => setSelectedYear((y) => Math.max(minYear, y - 1));
  const goNextYear = () => setSelectedYear((y) => Math.min(maxYear, y + 1));

  /**
   * Транзакції для Балансу + Pie (вибраний місяць/рік через selectedMonthPeriod)
   */
  const txSelectedMonth = useMemo(() => {
    const y = selectedMonthPeriod.year();
    const m = selectedMonthPeriod.month(); // 0..11
    return transactions.filter((tx) => {
      const d = dayjs(tx.date);
      return d.isValid() && d.year() === y && d.month() === m;
    });
  }, [transactions, selectedMonthPeriod]);

  const income = useMemo(() => {
    return txSelectedMonth
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + (t.amountInBaseCurrency || 0), 0);
  }, [txSelectedMonth]);

  const expense = useMemo(() => {
    return txSelectedMonth
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + (t.amountInBaseCurrency || 0), 0);
  }, [txSelectedMonth]);

  const balance = income - expense;

  const categorySummary = useMemo(() => {
    const summary = {};
    txSelectedMonth.forEach((tx) => {
      if (tx.type === 'expense') {
        const key = tx.categoryId?.name || 'Без категорії';
        summary[key] = (summary[key] || 0) + (tx.amountInBaseCurrency || 0);
      }
    });
    return summary;
  }, [txSelectedMonth]);

  const pieData = useMemo(() => {
    return {
      labels: Object.keys(categorySummary),
      datasets: [
        {
          label: 'Витрати',
          data: Object.values(categorySummary),
          backgroundColor: ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'],
          borderWidth: 1
        }
      ]
    };
  }, [categorySummary]);

  /**
   * Лінійний графік: 12 місяців для selectedYear
   */
  const monthlyStats = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const filtered = transactions.filter((t) => {
        const d = dayjs(t.date);
        return d.isValid() && d.year() === selectedYear && d.month() === i;
      });

      return {
        month: dayjs().month(i).format('MMM'),
        income: filtered
          .filter((t) => t.type === 'income')
          .reduce((s, t) => s + (t.amountInBaseCurrency || 0), 0),
        expense: filtered
          .filter((t) => t.type === 'expense')
          .reduce((s, t) => s + (t.amountInBaseCurrency || 0), 0)
      };
    });
  }, [transactions, selectedYear]);

  const lineData = useMemo(() => {
    return {
      labels: monthlyStats.map((m) => m.month),
      datasets: [
        {
          label: 'Доходи',
          data: monthlyStats.map((m) => m.income),
          borderColor: 'rgb(34,197,94)',
          backgroundColor: 'rgba(34,197,94,0.2)',
          tension: 0.1
        },
        {
          label: 'Витрати',
          data: monthlyStats.map((m) => m.expense),
          borderColor: 'rgb(239,68,68)',
          backgroundColor: 'rgba(239,68,68,0.2)',
          tension: 0.1
        }
      ]
    };
  }, [monthlyStats]);

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } }
    };
  }, []);

  const selectedMonthTitle = selectedMonthPeriod.format('MMMM YYYY');

  return (
    <div className="max-w-6xl mx-auto mt-10 space-y-10">
      {/* Баланс + стрілочки місяця */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-2">
          <h2 className="text-xl font-semibold text-gray-800">
            Баланс за {selectedMonthTitle}
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded-lg border text-gray-700 disabled:opacity-50"
              onClick={goPrevMonth}
              disabled={!canGoPrevMonth}
              aria-label="Попередній місяць"
              title="Попередній місяць"
            >
              ‹
            </button>

            <div className="px-3 py-1 rounded-lg border text-gray-700 bg-gray-50 min-w-[170px] text-center">
              {selectedMonthTitle}
            </div>

            <button
              type="button"
              className="px-3 py-1 rounded-lg border text-gray-700 disabled:opacity-50"
              onClick={goNextMonth}
              disabled={!canGoNextMonth}
              aria-label="Наступний місяць"
              title="Наступний місяць"
            >
              ›
            </button>
          </div>
        </div>

        <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {balance >= 0 ? '+' : '–'} {Math.abs(balance).toFixed(2)} {currency}
        </p>
      </div>

      {/* Лінійний графік + стрілочки року */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Доходи та витрати по місяцях ({selectedYear})
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded-lg border text-gray-700 disabled:opacity-50"
              onClick={goPrevYear}
              disabled={!canGoPrevYear}
              aria-label="Попередній рік"
              title="Попередній рік"
            >
              ‹
            </button>

            <div className="px-3 py-1 rounded-lg border text-gray-700 bg-gray-50 min-w-[90px] text-center">
              {selectedYear}
            </div>

            <button
              type="button"
              className="px-3 py-1 rounded-lg border text-gray-700 disabled:opacity-50"
              onClick={goNextYear}
              disabled={!canGoNextYear}
              aria-label="Наступний рік"
              title="Наступний рік"
            >
              ›
            </button>
          </div>
        </div>

        <div style={{ height: 300 }}>
          <Line data={lineData} options={chartOptions} />
        </div>
      </div>

      {/* Pie по категоріях + ті самі стрілочки місяця */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-800">
            Витрати за категоріями ({selectedMonthTitle})
          </h2>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="px-3 py-1 rounded-lg border text-gray-700 disabled:opacity-50"
              onClick={goPrevMonth}
              disabled={!canGoPrevMonth}
              aria-label="Попередній місяць"
              title="Попередній місяць"
            >
              ‹
            </button>

            <div className="px-3 py-1 rounded-lg border text-gray-700 bg-gray-50 min-w-[170px] text-center">
              {selectedMonthTitle}
            </div>

            <button
              type="button"
              className="px-3 py-1 rounded-lg border text-gray-700 disabled:opacity-50"
              onClick={goNextMonth}
              disabled={!canGoNextMonth}
              aria-label="Наступний місяць"
              title="Наступний місяць"
            >
              ›
            </button>
          </div>
        </div>

        {Object.keys(categorySummary).length === 0 ? (
          <p className="text-gray-500">Немає витрат у цьому місяці.</p>
        ) : (
          <div style={{ height: 300 }}>
            <Pie data={pieData} options={chartOptions} />
          </div>
        )}
      </div>

      {/* Прогрес цілей */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Прогрес фінансових цілей</h2>
        {goals.length === 0 ? (
          <p className="text-gray-500">Цілі ще не створені.</p>
        ) : (
          goals.map((g) => (
            <div key={g._id}>
              <div className="flex justify-between items-center text-sm text-gray-600 mb-1">
                <span>{g.name}</span>
                <span>{Number(g.progress || 0).toFixed(1)}%</span>
              </div>

              <CustomProgressBar
                value={Number(g.progress || 0)}
                color={
                  g.status === 'achieved'
                    ? 'green'
                    : dayjs(g.deadline).isBefore(now)
                    ? 'red'
                    : 'blue'
                }
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
