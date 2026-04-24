import React from "react";
import Footer from "../components/Footer";
import LandingNavbar from "../components/LandingNavbar";
import {
  incomeIcon,
  budgetIcon,
  goalIcon,
  reminderIcon,
  analyticsIcon,
} from "../assets/LandingPage";

import "bootstrap/dist/css/bootstrap.min.css";

function LandingPage() {
  return (
    <>
    <div className="d-flex flex-column min-vh-100">
      <LandingNavbar showAuthButtons={true} />

      <div className="container text-center my-5 flex-grow-1">
        <div className="mb-5"></div>
        <h1 className="display-3 fw-bold" style={{ fontFamily: "'Libre Bodoni', serif" }}>
          FinanceMate
        </h1>
        <h2 className="fs-3 mb-5" style={{ fontFamily: "'Pacifico', cursive" }}>
          твій найкращий друг у світі фінансів
        </h2>

        <div className="d-flex justify-content-center mb-5">
          <ul className="list-unstyled text-start">
            <li className="mb-3 d-flex align-items-center fs-5">
              <img src={incomeIcon} alt="Доходи" width="30" className="me-3" />
              Фіксуй доходи та витрати
            </li>
            <li className="mb-3 d-flex align-items-center fs-5">
              <img src={budgetIcon} alt="Бюджети" width="30" className="me-3" />
              Створюй бюджети
            </li>
            <li className="mb-3 d-flex align-items-center fs-5">
              <img src={goalIcon} alt="Цілі" width="30" className="me-3" />
              Встановлюй фінансові цілі
            </li>
            <li className="mb-3 d-flex align-items-center fs-5">
              <img src={reminderIcon} alt="Нагадування" width="30" className="me-3" />
              Отримуй нагадування
            </li>
            <li className="mb-3 d-flex align-items-center fs-5">
              <img src={analyticsIcon} alt="Аналіз" width="30" className="me-3" />
              Аналізуй фінанси
            </li>
          </ul>
        </div>
      </div>

      <Footer />
    </div>
    </>
  );
}

export default LandingPage;