import { useState, useEffect } from "react";
import {
  Users,
  CalendarDays,
  Menu,
  Search,
  Settings,
  Clock,
  Download,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import AdminBell from "../components/AdminBell";
import AdminSidebar from "../components/Adminnavbar/Timetrackdashvar";
import FontSizeMenu from "../components/hooks/FontSizeMenu";
import AdminSetting from "../components/Adminsetting";

export default function TimeTracking() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Attendance data from Supabase
  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Present / Late / Absent stats
  const [stats, setStats] = useState({ present: 0, late: 0, absent: 0 });

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // Load user from session
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

  // Fetch attendance logs + employees from Supabase
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("attendance_logs")
        .select(
          `
          id,
          clock_in_at,
          clock_out_at,
          employee:employees!attendance_logs_employee_id_fkey (
            full_name,
            department
          )
        `
        )
        .order("clock_in_at", { ascending: false });

      if (error) {
        console.error("ATTENDANCE_ERROR", error);
        setAttendanceData([]);
        setStats({ present: 0, late: 0, absent: 0 });
        setLoading(false);
        return;
      }

      const mapped = data.map((row) => {
        const start = row.clock_in_at ? new Date(row.clock_in_at) : null;
        const end = row.clock_out_at ? new Date(row.clock_out_at) : null;

        let duration = "";
        if (start && end) {
          const diffMs = end.getTime() - start.getTime();
          const hours = diffMs / (1000 * 60 * 60);
          duration = `${hours.toFixed(2)} h`;
        }

        return {
          id: row.id,
          employee: row.employee?.full_name || "Unknown",
          department: row.employee?.department || "-",
          date: start ? start.toLocaleDateString() : "",
          clockIn: start ? start.toLocaleTimeString() : "",
          clockOut: end ? end.toLocaleTimeString() : "",
          duration,
          status: end ? "Present" : "In progress",
        };
      });

      // ---- compute stats for today ----
      const today = new Date().toLocaleDateString();

      let present = 0;
      let late = 0;

      data.forEach((row) => {
        if (!row.clock_in_at) return;

        const start = new Date(row.clock_in_at);

        // Only consider today's logs
        if (start.toLocaleDateString() !== today) return;

        present += 1;

        // Late if clock-in after 8:00 AM
        if (
          start.getHours() > 8 ||
          (start.getHours() === 8 && start.getMinutes() > 0)
        ) {
          late += 1;
        }
      });

      // For now, absent is 0 (until you add schedule/employee-based logic)
      const absent = 0;

      setAttendanceData(mapped);
      setStats({ present, late, absent });
      setLoading(false);
    };

    fetchAttendance();
  }, []);

  const sidebarWidth = isOpen ? "lg:w-64" : "lg:w-20";
  const hideWhenCollapsed = !isOpen && "hidden lg:block";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans">
      <AdminSidebar
        isOpen={isOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={(path) => navigate(path)}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden bg-[#FDFBF6]">
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
            <div className="w-full md:max-w-md relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-full border border-gray-300 px-4 pr-10 py-2 text-sm md:text-base text-gray-700 shadow-sm focus:outline-none focus:ring-1 focus:ring-green-600"
              />
              <Search
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Right icons */}
          <div className="flex items-center gap-3 md:gap-4 md:ml-6 self-end md:self-auto">
            <AdminBell />
            <AdminSetting
              trigger={
                <button
                  type="button"
                  className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400 text-green-900 hover:bg-yellow-300 transition"
                  aria-label="Settings"
                >
                  <Settings size={18} />
                </button>
              }
            >
              {({ close }) => <FontSizeMenu closeMenu={close} />}
            </AdminSetting>
          </div>
        </div>

        {/* Page Title & Subtitle */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-green-800">
            Time Tracking
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Monitor employee attendance and working hours
          </p>
        </div>

        {/* Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Present */}
          <div className="bg-white p-4 rounded-lg border border-green-600 shadow-sm flex flex-col justify-between h-28 relative">
            <div className="flex justify-between items-start">
              <div className="text-green-600">
                <Users size={24} />
              </div>
              <span className="text-3xl font-bold text-gray-700">
                {stats.present}
              </span>
            </div>
            <p className="text-sm text-gray-600">Present</p>
          </div>

          {/* Late Arrivals */}
          <div className="bg-white p-4 rounded-lg border border-yellow-400 shadow-sm flex flex-col justify-between h-28 relative">
            <div className="flex justify-between items-start">
              <div className="text-yellow-500">
                <Clock size={24} />
              </div>
              <span className="text-3xl font-bold text-yellow-500">
                {stats.late}
              </span>
            </div>
            <p className="text-sm text-gray-600">Late Arrivals</p>
          </div>

          {/* Absent */}
          <div className="bg-white p-4 rounded-lg border border-red-500 shadow-sm flex flex-col justify-between h-28 relative">
            <div className="flex justify-between items-start">
              <div className="text-red-500 relative">
                <Users size={24} />
                <div className="absolute top-0 left-5 text-red-500 font-bold text-xs">
                  x
                </div>
              </div>
              <span className="text-3xl font-bold text-red-500">
                {stats.absent}
              </span>
            </div>
            <p className="text-sm text-gray-600">Absent</p>
          </div>

          {/* Attendance Rate */}
          <div className="bg-white p-4 rounded-lg border border-green-800 shadow-sm flex flex-col justify-between h-28 relative">
            <div className="flex justify-between items-start">
              <div className="text-green-800">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline>
                  <polyline points="17 6 23 6 23 12"></polyline>
                </svg>
              </div>
              <span className="text-3xl font-bold text-green-800">
                {stats.present + stats.late + stats.absent === 0
                  ? "0.0%"
                  : `${(
                      (stats.present /
                        (stats.present + stats.late + stats.absent)) *
                      100
                    ).toFixed(1)}%`}
              </span>
            </div>
            <p className="text-sm text-gray-600">Attendance Rate</p>
          </div>
        </div>

        {/* Filter Section (UI only for now) */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Date Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 flex items-center gap-1">
                <CalendarDays size={12} /> Date
              </label>
              <input
                type="date"
                defaultValue="2025-12-12"
                className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 w-full"
              />
            </div>

            {/* Department Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 flex items-center gap-1">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>{" "}
                Department
              </label>
              <select className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 w-full bg-white">
                <option>All</option>
                <option>IT</option>
                <option>HR</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 flex items-center gap-1">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                </svg>{" "}
                Status
              </label>
              <select className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 w-full bg-white">
                <option>All</option>
                <option>Present</option>
                <option>Absent</option>
                <option>Late</option>
              </select>
            </div>

            {/* Search & Export */}
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  <Search size={12} /> Search
                </label>
                <input
                  type="text"
                  placeholder="Employee or department..."
                  className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 w-full"
                />
              </div>
              <div className="flex items-end">
                <button className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-md text-sm font-semibold flex items-center gap-2 h-10 transition">
                  <Download size={16} /> Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-green-700 text-white font-semibold">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Clock In</th>
                  <th className="p-3">Clock Out</th>
                  <th className="p-3">Duration</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-8 text-center text-gray-500"
                    >
                      Loading attendance…
                    </td>
                  </tr>
                ) : attendanceData.length === 0 ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-8 text-center text-gray-500"
                    >
                      No attendance records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  attendanceData.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-3">{row.employee}</td>
                      <td className="p-3">{row.department}</td>
                      <td className="p-3">{row.date}</td>
                      <td className="p-3">{row.clockIn}</td>
                      <td className="p-3">{row.clockOut}</td>
                      <td className="p-3">{row.duration}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
