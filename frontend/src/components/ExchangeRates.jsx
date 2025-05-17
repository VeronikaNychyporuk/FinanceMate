import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ExchangeRates() {
  const [rates, setRates] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    axios.get('http://localhost:5000/api/exchange-rates')
      .then(response => {
        setRates(response.data);
        setError('');
      })
      .catch(() => {
        setError('Не вдалося завантажити курс валют');
      });
  }, []);

  if (error) {
    return (
      <div className="mt-10 max-w-4xl mx-auto p-4 bg-red-100 text-red-800 rounded-xl shadow text-center">
        {error}
      </div>
    );
  }

  if (!rates) {
    return (
      <div className="mt-10 max-w-4xl mx-auto p-4 bg-gray-100 text-gray-600 rounded-xl shadow text-center">
        Завантаження курсу валют...
      </div>
    );
  }

  return (
    <div className="mt-10 max-w-4xl mx-auto p-4 bg-gray-100 rounded-xl shadow text-center">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Курс валют</h2>
      <p className="text-gray-700">USD: {rates.USD.toFixed(2)} грн</p>
      <p className="text-gray-700">EUR: {rates.EUR.toFixed(2)} грн</p>
    </div>
  );
}
