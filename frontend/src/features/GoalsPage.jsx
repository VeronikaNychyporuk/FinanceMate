import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import CustomProgressBar from '../components/CustomProgressBar';

export default function GoalsPage() {
  const [goals, setGoals] = useState([]);
  const [currency, setCurrency] = useState('UAH');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    Promise.all([
      axios.get('http://localhost:5000/api/goals', {
        headers: { Authorization: `Bearer ${token}` },
      }),
      axios.get('http://localhost:5000/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(([goalsRes, userRes]) => {
        setGoals(goalsRes.data);
        setCurrency(userRes.data.currency || 'UAH');
      })
      .catch((err) => {
        console.error('Помилка при завантаженні цілей або профілю', err);
      });
  }, []);

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Цілі</h1>
        <button
          onClick={() => navigate('/goals/new')}
          className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
        >
          + Додати ціль
        </button>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        {goals.length === 0 ? (
          <p className="text-gray-500 text-center">Тут зʼявляться ваші фінансові цілі.</p>
        ) : (
          <div className="space-y-4">
            {goals.map((goal) => {
              const isLate =
                goal.status === 'in_progress' && dayjs(goal.deadline).isBefore(dayjs());
              const isAchieved = goal.status === 'achieved';
              const colorClass = isLate
                ? 'red'
                : isAchieved
                ? 'green'
                : 'blue';

              return (
                <div key={goal._id} className="border border-gray-200 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center">
                    <div className={`text-xl font-semibold text-gray-700`}>{goal.name}</div>
                    <div className={`text-sm text-gray-700`}>
                      {dayjs(goal.deadline).format('DD.MM.YYYY')}
                    </div>
                  </div>

                  <div className="text-base text-gray-700 mt-1">
                    Ціль: {goal.targetAmount} {currency}
                  </div>

                  <CustomProgressBar
                    value={goal.progress}
                    color={`${colorClass}`}
                  />
                  
                  <div className="flex justify-between items-center text-base text-gray-600 mt-1">
                    <div>
                      Накопичено: {goal.currentAmount} {currency}
                    </div>
                    <button
                      onClick={() => navigate(`/goals/${goal._id}`)}
                      className="text-blue-600 hover:underline"
                    >
                      Детальніше
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}