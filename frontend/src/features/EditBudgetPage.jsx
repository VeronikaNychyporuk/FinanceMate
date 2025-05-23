import React, { useEffect, useState } from 'react';
import {
  TextField, Button, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { useNavigate, useParams, useBeforeUnload } from 'react-router-dom';
import dayjs from 'dayjs';
import axios from 'axios';

export default function EditBudgetPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const now = dayjs();

  const [initial, setInitial] = useState(null);
  const [totalLimit, setTotalLimit] = useState('');
  const [month, setMonth] = useState(now.month() + 1);
  const [year, setYear] = useState(now.year());
  const [categories, setCategories] = useState([]);
  const [categoryLimits, setCategoryLimits] = useState([]);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  useBeforeUnload((e) => {
    if (hasChanges()) {
      e.preventDefault();
      e.returnValue = '';
    }
  });

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    const fetchData = async () => {
      try {
        const [budgetsRes, categoriesRes] = await Promise.all([
          axios.get('http://localhost:5000/api/budgets', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5000/api/categories', {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        const allCategories = categoriesRes.data.filter(cat => cat.type === 'expense');
        setCategories(allCategories);

        const found = budgetsRes.data.find(b => b._id === id);
        if (!found) {
          setSubmitError('Бюджет не знайдено');
          return;
        }

        setInitial(found);
        setTotalLimit(found.totalLimit.toString());
        setMonth(found.period.month);
        setYear(found.period.year);
        setCategoryLimits(
          found.categoryLimits.map((cl) => ({
            categoryId: cl.categoryId._id || cl.categoryId,
            limit: cl.limit.toString()
          }))
        );
      } catch (err) {
        setSubmitError('Помилка при завантаженні даних бюджету');
      }
    };

    fetchData();
  }, [id]);

  const hasChanges = () => {
    if (!initial) return false;

    const totalLimitChanged = Number(totalLimit) !== initial.totalLimit;
    const monthChanged = Number(month) !== initial.period.month;
    const yearChanged = Number(year) !== initial.period.year;

    const limitsChanged = categoryLimits.length !== initial.categoryLimits.length ||
      categoryLimits.some((cl, i) =>
        cl.categoryId !== (initial.categoryLimits[i]?.categoryId._id || initial.categoryLimits[i]?.categoryId) ||
        Number(cl.limit) !== initial.categoryLimits[i]?.limit
      );

    return totalLimitChanged || monthChanged || yearChanged || limitsChanged;
  };

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
        newErrors[`limit-${i}`] = 'Введіть коректну суму (> 0)';
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

  const handleRemoveCategory = (index) => {
    const updated = [...categoryLimits];
    updated.splice(index, 1);
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

    const updated = {};

    if (Number(totalLimit) !== initial.totalLimit) {
      updated.totalLimit = Number(totalLimit);
    }

    if (Number(month) !== initial.period.month || Number(year) !== initial.period.year) {
      updated.period = {
        month: Number(month),
        year: Number(year)
      };
    }

    const mappedLimits = categoryLimits.map((cl) => ({
      categoryId: cl.categoryId,
      limit: Number(cl.limit)
    }));

    const originalMapped = initial.categoryLimits.map((cl) => ({
      categoryId: cl.categoryId._id || cl.categoryId,
      limit: cl.limit
    }));

    const limitsChanged = JSON.stringify(mappedLimits) !== JSON.stringify(originalMapped);
    if (limitsChanged) {
      updated.categoryLimits = mappedLimits;
    }

    if (Object.keys(updated).length === 0) return;

    try {
      await axios.patch(`http://localhost:5000/api/budgets/${id}`, updated, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      navigate('/budgets');
    } catch (err) {
      const msg = err.response?.data?.message || 'Не вдалося оновити бюджет';
      setSubmitError(msg);
    }
  };

  const handleBack = () => {
    if (hasChanges()) {
      setDialogOpen(true);
    } else {
      navigate('/budgets');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white shadow-lg rounded-2xl p-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Редагування бюджету</h1>

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
              <div key={index} className="flex gap-3 items-start">
                <TextField
                  select
                  label="Категорія"
                  value={cl.categoryId}
                  onChange={(e) =>
                    handleCategoryChange(index, 'categoryId', e.target.value)
                  }
                  className="w-2/5"
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
                  className="w-2/5"
                  error={!!errors[`limit-${index}`]}
                  helperText={errors[`limit-${index}`]}
                />

                <button
                  onClick={() => handleRemoveCategory(index)}
                  className="text-red-600 hover:underline text-sm mt-3"
                  type="button"
                >
                  Видалити
                </button>
              </div>
            );
          })}
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
            onClick={() => navigate('/budgets')}
          >
            Вийти
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
