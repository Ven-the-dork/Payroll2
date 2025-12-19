import { clockifyClockIn } from "../utils/clockifyClient";
import { useEffect, useState, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

import UserTopBar from "../components/UserTopBar";
import { useUserNotifications } from "../components/hooks/useUserNotifications";

import { X, LayoutGrid, Receipt, HelpCircle, Eye, Download, User, Calendar, Clock } from "lucide-react";

import FAQModal from "../components/FAQModal";

const DEFAULT_PROFILE = {
  name: "Abercener Iakobo",
  email: "abercener@example.com",
  department: "HR",
  role: "Manager",
  contact: "+63 900 000 0000",
  address: "123 Main Street, City",
};

const TZ = "Asia/Singapore";
function getSgShiftDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const map = {};
  for (const p of parts) if (p.type !== "literal") map[p.type] = p.value;

  return `${map.year}-${map.month}-${map.day}`; // YYYY-MM-DD
}

function toUserMessage(err) {
  const raw = err?.message || err?.error_description || err?.error || "";
  const msg = String(raw).toLowerCase();

  if (msg.includes("not logged in")) return "Session expired. Please log in again.";
  if (msg.includes("failed to fetch"))
    return "Network error. Check your internet and try again.";
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

  const [hasClockedInToday, setHasClockedInToday] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);

  const [clockLoading, setClockLoading] = useState(false);

  // Leave dynamic states
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

  // Sync clock status
  const syncClockStatus = useCallback(async () => {
    if (!employeeId) return;

    const todayShiftDate = getSgShiftDate(new Date());

    const { data, error } = await supabase
      .from("attendance_logs")
      .select("id")
      .eq("employee_id", employeeId)
      .eq("shift_date", todayShiftDate)
      .limit(1);

    if (error) {
      console.error("Failed to sync clock status:", error);
      return;
    }

    setHasClockedInToday((data?.length ?? 0) > 0);
  }, [employeeId]);

  useEffect(() => {
    syncClockStatus();
  }, [syncClockStatus]);

  // Heartbeat
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
    };
  }, [employeeId]);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const handleClockIn = async () => {
    if (clockLoading) return;

    if (hasClockedInToday) {
      setAttendanceMessage("Already clocked in today.");
      return;
    }

    setClockLoading(true);
    setAttendanceMessage("");

    try {
      const res = await clockifyClockIn();
      setAttendanceMessage(res?.message ?? "Clock in processed.");
      await syncClockStatus();
    } catch (err) {
      console.error("Clock in error:", err);
      setAttendanceMessage(toUserMessage(err));
    } finally {
      setClockLoading(false);
    }
  };

  const quickActions = [
    { label: "Clock in", onClick: handleClockIn, isClockAction: true, icon: <Clock size={20} /> },
    { label: "Apply for Leave", onClick: () => navigate("/applyforleave"), icon: <Calendar size={20} /> },
    { label: "Update Profile", onClick: () => navigate("/profile"), icon: <User size={20} /> },
  ];

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile((prev) => ({ ...prev, [name]: value }));
  };

  // Fetch leave plans
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

  // Calculate leave balances
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans flex flex-col">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <nav className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <ul className="hidden sm:flex space-x-8 text-sm font-semibold text-gray-500">
            <li
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === "dashboard" ? "text-green-700" : "hover:text-green-600"
              }`}
            >
              <LayoutGrid size={18} />
              <span>Dashboard</span>
            </li>

            <li
              onClick={() => setActiveTab("payroll")}
              className={`flex items-center gap-2 cursor-pointer transition-colors ${
                activeTab === "payroll" ? "text-green-700" : "hover:text-green-600"
              }`}
            >
              <Receipt size={18} />
              <span>Payroll History</span>
            </li>

            <li
              onClick={() => setFaqOpen(true)}
              className="flex items-center gap-2 cursor-pointer hover:text-green-600 transition-colors"
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

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-8 w-full">
        {activeTab === "dashboard" && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* HERO CARD */}
            <div className="relative overflow-hidden rounded-3xl bg-green-900 p-8 text-white shadow-xl shadow-green-900/10">
              <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <h2 className="text-3xl font-extrabold tracking-tight">
                    Welcome, {profile.name}
                  </h2>
                  <p className="mt-1 text-green-100 font-medium opacity-90">
                    {profile.role} • {profile.department}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-bold uppercase tracking-wider shadow-sm border ${
                      hasClockedInToday
                        ? "bg-green-500 text-white border-green-400"
                        : "bg-white/10 text-white border-white/20 backdrop-blur-md"
                    }`}
                  >
                    {hasClockedInToday ? "Clocked In" : "Not Clocked In Today"}
                  </span>

                  <button
                    onClick={() => setFaqOpen(true)}
                    className="rounded-full bg-white/10 hover:bg-white/20 px-4 py-1.5 text-xs font-bold text-white transition border border-white/10"
                  >
                    Help Center
                  </button>
                </div>
              </div>

              {attendanceMessage && (
                <div className="mt-6 inline-block rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-yellow-200 border border-white/10 backdrop-blur-sm">
                   {attendanceMessage}
                </div>
              )}
              
              {/* Decorative circle */}
              <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-green-800/50 blur-3xl pointer-events-none"></div>
            </div>

            {/* QUICK ACTIONS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {quickActions.map((action) => {
                const disabled = clockLoading || (action.isClockAction && hasClockedInToday);

                return (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    disabled={disabled}
                    className={`group relative flex items-center justify-center gap-3 rounded-2xl px-6 py-4 text-sm font-bold shadow-md transition-all transform active:scale-95 ${
                      disabled
                        ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                        : "bg-[#fbbf24] text-green-950 hover:bg-[#f59e0b] hover:shadow-lg hover:-translate-y-0.5"
                    }`}
                  >
                    <span className="opacity-80 group-hover:opacity-100 transition-opacity">
                        {action.icon}
                    </span>
                    <span>
                      {clockLoading && action.isClockAction ? "Processing..." : action.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* LEAVE BALANCE CARD */}
            <div className="rounded-3xl bg-white shadow-xl shadow-gray-200/50 overflow-hidden border border-gray-100">
              <div className="bg-[#064e3b] px-6 py-5 border-b border-green-800">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-lg font-bold text-white">Available Leave Days</h3>
                        <p className="text-xs text-green-200/80 mt-0.5">
                        Balances include pending + approved requests.
                        </p>
                    </div>
                    <div className="p-2 bg-green-800 rounded-lg">
                        <Calendar className="text-green-200" size={20}/>
                    </div>
                </div>
              </div>

              <div className="p-6 sm:p-8">
                {loadingLeaves ? (
                  <div className="py-8 text-center text-gray-500 animate-pulse">Loading balances...</div>
                ) : leaveOptions.length === 0 ? (
                  <div className="py-8 text-center text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                    No leave plans available.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-6">
                    {leaveOptions.map((plan) => {
                      const remaining = leaveBalances[plan.id] ?? plan.days;
                      const used = plan.days - remaining;
                      const percent = plan.days > 0 ? (used / plan.days) * 100 : 0;

                      return (
                        <ProgressBar
                          key={plan.id}
                          label={plan.label}
                          remaining={remaining}
                          total={plan.days}
                          percent={percent}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "payroll" && <PayrollHistory employeeId={employeeId} />}
      </main>

      {/* 🆕 FOOTER ADDED HERE */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6">
          <p className="text-center text-sm text-gray-500">
            © 2025 CVSU. All rights reserved.
          </p>
        </div>
      </footer>

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

/* ===== PAYROLL HISTORY WITH COLORFUL CARDS ===== */
function PayrollHistory({ employeeId }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [viewingPayslip, setViewingPayslip] = useState(null);

  const peso = (n) =>
    Number.isFinite(n)
      ? Number(n).toLocaleString("en-PH", { style: "currency", currency: "PHP" })
      : "₱0.00";

  const formatDate = (iso) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("en-PH");
    } catch {
      return "—";
    }
  };

  const formatPeriod = (start, end) => {
    if (!start && !end) return "—";
    if (start && end) return `${start} to ${end}`;
    return start || end;
  };

  useEffect(() => {
    const loadPayroll = async () => {
      if (!employeeId) return;

      setLoading(true);
      setErrMsg("");

      const { data, error } = await supabase
        .from("payroll_records")
        .select("*")
        .eq("employee_id", employeeId)
        .order("period_end", { ascending: false })
        .limit(24);

      if (error) {
        console.error("Load payroll_records error:", error);
        setErrMsg(error.message || "Failed to load payroll history.");
        setRows([]);
      } else {
        setRows(data || []);
      }

      setLoading(false);
    };

    loadPayroll();
  }, [employeeId]);

  const stats = useMemo(() => {
    const amounts = (rows || []).map((r) => Number(r.gross_pay) || 0);
    const total = amounts.reduce((a, b) => a + b, 0);
    const avg = amounts.length ? total / amounts.length : 0;
    const highest = amounts.length ? Math.max(...amounts) : 0;
    const lowest = amounts.length ? Math.min(...amounts) : 0;
    return { total, avg, highest, lowest };
  }, [rows]);

  // Handle PDF Download
  const handleDownload = (record) => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("PAYSLIP", 105, 20, { align: "center" });

    doc.setFontSize(10);
    doc.text(`Period: ${formatPeriod(record.period_start, record.period_end)}`, 14, 30);
    doc.text(`Date Paid: ${formatDate(record.paid_at)}`, 14, 35);
    doc.text(`Status: ${record.status}`, 14, 40);

    autoTable(doc, {
      startY: 50,
      head: [["Description", "Amount"]],
      body: [
        ["Gross Pay", peso(Number(record.gross_pay))],
        ["Deductions", `(${peso(Number(record.deductions))})`],
        [
          { content: "NET PAY", styles: { fontStyle: "bold" } },
          { content: peso(Number(record.net_pay)), styles: { fontStyle: "bold" } },
        ],
      ],
      theme: "grid",
      headStyles: { fillColor: [21, 128, 61] },
    });

    doc.text("This is a system-generated payslip.", 105, doc.lastAutoTable.finalY + 20, { align: "center" });
    doc.save(`Payslip_${record.period_end}.pdf`);
  };

  return (
    <section className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          Payroll History
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-yellow-100 text-yellow-800">
            {rows.length} Records
          </span>
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          View your payment records and download payslips
        </p>
      </div>

      {/* Colorful Stat Cards - Matching Image Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Paid - Green */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-green-600 p-6 text-white shadow-lg">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <span className="text-2xl">$</span>
              </div>
              <div className="p-1.5 bg-white/20 rounded-md">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium opacity-90">Total Paid</p>
              <p className="text-2xl font-extrabold tracking-tight">{peso(stats.total)}</p>
            </div>
          </div>
          {/* Decorative blur */}
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Average Pay - Yellow/Orange */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 p-6 text-white shadow-lg">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div className="px-2 py-0.5 bg-white/20 rounded-md text-xs font-bold">AVG</div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium opacity-90">Average Pay</p>
              <p className="text-2xl font-extrabold tracking-tight">{peso(stats.avg)}</p>
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Highest Pay - Teal/Green */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-500 to-green-500 p-6 text-white shadow-lg">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </div>
              <div className="px-2 py-0.5 bg-white/20 rounded-md text-xs font-bold">HIGH</div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium opacity-90">Highest Pay</p>
              <p className="text-2xl font-extrabold tracking-tight">{peso(stats.highest)}</p>
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* Lowest Pay - Orange */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 p-6 text-white shadow-lg">
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-3">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </div>
              <div className="px-2 py-0.5 bg-white/20 rounded-md text-xs font-bold">LOW</div>
            </div>
            <div className="space-y-1">
              <p className="text-xs font-medium opacity-90">Lowest Pay</p>
              <p className="text-2xl font-extrabold tracking-tight">{peso(stats.lowest)}</p>
            </div>
          </div>
          <div className="absolute -bottom-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl shadow-lg shadow-gray-200/50 overflow-hidden border border-gray-100">
        {errMsg && (
          <div className="px-6 py-4 bg-red-50 border-b border-red-100">
            <p className="text-sm text-red-600 font-medium">{errMsg}</p>
          </div>
        )}

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-400">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-green-600 mb-3"></div>
              <p>Loading payroll records...</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} />
                      Period
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <Receipt size={14} />
                      Total Earnings
                    </div>
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3 text-gray-400">
                        <div className="p-4 bg-gray-50 rounded-full">
                          <Receipt size={32} className="text-gray-300" />
                        </div>
                        <p className="font-medium">No payroll records found</p>
                        <p className="text-xs">Your payment history will appear here</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  rows.map((r, idx) => (
                    <tr key={r.id} className="hover:bg-gray-50/80 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-700 font-bold text-sm">
                            {idx + 1}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">
                              {formatPeriod(r.period_start, r.period_end)}
                            </div>
                            <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                              <Calendar size={12} />
                              Paid: {formatDate(r.paid_at)}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <span className="font-bold text-green-700 text-base">
                          {peso(Number(r.gross_pay) || 0)}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 ring-1 ring-green-600/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-600"></span>
                          {r.status || "Paid"}
                        </span>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setViewingPayslip(r)}
                            className="p-2 text-gray-400 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors group/btn"
                            title="View Details"
                          >
                            <Eye size={18} className="group-hover/btn:scale-110 transition-transform" />
                          </button>
                          <button
                            onClick={() => handleDownload(r)}
                            className="p-2 text-gray-400 hover:bg-green-50 hover:text-green-700 rounded-lg transition-colors group/btn"
                            title="Download PDF"
                          >
                            <Download size={18} className="group-hover/btn:scale-110 transition-transform" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {viewingPayslip && (
        <PayslipViewModal
          record={viewingPayslip}
          onClose={() => setViewingPayslip(null)}
          peso={peso}
          period={formatPeriod(viewingPayslip.period_start, viewingPayslip.period_end)}
        />
      )}
    </section>
  );
}

/* ===== PAYSLIP MODAL ===== */
function PayslipViewModal({ record, onClose, peso, period }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden scale-100 animate-in zoom-in-95 duration-200">
        <div className="bg-green-900 px-6 py-5 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Payslip Details</h3>
          <button onClick={onClose} className="text-white/60 hover:text-white transition rounded-full hover:bg-white/10 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-6">
          <div className="text-center">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Pay Period</p>
            <p className="text-gray-900 font-extrabold text-xl">{period}</p>
          </div>

          <div className="space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <div className="flex justify-between items-center">
              <span className="text-gray-600 font-medium">Gross Pay</span>
              <span className="font-bold text-gray-900">{peso(record.gross_pay)}</span>
            </div>
            <div className="flex justify-between items-center text-red-600">
              <span className="font-medium">Deductions</span>
              <span>- {peso(record.deductions)}</span>
            </div>
            <div className="h-px bg-gray-200 my-1"></div>
            <div className="flex justify-between items-center text-lg">
              <span className="font-bold text-green-900">Net Pay</span>
              <span className="font-extrabold text-green-700">{peso(record.net_pay)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 px-6 py-4 text-center border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full text-sm font-bold text-gray-600 hover:text-gray-900 py-2 transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ label, remaining, total, percent }) {
  return (
    <div>
      <div className="flex justify-between items-end mb-2">
        <span className="text-gray-900 font-bold text-sm">{label}</span>
        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
            {remaining} days left
        </span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden">
        <div 
            className="bg-gradient-to-r from-green-600 to-green-500 h-full rounded-full transition-all duration-1000 ease-out" 
            style={{ width: `${100 - percent}%` }} 
        />
      </div>
    </div>
  );
}

function ProfileModal({ onClose, profile, onChange }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 relative shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-gray-900">Edit Profile</h3>
            <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-red-500 transition rounded-full p-1 hover:bg-red-50"
            aria-label="Close"
            >
            <X size={24} />
            </button>
        </div>

        <form className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase">Full Name</label>
                <input
                name="name"
                value={profile.name}
                onChange={onChange}
                className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
                />
            </div>
            <div>
                <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase">Email</label>
                <input
                name="email"
                value={profile.email}
                onChange={onChange}
                className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
                />
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
                <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase">Department</label>
                <input
                name="department"
                value={profile.department}
                onChange={onChange}
                className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
                />
            </div>
            <div>
                <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase">Role</label>
                <input
                name="role"
                value={profile.role}
                onChange={onChange}
                className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
                />
            </div>
          </div>

          <div>
            <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase">Contact</label>
            <input
              name="contact"
              value={profile.contact}
              onChange={onChange}
              className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
            />
          </div>
          <div>
            <label className="block mb-1.5 text-xs font-bold text-gray-500 uppercase">Address</label>
            <input
              name="address"
              value={profile.address}
              onChange={onChange}
              className="w-full rounded-xl px-4 py-2.5 bg-gray-50 border border-gray-200 focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
            />
          </div>

          <div className="flex gap-3 mt-6 pt-2">
            <button
              type="submit"
              className="flex-1 bg-green-700 text-white py-3 rounded-xl font-bold shadow-lg shadow-green-700/30 hover:bg-green-800 hover:shadow-xl transition transform active:scale-95"
            >
              Save Changes
            </button>
            <button
              type="reset"
              className="px-6 bg-white border border-gray-200 text-gray-700 py-3 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-300 transition"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
