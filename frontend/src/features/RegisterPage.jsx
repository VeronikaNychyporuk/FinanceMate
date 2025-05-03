import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import LandingNavbar from "../components/LandingNavbar";
import Footer from "../components/Footer";

function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [currency, setCurrency] = useState("UAH");
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const navigate = useNavigate();

  const validate = () => {
    const newErrors = {};

    if (!name.trim()) {
      newErrors.name = "Введіть ваше ім'я";
    }

    if (!email.trim()) {
      newErrors.email = "Введіть електронну адресу";
    } else if (!/^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
      newErrors.email = "Невірний формат електронної адреси";
    }

    if (!password) {
      newErrors.password = "Введіть пароль";
    } else if (password.length < 8) {
      newErrors.password = "Пароль має містити мінімум 8 символів";
    } else if (!/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/[0-9]/.test(password) || !/[!@#$%^&*]/.test(password)) {
      newErrors.password = "Пароль має містити велику, малу літери, цифру та спеціальний символ";
    }

    if (!currency) {
      newErrors.currency = "Виберіть базову валюту";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");

    if (!validate()) return;

    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        name,
        email,
        password,
        currency
      });

      navigate("/verify-email", { state: { email } });
    } catch (err) {
      setServerError(err.response?.data?.message || "Сталася помилка під час реєстрації.");
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-r from-white via-gray-100 to-white">
      <LandingNavbar showAuthButtons={false} />

      <main className="flex-grow flex items-center justify-center mt-12">
        <div className="bg-white rounded-2xl shadow-lg p-10 w-full max-w-md">
          <h2 className="text-3xl font-bold text-center mb-2">Реєстрація</h2>
          <p className="text-center text-gray-500 mb-6">Створіть акаунт, щоб користуватись усіма функціями</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label>Ім'я</label>
              <input
                type="text"
                placeholder="Введіть ваше ім'я"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full p-3 rounded bg-gray-100 border focus:outline-none"
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <label>Електронна адреса</label>
              <input
                type="email"
                placeholder="Введіть вашу електронну адресу"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-3 rounded bg-gray-100 border focus:outline-none"
              />
              {errors.email && <p className="text-sm text-red-500 mt-1">{errors.email}</p>}
            </div>

            <div>
              <label>Пароль</label>
              <input
                type="password"
                placeholder="Введіть ваш пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full p-3 rounded bg-gray-100 border focus:outline-none"
              />
              {errors.password && <p className="text-sm text-red-500 mt-1">{errors.password}</p>}
            </div>

            <div>
              <label>Виберіть базову валюту</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full p-3 rounded bg-gray-100 border focus:outline-none"
              >
                <option value="UAH">Гривня (UAH)</option>
                <option value="USD">Долар (USD)</option>
                <option value="EUR">Євро (EUR)</option>
              </select>
              {errors.currency && <p className="text-sm text-red-500 mt-1">{errors.currency}</p>}
            </div>

            {serverError && <p className="text-sm text-red-500 mt-2">{serverError}</p>}

            <button
              type="submit"
              className="w-full bg-black text-white py-3 rounded hover:bg-gray-900 transition"
            >
              Зареєструватись
            </button>
          </form>

          <p className="text-center text-sm mt-4">
            Вже маєте акаунт? <a href="/login" className="text-black font-semibold">Увійти</a>
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}

export default RegisterPage;