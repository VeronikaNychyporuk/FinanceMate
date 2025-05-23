import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import CustomProgressBar from '../components/CustomProgressBar';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement);

export default function DashboardPage() {
  const [currency, setCurrency] = useState('UAH');
  const [transactions, setTransactions] = useState([]);
  const [goals, setGoals] = useState([]);

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
        setTransactions(txRes.data);
        setGoals(goalsRes.data);
      } catch (err) {
        console.error('Помилка при завантаженні дашборду:', err);
      }
    };

    fetchAll();
  }, []);

  const now = dayjs();
  const currentMonth = now.month() + 1;
  const currentYear = now.year();

  const txThisMonth = transactions.filter((tx) => {
    const d = dayjs(tx.date);
    return d.month() + 1 === currentMonth && d.year() === currentYear;
  });

  const income = txThisMonth.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amountInBaseCurrency || 0), 0);
  const expense = txThisMonth.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amountInBaseCurrency || 0), 0);
  const balance = income - expense;

  const categorySummary = {};
  txThisMonth.forEach((tx) => {
    if (tx.type === 'expense') {
      const key = tx.categoryId?.name || 'Без категорії';
      categorySummary[key] = (categorySummary[key] || 0) + (tx.amountInBaseCurrency || 0);
    }
  });

  const pieData = {
    labels: Object.keys(categorySummary),
    datasets: [{
      label: 'Витрати',
      data: Object.values(categorySummary),
      backgroundColor: ['#f87171', '#60a5fa', '#34d399', '#fbbf24', '#a78bfa', '#f472b6'],
      borderWidth: 1
    }]
  };

  const monthlyStats = Array.from({ length: 12 }, (_, i) => {
    const filtered = transactions.filter((t) => {
      const d = dayjs(t.date);
      return d.month() === i && d.year() === currentYear;
    });
    return {
      month: dayjs().month(i).format('MMM'),
      income: filtered.filter(t => t.type === 'income').reduce((s, t) => s + (t.amountInBaseCurrency || 0), 0),
      expense: filtered.filter(t => t.type === 'expense').reduce((s, t) => s + (t.amountInBaseCurrency || 0), 0)
    };
  });

  const lineData = {
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'top' } }
  };

  return (
    <div className="max-w-6xl mx-auto mt-10 space-y-10">
      {/* Баланс */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">Баланс за {now.format('MMMM YYYY')}</h2>
        <p className={`text-2xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          {balance >= 0 ? '+' : '–'} {Math.abs(balance).toFixed(2)} {currency}
        </p>
      </div>

      {/* Лінійний графік */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Доходи та витрати по місяцях</h2>
        <div style={{ height: 300 }}>
          <Line data={lineData} options={chartOptions} />
        </div>
      </div>

      {/* Pie по категоріях */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Витрати за категоріями</h2>
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
                <span>{g.progress.toFixed(1)}%</span>
              </div>
              <CustomProgressBar
                value={g.progress}
                color={
                  g.status === 'achieved' ? 'green'
                  : dayjs(g.deadline).isBefore(now) ? 'red'
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
