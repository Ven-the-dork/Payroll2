import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import DynamicTitle from "./DynamicTitle";

import Dashboard from "./Dashboard";
import EmployeeManagement from "./EmployeeManagement";
import LeaveManagement from "./LeaveManagement";
import LoginPage from "./Loginpage";
import AdminLogin from "./Adminloginpage"; 
import AuditLogs from "./AuditLogs";

import DashboardUser from "../User-side/DashboardUser";
import Applyforleave from "../User-side/Applyforleave";

import ProtectedRoute from "./ProtectedRoute";
import PayrollManagement from "./PayrollManagement";

function App() {
  return (
    <Router>
      <DynamicTitle />
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/admin-login" element={<AdminLogin />} /> 

        {/* Admin-only Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route 
        path="/audit-logs" 
        element={<ProtectedRoute 
        requiredRole="admin">
          <AuditLogs />
        </ProtectedRoute>} />
        <Route
          path="/employee-management"
          element={
            <ProtectedRoute requiredRole="admin">
              <EmployeeManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/leave-management"
          element={
            <ProtectedRoute requiredRole="admin">
              <LeaveManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/PayrollManagement"
          element={
            <ProtectedRoute requiredRole="admin">
              <PayrollManagement />
            </ProtectedRoute>
          }
        />

        {/* User-only Routes */}
        <Route
          path="/dashboard_user"
          element={
            <ProtectedRoute requiredRole="user">
              <DashboardUser />
            </ProtectedRoute>
          }
        />
        <Route
          path="/applyforleave"
          element={
            <ProtectedRoute requiredRole="user">
              <Applyforleave />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
