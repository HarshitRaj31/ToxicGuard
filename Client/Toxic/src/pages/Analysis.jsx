import API_BASE_URL from "../api";
import { useState } from "react";
import axios from "axios";
import "./Analysis.css";

const API_URL = `${API_BASE_URL}/analysis`;

const Analysis = () => {
  const [comment, setComment] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const analyzeComment = async () => {
    if (!comment.trim()) {
      setMessage("Please enter a comment.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please log in before analyzing text.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      setResult(null);

      const response = await axios.post(
        API_URL,
        { comment: comment.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setResult(response.data);
    } catch (error) {
      console.error("Analysis error:", error);

      if (error.response?.status === 401) {
        setMessage("Your session has expired. Please log in again.");
      } else {
        setMessage(
          error.response?.data?.message ||
            "Failed to analyze comment. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const clearComment = () => {
    setComment("");
    setResult(null);
    setMessage("");
  };

  return (
    <main className="analysis">
      <div className="analysis-container">
        <h1>Analyze Text</h1>

        <p className="analysis-subtitle">
          Check a comment for toxic or hateful content using AI.
        </p>

        <div className="input-box">
          <label htmlFor="comment-input">Enter your comment</label>

          <textarea
            id="comment-input"
            value={comment}
            onChange={(e) => {
              setComment(e.target.value);
              if (message) setMessage("");
            }}
            placeholder="Type or paste your comment here..."
            rows={6}
            maxLength={5000}
            disabled={loading}
          />

          <div className="analysis-character-count">
            {comment.length}/5000 characters
          </div>

          <div className="button-container">
            <button
              type="button"
              className="analyze-button"
              onClick={analyzeComment}
              disabled={loading || !comment.trim()}
            >
              {loading ? "Analyzing..." : "🔍 Analyze Text"}
            </button>

            <button
              type="button"
              className="clear-button"
              onClick={clearComment}
              disabled={loading}
            >
              Clear
            </button>
          </div>
        </div>

        {message && (
          <p className="analysis-message" role="alert">
            {message}
          </p>
        )}

        {result && (
          <section className="result-box" aria-live="polite">
            <h2>Analysis Result</h2>

            <div className="result-item">
              <span>Status</span>
              <strong
                className={
                  result.result?.toLowerCase() === "safe"
                    ? "safe"
                    : "toxic"
                }
              >
                {result.result?.toLowerCase() === "safe"
                  ? "🟢 Safe"
                  : `🔴 ${result.result || "Unknown"}`}
              </strong>
            </div>

            <div className="result-item">
              <span>Category</span>
              <strong>{result.category || "Not specified"}</strong>
            </div>

            <div className="result-item">
              <span>Confidence</span>
              <strong>
                {result.confidence != null
                  ? `${result.confidence}%`
                  : "Not available"}
              </strong>
            </div>

            {Array.isArray(result.detectedLabels) &&
              result.detectedLabels.length > 0 && (
                <div className="result-item">
                  <span>Detected Labels</span>
                  <strong>
                    {result.detectedLabels.join(", ")}
                  </strong>
                </div>
              )}
          </section>
        )}
      </div>
    </main>
  );
};

export default Analysis;
