
import { NavLink } from "react-router-dom";
import "./Navbar.css";

function Navbar() {
  return (
    <nav className="admin-navbar">
      <div className="admin-brand">
        <span className="admin-brand-icon">🛡️</span>
        <span>ToxicGuard Admin</span>
      </div>

      <div className="admin-nav-links">
        <NavLink to="/admin" end>
          Dashboard
        </NavLink>

        <NavLink to="/admin/activity-logs">
          Activity Logs
        </NavLink>
      </div>
    </nav>
  );
}

export default Navbar;
