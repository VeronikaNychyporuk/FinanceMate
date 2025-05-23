import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import CustomProgressBar from '../components/CustomProgressBar';
import TransactionDetailsModal from '../components/TransactionDetailsModal';

export default function BudgetDetailsPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [budget, setBudget] = useState(null);
  const [overview, setOverview] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [currency, setCurrency] = useState('UAH');
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    const fetchData = async () => {
      try {
        const [budgetsRes, profileRes, txRes] = await Promise.all([
          axios.get('http://localhost:5000/api/budgets', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5000/api/user/profile', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5000/api/transactions', {
            headers: { Authorization: `Bearer ${token}` }
          }),
        ]);

        const found = budgetsRes.data.find((b) => b._id === id);
        if (!found) {
          setBudget(null);
          return;
        }

        const { month, year } = found.period;

        const [overviewRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/budgets/overview?month=${month}&year=${year}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const filteredTx = txRes.data
          .filter((tx) => {
            const d = dayjs(tx.date);
            return (
              tx.type === 'expense' &&
              d.month() + 1 === Number(month) &&
              d.year() === Number(year)
            );
          })
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        setBudget(found);
        setOverview(overviewRes.data);
        setTransactions(filteredTx);
        setCurrency(profileRes.data.currency || 'UAH');
      } catch (err) {
        console.error('Помилка при завантаженні бюджету:', err);
      }
    };

    fetchData();
  }, [id]);

  const formatAmount = (amount, type, curr) => {
    const sign = type === 'income' ? '+' : '–';
    const color = type === 'income' ? 'text-green-600' : 'text-red-600';
    return <span className={`font-semibold ${color}`}>{`${sign} ${amount} ${curr}`}</span>;
  };

  if (!budget) {
    return (
      <div className="max-w-4xl mx-auto mt-10 text-center text-gray-600">
        Бюджет не знайдено.
      </div>
    );
  }

  const title = dayjs(`${budget.period.year}-${budget.period.month}-01`).format('MMMM YYYY');

  return (
    <div className="max-w-4xl mx-auto mt-10 space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Бюджет {title}</h1>

      <div className="bg-white rounded-xl shadow p-6 space-y-4">
        <h2 className="text-xl font-semibold text-gray-800">Загальна інформація</h2>

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
        onEdit={() => navigate(`/transactions/edit/${selectedTransaction._id}`, {state: { from: `/budgets/${id}` }})}
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
    </div>
  );
}
