
import { useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./ForgotPassword.css";
import API_BASE_URL from "../api";
const API_URL = `${API_BASE_URL}/auth`;

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/forgot-password`,
        { email }
      );

      setMessage(
        response.data.message ||
          "If an account exists for this email, an OTP will be sent."
      );
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to request an OTP. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="forgot-page">
      <section className="forgot-card">
        <div className="forgot-icon" aria-hidden="true">✉</div>

        <p className="forgot-eyebrow">ACCOUNT RECOVERY</p>
        <h1>Forgot Password?</h1>
        <p className="forgot-description">
          Enter your registered email address. We'll send you a
          one-time code to reset your password.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="forgot-email">Email address</label>
          <input
            id="forgot-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            maxLength={254}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Sending OTP..." : "Send OTP"}
          </button>
        </form>

        {message && (
          <p className="forgot-message" role="status">{message}</p>
        )}

        {error && (
          <p className="forgot-error" role="alert">{error}</p>
        )}

       
<div className="forgot-links">
  <Link className="forgot-reset-link" to="/reset-password">
    Already received your OTP? Reset password
  </Link>

  <Link className="forgot-back-link" to="/login">
    ← Back to Login
  </Link>
</div>

      </section>
    </main>
  );
}

export default ForgotPassword;
