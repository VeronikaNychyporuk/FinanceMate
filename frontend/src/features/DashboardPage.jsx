import React from 'react';

export default function DashboardPage() {
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Вітаємо у FinanceMate!</h1>
      <p className="text-gray-600">
        Це ваша головна панель керування. Тут зʼявиться огляд фінансів, останні транзакції,
        діаграми та аналітика.
      </p>
    </div>
  );
}
