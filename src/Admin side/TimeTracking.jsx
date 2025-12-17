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

  // --- FILTERS STATE ---
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  // Present / Late / Absent / On Leave stats
  const [stats, setStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
  });

  // --- Config ---
  const TZ = "Asia/Singapore"; // Singapore Standard Time
  const SHIFT_START_HOUR = 8; // attendance window cutoff (info text only)
  const LATE_HOUR = 9; // 9:00 AM => Late (1 hour after 8AM)
  const REQUIRED_HOURS = 8; // ✅ must be >= 8 hours to count as Present/Late

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

  // Fetch attendance logs + employees + leaves from Supabase
  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);

      try {
        // 1. Fetch Active Employees (Exclude Admins with lowercase 'admin')
        const { data: employees, error: empError } = await supabase
          .from("employees")
          .select("id, full_name, department, role")
          .eq("status", "Active")
          .neq("role", "admin");

        if (empError) throw empError;
        console.log("FETCHED EMPLOYEES:", employees);

        // 2. Fetch Attendance Logs for Selected Date
        const { data: logs, error: logError } = await supabase
          .from("attendance_logs")
          .select("employee_id, clock_in_at, clock_out_at")
          .gte("clock_in_at", `${selectedDate}T00:00:00`)
          .lt("clock_in_at", `${selectedDate}T23:59:59`);

        if (logError) throw logError;

        // 3. Fetch Approved Leaves that overlap with Selected Date
        const { data: leaves, error: leaveError } = await supabase
          .from("leave_applications")
          .select("employee_id, start_date, end_date, leave_plans(name)")
          .eq("status", "approved")
          .lte("start_date", selectedDate)
          .gte("end_date", selectedDate);

        if (leaveError) throw leaveError;

        // 4. MERGE DATA
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;
        let onLeaveCount = 0;

        const mergedData = employees.map((emp) => {
          // Find log for this employee
          const log = logs.find((l) => l.employee_id === emp.id);

          // Find leave for this employee
          const leave = leaves.find((l) => l.employee_id === emp.id);

          let status = "Absent";
          let duration = "-";
          let clockIn = "-";
          let clockOut = "-";

          if (log) {
            // --- HAS CLOCKED IN ---
            const start = new Date(log.clock_in_at);
            const end = log.clock_out_at ? new Date(log.clock_out_at) : null;

            clockIn = start.toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            });
            clockOut = end
              ? end.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                })
              : "-";

            // Duration
            if (end) {
              const diff = end.getTime() - start.getTime();
              const hours = diff / (1000 * 60 * 60);
              duration = `${hours.toFixed(2)} h`;
            }

            // Status Logic
            const startHour = start.getHours();

            if (startHour >= 12) {
              status = "Absent"; // Late logic override
              absentCount++;
            } else {
              status = end ? "Present" : "In progress";
              presentCount++;

              // Late check
              if (
                startHour > LATE_HOUR ||
                (startHour === LATE_HOUR && start.getMinutes() > 0)
              ) {
                status = "Late";
                lateCount++;
              }
            }
          } else if (leave) {
            // --- ON LEAVE ---
            status = "On Leave";
            clockIn = "On Leave";
            clockOut = "On Leave";
            duration = leave.leave_plans?.name || "Leave";
            onLeaveCount++;
          } else {
            // --- ABSENT ---
            status = "Absent";
            absentCount++;
          }

          return {
            id: emp.id,
            employee: emp.full_name,
            department: emp.department,
            date: selectedDate,
            clockIn,
            clockOut,
            duration,
            status,
          };
        });

        setAttendanceData(mergedData);
        setStats({
          present: presentCount,
          late: lateCount,
          absent: absentCount,
          onLeave: onLeaveCount,
        });
      } catch (error) {
        console.error("ATTENDANCE_FETCH_ERROR", error);
        setAttendanceData([]);
        setStats({ present: 0, late: 0, absent: 0, onLeave: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchAttendance();
  }, [selectedDate]);

  // --- FILTER LOGIC ---
  const filteredData = attendanceData.filter((row) => {
    // 1. Department
    if (
      selectedDepartment !== "All" &&
      row.department !== selectedDepartment
    ) {
      return false;
    }

    // 2. Status
    if (selectedStatus !== "All" && row.status !== selectedStatus) {
      return false;
    }

    // 3. Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      const nameMatch = row.employee.toLowerCase().includes(lowerSearch);
      const deptMatch = row.department
        ? row.department.toLowerCase().includes(lowerSearch)
        : false;

      if (!nameMatch && !deptMatch) return false;
    }

    return true;
  });

  const sidebarWidth = isOpen ? "lg:w-64" : "lg:w-20";
  const hideWhenCollapsed = !isOpen && "hidden lg:block";

  // status badge colors
  const statusBadgeClass = (status) => {
    if (status === "Late") return "bg-yellow-100 text-yellow-700";
    if (status === "Present") return "bg-green-100 text-green-700";
    if (status === "Undertime") return "bg-red-100 text-red-700";
    if (status === "In progress") return "bg-blue-100 text-blue-700";
    if (status === "On Leave") return "bg-purple-100 text-purple-700";
    if (status === "Absent") return "bg-red-100 text-red-700";
    return "bg-gray-100 text-gray-700";
  };

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
            Monitor employee attendance and working hours (SGT)
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Shift window resets at {SHIFT_START_HOUR}:00; Late if {LATE_HOUR}:00
            or later; Present/Late only if duration ≥ {REQUIRED_HOURS} hours.
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

          {/* On Leave (New Card) */}
          <div className="bg-white p-4 rounded-lg border border-purple-500 shadow-sm flex flex-col justify-between h-28 relative">
            <div className="flex justify-between items-start">
              <div className="text-purple-500">
                <CalendarDays size={24} />
              </div>
              <span className="text-3xl font-bold text-purple-500">
                {stats.onLeave}
              </span>
            </div>
            <p className="text-sm text-gray-600">On Leave</p>
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
        </div>

        {/* Filter Section */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            {/* Date Filter */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 flex items-center gap-1">
                <CalendarDays size={12} /> Date
              </label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
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
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 w-full bg-white"
              >
                <option value="All">All</option>
                <option value="IT">IT</option>
                <option value="HR">HR</option>
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
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 w-full bg-white"
              >
                <option value="All">All</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="In progress">In progress</option>
                <option value="On Leave">On Leave</option>
                <option value="Absent">Absent</option>
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
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
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
                    <td colSpan="7" className="p-8 text-center text-gray-500">
                      Loading attendance…
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500">
                      No attendance records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-3 font-medium text-gray-900">
                        {row.employee}
                      </td>
                      <td className="p-3 text-gray-600">{row.department}</td>
                      <td className="p-3 text-gray-600">{row.date}</td>
                      <td className="p-3 text-gray-600">{row.clockIn}</td>
                      <td className="p-3 text-gray-600">{row.clockOut}</td>
                      <td className="p-3 text-gray-600">{row.duration}</td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-bold ${statusBadgeClass(
                            row.status
                          )}`}
                        >
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
