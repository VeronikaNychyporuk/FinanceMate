import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useBeforeUnload } from 'react-router-dom';
import {
  TextField, Button, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { DatePicker } from '@tremor/react';
import dayjs from 'dayjs';
import axios from 'axios';

export default function EditGoalPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [initialData, setInitialData] = useState(null);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [deadline, setDeadline] = useState(null);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useBeforeUnload((e) => {
    if (hasChanges()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  const hasChanges = () => {
    if (!initialData) return false;
    return (
      name.trim() !== initialData.name ||
      Number(targetAmount) !== initialData.targetAmount ||
      dayjs(deadline).format('YYYY-MM-DD') !== dayjs(initialData.deadline).format('YYYY-MM-DD')
    );
  };

  useEffect(() => {
    const fetchGoal = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        const res = await axios.get(`http://localhost:5000/api/goals/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const goal = res.data;

        setInitialData(goal);
        setName(goal.name);
        setTargetAmount(goal.targetAmount.toString());
        setDeadline(dayjs(goal.deadline).toDate());
      } catch {
        setSubmitError('Не вдалося завантажити ціль');
      }
    };

    fetchGoal();
  }, [id]);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) {
      newErrors.name = 'Введіть назву цілі';
    } else if (name.length < 2 || name.length > 100) {
      newErrors.name = 'Назва має бути від 2 до 100 символів';
    }

    if (!targetAmount || isNaN(targetAmount) || Number(targetAmount) < 0.01) {
      newErrors.targetAmount = 'Сума має бути не менше 0.01';
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

    const updated = {};
    if (name.trim() !== initialData.name) updated.name = name.trim();
    if (Number(targetAmount) !== initialData.targetAmount) updated.targetAmount = Number(targetAmount);
    if (
      dayjs(deadline).format('YYYY-MM-DD') !==
      dayjs(initialData.deadline).format('YYYY-MM-DD')
    ) {
      updated.deadline = dayjs(deadline).format('YYYY-MM-DD');
    }

    if (Object.keys(updated).length === 0) return;

    try {
      await axios.patch(`http://localhost:5000/api/goals/${id}`, updated, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      navigate('/goals');
    } catch (err) {
      const msg = err.response?.data?.message || 'Не вдалося оновити ціль';
      setSubmitError(msg);
    }
  };

  const handleBack = () => {
    if (hasChanges()) {
      setDialogOpen(true);
    } else {
      navigate('/goals');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white shadow-lg rounded-2xl p-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Редагування цілі</h1>

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
        <Button onClick={handleBack} color="inherit">Назад</Button>
        <button
          onClick={handleSubmit}
          disabled={!hasChanges()}
          className="bg-gray-800 hover:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded"
        >
          Зберегти
        </button>
      </div>

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
