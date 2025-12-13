import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import { 
  LayoutDashboard, 
  Mail, 
  Users, 
  CalendarDays, 
  CreditCard, 
  Power, 
  Menu, 
  Search, 
  Bell, 
  Settings, 
  FileText,
  Clock // <--- ADD THIS
} from "lucide-react";


export default function Dashboard() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Dynamic counters
  const [employeeCount, setEmployeeCount] = useState(0);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // Load user stored in Loginpage.jsx
  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) {
      try {
        setCurrentUser(JSON.parse(stored));
      } catch {
        setCurrentUser(null);
      }
    }
  }, []);

  // Fetch dynamic counts from Supabase
  useEffect(() => {
    async function fetchCounts() {
      setLoadingCounts(true);

      // Count employees (excluding admin role)
      const { count: empCount, error: empError } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin");

      if (!empError) {
        setEmployeeCount(empCount || 0);
      }

      // Count pending leaves
      const { count: leaveCount, error: leaveError } = await supabase
        .from("leave_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (!leaveError) {
        setPendingLeavesCount(leaveCount || 0);
      }

      setLoadingCounts(false);
    }

    fetchCounts();
  }, []);

  const sidebarWidth = isOpen ? "lg:w-64" : "lg:w-20";
  const hideWhenCollapsed = !isOpen && "hidden lg:block";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Sidebar */}
      <aside
        className={`w-full lg:flex-shrink-0 ${sidebarWidth} max-w-full bg-green-700 text-white rounded-r-lg flex flex-col justify-between py-4 lg:py-6 transition-all duration-300`}
      >
        <div>
          {/* Profile Section */}
          <div
            className={`flex flex-col items-center mb-8 transition-all duration-300 ${hideWhenCollapsed}`}
          >
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
              <span className="text-2xl lg:text-3xl font-bold text-green-800">👤</span>
            </div>
            <h2 className="mt-3 text-base lg:text-lg text-white font-bold">
              {currentUser?.fullName}
            </h2>
            <p className="text-yellow-300 text-xs lg:text-sm">
              {currentUser?.position}
            </p>
          </div>

          {/* Navigation */}
          <div className="px-4">
            <h3
              className={`text-yellow-300 text-xs uppercase mb-2 ${hideWhenCollapsed}`}
            >
              Features
            </h3>
            <nav className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-full bg-yellow-400 text-green-900 font-semibold shadow-sm text-sm">
                <LayoutDashboard size={18} /> {isOpen && "Dashboard"}
              </button>
            </nav>

            <h3
              className={`text-yellow-300 text-xs uppercase mt-6 mb-2 ${hideWhenCollapsed}`}
            >
              Organization
            </h3>
            <nav className="space-y-1">
              <button
                onClick={() => navigate("/employee-management")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
              >
                <Users size={18} /> {isOpen && "Employee Management"}
              </button>
              <button
                onClick={() => navigate("/leave-management")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
              >
                <CalendarDays size={18} /> {isOpen && "Leave Management"}
              </button>
              <button
                onClick={() => navigate("/PayrollManagement")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
              >
                <CreditCard size={18} /> {isOpen && "Payroll Management"}
              </button>
              <button
              onClick={() => navigate("/time-tracking")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
            >
              <Clock size={18} /> {isOpen && "Time Tracking"}
            </button>
              <button
                onClick={() => navigate("/audit-logs")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
              >
                <FileText size={18} /> {isOpen && "Audit Logs"}
              </button>
            </nav>
          </div>
        </div>

        {/* Logout */}
        <div className="px-4 lg:px-6 mt-4 lg:mt-0">
          <button
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-green-900 px-4 py-2 text-sm font-bold text-white cursor-pointer hover:bg-green-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 shadow-lg transition-all"
          >
            <Power size={18} />
            {isOpen && "Log Out"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden bg-white">
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="self-start text-green-700 cursor-pointer hover:text-yellow-400 transition"
          >
            <Menu size={28} />
          </button>

          {/* Search */}
          <div className="flex-1 flex justify-center">
            <div className="w-full md:max-w-md relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-full border-2 border-yellow-300 px-4 pr-10 py-2 text-sm md:text-base text-green-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <Search
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-3 md:gap-4 md:ml-6 self-end md:self-auto">
            <button className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400 text-green-900 cursor-pointer hover:bg-yellow-300 transition">
              <Bell size={18} />
            </button>
            <button className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400 text-green-900 cursor-pointer hover:bg-yellow-300 transition">
              <Settings size={18} />
            </button>
            <button className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400 text-green-900 cursor-pointer hover:bg-yellow-300 transition">
              <Mail size={18} />
            </button>
          </div>
        </div>

        {/* Dashboard Header */}
        <div className="mb-6">
          <h1 className="text-3xl md:text-4xl font-extrabold text-green-800">
            Dashboard
          </h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">
            Welcome back, {currentUser?.fullName || "Admin"}!
          </p>
        </div>

        {/* Scrollable Indicator Cards */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max">
            {/* Employees Card */}
            <button
              onClick={() => navigate("/employee-management")}
              className="flex flex-col items-center justify-center w-40 h-32 sm:w-48 sm:h-36 rounded-3xl bg-gradient-to-br from-green-600 to-green-800 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer"
            >
              <Users size={32} className="mb-2" />
              <div className="text-3xl sm:text-4xl font-extrabold">
                {loadingCounts ? "..." : employeeCount}
              </div>
              <div className="text-xs sm:text-sm uppercase tracking-wider mt-1">
                Employees
              </div>
            </button>

            {/* Pending Leaves Card */}
            <button
              onClick={() => navigate("/leave-management")}
              className="flex flex-col items-center justify-center w-40 h-32 sm:w-48 sm:h-36 rounded-3xl bg-gradient-to-br from-yellow-500 to-yellow-600 text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 cursor-pointer"
            >
              <CalendarDays size={32} className="mb-2" />
              <div className="text-3xl sm:text-4xl font-extrabold">
                {loadingCounts ? "..." : pendingLeavesCount}
              </div>
              <div className="text-xs sm:text-sm uppercase tracking-wider mt-1">
                Pending Leaves
              </div>
            </button>

            {/* Payrolls Card - Disabled/Coming Soon */}
            <div className="flex flex-col items-center justify-center w-40 h-32 sm:w-48 sm:h-36 rounded-3xl bg-gradient-to-br from-gray-400 to-gray-500 text-white shadow-lg opacity-60 cursor-not-allowed">
              <CreditCard size={32} className="mb-2" />
              <div className="text-3xl sm:text-4xl font-extrabold">-</div>
              <div className="text-xs sm:text-sm uppercase tracking-wider mt-1">
                Payrolls
              </div>
              <div className="text-[10px] mt-1 bg-white/20 px-2 py-0.5 rounded-full">
                Coming Soon
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions or Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Employees Section */}
          <div className="rounded-3xl bg-white shadow-sm border border-yellow-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <Users size={24} className="text-green-700" />
              </div>
              <h2 className="text-lg font-semibold text-green-800">Employees</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Manage your workforce efficiently
            </p>
            <button
              onClick={() => navigate("/employee-management")}
              className="w-full inline-flex items-center justify-center rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-green-800 transition-all"
            >
              View All Employees
            </button>
          </div>

          {/* Leaves Section */}
          <div className="rounded-3xl bg-white shadow-sm border border-yellow-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                <CalendarDays size={24} className="text-yellow-700" />
              </div>
              <h2 className="text-lg font-semibold text-green-800">Leaves</h2>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              {pendingLeavesCount > 0 
                ? `${pendingLeavesCount} leave${pendingLeavesCount > 1 ? 's' : ''} awaiting approval`
                : "No pending leave requests"}
            </p>
            <button
              onClick={() => navigate("/leave-management")}
              className="w-full inline-flex items-center justify-center rounded-full bg-yellow-500 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-yellow-600 transition-all"
            >
              Manage Leaves
            </button>
          </div>

          {/* Payrolls Section - Disabled */}
          <div className="rounded-3xl bg-white shadow-sm border border-gray-200 p-6 opacity-60">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <CreditCard size={24} className="text-gray-500" />
              </div>
              <h2 className="text-lg font-semibold text-gray-600">Payrolls</h2>
            </div>
            <p className="text-gray-500 text-sm mb-4">
              Feature coming soon
            </p>
            <button
              disabled
              className="w-full inline-flex items-center justify-center rounded-full bg-gray-400 px-4 py-2 text-sm font-semibold text-white cursor-not-allowed"
            >
              Coming Soon
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
