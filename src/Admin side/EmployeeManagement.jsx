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

  const employeeData = [
    {
      name: "Brian Cruz",
      department: "HR",
      position: "Manager",
      status: "Active",
      category: "Full time",
      gender: "Male",
      startDate: "01/05/2022",
      email: "brian.cruz@example.com",
      phone: "+63 912 345 6789",
      address: "123 Some St, City",
    },
    {
      name: "Anna Santos",
      department: "IT",
      position: "Developer",
      status: "On Leave",
      category: "Remote",
      gender: "Female",
      startDate: "03/06/2022",
      email: "anna.santos@example.com",
      phone: "+63 922 111 2222",
      address: "45 Other Ave, City",
    },
    {
      name: "John Doe",
      department: "Finance",
      position: "Analyst",
      status: "Active",
      category: "Probation",
      gender: "Male",
      startDate: "12/01/2023",
      email: "john.doe@example.com",
      phone: "+63 933 333 4444",
      address: "77 Road, City",
    },
  ];

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

  const sidebarWidth = isOpen ? "w-64" : "w-20";
  const hideWhenCollapsed = !isOpen && "hidden";


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

        const { data, error } = await supabase
          .from("employees")
          .insert({
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
          employment_type: "",
        });
        setShowAddForm(false);
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
    <div className="flex h-screen bg-white">
      {/* Sidebar */}
      <aside
        className={`flex-shrink-0 ${sidebarWidth} bg-green-700 text-white rounded-r-lg flex flex-col justify-between py-6 transition-all duration-300 relative`}
      >
        <div>
          <div
            className={`flex flex-col items-center mb-8 transition-all duration-300 ${hideWhenCollapsed}`}
          >
            <div className="w-20 h-20 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-green-800">👤</span>
            </div>
            <h2 className="mt-3 text-lg text-white font-bold">Name</h2>
            <p className="text-yellow-300 text-sm">Position</p>
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
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-yellow-300 hover:text-green-900 transition font-semibold"
              >
                <LayoutDashboard size={18} /> {isOpen && "Dashboard"}
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-yellow-300 hover:text-green-900 transition font-semibold">
                <Mail size={18} /> {isOpen && "Messages"}
              </button>
            </nav>

            <h3
              className={`text-yellow-300 text-xs uppercase mt-6 mb-2 ${hideWhenCollapsed}`}
            >
              Organization
            </h3>
            <nav className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg bg-yellow-400 text-green-900 font-semibold transition">
                <Users size={18} /> {isOpen && "Employee Management"}
              </button>
              <button
                onClick={() => navigate("/leave-management")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-yellow-300 hover:text-green-900 transition font-semibold"
              >
                <CalendarDays size={18} /> {isOpen && "Leave Management"}
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-yellow-300 hover:text-green-900 transition font-semibold">
                <CreditCard size={18} /> {isOpen && "Payroll Management"}
              </button>
            </nav>
          </div>
        </div>

        <div className="px-6">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-yellow-400 text-green-800 font-bold py-2 rounded-lg cursor-pointer hover:bg-yellow-300 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            <Power size={18} />
            {isOpen && "Log Out"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto p-8 bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => setIsOpen((s) => !s)}
            className="text-green-700 cursor-pointer hover:text-yellow-400 transition"
          >
            <Menu size={28} />
          </button>

          <div className="flex-1 flex justify-center relative">
            <input
              type="text"
              placeholder="Search employees..."
              className="w-1/2 pl-4 pr-10 py-2 rounded-full border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600 text-green-800 shadow-sm"
            />
            <Search
              size={18}
              className="absolute right-[calc(50%-10rem)] top-1/2 -translate-y-1/2 text-yellow-400 cursor-pointer"
            />
          </div>

          <div className="flex items-center gap-4 ml-6">
            <button className="p-2 bg-yellow-400 text-green-800 rounded-full cursor-pointer hover:bg-green-700 hover:text-white transition">
              <Bell size={18} />
            </button>
            <button className="p-2 bg-yellow-400 text-green-800 rounded-full cursor-pointer hover:bg-green-700 hover:text-white transition">
              <Settings size={18} />
            </button>
            <button className="p-2 bg-yellow-400 text-green-800 rounded-full cursor-pointer hover:bg-green-700 hover:text-white transition">
              <Mail size={18} />
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-green-800 mb-6">
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
            <div className="p-6 bg-white rounded-2xl shadow-md relative">
              {/* Add Employee Button */}
              <div className="flex justify-end mb-4">
                <button
                  onClick={() => setShowAddForm((v) => !v)}
                  className="bg-green-700 text-white px-4 py-2 rounded-md cursor-pointer font-semibold hover:bg-yellow-400 hover:text-green-900 transition"
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
                          <label>
                            Employee
                            <input
                              type="text"
                              name="name"
                              className="w-full rounded border p-2"
                              value={newEmployee.name}
                              onChange={handleNewEmployeeChange}
                            />
                          </label>
                          <label>
                            Department
                            <input
                              type="text"
                              name="department"
                              className="w-full rounded border p-2"
                              value={newEmployee.department}
                              onChange={handleNewEmployeeChange}
                            />
                          </label>
                          <label>
                            Position
                            <input
                              type="text"
                              name="position"
                              className="w-full rounded border p-2"
                              value={newEmployee.position}
                              onChange={handleNewEmployeeChange}
                            />
                          </label>
                          <label>
                            Start Date
                            <input
                              type="date"
                              name="startDate"
                              className="w-full rounded border p-2"
                              value={newEmployee.startDate}
                              onChange={handleNewEmployeeChange}
                            />
                          </label>
                          <label>
                            Category
                            <select
                              name="category"
                              className="w-full rounded border p-2"
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
                          <label>
                            Sex
                            <select
                              name="gender"
                              className="w-full rounded border p-2"
                              value={newEmployee.gender}
                              onChange={handleNewEmployeeChange}
                            >
                              <option value="">Select gender</option>
                              <option value="Male">Male</option>
                              <option value="Female">Female</option>
                              <option value="Other">Other</option>
                            </select>
                          </label>
                          <label>
                            Role
                            <select
                              name="role"
                              className="w-full rounded border p-2"
                              value={newEmployee.role}
                              onChange={handleNewEmployeeChange}
                            >
                              <option value="user">User</option>
                              <option value="admin">Admin</option>
                            </select>
                          </label>

                          <label>
                            Email
                            <input
                              type="email"
                              name="email"
                              className="w-full rounded border p-2"
                              value={newEmployee.email}
                              onChange={handleNewEmployeeChange}
                            />
                          </label>
                          <label>
                            Password
                            <input
                              type="password"
                              name="password"
                              className="w-full rounded border p-2"
                              value={newEmployee.password}
                              onChange={handleNewEmployeeChange}
                            />
                          </label>
                          <label>
                            <button
                              type="submit"
                              className="w-full rounded border p-2 mt-6"
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


              {/* Employee List (still static for now) */}
              <h2 className="text-lg font-semibold mb-4 text-green-800">
                Employee List
              </h2>
              <div className="max-h-[500px] overflow-y-auto border border-yellow-200 rounded-lg">
                <table className="w-full border-collapse text-sm">
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
                          <ActionDropdown
                            onViewProfile={() => openProfile(emp)}
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
