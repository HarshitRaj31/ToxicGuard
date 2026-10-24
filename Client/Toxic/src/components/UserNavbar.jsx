
import { useState } from "react";
import { NavLink, Link, useNavigate } from "react-router-dom";
import "./UserNavbar.css";

function UserNavbar() {
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login", { replace: true });
  };

  const closeMenu = () => setMenuOpen(false);

  return (
    <nav className="user-navbar">
      <Link to="/dashboard" className="user-brand" onClick={closeMenu}>
        <span className="user-brand-icon">T</span>
        <span className="user-brand-text">
          Toxic<span>Guard</span>
          <small>AI SAFETY PLATFORM</small>
        </span>
      </Link>

      <button
        className="user-menu-toggle"
        type="button"
        onClick={() => setMenuOpen((open) => !open)}
        aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        aria-expanded={menuOpen}
      >
        {menuOpen ? "✕" : "☰"}
      </button>

      <div className={`user-nav-content ${menuOpen ? "menu-open" : ""}`}>
        <div className="user-nav-links">
          <NavLink to="/dashboard" end onClick={closeMenu}>
            <span className="nav-link-icon">⌂</span>
            Dashboard
          </NavLink>

          <NavLink to="/analyze" onClick={closeMenu}>
            <span className="nav-link-icon">⌕</span>
            Analyze Text
          </NavLink>

          <NavLink to="/history" onClick={closeMenu}>
            <span className="nav-link-icon">◷</span>
            History
          </NavLink>
        </div>

        <div className="user-nav-actions">
          <div className="user-protection-status">
            <span className="user-status-dot" />
            <span>AI Protection</span>
          </div>

          <button className="user-logout" onClick={handleLogout}>
            <span aria-hidden="true">↪</span>
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}

export default UserNavbar;
