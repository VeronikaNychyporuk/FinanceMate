import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import CustomProgressBar from '../components/CustomProgressBar';

const monthsUA = [
  'Січень', 'Лютий', 'Березень', 'Квітень',
  'Травень', 'Червень', 'Липень', 'Серпень',
  'Вересень', 'Жовтень', 'Листопад', 'Грудень'
];

export default function BudgetsArchivePage() {
  const [budgets, setBudgets] = useState([]);
  const [currency, setCurrency] = useState('UAH');
  const [currentMonth] = useState(dayjs().month() + 1);
  const [currentYear] = useState(dayjs().year());
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    const fetchData = async () => {
      try {
        const [budgetsRes, profileRes] = await Promise.all([
          axios.get('http://localhost:5000/api/budgets', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5000/api/user/profile', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const allBudgets = budgetsRes.data;
        setCurrency(profileRes.data.currency || 'UAH');

        const archiveBudgets = allBudgets.filter(
          (b) => b.period.month !== currentMonth || b.period.year !== currentYear
        );

        const budgetsWithStats = await Promise.all(
          archiveBudgets.map(async (b) => {
            const overviewRes = await axios.get(
              `http://localhost:5000/api/budgets/overview?month=${b.period.month}&year=${b.period.year}`,
              { headers: { Authorization: `Bearer ${token}` } }
            );
            return {
              ...b,
              overview: overviewRes.data
            };
          })
        );

        setBudgets(budgetsWithStats);
      } catch (err) {
        console.error('Помилка при завантаженні бюджетів:', err);
      }
    };

    fetchData();
  }, [currentMonth, currentYear]);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Архів бюджетів</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        {budgets.length === 0 ? (
          <p className="text-gray-500 text-center">Архівних бюджетів поки немає.</p>
        ) : (
          budgets.map((budget) => {
            const { period, overview } = budget;
            const monthName = monthsUA[period.month - 1];
            const barColor = overview.exceeded ? 'red' : 'green';

            return (
              <div
                key={budget._id}
                className="border border-gray-200 rounded-2xl p-4 space-y-2"
              >
                <div className="flex justify-between text-gray-800">
                  <div className="font-semibold text-xl">{monthName} {period.year}</div>
                  <button
                      onClick={() => navigate(`/budgets/${budget._id}`)}
                      className="text-base text-blue-600 hover:underline"
                    >
                      Детальніше
                    </button>
                </div>

                <CustomProgressBar
                  value={overview.totalPercentage}
                  color={barColor}
                />

                <div className="flex justify-between text-sm text-gray-700">
                  <div>
                    <strong>Ліміт:</strong> {overview.totalLimit} {currency}
                  </div>
                  <div>
                    <strong>Витрачено:</strong> {overview.totalSpent} {currency}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
