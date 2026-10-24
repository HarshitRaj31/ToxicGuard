
import { NavLink, Link, useNavigate } from "react-router-dom";
import "./UserNavbar.css";

function UserNavbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  return (
    <nav className="user-navbar">
      <Link to="/dashboard" className="user-brand">
        🛡️ ToxicGuard
      </Link>

      <div className="user-nav-links">
        <NavLink to="/dashboard" end>
          Dashboard
        </NavLink>

        <NavLink to="/analyze">
          Analyze Text
        </NavLink>

        <NavLink to="/history">
          History
        </NavLink>
      </div>

      <button className="user-logout" onClick={handleLogout}>
        Logout
      </button>
    </nav>
  );
}

export default UserNavbar;
