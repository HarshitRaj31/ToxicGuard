
import { useState } from "react";
import axios from "axios";
import { Link, useNavigate } from "react-router-dom";
import "./ResetPassword.css";
import API_BASE_URL from "../api";

const API_URL = `${API_BASE_URL}/auth`;

function ResetPassword() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");

    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit OTP sent to your email.");
      return;
    }

    if (password.length < 8 || password.length > 128) {
      setError("Password must be between 8 and 128 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/reset-password`,
        { email, otp, password }
      );

      setMessage(response.data.message || "Password reset successful.");

      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Unable to reset password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="reset-page">
      <section className="reset-card">
        <div className="reset-icon" aria-hidden="true">🔐</div>
        <p className="reset-eyebrow">ACCOUNT RECOVERY</p>
        <h1>Reset Password</h1>
        <p className="reset-description">
          Enter your email, the OTP you received, and your new password.
        </p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="reset-email">Email address</label>
          <input
            id="reset-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            placeholder="you@example.com"
            maxLength={254}
            required
          />

          <label htmlFor="reset-otp">Six-digit OTP</label>
          <input
            id="reset-otp"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            placeholder="123456"
            required
          />

          <label htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            required
          />

          <label htmlFor="confirm-password">Confirm new password</label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your password"
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        {message && <p className="reset-message" role="status">{message}</p>}
        {error && <p className="reset-error" role="alert">{error}</p>}

        <Link className="reset-back-link" to="/login">
          ← Back to Login
        </Link>
      </section>
    </main>
  );
}

export default ResetPassword;
