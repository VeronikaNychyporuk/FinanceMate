import React, { useState } from 'react';
import {
  AppBar, Toolbar, IconButton, Typography, Drawer, List, ListItemButton,
  ListItemIcon, ListItemText, Menu, MenuItem, Box
} from '@mui/material';
import {
  Menu as MenuIcon, Notifications, AccountCircle,
  Dashboard, AccountBalanceWallet, ListAlt, Flag
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo.png';

const drawerWidth = 240;

export default function Layout({ children }) {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();

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
      // Додай свій logout-обробник
      console.log('Logout');
    } else {
      navigate(`/${action}`);
    }
  };

  const navItems = [
    { label: 'Дашборти', icon: <Dashboard />, path: '/dashboard' },
    { label: 'Бюджет', icon: <AccountBalanceWallet />, path: '/budgets' },
    { label: 'Транзакції', icon: <ListAlt />, path: '/transactions' },
    { label: 'Цілі', icon: <Flag />, path: '/goals' }
  ];

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
                    '&:hover': {
                        backgroundColor: 'rgba(255,255,255,0.1)',
                    },
                    transition: 'background-color 0.2s ease'
                }}
            >
                <Notifications />
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
              <ListItemIcon sx={{ color: 'white' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      {/* Основний контент */}
      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar /> {/* для відступу під navbar */}
        {children}
      </Box>
    </Box>
  );
}