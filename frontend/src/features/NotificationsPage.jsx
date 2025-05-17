import React, { useEffect, useState } from 'react';
import axios from 'axios';
import dayjs from 'dayjs';
import 'dayjs/locale/uk';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
} from '@mui/material';

dayjs.locale('uk');

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    axios.get('http://localhost:5000/api/notifications', {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => {
      const sorted = [...res.data].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setNotifications(sorted);
      setError('');
    })
    .catch(() => {
      setError('Не вдалося завантажити сповіщення');
    });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const unread = notifications.filter(n => n.status === 'unread');
    unread.forEach((n) => {
      axios.patch(`http://localhost:5000/api/notifications/${n.id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});
    });
  }, [notifications]);

  const openDeleteDialog = (id) => {
    setSelectedId(id);
    setDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    const token = localStorage.getItem('accessToken');
    axios.delete(`http://localhost:5000/api/notifications/${selectedId}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(() => {
      setNotifications(prev => prev.filter(n => n.id !== selectedId));
      setDialogOpen(false);
    })
    .catch(() => {
      setError('Не вдалося видалити сповіщення');
      setDialogOpen(false);
    });
  };

  return (
    <div className="max-w-3xl mx-auto mt-10">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Сповіщення</h1>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-6">
          {error}
        </div>
      )}

      {notifications.length === 0 ? (
        <p className="text-gray-600">Немає сповіщень</p>
      ) : (
        <div className="space-y-4">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`relative p-4 rounded-xl shadow ${
                n.status === 'unread' ? 'bg-white' : 'bg-gray-100'
              }`}
            >
              <span className="absolute top-3 right-4 text-sm text-gray-400">
                {dayjs(n.createdAt).format('D MMMM YYYY HH:mm')}
              </span>

              <div className="mt-6 text-gray-800">{n.message}</div>

              <div className="text-right mt-4">
                <button
                  onClick={() => openDeleteDialog(n.id)}
                  className="text-sm text-red-600 hover:underline"
                >
                  Видалити
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Діалог підтвердження видалення */}
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
          Підтвердження видалення
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#e0e0e0' }}>
            Ви дійсно хочете видалити це сповіщення? Цю дію не можна скасувати.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end' }}>
          <Button
            onClick={() => setDialogOpen(false)}
            sx={{
              color: '#fff',
              borderColor: '#fff',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' }
            }}
          >
            Скасувати
          </Button>
          <Button
            onClick={handleConfirmDelete}
            variant="contained"
            color="error"
            sx={{ ml: 1 }}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}