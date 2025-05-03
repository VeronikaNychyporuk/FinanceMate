import { Routes, Route } from 'react-router-dom';
import LandingPage from '../features/LandingPage';
import LoginPage from '../features/LoginPage';
import RegisterPage from '../features/RegisterPage';
import EmailVerificationPage from '../features/EmailVerificationPage';
import ForgotPasswordPage from '../features/ForgotPasswordPage';
import ResetPasswordPage from '../features/ResetPasswordPage';

function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify-email" element={<EmailVerificationPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
    </Routes>
  );
}

export default AppRouter;
