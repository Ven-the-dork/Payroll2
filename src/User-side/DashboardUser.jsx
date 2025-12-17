import { clockifyClockIn, clockifyClockOut } from "../utils/clockifyClient";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";

import UserTopBar from "../components/UserTopBar";
import { useUserNotifications } from "../components/hooks/useUserNotifications";

import { X, LayoutGrid, Receipt, BarChart3, HelpCircle } from "lucide-react";

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

import FAQModal from "../components/FAQModal";

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

// ✅ One place to translate errors into friendly messages
function toUserMessage(err) {
  const raw = err?.message || err?.error_description || err?.error || "";
  const msg = String(raw).toLowerCase();

  if (msg.includes("not logged in")) return "Session expired. Please log in again.";
  if (msg.includes("failed to fetch")) return "Network error. Check your internet and try again.";
  if (msg.includes("no running time entry"))
    return "You are not clocked in yet (nothing to clock out).";
  if (msg.includes("already clocked in")) return "Already clocked in today.";
  if (msg.includes("clockify api call failed"))
    return "Clockify is unavailable right now. Try again in a moment.";

  return raw || "Something went wrong. Please try again.";
}

export default function DashboardUser() {
  const [attendanceMessage, setAttendanceMessage] = useState("");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  const [currentUser, setCurrentUser] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);

  const [isClockedIn, setIsClockedIn] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  const [clockLoading, setClockLoading] = useState(false);

  // ✅ Leave dynamic states
  const [leaveOptions, setLeaveOptions] = useState([]);
  const [leaveBalances, setLeaveBalances] = useState({});
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  // notifications dropdown state
  const [notifOpen, setNotifOpen] = useState(false);
  const { notifications, unreadCount, markAllRead } = useUserNotifications(
    employeeId,
    notifOpen
  );

  const navigate = useNavigate();

  // Load user from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (!stored) return;

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

      if (user.employeeId) setEmployeeId(user.employeeId);
    } catch {
      // ignore parse errors
    }
  }, []);

  // Fallback: resolve employeeId from firebase uid
  useEffect(() => {
    const loadEmployeeId = async () => {
      if (employeeId) return;
      if (!currentUser?.uid) return;

      const { data, error } = await supabase
        .from("employees")
        .select("id")
        .eq("firebase_uid", currentUser.uid)
        .single();

      if (!error && data?.id) setEmployeeId(data.id);
    };

    loadEmployeeId();
  }, [currentUser, employeeId]);

  // Heartbeat: mark employee online (optional)
  useEffect(() => {
    if (!employeeId) return;

    const heartbeat = async () => {
      await supabase
        .from("employees")
        .update({
          status: "Active",
          last_seen: new Date().toISOString(),
        })
        .eq("id", employeeId);
    };

    heartbeat();
    const interval = setInterval(heartbeat, 30_000);

    const goOffline = async () => {
      await supabase.from("employees").update({ status: "Inactive" }).eq("id", employeeId);
    };

    window.addEventListener("beforeunload", goOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", goOffline);
      // goOffline(); // Optional on navigation
    };
  }, [employeeId]);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const handleClock = async (type) => {
    if (clockLoading) return;

    if (type === "in" && isClockedIn) {
      setAttendanceMessage("Already clocked in today.");
      return;
    }
    if (type === "out" && !isClockedIn) {
      setAttendanceMessage("You are not clocked in yet.");
      return;
    }

    setClockLoading(true);
    setAttendanceMessage("");

    try {
      const res = type === "in" ? await clockifyClockIn() : await clockifyClockOut();

      setAttendanceMessage(
        res?.message ?? (type === "in" ? "Clock in processed." : "Clock out processed.")
      );

      setIsClockedIn(type === "in");
    } catch (err) {
      console.error("Clock action error:", err);
      setAttendanceMessage(toUserMessage(err));
    } finally {
      setClockLoading(false);
    }
  };

  const quickActions = [
    { label: "Clock in", type: "in" },
    { label: "Clock out", type: "out" },
    { label: "Apply for Leave", onClick: () => navigate("/applyforleave") },
    { label: "Update Profile", onClick: () => navigate("/profile") },
  ];

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Fetch leave plans
  useEffect(() => {
    async function fetchLeaveOptions() {
      setLoadingLeaves(true);

      const { data, error } = await supabase
        .from("leave_plans")
        .select("id, name, duration_days")
        .eq("is_active", true)
        .order("name");

      if (!error && data) {
        setLeaveOptions(
          data.map((row) => ({
            id: row.id,
            label: row.name,
            days: row.duration_days,
          }))
        );
      }

      setLoadingLeaves(false);
    }

    fetchLeaveOptions();
  }, []);

  // ✅ Calculate leave balances (approved + pending)
  useEffect(() => {
    async function calculateBalances() {
      if (!currentUser?.uid || leaveOptions.length === 0) return;

      const { data: applications, error } = await supabase
        .from("leave_applications")
        .select("leave_plan_id, duration_days, status")
        .eq("firebase_uid", currentUser.uid)
        .in("status", ["approved", "pending"]);

      if (error) {
        console.error("Error fetching leave usage:", error);
        return;
      }

      const usage = {};
      (applications || []).forEach((app) => {
        usage[app.leave_plan_id] = (usage[app.leave_plan_id] || 0) + app.duration_days;
      });

      const newBalances = {};
      leaveOptions.forEach((plan) => {
        const used = usage[plan.id] || 0;
        newBalances[plan.id] = Math.max(0, plan.days - used);
      });

      setLeaveBalances(newBalances);
    }

    calculateBalances();
  }, [currentUser, leaveOptions]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white text-green-900">
      <header className="bg-white/80 backdrop-blur border-b border-yellow-100">
        <nav className="max-w-6xl mx-auto flex justify-between items-center px-4 py-3">
          <ul className="hidden sm:flex space-x-8 text-sm font-medium">
            <li
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 pb-2 cursor-pointer border-b-2 transition ${
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
              className={`flex items-center gap-2 pb-2 cursor-pointer border-b-2 transition ${
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
              className={`flex items-center gap-2 pb-2 cursor-pointer border-b-2 transition ${
                activeTab === "analytics"
                  ? "border-green-600 text-green-700"
                  : "border-transparent text-gray-400 hover:text-green-600"
              }`}
            >
              <BarChart3 size={18} />
              <span>Analytics</span>
            </li>

            <li
              onClick={() => setFaqOpen(true)}
              className="flex items-center gap-2 pb-2 cursor-pointer border-b-2 transition border-transparent text-gray-400 hover:text-green-600"
            >
              <HelpCircle size={18} />
              <span>FAQ</span>
            </li>
          </ul>

          <UserTopBar
            notifOpen={notifOpen}
            setNotifOpen={setNotifOpen}
            unreadCount={unreadCount}
            notifications={notifications}
            onMarkAllRead={markAllRead}
            onLogout={handleLogout}
            onOpenProfileModal={() => navigate("/profile")}
          />
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8">
        {activeTab === "dashboard" && (
          <>
            {/* HERO */}
            <div className="rounded-2xl border border-yellow-200 bg-gradient-to-r from-green-800 to-green-700 p-5 sm:p-7 text-white shadow-lg">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
                    Welcome, {profile.name}
                  </h2>
                  <p className="text-sm text-yellow-100">
                    {profile.role} • {profile.department}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                      isClockedIn
                        ? "bg-green-200/20 text-green-100 border-green-200/30"
                        : "bg-yellow-200/20 text-yellow-100 border-yellow-200/30"
                    }`}
                  >
                    {isClockedIn ? "Clocked In" : "Clocked Out"}
                  </span>

                  <button
                    onClick={() => setFaqOpen(true)}
                    className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white hover:bg-white/20 transition cursor-pointer"
                  >
                    Help
                  </button>
                </div>
              </div>

              {attendanceMessage && (
                <p className="mt-3 text-sm text-yellow-100">{attendanceMessage}</p>
              )}
            </div>

            {/* QUICK ACTIONS */}
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map((action) => {
                const isClockIn = action.type === "in";
                const isClockOut = action.type === "out";

                const onClick = action.type ? () => handleClock(action.type) : action.onClick;

                const disabled =
                  clockLoading ||
                  (isClockIn && isClockedIn) ||
                  (isClockOut && !isClockedIn);

                return (
                  <button
                    key={action.label}
                    onClick={onClick}
                    disabled={disabled}
                    className={`rounded-xl px-4 py-3 text-sm font-bold shadow-sm border transition cursor-pointer ${
                      disabled
                        ? "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed"
                        : "bg-yellow-400 text-green-950 border-yellow-300 hover:bg-yellow-300"
                    }`}
                  >
                    {clockLoading && action.type ? "Processing..." : action.label}
                  </button>
                );
              })}
            </div>

            {/* CARDS GRID */}
            <div className="mt-7 flex justify-center">

              {/* LEAVE BALANCE CARD */}
              <div className="w-full max-w-xxl rounded-2xl border border-yellow-200 bg-white shadow-sm overflow-hidden">
                <div className="bg-green-800 px-4 py-3">
                  <h3 className="font-bold text-yellow-300">Available Leave Days</h3>
                  <p className="text-xs text-yellow-100">
                    Balances include pending + approved requests.
                  </p>
                </div>

                <div className="p-4">
                  {loadingLeaves ? (
                    <p className="text-sm text-green-700">Loading leave plans...</p>
                  ) : leaveOptions.length === 0 ? (
                    <p className="text-sm text-red-600">
                      No leave plans available. Please contact your administrator.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {leaveOptions.map((plan) => {
                        const remaining = leaveBalances[plan.id] ?? plan.days;
                        const used = plan.days - remaining;
                        const percent = plan.days > 0 ? (used / plan.days) * 100 : 0;

                        return (
                          <ProgressBar
                            key={plan.id}
                            label={plan.label}
                            value={`${remaining} of ${plan.days} days`}
                            percent={percent}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

             
            </div>
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

      <FAQModal open={faqOpen} onClose={() => setFaqOpen(false)} />
    </div>
  );
}

/* ===== PAYROLL HISTORY ===== */
function PayrollHistory() {
  return (
    <section className="bg-[#f7f4e8] rounded-2xl p-6 shadow space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-green-800">Payroll History</h2>
          <p className="text-sm text-gray-600">
            View your payment records and download payslips.
          </p>
        </div>
        <button className="self-start md:self-auto text-xs border rounded-md px-3 py-2 bg-white hover:bg-gray-50 cursor-pointer">
          Last 6 Months
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Paid" value="₱312,500" />
        <SummaryCard label="Average Pay" value="₱52,083" />
        <SummaryCard label="Highest Pay" value="₱57,500" />
        <SummaryCard label="Lowest Pay" value="₱48,000" />
      </div>

      <div className="bg-white rounded-xl p-4 shadow overflow-x-auto">
        <table className="w-full text-xs sm:text-sm">
          <thead className="text-green-800">
            <tr>
              <th className="text-left py-2">Period</th>
              <th className="text-left py-2">Total Earnings</th>
              <th className="text-left py-2">Deductions</th>
              <th className="text-left py-2">Net Pay</th>
              <th className="text-left py-2">Status</th>
              <th className="text-left py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y text-gray-700">
            <PayrollRow
              period="December 2024"
              paidDate="12/1/2024"
              earnings="68,000"
              deductions="14,000"
              netPay="54,000"
            />
            <PayrollRow
              period="November 2024"
              paidDate="11/1/2024"
              earnings="62,000"
              deductions="14,000"
              netPay="48,000"
            />
            <PayrollRow
              period="October 2024"
              paidDate="10/1/2024"
              earnings="71,500"
              deductions="14,000"
              netPay="57,500"
            />
            <PayrollRow
              period="September 2024"
              paidDate="9/1/2024"
              earnings="64,000"
              deductions="14,000"
              netPay="50,000"
            />
            <PayrollRow
              period="August 2024"
              paidDate="8/1/2024"
              earnings="67,500"
              deductions="14,000"
              netPay="53,500"
            />
            <PayrollRow
              period="July 2024"
              paidDate="7/1/2024"
              earnings="63,500"
              deductions="14,000"
              netPay="49,500"
            />
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-lg font-semibold text-green-700">{value}</p>
    </div>
  );
}

function PayrollRow({ period, paidDate, earnings, deductions, netPay }) {
  return (
    <tr>
      <td className="py-2">
        <div className="font-medium">{period}</div>
        <div className="text-[11px] text-gray-500">Paid: {paidDate}</div>
      </td>
      <td>{earnings}</td>
      <td className="text-red-500">{deductions}</td>
      <td className="text-green-700">{netPay}</td>
      <td>
        <span className="inline-block px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
          Paid
        </span>
      </td>
      <td className="space-x-3 text-gray-500">
        <button className="hover:text-green-700 cursor-pointer">View</button>
        <button className="hover:text-green-700 cursor-pointer">Download</button>
      </td>
    </tr>
  );
}

/* ===== PAYROLL ANALYTICS ===== */
function PayrollAnalytics() {
  return (
    <section className="bg-[#f7f4e8] rounded-2xl p-6 shadow space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-green-800">Payroll Analytics</h2>
          <p className="text-sm text-gray-600">Insights and trends for your earnings</p>
        </div>
        <button className="self-start md:self-auto text-xs border rounded-md px-3 py-2 bg-white hover:bg-gray-50 cursor-pointer">
          Last 6 Months
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Earnings" value="₱396,500" />
        <SummaryCard label="Total Deductions" value="₱84,000" />
        <SummaryCard label="Avg Monthly Pay" value="₱52,083" />
        <SummaryCard label="Month over Month" value="+12.5%" />
      </div>

      <div className="bg-white rounded-xl p-4 shadow">
        <h3 className="text-sm font-semibold text-green-800 mb-4">Monthly Earnings Trend</h3>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.toLocaleString()}
              domain={[0, 80000]}
            />
            <Tooltip formatter={(value) => value.toLocaleString()} />
            <Legend />
            <Line
              type="monotone"
              dataKey="earnings"
              name="Total Earnings"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="netPay"
              name="Net Pay"
              stroke="#eab308"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="deductions"
              name="Deductions"
              stroke="#f87171"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl p-4 shadow">
          <h3 className="text-sm font-semibold text-green-800 mb-4">Earnings vs Deductions</h3>
          <div className="h-40 flex items-center justify-center border border-dashed border-gray-300 rounded-lg text-gray-400 text-sm">
            Chart placeholder
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow">
          <h3 className="text-sm font-semibold text-green-800 mb-4">Net Pay Trend</h3>
          <div className="h-40 flex items-center justify-center border border-dashed border-gray-300 rounded-lg text-gray-400 text-sm">
            Chart placeholder
          </div>
        </div>
      </div>
    </section>
  );
}

/* ===== PROGRESS BAR ===== */
function ProgressBar({ label, value, percent }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-green-900 font-semibold">{label}</span>
        <span className="text-green-700">{value}</span>
      </div>
      <div className="w-full bg-yellow-100 rounded-full h-2">
        <div
          className="bg-green-700 h-2 rounded-full"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/* ===== PROFILE MODAL ===== */
function ProfileModal({ onClose, profile, onChange }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-xl max-w-lg w-full p-8 relative shadow-lg border-2 border-yellow-400">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 text-green-800 hover:text-red-500 transition cursor-pointer"
          aria-label="Close"
        >
          <X size={24} />
        </button>

        <form className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-semibold">Full Name</label>
            <input
              name="name"
              value={profile.name}
              onChange={onChange}
              className="w-full rounded-md px-3 py-2 bg-yellow-50 border"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold">Email</label>
            <input
              name="email"
              value={profile.email}
              onChange={onChange}
              className="w-full rounded-md px-3 py-2 bg-yellow-50 border"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold">Department</label>
            <input
              name="department"
              value={profile.department}
              onChange={onChange}
              className="w-full rounded-md px-3 py-2 bg-yellow-50 border"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold">Role/Position</label>
            <input
              name="role"
              value={profile.role}
              onChange={onChange}
              className="w-full rounded-md px-3 py-2 bg-yellow-50 border"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold">Contact</label>
            <input
              name="contact"
              value={profile.contact}
              onChange={onChange}
              className="w-full rounded-md px-3 py-2 bg-yellow-50 border"
            />
          </div>

          <div>
            <label className="block mb-1 text-sm font-semibold">Address</label>
            <input
              name="address"
              value={profile.address}
              onChange={onChange}
              className="w-full rounded-md px-3 py-2 bg-yellow-50 border"
            />
          </div>

          <div className="flex gap-4 mt-4">
            <button
              type="submit"
              className="w-full bg-green-700 text-white py-2 rounded font-bold hover:bg-yellow-400 hover:text-green-900 transition cursor-pointer"
            >
              Save
            </button>
            <button
              type="reset"
              className="w-full bg-white border-2 border-black text-black py-2 rounded font-bold hover:bg-yellow-400 hover:text-green-900 transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
