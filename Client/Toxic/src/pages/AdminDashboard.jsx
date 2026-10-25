
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "./AuthContext";
import "./AdminDashboard.css";
import DetectionAnalytics from "./DetectionAnalytics";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api";
const AdminDashboard = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [stats, setStats] = useState(null);
  const [wordCount, setWordCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        const headers = {
  Authorization: `Bearer ${token}`,
};

const [statsResponse, wordsResponse] = await Promise.all([
  axios.get(`${API_BASE_URL}/analysis/stats`, {
    headers,
  }),
  axios.get(`${API_BASE_URL}/custom-words`, {
    headers,
  }),
]);
        setStats(statsResponse.data);

        const words = wordsResponse.data;
        setWordCount(Array.isArray(words) ? words.length : 0);
      } catch (err) {
        setError(
          err.response?.data?.message ||
            "Could not load dashboard statistics."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const cards = [
    {
      title: "Total Analyses",
      value: stats?.totalAnalyses ?? 0,
      icon: "📊",
    },
    {
      title: "Toxic Comments",
      value: stats?.toxicComments ?? 0,
      icon: "🚫",
    },
    {
      title: "Safe Comments",
      value: stats?.safeComments ?? 0,
      icon: "🛡️",
    },
    {
      title: "Custom Banned Words",
      value: wordCount,
      icon: "🔤",
    },
  ];

  const recentAnalyses = Array.isArray(stats?.recentAnalyses)
    ? stats.recentAnalyses
    : [];

  const formatDate = (date) => {
    if (!date) return "—";

    const parsedDate = new Date(date);

    if (Number.isNaN(parsedDate.getTime())) return "—";

    return parsedDate.toLocaleString();
  };

  return (
    <div className="admin-dashboard">
      <Navbar/>
      <header className="admin-header">
        <div>
          <p className="admin-label">TOXIC DETECTOR</p>
          <h1>Admin Dashboard</h1>
          <p>Manage your platform and monitor detection activity.</p>
        </div>

        <button className="admin-logout" onClick={handleLogout}>
          Logout
        </button>
      </header>

      <section className="admin-welcome">
        <div>
          <p>ADMIN CONTROL PANEL</p>
          <h2>Welcome, {user?.name || "Administrator"} 👋</h2>
          <span>
            Manage custom banned words and review comment analysis.
          </span>
        </div>
        <div className="admin-shield">🛡️</div>
      </section>

      {loading && <p>Loading dashboard statistics...</p>}

      {error && (
        <p className="admin-error" role="alert">
          {error}
        </p>
      )}

      {!loading && !error && (
        <section className="admin-stats">
          {cards.map((card) => (
            <article className="admin-stat-card" key={card.title}>
              <span>{card.icon}</span>
              <h3>{card.title}</h3>
              <strong className="admin-stat-value">
                {card.value.toLocaleString()}
              </strong>
            </article>
          ))}
        </section>
      )}
      <DetectionAnalytics />
      <section className="admin-recent">
        <div className="admin-section-heading">
          <div>
            <p className="admin-label">MONITORING</p>
            <h2>Recent Activity</h2>
          </div>

          <button onClick={() => navigate("/history")}>
            View All →
          </button>
        </div>

        {loading ? (
          <p className="admin-empty">Loading recent activity...</p>
        ) : error ? (
          <p className="admin-empty">
            Recent activity could not be loaded.
          </p>
        ) : recentAnalyses.length === 0 ? (
          <p className="admin-empty">No analyses recorded yet.</p>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Comment</th>
                  <th>Result</th>
                  <th>Category</th>
                  <th>Confidence</th>
                  <th>Analyzed At</th>
                </tr>
              </thead>

              <tbody>
                {recentAnalyses.map((item) => (
                  <tr key={item._id}>
                    <td className="admin-comment">
                      {item.comment || "—"}
                    </td>
                    <td>
                      <span
                        className={`admin-result ${
                          String(item.result || "").toLowerCase() === "safe"
                            ? "safe"
                            : "toxic"
                        }`}
                      >
                        {item.result || "Unknown"}
                      </span>
                    </td>
                    <td>{item.category || "—"}</td>
                    <td>
                      {Number.isFinite(Number(item.confidence))
                        ? `${Number(item.confidence).toFixed(1)}%`
                        : "—"}
                    </td>
                    <td>{formatDate(item.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="admin-stats admin-actions">
        <article className="admin-stat-card">
          <span>🚫</span>
          <h3>Custom Banned Words</h3>
          <p>Manage the words used by the custom-word detector.</p>
          <button onClick={() => navigate("/custom")}>
            Manage Words →
          </button>
        </article>
        
<article className="admin-stat-card">
  <span>👥</span>
  <h3>Manage Users</h3>
  <p>View registered accounts, search users, and manage access.</p>
  <button onClick={() => navigate("/admin/users")}>
    Manage Users →
  </button>
</article>

        <article className="admin-stat-card">
          <span>📊</span>
          <h3>Analysis History</h3>
          <p>Review previously analyzed comments and their results.</p>
          <button onClick={() => navigate("/history")}>
            View History →
          </button>
        </article>

        <article className="admin-stat-card">
          <span>🔎</span>
          <h3>Analyze a Comment</h3>
          <p>Open the comment analysis tool.</p>
          <button onClick={() => navigate("/analyze")}>
            Open Analyzer →
          </button>
        </article>
          <article className="admin-stat-card">
          <span>📊</span>
          <h3>Face Enrollment Settings</h3>
          <p>Update Your Face Rognition.</p>
          <button onClick={() => navigate("/face-enrollment")}>
            Open Enrollment →
          </button>
        </article>
      </section>

      <section className="admin-notice">
        <h3>Administrator Access</h3>
        <p>
          Custom-word changes are restricted by the backend to
          authenticated administrators.
        </p>
      </section>
      
      <footer className="admin-footer">
        Toxic Detector · Admin Panel
      </footer>
    </div>
  );
};

export default AdminDashboard;
