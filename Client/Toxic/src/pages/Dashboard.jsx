
import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import "./Dashboard.css";

const API_URL = `${
  import.meta.env.VITE_API_URL || "http://localhost:5000"
}/api/analysis/stats`;

const Skeleton = ({ type = "value" }) => {
  const skeletonClass = {
    value: "dashboard-skeleton dashboard-skeleton--value",
    chart: "dashboard-skeleton dashboard-skeleton--chart",
    row: "dashboard-skeleton dashboard-skeleton--row",
  }[type] || "dashboard-skeleton dashboard-skeleton--value";

  return (
    <span
      className={skeletonClass}
      role="status"
      aria-label="Loading"
    />
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalAnalyses: 0,
    toxicComments: 0,
    safeComments: 0,
    categories: {
      toxic: 0,
      offensive: 0,
      threat: 0,
      insult: 0,
      hateSpeech: 0,
    },
    recentAnalyses: [],
  });

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setMessage("Please log in to view dashboard data.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setStats({
          totalAnalyses: response.data?.totalAnalyses ?? 0,
          toxicComments: response.data?.toxicComments ?? 0,
          safeComments: response.data?.safeComments ?? 0,
          categories: {
            toxic: 0,
            offensive: 0,
            threat: 0,
            insult: 0,
            hateSpeech: 0,
            ...response.data?.categories,
          },
          recentAnalyses: Array.isArray(response.data?.recentAnalyses)
            ? response.data.recentAnalyses
            : [],
        });
      } catch (error) {
        console.error("Dashboard error:", error);
        setMessage(
          error.response?.data?.message ||
            "Failed to load dashboard data."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  const chartData = [
    { name: "Toxic", comments: stats.categories.toxic },
    { name: "Offensive", comments: stats.categories.offensive },
    { name: "Threat", comments: stats.categories.threat },
    { name: "Insult", comments: stats.categories.insult },
    { name: "Hate Speech", comments: stats.categories.hateSpeech },
    { name: "Safe", comments: stats.safeComments },
  ];

  return (
    <main className="dashboard">
      <h1 className="dashboard-overlay">Dashboard</h1>
 
{/* Passkey Security */}
<section className="passkey-dashboard-card">
  <div className="passkey-dashboard-icon">🔐</div>

  <div className="passkey-dashboard-content">
    <h2>Passkey Security</h2>
    <p>
      Protect your ToxicGuard account with a passkey using
      your device's fingerprint, face unlock, or PIN.
    </p>

    <div className="passkey-dashboard-actions">
      <Link to="/passkey-setup" className="passkey-action-primary">
        <span>＋</span> Register Passkey
      </Link>

      <Link to="/passkey-settings" className="passkey-action-secondary">
        Manage Security Settings →
      </Link>
    </div>
  </div>
</section>

      {message && (
        <p className="dashboard-message">{message}</p>
      )}

      {/* Main Statistics */}
      <section className="cards">
        <div className="card">
          <h3>Total Analyses</h3>
          <p>{loading ?<Skeleton/>  : stats.totalAnalyses}</p>
        </div>

        <div className="card">
          <h3>Toxic Comments</h3>
          <p>{loading ?<Skeleton/> : stats.toxicComments}</p>
        </div>

        <div className="card">
          <h3>Safe Comments</h3>
          <p>{loading ? <Skeleton/> : stats.safeComments}</p>
        </div>
      </section>

      {/* Analysis Chart */}
      <section className="pie-chart">
        <h3>📊 Analysis Categories</h3>

        {loading ? (
          <div className="chart-placeholder">
           <Skeleton type="chart" />
          </div>
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={chartData}
                margin={{
                  top: 10,
                  right: 20,
                  left: 0,
                  bottom: 10,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="name"
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                  height={60}
                />

                <YAxis allowDecimals={false} />
                <Tooltip />

                <Bar
                  dataKey="comments"
                  fill="#38bdf8"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Recent Analysis */}
      <section className="recent-analysis">
        <h3>Recent Analysis</h3>

        {loading ? (
           <div className="dashboard-loading-rows" role="status" aria-label="Loading recent analyses">
    {Array.from({ length: 4 }, (_, index) => (
      <Skeleton key={index} type="row" />
    ))}
  </div>
        ) : stats.recentAnalyses.length === 0 ? (
          <div className="chart-placeholder">
            No analysis available
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Comment</th>
                  <th>Result</th>
                  <th>Category</th>
                  <th>Confidence</th>
                </tr>
              </thead>

              <tbody>
                {stats.recentAnalyses.map((item) => (
                  <tr key={item._id}>
                    <td>{item.comment}</td>

                    <td>
                      {item.result === "Safe" ? (
                        <span className="safe">🟢 Safe</span>
                      ) : (
                        <span className="toxic">
                          🔴 {item.result}
                        </span>
                      )}
                    </td>

                    <td>{item.category}</td>
                    <td>{item.confidence}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Category Statistics */}
      <section className="category-cards">
        <div className="category-card">
          <span>☠️</span>
          <h4>Toxic</h4>
          <p>{loading ? <Skeleton/> : stats.categories.toxic}</p>
        </div>

        <div className="category-card">
          <span>⚠️</span>
          <h4>Offensive</h4>
          <p>{loading ? <Skeleton/> : stats.categories.offensive}</p>
        </div>

        <div className="category-card">
          <span>🚨</span>
          <h4>Threat</h4>
          <p>{loading ? <Skeleton/> : stats.categories.threat}</p>
        </div>

        <div className="category-card">
          <span>💢</span>
          <h4>Insult</h4>
          <p>{loading ? "..." : stats.categories.insult}</p>
        </div>

        <div className="category-card">
          <span>🔴</span>
          <h4>Hate Speech</h4>
          <p>{loading ? "..." : stats.categories.hateSpeech}</p>
        </div>
      </section>
    </main>
  );
};

export default Dashboard;
