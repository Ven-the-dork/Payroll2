import { useState, useEffect } from "react";
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
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

export default function LeaveManagement() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openHistoryDropdown, setOpenHistoryDropdown] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  const toggleTab = (tabName) =>
    setActiveTab((prev) => (prev === tabName ? null : tabName));

  const handleRecallClick = (employee) => {
    setSelectedEmployee(employee);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedEmployee(null);
  };

  const toggleDropdown = (index) =>
    setOpenDropdown((prev) => (prev === index ? null : index));

  const toggleHistoryDropdown = (index) =>
    setOpenHistoryDropdown((prev) => (prev === index ? null : index));

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
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

  const leaveData = [
    { name: "John Doe", duration: 5, start: "22/04/2022", end: "28/04/2022", type: "Casual", reason: "Personal" },
    { name: "Jane Smith", duration: 7, start: "22/04/2022", end: "30/04/2022", type: "Casual", reason: "Vacation" },
    { name: "Mike Johnson", duration: 7, start: "22/04/2022", end: "28/06/2022", type: "Sick", reason: "Medical" },
    { name: "Sarah Lee", duration: 5, start: "22/04/2022", end: "28/04/2022", type: "Casual", reason: "Family" },
    { name: "Alex Tan", duration: 5, start: "22/04/2022", end: "28/04/2022", type: "Vacation", reason: "Trip" },
  ];

  const leaveSettings = [
    { plan: "Maternity", duration: 60, recall: "No", autoRenew: "No" },
    { plan: "Sick", duration: 14, recall: "No", autoRenew: "Yes" },
    { plan: "Compassionate", duration: 30, recall: "No", autoRenew: "No" },
    { plan: "Exam", duration: 20, recall: "No", autoRenew: "No" },
    { plan: "Paternity", duration: 60, recall: "No", autoRenew: "No" },
    { plan: "Casual", duration: 10, recall: "Yes", autoRenew: "No" },
  ];

  const btnBase =
    "px-8 md:px-10 py-2.5 md:py-3 rounded-full cursor-pointer shadow-md text-sm md:text-base transition-all duration-200";
  const sidebarWidth = isOpen ? "lg:w-64" : "lg:w-20";
  const hideWhenCollapsed = !isOpen && "hidden lg:block";

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Sidebar */}
      <aside
        className={`w-full lg:flex-shrink-0 ${sidebarWidth} max-w-full bg-green-700 text-white rounded-r-lg flex flex-col justify-between py-4 lg:py-6 transition-all duration-300`}
      >
        <div>
          {/* Profile Section */}
          <div
            className={`flex flex-col items-center mb-8 transition-all duration-300 ${hideWhenCollapsed}`}
          >
            <div className="w-16 h-16 lg:w-20 lg:h-20 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
              <span className="text-2xl lg:text-3xl font-bold text-green-800">👤</span>
            </div>
            <h2 className="mt-3 text-base lg:text-lg text-white font-bold">
              {currentUser?.fullName}
            </h2>
            <p className="text-yellow-300 text-xs lg:text-sm">
              {currentUser?.position}
            </p>
          </div>

          {/* Nav */}
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
              <button
                onClick={() => navigate("/employee-management")}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-full cursor-pointer hover:bg-white/10 text-white/90 hover:text-white transition font-semibold text-sm"
              >
                <Users size={18} /> {isOpen && "Employee Management"}
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-full bg-yellow-400 text-green-900 font-semibold shadow-sm text-sm">
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

        {/* Logout */}
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
            onClick={() => setIsOpen((prev) => !prev)}
            className="self-start text-green-700 cursor-pointer hover:text-yellow-400 transition"
          >
            <Menu size={28} />
          </button>

          {/* Search */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full md:max-w-md relative">
              <input
                type="text"
                placeholder="Search..."
                className="w-full rounded-full border-2 border-yellow-300 px-4 pr-10 py-2 text-sm md:text-base text-green-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <Search
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Right icons */}
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
                <form className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-green-800 font-semibold mb-1">
                        Leave Plan Name
                      </label>
                      <input
                        type="text"
                        placeholder="Maternity"
                        className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>
                    <div>
                      <label className="block text-green-800 font-semibold mb-1">
                        Duration (days)
                      </label>
                      <input
                        type="number"
                        placeholder="60"
                        className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-green-800 font-semibold mb-1">
                      Activate Leave Recall for this plan?
                    </label>
                    <select className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600">
                      <option>Select option</option>
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-green-800 font-semibold mb-1">
                        Activate leave bonus?
                      </label>
                      <select className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600">
                        <option>Select option</option>
                        <option>Yes</option>
                        <option>No</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-green-800 font-semibold mb-1">
                        Bonus percentage
                      </label>
                      <input
                        type="number"
                        placeholder="%"
                        className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-green-800 font-semibold mb-1">
                      Select Leave Allocation
                    </label>
                    <select className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600">
                      <option>Senior Level</option>
                      <option>Junior Level</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-green-800 font-semibold mb-1">
                      Reason for Recall
                    </label>
                    <textarea
                      rows={2}
                      className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600"
                    />
                  </div>

                  <button
                    type="button"
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
                <div className="max-h-96 overflow-y-auto rounded-2xl border border-yellow-200">
                  <table className="w-full border-collapse text-xs sm:text-sm">
                    <thead className="bg-yellow-200 text-green-900">
                      <tr className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide">
                        <th className="p-3 text-left">Leave Plan</th>
                        <th className="p-3 text-left">Duration</th>
                        <th className="p-3 text-left">Recall / AutoRenew</th>
                        <th className="p-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leaveSettings.map((setting, index) => (
                        <tr
                          key={index}
                          className={`h-11 ${
                            index % 2 === 0 ? "bg-yellow-50" : "bg-white"
                          } hover:bg-yellow-100 transition`}
                        >
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {setting.plan}
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {setting.duration}
                          </td>
                          <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                            {setting.recall} / {setting.autoRenew}
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
                                <button className="block w-full text-left px-3 py-2 text-sm text-green-900 hover:bg-yellow-50">
                                  Edit
                                </button>
                                <button className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                  Delete
                                </button>
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

          {/* Leave Recall */}
          {activeTab === "recall" && (
            <div className="rounded-3xl bg-white shadow-sm border border-yellow-100 p-6 relative">
              <h2 className="text-lg md:text-xl font-semibold mb-3 text-green-800">
                Ongoing Leave Applications
              </h2>
              <div className="max-h-80 overflow-y-auto rounded-2xl border border-yellow-200">
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead className="sticky top-0 bg-yellow-200 text-green-900 z-10">
                    <tr className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide">
                      <th className="p-3">Name(s)</th>
                      <th className="p-3">Duration(s)</th>
                      <th className="p-3">Start Date</th>
                      <th className="p-3">End Date</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Reason(s)</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveData.map((leave, index) => (
                      <tr
                        key={index}
                        className={`h-11 ${
                          index % 2 === 0 ? "bg-yellow-50" : "bg-white"
                        } hover:bg-yellow-100 transition`}
                      >
                        <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                          {leave.name}
                        </td>
                        <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                          {leave.duration}
                        </td>
                        <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                          {leave.start}
                        </td>
                        <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                          {leave.end}
                        </td>
                        <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                          {leave.type}
                        </td>
                        <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                          {leave.reason}
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => handleRecallClick(leave)}
                            className="inline-flex items-center justify-center rounded-full bg-green-700 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white cursor-pointer hover:bg-green-800 active:scale-[0.98] transition-all"
                          >
                            Recall
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Popup Modal */}
              {showPopup && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
                  <div className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-md relative">
                    <button
                      className="absolute top-3 right-3 text-green-700 hover:text-yellow-400 text-xl"
                      onClick={closePopup}
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
                    <form className="space-y-3 text-sm">
                      <div>
                        <label className="block text-green-800 mb-1">
                          Employee Name
                        </label>
                        <input
                          type="text"
                          value={selectedEmployee?.name || ""}
                          readOnly
                          className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-green-800 mb-1">
                          Department
                        </label>
                        <input
                          type="text"
                          placeholder="Enter department"
                          className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                        />
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="block text-green-800 mb-1">
                            Start Date
                          </label>
                          <input
                            type="date"
                            defaultValue="2022-04-22"
                            className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-green-800 mb-1">
                            End Date
                          </label>
                          <input
                            type="date"
                            defaultValue="2022-04-28"
                            className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                          />
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <div className="flex-1">
                          <label className="block text-green-800 mb-1">
                            Days Remaining
                          </label>
                          <input
                            type="number"
                            placeholder="0"
                            className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-green-800 mb-1">
                            New Resumption Date
                          </label>
                          <input
                            type="date"
                            className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                          />
                        </div>
                      </div>
                      <div className="flex justify-between gap-3 pt-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full bg-green-700 px-5 py-2 text-sm font-semibold text-white cursor-pointer hover:bg-green-800 active:scale-[0.98] transition-all"
                        >
                          Initiate Recall
                        </button>
                        <button
                          type="button"
                          onClick={closePopup}
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
                Leave History
              </h2>
              <div className="max-h-96 overflow-y-auto rounded-2xl border border-yellow-200">
                <table className="w-full border-collapse text-xs sm:text-sm">
                  <thead className="bg-yellow-200 text-green-900">
                    <tr className="text-[11px] sm:text-xs font-semibold uppercase tracking-wide">
                      <th className="p-3 text-left">Employee</th>
                      <th className="p-3 text-left">Type</th>
                      <th className="p-3 text-left">Start</th>
                      <th className="p-3 text-left">End</th>
                      <th className="p-3 text-left">Duration</th>
                      <th className="p-3 text-left">Reasons</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveData.map((item, index) => (
                      <tr
                        key={index}
                        className={`h-11 ${
                          index % 2 === 0 ? "bg-yellow-50" : "bg-white"
                        } hover:bg-yellow-100 transition`}
                      >
                        <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                          {item.name}
                        </td>
                        <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                          {item.type}
                        </td>
                        <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                          {item.start}
                        </td>
                        <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                          {item.end}
                        </td>
                        <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                          {item.duration}
                        </td>
                        <td className="p-3 text-[11px] sm:text-sm text-gray-800">
                          {item.reason}
                        </td>
                        <td className="relative p-3 sm:pr-4">
                          <button
                            onClick={() => toggleHistoryDropdown(index)}
                            className="inline-flex items-center gap-1 rounded-full bg-green-700 px-4 py-1.5 text-xs sm:text-sm font-semibold text-white cursor-pointer hover:bg-green-800 active:scale-[0.98] transition-all"
                          >
                            Actions <ChevronDown size={14} />
                          </button>
                          {openHistoryDropdown === index && (
                            <div className="absolute z-50 mt-2 w-32 bg-white border border-yellow-200 rounded-md shadow-lg overflow-hidden">
                              <button className="block w-full text-left px-3 py-2 text-sm text-green-900 hover:bg-yellow-50">
                                Approve
                              </button>
                              <button className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50">
                                Decline
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
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
