import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import axios from "axios";
import API_BASE_URL from "../api";

const AuthContext = createContext(null);

const API_URL = `${API_BASE_URL}/auth`;
const PASSKEY_API_URL = `${API_BASE_URL}/passkeys`;
const FACE_API_URL = `${API_BASE_URL}/face`;

function getInitialCachedUser() {
  try {
    const token = localStorage.getItem("token");
    if (!token) return null;
    const rawUser = localStorage.getItem("user");
    if (rawUser) {
      return JSON.parse(rawUser);
    }
  } catch {
    // ignore storage errors
  }
  return null;
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => getInitialCachedUser());
  const [loading, setLoading] = useState(() => {
    const hasToken = Boolean(localStorage.getItem("token"));
    const hasCachedUser = Boolean(getInitialCachedUser());
    return hasToken && !hasCachedUser;
  });

  // Restore / validate an existing login session in the background
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
          timeout: 4000,
        });

        const verifiedUser = response.data.user;
        localStorage.setItem("user", JSON.stringify(verifiedUser));
        setUser(verifiedUser);
      } catch (error) {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          setUser(null);
        }
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

    if (data.requiresPasskey) {
      return {
        requiresPasskey: true,
        preAuthToken: data.preAuthToken,
        message: data.message,
      };
    }

    if (!data.token || !data.user) {
      throw new Error("The server returned an invalid login response.");
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("user", JSON.stringify(data.user));
    setUser(data.user);

    return data.user;
  };

  const passwordlessLogin = async () => {
    const optionsResponse = await axios.post(
      `${PASSKEY_API_URL}/passwordless/options`
    );

    const { attemptId, options } = optionsResponse.data;

    const { startAuthentication } = await import("@simplewebauthn/browser");
    const credential = await startAuthentication({
      optionsJSON: options,
    });

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
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  // Step 2: Verify the passkey and create the real session.
  const completePasskeyLogin = async (preAuthToken) => {
    if (!preAuthToken) {
      throw new Error("Please sign in with your password again.");
    }

    const optionsResponse = await axios.post(
      `${PASSKEY_API_URL}/login/options`,
      { preAuthToken }
    );

    const { startAuthentication } = await import("@simplewebauthn/browser");
    const passkeyResponse = await startAuthentication({
      optionsJSON: optionsResponse.data,
    });

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
    localStorage.setItem("user", JSON.stringify(userData));
    setUser(userData);

    return userData;
  };

  // Admin face-only login
  const faceLogin = async (descriptor) => {
    const response = await axios.post(`${FACE_API_URL}/admin-login`, {
      descriptor,
    });

    const { token, user: userData, verified } = response.data;

    if (!verified || !token || userData?.role !== "admin") {
      throw new Error("Admin face verification failed.");
    }

    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
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
    localStorage.removeItem("user");
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
        faceLogin,
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
