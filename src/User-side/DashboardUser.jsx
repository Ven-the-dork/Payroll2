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

import { X, LayoutGrid, Receipt, HelpCircle, Eye, Download } from "lucide-react";

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
    { label: "Clock in", onClick: handleClockIn, isClockAction: true },
    { label: "Apply for Leave", onClick: () => navigate("/applyforleave") },
    { label: "Update Profile", onClick: () => navigate("/profile") },
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
                      hasClockedInToday
                        ? "bg-green-200/20 text-green-100 border-green-200/30"
                        : "bg-yellow-200/20 text-yellow-100 border-yellow-200/30"
                    }`}
                  >
                    {hasClockedInToday ? "Clocked In Today" : "Not Clocked In Today"}
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
                const disabled = clockLoading || (action.isClockAction && hasClockedInToday);

                return (
                  <button
                    key={action.label}
                    onClick={action.onClick}
                    disabled={disabled}
                    className={`rounded-xl px-4 py-3 text-sm font-bold shadow-sm border transition cursor-pointer ${
                      disabled
                        ? "bg-gray-200 text-gray-500 border-gray-200 cursor-not-allowed"
                        : "bg-yellow-400 text-green-950 border-yellow-300 hover:bg-yellow-300"
                    }`}
                  >
                    {clockLoading && action.isClockAction ? "Processing..." : action.label}
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

        {activeTab === "payroll" && <PayrollHistory employeeId={employeeId} />}
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

/* ===== PAYROLL HISTORY WITH VIEW & DOWNLOAD ===== */
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
    <section className="bg-[#f7f4e8] rounded-2xl p-6 shadow space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-green-800">Payroll History</h2>
          <p className="text-sm text-gray-600">
            View your payment records and download payslips.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Paid" value={peso(stats.total)} />
        <SummaryCard label="Average Pay" value={peso(stats.avg)} />
        <SummaryCard label="Highest Pay" value={peso(stats.highest)} />
        <SummaryCard label="Lowest Pay" value={peso(stats.lowest)} />
      </div>

      <div className="bg-white rounded-xl p-4 shadow overflow-x-auto">
        {errMsg && <p className="text-sm text-red-600 mb-3">{errMsg}</p>}

        {loading ? (
          <p className="text-sm text-gray-600">Loading payroll records...</p>
        ) : (
          <table className="w-full text-xs sm:text-sm">
            <thead className="text-green-800">
              <tr>
                <th className="text-left py-2">Period</th>
                <th className="text-left py-2">Total Earnings</th>
                <th className="text-left py-2">Status</th>
                <th className="text-left py-2">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y text-gray-700">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-3 text-gray-600">
                    No payroll records yet.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <PayrollRow
                    key={r.id}
                    period={formatPeriod(r.period_start, r.period_end)}
                    paidDate={formatDate(r.paid_at)}
                    earnings={peso(Number(r.gross_pay) || 0)}
                    status={r.status || "Paid"}
                    onView={() => setViewingPayslip(r)}
                    onDownload={() => handleDownload(r)}
                  />
                ))
              )}
            </tbody>
          </table>
        )}
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

function PayrollRow({ period, paidDate, earnings, status, onView, onDownload }) {
  return (
    <tr>
      <td className="py-2">
        <div className="font-medium">{period}</div>
        <div className="text-[11px] text-gray-500">Paid: {paidDate}</div>
      </td>

      <td className="font-semibold text-green-800">{earnings}</td>

      <td>
        <span className="inline-block px-3 py-1 text-xs rounded-full bg-green-100 text-green-700">
          {status}
        </span>
      </td>

      <td className="flex items-center gap-2 py-2 text-gray-500">
        <button
          onClick={onView}
          className="p-1.5 hover:bg-green-50 rounded-full hover:text-green-700 transition"
          title="View Details"
        >
          <Eye size={16} />
        </button>
        <button
          onClick={onDownload}
          className="p-1.5 hover:bg-green-50 rounded-full hover:text-green-700 transition"
          title="Download PDF"
        >
          <Download size={16} />
        </button>
      </td>
    </tr>
  );
}

/* ===== PAYSLIP MODAL ===== */
function PayslipViewModal({ record, onClose, peso, period }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-xl overflow-hidden border border-yellow-200">
        <div className="bg-green-700 p-4 flex justify-between items-center">
          <h3 className="text-white font-bold text-lg">Payslip Details</h3>
          <button onClick={onClose} className="text-white/80 hover:text-white transition">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="text-center border-b border-gray-100 pb-4">
            <p className="text-sm text-gray-500 uppercase tracking-wide">Pay Period</p>
            <p className="text-green-900 font-bold text-lg">{period}</p>
          </div>

          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Gross Pay</span>
              <span className="font-medium text-gray-900">{peso(record.gross_pay)}</span>
            </div>
            <div className="flex justify-between text-red-600">
              <span>Deductions</span>
              <span>- {peso(record.deductions)}</span>
            </div>
            <div className="h-px bg-gray-200 my-2"></div>
            <div className="flex justify-between text-lg font-bold text-green-800">
              <span>Net Pay</span>
              <span>{peso(record.net_pay)}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 p-4 text-center">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-green-700 font-medium transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
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

function ProgressBar({ label, value, percent }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-green-900 font-semibold">{label}</span>
        <span className="text-green-700">{value}</span>
      </div>
      <div className="w-full bg-yellow-100 rounded-full h-2">
        <div className="bg-green-700 h-2 rounded-full" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

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
          {/* Profile Fields... */}
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
