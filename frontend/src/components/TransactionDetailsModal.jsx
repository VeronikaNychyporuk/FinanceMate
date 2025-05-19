import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import axios from 'axios';
import dayjs from 'dayjs';

export default function TransactionDetailsModal({
  open,
  onClose,
  transaction,
  onEdit,
  onConfirmDelete
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [baseCurrency, setBaseCurrency] = useState('');

  useEffect(() => {
    if (open) {
        const token = localStorage.getItem('accessToken');
        axios.get('http://localhost:5000/api/user/profile', {
            headers: { Authorization: `Bearer ${token}` }
        }).then(res => {
            setBaseCurrency(res.data.currency || 'UAH');
        });
    }
  }, [open]);

  if (!transaction) return null;

  const {
    amount, amountInBaseCurrency, currency, type, categoryId, date, note
  } = transaction;

  const isDifferentCurrency =
    amountInBaseCurrency && amountInBaseCurrency !== amount;

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Деталі транзакції</DialogTitle>
        <DialogContent className="bg-white space-y-4">
          <div className="text-gray-700">
            <span className="font-medium">Сума:</span>{' '}
            <span className={type === 'income' ? 'text-green-600' : 'text-red-600'}>
              {type === 'income' ? '+' : '–'} {amount} {currency}
            </span>
          </div>

          {isDifferentCurrency && (
            <div className="text-gray-700">
              <span className="font-medium">Сума у базовій валюті:</span>{' '}
              {amountInBaseCurrency} {baseCurrency}
            </div>
          )}

          <div className="text-gray-700">
            <span className="font-medium">Тип:</span>{' '}
            {type === 'income' ? 'Дохід' : 'Витрата'}
          </div>

          <div className="text-gray-700">
            <span className="font-medium">Категорія:</span>{' '}
            {categoryId?.name || 'Без категорії'}
          </div>

          <div className="text-gray-700">
            <span className="font-medium">Дата:</span>{' '}
            {dayjs(date).format('DD.MM.YYYY')}
          </div>

          {note && (
            <div className="text-gray-700">
              <span className="font-medium">Коментар:</span>{' '}
              {note}
            </div>
          )}
        </DialogContent>

        <DialogActions className="bg-white px-6 pb-4">
          <Button onClick={onClose} color="inherit">Закрити</Button>
          <Button onClick={onEdit} variant="outlined">Редагувати</Button>
          <Button
            onClick={() => setConfirmOpen(true)}
            variant="contained"
            color="error"
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>

      {/* Підтвердження видалення */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}
        PaperProps={{
            sx: {
            backgroundColor: '#2d2d2d',
            color: '#fff',
            borderRadius: 3,
            p: 2
            }
        }}>
        <DialogTitle sx={{ fontWeight: 600 }}>Підтвердження видалення</DialogTitle>
        <DialogContent>
          <p>Ви дійсно хочете видалити цю транзакцію?</p>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button onClick={() => setConfirmOpen(false)} color="inherit">Скасувати</Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              setConfirmOpen(false);
              onConfirmDelete?.();
            }}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}