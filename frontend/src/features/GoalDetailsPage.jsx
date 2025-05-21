import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import dayjs from 'dayjs';
import GoalTransactionDetailsModal from '../components/GoalTransactionDetailsModal';
import CustomProgressBar from '../components/CustomProgressBar';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';

export default function GoalDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [goal, setGoal] = useState(null);
  const [currency, setCurrency] = useState('UAH');
  const [transactions, setTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    const fetchData = async () => {
      try {
        const [goalRes, profileRes, txRes] = await Promise.all([
          axios.get(`http://localhost:5000/api/goals/${id}`, {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get('http://localhost:5000/api/user/profile', {
            headers: { Authorization: `Bearer ${token}` }
          }),
          axios.get(`http://localhost:5000/api/goals/${id}/transactions`, {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);

        setGoal(goalRes.data);
        setCurrency(profileRes.data.currency || 'UAH');
        const sortedTx = txRes.data.sort((a, b) => new Date(b.date) - new Date(a.date));
        setTransactions(sortedTx);
      } catch (err) {
        console.error('Помилка при завантаженні:', err);
      }
    };

    fetchData();
  }, [id]);

  const formatAmount = (amount, type, curr) => {
    const sign = type === 'deposit' ? '+' : '–';
    const color = type === 'deposit' ? 'text-green-600' : 'text-red-600';
    return <span className={`font-semibold ${color}`}>{`${sign} ${amount} ${curr}`}</span>;
  };

  const handleEdit = () => {
    navigate(`/goals/edit/${id}`);
  };

  const handleDeleteConfirmed = async () => {
    const token = localStorage.getItem('accessToken');
    try {
      await axios.delete(`http://localhost:5000/api/goals/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      navigate('/goals');
    } catch {
      alert('Помилка при видаленні цілі');
    }
  };

  if (!goal) {
    return <div className="text-center mt-20 text-gray-500">Завантаження...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto mt-10 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">{goal.name}</h1>
        <div className="flex gap-3">
          <button
            onClick={handleEdit}
            className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
          >Редагувати</button>
          <button
            onClick={() => setConfirmOpen(true)}
            className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded"
          >Видалити</button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow p-6 space-y-2 text-gray-700 text-base">
        <p><strong>Дата створення:</strong> {dayjs(goal.createdAt).format('DD.MM.YYYY')}</p>
        <p><strong>Кінцева дата:</strong> {dayjs(goal.deadline).format('DD.MM.YYYY')}</p>
        <p><strong>Цільова сума:</strong> {goal.targetAmount} {currency}</p>
        <p><strong>Накопичено:</strong> {goal.currentAmount} {currency}</p>
      </div>

      <CustomProgressBar
        value={goal.progress}
        color={
          goal.status === 'achieved'
            ? 'green'
            : goal.status === 'in_progress' && dayjs(goal.deadline).isBefore(dayjs())
            ? 'red'
            : 'blue'
        }
      />

      <div className="flex justify-between items-center mt-6">
        <h2 className="text-xl font-semibold text-gray-800">Транзакції</h2>
        <button
          onClick={() => navigate(`/goals/${id}/transactions/new`)}
          className="bg-gray-800 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded"
        >+ Додати транзакцію</button>
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        {transactions.length === 0 ? (
          <p className="text-gray-500 text-center">Тут зʼявляться ваші транзакції.</p>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx) => (
              <div key={tx._id} className="border-b pb-3">
                <div className="flex justify-between items-center">
                  {formatAmount(tx.amount, tx.type, tx.currency)}
                  <div className="text-base text-gray-500">
                    {dayjs(tx.date).format('DD.MM.YYYY')}
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-base text-gray-700 mt-1">
                    {tx.note || 'Без коментаря'}
                  </div>
                  <div className="text-sm text-gray-500">
                    <button
                      onClick={() => setSelectedTransaction(tx)}
                      className="block text-blue-600 text-base mt-1 hover:underline"
                    >
                      Детальніше
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <GoalTransactionDetailsModal
        open={!!selectedTransaction}
        transaction={selectedTransaction}
        onClose={() => setSelectedTransaction(null)}
        onConfirmDelete={() => {
          const token = localStorage.getItem('accessToken');
          axios.delete(`http://localhost:5000/api/goals/${id}/transactions/${selectedTransaction._id}`, {
            headers: { Authorization: `Bearer ${token}` }
          })
            .then(() => {
              setTransactions((prev) =>
                prev.filter((tx) => tx._id !== selectedTransaction._id)
              );
              setSelectedTransaction(null);
              window.location.reload();
            })
            .catch(() => {
              alert('Помилка при видаленні транзакції. Баланс цілі не може бути менше 0');
            });
        }}
      />

      {/* Підтвердження видалення цілі */}
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
          <p>Ви дійсно хочете видалити цю ціль?</p>
        </DialogContent>
        <DialogActions className="px-6 pb-4">
          <Button onClick={() => setConfirmOpen(false)} color="inherit">Скасувати</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDeleteConfirmed}
          >
            Видалити
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
