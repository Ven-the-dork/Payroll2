import { useState, useEffect } from "react";
import { 
  Menu, 
  Search, 
  Settings, 
  ChevronDown, 
  Paperclip, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Briefcase, 
  AlertCircle 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import AdminBell from "../components/AdminBell";
import AdminSidebar from "../components/Adminnavbar/Leavedashvar";
import FontSizeMenu from "../components/hooks/FontSizeMenu";
import AdminSetting from "../components/Adminsetting";

// Helper: Modern Action Dropdown for Leave History
function ActionDropdown({ onApprove, onReject, attachmentUrl }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all"
        onBlur={() => setTimeout(() => setOpen(false), 200)}
      >
        Actions <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded-xl bg-white shadow-xl border border-gray-100 z-50 overflow-hidden ring-1 ring-black/5">
          <button
            onClick={onApprove}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors flex items-center gap-2"
          >
            <CheckCircle size={14} className="text-green-600" /> Approve
          </button>
          <button
            onClick={onReject}
            className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-red-50 hover:text-red-700 transition-colors flex items-center gap-2"
          >
             <XCircle size={14} className="text-red-600" /> Reject
          </button>
          {attachmentUrl && (
            <a
              href={attachmentUrl}
              target="_blank"
              rel="noreferrer"
              className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition-colors flex items-center gap-2 border-t border-gray-50"
            >
              <Paperclip size={14} className="text-blue-500" /> View Attachment
            </a>
          )}
        </div>
      )}
    </div>
  );
}

export default function LeaveManagement() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState("history"); // Default to history for better UX
  const [currentUser, setCurrentUser] = useState(null);

  const [leaveApplications, setLeaveApplications] = useState([]);
  const [loadingApplications, setLoadingApplications] = useState(true);

  // State for leave plans
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
  const [openDropdown, setOpenDropdown] = useState(null); // For plan actions

  // State for recall modal
  const [showRecallModal, setShowRecallModal] = useState(false);
  const [selectedRecallLeave, setSelectedRecallLeave] = useState(null);
  const [recallDepartment, setRecallDepartment] = useState("");
  const [recallNewResumptionDate, setRecallNewResumptionDate] = useState("");
  const [recallReasonText, setRecallReasonText] = useState("");
  const [submittingRecall, setSubmittingRecall] = useState(false);

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  const createLeaveNotification = async ({ employeeId, leaveApplicationId, type, title, message }) => {
    if (!employeeId || !leaveApplicationId) return;
    const { error } = await supabase.from("notifications").insert({
      employee_id: employeeId,
      leave_application_id: leaveApplicationId,
      type,
      title,
      message,
    });
    if (error) console.error("Failed to create notification:", error);
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch { setCurrentUser(null); }
    }
  }, []);

  // Fetch Data
  useEffect(() => {
    async function fetchPlans() {
      const { data, error } = await supabase.from("leave_plans").select("*").eq("is_active", true).order("name");
      if (!error && data) setLeavePlans(data);
    }
    fetchPlans();
  }, []);

  useEffect(() => {
    async function fetchApplications() {
      setLoadingApplications(true);
      const { data, error } = await supabase
        .from("leave_applications")
        .select(`*, employees (full_name, department), leave_plans (name)`)
        .order("applied_at", { ascending: false });
      if (!error && data) setLeaveApplications(data);
      setLoadingApplications(false);
    }
    fetchApplications();
  }, []);

  useEffect(() => {
    async function fetchOngoingLeaves() {
      setLoadingOngoing(true);
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("leave_applications")
        .select(`*, employees (full_name, department), leave_plans (name, allow_recall)`)
        .eq("status", "approved")
        .lte("start_date", today)
        .gte("end_date", today)
        .order("start_date", { ascending: false });

      if (!error && data) {
        const recallableLeaves = data.filter((leave) => leave.leave_plans?.allow_recall === true);
        setOngoingLeaves(recallableLeaves);
      }
      setLoadingOngoing(false);
    }
    fetchOngoingLeaves();
  }, []);

  // Actions (Create, Edit, Delete, Approve, Recall) - Logic kept intact
  async function handleCreateLeaveSetting(e) {
    e.preventDefault();
    if (!leavePlanName || !durationDays) return alert("Please fill in Leave Plan Name and Duration");

    const payload = {
      name: leavePlanName,
      duration_days: Number(durationDays),
      is_active: true,
      allow_recall: allowRecall === "Yes",
    };

    const { data, error } = await supabase.from("leave_plans").insert(payload).select("*").single();
    if (error) {
       console.error(error); alert("Failed to create leave plan");
    } else if (data) {
      setLeavePlans((prev) => [...prev, data]);
      setLeavePlanName(""); setDurationDays(""); setAllowRecall(""); setRecallReason("");
      alert("Leave plan created!");
    }
  }

  async function handleApproveLeave(applicationId) {
    if (!confirm("Approve this leave application?")) return;
    const { data: appRow } = await supabase.from("leave_applications").select(`id, employee_id, start_date, end_date, leave_plans (name), employees (full_name)`).eq("id", applicationId).single();
    const { error } = await supabase.from("leave_applications").update({ status: "approved", reviewed_at: new Date().toISOString(), reviewed_by: currentUser?.uid }).eq("id", applicationId);
    
    if (!error) {
      await createLeaveNotification({
        employeeId: appRow.employee_id, leaveApplicationId: appRow.id, type: "leave_approved", title: "Leave approved",
        message: `Your ${appRow.leave_plans?.name || "leave"} request was approved.`
      });
      setLeaveApplications((prev) => prev.map((app) => app.id === applicationId ? { ...app, status: "approved" } : app));
    }
  }

  async function handleRejectLeave(applicationId) {
    if (!confirm("Reject this leave application?")) return;
    const { data: appRow } = await supabase.from("leave_applications").select(`id, employee_id, leave_plans (name)`).eq("id", applicationId).single();
    const { error } = await supabase.from("leave_applications").update({ status: "rejected", reviewed_at: new Date().toISOString(), reviewed_by: currentUser?.uid }).eq("id", applicationId);
    
    if (!error) {
      await createLeaveNotification({
        employeeId: appRow.employee_id, leaveApplicationId: appRow.id, type: "leave_declined", title: "Leave declined",
        message: `Your ${appRow.leave_plans?.name || "leave"} request was declined.`
      });
      setLeaveApplications((prev) => prev.map((app) => app.id === applicationId ? { ...app, status: "rejected" } : app));
    }
  }

  // Edit/Recall helpers
  function handleStartEdit(plan) {
    setEditingPlan(plan); setEditName(plan.name); setEditDuration(plan.duration_days); setEditAllowRecall(plan.allow_recall ? "Yes" : "No"); setOpenDropdown(null);
  }
  async function handleSaveEdit(e) {
    e.preventDefault();
    const { error } = await supabase.from("leave_plans").update({ name: editName, duration_days: Number(editDuration), allow_recall: editAllowRecall === "Yes" }).eq("id", editingPlan.id);
    if (!error) {
      setLeavePlans(prev => prev.map(p => p.id === editingPlan.id ? { ...p, name: editName, duration_days: Number(editDuration), allow_recall: editAllowRecall === "Yes" } : p));
      setEditingPlan(null);
    }
  }
  async function handleDeleteLeavePlan(planId) {
    if (!confirm("Delete this plan?")) return;
    const { error } = await supabase.from("leave_plans").update({ is_active: false }).eq("id", planId);
    if (!error) setLeavePlans(prev => prev.filter(p => p.id !== planId));
  }

  function handleOpenRecallModal(leave) {
    setSelectedRecallLeave(leave); setRecallDepartment(leave.employees?.department || ""); setShowRecallModal(true);
  }
  async function handleSubmitRecall(e) {
    e.preventDefault();
    if (!recallNewResumptionDate) return alert("Select date");
    setSubmittingRecall(true);
    const { error } = await supabase.from("leave_applications").update({ status: "recalled", reviewed_at: new Date().toISOString() }).eq("id", selectedRecallLeave.id);
    setSubmittingRecall(false);
    if (!error) {
       await createLeaveNotification({
         employeeId: selectedRecallLeave.employee_id, leaveApplicationId: selectedRecallLeave.id, type: "leave_recalled", title: "Leave recalled",
         message: `Please resume on ${recallNewResumptionDate}.`
       });
       setOngoingLeaves(prev => prev.filter(l => l.id !== selectedRecallLeave.id));
       setShowRecallModal(false);
    }
  }

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

      <main className={`flex-1 flex flex-col transition-all duration-300 ${isOpen ? "lg:ml-0" : ""}`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsOpen((s) => !s)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">Leave Management</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Manage employee time-off and policies</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="hidden md:block text-xs text-gray-400 font-medium">Last updated: {currentTime}</span>
             <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>
             <AdminBell />
             <AdminSetting trigger={<button className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200 flex items-center justify-center"><Settings size={20}/></button>}>
               {({ close }) => <FontSizeMenu closeMenu={close} />}
             </AdminSetting>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          
          {/* Tabs Navigation */}
          <div className="flex justify-center mb-2">
             <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm inline-flex">
               {['history', 'recall', 'settings'].map((tab) => (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   className={`px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                     activeTab === tab 
                     ? 'bg-green-700 text-white shadow-md' 
                     : 'text-gray-500 hover:bg-gray-50 hover:text-green-700'
                   }`}
                 >
                   {tab === 'history' ? 'Leave History' : tab === 'recall' ? 'Leave Recall' : 'Settings'}
                 </button>
               ))}
             </div>
          </div>

          {/* CONTENT PANELS */}

          {/* 1. Leave History Panel */}
          {activeTab === 'history' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                   <h3 className="font-bold text-gray-800 flex items-center gap-2">
                     <Calendar size={18} className="text-green-600"/> All Applications
                   </h3>
                   <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-500">{leaveApplications.length} records</span>
                </div>
                
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                           <th className="p-5">Employee</th>
                           <th className="p-5">Dates</th>
                           <th className="p-5">Type & Reason</th>
                           <th className="p-5">Status</th>
                           <th className="p-5 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {loadingApplications ? (
                           <tr><td colSpan="5" className="p-8 text-center text-gray-400">Loading history...</td></tr>
                        ) : leaveApplications.length === 0 ? (
                           <tr><td colSpan="5" className="p-8 text-center text-gray-400">No leave applications found.</td></tr>
                        ) : (
                           leaveApplications.map((app) => (
                             <tr key={app.id} className="hover:bg-gray-50/80 transition-colors">
                               <td className="p-5">
                                  <div className="font-bold text-gray-800 text-sm">{app.employees?.full_name || 'Unknown'}</div>
                                  <div className="text-xs text-gray-400">{app.employees?.department}</div>
                               </td>
                               <td className="p-5 text-sm text-gray-600">
                                  <div className="font-medium text-gray-800">{new Date(app.start_date).toLocaleDateString()}</div>
                                  <div className="text-xs">to {new Date(app.end_date).toLocaleDateString()}</div>
                               </td>
                               <td className="p-5 max-w-xs">
                                  <div className="text-xs font-bold text-green-700 uppercase mb-0.5">{app.leave_plans?.name}</div>
                                  <div className="text-xs text-gray-500 truncate" title={app.reason}>{app.reason}</div>
                               </td>
                               <td className="p-5">
                                 <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold capitalize ${
                                   app.status === 'approved' ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' :
                                   app.status === 'rejected' ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20' :
                                   app.status === 'recalled' ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20' :
                                   'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20'
                                 }`}>
                                   <span className={`w-1.5 h-1.5 rounded-full ${
                                      app.status === 'approved' ? 'bg-green-600' :
                                      app.status === 'rejected' ? 'bg-red-600' :
                                      'bg-yellow-500'
                                   }`}></span>
                                   {app.status}
                                 </span>
                               </td>
                               <td className="p-5 text-right">
                                  {app.status === 'pending' && (
                                     <ActionDropdown 
                                        onApprove={() => handleApproveLeave(app.id)}
                                        onReject={() => handleRejectLeave(app.id)}
                                        attachmentUrl={app.attachment_url}
                                     />
                                  )}
                                  {app.status !== 'pending' && app.attachment_url && (
                                     <a href={app.attachment_url} target="_blank" className="text-blue-500 hover:underline text-xs flex items-center justify-end gap-1">
                                        <Paperclip size={12}/> View File
                                     </a>
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

          {/* 2. Leave Settings Panel */}
          {activeTab === 'settings' && (
             <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Create Form */}
                <div className="lg:col-span-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-6 h-fit">
                   <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                     <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><Briefcase size={16}/></div>
                     New Leave Type
                   </h3>
                   <form onSubmit={handleCreateLeaveSetting} className="space-y-4">
                      <label className="block text-sm">
                         <span className="text-gray-500 font-bold text-xs uppercase">Plan Name</span>
                         <select value={leavePlanName} onChange={e => setLeavePlanName(e.target.value)} className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                            <option value="">Select...</option>
                            <option value="Annual Leave">Annual Leave</option>
                            <option value="Sick Leave">Sick Leave</option>
                            <option value="Maternity Leave">Maternity Leave</option>
                            <option value="Casual Leave">Casual Leave</option>
                         </select>
                      </label>
                      <label className="block text-sm">
                         <span className="text-gray-500 font-bold text-xs uppercase">Duration (Days)</span>
                         <input type="number" value={durationDays} onChange={e => setDurationDays(e.target.value)} className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"/>
                      </label>
                      <label className="block text-sm">
                         <span className="text-gray-500 font-bold text-xs uppercase">Allow Recall?</span>
                         <select value={allowRecall} onChange={e => setAllowRecall(e.target.value)} className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none">
                            <option value="">Select...</option>
                            <option value="Yes">Yes</option>
                            <option value="No">No</option>
                         </select>
                      </label>
                      <button type="submit" className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-2.5 rounded-lg transition-all shadow-lg shadow-green-100 mt-2">
                         Create Plan
                      </button>
                   </form>
                </div>

                {/* List / Edit Table */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                   <div className="p-5 border-b border-gray-100">
                      <h3 className="font-bold text-gray-800">Existing Leave Plans</h3>
                   </div>
                   
                   {/* Edit Mode Banner */}
                   {editingPlan && (
                      <div className="p-4 bg-yellow-50 border-b border-yellow-100 flex items-center gap-4 animate-in slide-in-from-top-2">
                         <div className="flex-1 grid grid-cols-3 gap-3">
                            <input value={editName} onChange={e=>setEditName(e.target.value)} className="p-2 text-sm rounded border border-yellow-200" placeholder="Name" />
                            <input value={editDuration} onChange={e=>setEditDuration(e.target.value)} className="p-2 text-sm rounded border border-yellow-200" type="number" placeholder="Days" />
                            <select value={editAllowRecall} onChange={e=>setEditAllowRecall(e.target.value)} className="p-2 text-sm rounded border border-yellow-200"><option value="Yes">Recall: Yes</option><option value="No">Recall: No</option></select>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-green-700 text-white text-xs font-bold rounded">Save</button>
                            <button onClick={() => setEditingPlan(null)} className="px-3 py-1.5 bg-white border border-gray-300 text-xs font-bold rounded">Cancel</button>
                         </div>
                      </div>
                   )}

                   <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                         <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                            <tr><th className="p-4">Plan Name</th><th className="p-4">Duration</th><th className="p-4">Recallable</th><th className="p-4 text-right">Actions</th></tr>
                         </thead>
                         <tbody className="divide-y divide-gray-50">
                            {leavePlans.map(plan => (
                               <tr key={plan.id} className="hover:bg-gray-50">
                                  <td className="p-4 font-medium text-gray-800">{plan.name}</td>
                                  <td className="p-4 text-gray-600">{plan.duration_days} days</td>
                                  <td className="p-4">
                                     <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${plan.allow_recall ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                                       {plan.allow_recall ? 'Yes' : 'No'}
                                     </span>
                                  </td>
                                  <td className="p-4 text-right relative">
                                     <button onClick={() => setOpenDropdown(openDropdown === plan.id ? null : plan.id)} className="text-gray-400 hover:text-green-700"><Settings size={16}/></button>
                                     {openDropdown === plan.id && (
                                        <div className="absolute right-8 top-2 bg-white shadow-xl border border-gray-100 rounded-lg overflow-hidden z-20 w-32">
                                           <button onClick={() => handleStartEdit(plan)} className="block w-full text-left px-4 py-2 hover:bg-gray-50 text-xs">Edit</button>
                                           <button onClick={() => handleDeleteLeavePlan(plan.id)} className="block w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 text-xs">Delete</button>
                                        </div>
                                     )}
                                  </td>
                               </tr>
                            ))}
                         </tbody>
                      </table>
                   </div>
                </div>
             </div>
          )}

          {/* 3. Leave Recall Panel */}
          {activeTab === 'recall' && (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100">
                   <h3 className="font-bold text-gray-800 flex items-center gap-2">
                     <AlertCircle size={18} className="text-orange-500"/> Ongoing Recallable Leaves
                   </h3>
                </div>
                <div className="overflow-x-auto">
                   <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                           <th className="p-5">Employee</th>
                           <th className="p-5">Date Range</th>
                           <th className="p-5">Reason</th>
                           <th className="p-5 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loadingOngoing ? (
                           <tr><td colSpan="4" className="p-8 text-center text-gray-400">Loading...</td></tr>
                        ) : ongoingLeaves.length === 0 ? (
                           <tr><td colSpan="4" className="p-8 text-center text-gray-400">No recallable leaves currently active.</td></tr>
                        ) : (
                           ongoingLeaves.map(leave => (
                              <tr key={leave.id} className="hover:bg-gray-50 transition">
                                 <td className="p-5">
                                    <div className="font-bold text-gray-800 text-sm">{leave.employees?.full_name}</div>
                                    <div className="text-xs text-gray-400">{leave.employees?.department}</div>
                                 </td>
                                 <td className="p-5 text-sm">
                                    <div className="flex items-center gap-2 text-gray-600"><Calendar size={14}/> {leave.start_date} → {leave.end_date}</div>
                                 </td>
                                 <td className="p-5 text-sm text-gray-600 italic">"{leave.reason}"</td>
                                 <td className="p-5 text-right">
                                    <button onClick={() => handleOpenRecallModal(leave)} className="px-4 py-1.5 bg-orange-600 text-white text-xs font-bold rounded-full hover:bg-orange-700 shadow-sm transition">
                                       Recall Now
                                    </button>
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

        {/* Recall Modal */}
        {showRecallModal && selectedRecallLeave && (
           <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md p-6">
                 <h2 className="text-lg font-bold text-gray-900 mb-1">Confirm Recall</h2>
                 <p className="text-sm text-gray-500 mb-4">Request <span className="font-bold text-gray-800">{selectedRecallLeave.employees?.full_name}</span> to return early.</p>
                 
                 <form onSubmit={handleSubmitRecall} className="space-y-4">
                    <label className="block text-sm">
                       <span className="font-bold text-gray-500 text-xs uppercase">New Resumption Date</span>
                       <input type="date" value={recallNewResumptionDate} onChange={e => setRecallNewResumptionDate(e.target.value)} className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"/>
                    </label>
                    <label className="block text-sm">
                       <span className="font-bold text-gray-500 text-xs uppercase">Reason for Recall</span>
                       <textarea rows="2" value={recallReasonText} onChange={e => setRecallReasonText(e.target.value)} className="w-full mt-1 p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none" placeholder="e.g. Emergency project meeting..."></textarea>
                    </label>
                    <div className="flex gap-3 pt-2">
                       <button type="submit" disabled={submittingRecall} className="flex-1 bg-orange-600 text-white font-bold py-2.5 rounded-lg hover:bg-orange-700 transition shadow-lg shadow-orange-100">
                          {submittingRecall ? 'Processing...' : 'Confirm Recall'}
                       </button>
                       <button type="button" onClick={() => setShowRecallModal(false)} className="flex-1 bg-gray-100 text-gray-600 font-bold py-2.5 rounded-lg hover:bg-gray-200 transition">Cancel</button>
                    </div>
                 </form>
              </div>
           </div>
        )}
      </main>
    </div>
  );
}
