import { useState, useEffect } from "react";
import { Users, CalendarDays, Menu, Search, Settings, Clock, Download } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import AdminBell from "../components/AdminBell";
import AdminSidebar from "../components/Adminnavbar/Timetrackdashvar";
import FontSizeMenu from "../components/hooks/FontSizeMenu";
import AdminSetting from "../components/Adminsetting";

// --- StatCard ---
function StatCard({ icon: Icon, color, value, label, isAbsent }) {
  const colorClasses = {
    green: "text-green-600 border-green-600",
    yellow: "text-yellow-500 border-yellow-400",
    purple: "text-purple-500 border-purple-500",
    red: "text-red-500 border-red-500",
  };

  const activeColorClass = colorClasses[color] || colorClasses.green;
  const iconColorClass = activeColorClass.split(" ")[0];

  return (
    <div
      className={`bg-white p-4 rounded-lg border shadow-sm flex flex-col justify-between h-28 relative ${activeColorClass}`}
    >
      <div className="flex justify-between items-start">
        <div className={iconColorClass}>
          <Icon size={24} />
          {isAbsent && (
            <div className="absolute top-4 left-9 text-xs font-bold">x</div>
          )}
        </div>
        <span className={`text-3xl font-bold ${iconColorClass}`}>{value}</span>
      </div>
      <p className="text-sm text-gray-600">{label}</p>
    </div>
  );
}

export default function TimeTracking() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [attendanceData, setAttendanceData] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedStatus, setSelectedStatus] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");

  const [stats, setStats] = useState({
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
  });

  // Config
  const TZ = "Asia/Singapore";
  const LATE_HOUR = 9; // late if > 09:00 SGT

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

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

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);

      try {
        // 1) Employees
        const { data: employees, error: empError } = await supabase
          .from("employees")
          .select("id, full_name, department, role")
          .eq("status", "Active")
          .neq("role", "admin");

        if (empError) throw empError;

        // 2) Clock-in logs for the selected shift_date (clock-in only)
        const { data: logs, error: logError } = await supabase
          .from("attendance_logs")
          .select("employee_id, clock_in_at, shift_date, notes")
          .eq("shift_date", selectedDate);

        if (logError) throw logError;

        // 3) Approved leaves overlapping selectedDate
        const { data: leaves, error: leaveError } = await supabase
          .from("leave_applications")
          .select("employee_id, start_date, end_date, status")
          .eq("status", "approved")
          .lte("start_date", selectedDate)
          .gte("end_date", selectedDate);

        if (leaveError) throw leaveError;

        // 4) Merge + stats
        let presentCount = 0;
        let lateCount = 0;
        let absentCount = 0;
        let onLeaveCount = 0;

        const merged = employees.map((emp) => {
          const leave = leaves.find((l) => l.employee_id === emp.id);
          const log = logs.find((l) => l.employee_id === emp.id);

          let status = "Absent";
          let clockIn = "-";

          if (leave) {
            status = "On Leave";
            clockIn = "On Leave";
            onLeaveCount++;
          } else if (log?.clock_in_at) {
            const start = new Date(log.clock_in_at);

            clockIn = start.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
              timeZone: TZ,
            });

            const startHour = parseInt(
              start.toLocaleTimeString("en-US", {
                hour: "numeric",
                hour12: false,
                timeZone: TZ,
              }),
              10
            );

            const startMin = parseInt(
              start.toLocaleTimeString("en-US", {
                minute: "2-digit",
                hour12: false,
                timeZone: TZ,
              }),
              10
            );

            const isLate = startHour > LATE_HOUR || (startHour === LATE_HOUR && startMin > 0);

            status = isLate ? "Late" : "Present";
            if (isLate) lateCount++;
            else presentCount++;
          } else {
            status = "Absent";
            absentCount++;
          }

          return {
            id: emp.id,
            employee: emp.full_name ?? "(No name)",
            department: emp.department ?? "-",
            date: selectedDate,
            clockIn,
            status,
          };
        });

        setAttendanceData(merged);
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

  const filteredData = attendanceData.filter((row) => {
    if (selectedDepartment !== "All" && row.department !== selectedDepartment) return false;
    if (selectedStatus !== "All" && row.status !== selectedStatus) return false;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      const nameMatch = (row.employee || "").toLowerCase().includes(lower);
      const deptMatch = (row.department || "").toLowerCase().includes(lower);
      if (!nameMatch && !deptMatch) return false;
    }
    return true;
  });

  const sidebarWidth = isOpen ? "lg:w-64" : "lg:w-20";

  const statusBadgeClass = (status) => {
    if (status === "Late") return "bg-yellow-100 text-yellow-700";
    if (status === "Present") return "bg-green-100 text-green-700";
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

      <main
        className={`flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden bg-[#FDFBF6] ${sidebarWidth}`}
      >
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <button
            onClick={() => setIsOpen((prev) => !prev)}
            className="self-start text-green-700 cursor-pointer hover:text-yellow-400 transition"
          >
            <Menu size={28} />
          </button>

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
              <FontSizeMenu />
            </AdminSetting>
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-green-800">Time Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">Clock-in based attendance (SGT)</p>
          <p className="text-xs text-gray-400 mt-1">Late if after {LATE_HOUR}:00 (SGT).</p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={Users} color="green" value={stats.present} label="Present" />
          <StatCard icon={Clock} color="yellow" value={stats.late} label="Late Arrivals" />
          <StatCard icon={CalendarDays} color="purple" value={stats.onLeave} label="On Leave" />
          <StatCard icon={Users} color="red" value={stats.absent} label="Absent" isAbsent />
        </div>

        {/* Filters */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
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

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Department</label>
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

            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500">Status</label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="border border-gray-300 rounded-md p-2 text-sm focus:outline-none focus:ring-1 focus:ring-green-600 w-full bg-white"
              >
                <option value="All">All</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="On Leave">On Leave</option>
                <option value="Absent">Absent</option>
              </select>
            </div>

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

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-green-700 text-white font-semibold">
                <tr>
                  <th className="p-3">Employee</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Clock In</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">
                      Loading attendance…
                    </td>
                  </tr>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500">
                      No attendance records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="p-3 font-medium text-gray-900">{row.employee}</td>
                      <td className="p-3 text-gray-600">{row.department}</td>
                      <td className="p-3 text-gray-600">{row.date}</td>
                      <td className="p-3 text-gray-600">{row.clockIn}</td>
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
