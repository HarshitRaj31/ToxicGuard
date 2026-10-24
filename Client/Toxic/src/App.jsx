
import "./App.css";
import { Routes, Route } from "react-router-dom";

import ProtectedRoute from "./components/ProtectedRoutes";

import Home from "./pages/Home";
import Register from "./pages/Register";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Analysis from "./pages/Analysis";
import History from "./pages/History";
import Custom from "./pages/Custom";
import AdminDashboard from "./pages/AdminDashboard";
import ManagerUsers from "./pages/ManagerUsers";
import ActivityLogs from "./pages/Activitylogs";
import UserLayout from "./components/UserLayout";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import FaceEnrollment from "./components/FaceEnrollment";

function App() {
  return (
    <Routes>
      {/* Public pages */}
      <Route path="/" element={<Home />} />
      <Route path="/register" element={<Register />} />
      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Pages for logged-in users */}
      <Route element={<ProtectedRoute />}>
        <Route element={<UserLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analyze" element={<Analysis />} />
          <Route path="/history" element={<History />} />
          <Route
            path="/face-enrollment"
            element={<FaceEnrollment />}
          />
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
  );
}

export default App;
