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

function ActionDropdown({ onViewProfile }) {
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
        className="flex items-center gap-2 bg-green-700 text-white cursor-pointer px-4 py-1 rounded-md shadow hover:bg-yellow-400 hover:text-green-900 transition font-semibold"
      >
        Actions <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-36 bg-white rounded-md shadow-lg border border-yellow-200 z-40">
          <button
            onClick={() => {
              setOpen(false);
              onViewProfile();
            }}
            className="block bg-green-500 w-full text-left px-4 py-2 text-white rounded-md cursor-pointer hover:bg-yellow-400 hover:text-green-900 transition"
          >
            View Profile
          </button>
          <button className="block bg-green-500 w-full text-left px-4 py-2 text-white rounded-md cursor-pointer hover:bg-yellow-400 hover:text-green-900 transition">
            Edit Profile
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
    role: "user", // default user
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
          "full_name, department, position, start_date, category, gender, status, role"
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

      if (fetchError) {
        console.error("Error loading employees:", fetchError.message);
        setEmployeesError("Failed to load employees. Please try again.");
      } else if (latest) {
        const mapped = latest.map((row) => ({
          name: row.full_name,
          department: row.department,
          position: row.position,
          startDate: row.start_date,
          category: row.category,
          gender: row.gender,
          status: row.status || "Active",
        }));
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
    setAddEmployeeError(""); // clear old error

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
        role: "user", // keep default
      });

      setShowAddForm(false);

      // Refresh list with same filters/sorting
      let query = supabase
        .from("employees")
        .select(
          "full_name, department, position, start_date, category, gender, status, role"
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

      if (!fetchError && latest) {
        const mapped = latest.map((row) => ({
          name: row.full_name,
          department: row.department,
          position: row.position,
          startDate: row.start_date,
          category: row.category,
          gender: row.gender,
          status: row.status || "Active",
        }));
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

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Sidebar */}
      <aside
        className={`w-full lg:flex-shrink-0 ${sidebarWidth} bg-green-700 text-white lg:rounded-r-lg flex flex-row lg:flex-col justify-between py-4 lg:py-6 transition-all duration-300 relative`}
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
              Name
            </h2>
            <p className="text-yellow-300 text-xs lg:text-sm">Position</p>
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
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-yellow-300 hover:text-green-900 transition font-semibold text-sm"
              >
                <LayoutDashboard size={18} /> {isOpen && "Dashboard"}
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-yellow-300 hover:text-green-900 transition font-semibold text-sm">
                <Mail size={18} /> {isOpen && "Messages"}
              </button>
            </nav>

            <h3
              className={`text-yellow-300 text-xs uppercase mt-6 mb-2 ${hideWhenCollapsed}`}
            >
              Organization
            </h3>
            <nav className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg bg-yellow-400 text-green-900 font-semibold transition text-sm">
                <Users size={18} /> {isOpen && "Employee Management"}
              </button>
              <button
                onClick={() => navigate("/leave-management")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-yellow-300 hover:text-green-900 transition font-semibold text-sm"
              >
                <CalendarDays size={18} /> {isOpen && "Leave Management"}
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-yellow-300 hover:text-green-900 transition font-semibold text-sm">
                <CreditCard size={18} /> {isOpen && "Payroll Management"}
              </button>
            </nav>
          </div>
        </div>

        <div className="px-4 lg:px-6 mt-4 lg:mt-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-yellow-400 text-green-800 font-bold py-2 rounded-lg cursor-pointer hover:bg-yellow-300 transform hover:scale-105 transition-all duration-200 shadow-lg text-sm"
          >
            <Power size={18} />
            {isOpen && "Log Out"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-white">
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <button
            onClick={() => setIsOpen((s) => !s)}
            className="text-green-700 cursor-pointer hover:text-yellow-400 transition self-start"
          >
            <Menu size={28} />
          </button>

          <div className="flex-1 flex flex-col items-center">
            <div className="w-full flex justify-center relative mb-2">
              <input
                type="text"
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full max-w-md pl-4 pr-10 py-2 rounded-full border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600 text-green-800 shadow-sm text-sm"
              />
              <Search
                size={18}
                className="absolute right-[calc(32%-2.5rem)] top-1/2 -translate-y-1/2 text-yellow-400 cursor-pointer"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
              <button
                onClick={() => setSortField("full_name")}
                className="px-2 py-1 border rounded"
              >
                Sort by Name
              </button>
              <button
                onClick={() => setSortField("start_date")}
                className="px-2 py-1 border rounded"
              >
                Sort by Start Date
              </button>
              <button
                onClick={() =>
                  setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
                }
                className="px-2 py-1 border rounded"
              >
                {sortDirection === "asc" ? "Asc" : "Desc"}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-4 md:ml-6 self-end md:self-auto">
            <button className="p-1.5 sm:p-2 bg-yellow-400 text-green-800 rounded-full cursor-pointer hover:bg-green-700 hover:text-white transition">
              <Bell size={18} />
            </button>
            <button className="p-1.5 sm:p-2 bg-yellow-400 text-green-800 rounded-full cursor-pointer hover:bg-green-700 hover:text-white transition">
              <Settings size={18} />
            </button>
            <button className="p-1.5 sm:p-2 bg-yellow-400 text-green-800 rounded-full cursor-pointer hover:bg-green-700 hover:text-white transition">
              <Mail size={18} />
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold text-green-800 mb-6">
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
            <div className="p-4 sm:p-6 bg-white rounded-2xl shadow-md relative">
              {/* Add Employee Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowAddForm((v) => !v)}
                  className="bg-green-700 text-white px-4 py-2 rounded-md cursor-pointer font-semibold hover:bg-yellow-400 hover:text-green-900 transition text-sm"
                >
                  +
                </button>
              </div>

              {/* Add Employee Form */}
              <div
                className={`mb-6 overflow-hidden transition-all duration-500 ease-in-out ${
                  showAddForm ? "max-h-[1000px] opacity-100" : "max-h-0 opacity-0"
                }`}
              >
                {showAddForm && (
                  <div className="p-4 border border-yellow-200 rounded-lg bg-yellow-50 text-green-900">
                    <h3 className="mb-2 font-semibold text-lg">Add employee</h3>
                    <form onSubmit={handleAddEmployee}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-md">
                        <label className="text-sm">
                          Employee
                          <input
                            type="text"
                            name="name"
                            className="w-full rounded border p-2 text-sm"
                            value={newEmployee.name}
                            onChange={handleNewEmployeeChange}
                          />
                        </label>
                        <label className="text-sm">
                          Department
                          <input
                            type="text"
                            name="department"
                            className="w-full rounded border p-2 text-sm"
                            value={newEmployee.department}
                            onChange={handleNewEmployeeChange}
                          />
                        </label>
                        <label className="text-sm">
                          Position
                          <input
                            type="text"
                            name="position"
                            className="w-full rounded border p-2 text-sm"
                            value={newEmployee.position}
                            onChange={handleNewEmployeeChange}
                          />
                        </label>
                        <label className="text-sm">
                          Start Date
                          <input
                            type="date"
                            name="startDate"
                            className="w-full rounded border p-2 text-sm"
                            value={newEmployee.startDate}
                            onChange={handleNewEmployeeChange}
                          />
                        </label>
                        <label className="text-sm">
                          Category
                          <select
                            name="category"
                            className="w-full rounded border p-2 text-sm"
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
                        <label className="text-sm">
                          Sex
                          <select
                            name="gender"
                            className="w-full rounded border p-2 text-sm"
                            value={newEmployee.gender}
                            onChange={handleNewEmployeeChange}
                          >
                            <option value="">Select gender</option>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </label>
                        <label className="text-sm">
                          Role
                          <select
                            name="role"
                            className="w-full rounded border p-2 text-sm"
                            value={newEmployee.role}
                            onChange={handleNewEmployeeChange}
                          >
                            <option value="user">User</option>
                            <option value="admin">Admin</option>
                          </select>
                        </label>

                        <label className="text-sm">
                          Email
                          <input
                            type="email"
                            name="email"
                            className="w-full rounded border p-2 text-sm"
                            value={newEmployee.email}
                            onChange={handleNewEmployeeChange}
                          />
                        </label>
                        <label className="text-sm">
                          Password
                          <input
                            type="password"
                            name="password"
                            className="w-full rounded border p-2 text-sm"
                            value={newEmployee.password}
                            onChange={handleNewEmployeeChange}
                          />
                        </label>
                        <label>
                          <button
                            type="submit"
                            className="w-full rounded border p-2 mt-6 text-sm bg-green-700 text-white hover:bg-yellow-400 hover:text-green-900 transition"
                          >
                            Submit
                          </button>
                        </label>
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

              <h2 className="text-lg font-semibold mb-4 text-green-800">
                Employee List
              </h2>
              {loadingEmployees && (
                <p className="mb-2 text-sm text-gray-500">Loading employees...</p>
              )}
              {employeesError && (
                <p className="mb-2 text-sm text-red-600">{employeesError}</p>
              )}
              <div className="max-h-[500px] overflow-x-auto overflow-y-auto border border-yellow-200 rounded-lg">
                <table className="min-w-full border-collapse text-xs sm:text-sm">
                  <thead className="sticky top-0 bg-yellow-200 text-green-800 z-10">
                    <tr>
                      <th className="p-3 text-left">Employee</th>
                      <th className="p-3 text-left">Department</th>
                      <th className="p-3 text-left">Position</th>
                      <th className="p-3 text-left">Start Date</th>
                      <th className="p-3 text-left">Category</th>
                      <th className="p-3 text-left">Gender</th>
                      <th className="p-3 text-left">Status</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employeeData.map((emp, idx) => (
                      <tr
                        key={idx}
                        className={`${
                          idx % 2 === 0 ? "bg-yellow-50" : "bg-white"
                        } hover:bg-yellow-100 transition`}
                      >
                        <td className="p-3">{emp.name}</td>
                        <td className="p-3">{emp.department}</td>
                        <td className="p-3">{emp.position}</td>
                        <td className="p-3">{emp.startDate}</td>
                        <td className="p-3">{emp.category}</td>
                        <td className="p-3">{emp.gender}</td>
                        <td className="p-3">{emp.status}</td>
                        <td className="p-3">
                          <ActionDropdown onViewProfile={() => openProfile(emp)} />
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
