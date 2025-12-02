import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import DynamicTitle from "./DynamicTitle";
import Dashboard from "./Dashboard";
import EmployeeManagement from "./EmployeeManagement";
import LeaveManagement from "./LeaveManagement";
import LoginPage from "./Loginpage";
import DashboardUser from "../User-side/DashboardUser";
import Applyforleave from "../User-side/Applyforleave";
import ProtectedRoute from "./ProtectedRoute";

function App() {
  return (
    <Router>
      <DynamicTitle />

      <Routes>
        
        <Route path="/" element={<LoginPage />} />

        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute requiredRole="admin">
              <Dashboard />
            </ProtectedRoute>
          }
        />
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

        {/* User-only */}
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
