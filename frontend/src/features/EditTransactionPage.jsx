import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, useBeforeUnload, useLocation } from 'react-router-dom';
import {
  TextField, MenuItem, Button, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { DatePicker } from '@tremor/react';
import dayjs from 'dayjs';
import axios from 'axios';

export default function EditTransactionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || 'transactions';

  const [initialData, setInitialData] = useState(null);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('UAH');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [date, setDate] = useState(new Date());
  const [note, setNote] = useState('');
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
    const categoryChanged = selectedCategory
        ? selectedCategory._id !== initialData.categoryId
        : false;

    return (
        Number(amount) !== initialData.amount ||
        currency !== initialData.currency ||
        note.trim() !== (initialData.note || '') ||
        dayjs(date).format('YYYY-MM-DD') !== dayjs(initialData.date).format('YYYY-MM-DD') ||
        categoryChanged
    );
  };

  useEffect(() => {
    const fetchData = async () => {
        try {
            const token = localStorage.getItem('accessToken');

            const [txRes, catRes] = await Promise.all([
                axios.get(`http://localhost:5000/api/transactions/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get('http://localhost:5000/api/categories', {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            const tx = txRes.data;
            const allCats = catRes.data;

            const found = allCats.find((cat) => cat._id === tx.categoryId);

            setCategories(allCats);
            setInitialData(tx);
            setAmount(tx.amount.toString());
            setCurrency(tx.currency);
            setDate(dayjs(tx.date).toDate());
            setNote(tx.note || '');
            setSelectedCategory(found || null);
        } catch {
            setSubmitError('Не вдалося завантажити дані для редагування');
        }
    };

    fetchData();
  }, [id]);


  const validate = () => {
    const newErrors = {};
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      newErrors.amount = 'Введіть коректну суму';
    }
    if (!currency) newErrors.currency = 'Оберіть валюту';
    if (!date) newErrors.date = 'Оберіть дату';
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

    if (Number(amount) !== initialData.amount) {
        updated.amount = Number(amount);
    }

    if (currency !== initialData.currency) {
        updated.currency = currency;
    }

    if (note.trim() !== (initialData.note || '')) {
        updated.note = note.trim();
    }

    if (dayjs(date).format('YYYY-MM-DD') !== dayjs(initialData.date).format('YYYY-MM-DD')) {
        updated.date = dayjs(date).format('YYYY-MM-DD');
    }

    // Категорія змінена
    if (
        selectedCategory &&
        selectedCategory._id !== initialData.categoryId
    ) {
        updated.categoryId = selectedCategory._id;
    }

    try {
        await axios.patch(`http://localhost:5000/api/transactions/${id}`, updated, {
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
        });
        navigate( from.startsWith('/budgets') || from === 'budgets'
          ? from
          : '/transactions');
    } catch (err) {
        const msg = err.response?.data?.message || 'Не вдалося оновити транзакцію';
        setSubmitError(msg);
    }
  };


  const handleBack = () => {
    if (hasChanges()) {
      setDialogOpen(true);
    } else {
      navigate( from.startsWith('/budgets') || from === 'budgets'
          ? from
          : '/transactions');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white shadow-lg rounded-2xl p-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Редагування транзакції</h1>

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

        <Autocomplete
          options={categories}
          getOptionLabel={(option) =>
            `${option.name} (${option.type === 'income' ? 'дохід' : 'витрата'})`
          }
          filterOptions={(options, state) =>
            options.filter((option) =>
              option.name.toLowerCase().includes(state.inputValue.toLowerCase())
            )
          }
          value={selectedCategory}
          onChange={(e, newValue) => setSelectedCategory(newValue)}
          renderInput={(params) => (
            <TextField
              {...params}
              label="Категорія"
              fullWidth
              error={!!errors.category}
              helperText={errors.category}
            />
          )}
          isOptionEqualToValue={(option, value) => option._id === value._id}
        />

        <div>
          <label className="block text-sm text-gray-700 mb-1">Дата</label>
          <DatePicker
            value={date}
            onValueChange={setDate}
            maxDate={dayjs().toDate()}
            className="w-full bg-white border border-gray-300 rounded-md shadow-sm"
          />
          {errors.date && (
            <p className="text-sm text-red-500 mt-1">{errors.date}</p>
          )}
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
        <Button onClick={handleBack} color="inherit">Назад</Button>
        <button onClick={handleSubmit} disabled={!hasChanges()}
            className="bg-gray-800 hover:bg-gray-700 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded"
        >Зберегти</button>
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
            onClick={() => navigate( from.startsWith('/budgets') || from === 'budgets'
              ? from
              : '/transactions')}
          >
            Вийти
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
