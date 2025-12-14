import { useState, useRef, useEffect } from "react";
import {
  LayoutDashboard,
  Mail,
  Users,
  CalendarDays,
  CreditCard,
  Power,
  Menu,
  Search,
  Settings,
  ChevronDown,
  FileText,
  Clock, 
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
        className="inline-flex items-center gap-2 rounded-full bg-green-700 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm cursor-pointer hover:bg-green-800 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 transition-all"
      >
        Actions
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 rounded-md bg-white shadow-lg border border-yellow-200 z-40 overflow-hidden">
          <button
            onClick={() => {
              setOpen(false);
              onViewProfile();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-green-900 hover:bg-yellow-50 cursor-pointer"
          >
            View Profile
          </button>
          <button
            onClick={() => {
              setOpen(false);
              onDelete();
            }}
            className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
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

  const sidebarWidth = isOpen ? "lg:w-64" : "lg:w-20";
  const hideWhenCollapsed = !isOpen && "hidden lg:block";

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
      console.error("Firebase error:", error.code, error.message);
    }
  };

  // Delete handler - opens password modal
  const handleDeleteEmployee = (emp) => {
    setEmployeeToDelete(emp);
    setShowPasswordModal(true);
    setPasswordInput("");
    setPasswordError("");
  };

  // Verify password and delete employee
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
        console.error("Error deleting employee", error.message);
        setPasswordError("Failed to delete employee. Please try again.");
        setVerifyingPassword(false);
        return;
      }

      setEmployeeData((prev) =>
        prev.filter((e) => e.id !== employeeToDelete.id)
      );

      await logAudit({
        action: "deleted_employee",
        details: `Deleted employee: ${employeeToDelete.name} (${employeeToDelete.position}, ${employeeToDelete.department})`,
        currentUser: currentUser,
      });

      setShowPasswordModal(false);
      setEmployeeToDelete(null);
      setPasswordInput("");
      alert(`Employee ${employeeToDelete.name} deleted successfully!`);
    } catch (error) {
      console.error("Password verification error:", error);

      if (
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential"
      ) {
        setPasswordError("Incorrect password. Please try again.");
      } else if (error.code === "auth/too-many-requests") {
        setPasswordError("Too many failed attempts. Please try again later.");
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

  // Load current user from sessionStorage
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={isOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={(path) => navigate(path)}
      />
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden bg-white">
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <button
            onClick={() => setIsOpen((s) => !s)}
            className="self-start text-green-700 cursor-pointer hover:text-yellow-400 transition"
          >
            <Menu size={28} />
          </button>

          {/* Search */}
          <div className="flex-1 flex flex-col items-center md:items-center">
            <div className="w-full md:max-w-xl relative mb-2">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border-2 border-yellow-300 px-4 pr-10 py-2 text-sm md:text-base text-green-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <Search
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 cursor-pointer"
              />
            </div>

            {/* Sort toolbar */}
            <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
              <button
                onClick={() => setSortField("full_name")}
                className={`px-3 py-1.5 rounded-full border text-xs sm:text-sm transition ${
                  sortField === "full_name"
                    ? "bg-green-700 border-green-700 text-white"
                    : "bg-white border-yellow-300 text-green-800 hover:bg-yellow-100"
                }`}
              >
                Sort by Name
              </button>
              <button
                onClick={() => setSortField("start_date")}
                className={`px-3 py-1.5 rounded-full border text-xs sm:text-sm transition ${
                  sortField === "start_date"
                    ? "bg-green-700 border-green-700 text-white"
                    : "bg-white border-yellow-300 text-green-800 hover:bg-yellow-100"
                }`}
              >
                Sort by Start Date
              </button>
              <button
                onClick={() =>
                  setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
                }
                className="px-3 py-1.5 rounded-full border border-yellow-300 bg-white text-xs sm:text-sm text-green-800 hover:bg-yellow-100 transition"
              >
                {sortDirection === "asc" ? "↑ Asc" : "↓ Desc"}
              </button>
            </div>
          </div>

          {/* Icon buttons */}
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

        {/* Page title */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-green-800 mb-3">
          Employee Management
        </h1>

        {/* List / Add Employee */}
        <div className="relative">
          <div
            className={`transition-transform duration-500 ${
              profileOpen
                ? "-translate-x-full opacity-0 pointer-events-none absolute inset-0"
                : "translate-x-0 opacity-100 relative"
            }`}
          >
            <div className="mt-2 rounded-3xl bg-white shadow-sm border border-yellow-100 px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6 space-y-4">
              {/* Add Employee Button */}
              <div className="flex justify-end">
                <button
                  onClick={() => setShowAddForm((v) => !v)}
                  className="inline-flex items-center justify-center rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-green-800 active:scale-0.98 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 transition-all"
                >
                  + Add employee
                </button>
              </div>

              {/* Add Employee Form */}
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  showAddForm ? "max-h-[1000px] opacity-100 mt-2" : "max-h-0 opacity-0"
                }`}
              >
                {showAddForm && (
                  <div className="p-4 border border-yellow-200 rounded-2xl bg-yellow-50 text-green-900">
                    <h3 className="mb-3 text-lg font-semibold">Add employee</h3>
                    <form onSubmit={handleAddEmployee}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
                        <label className="text-sm space-y-1">
                          <span>Employee</span>
                          <input
                            type="text"
                            name="name"
                            className="w-full rounded-md border border-yellow-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            value={newEmployee.name}
                            onChange={handleNewEmployeeChange}
                          />
                        </label>
                        <label className="text-sm space-y-1">
                          <span>Department</span>
                          <input
                            type="text"
                            name="department"
                            className="w-full rounded-md border border-yellow-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            value={newEmployee.department}
                            onChange={handleNewEmployeeChange}
                          />
                        </label>
                        <label className="text-sm space-y-1">
                          <span>Position</span>
                          <input
                            type="text"
                            name="position"
                            className="w-full rounded-md border border-yellow-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            value={newEmployee.position}
                            onChange={handleNewEmployeeChange}
                          />
                        </label>
                        <label className="text-sm space-y-1">
                          <span>Start Date</span>
                          <input
                            type="date"
                            name="startDate"
                            className="w-full rounded-md border border-yellow-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            value={newEmployee.startDate}
                            onChange={handleNewEmployeeChange}
                          />
                        </label>
                        <label className="text-sm space-y-1">
                          <span>Category</span>
                          <select
                            name="category"
                            className="w-full rounded-md border border-yellow-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            value={newEmployee.category}
                            onChange={handleNewEmployeeChange}
                          >
                            <option value="">Select category</option>
                            <option value="Full time">Full time</option>
                            <option value="Part time">Part time</option>
                            <option value="Probation">Probation</option>
                            <option value="Contractual">Contractual</option>
                          </select>
                        </label>
                        <label className="text-sm space-y-1">
                          <span>Sex</span>
                          <select
                            name="gender"
                            className="w-full rounded-md border border-yellow-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            value={newEmployee.gender}
                            onChange={handleNewEmployeeChange}
                          >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                        <label className="text-sm space-y-1">
                          <span>Role</span>
                          <select
                            name="role"
                            className="w-full rounded-md border border-yellow-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            value={newEmployee.role}
                            onChange={handleNewEmployeeChange}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </label>
                        <label className="text-sm space-y-1">
                          <span>Email</span>
                          <input
                            type="email"
                            name="email"
                            className="w-full rounded-md border border-yellow-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            value={newEmployee.email}
                            onChange={handleNewEmployeeChange}
                          />
                        </label>
                        <label className="text-sm space-y-1">
                          <span>Password</span>
                          <input
                            type="password"
                            name="password"
                            className="w-full rounded-md border border-yellow-200 p-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                            value={newEmployee.password}
                            onChange={handleNewEmployeeChange}
                          />
                        </label>
                      </div>
                      <div className="mt-4 max-w-xs">
                        <button
                          type="submit"
                          className="w-full inline-flex items-center justify-center rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-green-800 active:scale-0.98 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 transition-all"
                        >
                          Submit
                        </button>
                      </div>
                      {addEmployeeError && (
                        <p className="mt-2 text-sm text-red-600">
                          {addEmployeeError}
                        </p>
                      )}
                    </form>
                  </div>
                )}
              </div>

              <h2 className="text-xl md:text-2xl font-semibold mb-2 text-green-800">
                Employee List
              </h2>

              {loadingEmployees && (
                <p className="mb-2 text-sm text-gray-500">Loading employees...</p>
              )}
              {employeesError && (
                <p className="mb-2 text-sm text-red-600">{employeesError}</p>
              )}

              <div className="max-h-[650px] overflow-x-auto overflow-y-auto border border-yellow-200 rounded-2xl">
                <table className="w-full min-w-[900px] border-collapse text-sm sm:text-base">
                  <thead className="sticky top-0 bg-yellow-200 text-green-900 z-10">
                    <tr className="text-xs sm:text-sm font-semibold uppercase tracking-wide">
                      <th className="p-4 text-left">Employee</th>
                      <th className="p-4 text-left">Department</th>
                      <th className="p-4 text-left">Position</th>
                      <th className="p-4 text-left">Start Date</th>
                      <th className="p-4 text-left">Category</th>
                      <th className="p-4 text-left">Gender</th>
                      <th className="p-4 text-left">Status</th>
                      <th className="p-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeData.map((emp, idx) => (
                      <tr
                        key={emp.id}
                        className={`h-14 sm:h-16 ${
                          idx % 2 === 0 ? "bg-yellow-50" : "bg-white"
                        } hover:bg-yellow-100 transition`}
                      >
                        <td className="p-4 text-sm sm:text-base text-gray-800">
                          {emp.name}
                        </td>
                        <td className="p-4 text-sm sm:text-base text-gray-800">
                          {emp.department}
                        </td>
                        <td className="p-4 text-sm sm:text-base text-gray-800">
                          {emp.position}
                        </td>
                        <td className="p-4 text-sm sm:text-base text-gray-800">
                          {emp.startDate}
                        </td>
                        <td className="p-4 text-sm sm:text-base text-gray-800">
                          {emp.category}
                        </td>
                        <td className="p-4 text-sm sm:text-base text-gray-800">
                          {emp.gender}
                        </td>
                        <td className="p-4 text-sm sm:text-base">
                          <span
                            className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${
                              emp.status === "Active"
                                ? "bg-green-100 text-green-800 border border-green-300"
                                : "bg-red-100 text-red-800 border border-red-300"
                            }`}
                          >
                            <span
                              className={`w-2 h-2 rounded-full ${
                                emp.status === "Active"
                                  ? "bg-green-500"
                                  : "bg-red-500"
                              }`}
                            ></span>
                            {emp.status}
                          </span>
                        </td>
                        <td className="p-4 sm:pl-5">
                          <ActionDropdown
                            onViewProfile={() => openProfile(emp)}
                            onDelete={() => handleDeleteEmployee(emp)}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Employee profile modal */}
          {profileOpen && selectedEmployee && (
            <EmployeeProfileModal
              employee={selectedEmployee}
              onClose={closeProfile}
            />
          )}
        </div>

        {/* Password Confirmation Modal */}
        {showPasswordModal && employeeToDelete && (
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md relative border-2 border-red-400">
              <button
                className="absolute top-3 right-3 text-red-600 hover:text-red-800 text-2xl font-bold"
                onClick={handleClosePasswordModal}
              >
                ×
              </button>

              <div className="flex items-center mb-4">
                <span className="text-3xl mr-3">⚠️</span>
                <h2 className="text-xl font-bold text-red-600">
                  Confirm Deletion
                </h2>
              </div>

              <p className="text-gray-700 mb-2 text-sm">
                You are about to delete employee:
              </p>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <p className="font-semibold text-green-800">
                  {employeeToDelete.name}
                </p>
                <p className="text-sm text-gray-600">
                  {employeeToDelete.position}
                </p>
                <p className="text-sm text-gray-600">
                  {employeeToDelete.department}
                </p>
              </div>

              <p className="text-red-600 text-sm mb-4 font-semibold">
                This action cannot be undone. Please enter your admin password
                to confirm.
              </p>

              <form onSubmit={handleConfirmDelete} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-green-800 mb-2">
                    Your Password
                  </label>
                  <input
                    type="password"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    disabled={verifyingPassword}
                    autoFocus
                  />
                </div>

                {passwordError && (
                  <p className="text-sm text-red-600 font-semibold">
                    {passwordError}
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={verifyingPassword}
                    className="flex-1 bg-red-600 text-white py-2.5 px-4 rounded-full font-semibold text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    {verifyingPassword ? "Verifying..." : "Delete Employee"}
                  </button>
                  <button
                    type="button"
                    onClick={handleClosePasswordModal}
                    disabled={verifyingPassword}
                    className="flex-1 border-2 border-gray-300 text-gray-700 py-2.5 px-4 rounded-full font-semibold text-sm hover:bg-gray-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

/* ---------- Employee profile modal + helper ---------- */

function EmployeeProfileModal({ employee, onClose }) {
  const {
    name,
    email,
    department,
    position,
    contact,
    address,
    profile_image_url,
    status,
    category,
    gender,
    startDate,
  } = employee;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm px-4 py-8"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div 
        className="relative max-w-lg w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-32 h-8 bg-green-600 rounded-full blur-xl opacity-30 pointer-events-none" />

        <div className="bg-white border border-yellow-300 shadow-xl rounded-3xl relative z-10 flex flex-col max-h-full overflow-hidden">
          {/* Fixed header */}
          <div className="flex-shrink-0 relative px-6 pt-6 sm:px-8 sm:pt-8">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 text-lg font-bold text-green-800 hover:text-red-500 w-8 h-8 flex items-center justify-center rounded-full hover:bg-red-50 transition z-10"
            >
              ✕
            </button>

            <div className="flex flex-col items-center mb-4">
              <div className="w-20 h-20 rounded-full bg-yellow-100 flex items-center justify-center overflow-hidden shadow-inner border-4 border-green-600/80">
                {profile_image_url ? (
                  <img
                    src={profile_image_url}
                    alt="Profile"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-2xl text-green-800">👤</span>
                )}
              </div>

              <p className="mt-2 text-[10px] uppercase tracking-wide text-green-700 font-semibold">
                Employee Profile
              </p>
              <h1 className="mt-1 text-xl sm:text-2xl font-extrabold text-green-800 text-center">
                {name || "Unknown Employee"}
              </h1>
              <p className="mt-1 text-[11px] sm:text-xs text-gray-500 text-center max-w-sm">
                Overview of employee details from HR records
              </p>
            </div>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-6 sm:pb-8">
            <div className="space-y-4">
              {/* Personal Details */}
              <div className="bg-green-50/70 border border-green-100 rounded-xl px-3 py-3 sm:px-4 sm:py-4">
                <h2 className="text-xs font-semibold text-green-800 mb-2">
                  Personal Details
                </h2>
                <div className="grid grid-cols-2 gap-y-3 gap-x-2 text-sm">
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Position
                    </span>
                    <span className="text-gray-800 font-medium truncate block">
                      {position || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Department
                    </span>
                    <span className="text-gray-800 font-medium truncate block">
                      {department || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Status
                    </span>
                    <span
                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                        status === "Active"
                          ? "bg-green-100 text-green-700 border-green-200"
                          : "bg-red-100 text-red-700 border-red-200"
                      }`}
                    >
                      {status || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Category
                    </span>
                    <span className="text-gray-800 font-medium truncate block">
                      {category || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Gender
                    </span>
                    <span className="text-gray-800 font-medium truncate block">
                      {gender || "N/A"}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                      Joined
                    </span>
                    <span className="text-gray-800 font-medium truncate block">
                      {startDate || "N/A"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div className="bg-yellow-50/70 border border-yellow-100 rounded-xl px-3 py-3 sm:px-4 sm:py-4">
                <h2 className="text-xs font-semibold text-green-800 mb-2">
                  Contact Information
                </h2>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-white p-1 rounded border border-yellow-200 text-yellow-500">
                      <Mail size={14} />
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        Email Address
                      </span>
                      <span className="text-gray-800 font-medium break-all">
                        {email || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-white p-1 rounded border border-yellow-200 text-yellow-500">
                      <span className="text-xs">📞</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        Phone Number
                      </span>
                      <span className="text-gray-800 font-medium">
                        {contact || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 bg-white p-1 rounded border border-yellow-200 text-yellow-500">
                      <span className="text-xs">🏠</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                        Address
                      </span>
                      <span className="text-gray-800 font-medium">
                        {address || "N/A"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
