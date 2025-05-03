import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import LandingNavbar from "../components/LandingNavbar";
import Footer from "../components/Footer";
import axios from "axios";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email;

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validatePassword = (value) => {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!code.trim() || !password.trim()) {
      setError("Усі поля обов'язкові");
      return;
    }

    if (!validatePassword(password)) {
      setError("Пароль має містити мінімум 8 символів, велику і малу літери, цифру та спецсимвол");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/auth/reset-password", {
        email,
        code,
        newPassword: password,
      });

      setSuccess("Пароль успішно змінено!");

      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Сталася помилка");
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Електронна пошта не вказана.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-r from-white via-gray-100 to-gray-200 flex flex-col justify-between">
      <LandingNavbar showAuthButtons={false} />

      <div className="flex-grow flex items-center justify-center px-4 my-12">
        <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8 space-y-6">
          <h1 className="text-3xl font-bold text-center">Зміна пароля</h1>
          <p className="text-center text-gray-500">Введіть код і новий пароль</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Код"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="bg-gray-100 rounded-md px-4 py-2 w-full outline-none"
            />

            <input
              type="password"
              placeholder="Новий пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-gray-100 rounded-md px-4 py-2 w-full outline-none"
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-500 text-sm">{success}</p>}

            <button type="submit" className="w-full bg-black text-white uppercase font-semibold py-2 rounded-md hover:bg-gray-800 transition">
              Змінити пароль
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ResetPasswordPage;