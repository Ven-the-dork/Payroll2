import { useState, useEffect } from "react";
import { Menu, Search, Settings, ChevronDown, Paperclip } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import AdminBell from "../components/AdminBell";
import AdminSidebar from "../components/Adminnavbar/Leavedashvar";
import FontSizeMenu from "../components/hooks/FontSizeMenu";
import AdminSetting from "../components/Adminsetting";

export default function LeaveManagement() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openHistoryDropdown, setOpenHistoryDropdown] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const [leaveApplications, setLeaveApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);

  // State for leave plans from Supabase
  const [leavePlans, setLeavePlans] = useState([]);

  // State for ongoing leaves (recall)
  const [ongoingLeaves, setOngoingLeaves] = useState([]);
  const [loadingOngoing, setLoadingOngoing] = useState(true);

  // Form state for creating leave plan
  const [leavePlanName, setLeavePlanName] = useState("");
  const [durationDays, setDurationDays] = useState("");
  const [allowRecall, setAllowRecall] = useState("");
  const [recallReason, setRecallReason] = useState("");

  // State for editing leave plan
  const [editingPlan, setEditingPlan] = useState(null);
  const [editName, setEditName] = useState("");
  const [editDuration, setEditDuration] = useState("");
  const [editAllowRecall, setEditAllowRecall] = useState("");

  // State for recall modal
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [selectedRecallLeave, setSelectedRecallLeave] = useState(null);
  const [recallDepartment, setRecallDepartment] = useState("");
  const [recallNewResumptionDate, setRecallNewResumptionDate] = useState("");
  const [recallReasonText, setRecallReasonText] = useState("");
  const [submittingRecall, setSubmittingRecall] = useState(false);

  const toggleTab = (tabName) =>
    setActiveTab((prev) => (prev === tabName ? null : tabName));

  const toggleDropdown = (index) =>
    setOpenDropdown((prev) => (prev === index ? null : index));

  const toggleHistoryDropdown = (index) =>
    setOpenHistoryDropdown((prev) => (prev === index ? null : index));

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // -------------------------
  // Notifications helper
  // -------------------------
  const createLeaveNotification = async ({
    employeeId,
    leaveApplicationId,
    type,
    title,
    message,
  }) => {
    if (!employeeId || !leaveApplicationId) return;

    const { error } = await supabase.from("notifications").insert({
      employee_id: employeeId,
      leave_application_id: leaveApplicationId,
      type,
      title,
      message,
    });

    if (error) {
      console.error("Failed to create notification:", error);
      // Don't block admin flow if notification insert fails
    }
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

  // Fetch leave plans from Supabase
  useEffect(() => {
    async function fetchPlans() {
      const { data, error } = await supabase
        .from("leave_plans")
        .select("*")
        .eq("is_active", true)
        .order("name");

      if (!error && data) {
        setLeavePlans(data);
      }
    }
    fetchPlans();
  }, []);

  // Fetch all leave applications (admin view)
  useEffect(() => {
    async function fetchApplications() {
      setLoadingApplications(true);
      const { data, error } = await supabase
        .from("leave_applications")
        .select(
          `
          *,
          employees (full_name, department),
          leave_plans (name)
        `
        )
        .order("applied_at", { ascending: false });

      if (!error && data) {
        setLeaveApplications(data);
      }
      setLoadingApplications(false);
    }

    fetchApplications();
  }, []);

  // Fetch approved ongoing leaves (for recall)
  useEffect(() => {
    async function fetchOngoingLeaves() {
      setLoadingOngoing(true);
      const today = new Date().toISOString().split("T")[0];

      const { data, error } = await supabase
        .from("leave_applications")
        .select(
          `
          *,
          employees (full_name, department),
          leave_plans (name, allow_recall)
        `
        )
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today)
        .order("start_date", { ascending: false });

      if (!error && data) {
        const recallableLeaves = data.filter(
          (leave) => leave.leave_plans?.allow_recall === true
        );
        setOngoingLeaves(recallableLeaves);
      }
      setLoadingOngoing(false);
    }

    fetchOngoingLeaves();
  }, []);

  // Create new leave plan
  async function handleCreateLeaveSetting(e) {
    e.preventDefault();

    if (!leavePlanName || !durationDays) {
      alert("Please fill in Leave Plan Name and Duration");
      return;
    }

    const payload = {
      name: leavePlanName,
      duration_days: Number(durationDays),
      is_active: true,
      allow_recall: allowRecall === "Yes",
    };

    const { data, error } = await supabase
      .from("leave_plans")
      .insert(payload)
      .select("*")
      .single();

    if (error) {
      console.error("Error creating leave plan:", error);
      alert("Failed to create leave plan");
    } else if (data) {
      setLeavePlans((prev) => [...prev, data]);
      setLeavePlanName("");
      setDurationDays("");
      setAllowRecall("");
      setRecallReason("");
      alert("Leave plan created successfully!");
    }
  }

  // Approve leave application (+ notification)
  async function handleApproveLeave(applicationId) {
    if (!confirm("Are you sure you want to approve this leave application?")) return;

    // fetch row for employee_id (and for nicer message)
    const { data: appRow, error: fetchError } = await supabase
      .from("leave_applications")
      .select(
        `
        id,
        employee_id,
        start_date,
        end_date,
        leave_plans (name),
        employees (full_name)
      `
      )
      .eq("id", applicationId)
      .single();

    if (fetchError) {
      console.error("Error fetching leave row:", fetchError);
      alert("Failed to fetch leave application data");
      return;
    }

    const { error } = await supabase
      .from("leave_applications")
      .update({
        status: "approved",
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentUser?.uid || currentUser?.firebase_uid,
      })
      .eq("id", applicationId);

    if (error) {
      console.error("Error approving leave:", error);
      alert("Failed to approve leave application");
      return;
    }

    await createLeaveNotification({
      employeeId: appRow.employee_id,
      leaveApplicationId: appRow.id,
      type: "leave_approved",
      title: "Leave approved",
      message: `Your ${appRow.leave_plans?.name || "leave"} request was approved (${appRow.start_date} to ${appRow.end_date}).`,
    });

    setLeaveApplications((prev) =>
      prev.map((app) =>
        app.id === applicationId
          ? { ...app, status: "approved", reviewed_at: new Date().toISOString() }
          : app
      )
    );

    alert("Leave application approved!");
    setOpenHistoryDropdown(null);
  }

  // Reject/Decline leave application (+ notification)
    async function handleRejectLeave(applicationId) {
      if (!confirm("Are you sure you want to reject this leave application?")) return;

      // 1) fetch row to get employee_id + leave plan name for the message
      const { data: appRow, error: fetchError } = await supabase
        .from("leave_applications")
        .select(`
          id,
          employee_id,
          start_date,
          end_date,
          leave_plans (name),
          employees (full_name)
        `)
        .eq("id", applicationId)
        .single();

      if (fetchError) {
        console.error("Error fetching leave row:", fetchError);
        alert("Failed to fetch leave application data");
        return;
      }

      // 2) update status
      const { error } = await supabase
        .from("leave_applications")
        .update({
          status: "rejected",
          reviewed_at: new Date().toISOString(),
          reviewed_by: currentUser?.uid || currentUser?.firebase_uid,
        })
        .eq("id", applicationId);

      if (error) {
        console.error("Error rejecting leave:", error);
        alert("Failed to reject leave application");
        return;
      }

      // 3) insert notification (this is what makes it appear on DashboardUser)
      await createLeaveNotification({
        employeeId: appRow.employee_id,
        leaveApplicationId: appRow.id,
        type: "leave_declined", // must match your CHECK constraint
        title: "Leave declined",
        message: `Your ${appRow.leave_plans?.name || "leave"} request was declined.`,
      });

      // 4) update UI
      setLeaveApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId
            ? { ...app, status: "rejected", reviewed_at: new Date().toISOString() }
            : app
        )
      );

      alert("Leave application rejected!");
      setOpenHistoryDropdown(null);
    }

  // Start editing leave plan
  function handleStartEdit(plan) {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditDuration(plan.duration_days);
    setEditAllowRecall(plan.allow_recall ? "Yes" : "No");
    setOpenDropdown(null);
  }

  // Save edited plan
  async function handleSaveEdit(e) {
    e.preventDefault();

    if (!editName || !editDuration) {
      alert("Please fill in all fields");
      return;
    }

    const { error } = await supabase
      .from("leave_plans")
      .update({
        name: editName,
        duration_days: Number(editDuration),
        allow_recall: editAllowRecall === "Yes",
      })
      .eq("id", editingPlan.id);

    if (error) {
      console.error("Error updating leave plan:", error);
      alert("Failed to update leave plan");
    } else {
      setLeavePlans((prev) =>
        prev.map((plan) =>
          plan.id === editingPlan.id
            ? {
                ...plan,
                name: editName,
                duration_days: Number(editDuration),
                allow_recall: editAllowRecall === "Yes",
              }
            : plan
        )
      );
      setEditingPlan(null);
      setEditName("");
      setEditDuration("");
      setEditAllowRecall("");
      alert("Leave plan updated successfully!");
    }
  }

  // Cancel editing
  function handleCancelEdit() {
    setEditingPlan(null);
    setEditName("");
    setEditDuration("");
    setEditAllowRecall("");
  }

  // Delete leave plan
  async function handleDeleteLeavePlan(planId) {
    if (!confirm("Are you sure you want to delete this leave plan?")) return;

    const { error } = await supabase
      .from("leave_plans")
      .update({ is_active: false })
      .eq("id", planId);

    if (error) {
      console.error("Error deleting leave plan:", error);
      alert("Failed to delete leave plan");
    } else {
      setLeavePlans((prev) => prev.filter((plan) => plan.id !== planId));
      alert("Leave plan deleted successfully!");
    }
  }

  // Open recall modal
  function handleOpenRecallModal(leave) {
    setSelectedRecallLeave(leave);
    setRecallDepartment(leave.employees?.department || "");
    setShowRecallModal(true);
    setRecallNewResumptionDate("");
    setRecallReasonText("");
  }

  // Close recall modal
  function handleCloseRecallModal() {
    setShowRecallModal(false);
    setSelectedRecallLeave(null);
    setRecallDepartment("");
    setRecallNewResumptionDate("");
    setRecallReasonText("");
  }

  // Calculate days remaining
  function calculateDaysRemaining(endDate) {
    const end = new Date(endDate);
    const today = new Date();
    const diffTime = end - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }

  // Submit recall (+ notification)
  async function handleSubmitRecall(e) {
    e.preventDefault();

    if (!recallNewResumptionDate || !recallReasonText) {
      alert("Please fill in all required fields");
      return;
    }

    if (new Date(recallNewResumptionDate) <= new Date()) {
      alert("New resumption date must be in the future");
      return;
    }

    setSubmittingRecall(true);

    const leaveId = selectedRecallLeave?.id;
    const employeeId = selectedRecallLeave?.employee_id;

    const { error } = await supabase
      .from("leave_applications")
      .update({
        status: "recalled",
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentUser?.uid || currentUser?.firebase_uid,
      })
      .eq("id", leaveId);

    setSubmittingRecall(false);

    if (error) {
      console.error("Error recalling leave:", error);
      alert("Failed to recall leave: " + error.message);
      return;
    }

    await createLeaveNotification({
      employeeId,
      leaveApplicationId: leaveId,
      type: "leave_recalled",
      title: "Leave recalled",
      message: `Your leave was recalled. Please resume on ${recallNewResumptionDate}.`,
    });

    setOngoingLeaves((prev) => prev.filter((leave) => leave.id !== leaveId));
    alert(
      `Leave recalled successfully! Employee should resume on ${recallNewResumptionDate}`
    );
    handleCloseRecallModal();
  }

  const btnBase =
    "px-8 md:px-10 py-2.5 md:py-3 rounded-full cursor-pointer shadow-md text-sm md:text-base transition-all duration-200";
  const sidebarWidth = isOpen ? "lg:w-64" : "lg:w-20";
  const hideWhenCollapsed = !isOpen && "hidden lg:block";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
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
            onClick={() => setIsOpen((prev) => !prev)}
            className="self-start text-green-700 cursor-pointer hover:text-yellow-400 transition"
          >
            <Menu size={28} />
          </button>


          {/* Right icons */}
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

        {/* Header */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-green-800 mb-4">
          Leave Management
        </h1>

        {/* Toggle buttons */}
        <div className="flex flex-wrap justify-center gap-4 md:gap-6 mb-6">
          <button
            onClick={() => toggleTab("settings")}
            className={
              btnBase +
              " " +
              (activeTab === "settings"
                ? "bg-yellow-400 text-green-900 font-bold"
                : "bg-green-700 text-white hover:bg-yellow-400 hover:text-green-900")
            }
          >
            Leave Settings
          </button>
          <button
            onClick={() => toggleTab("recall")}
            className={
              btnBase +
              " " +
              (activeTab === "recall"
                ? "bg-yellow-400 text-green-900 font-bold"
                : "bg-green-700 text-white hover:bg-yellow-400 hover:text-green-900")
            }
          >
            Leave Recall
          </button>
          <button
            onClick={() => toggleTab("history")}
            className={
              btnBase +
              " " +
              (activeTab === "history"
                ? "bg-yellow-400 text-green-900 font-bold"
                : "bg-green-700 text-white hover:bg-yellow-400 hover:text-green-900")
            }
          >
            Leave History
          </button>
        </div>

        {/* Panels */}
        <div
          className={
            activeTab
              ? "transition-all duration-300 ease-in-out opacity-100 translate-y-0"
              : "transition-all duration-300 ease-in-out opacity-0 -translate-y-2 pointer-events-none"
          }
        >
          {/* Leave Settings */}
          {activeTab === "settings" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Create Settings */}
              <div className="rounded-3xl bg-white shadow-sm border border-yellow-100 p-6 space-y-4">
                <h2 className="text-lg md:text-xl font-semibold underline text-green-800">
                  Create Leave Settings
                </h2>
                <form
                  onSubmit={handleCreateLeaveSetting}
                  className="space-y-3 text-sm"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-green-800 font-semibold mb-1">
                        Leave Plan Name
                      </label>
                      <select
                        value={leavePlanName}
                        onChange={(e) => setLeavePlanName(e.target.value)}
                        className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600"
                      >
                        <option value="">Select leave plan</option>
                        <option value="Annual Leave">Annual Leave</option>
                        <option value="Sick Leave">Sick Leave</option>
                        <option value="Maternity Leave">Maternity Leave</option>
                        <option value="Paternity Leave">Paternity Leave</option>
                        <option value="Compassionate Leave">
                          Compassionate Leave
                        </option>
                        <option value="Casual Leave">Casual Leave</option>
                        <option value="Study Leave">Study Leave</option>
                        <option value="Exam Leave">Exam Leave</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-green-800 font-semibold mb-1">
                        Duration (days)
                      </label>
                      <input
                        type="number"
                        placeholder="60"
                        value={durationDays}
                        onChange={(e) => setDurationDays(e.target.value)}
                        className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-green-800 font-semibold mb-1">
                      Activate Leave Recall for this plan?
                    </label>
                    <select
                      value={allowRecall}
                      onChange={(e) => setAllowRecall(e.target.value)}
                      className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600"
                    >
                      <option value="">Select option</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-green-800 font-semibold mb-1">
                      Reason for Recall
                    </label>
                    <textarea
                      rows={2}
                      value={recallReason}
                      onChange={(e) => setRecallReason(e.target.value)}
                      className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full inline-flex items-center justify-center rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-green-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 transition-all"
                  >
                    Create
                  </button>
                </form>
              </div>

              {/* Manage Settings */}
              <div className="rounded-3xl bg-white shadow-sm border border-yellow-100 p-6">
                <h2 className="text-lg md:text-xl font-semibold mb-3 text-green-800">
                  Manage Leave Settings
                </h2>

                {/* Edit Form */}
                {editingPlan && (
                  <div className="mb-4 p-4 bg-yellow-50 rounded-lg border-2 border-green-600">
                    <h3 className="text-md font-semibold text-green-800 mb-3">
                      Edit Leave Plan
                    </h3>
                    <form onSubmit={handleSaveEdit} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-green-800 font-semibold mb-1 text-sm">
                            Leave Plan Name
                          </label>
                          <select
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full p-2 bg-white rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                          >
                            <option value="">Select leave plan</option>
                            <option value="Annual Leave">Annual Leave</option>
                            <option value="Sick Leave">Sick Leave</option>
                            <option value="Maternity Leave">
                              Maternity Leave
                            </option>
                            <option value="Paternity Leave">
                              Paternity Leave
                            </option>
                            <option value="Compassionate Leave">
                              Compassionate Leave
                            </option>
                            <option value="Casual Leave">Casual Leave</option>
                            <option value="Study Leave">Study Leave</option>
                            <option value="Exam Leave">Exam Leave</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-green-800 font-semibold mb-1 text-sm">
                            Duration (days)
                          </label>
                          <input
                            type="number"
                            value={editDuration}
                            onChange={(e) => setEditDuration(e.target.value)}
                            className="w-full p-2 bg-white rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-green-800 font-semibold mb-1 text-sm">
                          Allow Recall?
                        </label>
                        <select
                          value={editAllowRecall}
                          onChange={(e) => setEditAllowRecall(e.target.value)}
                          className="w-full p-2 bg-white rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600 text-sm"
                        >
                          <option value="">Select option</option>
                          <option value="Yes">Yes</option>
                          <option value="No">No</option>
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <button
                          type="submit"
                          className="inline-flex items-center justify-center rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-green-800 transition-all"
                        >
                          Save Changes
                        </button>
                        <button
                          type="button"
                          onClick={handleCancelEdit}
                          className="inline-flex items-center justify-center rounded-full border border-green-700 px-4 py-2 text-sm font-semibold text-green-700 hover:bg-yellow-50 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Table */}
                <div className="max-h-96 overflow-y-auto rounded-2xl border border-yellow-200">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead className="bg-yellow-200 text-green-900">
                      <tr className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide">
                        <th className="p-3 text-left">Leave Plan</th>
                        <th className="p-3 text-left">Duration</th>
                        <th className="p-3 text-left">Recall</th>
                        <th className="p-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leavePlans.length === 0 ? (
                        <tr>
                          <td
                            colSpan="4"
                            className="p-3 text-center text-sm text-gray-600"
                          >
                            No leave plans created yet.
                          </td>
                        </tr>
                      ) : (
                        leavePlans.map((plan, index) => (
                          <tr
                            key={plan.id}
                            className={`h-11 ${
                              index % 2 === 0 ? "bg-yellow-50" : "bg-white"
                            } hover:bg-yellow-100 transition ${
                              editingPlan?.id === plan.id
                                ? "ring-2 ring-green-600"
                                : ""
                            }`}
                          >
                            <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                              {plan.name}
                            </td>
                            <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                              {plan.duration_days}
                            </td>
                            <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                              {plan.allow_recall ? "Yes" : "No"}
                            </td>
                            <td className="relative p-3 sm:pr-4">
                              <button
                                onClick={() => toggleDropdown(index)}
                                className="inline-flex items-center gap-1 rounded-full bg-green-700 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white cursor-pointer hover:bg-green-800 active:scale-[0.98] transition-all"
                              >
                                Actions <ChevronDown size={14} />
                              </button>
                              {openDropdown === index && (
                                <div className="absolute z-50 mt-2 w-32 bg-white border border-yellow-200 rounded-md shadow-lg overflow-hidden">
                                  <button
                                    onClick={() => handleStartEdit(plan)}
                                    className="block w-full text-left px-3 py-2 text-sm text-green-900 hover:bg-yellow-50"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteLeavePlan(plan.id)}
                                    className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                  >
                                    Delete
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Leave Recall */}
          {activeTab === "recall" && (
            <div className="rounded-3xl bg-white shadow-sm border border-yellow-100 p-6 relative">
              <h2 className="text-lg md:text-xl font-semibold mb-3 text-green-800">
                Ongoing Leave Applications (Recallable)
              </h2>
              <div className="max-h-80 overflow-y-auto rounded-2xl border border-yellow-200">
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead className="sticky top-0 bg-yellow-200 text-green-900 z-10">
                    <tr className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide">
                      <th className="p-3 text-left">Name</th>
                      <th className="p-3 text-left">Department</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Start Date</th>
                      <th className="p-3 text-left">End Date</th>
                      <th className="p-3 text-left">Days Left</th>
                      <th className="p-3 text-left">Reason</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingOngoing ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="p-3 text-center text-sm text-gray-600"
                        >
                          Loading ongoing leaves...
                        </td>
                      </tr>
                    ) : ongoingLeaves.length === 0 ? (
                      <tr>
                        <td
                          colSpan="8"
                          className="p-3 text-center text-sm text-gray-600"
                        >
                          No ongoing recallable leaves at the moment.
                        </td>
                      </tr>
                    ) : (
                      ongoingLeaves.map((leave, index) => (
                        <tr
                          key={leave.id}
                          className={`h-11 ${
                            index % 2 === 0 ? "bg-yellow-50" : "bg-white"
                          } hover:bg-yellow-100 transition`}
                        >
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {leave.employees?.full_name || "N/A"}
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {leave.employees?.department || "N/A"}
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {leave.leave_plans?.name || "N/A"}
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {new Date(leave.start_date).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {new Date(leave.end_date).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {calculateDaysRemaining(leave.end_date)} days
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {leave.reason}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleOpenRecallModal(leave)}
                              className="inline-flex items-center justify-center rounded-full bg-orange-600 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white cursor-pointer hover:bg-orange-700 active:scale-[0.98] transition-all"
                            >
                              Recall
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Recall Modal */}
              {showRecallModal && selectedRecallLeave && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md relative">
                    <button
                      className="absolute top-3 right-3 text-green-700 hover:text-red-500 text-2xl font-bold"
                      onClick={handleCloseRecallModal}
                    >
                      &times;
                    </button>
                    <div className="flex items-center mb-3">
                      <span className="text-2xl mr-2">🔁</span>
                      <h2 className="text-lg font-semibold text-green-800">
                        Leave Recall
                      </h2>
                    </div>
                    <p className="text-green-800 mb-4 text-sm">
                      Fill in the required details to recall this employee.
                    </p>
                    <form onSubmit={handleSubmitRecall} className="space-y-3 text-sm">
                      <div>
                        <label className="block text-green-800 mb-1 font-semibold">
                          Employee Name
                        </label>
                        <input
                          type="text"
                          value={selectedRecallLeave.employees?.full_name || ""}
                          readOnly
                          className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-green-800 mb-1 font-semibold">
                          Department
                        </label>
                        <input
                          type="text"
                          value={recallDepartment}
                          readOnly
                          className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                        />
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="block text-green-800 mb-1 font-semibold">
                            Start Date
                          </label>
                          <input
                            type="date"
                            value={selectedRecallLeave.start_date}
                            readOnly
                            className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-green-800 mb-1 font-semibold">
                            Original End Date
                          </label>
                          <input
                            type="date"
                            value={selectedRecallLeave.end_date}
                            readOnly
                            className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="block text-green-800 mb-1 font-semibold">
                            Days Remaining
                          </label>
                          <input
                            type="number"
                            value={calculateDaysRemaining(selectedRecallLeave.end_date)}
                            readOnly
                            className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-green-800 mb-1 font-semibold">
                            New Resumption Date *
                          </label>
                          <input
                            type="date"
                            value={recallNewResumptionDate}
                            onChange={(e) => setRecallNewResumptionDate(e.target.value)}
                            required
                            min={new Date().toISOString().split("T")[0]}
                            className="w-full bg-white border border-yellow-200 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-green-800 mb-1 font-semibold">
                          Reason for Recall *
                        </label>
                        <textarea
                          rows={3}
                          value={recallReasonText}
                          onChange={(e) => setRecallReasonText(e.target.value)}
                          required
                          placeholder="Enter reason for recalling this employee..."
                          className="w-full bg-white border border-yellow-200 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-green-600"
                        />
                      </div>

                      <div className="flex justify-between gap-3 pt-2">
                        <button
                          type="submit"
                          disabled={submittingRecall}
                          className="inline-flex items-center justify-center rounded-full bg-orange-600 px-5 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-orange-700 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submittingRecall ? "Processing..." : "Initiate Recall"}
                        </button>
                        <button
                          type="button"
                          onClick={handleCloseRecallModal}
                          className="inline-flex items-center justify-center rounded-full border border-green-700 px-5 py-2 text-sm font-semibold text-green-700 hover:bg-yellow-50 transition-all"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Leave History */}
          {activeTab === "history" && (
            <div className="rounded-3xl bg-white shadow-sm border border-yellow-100 p-6">
              <h2 className="text-lg md:text-xl text-green-800 mb-3 font-semibold">
                Leave Applications
              </h2>
              <div className="max-h-96 overflow-y-auto rounded-2xl border border-yellow-200">
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead className="bg-yellow-200 text-green-900">
                    <tr className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide">
                      <th className="p-3 text-left">Employee</th>
                      <th className="p-3 text-left">Department</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Start</th>
                      <th className="p-3 text-left">End</th>
                      <th className="p-3 text-left">Duration</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Reason</th>
                      <th className="p-3 text-left">File</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingApplications ? (
                      <tr>
                        <td
                          colSpan="10"
                          className="p-3 text-center text-sm text-gray-600"
                        >
                          Loading applications...
                        </td>
                      </tr>
                    ) : leaveApplications.length === 0 ? (
                      <tr>
                        <td
                          colSpan="10"
                          className="p-3 text-center text-sm text-gray-600"
                        >
                          No leave applications yet.
                        </td>
                      </tr>
                    ) : (
                      leaveApplications.map((item, index) => (
                        <tr
                          key={item.id}
                          className={`h-11 ${
                            index % 2 === 0 ? "bg-yellow-50" : "bg-white"
                          } hover:bg-yellow-100 transition`}
                        >
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {item.employees?.full_name || "N/A"}
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {item.employees?.department || "N/A"}
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {item.leave_plans?.name || "N/A"}
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {new Date(item.start_date).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {new Date(item.end_date).toLocaleDateString()}
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {item.duration_days} days
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                item.status === "approved"
                                  ? "bg-green-200 text-green-800"
                                  : item.status === "rejected"
                                  ? "bg-red-200 text-red-800"
                                  : item.status === "recalled"
                                  ? "bg-orange-200 text-orange-800"
                                  : "bg-yellow-200 text-yellow-800"
                              }`}
                            >
                              {String(item.status || "pending").toUpperCase()}
                            </span>
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {item.reason}
                          </td>

                          {/* File Column */}
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {item.attachment_url ? (
                              <a
                                href={item.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 hover:underline font-medium"
                              >
                                <Paperclip size={14} /> View
                              </a>
                            ) : (
                              <span className="text-gray-400 italic text-xs">
                                No file
                              </span>
                            )}
                          </td>

                          <td className="relative p-3 sm:pr-4">
                            {item.status === "pending" ? (
                              <>
                                <button
                                  onClick={() => toggleHistoryDropdown(index)}
                                  className="inline-flex items-center gap-1 rounded-full bg-green-700 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white cursor-pointer hover:bg-green-800 active:scale-[0.98] transition-all"
                                >
                                  Actions <ChevronDown size={14} />
                                </button>
                                {openHistoryDropdown === index && (
                                  <div className="absolute z-50 mt-2 w-32 bg-white border border-yellow-200 rounded-md shadow-lg overflow-hidden right-0">
                                    <button
                                      onClick={() => handleApproveLeave(item.id)}
                                      className="block w-full text-left px-3 py-2 text-sm text-green-900 hover:bg-yellow-50"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      onClick={() => handleRejectLeave(item.id)}
                                      className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                                    >
                                      Decline
                                    </button>
                                  </div>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-500 italic">
                                {item.status === "approved"
                                  ? "Approved"
                                  : item.status === "recalled"
                                  ? "Recalled"
                                  : "Declined"}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
