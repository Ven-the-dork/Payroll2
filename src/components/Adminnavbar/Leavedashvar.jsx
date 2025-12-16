import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CreditCard,
  FileText,
  Clock,
  Power,
} from "lucide-react";

export default function AdminSidebar({
  isOpen,
  currentUser,
  onLogout,
  onNavigate, // pass (path) => navigate(path)
}) {
  const sidebarWidth = isOpen ? "lg:w-64" : "lg:w-20";
  const hideWhenCollapsed = !isOpen && "hidden lg:block";

  return (
    <aside
      className={`w-full lg:flex-shrink-0 ${sidebarWidth} max-w-full bg-green-700 text-white rounded-r-lg flex flex-col justify-between py-4 lg:py-6 transition-all duration-300`}
    >
      <div>
        {/* Profile */}
        <div
          className={`flex flex-col items-center mb-8 transition-all duration-300 ${hideWhenCollapsed}`}
        >
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
            <span className="text-2xl lg:text-3xl font-bold text-green-800">
              👤
            </span>
          </div>

          <h2 className="mt-3 text-base lg:text-lg text-white font-bold">
            {currentUser?.fullName || "Admin"}
          </h2>

          <p className="text-yellow-300 text-xs lg:text-sm">
            {currentUser?.position || "Admin"}
          </p>
        </div>

        {/* Navigation */}
        <div className="px-4">
          <h3 className={`text-yellow-300 text-xs uppercase mb-2 ${hideWhenCollapsed}`}>
            Features
          </h3>

          <nav className="space-y-1">
            <button
              onClick={() => onNavigate("/dashboard")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
            >
              <LayoutDashboard size={18} /> {isOpen && "Dashboard"}
            </button>
          </nav>

          <h3 className={`text-yellow-300 text-xs uppercase mt-6 mb-2 ${hideWhenCollapsed}`}>
            Organization
          </h3>
          <nav className="space-y-1">
            <button
              onClick={() => onNavigate("/employee-management")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
            >
              <Users size={18} /> {isOpen && "Employee Management"}
            </button>
               
            <button
              onClick={() => onNavigate("/leave-management")}
              className=" w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-full bg-yellow-400 text-green-900 font-semibold shadow-sm text-sm"
            >
              <CalendarDays size={18} /> {isOpen && "Leave Management"}
            </button>

            <button
              onClick={() => onNavigate("/PayrollManagement")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
            >
              <CreditCard size={18} /> {isOpen && "Payroll Management"}
            </button>

            <button
              onClick={() => onNavigate("/time-tracking")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
            >
              <Clock size={18} /> {isOpen && "Time Tracking"}
            </button>

            <button
              onClick={() => onNavigate("/audit-logs")}
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
          onClick={onLogout}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-green-900 px-4 py-2 text-sm font-bold text-white cursor-pointer hover:bg-green-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 shadow-lg transition-all"
        >
          <Power size={18} />
          {isOpen && "Log Out"}
        </button>
      </div>
    </aside>
  );
}
