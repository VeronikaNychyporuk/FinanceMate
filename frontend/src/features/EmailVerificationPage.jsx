import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import LandingNavbar from "../components/LandingNavbar";
import Footer from "../components/Footer";
import axios from "axios";

function EmailVerificationPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const email = location.state?.email;

  if (!email) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Електронна пошта не вказана. Перейдіть з форми логіну або реєстрації.</p>
      </div>
    );
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!code.trim()) {
      setError("Введіть код підтвердження");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/auth/verify-email", {
        email,
        code,
      });

      setSuccess("Email підтверджено!");
      
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error) {
      setError(error.response?.data?.message || "Невірний код");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-white via-gray-100 to-gray-200 flex flex-col justify-between">
      <LandingNavbar showAuthButtons={false} />

      <div className="flex-grow flex items-center justify-center px-4 my-12">
        <div className="bg-white rounded-3xl shadow-lg w-full max-w-md p-8 space-y-6">
          <h1 className="text-3xl font-bold text-center">Підтвердження електронної пошти</h1>
          <p className="text-center text-gray-500">Введіть код, надісланий на {email}</p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Введіть код"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="bg-gray-100 rounded-md px-4 py-2 w-full outline-none"
            />

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            {success && <p className="text-green-500 text-sm text-center">{success}</p>}

            <button
              type="submit"
              className="w-full bg-black text-white uppercase font-semibold py-2 rounded-md hover:bg-gray-800 transition"
            >
              Підтвердити
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default EmailVerificationPage;