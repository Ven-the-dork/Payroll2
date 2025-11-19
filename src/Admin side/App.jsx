import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import DynamicTitle from "./DynamicTitle";
import Dashboard from "./Dashboard";
import EmployeeManagement from "./EmployeeManagement";
import LeaveManagement from "./LeaveManagement";
import LoginPage from "./Loginpage";
import DashboardUser from "../User-side/DashboardUser";
import Applyforleave from "../User-side/Applyforleave";

function App() {
  return (
    <Router>
      <DynamicTitle /> 
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/leave-management" element={<LeaveManagement />} />
        <Route path="/employee" element={<EmployeeManagement />} />
        <Route path="/dashboard_user" element={<DashboardUser/>} />
        <Route path="/applyforleave" element={<Applyforleave/>} />
      </Routes>
    </Router>
  );
}

export default App;
