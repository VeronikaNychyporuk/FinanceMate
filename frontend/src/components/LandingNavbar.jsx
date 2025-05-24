import { Link } from 'react-router-dom';
import logo from '../assets/logo.png';

function LandingNavbar({ showAuthButtons = true }) {
  const token = localStorage.getItem('accessToken');
  const isLoggedIn = !!token;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container d-flex justify-content-between align-items-center">
        <Link to="/" className="navbar-brand d-flex align-items-start">
          <img src={logo} alt="Logo" width="40" height="40" className="me-2"/>
          <span className="fs-2 d-inline-block" style={{ fontFamily: 'Libre Bodoni, serif', alignSelf: 'flex-end' }}>
            FinanceMate
          </span>
        </Link>

        {showAuthButtons && (
          <div className="d-flex align-items-center ms-auto">
            {!isLoggedIn ? (
              <>
                <Link to="/login" className="btn btn-link text-white me-2">
                  Log in
                </Link>
                <Link to="/register" className="btn btn-outline-light">
                  Sign up
                </Link>
              </>
            ) : (
              <Link to="/dashboard" className="btn btn-outline-light">
                У кабінет
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}

export default LandingNavbar;
