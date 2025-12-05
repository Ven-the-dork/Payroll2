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
  Bell,
  Settings,
  ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut, createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";

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
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={() => setOpen((s) => !s)}
        className="inline-flex items-center gap-2 rounded-full bg-green-700 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white shadow-sm cursor-pointer hover:bg-green-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 transition-all"
      >
        Actions <ChevronDown size={14} />
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

export default function EmployeeManagement() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmployeeError, setAddEmployeeError] = useState("");
  const [currentUser, setCurrentUser] = useState(null);

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

  useEffect(() => {
    const fetchEmployees = async () => {
      setLoadingEmployees(true);
      setEmployeesError("");

      let query = supabase
        .from("employees")
        .select(
          "id, firebase_uid, full_name, department, position, start_date, category, gender, status, last_seen, role"
        )
        .neq("role", "admin")
        .order(sortField, { ascending: sortDirection === "asc" });

      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(
          `full_name.ilike.${term},department.ilike.${term},position.ilike.${term}`
        );
      }

      const { data: latest, error: fetchError } = await query;

      console.log("RAW employees from Supabase:", latest);

      if (fetchError) {
        console.error("Error loading employees:", fetchError.message);
        setEmployeesError("Failed to load employees. Please try again.");
      } else if (latest) {
        const mapped = latest.map((row) => {
          const lastSeen = row.last_seen ? new Date(row.last_seen) : null;
          const isRecent =
            lastSeen && Date.now() - lastSeen.getTime() < 30_000; // 30s

          return {
            id: row.id,
            firebaseUid: row.firebase_uid,
            name: row.full_name,
            department: row.department,
            position: row.position,
            startDate: row.start_date,
            category: row.category,
            gender: row.gender,
            status: isRecent ? "Active" : "Inactive",
          };
        });
        setEmployeeData(mapped);
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
        console.error("SUPABASE ERROR", error.message, error.details, error.hint);
        setAddEmployeeError("Failed to save employee in Supabase.");
        return;
      }

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

      // Refresh list with same filters/sorting
      let query = supabase
        .from("employees")
        .select(
          "id, firebase_uid, full_name, department, position, start_date, category, gender, status, last_seen, role"
        )
        .neq("role", "admin")
        .order(sortField, { ascending: sortDirection === "asc" });

      if (searchTerm.trim()) {
        const term = `%${searchTerm.trim()}%`;
        query = query.or(
          `full_name.ilike.${term},department.ilike.${term},position.ilike.${term}`
        );
      }

      const { data: latest, error: fetchError } = await query;

      console.log("RAW employees after insert:", latest);

      if (!fetchError && latest) {
        const mapped = latest.map((row) => {
          const lastSeen = row.last_seen ? new Date(row.last_seen) : null;
          const isRecent =
            lastSeen && Date.now() - lastSeen.getTime() < 30_000;

          return {
            id: row.id,
            firebaseUid: row.firebase_uid,
            name: row.full_name,
            department: row.department,
            position: row.position,
            startDate: row.start_date,
            category: row.category,
            gender: row.gender,
            status: isRecent ? "Active" : "Inactive",
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

  // delete handler
  const handleDeleteEmployee = async (emp) => {
    console.log("emp in delete:", emp);

    const ok = window.confirm(
      `Are you sure you want to delete ${emp.name}? This action cannot be undone.`
    );
    if (!ok) return;

    const { data, error } = await supabase
      .from("employees")
      .delete()
      .eq("id", emp.id)
      .select("*");

    console.log("Deleted rows:", data, "Error:", error);

    if (error) {
      console.error("Error deleting employee:", error.message);
      alert("Failed to delete employee. Please try again.");
      return;
    }

    setEmployeeData((prev) => prev.filter((e) => e.id !== emp.id));
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
      <aside
        className={`w-full lg:flex-shrink-0 ${sidebarWidth} max-w-full bg-green-700 text-white rounded-r-lg flex flex-col justify-between py-4 lg:py-6 transition-all duration-300 relative`}
      >
        <div>
          <div
            className={`flex flex-col items-center mb-8 transition-all duration-300 ${hideWhenCollapsed}`}
          >
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
              <span className="text-2xl lg:text-3xl font-bold text-green-800">
                👤
              </span>
            </div>
            <h2 className="mt-3 text-base lg:text-lg text-white font-bold">
              {currentUser?.fullName}
            </h2>
            <p className="text-yellow-300 text-xs lg:text-sm">
              {currentUser?.position}
            </p>
          </div>

          <div className="px-4">
            <h3
              className={`text-yellow-300 text-xs uppercase mb-2 ${hideWhenCollapsed}`}
            >
              Features
            </h3>
            <nav className="space-y-1">
              <button
                onClick={() => navigate("/dashboard")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
              >
                <LayoutDashboard size={18} /> {isOpen && "Dashboard"}
              </button>
            </nav>

            <h3
              className={`text-yellow-300 text-xs uppercase mt-6 mb-2 ${hideWhenCollapsed}`}
            >
              Organization
            </h3>
            <nav className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-full bg-yellow-400 text-green-900 font-semibold shadow-sm text-sm">
                <Users size={18} /> {isOpen && "Employee Management"}
              </button>
              <button
                onClick={() => navigate("/leave-management")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
              >
                <CalendarDays size={18} /> {isOpen && "Leave Management"}
              </button>
              <button 
                onClick={() => navigate("/PayrollManagement")}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm">
                <CreditCard size={18} /> {isOpen && "Payroll Management"}
              </button>
            </nav>
          </div>
        </div>

        <div className="px-4 lg:px-6 mt-4 lg:mt-0">
          <button
            onClick={handleLogout}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-green-900 px-4 py-2 text-sm font-bold text-white cursor-pointer hover:bg-green-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-400 shadow-lg transition-all"
          >
            <Power size={18} />
            {isOpen && "Log Out"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden bg-white">
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <button
            onClick={() => setIsOpen((s) => !s)}
            className="self-start text-green-700 cursor-pointer hover:text-yellow-400 transition"
          >
            <Menu size={28} />
          </button>

          <div className="flex-1 flex flex-col items-center md:items-center">
            {/* Search */}
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
                {sortDirection === "asc" ? "Asc ▲" : "Desc ▼"}
              </button>
            </div>
          </div>

          {/* Icon buttons */}
          <div className="flex items-center gap-3 md:gap-4 md:ml-6 self-end md:self-auto">
            <button className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400 text-green-900 cursor-pointer hover:bg-yellow-300 transition">
              <Bell size={18} />
            </button>
            <button className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400 text-green-900 cursor-pointer hover:bg-yellow-300 transition">
              <Settings size={18} />
            </button>
            <button className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400 text-green-900 cursor-pointer hover:bg-yellow-300 transition">
              <Mail size={18} />
            </button>
          </div>
        </div>

        {/* Page title */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-green-800 mb-3">
          Employee Management
        </h1>

        <div className="relative">
          {/* List + Add Employee */}
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
                  className="inline-flex items-center justify-center rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-green-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 transition-all"
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
                          className="w-full inline-flex items-center justify-center rounded-full bg-green-700 px-4 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-green-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-600 transition-all"
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

              <div>
                <h2 className="text-xl md:text-2xl font-semibold mb-2 text-green-800">
                  Employee List
                </h2>
                {loadingEmployees && (
                  <p className="mb-2 text-sm text-gray-500">Loading employees...</p>
                )}
                {employeesError && (
                  <p className="mb-2 text-sm text-red-600">{employeesError}</p>
                )}
              </div>
              <div className="max-h-[650px] overflow-x-auto overflow-y-auto border border-yellow-200 rounded-2xl">
                <table className="min-w-[900px] border-collapse text-sm sm:text-base">
                  <thead className="sticky top-0 bg-yellow-200 text-green-900 z-10">
                    <tr className="text-xs sm:text-sm font-semibold uppercase tracking-wide">
                      <th className="p-4 text-left">Employee</th>
                      <th className="p-4 text-left">Department</th>
                      <th className="p-4 text-left">Position</th>
                      <th className="p-4 text-left">Start Date</th>
                      <th className="p-4 text-left">Category</th>
                      <th className="p-4 text-left">Gender</th>
                      <th className="p-4 text-left">Status</th>
                      <th className="p-4 text-right">Actions</th>
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
                        <td className="p-4 text-sm sm:text-base text-gray-800">
                          {emp.status}
                        </td>
                        <td className="p-4 sm:pr-5">
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

          {/* Profile view (unchanged) */}
          {/* ... keep your existing profile view JSX here ... */}
        </div>
      </main>
    </div>
  );
}
