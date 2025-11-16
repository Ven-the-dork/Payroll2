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
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

// Dropdown used in table rows. Only "View Profile" is wired.
function ActionDropdown({ onViewProfile }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
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

  // table <-> profile view
  const [profileOpen, setProfileOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // left panel in profile view
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
    // more rows can be added...
  ];

  function openProfile(emp) {
    setSelectedEmployee(emp);
    setActiveSection(sections[0]);
    setProfileOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function closeProfile() {
    setProfileOpen(false);
    setSelectedEmployee(null);
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? "w-64" : "w-20"
        } bg-green-700 text-white rounded-r-lg flex flex-col justify-between py-6 transition-all duration-300 relative`}
      >
        <div>
          <div
            className={`flex flex-col items-center mb-8 transition-all duration-300 ${
              !isOpen && "hidden"
            }`}
          >
            <div className="w-20 h-20 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-green-800">👤</span>
            </div>
            <h2 className="mt-3 text-lg text-white font-bold">Name</h2>
            <p className="text-yellow-300 text-sm">Position</p>
          </div>

          <div className="px-4">
            <h3 className={`text-yellow-300 text-xs uppercase mb-2 ${!isOpen && "hidden"}`}>
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

            <h3 className={`text-yellow-300 text-xs uppercase mt-6 mb-2 ${!isOpen && "hidden"}`}>
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
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 bg-yellow-400 text-green-800 font-bold py-2 rounded-lg cursor-pointer hover:bg-yellow-300 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            <Power size={18} />
            {isOpen && "Log Out"}
          </button>
        </div>
      </aside>

      {/* Main area */}
      <main className="flex-1 p-8 overflow-x-hidden bg-white">
        {/* top bar */}
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => setIsOpen((s) => !s)} className="text-green-700 cursor-pointer hover:text-yellow-400 transition">
            <Menu size={28} />
          </button>
          <div className="flex-1 flex justify-center relative">
            <input
              type="text"
              placeholder="Search employees..."
              className="w-1/2 pl-4 pr-10 py-2 rounded-full border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600 text-green-800 shadow-sm"
            />
            <Search size={18} className="absolute right-[calc(50%-10rem)] top-1/2 -translate-y-1/2 text-yellow-400 cursor-pointer" />
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

        <h1 className="text-3xl font-bold text-green-800 mb-6">Employee Management</h1>

        {/* Container that switches between table and profile view */}
        <div className="relative">
          {/* Table view */}
          <div
            className={`transition-transform duration-500 ${profileOpen ? "-translate-x-full opacity-0 pointer-events-none absolute inset-0" : "translate-x-0 opacity-100 relative"
              }`}
          >
            <div className="p-6 bg-white rounded-2xl shadow-md relative">
              <h2 className="text-lg font-semibold mb-4 text-green-800">Employee List</h2>
              <div className="max-h-[500px] overflow-y-auto border border-yellow-200 rounded-lg">
                <table className="w-full border-collapse text-sm">
                  <thead className="sticky top-0 bg-yellow-200 text-green-800 z-10">
                    <tr>
                      <th className="p-3 text-left ">Employee</th>
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
                      <tr key={idx} className={`${idx % 2 === 0 ? "bg-yellow-50" : "bg-white"} hover:bg-yellow-100 transition`}>
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

          {/* Profile view */}
          <div
            className={`transition-transform duration-100 ${profileOpen ? "translate-x-0 opacity-100 relative" : "translate-x-full opacity-0 pointer-events-none absolute inset-0"
              }`}
          >
            <div className="p-6 bg-white rounded-2xl shadow-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <button
                    onClick={closeProfile}
                    className="flex items-center text-white gap-2 px-3 py-1 rounded-md cursor-pointer bg-green-700 hover:bg-yellow-400 hover:text-green-900 transition"
                  >
                    ← Back to Employee List
                  </button>
                  <h2 className="text-xl font-semibold text-green-800">
                    Employee / Employee Profile / {selectedEmployee?.name || "—"}
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  <button className="bg-yellow-400 text-green-900 px-4 py-2 rounded-md font-semibold cursor-pointer hover:bg-green-700 hover:text-white transition">
                    Edit
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left vertical menu */}
                <div>
                  <div className="space-y-3">
                    {sections.map((s) => (
                      <button
                        key={s}
                        onClick={() => setActiveSection(s)}
                        className={`w-full text-left px-4 py-3 cursor-pointer rounded-xl font-semibold ${activeSection === s ? "bg-yellow-400 text-green-900" : "bg-yellow-50 text-green-900"} hover:opacity-90 transition`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
                {/* Right content area (span two columns on md screens) */}
                <div className="md:col-span-2 bg-white rounded-xl border border-yellow-200 p-6">
                  <div className="flex items-start gap-6">
                    <div className="w-28 h-28 rounded-full bg-yellow-200 flex items-center justify-center text-4xl text-green-900">
                      👤
                    </div>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold text-green-800">{selectedEmployee?.name}</h3>
                      <p className="text-sm text-yellow-700">{selectedEmployee?.department} • {selectedEmployee?.position}</p>
                      <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-green-800">
                        <div>
                          <p className="text-xs text-yellow-600">Email</p>
                          <p>{selectedEmployee?.email || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-yellow-600">Phone</p>
                          <p>{selectedEmployee?.phone || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-yellow-600">Start Date</p>
                          <p>{selectedEmployee?.startDate || "-"}</p>
                        </div>
                        <div>
                          <p className="text-xs text-yellow-600">Status</p>
                          <p>{selectedEmployee?.status || "-"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Section content area */}
                  <div className="mt-6">
                    <h4 className="mb-2 text-lg font-bold text-green-800">{activeSection}</h4>
                    {/* Section-specific content (unchanged, still placeholder) */}
                    {activeSection === "Personal Details" && (
                      <div className="space-y-2 text-sm text-green-900">
                        <p><strong>Full name:</strong> {selectedEmployee?.name}</p>
                        <p><strong>Gender:</strong> {selectedEmployee?.gender}</p>
                        <p><strong>Category:</strong> {selectedEmployee?.category}</p>
                        <p><strong>Address:</strong> {selectedEmployee?.address || "-"}</p>
                      </div>
                    )}
                    {activeSection === "Contact Details" && (
                      <div className="space-y-2 text-sm text-green-900">
                        <p><strong>Email:</strong> {selectedEmployee?.email || "-"}</p>
                        <p><strong>Phone:</strong> {selectedEmployee?.phone || "-"}</p>
                        <p><strong>Address:</strong> {selectedEmployee?.address || "-"}</p>
                      </div>
                    )}
                    {/* Add other sections as in your original code... */}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}