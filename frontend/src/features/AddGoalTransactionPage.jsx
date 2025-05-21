import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  TextField, MenuItem, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { DatePicker } from '@tremor/react';
import axios from 'axios';
import dayjs from 'dayjs';

export default function AddGoalTransactionPage() {
  const { id: goalId } = useParams();
  const navigate = useNavigate();

  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('');
  const [type, setType] = useState('deposit');
  const [date, setDate] = useState(dayjs().toDate());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  useEffect(() => {
    const hasChanges =
      amount.trim() !== '' ||
      note.trim() !== '' ||
      currency !== 'UAH' ||
      type !== 'deposit' ||
      !dayjs(date).isSame(dayjs(), 'day');

    setIsTouched(hasChanges);
  }, [amount, currency, type, date, note]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    axios.get('http://localhost:5000/api/user/profile', {
        headers: { Authorization: `Bearer ${token}` }
    }).then((res) => {
        setCurrency(res.data.currency || 'UAH');
    });
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!amount || isNaN(amount) || Number(amount) < 0.01) {
      newErrors.amount = 'Введіть коректну суму (не менше 0.01)';
    }
    if (!currency) newErrors.currency = 'Оберіть валюту';
    if (!type) newErrors.type = 'Оберіть тип операції';
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
      amount: Number(amount),
      currency,
      type,
      date: dayjs(date).format('YYYY-MM-DD'),
      note: note.trim(),
    };

    try {
      await axios.post(`http://localhost:5000/api/goals/${goalId}/transactions`, data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      navigate(`/goals/${goalId}`);
    } catch (err) {
      const msg = err.response?.data?.message || 'Не вдалося створити транзакцію';
      setSubmitError(msg);
    }
  };

  const handleBack = () => {
    if (isTouched) {
      setDialogOpen(true);
    } else {
      navigate(`/goals/${goalId}`);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white shadow-lg rounded-2xl p-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Нова транзакція цілі</h1>

      {submitError && <p className="text-red-600 mb-4">{submitError}</p>}

      <div className="space-y-5">
        <TextField
          label="Сума"
          fullWidth
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={!!errors.amount}
          helperText={errors.amount}
        />

        <TextField
          select
          label="Валюта"
          fullWidth
          value={currency}
          onChange={(e) => setCurrency(e.target.value)}
          error={!!errors.currency}
          helperText={errors.currency}
        >
          <MenuItem value="UAH">Гривня (UAH)</MenuItem>
          <MenuItem value="USD">Долар (USD)</MenuItem>
          <MenuItem value="EUR">Євро (EUR)</MenuItem>
        </TextField>

        <TextField
          select
          label="Тип операції"
          fullWidth
          value={type}
          onChange={(e) => setType(e.target.value)}
          error={!!errors.type}
          helperText={errors.type}
        >
          <MenuItem value="deposit">Поповнення</MenuItem>
          <MenuItem value="withdrawal">Зняття</MenuItem>
        </TextField>

        <div>
          <label className="block text-sm text-gray-700 mb-1">Дата</label>
          <DatePicker
            value={date}
            onValueChange={setDate}
            maxDate={dayjs().toDate()}
            className="w-full bg-white border border-gray-300 rounded-md shadow-sm"
          />
        </div>

        <TextField
          label="Коментар (необов’язково)"
          fullWidth
          value={note}
          onChange={(e) => setNote(e.target.value)}
          multiline
          minRows={2}
        />
      </div>

      <div className="flex justify-between items-center mt-8">
        <Button onClick={handleBack} color="inherit">
          Назад
        </Button>
        <button
          onClick={handleSubmit}
          className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
        >
          Створити
        </button>
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
            onClick={() => navigate(`/goals/${goalId}`)}
          >
            Вийти
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}