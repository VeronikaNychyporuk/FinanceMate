import React from "react";
import Footer from "../components/Footer";
import LandingNavbar from "../components/LandingNavbar";
import { slide1, slide2, slide3 } from "../assets/LandingPage";
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
      <LandingNavbar showAuthButtons={true} />

      <div className="container text-center my-5">
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

        <div className="d-flex justify-content-center mb-5">
          <div id="carouselExampleIndicators" className="carousel slide w-75" data-bs-ride="carousel" data-bs-interval="4000">
            <div className="carousel-inner rounded">
              <div className="carousel-item active">
                <img src={slide1} className="d-block w-100" alt="First slide" />
              </div>
              <div className="carousel-item">
                <img src={slide2} className="d-block w-100" alt="Second slide" />
              </div>
              <div className="carousel-item">
                <img src={slide3} className="d-block w-100" alt="Third slide" />
              </div>
            </div>
            <button className="carousel-control-prev" type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide="prev">
              <span className="carousel-control-prev-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Previous</span>
            </button>
            <button className="carousel-control-next" type="button" data-bs-target="#carouselExampleIndicators" data-bs-slide="next">
              <span className="carousel-control-next-icon" aria-hidden="true"></span>
              <span className="visually-hidden">Next</span>
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}

export default LandingPage;