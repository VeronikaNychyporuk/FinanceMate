import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export default function ProfilePage() {
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    axios.get('http://localhost:5000/api/user/profile', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    })
    .then(res => {
      setProfile(res.data);
      setError('');
    })
    .catch(() => {
      setError('Не вдалося завантажити дані профілю');
    });
  }, []);

  return (
    <div className="max-w-md mx-auto mt-10 bg-white shadow-lg rounded-2xl p-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Профіль</h1>

      {error && (
        <div className="text-red-600 bg-red-100 p-3 rounded mb-4 text-sm">
          {error}
        </div>
      )}

      {!profile ? (
        <p className="text-gray-600">Завантаження...</p>
      ) : (
        <>
          <div className="space-y-4 text-gray-700 mb-8">
            <div>
              <span className="font-medium text-gray-800">Ім’я: </span>
              {profile.name}
            </div>
            <div>
              <span className="font-medium text-gray-800">Email: </span>
              {profile.email}
            </div>
            <div>
              <span className="font-medium text-gray-800">Валюта: </span>
              {profile.currency}
            </div>
          </div>

          <div className="text-right">
            <button
              onClick={() => navigate('/settings')}
              className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded transition-colors duration-200"
            >
              Редагувати
            </button>
          </div>
        </>
      )}
    </div>
  );
}
