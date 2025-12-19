import { useState, useEffect } from "react";
import { 
  Users, 
  CalendarDays, 
  Menu, 
  Search, 
  Settings, 
  Clock, 
  Download, 
  Filter,
  Briefcase,
  AlertTriangle,
  UserX,
  CheckCircle
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import AdminBell from "../components/AdminBell";
import AdminSidebar from "../components/Adminnavbar/Timetrackdashvar";
import FontSizeMenu from "../components/hooks/FontSizeMenu";
import AdminSetting from "../components/Adminsetting";

// --- Modern StatCard ---
function StatCard({ icon: Icon, color, value, label }) {
  const styles = {
    green: "bg-green-600 shadow-green-100 text-white",
    yellow: "bg-yellow-400 shadow-yellow-100 text-green-900",
    purple: "bg-purple-600 shadow-purple-100 text-white",
    red: "bg-red-500 shadow-red-100 text-white",
  };

  const activeStyle = styles[color] || styles.green;

  return (
    <div className={`rounded-2xl p-5 shadow-lg relative overflow-hidden group transition-transform hover:-translate-y-1 ${activeStyle}`}>
      <div className="relative z-10 flex flex-col h-full justify-between">
         <div className="flex justify-between items-start mb-2">
            <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
               <Icon size={22} />
            </div>
         </div>
         <div>
            <div className="text-3xl font-extrabold mb-1 tracking-tight">{value}</div>
            <p className="text-sm font-bold opacity-90 uppercase tracking-wide">{label}</p>
         </div>
      </div>
      {/* Decorative Blur */}
      <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
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
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
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
  const LATE_HOUR = 9; 

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch { setCurrentUser(null); }
    }
  }, []);

  useEffect(() => {
    const fetchAttendance = async () => {
      setLoading(true);
      try {
        const { data: employees, error: empError } = await supabase.from("employees").select("id, full_name, department, role").eq("status", "Active").neq("role", "admin");
        if (empError) throw empError;

        const { data: logs, error: logError } = await supabase.from("attendance_logs").select("employee_id, clock_in_at, shift_date, notes").eq("shift_date", selectedDate);
        if (logError) throw logError;

        const { data: leaves, error: leaveError } = await supabase.from("leave_applications").select("employee_id, start_date, end_date, status").eq("status", "approved").lte("start_date", selectedDate).gte("end_date", selectedDate);
        if (leaveError) throw leaveError;

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
            clockIn = start.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ });
            
            const startHour = parseInt(start.toLocaleTimeString("en-US", { hour: "numeric", hour12: false, timeZone: TZ }), 10);
            const startMin = parseInt(start.toLocaleTimeString("en-US", { minute: "2-digit", hour12: false, timeZone: TZ }), 10);
            const isLate = startHour > LATE_HOUR || (startHour === LATE_HOUR && startMin > 0);

            status = isLate ? "Late" : "Present";
            if (isLate) lateCount++; else presentCount++;
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
        setStats({ present: presentCount, late: lateCount, absent: absentCount, onLeave: onLeaveCount });
      } catch (error) {
        console.error("ATTENDANCE_FETCH_ERROR", error);
        setAttendanceData([]);
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
      if (!row.employee.toLowerCase().includes(lower) && !row.department.toLowerCase().includes(lower)) return false;
    }
    return true;
  });

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans text-gray-800">
      <AdminSidebar isOpen={isOpen} currentUser={currentUser} onLogout={handleLogout} onNavigate={(path) => navigate(path)} />

      <main className={`flex-1 flex flex-col transition-all duration-300 ${isOpen ? "lg:ml-0" : ""}`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsOpen((prev) => !prev)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">Time Tracking</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Daily attendance monitoring</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="hidden md:block text-xs text-gray-400 font-medium">Last updated: {currentTime}</span>
             <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>
             <AdminBell />
             <AdminSetting trigger={<button className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200 flex items-center justify-center"><Settings size={20}/></button>}>
               <FontSizeMenu />
             </AdminSetting>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard icon={CheckCircle} color="green" value={stats.present} label="Present" />
            <StatCard icon={AlertTriangle} color="yellow" value={stats.late} label="Late Arrivals" />
            <StatCard icon={CalendarDays} color="purple" value={stats.onLeave} label="On Leave" />
            <StatCard icon={UserX} color="red" value={stats.absent} label="Absent" />
          </div>

          {/* Filters Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
             <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                <label className="space-y-1">
                   <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><CalendarDays size={12}/> Date</span>
                   <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                </label>
                <label className="space-y-1">
                   <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Briefcase size={12}/> Department</span>
                   <select value={selectedDepartment} onChange={e => setSelectedDepartment(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                      <option value="All">All Departments</option>
                      <option value="IT">IT</option>
                      <option value="HR">HR</option>
                   </select>
                </label>
                <label className="space-y-1">
                   <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Filter size={12}/> Status</span>
                   <select value={selectedStatus} onChange={e => setSelectedStatus(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                      <option value="All">All Status</option>
                      <option value="Present">Present</option>
                      <option value="Late">Late</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Absent">Absent</option>
                   </select>
                </label>
                <div className="relative">
                   <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                   <input type="text" placeholder="Search name..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                </div>
             </div>
             
             <div className="mt-4 flex justify-end">
                <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-lg text-sm font-bold hover:bg-gray-50 transition shadow-sm">
                   <Download size={16}/> Export Report
                </button>
             </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
             <div className="overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                   <thead className="bg-gray-50/50 border-b border-gray-100">
                      <tr>
                         <th className="p-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Employee</th>
                         <th className="p-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Department</th>
                         <th className="p-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Date</th>
                         <th className="p-4 font-bold text-gray-500 uppercase text-xs tracking-wider">Clock In</th>
                         <th className="p-4 font-bold text-gray-500 uppercase text-xs tracking-wider text-right">Status</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {loading ? (
                         <tr><td colSpan="5" className="p-8 text-center text-gray-400">Loading attendance...</td></tr>
                      ) : filteredData.length === 0 ? (
                         <tr><td colSpan="5" className="p-8 text-center text-gray-400">No records found.</td></tr>
                      ) : (
                         filteredData.map(row => (
                            <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                               <td className="p-4 font-medium text-gray-900">{row.employee}</td>
                               <td className="p-4 text-gray-600">{row.department}</td>
                               <td className="p-4 text-gray-600 font-mono text-xs">{row.date}</td>
                               <td className="p-4 text-gray-600 font-mono text-xs">{row.clockIn}</td>
                               <td className="p-4 text-right">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                                     row.status === 'Present' ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' :
                                     row.status === 'Late' ? 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20' :
                                     row.status === 'On Leave' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-600/20' :
                                     'bg-red-50 text-red-700 ring-1 ring-red-600/20'
                                  }`}>
                                     <span className={`w-1.5 h-1.5 rounded-full ${
                                        row.status === 'Present' ? 'bg-green-600' :
                                        row.status === 'Late' ? 'bg-yellow-500' :
                                        row.status === 'On Leave' ? 'bg-purple-600' :
                                        'bg-red-600'
                                     }`}></span>
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
        </div>
      </main>
    </div>
  );
}
