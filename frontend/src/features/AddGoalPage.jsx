import React, { useState, useEffect } from 'react';
import { TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { DatePicker } from '@tremor/react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';

export default function AddGoalPage() {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  const navigate = useNavigate();

  // Виявлення змін
  useEffect(() => {
    const hasChanges =
      name.trim() !== '' ||
      targetAmount.trim() !== '' ||
      deadline !== null;

    setIsTouched(hasChanges);
  }, [name, targetAmount, deadline]);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Введіть назву цілі';
    } else if (name.length < 2 || name.length > 100) {
      newErrors.name = 'Назва має бути від 2 до 100 символів';
    }

    if (!targetAmount || isNaN(targetAmount) || Number(targetAmount) < 0.01) {
      newErrors.targetAmount = 'Введіть коректну суму (не менше 0.01)';
    }

    if (!deadline || dayjs(deadline).isBefore(dayjs(), 'day')) {
      newErrors.deadline = 'Оберіть дату в майбутньому';
    }

    return newErrors;
  };

  const handleSubmit = async () => {
    const token = localStorage.getItem('accessToken');
    setErrors({});
    setSubmitError('');

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const data = {
      name: name.trim(),
      targetAmount: Number(targetAmount),
      deadline: dayjs(deadline).format('YYYY-MM-DD'),
    };

    try {
      await axios.post('http://localhost:5000/api/goals', data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      navigate('/goals');
    } catch (err) {
      const msg = err.response?.data?.message || 'Не вдалося створити ціль';
      setSubmitError(msg);
    }
  };

  const handleBack = () => {
    if (isTouched) {
      setDialogOpen(true);
    } else {
      navigate('/goals');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white shadow-lg rounded-2xl p-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Нова фінансова ціль</h1>

      {submitError && <p className="text-red-600 mb-4">{submitError}</p>}

      <div className="space-y-5">
        <TextField
          label="Назва"
          fullWidth
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
        />

        <TextField
          label="Цільова сума"
          fullWidth
          value={targetAmount}
          onChange={(e) => setTargetAmount(e.target.value)}
          error={!!errors.targetAmount}
          helperText={errors.targetAmount}
        />

        <div>
          <label className="block text-sm text-gray-700 mb-1">Кінцева дата</label>
          <DatePicker
            value={deadline}
            onValueChange={setDeadline}
            minDate={dayjs().add(1, 'day').toDate()}
            className="w-full bg-white border border-gray-300 rounded-md shadow-sm"
          />
          {errors.deadline && (
            <p className="text-sm text-red-500 mt-1">{errors.deadline}</p>
          )}
        </div>
      </div>

      <div className="flex justify-between items-center mt-8">
        <Button onClick={handleBack} color="inherit">
          Назад
        </Button>
        <button
            onClick={handleSubmit}
            className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
        >Створити</button>
      </div>

      {/* Діалог підтвердження */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#2d2d2d',
            color: '#fff',
            borderRadius: 3,
            p: 2
          }
        }}
      >
        <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
          Незбережені зміни
        </DialogTitle>
        <DialogContent>
          <p>У вас є незбережені зміни. Вийти без збереження?</p>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end' }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#fff' }}>
            Скасувати
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => navigate('/goals')}
          >
            Вийти
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}