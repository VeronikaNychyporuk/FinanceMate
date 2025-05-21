import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button
} from '@mui/material';
import axios from 'axios';
import dayjs from 'dayjs';

export default function GoalTransactionDetailsModal({
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
    amount, amountInBaseCurrency, currency, type, date, note
  } = transaction;

  const isDifferentCurrency =
    amountInBaseCurrency && amountInBaseCurrency !== amount;

  const formattedAmount = (
    <span className={type === 'deposit' ? 'text-green-600' : 'text-red-600'}>
      {type === 'deposit' ? '+' : '–'} {amount} {currency}
    </span>
  );

  return (
    <>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>Деталі транзакції цілі</DialogTitle>
        <DialogContent className="bg-white space-y-4">
          <div className="text-gray-700">
            <span className="font-medium">Сума:</span> {formattedAmount}
          </div>

          {isDifferentCurrency && (
            <div className="text-gray-700">
              <span className="font-medium">Сума у базовій валюті:</span>{' '}
              {amountInBaseCurrency} {baseCurrency}
            </div>
          )}

          <div className="text-gray-700">
            <span className="font-medium">Тип:</span>{' '}
            {type === 'deposit' ? 'Поповнення' : 'Зняття'}
          </div>

          <div className="text-gray-700">
            <span className="font-medium">Дата:</span>{' '}
            {dayjs(date).format('DD.MM.YYYY')}
          </div>

          {note && (
            <div className="text-gray-700">
              <span className="font-medium">Коментар:</span> {note}
            </div>
          )}
        </DialogContent>

        <DialogActions className="bg-white px-6 pb-4">
          <button
            onClick={onClose}
            className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
          >Закрити</button>
          <button
            onClick={() => setConfirmOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
          >Видалити</button>
        </DialogActions>
      </Dialog>

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
