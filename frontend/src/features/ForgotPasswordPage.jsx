import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import LandingNavbar from "../components/LandingNavbar";
import Footer from "../components/Footer";
import axios from "axios";

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!email) {
      setError("Електронна пошта є обов'язковою");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/auth/forgot-password", { email });
      setSuccess("Код надіслано на пошту!");
      setTimeout(() => {
        navigate("/reset-password", { state: { email } });
      }, 3000);
    } catch (err) {
      setError(err.response?.data?.message || "Сталася помилка");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-white via-gray-100 to-gray-200 flex flex-col justify-between">
      <LandingNavbar showAuthButtons={false} />

      <div className="flex-grow flex items-center justify-center px-4 my-12">
        <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8 space-y-6">
          <h1 className="text-3xl font-bold text-center">Відновлення пароля</h1>
          <p className="text-center text-gray-500">Введіть вашу електронну адресу</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              type="email"
              placeholder="Електронна пошта"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-gray-100 rounded-md px-4 py-2 w-full outline-none"
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}
            {success && <p className="text-green-500 text-sm">{success}</p>}

            <button type="submit" className="w-full bg-black text-white uppercase font-semibold py-2 rounded-md hover:bg-gray-800 transition">
              Надіслати код
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default ForgotPasswordPage;