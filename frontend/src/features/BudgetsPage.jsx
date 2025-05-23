import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import CustomProgressBar from '../components/CustomProgressBar';
import TransactionDetailsModal from '../components/TransactionDetailsModal';

export default function BudgetMainPage() {
  const navigate = useNavigate();
  const [budget, setBudget] = useState(null);
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [currency, setCurrency] = useState('UAH');
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const now = dayjs();
    const currentMonth = now.month() + 1;
    const currentYear = now.year();

    const fetchData = async () => {
      try {
        const [budgetsRes, profileRes, txRes, overviewRes] = await Promise.all([
          axios.get('http://localhost:5000/api/budgets', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5000/api/user/profile', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5000/api/transactions', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`http://localhost:5000/api/budgets/overview?month=${currentMonth}&year=${currentYear}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const currentBudget = budgetsRes.data.find(
          (b) => b.period.month === currentMonth && b.period.year === currentYear
        );

        const txThisMonth = txRes.data
          .filter((tx) => {
            const d = dayjs(tx.date);
            return (tx.type === 'expense' && d.month() + 1 === currentMonth && d.year() === currentYear);
          })
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        setBudget(currentBudget || null);
        setCurrency(profileRes.data.currency || 'UAH');
        setOverview(overviewRes.data);
        setTransactions(txThisMonth);
      } catch (err) {
        console.error('Помилка при завантаженні:', err);
      }
    };

    fetchData();
  }, []);

  const formatAmount = (amount, type, curr) => {
    const sign = type === 'income' ? '+' : '–';
    const color = type === 'income' ? 'text-green-600' : 'text-red-600';
    return <span className={`font-semibold ${color}`}>{`${sign} ${amount} ${curr}`}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Бюджет</h1>
        <div className="flex gap-3">
          <button
            onClick={() => navigate('/budgets/archive')}
            className="bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-2 px-4 rounded"
          >
            Архів бюджетів
          </button>
          <button
            onClick={() => navigate('/budgets/new')}
            className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
          >
            + Додати бюджет
          </button>
        </div>
      </div>

      {!budget ? (
        <div className="bg-white rounded-xl shadow p-6 text-center space-y-3">
          <p className="text-gray-700 text-lg">Бюджет на поточний місяць ще не створено</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-xl shadow p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">{dayjs().format('MMMM YYYY')}</h2>
              <button
                onClick={() => navigate(`/budgets/edit/${budget._id}`)}
                className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
              >
                Редагувати бюджет
              </button>
            </div>

            <CustomProgressBar
              value={overview.totalPercentage}
              color={overview.exceeded ? 'red' : 'green'}
            />

            <div className="flex justify-between text-sm text-gray-700">
              <div><strong>Ліміт:</strong> {overview.totalLimit} {currency}</div>
              <div><strong>Витрачено:</strong> {overview.totalSpent} {currency}</div>
            </div>

            {overview.categories.map((cat) => (
              <div key={cat.categoryId} className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <div>{cat.name}</div>
                  <div>
                    {cat.spent} / {cat.limit} {currency}
                  </div>
                </div>
                <CustomProgressBar
                  value={cat.percentage}
                  color={cat.exceeded ? 'red' : 'green'}
                />
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-800"> </h2>
            <button
                onClick={() => navigate('/transactions/new', {state: { from: 'budget' }})}
                className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
            >
                + Додати транзакцію
            </button>
          </div>

          {/* Список транзакцій */}
          <div className="bg-white rounded-xl shadow p-6">
            {transactions.length === 0 ? (
              <p className="text-gray-500 text-center">Тут зʼявляться ваші транзакції.</p>
            ) : (
              <div className="space-y-4">
                {transactions.map((tx) => (
                  <div key={tx._id} className="border-b pb-3">
                    <div className="flex justify-between items-center">
                      {formatAmount(tx.amount, tx.type, tx.currency)}
                      <div className="text-base text-gray-500">
                        {dayjs(tx.date).format('DD.MM.YYYY')}
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-base text-gray-700 mt-1">
                        {tx.categoryId?.name || 'Без категорії'}
                      </div>
                      <div className="text-sm text-gray-500">
                        <button
                          onClick={() => setSelectedTransaction(tx)}
                          className="block text-blue-600 text-base mt-1 hover:underline"
                        >
                          Детальніше
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <TransactionDetailsModal
            open={!!selectedTransaction}
            transaction={selectedTransaction}
            onClose={() => setSelectedTransaction(null)}
            onEdit={() => navigate(`/transactions/edit/${selectedTransaction._id}`, {state: { from: '/budgets' }})}
            onConfirmDelete={() => {
              const token = localStorage.getItem('accessToken');
              axios.delete(`http://localhost:5000/api/transactions/${selectedTransaction._id}`, {
                headers: { Authorization: `Bearer ${token}` }
              })
                .then(() => {
                  setTransactions((prev) =>
                    prev.filter((tx) => tx._id !== selectedTransaction._id)
                  );
                  setSelectedTransaction(null);
                  window.location.reload();
                })
                .catch(() => {
                  alert('Помилка при видаленні транзакції');
                });
            }}
          />
        </>
      )}
    </div>
  );
}
