import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LandingNavbar from "../components/LandingNavbar";
import Footer from "../components/Footer";
import axios from "axios";

function LoginPage() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState("");
  const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
  const [codeSent, setCodeSent] = useState(false);

  const validate = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = "Електронна пошта є обов'язковою";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Некоректна електронна пошта";
    }

    if (!formData.password) {
      newErrors.password = "Пароль є обов'язковим";
    }

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError("");
    setEmailNotConfirmed(false);
    setCodeSent(false);

    const validationErrors = validate();
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length !== 0) return;

    try {
      const response = await axios.post("http://localhost:5000/api/auth/login", formData);

      if (response.data.emailConfirmed === false) {
        setEmailNotConfirmed(true);
        return;
      }

      localStorage.setItem("accessToken", response.data.accessToken);
      navigate("/dashboard");
    } catch (error) {
      setServerError(
        error.response?.data?.message || "Сталася помилка під час входу"
      );
    }
  };

  const handleResendCode = async () => {
    try {
      await axios.post("http://localhost:5000/api/auth/resend-verification-code", {
        email: formData.email,
      });
      setCodeSent(true);

      navigate("/verify-email", { state: { email: formData.email } });
    } catch (error) {
      setServerError(
        error.response?.data?.message || "Не вдалося надіслати код"
      );
    }
  };
  

  return (
    <div className="min-h-screen bg-gradient-to-r from-white via-gray-100 to-gray-200 flex flex-col justify-between">
      <LandingNavbar showAuthButtons={false} />

      <div className="flex-grow flex items-center justify-center px-4 my-12">
        <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8 space-y-6">
          <h1 className="text-3xl font-bold text-center">Вхід</h1>
          <p className="text-center text-gray-500">Увійдіть за допомогою вашої електронної пошти та пароля</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Електронна пошта
              </label>
              <input
                type="email"
                id="email"
                placeholder="Введіть вашу електронну пошту"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="bg-gray-100 rounded-md px-4 py-2 w-full outline-none"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Пароль
              </label>
              <input
                type="password"
                id="password"
                placeholder="Введіть ваш пароль"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="bg-gray-100 rounded-md px-4 py-2 w-full outline-none"
              />
              {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
            </div>

            {serverError && <p className="text-red-500 text-center text-sm">{serverError}</p>}

            {emailNotConfirmed && (
              <div className="text-center text-sm text-red-500 space-y-2">
                <p>Електронну адресу не підтверджено.</p>
                <button
                  type="button"
                  onClick={handleResendCode}
                  className="text-blue-600 hover:underline"
                >
                  Надіслати код для підтвердження
                </button>
                {codeSent && <p className="text-green-600">Код надіслано!</p>}
              </div>
            )}

            <p className="text-right text-sm text-gray-600">
              <Link to="/forgot-password" className="text-blue-600 hover:underline">
                Забули пароль?
              </Link>
            </p>

            <button
              type="submit"
              className="w-full bg-black text-white uppercase font-semibold py-2 rounded-md hover:bg-gray-800 transition"
            >
              Увійти
            </button>
          </form>

          <p className="text-center text-sm text-gray-600 mt-4">
            Ще не маєте акаунту?{" "}
            <Link to="/register" className="text-black font-semibold hover:underline">
              Зареєструватися
            </Link>
          </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default LoginPage;