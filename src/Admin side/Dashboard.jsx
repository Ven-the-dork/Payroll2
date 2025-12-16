import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import { Menu, Search, Settings } from "lucide-react";

import AdminBell from "../components/AdminBell";
import AdminSidebar from "../components/Adminnavbar/Dashsidevar";
import FontSizeMenu from "../components/hooks/FontSizeMenu";
import AdminSetting from "../components/Adminsetting";
// IMPORTANT: Fix this path to wherever the component actually is.
// Recommended location: ../components/FontSizeMenu


export default function Dashboard() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Dynamic counters
  const [employeeCount, setEmployeeCount] = useState(0);
  const [pendingLeavesCount, setPendingLeavesCount] = useState(0);
  const [loadingCounts, setLoadingCounts] = useState(true);

  // Settings dropdown
  const [openSettings, setOpenSettings] = useState(false);
  const settingsRef = useRef(null);

  const [unseenLeavesCount, setUnseenLeavesCount] = useState(0);
  const [bellSnapshot, setBellSnapshot] = useState([]);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // Close settings dropdown when clicking outside
  useEffect(() => {
    const onDocClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setOpenSettings(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []); // outside-click pattern [web:56]

  // Load user stored in sessionStorage
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
    let interval;

    async function fetchCounts() {
      setLoadingCounts(true);

      const { count: empCount, error: empError } = await supabase
        .from("employees")
        .select("*", { count: "exact", head: true })
        .neq("role", "admin");

      if (!empError) setEmployeeCount(empCount || 0);

      const { count: leaveCount, error: leaveError } = await supabase
        .from("leave_applications")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (!leaveError) setPendingLeavesCount(leaveCount || 0);

      setLoadingCounts(false);
    }

    fetchCounts();

    interval = setInterval(() => {
      fetchCounts();
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white font-sans">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={isOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={(path) => navigate(path)}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden bg-white">
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <button
            onClick={() => setIsOpen((s) => !s)}
            className="self-start text-green-700 cursor-pointer hover:text-yellow-400 transition"
            type="button"
          >
            <Menu size={28} />
          </button>

          {/* Right actions */}
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

        {/* Page title */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-green-800 mb-3">
          Dashboard
        </h1>

        <p className="text-gray-600 mb-6">
          Welcome back, {currentUser?.fullName || "Admin"}!
        </p>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Employees */}
          <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-6">
            <h2 className="text-lg font-bold text-green-800 mb-2">Employees</h2>
            <p className="text-sm text-gray-600 mb-4">
              Manage your workforce efficiently
            </p>
            <div className="text-4xl font-extrabold text-green-800">
              {loadingCounts ? "..." : employeeCount}
            </div>
          </div>

          {/* Leaves */}
          <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-6">
            <h2 className="text-lg font-bold text-green-800 mb-2">Leaves</h2>
            <p className="text-sm text-gray-600 mb-4">
              {pendingLeavesCount > 0
                ? `${pendingLeavesCount} leave${
                    pendingLeavesCount > 1 ? "s" : ""
                  } awaiting approval`
                : "No pending leave requests"}
            </p>
            <button
              onClick={() => navigate("/leave-management")}
              className="inline-flex items-center gap-2 rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white cursor-pointer hover:bg-green-800 transition"
              type="button"
            >
              View Leaves
            </button>
          </div>

          {/* Payrolls */}
          <div className="bg-white rounded-2xl shadow-sm border border-yellow-200 p-6">
            <h2 className="text-lg font-bold text-green-800 mb-2">Payrolls</h2>
            <p className="text-sm text-gray-600 mb-4">Feature coming soon</p>
            <button
              onClick={() => navigate("/PayrollManagement")}
              className="inline-flex items-center gap-2 rounded-full bg-green-700 px-4 py-2 text-sm font-bold text-white cursor-pointer hover:bg-green-800 transition"
              type="button"
            >
              Open Payroll
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
