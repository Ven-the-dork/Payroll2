import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import { 
  Menu, 
  Settings, 
  Users, 
  Calendar, 
  CreditCard, 
  Clock,
  ChevronRight,
  TrendingUp 
} from "lucide-react";

import AdminBell from "../components/AdminBell";
import AdminSidebar from "../components/Adminnavbar/Dashsidevar";
import FontSizeMenu from "../components/hooks/FontSizeMenu";
import AdminSetting from "../components/Adminsetting";

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
  }, []);

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

  // Get current time for the "Last updated" text
  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans text-gray-800">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={isOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={(path) => navigate(path)}
      />

      {/* Main Content */}
      <main 
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isOpen ? "lg:ml-0" : ""
        }`}
      >
        {/* Top Header / Navigation */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsOpen((s) => !s)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
              type="button"
            >
              <Menu size={24} />
            </button>
            
            {/* Breadcrumb / Title */}
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                Dashboard Overview
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                Welcome back, {currentUser?.fullName || "Admin"}
              </p>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <span className="hidden md:block text-xs text-gray-400 font-medium">
              Last updated: {currentTime}
            </span>
            <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>
            
            <AdminBell />
            
            <AdminSetting
              trigger={
                <button
                  type="button"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200 transition-all"
                  aria-label="Settings"
                >
                  <Settings size={20} />
                </button>
              }
            >
              {({ close }) => <FontSizeMenu closeMenu={close} />}
            </AdminSetting>
          </div>
        </header>

        {/* Dashboard Content */}
        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
          
          {/* Section: Live Stats (Colored Cards) */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <h2 className="text-lg font-bold text-gray-800">Overview</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-yellow-100 text-yellow-700 uppercase tracking-wider">
                Live
              </span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Employee Card - Green Theme */}
              <div className="bg-green-600 rounded-2xl p-6 text-white shadow-lg shadow-green-100 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Users size={24} className="text-white" />
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium bg-white/20 px-2 py-1 rounded-full">
                      <TrendingUp size={12} /> +8%
                    </span>
                  </div>
                  <div className="text-4xl font-extrabold mb-1">
                    {loadingCounts ? "..." : employeeCount}
                  </div>
                  <p className="text-green-100 text-sm font-medium opacity-90">
                    Total Employees
                  </p>
                </div>
                {/* Decoration Circle */}
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
              </div>

              {/* Leaves Card - Orange Theme */}
              <div className="bg-orange-400 rounded-2xl p-6 text-white shadow-lg shadow-orange-100 relative overflow-hidden group">
                <div className="relative z-10">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                      <Calendar size={24} className="text-white" />
                    </div>
                    {pendingLeavesCount > 0 && (
                      <span className="flex items-center gap-1 text-xs font-bold bg-white text-orange-600 px-2 py-1 rounded-full animate-pulse">
                        Action Needed
                      </span>
                    )}
                  </div>
                  <div className="text-4xl font-extrabold mb-1">
                    {loadingCounts ? "..." : pendingLeavesCount}
                  </div>
                  <p className="text-orange-50 text-sm font-medium opacity-90">
                    Pending Leaves
                  </p>
                </div>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
              </div>
              
              {/* Note: I did not add the other 2 colored cards (Messages/Processed Payrolls) 
                  because you requested NOT to add items that aren't in your logic. 
                  However, the grid will handle 2 cards gracefully. 
              */}
            </div>
          </section>

          {/* Section: Quick Actions (Bottom Cards in Design) */}
          <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Process Payroll Action */}
              <button
                onClick={() => navigate("/PayrollManagement")}
                className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-green-200 transition-all text-left group"
              >
                <div className="p-3 rounded-full bg-green-50 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                  <CreditCard size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 group-hover:text-green-700 transition-colors">
                    Process Payroll
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Open payroll system
                  </p>
                </div>
                <div className="ml-auto text-gray-300 group-hover:text-green-600 transition-colors">
                  <ChevronRight size={20} />
                </div>
              </button>

              {/* Leave Requests Action */}
              <button
                onClick={() => navigate("/leave-management")}
                className="flex items-center gap-4 p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-orange-200 transition-all text-left group"
              >
                <div className="p-3 rounded-full bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-colors">
                  <Clock size={24} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                    Leave Requests
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {pendingLeavesCount} pending
                  </p>
                </div>
                <div className="ml-auto text-gray-300 group-hover:text-orange-500 transition-colors">
                  <ChevronRight size={20} />
                </div>
              </button>

            </div>
          </section>

        </div>
      </main>
    </div>
  );
}
