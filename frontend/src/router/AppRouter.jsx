import { Routes, Route } from 'react-router-dom';

import LandingPage from '../features/LandingPage';
import LoginPage from '../features/LoginPage';
import RegisterPage from '../features/RegisterPage';
import EmailVerificationPage from '../features/EmailVerificationPage';
import ForgotPasswordPage from '../features/ForgotPasswordPage';
import ResetPasswordPage from '../features/ResetPasswordPage';
import DashboardPage from '../features/DashboardPage';
import ProfilePage from '../features/ProfilePage';
import EditProfilePage from '../features/EditProfilePage';
import NotificationsPage from '../features/NotificationsPage';
import TransactionsPage from '../features/TransactionsPage';
import AddTransactionPage from '../features/AddTransactionPage';
import EditTransactionPage from '../features/EditTransactionPage';
import GoalsPage from '../features/GoalsPage';
import AddGoalPage from '../features/AddGoalPage';
import GoalDetailsPage from '../features/GoalDetailsPage';
import EditGoalPage from '../features/EditGoalPage';
import AddGoalTransactionPage from '../features/AddGoalTransactionPage';
import BudgetsPage from '../features/BudgetsPage';
import BudgetsArchivePage from '../features/BudgetsArchivePage';
import BudgetDetailsPage from '../features/BudgetDetailsPage';
import AddBudgetPage from '../features/AddBudgetPage';
import EditBudgetPage from '../features/EditBudgetPage';
import RecurringTransactionsPage from '../features/RecurringTransactionsPage';
import EditRecurringTransactionPage from '../features/EditRecurringTransactionPage';
import AddRecurringTransactionPage from '../features/AddRecurringTransactionPage';
import NotFoundPage from '../features/NotFoundPage';

import Layout from '../components/Layout';
import PrivateRoute from '../components/PrivateRoute';

function AppRouter() {  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/dashboard" element={<PrivateRoute><Layout><DashboardPage /></Layout></PrivateRoute>}/>
      <Route path="/profile" element={<PrivateRoute><Layout><ProfilePage /></Layout></PrivateRoute>}/>
      <Route path="/settings" element={<PrivateRoute><Layout><EditProfilePage /></Layout></PrivateRoute>}/>
      <Route path="/notifications" element={<PrivateRoute><Layout><NotificationsPage /></Layout></PrivateRoute>}/>
      <Route path="/transactions" element={<PrivateRoute><Layout><TransactionsPage /></Layout></PrivateRoute>}/>
      <Route path="/transactions/new" element={<PrivateRoute><Layout><AddTransactionPage /></Layout></PrivateRoute>}/>
      <Route path="/transactions/edit/:id" element={<PrivateRoute><Layout><EditTransactionPage /></Layout></PrivateRoute>}/>
      <Route path="/goals" element={<PrivateRoute><Layout><GoalsPage /></Layout></PrivateRoute>}/>
      <Route path="/goals/new" element={<PrivateRoute><Layout><AddGoalPage /></Layout></PrivateRoute>}/>
      <Route path="/goals/:id" element={<PrivateRoute><Layout><GoalDetailsPage /></Layout></PrivateRoute>}/>
      <Route path="/goals/edit/:id" element={<PrivateRoute><Layout><EditGoalPage /></Layout></PrivateRoute>}/>
      <Route path="/goals/:id/transactions/new" element={<PrivateRoute><Layout><AddGoalTransactionPage /></Layout></PrivateRoute>}/>
      <Route path="/budgets" element={<PrivateRoute><Layout><BudgetsPage /></Layout></PrivateRoute>}/>
      <Route path="/budgets/archive" element={<PrivateRoute><Layout><BudgetsArchivePage /></Layout></PrivateRoute>}/>
      <Route path="/budgets/:id" element={<PrivateRoute><Layout><BudgetDetailsPage /></Layout></PrivateRoute>}/>
      <Route path="/budgets/new" element={<PrivateRoute><Layout><AddBudgetPage /></Layout></PrivateRoute>}/>
      <Route path="/budgets/edit/:id" element={<PrivateRoute><Layout><EditBudgetPage /></Layout></PrivateRoute>}/>
      <Route path="/recurring-transactions" element={<PrivateRoute><Layout><RecurringTransactionsPage /></Layout></PrivateRoute>}/>
      <Route path="/recurring-transactions/edit/:id" element={<PrivateRoute><Layout><EditRecurringTransactionPage /></Layout></PrivateRoute>}/>
      <Route path="/recurring-transactions/new" element={<PrivateRoute><Layout><AddRecurringTransactionPage /></Layout></PrivateRoute>}/>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default AppRouter;
