
import "./App.css";
import { lazy, Suspense } from "react";
import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoutes";
import UserLayout from "./components/UserLayout";

const Home = lazy(() => import("./pages/Home"));
const Register = lazy(() => import("./pages/Register"));
const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Analysis = lazy(() => import("./pages/Analysis"));
const History = lazy(() => import("./pages/History"));
const Custom = lazy(() => import("./pages/Custom"));
const AdminDashboard = lazy(() => import("./pages/AdminDashboard"));
const ManagerUsers = lazy(() => import("./pages/ManagerUsers"));
const ActivityLogs = lazy(() => import("./pages/ActivityLogs"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const FaceEnrollment = lazy(() => import("./components/FaceEnrollment"));
const FaceLogin = lazy(() => import("./pages/Face-Login"));
const PasskeySetup = lazy(() => import("./pages/PasskeySetup"));
const PasskeySettings = lazy(() => import("./pages/PasskeySettings"));

function App() {
  return (
    <Suspense
      fallback={
        <p role="status" className="route-loading">
          Loading page...
        </p>
      }
    >
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<Home />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/face-login" element={<FaceLogin />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* Pages for logged-in users */}
        <Route element={<ProtectedRoute />}>
          <Route element={<UserLayout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/analyze" element={<Analysis />} />
            <Route path="/history" element={<History />} />
            <Route path="/passkey-setup" element={<PasskeySetup />} />
            <Route path="/passkey-settings" element={<PasskeySettings />} />
            <Route path="/face-enrollment" element={<FaceEnrollment />} />
          </Route>
        </Route>

        {/* Admin-only pages */}
        <Route element={<ProtectedRoute adminOnly />}>
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/custom" element={<Custom />} />
          <Route path="/admin/users" element={<ManagerUsers />} />
          <Route path="/admin/activity-logs" element={<ActivityLogs />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

export default App;
