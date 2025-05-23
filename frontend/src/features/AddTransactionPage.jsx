import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  TextField, MenuItem, Button, Autocomplete, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { DatePicker } from '@tremor/react';
import dayjs from 'dayjs';
import axios from 'axios';
import AddCategoryModal from '../components/AddCategoryModal';

export default function AddTransactionPage() {
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('UAH');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categories, setCategories] = useState([]);
  const [date, setDate] = useState(dayjs().toDate());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [openCategoryModal, setOpenCategoryModal] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isTouched, setIsTouched] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || 'transactions';

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    axios.get('http://localhost:5000/api/user/profile', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setCurrency(res.data.currency || 'UAH');
    });

    axios.get('http://localhost:5000/api/categories', {
      headers: { Authorization: `Bearer ${token}` }
    }).then(res => {
      setCategories(res.data);
    });
  }, []);

  useEffect(() => {
    const hasChanges =
      amount !== '' ||
      currency !== 'UAH' ||
      note.trim() !== '' ||
      selectedCategory !== null ||
      !dayjs(date).isSame(dayjs(), 'day');

    setIsTouched(hasChanges);
  }, [amount, currency, selectedCategory, note, date]);

  const validate = () => {
    const newErrors = {};
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      newErrors.amount = 'Введіть коректну суму';
    }
    if (!currency) newErrors.currency = 'Оберіть валюту';
    if (!selectedCategory) newErrors.category = 'Оберіть категорію';
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

    const data = {
      amount: Number(amount),
      currency,
      type: selectedCategory.type,
      categoryId: selectedCategory._id,
      date: dayjs(date).format('YYYY-MM-DD'),
    };
    if (note.trim()) data.note = note.trim();

    try {
      await axios.post('http://localhost:5000/api/transactions', data, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      navigate(from === 'budget' ? '/budgets' : '/transactions');
    } catch (err) {
      const msg = err.response?.data?.message || 'Не вдалося створити транзакцію';
      setSubmitError(msg);
    }
  };

  const handleBack = () => {
    if (isTouched) {
      setDialogOpen(true);
    } else {
      navigate(from === 'budget' ? '/budgets' : '/transactions');
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-10 bg-white shadow-lg rounded-2xl p-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Нова транзакція</h1>

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
        <div className="text-right -mt-3">
          <button
            onClick={() => setOpenCategoryModal(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            + Додати категорію
          </button>
        </div>

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
        <Button onClick={handleBack} color="inherit">
          Назад
        </Button>
        <button
            onClick={handleSubmit}
            className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
        >Створити</button>
      </div>

      <AddCategoryModal
        open={openCategoryModal}
        onClose={() => setOpenCategoryModal(false)}
        onSuccess={(newCategory) => {
          setCategories((prev) => [...prev, newCategory]);
          setSelectedCategory(newCategory);
        }}
      />

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
            onClick={() => navigate(from === 'budget' ? '/budgets' : '/transactions')}
          >
            Вийти
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}