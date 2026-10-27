
import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "./AuthContext";
import "./Login.css";

const Login = () => {
  const {
    login,
    completePasskeyLogin,
    passwordlessLogin,
  } = useAuth();

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [pendingPasskeyToken, setPendingPasskeyToken] =
    useState("");

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Redirect according to the authenticated user's role.
  const navigateAfterLogin = (user) => {
    if (user?.role === "admin") {
      navigate("/admin", { replace: true });
    } else {
      navigate("/", { replace: true });
    }
  };

  // Passwordless login using a registered passkey.
  const handlePasswordlessLogin = async () => {
    try {
      setMessage("");
      setLoading(true);

      const authenticatedUser = await passwordlessLogin();

      navigateAfterLogin(authenticatedUser);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Passkey login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Existing email and password login.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setPendingPasskeyToken("");

    try {
      setLoading(true);

      const result = await login(
        formData.email,
        formData.password
      );

      // This account requires an additional passkey check.
      if (result?.requiresPasskey) {
        setPendingPasskeyToken(result.preAuthToken);
        setMessage(
          "Password verified. Continue with your registered passkey."
        );
        return;
      }

      // Normal password login.
      navigateAfterLogin(result);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to log in. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  // Existing password + passkey verification flow.
  const handlePasskeyLogin = async () => {
    if (!pendingPasskeyToken) {
      setMessage("Please sign in with your password again.");
      return;
    }

    setMessage("");

    try {
      setLoading(true);

      const user = await completePasskeyLogin(
        pendingPasskeyToken
      );

      setPendingPasskeyToken("");
      navigateAfterLogin(user);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Passkey verification failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🛡️</div>

        <h1>Welcome Back</h1>

        <p className="login-subtitle">
          Sign in to Toxic Detector
        </p>

        <div className="login-demo-bar">
          <span className="login-demo-label">Demo access:</span>
          <div className="login-demo-pills">
            <button
              type="button"
              className="login-demo-btn"
              onClick={() => {
                setFormData({
                  email: "admin@toxicguard.com",
                  password: "Admin@123456",
                });
                setMessage("Loaded Admin credentials.");
              }}
            >
              🛡️ Admin
            </button>
            <button
              type="button"
              className="login-demo-btn"
              onClick={() => {
                setFormData({
                  email: "user@toxicguard.com",
                  password: "User@123456",
                });
                setMessage("Loaded Demo User credentials.");
              }}
            >
              👤 User
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email address</label>

          <input
            id="email"
            type="email"
            name="email"
            placeholder="you@example.com"
            value={formData.email}
            onChange={handleChange}
            autoComplete="email"
            required
            disabled={loading || Boolean(pendingPasskeyToken)}
          />

          <label htmlFor="password">Password</label>

          <input
            id="password"
            type="password"
            name="password"
            placeholder="Enter your password"
            value={formData.password}
            onChange={handleChange}
            autoComplete="current-password"
            required
            disabled={loading || Boolean(pendingPasskeyToken)}
          />

          {!pendingPasskeyToken && (
            <>
              <div className="login-form-actions">
                <Link
                  to="/forgot-password"
                  className="forgot-password-link"
                >
                  Forgot Password?
                </Link>
              </div>

              <button type="submit" disabled={loading}>
                {loading ? "Signing in..." : "Sign In →"}
              </button>
            </>
          )}

          {pendingPasskeyToken && (
            <>
              <button
                type="button"
                onClick={handlePasskeyLogin}
                disabled={loading}
              >
                {loading
                  ? "Verifying passkey..."
                  : "Verify with Passkey →"}
              </button>

              <button
                type="button"
                className="passkey-cancel-button"
                disabled={loading}
                onClick={() => {
                  setPendingPasskeyToken("");
                  setMessage("");
                }}
              >
                Cancel and sign in again
              </button>
            </>
          )}

          {message && (
            <p className="login-message" role="alert">
              {message}
            </p>
          )}
        </form>

        {!pendingPasskeyToken && (
          <>
            <div className="login-divider">
              <span>OR</span>
            </div>

            <button
              type="button"
              className="passkey-login-button"
              onClick={handlePasswordlessLogin}
              disabled={loading}
            >
              <span aria-hidden="true">🔐</span>
              {loading
                ? "Verifying passkey..."
                : "Sign in with Passkey"}
            </button>

            <Link
              to="/face-login"
              className="face-login-button"
            >
              <span aria-hidden="true">◉</span>
              Continue with Face Recognition
            </Link>
          </>
        )}

        <p className="register-prompt">
          Don't have an account?{" "}
          <Link to="/register">Register</Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
