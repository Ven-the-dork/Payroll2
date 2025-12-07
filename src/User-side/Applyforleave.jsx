import { useState, useEffect } from "react";
import { Bell, User, Settings, LogOut, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";

export default function ApplyForLeaveMockup() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

  const [leaveOptions, setLeaveOptions] = useState([]);
  const [loadingLeaves, setLoadingLeaves] = useState(true);

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [leaveHistory, setLeaveHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // User info
  const [currentUser, setCurrentUser] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);

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
    // Reset form
    setStartDate("");
    setEndDate("");
    setReason("");
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedLeave(null);
    setStartDate("");
    setEndDate("");
    setReason("");
  }

  // Load user from session storage and get employee_id
  useEffect(() => {
    async function loadUser() {
      const stored = sessionStorage.getItem("user");
      if (stored) {
        try {
          const user = JSON.parse(stored);
          setCurrentUser(user);

          // Get employee_id from database
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

  // Heartbeat: Update status and last_seen every 30 seconds
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

    // Initial heartbeat
    heartbeat();

    // Set interval for every 30 seconds
    const interval = setInterval(heartbeat, 30000);

    // Go offline when user leaves
    const goOffline = async () => {
      await supabase
        .from("employees")
        .update({ status: "Inactive" })
        .eq("id", employeeId);
    };

    window.addEventListener("beforeunload", goOffline);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", goOffline);
      goOffline();
    };
  }, [employeeId]);

  // Fetch leave plans defined by admin
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
        .select(`
          *,
          leave_plans (name)
        `)
        .eq("firebase_uid", currentUser.uid)
        .order("applied_at", { ascending: false });

      if (!error && data) {
        setLeaveHistory(data);
      }
      setLoadingHistory(false);
    }

    fetchLeaveHistory();
  }, [currentUser]);

  // Calculate duration in days
  function calculateDuration(start, end) {
    if (!start || !end) return 0;
    const startDate = new Date(start);
    const endDate = new Date(end);
    const diffTime = Math.abs(endDate - startDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  }

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
      alert("Firebase UID not found in session. Please log in again.");
      return;
    }

    if (!employeeId) {
      alert("Employee ID not found. Please contact administrator.");
      return;
    }

    setSubmitting(true);

    const duration = calculateDuration(startDate, endDate);

    const payload = {
      employee_id: employeeId,
      firebase_uid: currentUser.uid,
      leave_plan_id: selectedLeave.id,
      start_date: startDate,
      end_date: endDate,
      duration_days: duration,
      reason: reason,
      status: "pending",
    };

    const { data, error } = await supabase
      .from("leave_applications")
      .insert(payload)
      .select("*")
      .single();

    setSubmitting(false);

    if (error) {
      console.error("Error submitting leave application:", error);
      alert("Failed to submit leave application: " + error.message);
    } else {
      alert("Leave application submitted successfully!");
      closeModal();
      // Refresh leave history
      if (currentUser?.uid) {
        const { data: historyData } = await supabase
          .from("leave_applications")
          .select(`*, leave_plans (name)`)
          .eq("firebase_uid", currentUser.uid)
          .order("applied_at", { ascending: false });
        if (historyData) setLeaveHistory(historyData);
      }
    }
  }

  return (
    <div className="min-h-screen bg-green-50 text-green-900 font-sans">
      {/* Top bar */}
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

      {/* Breadcrumb + Back button */}
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

        {/* Leave Cards */}
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
                  onApply={() => openModal(opt)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Leave History */}
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
                  <th className="p-2 font-semibold text-left">Status</th>
                  <th className="p-2 font-semibold text-left">Reason</th>
                </tr>
              </thead>
              <tbody>
                {loadingHistory ? (
                  <tr>
                    <td colSpan="6" className="p-3 text-center text-sm text-gray-600">
                      Loading...
                    </td>
                  </tr>
                ) : leaveHistory.length === 0 ? (
                  <tr className="bg-green-50">
                    <td colSpan="6" className="p-3 text-center text-sm text-gray-600">
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
                        <span
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            app.status === "approved"
                              ? "bg-green-200 text-green-800"
                              : app.status === "rejected"
                              ? "bg-red-200 text-red-800"
                              : app.status === "recalled"
                              ? "bg-orange-200 text-orange-800"
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

      {/* Modal */}
      {modalOpen && (
        <Modal
          onClose={closeModal}
          leaveType={selectedLeave}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          reason={reason}
          setReason={setReason}
          onSubmit={handleSubmitApplication}
          submitting={submitting}
        />
      )}
    </div>
  );
}

function LeaveTypeCard({ days, label, onApply }) {
  return (
    <div className="flex flex-col items-center justify-between bg-green-900 text-yellow-400 rounded-xl shadow-lg border-2 border-yellow-300 w-full h-44 py-6 px-3">
      <span className="text-4xl font-extrabold mb-2">{days}</span>
      <span className="text-lg font-bold mb-2 text-white">{label}</span>
      <button
        onClick={onApply}
        className="mt-2 px-6 py-2 bg-yellow-400 text-green-900 rounded font-bold text-sm hover:bg-white hover:text-green-900 hover:ring-2 hover:ring-yellow-400 transition cursor-pointer"
      >
        Apply
      </button>
    </div>
  );
}

function Modal({
  onClose,
  leaveType,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  reason,
  setReason,
  onSubmit,
  submitting,
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-blur bg-opacity-40 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-lg w-full p-8 relative shadow-lg border-2 border-blue-300 animate-fadeIn">
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
          <div>
            <label className="block text-sm font-semibold text-green-800 mb-1">
              Leave Type
            </label>
            <input
              type="text"
              value={leaveType?.label || ""}
              readOnly
              className="w-full p-2 bg-gray-100 border border-gray-300 rounded text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-green-800 mb-1">
              Max Days Available
            </label>
            <input
              type="text"
              value={leaveType?.days || ""}
              readOnly
              className="w-full p-2 bg-gray-100 border border-gray-300 rounded text-sm"
            />
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
