import React, { useEffect, useState } from 'react';
import {
  TextField, Button, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import axios from 'axios';

export default function AddBudgetPage() {
  const navigate = useNavigate();
  const now = dayjs();
  const [totalLimit, setTotalLimit] = useState('');
  const [month, setMonth] = useState(now.month() + 1);
  const [year, setYear] = useState(now.year());
  const [categories, setCategories] = useState([]);
  const [categoryLimits, setCategoryLimits] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    axios.get('http://localhost:5000/api/categories', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => setCategories(res.data.filter(cat => cat.type === 'expense')));
  }, []);

  useEffect(() => {
    const now = dayjs();
    setIsTouched(
      totalLimit !== '' ||
      categoryLimits.length > 0 ||
      month !== now.month() + 1 ||
      year !== now.year()
    );
  }, [totalLimit, categoryLimits, month, year]);

  const validate = () => {
    const newErrors = {};
    if (!totalLimit || isNaN(totalLimit) || Number(totalLimit) < 0.01) {
      newErrors.totalLimit = 'Введіть коректну суму (не менше 0.01)';
    }

    categoryLimits.forEach((cl, i) => {
      if (!cl.categoryId) {
        newErrors[`category-${i}`] = 'Оберіть категорію';
      }
      if (!cl.limit || isNaN(cl.limit) || Number(cl.limit) < 0.01) {
        newErrors[`limit-${i}`] = 'Введіть коректну суму (>0)';
      }
    });

    return newErrors;
  };

  const handleAddCategoryLimit = () => {
    setCategoryLimits([...categoryLimits, { categoryId: '', limit: '' }]);
  };

  const handleCategoryChange = (index, field, value) => {
    const updated = [...categoryLimits];
    updated[index][field] = value;
    setCategoryLimits(updated);
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

    const filteredLimits = categoryLimits
      .filter(cl => cl.categoryId && cl.limit && Number(cl.limit) > 0);

    const data = {
      totalLimit: Number(totalLimit),
      period: {
        month,
        year
      },
      categoryLimits: filteredLimits.map(cl => ({
        categoryId: cl.categoryId,
        limit: Number(cl.limit)
      }))
    };

    try {
      await axios.post('http://localhost:5000/api/budgets', data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      navigate('/budgets');
    } catch (err) {
      const msg = err.response?.data?.message || 'Не вдалося створити бюджет';
      setSubmitError(msg);
    }
  };

  const handleBack = () => {
    if (isTouched) setDialogOpen(true);
    else navigate('/budgets');
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white shadow-lg rounded-2xl p-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Новий бюджет</h1>

      {submitError && <p className="text-red-600 mb-4">{submitError}</p>}

      <div className="space-y-5">
        <TextField
          label="Загальний ліміт"
          fullWidth
          value={totalLimit}
          onChange={(e) => setTotalLimit(e.target.value)}
          error={!!errors.totalLimit}
          helperText={errors.totalLimit}
        />

        <div className="flex gap-4">
          <TextField
            select
            label="Місяць"
            value={month}
            onChange={(e) => setMonth(Number(e.target.value))}
            className="w-1/2"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <MenuItem key={i + 1} value={i + 1}>
                {dayjs(`${i + 1}`, 'M').format('MMMM')}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            label="Рік"
            type="number"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="w-1/2"
          />
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-700">Ліміти по категоріях</h2>
            <button
              onClick={handleAddCategoryLimit}
              className="text-sm text-blue-600 hover:underline"
            >
              + Додати категорію
            </button>
          </div>

          {categoryLimits.map((cl, index) => {
            const usedCategoryIds = categoryLimits
              .filter((_, i) => i !== index)
              .map((c) => c.categoryId);

            const availableCategories = categories.filter(
              (cat) => !usedCategoryIds.includes(cat._id)
            );

            return (
              <div key={index} className="flex gap-3 items-center">
                <TextField
                  select
                  label="Категорія"
                  value={cl.categoryId}
                  onChange={(e) =>
                    handleCategoryChange(index, 'categoryId', e.target.value)
                  }
                  className="w-2/3"
                  error={!!errors[`category-${index}`]}
                  helperText={errors[`category-${index}`]}
                >
                  {availableCategories.map((cat) => (
                    <MenuItem key={cat._id} value={cat._id}>
                      {cat.name}
                    </MenuItem>
                  ))}
                </TextField>

                <TextField
                  label="Ліміт"
                  type="number"
                  value={cl.limit}
                  onChange={(e) =>
                    handleCategoryChange(index, 'limit', e.target.value)
                  }
                  className="w-1/3"
                  error={!!errors[`limit-${index}`]}
                  helperText={errors[`limit-${index}`]}
                />
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex justify-between items-center mt-8">
        <Button onClick={handleBack} color="inherit">Назад</Button>
        <button
          onClick={handleSubmit}
          className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
        >
          Створити
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
            onClick={() => navigate('/budgets')}
          >
            Вийти
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
