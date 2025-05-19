import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import { DateRangePicker } from '@tremor/react';
import { useNavigate } from 'react-router-dom';
import TransactionDetailsModal from '../components/TransactionDetailsModal';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [typeFilter, setTypeFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateRange, setDateRange] = useState({ from: null, to: null });
  const [selectedTransaction, setSelectedTransaction] = useState(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    axios.get('http://localhost:5000/api/transactions', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      const sorted = [...res.data].sort((a, b) => new Date(b.date) - new Date(a.date));
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

    if (dateRange.from && dateRange.to) {
      filteredList = filteredList.filter(t => {
        const txDate = dayjs(t.date);
        return txDate.isAfter(dayjs(dateRange.from).subtract(1, 'day')) &&
               txDate.isBefore(dayjs(dateRange.to).add(1, 'day'));
      });
    }

    setFiltered(filteredList);
  };

  useEffect(applyFilters, [typeFilter, categoryFilter, dateRange, transactions]);

  const formatAmount = (amount, type, currency) => {
    const sign = type === 'income' ? '+' : '–';
    const color = type === 'income' ? 'text-green-600' : 'text-red-600';
    return <span className={`font-semibold ${color}`}>{`${sign} ${amount} ${currency}`}</span>;
  };

  return (
    <div className="max-w-4xl mx-auto mt-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Транзакції</h1>

      {/* Фільтри */}
      <div className="bg-white rounded-xl shadow p-4 mb-6">
        <div className="flex flex-col md:flex-row md:items-end gap-4">
          {/* Тип */}
          <div className="w-full md:w-1/4">
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
          <div className="w-full md:w-1/3">
            <label className="block text-base text-gray-700 mb-1">Категорія</label>
            <input
              type="text"
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              placeholder="Наприклад: Продукти"
              className="w-full border rounded p-2 bg-gray-100"
            />
          </div>

          {/* Дата */}
          <div className="w-full md:flex-1">
            <label className="block text-base text-gray-700 mb-1">Діапазон дат</label>
            <DateRangePicker
              value={dateRange}
              onValueChange={setDateRange}
              enableSelect={false}
              maxDate={dayjs().toDate()}
              className="w-full bg-white border border-gray-300 rounded-md shadow-sm"
              placeholder="Виберіть діапазон"
            />
          </div>
        </div>
      </div>

      {/* Кнопка додавання транзакції */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => navigate('/transactions/new')}
          className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
        >
          + Додати транзакцію
        </button>
      </div>

      {/* Список транзакцій */}
      <div className="bg-white rounded-xl shadow p-6">
        {filtered.length === 0 ? (
          <p className="text-gray-500 text-center">Тут зʼявляться ваші транзакції.</p>
        ) : (
          <div className="space-y-4">
            {filtered.map((tx) => (
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
        onEdit={() => navigate(`/transactions/edit/${selectedTransaction._id}`)}
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
                })
                .catch(() => {
                    alert('Помилка при видаленні транзакції');
                });
        }}
      />
    </div>
  );
}