
import React, { useState,useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "./Login.css";

const API_URL = "http://localhost:5000/api/passkeys";

const PasskeySettings = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [enabled, setEnabled] = useState(false);

useEffect(() => {
  const loadSettings = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please sign in first.");
      return;
    }

    try {
      const response = await axios.get(
        `${API_URL}/two-factor-status`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setEnabled(response.data.enabled === true);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to load security settings."
      );
    }
  };

  loadSettings();
}, []);

  const updateSetting = async (action) => {
    const token = localStorage.getItem("token");

    if (!token) {
      setMessage("Please sign in first.");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await axios.post(
        `${API_URL}/${action}-two-factor`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setEnabled(response.data.enabled);
      setMessage(response.data.message);
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
          "Unable to update two-factor settings."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🔐</div>

        <h1>Passkey Security</h1>

        <p className="login-subtitle">
          Add an extra layer of protection to your account.
        </p>

        <p>
          Two-factor login requires your password and a registered
          passkey when you sign in.
        </p>

        <p>
          Status: <strong>{enabled ? "Enabled" : "Not enabled"}</strong>
        </p>

        {message && (
          <p className="login-message" role="status">
            {message}
          </p>
        )}

        <button
          type="button"
          disabled={loading}
          onClick={() =>
            updateSetting(enabled ? "disable" : "enable")
          }
        >
          {loading
            ? "Updating..."
            : enabled
              ? "Disable Two-Factor Login"
              : "Enable Two-Factor Login"}
        </button>

        <p>
          Haven't registered a passkey yet?{" "}
          <Link to="/passkey-setup">Register a passkey</Link>
        </p>

        <p>
          <Link to="/">Back to Home</Link>
        </p>
      </div>
    </div>
  );
};

export default PasskeySettings;
