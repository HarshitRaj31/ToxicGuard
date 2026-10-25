
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import { startAuthentication } from "@simplewebauthn/browser";

const AuthContext = createContext(null);

const API_URL = "http://localhost:5000/api/auth";
const PASSKEY_API_URL = "http://localhost:5000/api/passkeys";
const FACE_API_URL = "http://localhost:5000/api/face";

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore an existing full login session.
  useEffect(() => {
    const checkSession = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setUser(response.data.user);
      } catch (error) {
        console.error(
          "Session restoration failed:",
          error.response?.data?.message || error.message
        );

        localStorage.removeItem("token");
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, []);

  // Step 1: Verify the password.
  const login = async (email, password) => {
    const response = await axios.post(`${API_URL}/login`, {
      email,
      password,
    });

    const data = response.data;

    // A second factor is required. Do not store the temporary token
    // as a normal authenticated session.
    if (data.requiresPasskey) {
      return {
        requiresPasskey: true,
        preAuthToken: data.preAuthToken,
        message: data.message,
      };
    }

    // Regular password login.
    if (!data.token || !data.user) {
      throw new Error("The server returned an invalid login response.");
    }

    localStorage.setItem("token", data.token);
    setUser(data.user);

    return data.user;
  };

const passwordlessLogin = async () => {
  // Request authentication options without an email or password.
  const optionsResponse = await axios.post(
    `${PASSKEY_API_URL}/passwordless/options`
  );

  const { attemptId, options } = optionsResponse.data;

  // Ask the browser/device to authenticate with a passkey.
  const credential = await startAuthentication({
    optionsJSON: options,
  });

  // Verify the passkey with the backend.
  const verifyResponse = await axios.post(
    `${PASSKEY_API_URL}/passwordless/verify`,
    {
      attemptId,
      response: credential,
    }
  );

  const { verified, token, user: userData } = verifyResponse.data;

  if (!verified || !token || !userData) {
    throw new Error("Passkey authentication failed.");
  }

  localStorage.setItem("token", token);
  setUser(userData);

  return userData;
};

  // Step 2: Verify the passkey and create the real session.
  const completePasskeyLogin = async (preAuthToken) => {
    if (!preAuthToken) {
      throw new Error("Please sign in with your password again.");
    }

    // Get WebAuthn authentication options for this login attempt.
    const optionsResponse = await axios.post(
      `${PASSKEY_API_URL}/login/options`,
      { preAuthToken }
    );

    // This opens the browser/device passkey prompt.
    const passkeyResponse = await startAuthentication({
      optionsJSON: optionsResponse.data,
    });

    // The server verifies the passkey and returns the full session token.
    const verificationResponse = await axios.post(
      `${PASSKEY_API_URL}/login/verify`,
      {
        preAuthToken,
        response: passkeyResponse,
      }
    );

    const { token, user: userData } = verificationResponse.data;

    if (!verificationResponse.data.verified || !token || !userData) {
      throw new Error("Passkey verification was unsuccessful.");
    }

    localStorage.setItem("token", token);
    setUser(userData);

    return userData;
  };

  // Admin face-only login prototype.
  const faceLogin = async (descriptor) => {
    const response = await axios.post(`${FACE_API_URL}/admin-login`, {
      descriptor,
    });

    const { token, user: userData, verified } = response.data;

    if (!verified || !token || userData?.role !== "admin") {
      throw new Error("Admin face verification failed.");
    }

    // Store the real session and update React authentication state.
    localStorage.setItem("token", token);
    setUser(userData);

    return userData;
  };

  const checkFaceEnrollment = async () => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Please sign in first.");
    }

    const response = await axios.get(`${FACE_API_URL}/status`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data.enrolled === true;
  };

  const register = async (name, email, password) => {
    const response = await axios.post(`${API_URL}/register`, {
      name,
      email,
      password,
    });

    return response.data;
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        completePasskeyLogin,
        passwordlessLogin,
        register,
        logout,
        checkFaceEnrollment,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  );

};

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
};
