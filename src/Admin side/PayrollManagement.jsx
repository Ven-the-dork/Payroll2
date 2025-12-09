import { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  CreditCard,
  Power,
  Menu,
  Search,
  Bell,
  Settings,
  Download,
  FileText,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

const MOCK_ROWS = [
  {
    id: 1,
    employee: "Sarah Johnson",
    department: "Engineering",
    gross: "$7,916.67",
    deductions: "$1,979.17",
    net: "$6,437.5",
    status: "Pending",
  },
  {
    id: 2,
    employee: "Michael Chen",
    department: "Marketing",
    gross: "$6,500",
    deductions: "$1,625",
    net: "$5,375",
    status: "Pending",
  },
  {
    id: 3,
    employee: "Emily Rodriguez",
    department: "Sales",
    gross: "$8,750",
    deductions: "$2,187.5",
    net: "$7,062.5",
    status: "Pending",
  },
  {
    id: 4,
    employee: "David Kim",
    department: "Design",
    gross: "$6,833.33",
    deductions: "$1,708.33",
    net: "$5,625",
    status: "Pending",
  },
  {
    id: 5,
    employee: "Jessica Brown",
    department: "Human Resources",
    gross: "$6,000",
    deductions: "$1,500",
    net: "$5,000",
    status: "Pending",
  },
  {
    id: 6,
    employee: "Robert Taylor",
    department: "Finance",
    gross: "$5,666.67",
    deductions: "$1,416.67",
    net: "$4,750",
    status: "Pending",
  },
];

export default function PayrollManagement() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState("December 2024");
  const [selectedIds, setSelectedIds] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);

  const sidebarWidth = isOpen ? "lg:w-64" : "lg:w-20";
  const hideWhenCollapsed = !isOpen && "hidden lg:block";

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // Load current user from sessionStorage
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

  const toggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const toggleAll = () => {
    if (selectedIds.length === MOCK_ROWS.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(MOCK_ROWS.map((r) => r.id));
    }
  };

  const totalGross = "$41,666.67";
  const totalDeductions = "$10,416.67";
  const totalNet = "$34,250";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Sidebar */}
      <aside
        className={`w-full lg:flex-shrink-0 ${sidebarWidth} max-w-full bg-green-700 text-white rounded-r-lg flex flex-col justify-between py-4 lg:py-6 transition-all duration-300`}
      >
        <div>
          {/* Profile (placeholder) */}
          <div
            className={`flex flex-col items-center mb-8 transition-all duration-300 ${hideWhenCollapsed}`}
          >
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
              <span className="text-2xl lg:text-3xl font-bold text-green-800">
                👤
              </span>
            </div>
            <h2 className="mt-3 text-base lg:text-lg text-white font-bold">
              {currentUser?.fullName}
            </h2>
            <p className="text-yellow-300 text-xs lg:text-sm">
              {currentUser?.position}
            </p>
          </div>

          {/* Nav */}
          <div className="px-4">
            <h3
              className={`text-yellow-300 text-xs uppercase mb-2 ${hideWhenCollapsed}`}
            >
              Features
            </h3>
            <nav className="space-y-1">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
              >
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
                <Users size={18} />
                {isOpen && "Employee Management"}
              </button>
              <button
                onClick={() => navigate("/leave-management")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
              >
                <CalendarDays size={18} />
                {isOpen && "Leave Management"}
              </button>
              <button
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer bg-yellow-400 text-green-900 font-semibold shadow-sm text-sm"
              >
                <CreditCard size={18} />
                {isOpen && "Payroll Management"}
              </button>
              {/* Audit Logs Button */}
              <button
                onClick={() => navigate("/audit-logs")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
              >
                <FileText size={18} />
                {isOpen && "Audit Logs"}
              </button>
            </nav>
          </div>
        </div>

        {/* Logout */}
        <div className="px-4 lg:px-6 mt-6 mb-1">
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
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden bg-[#faf7ea]">
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="self-start text-green-700 cursor-pointer hover:text-yellow-400 transition"
          >
            <Menu size={28} />
          </button>

          {/* Search */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full md:max-w-xl relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-full border-2 border-yellow-300 px-4 pr-10 py-2 text-sm md:text-base text-green-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
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
          </div>
        </div>

        {/* Header + Export */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-green-800">
              Process Payroll
            </h1>
            <p className="text-sm text-gray-600">
              Review and process employee payments
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-green-800 border border-yellow-300 shadow-sm hover:bg-yellow-50 cursor-pointer">
            <Download size={16} />
            Export Report
          </button>
        </div>

        {/* Period + summary cards */}
        <section className="space-y-4 mb-6">
          {/* Pay period strip */}
          <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Pay Period
              </p>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="border border-yellow-200 rounded-lg px-3 py-2 text-sm bg-yellow-50 text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option>December 2024</option>
                <option>November 2024</option>
                <option>October 2024</option>
              </select>
            </div>
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Total Gross Pay
              </p>
              <p className="text-xl font-bold text-green-800">{totalGross}</p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Total Deductions
              </p>
              <p className="text-xl font-bold text-red-600">
                {totalDeductions}
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Total Net Pay
              </p>
              <p className="text-xl font-bold text-green-700">{totalNet}</p>
            </div>
          </div>
        </section>

        {/* Payroll table */}
        <section className="bg-white rounded-2xl shadow-sm border border-yellow-100 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f5f0d9] text-green-900">
                <tr className="text-xs uppercase tracking-wide">
                  <th className="w-10 p-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedIds.length === MOCK_ROWS.length}
                      onChange={toggleAll}
                    />
                  </th>
                  <th className="p-3 text-left">Employee</th>
                  <th className="p-3 text-left">Department</th>
                  <th className="p-3 text-left">Gross Pay</th>
                  <th className="p-3 text-left">Deductions</th>
                  <th className="p-3 text-left">Net Pay</th>
                  <th className="p-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_ROWS.map((row, idx) => (
                  <tr
                    key={row.id}
                    className={`h-12 ${
                      idx % 2 === 0 ? "bg-white" : "bg-[#faf7ea]"
                    } border-t border-yellow-100`}
                  >
                    <td className="p-3 align-middle">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id)}
                        onChange={() => toggleRow(row.id)}
                      />
                    </td>
                    <td className="p-3 align-middle text-green-900">
                      {row.employee}
                    </td>
                    <td className="p-3 align-middle text-gray-800">
                      {row.department}
                    </td>
                    <td className="p-3 align-middle text-gray-800">
                      {row.gross}
                    </td>
                    <td className="p-3 align-middle text-red-600">
                      {row.deductions}
                    </td>
                    <td className="p-3 align-middle text-green-700">
                      {row.net}
                    </td>
                    <td className="p-3 align-middle">
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500" />
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer: selection + button */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#faf7ea] border-t border-yellow-100">
            <p className="text-xs text-gray-600">
              {selectedIds.length} of {MOCK_ROWS.length} selected
            </p>
            <button
              disabled={selectedIds.length === 0}
              className="inline-flex items-center justify-center rounded-full bg-green-700 px-5 py-2 text-sm font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-800 transition"
            >
              Process Selected Payroll
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
