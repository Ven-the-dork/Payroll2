import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CreditCard,
  FileText,
  Clock,
  Power,
} from "lucide-react";

export default function AdminSidebarSticky({
  isOpen,
  currentUser,
  activePath,          // ex: "/audit-logs"
  onNavigate,          // (path) => navigate(path)
  onLogout,            // () => handleLogout()
}) {
  const sidebarWidth = isOpen ? "lg:w-64" : "lg:w-20";
  const hideWhenCollapsed = !isOpen && "hidden lg:block";

  const baseBtn =
    "w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer transition font-semibold text-sm";

  const inactiveBtn = "hover:bg-white/10 text-white/90 hover:text-white";
  const activeBtn = "bg-yellow-400 text-green-900 shadow-sm";

  const navItems = [
    { label: "Dashboard", path: "/dashboard", Icon: LayoutDashboard },
    { label: "Employee Management", path: "/employee-management", Icon: Users },
    { label: "Leave Management", path: "/leave-management", Icon: CalendarDays },
    { label: "Payroll Management", path: "/PayrollManagement", Icon: CreditCard },
    { label: "Time Tracking", path: "/time-tracking", Icon: Clock },
    { label: "Audit Logs", path: "/audit-logs", Icon: FileText },
  ];

  return (
    <aside
      className={`w-full lg:flex-shrink-0 ${sidebarWidth} max-w-full bg-green-700 text-white rounded-r-lg flex flex-col py-4 lg:py-6 transition-all duration-300 lg:sticky lg:top-0 lg:h-screen`}
    >
      {/* ✅ keeps logout at bottom */}
      <div className="flex-1">
        {/* Profile */}
        <div
          className={`flex flex-col items-center mb-8 transition-all duration-300 ${hideWhenCollapsed}`}
        >
          <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
            <span className="text-2xl lg:text-3xl font-bold text-green-800">👤</span>
          </div>

          <h2 className="mt-3 text-base lg:text-lg text-white font-bold">
            {currentUser?.fullName || "Admin"}
          </h2>

          <p className="text-yellow-300 text-xs lg:text-sm">
            {currentUser?.position || "Admin"}
          </p>
        </div>

        {/* Nav */}
        <div className="px-4">
          <h3 className={`text-yellow-300 text-xs uppercase mb-2 ${hideWhenCollapsed}`}>
            Features
          </h3>

          <nav className="space-y-1">
            {navItems.slice(0, 1).map(({ label, path, Icon }) => (
              <button
                key={path}
                onClick={() => onNavigate(path)}
                className={`${baseBtn} ${activePath === path ? activeBtn : inactiveBtn}`}
              >
                <Icon size={18} />
                {isOpen && label}
              </button>
            ))}
          </nav>

          <h3 className={`text-yellow-300 text-xs uppercase mt-6 mb-2 ${hideWhenCollapsed}`}>
            Organization
          </h3>

          <nav className="space-y-1">
            {navItems.slice(1).map(({ label, path, Icon }) => (
              <button
                key={path}
                onClick={() => onNavigate(path)}
                className={`${baseBtn} ${activePath === path ? activeBtn : inactiveBtn}`}
              >
                <Icon size={18} />
                {isOpen && label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Logout pinned to bottom */}
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
