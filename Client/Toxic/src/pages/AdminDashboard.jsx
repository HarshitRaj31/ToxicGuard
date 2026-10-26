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

  // GitHub Repository Sync state
  const [gitStatus, setGitStatus] = useState({
    branch: "main",
    lastCommit: "Loading...",
    remoteUrl: "",
    modifiedFiles: 0,
  });
  const [repoUrl, setRepoUrl] = useState("");
  const [gitBranch, setGitBranch] = useState("main");
  const [githubToken, setGithubToken] = useState("");
  const [commitMessage, setCommitMessage] = useState(
    "Update ToxicGuard full-stack app and fix API/CORS configuration"
  );
  const [forcePush, setForcePush] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushFeedback, setPushFeedback] = useState({ type: "", text: "" });

  const fetchGitStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;
      const response = await axios.get(`${API_BASE_URL}/github/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setGitStatus(response.data);
      if (response.data.remoteUrl && !repoUrl) {
        setRepoUrl(response.data.remoteUrl);
      }
      if (response.data.branch) {
        setGitBranch(response.data.branch);
      }
    } catch {
      // Git status endpoint optional if running on external host without git
    }
  };

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
    fetchGitStatus();
  }, []);

  const handleGitPush = async (e) => {
    e.preventDefault();
    setPushFeedback({ type: "", text: "" });

    if (!repoUrl.trim() || !githubToken.trim()) {
      setPushFeedback({
        type: "error",
        text: "Please enter both your GitHub Repository URL and Personal Access Token.",
      });
      return;
    }

    try {
      setPushing(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_BASE_URL}/github/push`,
        {
          repoUrl: repoUrl.trim(),
          token: githubToken.trim(),
          branch: gitBranch.trim() || "main",
          commitMessage: commitMessage.trim(),
          force: forcePush,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setGithubToken("");
      setPushFeedback({
        type: "success",
        text: response.data.message || "Pushed to GitHub successfully.",
      });
      fetchGitStatus();
    } catch (err) {
      setPushFeedback({
        type: "error",
        text:
          err.response?.data?.message ||
          "Unable to push to GitHub. Check your repository URL and token permissions.",
      });
    } finally {
      setPushing(false);
    }
  };

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
      <Navbar />
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
          <p>Update Your Face Recognition.</p>
          <button onClick={() => navigate("/face-enrollment")}>
            Open Enrollment →
          </button>
        </article>
      </section>

      <section className="admin-recent admin-github-sync">
        <div className="admin-section-heading">
          <div>
            <p className="admin-label">VERSION CONTROL</p>
            <h2>GitHub Repository Sync</h2>
          </div>
          <div className="admin-git-meta">
            <span>Branch: <strong>{gitStatus.branch || "main"}</strong></span>
            <span>·</span>
            <span>Latest Commit: <code>{gitStatus.lastCommit}</code></span>
            {gitStatus.modifiedFiles > 0 && (
              <>
                <span>·</span>
                <span>{gitStatus.modifiedFiles} uncommitted file(s)</span>
              </>
            )}
          </div>
        </div>

        <form className="admin-github-form" onSubmit={handleGitPush}>
          <div className="admin-github-grid">
            <div className="admin-github-field">
              <label htmlFor="github-repo-url">GitHub Repository URL</label>
              <input
                id="github-repo-url"
                type="url"
                placeholder="https://github.com/username/repository.git"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                required
              />
            </div>

            <div className="admin-github-field">
              <label htmlFor="github-branch">Target Branch</label>
              <input
                id="github-branch"
                type="text"
                placeholder="main"
                value={gitBranch}
                onChange={(e) => setGitBranch(e.target.value)}
                required
              />
            </div>

            <div className="admin-github-field">
              <label htmlFor="github-token">Personal Access Token (repo scope)</label>
              <input
                id="github-token"
                type="password"
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <div className="admin-github-field">
              <label htmlFor="github-commit-msg">Commit Message</label>
              <input
                id="github-commit-msg"
                type="text"
                placeholder="Commit message for pending changes"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
              />
            </div>
          </div>

          <div className="admin-github-actions">
            <label className="admin-github-checkbox">
              <input
                type="checkbox"
                checked={forcePush}
                onChange={(e) => setForcePush(e.target.checked)}
              />
              <span>Force push to remote branch if histories diverge</span>
            </label>

            <button type="submit" disabled={pushing}>
              {pushing ? "Pushing to GitHub..." : `Push to ${gitBranch || "main"} →`}
            </button>
          </div>

          {pushFeedback.text && (
            <p
              className={
                pushFeedback.type === "success"
                  ? "admin-github-success"
                  : "admin-error"
              }
              role="status"
            >
              {pushFeedback.text}
            </p>
          )}
        </form>
      </section>

      <section className="admin-notice">
        <h3>Administrator Access</h3>
        <p>
          Custom-word changes and GitHub push operations are restricted by the
          backend to authenticated administrators.
        </p>
      </section>

      <footer className="admin-footer">
        Toxic Detector · Admin Panel
      </footer>
    </div>
  );
};

export default AdminDashboard;
