import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

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
} from "lucide-react";

export default function Dashboard() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

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

          {/* Features Section */}
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

            {/* Organization */}
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
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm">
                <CreditCard size={18} /> {isOpen && "Payroll Management"}
              </button>
            </nav>
          </div>
        </div>

        {/* Logout Button */}
        <div className="px-4 lg:px-6 mt-4 lg:mt-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-green-900 px-4 py-2 text-sm font-bold text-white cursor-pointer hover:bg-green-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 shadow-lg transition-all"
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

          {/* Center search bar */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full md:max-w-md relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-full border-2 border-yellow-300 px-4 pr-10 py-2 text-sm md:text-base text-green-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <Search
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Right-side icons */}
          <div className="flex items-center gap-3 md:gap-4 md:ml-6 self-end md:self-auto">
            <button className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-yellow-400 text-green-900 rounded-full cursor-pointer hover:bg-yellow-300 transition">
              <Bell size={18} />
            </button>
            <button className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-yellow-400 text-green-900 rounded-full cursor-pointer hover:bg-yellow-300 transition">
              <Settings size={18} />
            </button>
            <button className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 bg-yellow-400 text-green-900 rounded-full cursor-pointer hover:bg-yellow-300 transition">
              <Mail size={18} />
            </button>
          </div>
        </div>

        {/* Dashboard Header */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-green-800 mb-4">
          Dashboard
        </h1>

        {/* Scrollable Indicator Cards */}
        <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar">
          <div className="flex-1 min-w-[250px] bg-green-700 text-yellow-300 rounded-2xl p-6 sm:p-8 flex items-center justify-between shadow-lg">
            <Users size={48} className="sm:size-[60px]" />
            <div className="text-right">
              <p className="text-3xl sm:text-4xl font-bold leading-none">12</p>
              <p className="text-base sm:text-lg mt-1">Employees</p>
            </div>
          </div>
          <div className="flex-1 min-w-[250px] bg-green-700 text-yellow-300 rounded-2xl p-6 sm:p-8 flex items-center justify-between shadow-lg">
            <CalendarDays size={48} className="sm:size-[60px]" />
            <div className="text-right">
              <p className="text-3xl sm:text-4xl font-bold leading-none">3</p>
              <p className="text-base sm:text-lg mt-1">Leaves</p>
            </div>
          </div>
          <div className="flex-1 min-w-[250px] bg-green-700 text-yellow-300 rounded-2xl p-6 sm:p-8 flex items-center justify-between shadow-lg">
            <CreditCard size={48} className="sm:size-[60px]" />
            <div className="text-right">
              <p className="text-3xl sm:text-4xl font-bold leading-none">8</p>
              <p className="text-base sm:text-lg mt-1">Payrolls</p>
            </div>
          </div>
        </div>

        {/* Section Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-yellow-50 rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              Applied Jobs
            </h2>
            <p className="text-green-700 text-sm">Dashboard</p>
          </div>
          <div className="bg-yellow-50 rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              Employees
            </h2>
            <p className="text-green-700 text-sm">Dashboard</p>
          </div>
          <div className="bg-yellow-50 rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              Candidates
            </h2>
            <p className="text-green-700 text-sm">Dashboard</p>
          </div>
          <div className="bg-yellow-50 rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-2">
              Payrolls
            </h2>
            <p className="text-green-700 text-sm">Dashboard</p>
          </div>
        </div>
      </main>
    </div>
  );
}
