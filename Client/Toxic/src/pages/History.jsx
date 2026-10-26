
import { useState, useEffect } from "react";
import axios from "axios";
import "./History.css";
import API_BASE_URL from "../api";
const API_URL = `${API_BASE_URL}/analysis`;
const History = () => {
  const [search, setSearch] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchHistory = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setMessage("Please log in to view your analysis history.");
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(API_URL, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Support either an array response or { analyses: [...] }
        const records = Array.isArray(response.data)
          ? response.data
          : response.data?.analyses;

        setHistory(Array.isArray(records) ? records : []);
      } catch (error) {
        console.error("History error:", error);

        if (error.response?.status === 401) {
          setMessage("Your session has expired. Please log in again.");
        } else if (error.response?.status === 403) {
          setMessage(
            "Your account cannot access this history endpoint yet."
          );
        } else {
          setMessage(
            error.response?.data?.message ||
              "Failed to load analysis history."
          );
        }
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const filteredHistory = history.filter((item) =>
    (item.comment || "")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  return (
    <main className="history">
      <div className="history-container">
        <h1>Analysis History</h1>

        <p className="history-subtitles">
          View your previously analyzed comments and their results.
        </p>

        <div className="search-box">
          <input
            type="search"
            placeholder="🔍 Search comments..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Search analysis history"
          />
        </div>

        {message && (
          <p className="history-message" role="alert">
            {message}
          </p>
        )}

        <div className="history-tables">
          {loading ? (
            <div className="no-result">Loading history...</div>
          ) : filteredHistory.length === 0 ? (
            <div className="no-result">
              {search
                ? "No matching comments found."
                : "No analysis history found."}
            </div>
          ) : (
            <div className="history-table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Comment</th>
                    <th>Result</th>
                    <th>Category</th>
                    <th>Detected Labels</th>
                    <th>Confidence</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredHistory.map((item) => (
                    <tr key={item._id}>
                      <td>{item.comment || "—"}</td>

                      <td>
                        {item.result?.toLowerCase() === "safe" ? (
                          <span className="safe">🟢 Safe</span>
                        ) : (
                          <span className="toxic">
                            🔴 {item.result || "Unknown"}
                          </span>
                        )}
                      </td>

                      <td>{item.category || "—"}</td>

                      <td>
                        {Array.isArray(item.detectedLabels) &&
                        item.detectedLabels.length > 0 ? (
                          <div className="detected-labels">
                            {item.detectedLabels.map((label, index) => (
                              <span
                                className="label-badge"
                                key={`${label}-${index}`}
                              >
                                {String(label).replaceAll("_", " ")}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="no-label">—</span>
                        )}
                      </td>

                      <td>
                        {item.confidence != null
                          ? `${item.confidence}%`
                          : "—"}
                      </td>

                      <td>
                        {item.createdAt
                          ? new Date(item.createdAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default History;
