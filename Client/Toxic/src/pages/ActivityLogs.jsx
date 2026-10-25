
import { useEffect, useState } from "react";
import axios from "axios";
import "./ActivityLogs.css";
import Navbar from "../components/Navbar";
import API_BASE_URL from "../api";
const API_URL = `${API_BASE_URL}/activity`;
function ActivityLogs() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalActivities: 0,
    totalPages: 0,
    currentPage: 1,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const fetchActivities = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");

      const response = await axios.get(API_URL, {
        params: { page, limit: 10 },
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setActivities(response.data.activities || []);
      setPagination(
        response.data.pagination || {
          totalActivities: 0,
          totalPages: 0,
          currentPage: page,
          hasNextPage: false,
          hasPreviousPage: false,
        }
      );
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to load activity logs."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, [page]);

  const getActionClass = (action) => {
    switch (action) {
      case "LOGIN":
        return "login";
      case "REGISTER":
        return "register";
      case "ANALYSIS":
        return "analysis";
      case "DELETE_USER":
        return "delete";
      default:
        return "default";
    }
  };

  return (
    
    <div className="activity-page">
        <Navbar/>
      <div className="activity-header">
        <div>
          <p className="activity-eyebrow">ADMINISTRATION</p>
          <h1>Activity Logs</h1>
          <p>Monitor important events across your platform.</p>
        </div>

        <button
          className="activity-refresh"
          onClick={fetchActivities}
          disabled={loading}
        >
          {loading ? "Loading..." : "↻ Refresh"}
        </button>
      </div>

      <div className="activity-summary">
        <div className="activity-summary-card">
          <span>Total Activities</span>
          <strong>{pagination.totalActivities}</strong>
        </div>

        <div className="activity-summary-card">
          <span>Current Page</span>
          <strong>
            {pagination.totalPages === 0 ? 0 : pagination.currentPage}
            <small> / {pagination.totalPages}</small>
          </strong>
        </div>
      </div>

      <div className="activity-table-card">
        <div className="activity-table-heading">
          <h2>Recent Events</h2>
          <span>10 records per page</span>
        </div>

        {loading ? (
          <div className="activity-message">Loading activity logs...</div>
        ) : error ? (
          <div className="activity-error">{error}</div>
        ) : activities.length === 0 ? (
          <div className="activity-message">No activity records found.</div>
        ) : (
          <div className="activity-table-wrapper">
            <table className="activity-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Action</th>
                  <th>Details</th>
                  <th>IP Address</th>
                  <th>Date & Time</th>
                </tr>
              </thead>

              <tbody>
                {activities.map((activity) => (
                  <tr key={activity._id}>
                    <td>
                      <div className="activity-user">
                        <strong>
                          {activity.userName || activity.user?.name || "Unknown"}
                        </strong>
                        <span>
                          {activity.userEmail || activity.user?.email || "—"}
                        </span>
                      </div>
                    </td>

                    <td>
                      <span
                        className={`activity-badge ${getActionClass(
                          activity.action
                        )}`}
                      >
                        {activity.action}
                      </span>
                    </td>

                    <td>{activity.details || "—"}</td>
                    <td>{activity.ipAddress || "—"}</td>

                    <td>
                      {activity.createdAt
                        ? new Date(activity.createdAt).toLocaleString()
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="activity-pagination">
          <span>
            Page {pagination.totalPages === 0 ? 0 : pagination.currentPage} of{" "}
            {pagination.totalPages}
          </span>

          <div>
            <button
              onClick={() => setPage((current) => current - 1)}
              disabled={loading || !pagination.hasPreviousPage}
            >
              ← Previous
            </button>

            <button
              onClick={() => setPage((current) => current + 1)}
              disabled={loading || !pagination.hasNextPage}
            >
              Next →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActivityLogs;
