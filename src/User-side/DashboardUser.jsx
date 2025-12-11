import { clockifyClockIn, clockifyClockOut } from "../utils/clockifyClient";
import { useState, useEffect } from "react";
import {
  Bell,
  User,
  Settings,
  LogOut,
  X,
  LayoutGrid,
  Receipt,
  BarChart3,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

const DEFAULT_PROFILE = {
  name: "Abercener Iakobo",
  email: "abercener@example.com",
  department: "HR",
  role: "Manager",
  contact: "+63 900 000 0000",
  address: "123 Main Street, City",
};

const chartData = [
  { month: "Jul", earnings: 63500, netPay: 49500, deductions: 14000 },
  { month: "Aug", earnings: 67500, netPay: 53500, deductions: 14000 },
  { month: "Sep", earnings: 64000, netPay: 50000, deductions: 14000 },
  { month: "Oct", earnings: 71500, netPay: 57500, deductions: 14000 },
  { month: "Nov", earnings: 62000, netPay: 48000, deductions: 14000 },
  { month: "Dec", earnings: 68000, netPay: 54000, deductions: 14000 },
];

export default function Dashboard() {
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);
  const [currentUser, setCurrentUser] = useState(null);
  const [isClockedIn, setIsClockedIn] = useState(false); // track clock-in state
  const navigate = useNavigate();

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) {
      try {
        const user = JSON.parse(stored);
        setCurrentUser(user);

        setProfile((prev) => ({
          ...prev,
          name: user.fullName || prev.name,
          role: user.position || prev.role,
          department: user.department || prev.department,
          email: user.email || prev.email,
        }));
      } catch {
        // ignore parse error, keep default profile
      }
    }
  }, []);

  useEffect(() => {
    if (!currentUser?.employeeId) return;

    const heartbeat = async () => {
      await supabase
        .from("employees")
        .update({
          status: "Active",
          last_seen: new Date().toISOString(),
        })
        .eq("id", currentUser.employeeId);
    };

    heartbeat();
    const interval = setInterval(heartbeat, 30_000);

    const goOffline = async () => {
      await supabase
        .from("employees")
        .update({ status: "Inactive" })
        .eq("id", currentUser.employeeId);
    };

    window.addEventListener("beforeunload", goOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", goOffline);
      goOffline();
    };
  }, [currentUser]);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const handleClock = async (type) => {
    try {
      setAttendanceMessage("");
      if (type === "in") {
        await clockifyClockIn();
        setIsClockedIn(true);
        setAttendanceMessage("Clocked in successfully.");
      } else {
        await clockifyClockOut();
        setIsClockedIn(false);
        setAttendanceMessage("Clocked out successfully.");
      }
    } catch (e) {
      setAttendanceMessage(
        e.message || "Failed to send a request to the Edge Function"
      );
    }
  };

  const quickActions = [
    {
      label: "Clock in",
      type: "in",
    },
    {
      label: "Clock out",
      type: "out",
    },
    {
      label: "Apply for Leave",
      onClick: () => navigate("/applyforleave"),
    },
    {
      label: "Update Profile",
      onClick: () => setProfileModalOpen(true),
    },
  ];

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-green-50 text-green-900">
      {/* Top Navigation with Tabs */}
      <header className="bg-white shadow-sm">
        <nav className="max-w-6xl mx-auto flex justify-between items-center px-4 py-3">
          <ul className="hidden sm:flex space-x-8 text-sm font-medium">
            <li
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 pb-2 cursor-pointer border-b-2 transition
                ${
                  activeTab === "dashboard"
                    ? "border-green-600 text-green-700"
                    : "border-transparent text-gray-400 hover:text-green-600"
                }`}
            >
              <LayoutGrid size={18} />
              <span>Dashboard</span>
            </li>

            <li
              onClick={() => setActiveTab("payroll")}
              className={`flex items-center gap-2 pb-2 cursor-pointer border-b-2 transition
                ${
                  activeTab === "payroll"
                    ? "border-green-600 text-green-700"
                    : "border-transparent text-gray-400 hover:text-green-600"
                }`}
            >
              <Receipt size={18} />
              <span>Payroll History</span>
            </li>

            <li
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-2 pb-2 cursor-pointer border-b-2 transition
                ${
                  activeTab === "analytics"
                    ? "border-green-600 text-green-700"
                    : "border-transparent text-gray-400 hover:text-green-600"
                }`}
            >
              <BarChart3 size={18} />
              <span>Analytics</span>
            </li>
          </ul>

          <div className="flex items-center space-x-4">
            <Bell className="w-5 h-5 text-green-600 hover:text-yellow-500 cursor-pointer transition" />
            <User className="w-5 h-5 text-green-600 hover:text-yellow-500 cursor-pointer transition" />
            <Settings className="w-5 h-5 text-green-600 hover:text-yellow-500 cursor-pointer transition" />
            <button onClick={handleLogout} className="cursor-pointer">
              <LogOut className="w-5 h-5 text-green-600 hover:text-red-500 transition" />
            </button>
          </div>
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8">
        {activeTab === "dashboard" && (
          <>
            <div className="bg-green-700 text-white rounded-2xl p-5 sm:p-6 lg:p-7 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg">
              <div className="flex flex-col items-center sm:items-start">
                <h2 className="text-lg sm:text-2xl font-bold">{profile.name}</h2>
                <p className="text-yellow-200">{profile.role}</p>
              </div>
            </div>

            {/* Quick actions with clock styling */}
            <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
              {quickActions.map((action) => {
                const isClockIn = action.type === "in";
                const isClockOut = action.type === "out";

                const isActiveClockIn = isClockIn && isClockedIn;
                const isActiveClockOut = isClockOut && !isClockedIn;

                const baseClasses =
                  "shadow px-6 py-2 rounded-lg font-semibold border-none cursor-pointer w-full sm:w-auto sm:min-w-[180px] transition";

                // normal clock in: yellow, hover yellow
                const inactiveClockIn =
                  "bg-yellow-400 text-green-900 hover:bg-yellow-300 hover:scale-105";
                // normal clock out: yellow, hover red
                const inactiveClockOut =
                  "bg-yellow-400 text-green-900 hover:bg-red-500 hover:text-white hover:scale-105";
                // non-clock buttons
                const inactiveDefault =
                  "bg-yellow-400 text-green-900 hover:bg-yellow-300 hover:scale-105";

                // active (after click) both clock in/out: blue
                const activeClock =
                  "bg-blue-500 text-white hover:bg-blue-600 hover:scale-105";

                let colorClasses = inactiveDefault;

                if (isClockIn) {
                  colorClasses = inactiveClockIn;
                } else if (isClockOut) {
                  colorClasses = inactiveClockOut;
                }

                if (isActiveClockIn || isActiveClockOut) {
                  colorClasses = activeClock;
                }

                const onClick = action.type
                  ? () => handleClock(action.type)
                  : action.onClick;

                return (
                  <button
                    key={action.label}
                    className={`${baseClasses} ${colorClasses}`}
                    onClick={onClick}
                  >
                    {action.label}
                  </button>
                );
              })}
            </div>

            {attendanceMessage && (
              <p className="mt-2 text-sm text-green-800">
                {attendanceMessage}
              </p>
            )}

            {/* Rest of dashboard content (leave, todos, announcements) */}
            {/* ...keep your existing components here... */}
          </>
        )}

        {activeTab === "payroll" && <PayrollHistory />}

        {activeTab === "analytics" && <PayrollAnalytics />}
      </main>

      {profileModalOpen && (
        <ProfileModal
          onClose={() => setProfileModalOpen(false)}
          profile={profile}
          onChange={handleProfileChange}
        />
      )}
    </div>
  );
}

/* ===== PAYROLL HISTORY, ANALYTICS, PROGRESS BAR, PROFILE MODAL ===== */
/* Keep your existing implementations of PayrollHistory, PayrollRow,
   PayrollAnalytics, ProgressBar, and ProfileModal below unchanged. */
