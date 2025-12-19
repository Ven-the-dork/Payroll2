import { useState, useEffect } from "react";
import { User, X, Paperclip, Calendar, Clock, FileText, ChevronLeft, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";

// ✅ Reusable topbar + notifications hook
import UserTopBar from "../components/UserTopBar";
import { useUserNotifications } from "../components/hooks/useUserNotifications";

// Helper function: Calculate duration excluding weekends
function calculateDuration(start, end) {
  if (!start || !end) return 0;

  const startDate = new Date(start);
  const endDate = new Date(end);

  // Validate dates
  if (endDate < startDate) return 0;

  let count = 0;
  let currentDate = new Date(startDate);

  // Loop through every day from start to end
  while (currentDate <= endDate) {
    const dayOfWeek = currentDate.getDay();

    // 0 = Sunday, 6 = Saturday. Only count if it's 1-5 (Mon-Fri)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      count++;
    }

    // Move to next day
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return count;
}

export default function ApplyForLeaveMockup() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  const [leaveOptions, setLeaveOptions] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");

  const [attachment, setAttachment] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const [currentUser, setCurrentUser] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);

  const [leaveBalances, setLeaveBalances] = useState({});

  // ✅ NEW: notif state controlled by this page (hook uses it to auto-mark read)
  const [notifOpen, setNotifOpen] = useState(false);

  // ✅ NEW: reusable notifications data
  const { notifications, unreadCount, markAllRead } = useUserNotifications(employeeId, notifOpen);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const handleBackToDashboard = () => {
    navigate("/dashboard_user");
  };

  function openModal(leaveType) {
    setSelectedLeave(leaveType);
    setModalOpen(true);
    setStartDate("");
    setEndDate("");
    setReason("");
    setAttachment(null);
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedLeave(null);
    setStartDate("");
    setEndDate("");
    setReason("");
    setAttachment(null);
  }

  // Load user
  useEffect(() => {
    async function loadUser() {
      const stored = sessionStorage.getItem("user");
      if (stored) {
        try {
          const user = JSON.parse(stored);
          setCurrentUser(user);

          const { data, error } = await supabase
            .from("employees")
            .select("id")
            .eq("firebase_uid", user.uid)
            .single();

          if (!error && data) {
            setEmployeeId(data.id);
          }
        } catch (err) {
          console.error("Error loading user:", err);
        }
      }
    }
    loadUser();
  }, []);

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
    const interval = setInterval(heartbeat, 30000);

    const goOffline = async () => {
      await supabase.from("employees").update({ status: "Inactive" }).eq("id", employeeId);
    };

    window.addEventListener("beforeunload", goOffline);

    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", goOffline);
      goOffline();
    };
  }, [employeeId]);

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
        const options = data.map((row) => ({
          id: row.id,
          label: row.name,
          days: row.duration_days,
        }));
        setLeaveOptions(options);
      }
      setLoadingLeaves(false);
    }

    fetchLeaveOptions();
  }, []);

  // Fetch leave history
  useEffect(() => {
    async function fetchLeaveHistory() {
      if (!currentUser?.uid) return;

      setLoadingHistory(true);
      const { data, error } = await supabase
        .from("leave_applications")
        .select(`*, leave_plans (name)`)
        .eq("firebase_uid", currentUser.uid)
        .order("applied_at", { ascending: false });

      if (!error && data) {
        setLeaveHistory(data);
      }
      setLoadingHistory(false);
    }

    fetchLeaveHistory();
  }, [currentUser]);

  // Calculate Balances
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
      applications.forEach((app) => {
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
  }, [currentUser, leaveOptions, leaveHistory]);

  // Submit leave application
  async function handleSubmitApplication(e) {
    e.preventDefault();

    if (!startDate || !endDate || !reason) {
      alert("Please fill in all fields");
      return;
    }

    if (new Date(endDate) < new Date(startDate)) {
      alert("End date must be after start date");
      return;
    }

    if (!currentUser?.uid) {
      alert("Firebase UID not found. Please log in again.");
      return;
    }

    if (!employeeId) {
      alert("Employee ID not found. Please contact administrator.");
      return;
    }

    setSubmitting(true);

    const duration = calculateDuration(startDate, endDate);

    // Balance Check
    const currentBalance = leaveBalances[selectedLeave.id] ?? selectedLeave.days;
    if (duration > currentBalance) {
      alert(`Insufficient leave balance! You only have ${currentBalance} days left.`);
      setSubmitting(false);
      return;
    }

    // Overlap Check
    try {
      const { data: existingConflicts, error: conflictError } = await supabase
        .from("leave_applications")
        .select("start_date, end_date")
        .eq("firebase_uid", currentUser.uid)
        .in("status", ["pending", "approved"])
        .lte("start_date", endDate)
        .gte("end_date", startDate);

      if (conflictError) throw conflictError;

      if (existingConflicts && existingConflicts.length > 0) {
        alert("Conflict Detected! You already have a leave application for these dates.");
        setSubmitting(false);
        return;
      }
    } catch (err) {
      console.error("Error checking conflicts:", err);
      setSubmitting(false);
      return;
    }

    // File Upload Logic
    let attachmentUrl = null;

    if (attachment) {
      try {
        const fileExt = attachment.name.split(".").pop();
        const fileName = `${currentUser.uid}/${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from("leave_attachments")
          .upload(fileName, attachment);

        if (uploadError) {
          throw uploadError;
        }

        const { data: urlData } = supabase.storage
          .from("leave_attachments")
          .getPublicUrl(fileName);

        attachmentUrl = urlData.publicUrl;
      } catch (uploadErr) {
        console.error("Upload error:", uploadErr);
        alert("Failed to upload file. Please check your network or file size.");
        setSubmitting(false);
        return;
      }
    }

    const payload = {
      employee_id: employeeId,
      firebase_uid: currentUser.uid,
      leave_plan_id: selectedLeave.id,
      start_date: startDate,
      end_date: endDate,
      duration_days: duration,
      reason: reason,
      status: "pending",
      admin_seen: false,
      attachment_url: attachmentUrl,
    };

    const { error } = await supabase.from("leave_applications").insert(payload);

    setSubmitting(false);

    if (error) {
      console.error("Error submitting:", error);
      alert("Failed to submit: " + error.message);
    } else {
      alert("Leave application submitted successfully!");
      closeModal();
      // Refresh history
      const { data: historyData } = await supabase
        .from("leave_applications")
        .select(`*, leave_plans (name)`)
        .eq("firebase_uid", currentUser.uid)
        .order("applied_at", { ascending: false });
      if (historyData) setLeaveHistory(historyData);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <nav className="max-w-6xl mx-auto flex justify-between items-center px-6 py-4">
          <div className="flex items-center gap-4">
            <button
                onClick={handleBackToDashboard}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-green-700 transition"
                title="Back to Dashboard"
            >
                <ArrowLeft size={20} />
            </button>
            <h1 className="text-xl font-bold text-gray-800 tracking-tight">
              Apply for Leave
            </h1>
          </div>

          <UserTopBar
            notifOpen={notifOpen}
            setNotifOpen={setNotifOpen}
            unreadCount={unreadCount}
            notifications={notifications}
            onMarkAllRead={markAllRead}
            onLogout={handleLogout}
          />
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* LEAVE TYPES GRID */}
        <section>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                    <Calendar className="text-green-600" size={20}/>
                    Select Leave Type
                </h2>
                <span className="text-xs font-medium text-gray-500 bg-white px-3 py-1 rounded-full shadow-sm border border-gray-100">
                    Balances include pending requests
                </span>
            </div>

            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xl shadow-gray-200/50 border border-gray-100">
            {loadingLeaves ? (
                <div className="py-12 text-center text-gray-400 animate-pulse">Loading leave plans...</div>
            ) : leaveOptions.length === 0 ? (
                <div className="py-12 text-center text-red-500 bg-red-50 rounded-2xl border border-red-100">
                No leave plans available. Please contact HR.
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {leaveOptions.map((opt) => (
                    <LeaveTypeCard
                    key={opt.id}
                    days={opt.days}
                    label={opt.label}
                    remaining={leaveBalances[opt.id]}
                    onApply={() => openModal(opt)}
                    />
                ))}
                </div>
            )}
            </div>
        </section>

        {/* LEAVE HISTORY TABLE */}
        <section>
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="text-green-600" size={20}/>
                Application History
            </h2>
            
            <div className="bg-white rounded-3xl shadow-lg shadow-gray-200/50 overflow-hidden border border-gray-100">
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 text-gray-500 font-semibold uppercase text-xs">
                    <tr>
                    <th className="px-6 py-4">Leave Type</th>
                    <th className="px-6 py-4">Duration</th>
                    <th className="px-6 py-4">Date Range</th>
                    <th className="px-6 py-4">File</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Reason</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loadingHistory ? (
                    <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                        Loading history...
                        </td>
                    </tr>
                    ) : leaveHistory.length === 0 ? (
                    <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-400">
                        No leave applications yet.
                        </td>
                    </tr>
                    ) : (
                    leaveHistory.map((app) => (
                        <tr key={app.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-bold text-gray-800">
                            {app.leave_plans?.name || "N/A"}
                        </td>
                        <td className="px-6 py-4 text-gray-600">
                            <span className="font-semibold">{app.duration_days}</span> days
                        </td>
                        <td className="px-6 py-4 text-gray-600 text-xs">
                            <div className="flex flex-col">
                                <span>{new Date(app.start_date).toLocaleDateString()}</span>
                                <span className="text-gray-400">to</span>
                                <span>{new Date(app.end_date).toLocaleDateString()}</span>
                            </div>
                        </td>
                        <td className="px-6 py-4">
                            {app.attachment_url ? (
                            <a
                                href={app.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 hover:text-blue-700 transition text-xs font-medium"
                            >
                                <Paperclip size={14} /> View
                            </a>
                            ) : (
                            <span className="text-gray-300">-</span>
                            )}
                        </td>
                        <td className="px-6 py-4">
                            <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ${
                                app.status === "approved"
                                ? "bg-green-100 text-green-700"
                                : app.status === "rejected"
                                ? "bg-red-100 text-red-700"
                                : "bg-yellow-100 text-yellow-700"
                            }`}
                            >
                            {app.status}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate" title={app.reason}>
                            {app.reason}
                        </td>
                        </tr>
                    ))
                    )}
                </tbody>
                </table>
             </div>
            </div>
        </section>

      </main>

      {modalOpen && (
        <Modal
          onClose={closeModal}
          leaveType={selectedLeave}
          remainingBalance={leaveBalances[selectedLeave.id] ?? selectedLeave.days}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          reason={reason}
          setReason={setReason}
          attachment={attachment}
          setAttachment={setAttachment}
          onSubmit={handleSubmitApplication}
          submitting={submitting}
        />
      )}
    </div>
  );
}

function LeaveTypeCard({ days, label, remaining, onApply }) {
  const balance = remaining !== undefined ? remaining : days;
  const isExhausted = balance === 0;

  return (
    <div className={`group relative flex flex-col justify-between overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
        isExhausted 
        ? "bg-gray-100 border border-gray-200" 
        : "bg-gradient-to-br from-green-800 to-green-900 border border-green-700 shadow-xl shadow-green-900/20"
    }`}>
      
      {/* Background decoration */}
      {!isExhausted && (
          <div className="absolute -top-10 -right-10 h-32 w-32 rounded-full bg-yellow-400/10 blur-2xl group-hover:bg-yellow-400/20 transition-all duration-500"></div>
      )}

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
             <div className={`p-2 rounded-xl ${isExhausted ? "bg-gray-200" : "bg-white/10"}`}>
                <FileText className={isExhausted ? "text-gray-400" : "text-yellow-300"} size={24} />
             </div>
             <span className={`text-xs font-bold uppercase tracking-wider ${isExhausted ? "text-gray-400" : "text-green-200"}`}>
                {isExhausted ? "Unavailable" : "Available"}
             </span>
        </div>
        
        <h3 className={`text-4xl font-extrabold tracking-tight mb-1 ${isExhausted ? "text-gray-400" : "text-white"}`}>
            {balance}
        </h3>
        <p className={`text-sm font-medium ${isExhausted ? "text-gray-400" : "text-green-100/80"}`}>
             days remaining
        </p>
        <p className={`mt-4 text-lg font-bold ${isExhausted ? "text-gray-500" : "text-white"}`}>
            {label}
        </p>
      </div>

      <button
        onClick={onApply}
        disabled={isExhausted}
        className={`mt-6 w-full rounded-xl py-3 text-sm font-bold shadow-sm transition-all transform active:scale-95 ${
          isExhausted
            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
            : "bg-[#fbbf24] text-green-900 hover:bg-[#f59e0b] hover:shadow-lg"
        }`}
      >
        {isExhausted ? "Limit Reached" : "Apply Now"}
      </button>
    </div>
  );
}

function Modal({
  onClose,
  leaveType,
  remainingBalance,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  reason,
  setReason,
  attachment,
  setAttachment,
  onSubmit,
  submitting,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full p-8 relative shadow-2xl animate-in zoom-in-95 duration-200 border border-gray-100">
        <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-900">New Application</h2>
                <p className="text-sm text-gray-500 mt-1">Applying for <span className="text-green-700 font-bold">{leaveType?.label}</span></p>
            </div>
            <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition"
            >
            <X size={24} />
            </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
          {/* Balance Indicator */}
          <div className="bg-green-50 rounded-xl px-4 py-3 flex justify-between items-center border border-green-100">
            <span className="text-sm font-medium text-green-800">Current Balance</span>
            <span className="text-lg font-bold text-green-700">{remainingBalance} Days</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition"
              />
            </div>
          </div>

           {/* Duration Preview */}
           <div className="flex justify-between items-center px-2">
                <span className="text-xs text-gray-400 font-medium">Weekends are automatically excluded</span>
                <span className="text-sm font-bold text-gray-700">
                    Total: <span className="text-green-600">{calculateDuration(startDate, endDate)} days</span>
                </span>
           </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Supporting Document <span className="normal-case font-normal text-gray-400">(Optional)</span>
            </label>
            <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-gray-200 border-dashed rounded-xl cursor-pointer hover:bg-gray-50 hover:border-green-400 transition group">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    {attachment ? (
                        <div className="flex items-center gap-2 text-green-600">
                            <FileText size={20} />
                            <p className="text-sm font-medium truncate max-w-[200px]">{attachment.name}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-green-600 transition-colors">
                            <Paperclip size={20} />
                            <p className="text-xs font-medium">Click to upload file</p>
                        </div>
                    )}
                </div>
                <input 
                    type="file" 
                    className="hidden" 
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => e.target.files && setAttachment(e.target.files[0])}
                />
            </label>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1.5">
              Reason for Leave
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Please describe why you are requesting leave..."
              className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200 outline-none transition resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-green-700 text-white px-4 py-3 rounded-xl font-bold text-sm shadow-lg shadow-green-700/30 hover:bg-green-800 hover:shadow-xl transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
