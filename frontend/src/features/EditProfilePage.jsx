import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate, useBeforeUnload } from 'react-router-dom';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
} from '@mui/material';

export default function EditProfilePage() {
  const [initialData, setInitialData] = useState(null);
  const [name, setName] = useState('');
  const [currency, setCurrency] = useState('UAH');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [successMsg, setSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const navigate = useNavigate();

  const hasChanges = () => {
    return (
      (initialData && name !== initialData.name) ||
      newPassword || currentPassword
    );
  };

  useBeforeUnload((e) => {
    if (hasChanges()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  const handleNavigateBack = () => {
    if (hasChanges()) {
      setIsDialogOpen(true);
    } else {
      navigate('/profile');
    }
  };

  const confirmNavigate = () => {
    setIsDialogOpen(false);
    navigate('/profile');
  };

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    axios.get('http://localhost:5000/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(res => {
        setInitialData(res.data);
        setName(res.data.name);
        setCurrency(res.data.currency);
      })
      .catch(() => {
        setErrors({ load: 'Не вдалося завантажити дані профілю' });
      });
  }, []);

  const validate = () => {
    const newErrors = {};
    if (newPassword || currentPassword) {
      if (!newPassword) {
        newErrors.password = "Введіть пароль";
      } else if (newPassword.length < 8) {
        newErrors.password = "Пароль має містити мінімум 8 символів";
      } else if (!/[A-Z]/.test(newPassword) || !/[a-z]/.test(newPassword) ||
                 !/[0-9]/.test(newPassword) || !/[!@#$%^&*]/.test(newPassword)) {
        newErrors.password = "Пароль має містити велику, малу літери, цифру та спеціальний символ";
      }
      if (!currentPassword) {
        newErrors.currentPassword = "Введіть поточний пароль";
      }
    }
    return newErrors;
  };

  const handleSave = async () => {
    setErrors({});
    setSuccessMsg('');
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    const token = localStorage.getItem('accessToken');

    // 1. Зміна імʼя
    const profileUpdates = {};
    if (name !== initialData.name) profileUpdates.name = name;

    try {
      if (Object.keys(profileUpdates).length > 0) {
        await axios.patch('http://localhost:5000/api/user/profile', profileUpdates, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      // 2. Зміна пароля
      if (newPassword && currentPassword) {
        await axios.patch('http://localhost:5000/api/user/change-password', {
          currentPassword,
          newPassword
        }, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      }

      setSuccessMsg('Зміни успішно збережено.');
      setCurrentPassword('');
      setNewPassword('');
      setInitialData({ ...initialData, name, currency });
    } catch (err) {
      setErrors({ submit: 'Помилка при збереженні. Перевірте введені дані.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 bg-white shadow-lg rounded-2xl p-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Редагування профілю</h1>

      {errors.load && <p className="text-red-600 mb-4">{errors.load}</p>}
      {successMsg && <p className="text-green-600 mb-4">{successMsg}</p>}
      {errors.submit && <p className="text-red-600 mb-4">{errors.submit}</p>}

      {/* Імʼя */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Імʼя</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-3 rounded bg-gray-100 border focus:outline-none"
        />
        <label>Виберіть базову валюту</label>
        <select
          value={currency}
          className="w-full p-3 rounded bg-gray-100 border focus:outline-none"
        >
          <option value="UAH">Гривня (UAH)</option>
          <option value="USD">Долар (USD)</option>
          <option value="EUR">Євро (EUR)</option>
        </select>
      </div>

      {/* Пароль */}
      <div><label></label></div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Зміна пароля</h2>

      <div className="mb-6">
        <label className="block font-medium mb-1">Поточний пароль</label>
        <input
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="w-full p-3 rounded bg-gray-100 border focus:outline-none"
        />
        {errors.currentPassword && <p className="text-sm text-red-500 mt-1">{errors.currentPassword}</p>}
      </div>

      <div className="mb-4">
        <label className="block font-medium mb-1">Новий пароль</label>
        <input
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full p-3 rounded bg-gray-100 border focus:outline-none"
        />
        {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
      </div>

      <div className="flex justify-between items-center">
        <button
          onClick={handleNavigateBack}
          className="text-gray-700 hover:underline"
        >
          Назад
        </button>
        <button
          onClick={handleSave}
          disabled={!hasChanges() || isSaving}
          className={`py-2 px-4 rounded text-white transition duration-200 ${
            hasChanges()
              ? 'bg-gray-800 hover:bg-gray-700'
              : 'bg-gray-400 cursor-not-allowed'
          }`}
        >
          Зберегти
        </button>
      </div>

      {/* Підтвердження виходу без збереження */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#2d2d2d',
            color: '#fff',
            borderRadius: 3,
            p: 2,
          }
        }}
      >
        <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
          Незбережені зміни
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#e0e0e0' }}>
            Ви маєте незбережені зміни. Вийти без збереження?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end' }}>
          <Button
            onClick={() => setIsDialogOpen(false)}
            sx={{
              color: '#fff',
              borderColor: '#fff',
              '&:hover': {
                backgroundColor: 'rgba(255,255,255,0.1)',
              }
            }}
          >
            Скасувати
          </Button>
          <Button
            onClick={confirmNavigate}
            variant="contained"
            color="error"
            sx={{ ml: 1 }}
          >
            Вийти
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
