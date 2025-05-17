import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ExchangeRates from './ExchangeRates';

import {
  AppBar, Toolbar, IconButton, Typography, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Menu, MenuItem, Box
} from '@mui/material';
import {
  Menu as MenuIcon, Notifications, AccountCircle,
  Dashboard, AccountBalanceWallet, ListAlt, Flag
} from '@mui/icons-material';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const drawerWidth = 240;

export default function Layout({ children }) {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const handleDrawerToggle = () => {
    setOpen(!open);
  };

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleProfileAction = (action) => {
    handleClose();
    if (action === 'logout') {
      setLogoutDialogOpen(true);
    } else {
      navigate(`/${action}`);
    }
  };

  const handleLogoutConfirm = () => {
    localStorage.removeItem('accessToken');
    setLogoutDialogOpen(false);
    navigate('/');
  };

  const navItems = [
    { label: 'Аналітика', icon: <Dashboard />, path: '/dashboard' },
    { label: 'Бюджет', icon: <AccountBalanceWallet />, path: '/budgets' },
    { label: 'Транзакції', icon: <ListAlt />, path: '/transactions' },
    { label: 'Цілі', icon: <Flag />, path: '/goals' }
  ];

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    const fetchNotifications = () => {
      axios.get('http://localhost:5000/api/notifications', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => {
          const has = res.data.some(n => n.status === 'unread');
          setHasUnread(has);
        })
        .catch(() => {
          setHasUnread(false); // при помилці приховуємо крапку
        });
    };

    // перше завантаження
    fetchNotifications();

    // запуск кожні 60 секунд
    const interval = setInterval(fetchNotifications, 30000);

    // очищення при виході
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Верхній navbar */}
      <AppBar position="fixed" sx={{ zIndex: 1300, backgroundColor: '#212529' }}>
        <Toolbar className="flex justify-between">
          <div className="flex items-center gap-2">
            <IconButton
                color="inherit"
                onClick={handleDrawerToggle}
                sx={{
                    '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                    transition: 'background-color 0.2s ease'
                }}
            >
              <MenuIcon />
            </IconButton>
            <img src={logo} alt="Logo" className="h-8" />
            <Typography variant="h4" sx={{ fontFamily: 'Libre Bodoni, serif' }}>
              FinanceMate
            </Typography>
          </div>
          <div>
            <IconButton
              color="inherit"
              onClick={() => navigate('/notifications')}
              sx={{
                position: 'relative',
                '&:hover': {
                  backgroundColor: 'rgba(255,255,255,0.1)',
                },
                transition: 'background-color 0.2s ease'
              }}
            >
              <Notifications />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-600 rounded-full ring-1 ring-white" />
              )}
            </IconButton>

            <IconButton
                color="inherit"
                onClick={handleMenu}
                sx={{
                    '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                    transition: 'background-color 0.2s ease'
                }}
            >
                <AccountCircle />
            </IconButton>
            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              <MenuItem onClick={() => handleProfileAction('profile')}>Профіль</MenuItem>
              <MenuItem onClick={() => handleProfileAction('settings')}>Налаштування</MenuItem>
              <MenuItem onClick={() => handleProfileAction('logout')}>Вийти</MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      {/* Бічний drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            backgroundColor: '#212529',
            color: 'white',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
          },
        }}
      >
        <Toolbar />
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.label}
              onClick={() => navigate(item.path)}
              sx={{
                '&:hover': {
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                },
                transition: 'background-color 0.2s ease'
              }}
            >
              <ListItemIcon sx={{ color: 'white', fontFamily: "'Libre Bodoni', serif"}}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>

        <Box sx={{ mt: 'auto', p: 2 }}>
          <ExchangeRates />
        </Box>
      </Drawer>

      {/* Основний контент */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        {children}
      </Box>

      {/* Попап підтвердження виходу */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#2d2d2d',
            color: '#fff',
            borderRadius: 3,
            p: 2,
          }
        }}
      >
        <DialogTitle sx={{ fontSize: '1.25rem', fontWeight: 600 }}>
          Підтвердження виходу
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#e0e0e0' }}>
            Ви дійсно хочете вийти з акаунту?
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'flex-end' }}>
          <Button
            onClick={() => setLogoutDialogOpen(false)}
            sx={{
              color: '#fff',
              borderColor: '#fff',
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)'
              }
            }}
          >
            Скасувати
          </Button>
          <Button
            onClick={handleLogoutConfirm}
            variant="contained"
            color="error"
            sx={{ ml: 1 }}
          >
            Вийти
          </Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}