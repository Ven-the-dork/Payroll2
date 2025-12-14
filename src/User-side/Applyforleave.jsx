import { useState, useEffect } from "react";
import { Bell, User, Settings, LogOut, X, Paperclip } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";

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
      await supabase
        .from("employees")
        .update({ status: "Inactive" })
        .eq("id", employeeId);
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
        usage[app.leave_plan_id] =
          (usage[app.leave_plan_id] || 0) + app.duration_days;
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
    const currentBalance =
      leaveBalances[selectedLeave.id] ?? selectedLeave.days;
    if (duration > currentBalance) {
      alert(
        `Insufficient leave balance! You only have ${currentBalance} days left.`
      );
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
        alert(
          "Conflict Detected! You already have a leave application for these dates."
        );
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
    <div className="min-h-screen bg-green-50 text-green-900 font-sans">
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto flex justify-between items-center px-2 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-green-700">
              Dashboard
            </h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Bell className="w-5 h-5 text-green-600 hover:text-yellow-500 cursor-pointer transition" />
            <User className="w-5 h-5 text-green-600 hover:text-yellow-500 cursor-pointer transition" />
            <Settings className="w-5 h-5 text-green-600 hover:text-yellow-500 cursor-pointer transition" />
            <button onClick={handleLogout} className="cursor-pointer">
              <LogOut className="w-5 h-5 text-green-600 hover:text-red-500 transition" />
            </button>
          </div>
        </nav>
      </header>

      <div className="w-full max-w-6xl mx-auto mt-6 mb-2">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs bg-white px-4 py-2 rounded border border-yellow-100 text-green-700">
            Dashboard &gt; Apply for Leave
          </div>
          <button
            onClick={handleBackToDashboard}
            className="text-xs sm:text-sm bg-green-700 text-white px-3 py-1 rounded shadow hover:bg-yellow-400 hover:text-green-900 transition cursor-pointer"
          >
            ← Back to Dashboard
          </button>
        </div>

        <div className="bg-white rounded p-6 mb-3">
          {loadingLeaves ? (
            <p className="text-sm text-green-700">Loading leave plans...</p>
          ) : leaveOptions.length === 0 ? (
            <p className="text-sm text-red-600">
              No leave plans available. Please contact your administrator.
            </p>
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

        <div className="bg-white rounded p-4 shadow border border-yellow-200">
          <div className="flex justify-between mb-2 items-center">
            <span className="font-bold text-base text-green-800">
              Leave History
            </span>
            <div className="flex items-center gap-2">
              <button className="h-8 px-4 bg-yellow-400 text-green-900 text-xs rounded font-bold hover:bg-yellow-300 transition cursor-pointer">
                Export
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-yellow-100 text-green-900">
                  <th className="p-2 font-semibold text-left">Leave Type</th>
                  <th className="p-2 font-semibold text-left">Duration</th>
                  <th className="p-2 font-semibold text-left">Start Date</th>
                  <th className="p-2 font-semibold text-left">End Date</th>
                  <th className="p-2 font-semibold text-left">File</th>
                  <th className="p-2 font-semibold text-left">Status</th>
                  <th className="p-2 font-semibold text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td
                      colSpan="7"
                      className="p-3 text-center text-sm text-gray-600"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : leaveHistory.length === 0 ? (
                  <tr className="bg-green-50">
                    <td
                      colSpan="7"
                      className="p-3 text-center text-sm text-gray-600"
                    >
                      No leave applications yet. Apply for leave above.
                    </td>
                  </tr>
                ) : (
                  leaveHistory.map((app, index) => (
                    <tr
                      key={app.id}
                      className={index % 2 === 0 ? "bg-green-50" : "bg-white"}
                    >
                      <td className="p-2">{app.leave_plans?.name || "N/A"}</td>
                      <td className="p-2">{app.duration_days} days</td>
                      <td className="p-2">
                        {new Date(app.start_date).toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        {new Date(app.end_date).toLocaleDateString()}
                      </td>
                      <td className="p-2">
                        {app.attachment_url ? (
                          <a
                            href={app.attachment_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Paperclip size={14} /> View
                          </a>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="p-2">
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            app.status === "approved"
                              ? "bg-green-200 text-green-800"
                              : app.status === "rejected"
                              ? "bg-red-200 text-red-800"
                              : "bg-yellow-200 text-yellow-800"
                          }`}
                        >
                          {app.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-2">{app.reason}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {modalOpen && (
        <Modal
          onClose={closeModal}
          leaveType={selectedLeave}
          remainingBalance={
            leaveBalances[selectedLeave.id] ?? selectedLeave.days
          }
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
  return (
    <div className="flex flex-col items-center justify-between bg-green-900 text-yellow-400 rounded-xl shadow-lg border-2 border-yellow-300 w-full h-44 py-6 px-3 relative overflow-hidden group">
      <div className="absolute top-0 right-0 w-16 h-16 bg-white/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-150"></div>
      <div className="text-center z-10">
        <span className="text-4xl font-extrabold mb-1 block">{balance}</span>
        <span className="text-xs text-green-200 uppercase tracking-wider font-semibold block mb-2">
          Days Left
        </span>
        <span className="text-lg font-bold text-white block">{label}</span>
      </div>
      <button
        onClick={onApply}
        disabled={balance === 0}
        className={`mt-2 px-6 py-2 rounded font-bold text-sm transition cursor-pointer z-10 ${
          balance === 0
            ? "bg-gray-500 text-gray-300 cursor-not-allowed"
            : "bg-yellow-400 text-green-900 hover:bg-white hover:text-green-900 hover:ring-2 hover:ring-yellow-400"
        }`}
      >
        {balance === 0 ? "Exhausted" : "Apply"}
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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-lg w-full p-8 relative shadow-lg border-2 border-green-300 animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-green-800 hover:text-red-500 transition"
        >
          <X size={24} />
        </button>
        <div className="flex flex-col items-center mb-5">
          <span className="text-3xl mb-2">📖</span>
          <h2 className="font-bold text-2xl text-center mb-1">
            Leave Application
          </h2>
          <p className="text-gray-500 text-sm text-center">
            Fill the required fields below to apply for{" "}
            {leaveType?.label?.toLowerCase()}.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Leave Type
              </label>
              <input
                type="text"
                value={leaveType?.label || ""}
                readOnly
                className="w-full p-2 bg-gray-100 border border-gray-300 rounded text-sm text-gray-600"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Remaining Balance
              </label>
              <input
                type="text"
                value={`${remainingBalance} Days`}
                readOnly
                className="w-full p-2 bg-green-50 border border-green-200 text-green-800 font-bold rounded text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-green-800 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            {/* NEW: Display Total Working Days */}
            <div className="col-span-2 bg-yellow-50 px-3 py-2 rounded border border-yellow-200">
              <p className="text-xs text-green-800 flex justify-between items-center">
                <span>Total Working Days:</span>
                <span className="font-bold text-lg">
                  {calculateDuration(startDate, endDate)} days
                </span>
              </p>
              <p className="text-[10px] text-gray-500 text-right mt-1">
                (Weekends excluded)
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-800 mb-1">
              Attachment{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer bg-white border border-yellow-300 text-green-800 px-3 py-2 rounded text-sm hover:bg-yellow-50 transition flex items-center gap-2">
                <Paperclip size={16} />
                {attachment ? "Change File" : "Upload Document"}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setAttachment(e.target.files[0]);
                    }
                  }}
                />
              </label>
              {attachment && (
                <span className="text-sm text-gray-600 truncate max-w-[200px]">
                  {attachment.name}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Accepts PDF, JPG, PNG (Max 5MB)
            </p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-800 mb-1">
              Reason for Leave
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              placeholder="Enter your reason..."
              className="w-full p-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-green-700 text-white py-2 px-4 rounded font-semibold text-sm hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {submitting ? "Submitting..." : "Submit Application"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 border border-green-700 text-green-700 py-2 px-4 rounded font-semibold text-sm hover:bg-gray-50 transition"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
