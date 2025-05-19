import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, MenuItem, TextField
} from '@mui/material';
import axios from 'axios';

export default function AddCategoryModal({ open, onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [type, setType] = useState('expense');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    if (!name.trim()) newErrors.name = 'Введіть назву категорії';
    if (!['income', 'expense'].includes(type)) newErrors.type = 'Оберіть тип';
    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsLoading(true);
    const token = localStorage.getItem('accessToken');

    try {
      const res = await axios.post('http://localhost:5000/api/categories', {
        name: name.trim(),
        type
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (onSuccess) onSuccess(res.data); // передаємо створену категорію назад
      setName('');
      setType('expense');
      setErrors({});
      onClose(); // закриваємо вікно
      } catch (err) {
          let message = 'Не вдалося створити категорію';
          if (
              err.response &&
              err.response.data &&
              typeof err.response.data.message === 'string'
          ) {
              message += `: ${err.response.data.message}`;
          }
          setErrors({ submit: message });
      } finally {
          setIsLoading(false);
      }
  };

  const handleClose = () => {
    setErrors({});
    setName('');
    setType('expense');
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Додати категорію</DialogTitle>
      <DialogContent className="bg-white">
        {errors.submit && (
          <p className="text-red-600 text-sm mb-4">{errors.submit}</p>
        )}
        <div className="space-y-4 mt-2">
          <TextField
            label="Назва категорії"
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
          />
          <TextField
            select
            label="Тип"
            fullWidth
            value={type}
            onChange={(e) => setType(e.target.value)}
            error={!!errors.type}
            helperText={errors.type}
          >
            <MenuItem value="expense">Витрата</MenuItem>
            <MenuItem value="income">Дохід</MenuItem>
          </TextField>
        </div>
      </DialogContent>
      <DialogActions className="bg-white px-6 pb-4">
        <Button onClick={handleClose} color="inherit">
          Скасувати
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={isLoading}
        >
          Створити
        </Button>
      </DialogActions>
    </Dialog>
  );
}
