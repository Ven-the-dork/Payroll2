import { useState, useEffect } from "react";
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
  Clock, // Importing Clock icon for Time Tracking
  FileText, // Importing FileText for Audit Logs
  Download,
} from "lucide-react";

import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

export default function TimeTracking() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Hardcoded Data State
  const [attendanceData] = useState([
    // You can add dummy data here later to test the table rows
    // { id: 1, employee: "John Doe", department: "IT", date: "2025-12-12", clockIn: "09:00 AM", clockOut: "05:00 PM", duration: "8h", status: "Present" }
  ]);

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

  const sidebarWidth = isOpen ? "lg:w-64" : "lg:w-20";
  const hideWhenCollapsed = !isOpen && "hidden lg:block";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans">
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
              <span className="text-2xl lg:text-3xl font-bold text-green-800">
                👤
              </span>
            </div>
            <h2 className="mt-3 text-base lg:text-lg text-white font-bold">
              {currentUser?.fullName || "Admin"}
            </h2>
            <p className="text-yellow-300 text-xs lg:text-sm">
              {currentUser?.position || "Position"}
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
              
              {/* Time Tracking (Active State) */}
              <button
                className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-full bg-yellow-400 text-green-900 font-semibold shadow-sm text-sm"
              >
                <Clock size={18} /> {isOpen && "Time Tracking"}
              </button>

              {/* Audit Logs */}
              <button
                onClick={() => navigate("/audit-logs")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
              >
                <FileText size={18} /> {isOpen && "Audit Logs"}
              </button>
            </nav>
          </div>
        </div>

        {/* Logout (Copied Style from Dashboard) */}
        <div className="px-4 lg:px-6 mt-4 lg:mt-0">
          <button
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-green-900 px-4 py-2 text-sm font-bold text-white cursor-pointer hover:bg-green-800 active:scale-0.98 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 shadow-lg transition-all"
          >
            <Power size={18} />
            {isOpen && "Log Out"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden bg-[#FDFBF6]"> {/* Using a slightly creamy background to match image */}
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
            <button className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400 text-white cursor-pointer hover:bg-yellow-300 transition">
              <Bell size={18} />
            </button>
            <button className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400 text-white cursor-pointer hover:bg-yellow-300 transition">
              <Settings size={18} />
            </button>
            <button className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400 text-white cursor-pointer hover:bg-yellow-300 transition">
              <Mail size={18} />
            </button>
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
                 {/* Icon placeholder for User Check/Present */}
                 <Users size={24} />
              </div>
              <span className="text-3xl font-bold text-gray-700">0</span>
            </div>
            <p className="text-sm text-gray-600">Present</p>
          </div>

          {/* Late Arrivals */}
          <div className="bg-white p-4 rounded-lg border border-yellow-400 shadow-sm flex flex-col justify-between h-28 relative">
            <div className="flex justify-between items-start">
              <div className="text-yellow-500">
                 {/* Icon placeholder for Alert/Late */}
                 <Clock size={24} />
              </div>
              <span className="text-3xl font-bold text-yellow-500">0</span>
            </div>
            <p className="text-sm text-gray-600">Late Arrivals</p>
          </div>

          {/* Absent */}
          <div className="bg-white p-4 rounded-lg border border-red-500 shadow-sm flex flex-col justify-between h-28 relative">
            <div className="flex justify-between items-start">
              <div className="text-red-500">
                 {/* Icon placeholder for User X/Absent */}
                 <Users size={24} /> 
                 <div className="absolute top-4 left-9 text-red-500 font-bold text-xs">x</div>
              </div>
              <span className="text-3xl font-bold text-red-500">0</span>
            </div>
            <p className="text-sm text-gray-600">Absent</p>
          </div>

          {/* Attendance Rate */}
          <div className="bg-white p-4 rounded-lg border border-green-800 shadow-sm flex flex-col justify-between h-28 relative">
            <div className="flex justify-between items-start">
              <div className="text-green-800">
                 {/* Icon placeholder for Graph/Rate */}
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
              <span className="text-3xl font-bold text-green-800">0.0%</span>
            </div>
            <p className="text-sm text-gray-600">Attendance Rate</p>
          </div>
        </div>

        {/* Filter Section */}
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
             {/* Date Filter */}
             <div className="flex flex-col gap-1">
               <label className="text-xs text-gray-500 flex items-center gap-1">
                 <CalendarDays size={12}/> Date
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
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg> Department
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
                 <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg> Status
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
                    <Search size={12}/> Search
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
                {attendanceData.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="p-8 text-center text-gray-500">
                      No attendance records found for the selected filters.
                    </td>
                  </tr>
                ) : (
                  attendanceData.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 hover:bg-gray-50">
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

