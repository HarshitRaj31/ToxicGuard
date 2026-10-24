
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../pages/AuthContext";

const ProtectedRoutes = ({ adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <p>Checking authentication...</p>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoutes;
