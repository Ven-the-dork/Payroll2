import { useState, useRef, useEffect } from "react";
import {
  Mail,
  Users,
  CalendarDays,
  Menu,
  Search,
  Settings,
  ChevronDown,
  UserPlus,
  Filter,
  Briefcase,
  UserX  // ← Add this
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import { logAudit } from "../utils/auditLog";
import AdminBell from "../components/AdminBell";
import AdminSidebar from "../components/Adminnavbar/Employeesidebar";
import FontSizeMenu from "../components/hooks/FontSizeMenu";
import AdminSetting from "../components/Adminsetting";

// --- REUSABLE DROPDOWN COMPONENT ---
function ActionDropdown({ onViewProfile, onDelete }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleDocClick(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => {
      document.removeEventListener("mousedown", handleDocClick);
    };
  }, []);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2 rounded-lg bg-gray-50 border border-gray-200 px-3 py-1.5 text-xs sm:text-sm font-medium text-gray-700 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all"
      >
        Actions
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-xl bg-white shadow-xl border border-gray-100 z-50 overflow-hidden ring-1 ring-black/5">
          <button
            onClick={() => {
              setOpen(false);
              onViewProfile();
            }}
            className="block w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-green-50 hover:text-green-700 transition-colors cursor-pointer"
          >
            View Profile
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="block w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------- Main component ---------- */

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmployeeError, setAddEmployeeError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

  // Password confirmation states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [passwordError, setPasswordError] = useState("");
  const [verifyingPassword, setVerifyingPassword] = useState(false);

  const sections = [
    "Personal Details",
    "Contact Details",
    "Next of Kin Details",
    "Education Qualifications",
    "Guarantor Details",
    "Family Details",
    "Job Details",
    "Financial Details",
  ];
  const [activeSection, setActiveSection] = useState(sections[0]);

  const handleLogout = async () => {
    try {
      await logAudit({
        action: "admin_logout",
        details: `Admin logged out: ${currentUser?.fullName} (${currentUser?.position}, ${currentUser?.department})`,
        currentUser: currentUser,
      });
    } catch (error) {
      console.error("Error logging logout:", error);
    }

    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  // New employee form state
  const [newEmployee, setNewEmployee] = useState({
    name: "",
    department: "",
    position: "",
    startDate: "",
    category: "",
    gender: "",
    email: "",
    password: "",
    role: "user",
  });

  const handleNewEmployeeChange = (e) => {
    const { name, value } = e.target;
    setNewEmployee((prev) => ({ ...prev, [name]: value }));
  };

  const [employeeData, setEmployeeData] = useState([]);
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [employeesError, setEmployeesError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortField, setSortField] = useState("full_name");
  const [sortDirection, setSortDirection] = useState("asc");

  // Fetch employees excluding admins
  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      setEmployeesError("");

      let query = supabase
        .from("employees")
        .select("*")
        .neq("role", "admin")
        .order(sortField, { ascending: sortDirection === "asc" });

      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(
          `full_name.ilike.${term},department.ilike.${term},position.ilike.${term}`
        );
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error:", error);
        setEmployeesError("Failed to load employees. Please try again.");
      } else {
        setEmployeeData(
          data.map((row) => {
            const lastSeen = row.last_seen ? new Date(row.last_seen) : null;
            const isRecent =
              lastSeen && Date.now() - lastSeen.getTime() < 30000;
            return {
              id: row.id,
              firebaseUid: row.firebase_uid,
              name: row.full_name || "Unknown",
              email: row.email || "",
              department: row.department || "N/A",
              position: row.position || "N/A",
              startDate: row.start_date || "N/A",
              category: row.category || "N/A",
              gender: row.gender || "N/A",
              status: isRecent ? "Active" : "Inactive",
              contact: row.contact || "",
              address: row.address || "",
              profile_image_url: row.profile_image_url || "",
            };
          })
        );
      }
      setLoadingEmployees(false);
    };

    fetchEmployees();
  }, [searchTerm, sortField, sortDirection]);

  const openProfile = (emp) => {
    setSelectedEmployee(emp);
    setActiveSection(sections[0]);
    setProfileOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const closeProfile = () => {
    setProfileOpen(false);
    setSelectedEmployee(null);
  };

  const handleAddEmployee = async (e) => {
    e.preventDefault();
    setAddEmployeeError("");

    const {
      name,
      department,
      position,
      startDate,
      category,
      gender,
      email,
      password,
      role,
    } = newEmployee;

    if (
      !name.trim() ||
      !department.trim() ||
      !position.trim() ||
      !startDate.trim() ||
      !category.trim() ||
      !gender.trim() ||
      !email.trim() ||
      !password.trim()
    ) {
      setAddEmployeeError("Please fill in all required fields before submitting.");
      return;
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = cred.user;

      const { error } = await supabase.from("employees").insert({
        firebase_uid: firebaseUser.uid,
        email: firebaseUser.email,
        full_name: name,
        department,
        position,
        start_date: startDate,
        category,
        gender,
        status: "Active",
        role,
        clockify_user_id: "69399acc2d8d3a36ae5cfa9b",
      });

      if (error) {
        console.error("SUPABASE ERROR:", error.message, error.details, error.hint);
        setAddEmployeeError("Failed to save employee in Supabase.");
        return;
      }

      await logAudit({
        action: "created_employee",
        details: `Created new employee: ${name} (${position}, ${department})`,
        currentUser: currentUser,
      });

      setNewEmployee({
        name: "",
        department: "",
        position: "",
        startDate: "",
        category: "",
        gender: "",
        email: "",
        password: "",
        role: "user",
      });
      setShowAddForm(false);

      // Refresh list
      let query = supabase
        .from("employees")
        .select("*")
        .neq("role", "admin")
        .order(sortField, { ascending: sortDirection === "asc" });

      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(
          `full_name.ilike.${term},department.ilike.${term},position.ilike.${term}`
        );
      }
      
      const { data: latest, error: fetchError } = await query;
      if (!fetchError && latest) {
        // ... (mapping logic same as above)
         const mapped = latest.map((row) => {
          const lastSeen = row.last_seen ? new Date(row.last_seen) : null;
          const isRecent =
            lastSeen && Date.now() - lastSeen.getTime() < 30000;
          return {
            id: row.id,
            firebaseUid: row.firebase_uid,
            name: row.full_name,
            email: row.email || "",
            department: row.department,
            position: row.position,
            startDate: row.start_date,
            category: row.category,
            gender: row.gender,
            status: isRecent ? "Active" : "Inactive",
            contact: row.contact || "",
            address: row.address || "",
            profile_image_url: row.profile_image_url || "",
          };
        });
        setEmployeeData(mapped);
      }
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        setAddEmployeeError("This email is already in use. Please use another email.");
      } else {
        setAddEmployeeError("Failed to create employee account. Please try again.");
      }
    }
  };

  const handleDeleteEmployee = (emp) => {
    setEmployeeToDelete(emp);
    setShowPasswordModal(true);
    setPasswordInput("");
    setPasswordError("");
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!passwordInput) {
      setPasswordError("Please enter your password");
      return;
    }
    if (!currentUser?.email) {
      setPasswordError("User session not found. Please log in again.");
      return;
    }

    setVerifyingPassword(true);
    setPasswordError("");

    try {
      await signInWithEmailAndPassword(auth, currentUser.email, passwordInput);
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", employeeToDelete.id);

      if (error) {
        setPasswordError("Failed to delete employee. Please try again.");
        setVerifyingPassword(false);
        return;
      }

      setEmployeeData((prev) => prev.filter((e) => e.id !== employeeToDelete.id));
      
      await logAudit({
        action: "deleted_employee",
        details: `Deleted employee: ${employeeToDelete.name}`,
        currentUser: currentUser,
      });

      setShowPasswordModal(false);
      setEmployeeToDelete(null);
      setPasswordInput("");
      alert(`Employee ${employeeToDelete.name} deleted successfully!`);
    } catch (error) {
       if (error.code === "auth/wrong-password" || error.code === "auth/invalid-credential") {
        setPasswordError("Incorrect password. Please try again.");
      } else {
        setPasswordError("Authentication failed. Please try again.");
      }
    } finally {
      setVerifyingPassword(false);
    }
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(false);
    setEmployeeToDelete(null);
    setPasswordInput("");
    setPasswordError("");
  };

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

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const activeCount = employeeData.filter(e => e.status === "Active").length;
  const totalCount = employeeData.length;

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans text-gray-800">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={isOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={(path) => navigate(path)}
      />

      <main 
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isOpen ? "lg:ml-0" : ""
        }`}
      >
        {/* Top Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsOpen((s) => !s)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">
                Employee Directory
              </h1>
              <p className="text-xs text-gray-500 hidden sm:block">
                Manage your team members and roles
              </p>
            </div>
          </div>
           <div className="flex items-center gap-3">
             <span className="hidden md:block text-xs text-gray-400 font-medium">
               Last updated: {currentTime}
             </span>
             <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>
             <AdminBell />
             <AdminSetting
               trigger={
                 <button className="flex items-center justify-center w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200 transition-all">
                   <Settings size={20} />
                 </button>
               }
             >
               {({ close }) => <FontSizeMenu closeMenu={close} />}
             </AdminSetting>
           </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* 1. Quick Stats Cards - FIXED */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Employees Card */}
            <div className="bg-green-600 rounded-2xl p-6 text-white shadow-lg shadow-green-100 relative overflow-hidden group">
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-white/20 rounded-lg backdrop-blur-md">
                        <Users size={22} />
                      </div>
                  </div>
                  <div>
                      <div className="text-3xl font-extrabold mb-1 tracking-tight">{totalCount}</div>
                      <p className="text-sm font-bold opacity-90 uppercase tracking-wide">Total Employees</p>
                  </div>
                </div>
                <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:bg-white/20 transition-all duration-500"></div>
            </div>

            {/* Active Now Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-yellow-50 rounded-lg">
                        <Briefcase size={22} className="text-yellow-600" />
                      </div>
                  </div>
                  <div>
                      <div className="text-3xl font-extrabold text-gray-800 mb-1 tracking-tight">{activeCount}</div>
                      <p className="text-gray-500 text-sm font-bold uppercase tracking-wide">Active Now</p>
                  </div>
                </div>
            </div>

            {/* Inactive Card */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden group">
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-2">
                      <div className="p-2 bg-gray-50 rounded-lg">
                        <UserX size={22} className="text-gray-600" />
                      </div>
                  </div>
                  <div>
                      <div className="text-3xl font-extrabold text-gray-800 mb-1 tracking-tight">
                        {employeeData.filter(e => e.status === 'Inactive').length}
                      </div>
                      <p className="text-gray-500 text-sm font-bold uppercase tracking-wide">Inactive / Offline</p>
                  </div>
                </div>
            </div>
          </div>


          {/* 2. Main List Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            
            {/* Toolbar */}
            <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
               {/* Search */}
               <div className="relative w-full md:max-w-md">
                 <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                 <input
                   type="text"
                   placeholder="Search employees by name, dept..."
                   value={searchTerm}
                   onChange={(e) => setSearchTerm(e.target.value)}
                   className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:bg-white transition-all"
                 />
               </div>

               {/* Actions */}
               <div className="flex items-center gap-3">
                  <div className="flex bg-gray-50 p-1 rounded-lg border border-gray-200">
                     <button
                       onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                       className="p-2 hover:bg-white hover:shadow-sm rounded-md transition-all text-gray-600"
                       title="Sort Order"
                     >
                       <Filter size={18} />
                     </button>
                  </div>
                  <button
                    onClick={() => setShowAddForm(v => !v)}
                    className="flex items-center gap-2 bg-green-700 hover:bg-green-800 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all shadow-md shadow-green-100"
                  >
                    <UserPlus size={18} />
                    <span>Add Employee</span>
                  </button>
               </div>
            </div>

            {/* Add Employee Form Drawer */}
            <div className={`overflow-hidden transition-all duration-500 ease-in-out bg-yellow-50/50 ${showAddForm ? "max-h-[1200px] border-b border-yellow-100" : "max-h-0"}`}>
               {showAddForm && (
                  <div className="p-6">
                    <h3 className="mb-4 text-lg font-bold text-green-900 flex items-center gap-2">
                       <span className="w-1 h-6 bg-yellow-400 rounded-full block"></span>
                       New Employee Details
                    </h3>
                    <form onSubmit={handleAddEmployee} className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                         {/* Form Inputs with cleaner styling */}
                         {["name", "department", "position", "email", "password"].map((field) => (
                           <label key={field} className="space-y-1.5">
                              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">{field}</span>
                              <input
                                type={field === "password" ? "password" : field === "email" ? "email" : "text"}
                                name={field}
                                value={newEmployee[field]}
                                onChange={handleNewEmployeeChange}
                                className="w-full rounded-lg border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none"
                              />
                           </label>
                         ))}
                         
                         <label className="space-y-1.5">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Start Date</span>
                            <input type="date" name="startDate" value={newEmployee.startDate} onChange={handleNewEmployeeChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm focus:ring-2 focus:ring-green-500" />
                         </label>

                         {/* Selects */}
                         <label className="space-y-1.5">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Category</span>
                            <select name="category" value={newEmployee.category} onChange={handleNewEmployeeChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white focus:ring-2 focus:ring-green-500">
                               <option value="">Select...</option>
                               <option value="Full time">Full time</option>
                               <option value="Part time">Part time</option>
                            </select>
                         </label>
                         <label className="space-y-1.5">
                            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Gender</span>
                            <select name="gender" value={newEmployee.gender} onChange={handleNewEmployeeChange} className="w-full rounded-lg border border-gray-200 p-2.5 text-sm bg-white focus:ring-2 focus:ring-green-500">
                               <option value="">Select...</option>
                               <option value="Male">Male</option>
                               <option value="Female">Female</option>
                            </select>
                         </label>
                      </div>
                      
                      <div className="pt-2 flex gap-3">
                         <button type="submit" className="px-6 py-2.5 bg-green-700 text-white font-bold rounded-lg hover:bg-green-800 transition shadow-sm">
                            Create Account
                         </button>
                         <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-2.5 bg-white text-gray-600 font-bold rounded-lg border border-gray-200 hover:bg-gray-50 transition">
                            Cancel
                         </button>
                      </div>
                      {addEmployeeError && <p className="text-sm text-red-600 font-medium bg-red-50 p-3 rounded-lg border border-red-100">{addEmployeeError}</p>}
                    </form>
                  </div>
               )}
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50/50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                    <th className="p-5">Employee</th>
                    <th className="p-5">Role & Dept</th>
                    <th className="p-5">Category</th>
                    <th className="p-5">Status</th>
                    <th className="p-5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loadingEmployees ? (
                     <tr><td colSpan="5" className="p-8 text-center text-gray-400">Loading...</td></tr>
                  ) : (
                    employeeData.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50/80 transition-colors group">
                        <td className="p-5">
                           <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-bold text-sm">
                                 {emp.profile_image_url ? <img src={emp.profile_image_url} className="w-full h-full rounded-full object-cover" /> : emp.name.charAt(0)}
                              </div>
                              <div>
                                 <div className="font-bold text-gray-800 text-sm">{emp.name}</div>
                                 <div className="text-xs text-gray-400">{emp.email}</div>
                              </div>
                           </div>
                        </td>
                        <td className="p-5">
                           <div className="text-sm font-medium text-gray-700">{emp.position}</div>
                           <div className="text-xs text-gray-400">{emp.department}</div>
                        </td>
                        <td className="p-5">
                           <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-600">
                             {emp.category}
                           </span>
                        </td>
                        <td className="p-5">
                           <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                              emp.status === 'Active' 
                               ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' 
                               : 'bg-red-50 text-red-700 ring-1 ring-red-600/20'
                           }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${emp.status === 'Active' ? 'bg-green-600' : 'bg-red-600'}`}></span>
                              {emp.status}
                           </span>
                        </td>
                        <td className="p-5 text-right">
                           <ActionDropdown
                              onViewProfile={() => openProfile(emp)}
                              onDelete={() => handleDeleteEmployee(emp)}
                           />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              {!loadingEmployees && employeeData.length === 0 && (
                 <div className="p-12 text-center text-gray-400 text-sm">No employees found.</div>
              )}
            </div>
          </div>
        </div>

        {/* MODALS (Password & Profile) - Kept largely same logic, just styled wrapper if needed */}
        {showPasswordModal && employeeToDelete && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md border border-gray-100">
                <h2 className="text-lg font-bold text-gray-800 mb-2">Confirm Deletion</h2>
                <p className="text-sm text-gray-600 mb-4">Are you sure you want to remove <span className="font-bold text-gray-900">{employeeToDelete.name}</span>? This action is permanent.</p>
                
                <form onSubmit={handleConfirmDelete} className="space-y-4">
                   <input
                     type="password"
                     value={passwordInput}
                     onChange={(e) => setPasswordInput(e.target.value)}
                     placeholder="Enter admin password"
                     className="w-full p-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-red-500 outline-none"
                   />
                   {passwordError && <p className="text-xs text-red-600 font-bold">{passwordError}</p>}
                   <div className="flex gap-3">
                      <button type="submit" disabled={verifyingPassword} className="flex-1 bg-red-600 text-white py-2.5 rounded-xl font-bold text-sm hover:bg-red-700 transition">
                         {verifyingPassword ? "Verifying..." : "Delete"}
                      </button>
                      <button type="button" onClick={handleClosePasswordModal} className="flex-1 bg-gray-100 text-gray-700 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition">
                         Cancel
                      </button>
                   </div>
                </form>
             </div>
          </div>
        )}

        {/* Profile Modal - Using your existing component logic, just ensure it renders */}
        {profileOpen && selectedEmployee && (
            <EmployeeProfileModal employee={selectedEmployee} onClose={closeProfile} />
        )}
      </main>
    </div>
  );
}

// Minimal styling update for Profile Modal to match
function EmployeeProfileModal({ employee, onClose }) {
  const { name, email, department, position, contact, address, profile_image_url, status, category, gender, startDate } = employee;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden relative animate-in fade-in zoom-in duration-200" onClick={e => e.stopPropagation()}>
         <div className="h-32 bg-gradient-to-r from-green-600 to-green-400 relative">
            <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/40 text-white p-2 rounded-full transition"><ChevronDown size={20} /></button>
         </div>
         <div className="px-8 pb-8 relative">
            <div className="-mt-16 mb-4 flex justify-between items-end">
               <div className="w-24 h-24 rounded-2xl bg-white p-1 shadow-lg">
                  <div className="w-full h-full rounded-xl bg-gray-100 overflow-hidden">
                     {profile_image_url ? <img src={profile_image_url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-2xl">👤</div>}
                  </div>
               </div>
               <span className={`px-3 py-1 rounded-full text-xs font-bold mb-2 ${status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{status}</span>
            </div>
            
            <h2 className="text-2xl font-bold text-gray-900">{name}</h2>
            <p className="text-gray-500 font-medium">{position} • {department}</p>

            <div className="mt-6 space-y-4">
               <div className="p-4 bg-gray-50 rounded-xl space-y-3 border border-gray-100">
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                     <Mail size={16} className="text-gray-400" /> {email}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-gray-700">
                     <CalendarDays size={16} className="text-gray-400" /> Joined {startDate}
                  </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl border border-gray-100">
                     <div className="text-xs text-gray-400 font-bold uppercase">Category</div>
                     <div className="font-medium text-gray-800">{category}</div>
                  </div>
                   <div className="p-4 rounded-xl border border-gray-100">
                     <div className="text-xs text-gray-400 font-bold uppercase">Gender</div>
                     <div className="font-medium text-gray-800">{gender}</div>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}
