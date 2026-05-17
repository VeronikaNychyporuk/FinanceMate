import React, { useState, useEffect } from 'react';
import axios from 'axios';
import ExchangeRates from './ExchangeRates';

import {
  AppBar, Toolbar, IconButton, Typography, Menu, MenuItem, Box
} from '@mui/material';
import { Notifications, AccountCircle, Menu as MenuIcon } from '@mui/icons-material';
import {
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions, Button
} from '@mui/material';
import {
  LayoutDashboard,
  ArrowLeftRight,
  RefreshCw,
  Wallet,
  Target,
  Lightbulb,
  Eye,
  TrendingUp,
  PieChart,
  Activity,
  AlertTriangle,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import logo from '../assets/logo.png';

const DRAWER_WIDTH = 248;

const NAV_ITEMS = [
  {
    label: 'Транзакції',   path: '/transactions',     Icon: ArrowLeftRight,
    children: [
      { label: 'Регулярні транзакції', path: '/recurring-transactions', Icon: RefreshCw },
    ],
  },
  { label: 'Бюджет',       path: '/budgets',          Icon: Wallet },
  { label: 'Цілі',         path: '/goals',            Icon: Target },
  {
    label: 'Аналітика',    path: '/dashboard',       Icon: LayoutDashboard,
    children: [
      { label: 'Фінансовий звіт',   path: '/analytics/overview',  Icon: Eye },
      { label: 'Прогноз',           path: '/analytics/forecast',  Icon: TrendingUp },
      { label: 'Цілі',              path: '/analytics/goals',     Icon: PieChart },
      { label: 'Поведінка витрат',  path: '/analytics/patterns',  Icon: Activity },
      { label: 'Аномалії',          path: '/analytics/anomalies', Icon: AlertTriangle },
    ],
  },
  { label: 'Рекомендації', path: '/recommendations',  Icon: Lightbulb },
];

export default function Layout({ children }) {
  const [open, setOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  const handleDrawerToggle = () => setOpen((v) => !v);
  const handleMenu = (e) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

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

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const fetchNotifications = () => {
      axios
        .get('http://localhost:5000/api/notifications', {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setHasUnread(res.data.some((n) => n.status === 'unread')))
        .catch(() => setHasUnread(false));
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Box sx={{ display: 'flex' }}>
      {/* ── Top bar ── */}
      <AppBar position="fixed" sx={{ zIndex: 1300, backgroundColor: '#171923' }}>
        <Toolbar className="flex justify-between">
          <div className="flex items-center gap-2">
            <IconButton
              color="inherit"
              onClick={handleDrawerToggle}
              sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }, transition: 'background-color 0.15s' }}
            >
              <MenuIcon />
            </IconButton>
            <img src={logo} alt="Logo" className="h-8" />
            <Typography variant="h4" sx={{ fontFamily: 'Libre Bodoni, serif' }}>
              FinanceMate
            </Typography>
          </div>

          <div className="flex items-center">
            <IconButton
              color="inherit"
              onClick={() => navigate('/notifications')}
              sx={{ position: 'relative', '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }, transition: 'background-color 0.15s' }}
            >
              <Notifications />
              {hasUnread && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
              )}
            </IconButton>
            <IconButton
              color="inherit"
              onClick={handleMenu}
              sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' }, transition: 'background-color 0.15s' }}
            >
              <AccountCircle />
            </IconButton>
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
              <MenuItem onClick={() => handleProfileAction('profile')}>Профіль</MenuItem>
              <MenuItem onClick={() => handleProfileAction('settings')}>Налаштування</MenuItem>
              <MenuItem onClick={() => handleProfileAction('logout')}>Вийти</MenuItem>
            </Menu>
          </div>
        </Toolbar>
      </AppBar>

      {/* ── Sidebar ── */}
      <aside
        style={{
          width: open ? DRAWER_WIDTH : 0,
          minWidth: open ? DRAWER_WIDTH : 0,
          top: 64,
          zIndex: 1200,
          transition: 'width 0.2s ease, min-width 0.2s ease',
          overflow: 'hidden',
        }}
        className="fixed left-0 bottom-0 flex flex-col bg-[#171923] border-r border-white/5"
      >
        <div className="flex flex-col h-full" style={{ width: DRAWER_WIDTH }}>
          {/* Nav section label */}
          <div className="px-4 pt-6 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
              Навігація
            </span>
          </div>

          {/* Nav items */}
          <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
            {NAV_ITEMS.map(({ label, path, Icon, children }) => {
              const isActive =
                location.pathname === path ||
                (path !== '/dashboard' && location.pathname.startsWith(path));

              const isExpanded =
                children &&
                (location.pathname.startsWith(path) ||
                  children.some((c) => location.pathname.startsWith(c.path)));

              return (
                <div key={path}>
                  <button
                    type="button"
                    onClick={() => navigate(path)}
                    className={[
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm font-medium transition-all duration-150 whitespace-nowrap',
                      isActive
                        ? 'bg-white/10 text-white'
                        : 'text-white/50 hover:bg-white/5 hover:text-white/80',
                    ].join(' ')}
                  >
                    <Icon size={17} strokeWidth={isActive ? 2.2 : 1.7} className="shrink-0" />
                    <span className="truncate">{label}</span>
                  </button>

                  {children && (
                    <div
                      style={{
                        maxHeight: isExpanded ? children.length * 52 : 0,
                        overflow: 'hidden',
                        transition: 'max-height 0.2s ease',
                      }}
                    >
                      {children.map(({ label: cLabel, path: cPath, Icon: CIcon }) => {
                        const cActive =
                          location.pathname === cPath ||
                          location.pathname.startsWith(cPath);
                        return (
                          <button
                            key={cPath}
                            type="button"
                            onClick={() => navigate(cPath)}
                            className={[
                              'w-full flex items-center gap-3 pl-9 pr-3 py-2 rounded-lg text-left text-sm font-medium transition-all duration-150 whitespace-nowrap',
                              cActive
                                ? 'bg-white/10 text-white'
                                : 'text-white/40 hover:bg-white/5 hover:text-white/70',
                            ].join(' ')}
                          >
                            <CIcon size={15} strokeWidth={cActive ? 2.2 : 1.7} className="shrink-0" />
                            <span className="truncate">{cLabel}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Exchange rates at bottom */}
          <div className="px-3 pb-5 pt-4 border-t border-white/5">
            <ExchangeRates />
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          ml: open ? `${DRAWER_WIDTH}px` : 0,
          transition: 'margin-left 0.2s ease',
        }}
      >
        <Toolbar />
        {children}
      </Box>

      {/* ── Logout dialog ── */}
      <Dialog
        open={logoutDialogOpen}
        onClose={() => setLogoutDialogOpen(false)}
        PaperProps={{
          sx: { backgroundColor: '#2d2d2d', color: '#fff', borderRadius: 3, p: 2 },
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
            sx={{ color: '#fff', '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' } }}
          >
            Скасувати
          </Button>
          <Button onClick={handleLogoutConfirm} variant="contained" color="error" sx={{ ml: 1 }}>
            Вийти
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
