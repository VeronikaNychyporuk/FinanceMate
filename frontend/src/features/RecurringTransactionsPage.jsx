import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import TransactionDetailsModal from '../components/TransactionDetailsModal';
import dayjs from 'dayjs';

export default function RecurringTransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');
  const [frequencyFilter, setFrequencyFilter] = useState('');
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    axios.get('http://localhost:5000/api/recurring-transactions', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      const sorted = [...res.data].sort((a, b) => new Date(a.nextRun) - new Date(b.nextRun));
      setTransactions(sorted);
      setFiltered(sorted);
    });
  }, []);

  const applyFilters = () => {
    let filteredList = [...transactions];

    if (typeFilter) {
      filteredList = filteredList.filter(t => t.type === typeFilter);
    }

    if (categoryFilter.trim() !== '') {
      const normalizedFilter = categoryFilter.trim().toLowerCase();
      filteredList = filteredList.filter(t =>
        t.categoryId?.name?.toLowerCase().includes(normalizedFilter)
      );
    }

    if (activeFilter !== '') {
      filteredList = filteredList.filter(t => t.isActive === (activeFilter === 'true'));
    }

    if (frequencyFilter !== '') {
      filteredList = filteredList.filter(t => t.frequency === frequencyFilter);
    }

    setFiltered(filteredList);
  };

  useEffect(applyFilters, [typeFilter, categoryFilter, activeFilter, frequencyFilter, transactions]);

  const formatAmount = (amount, type, currency) => {
    const sign = type === 'income' ? '+' : '–';
    const color = type === 'income' ? 'text-green-600' : 'text-red-600';
    return <span className={`font-semibold ${color}`}>{`${sign} ${amount} ${currency}`}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Регулярні транзакції</h1>

      {/* Фільтри */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4 flex-wrap">
          {/* Тип */}
          <div className="w-full md:w-1/5">
            <label className="block text-base text-gray-700 mb-1">Тип</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full border rounded p-2 bg-gray-100"
            >
              <option value="">Усі</option>
              <option value="income">Доходи</option>
              <option value="expense">Витрати</option>
            </select>
          </div>

          {/* Категорія */}
          <div className="w-full md:w-1/4">
            <label className="block text-base text-gray-700 mb-1">Категорія</label>
            <input
              type="text"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="Наприклад: Підписки"
              className="w-full border rounded p-2 bg-gray-100"
            />
          </div>

          {/* Активність */}
          <div className="w-full md:w-1/5">
            <label className="block text-base text-gray-700 mb-1">Статус</label>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="w-full border rounded p-2 bg-gray-100"
            >
              <option value="">Усі</option>
              <option value="true">Активні</option>
              <option value="false">Неактивні</option>
            </select>
          </div>

          {/* Частота */}
          <div className="w-full md:w-1/5">
            <label className="block text-base text-gray-700 mb-1">Частота</label>
            <select
              value={frequencyFilter}
              onChange={(e) => setFrequencyFilter(e.target.value)}
              className="w-full border rounded p-2 bg-gray-100"
            >
              <option value="">Усі</option>
              <option value="daily">Щодня</option>
              <option value="weekly">Щотижня</option>
              <option value="monthly">Щомісяця</option>
              <option value="yearly">Щороку</option>
            </select>
          </div>
        </div>
      </div>

      {/* Кнопка додавання транзакції */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => navigate('/recurring-transactions/new')}
          className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
        >
          + Додати регулярну транзакцію
        </button>
      </div>

      {/* Список транзакцій */}
      <div className="bg-white rounded-xl shadow p-6">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-center">Тут зʼявляться ваші регулярні транзакції.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((tx) => (
              <div key={tx._id} className="border-b pb-3">
                <div className="flex justify-between items-center">
                  {formatAmount(tx.amount, tx.type, tx.currency)}
                  <div className="text-base text-gray-500">
                    Наступна: {dayjs(tx.nextRun).format('DD.MM.YYYY')}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-base text-gray-700 mt-1">
                    {tx.categoryId?.name || 'Без категорії'} • {tx.frequency}
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
        onEdit={() => navigate(`/recurring-transactions/edit/${selectedTransaction._id}`, {state: { from: '/recurring-transactions' }})}
        onConfirmDelete={() => {
          const token = localStorage.getItem('accessToken');
          axios.delete(`http://localhost:5000/api/recurring-transactions/${selectedTransaction._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(() => {
              setTransactions(prev => prev.filter(t => t._id !== selectedTransaction._id));
              setSelectedTransaction(null);
            })
            .catch(() => alert('Помилка при видаленні транзакції'));
        }}
      />
    </div>
  );
}
