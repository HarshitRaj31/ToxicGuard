
import React, { useState } from "react";
import axios from "axios";
import { startRegistration } from "@simplewebauthn/browser";
import "./Login.css";
import API_BASE_URL from "../api";
const API_URL = `${API_BASE_URL}/passkeys`;
const PasskeySetup = () => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  const registerPasskey = async () => {
    setLoading(true);
    setMessage("");
    setSuccess(false);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Please sign in before registering a passkey.");
      }

      const headers = {
        Authorization: `Bearer ${token}`,
      };

      const optionsResponse = await axios.post(
        `${API_URL}/register/options`,
        {},
        { headers }
      );

      const registrationResponse = await startRegistration({
        optionsJSON: optionsResponse.data,
      });

      const verificationResponse = await axios.post(
        `${API_URL}/register/verify`,
        registrationResponse,
        { headers }
      );

      setSuccess(true);
      setMessage(
        verificationResponse.data.message ||
          "Passkey registered successfully."
      );
    } catch (error) {
      console.error("Passkey registration failed:", error);

      setMessage(
        error.response?.data?.message ||
          error.message ||
          "Unable to register your passkey."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-icon">🔐</div>

        <h1>Set Up a Passkey</h1>

        <p className="login-subtitle">
          Register a passkey for your ToxicGuard account.
          Your device may ask you to use a fingerprint,
          face unlock, or device PIN.
        </p>

        {message && (
          <p
            className="login-message"
            role="status"
            style={{
              color: success ? "#16a34a" : undefined,
            }}
          >
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={registerPasskey}
          disabled={loading}
        >
          {loading ? "Registering..." : "Register Passkey"}
        </button>

        <p className="login-subtitle">
          You must already be signed in to register a passkey.
        </p>
      </div>
    </div>
  );
};

export default PasskeySetup;
