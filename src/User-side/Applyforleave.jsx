import { useState } from "react";
import { Bell, User, Settings, LogOut, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";

const LEAVE_OPTIONS = [
  { days: 60, label: "Annual Leave" },
  { days: 20, label: "Sick Leave" },
  { days: 60, label: "Maternity Leave" },
  { days: 30, label: "Compassionate Leave" },
];

export default function ApplyForLeaveMockup() {
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);

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
  }

  function closeModal() {
    setModalOpen(false);
    setSelectedLeave(null);
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {LEAVE_OPTIONS.map((opt) => (
              <LeaveTypeCard
                key={opt.label}
                days={opt.days}
                label={opt.label}
                onApply={() => openModal(opt)}
              />
            ))}
          </div>
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
                  <th className="p-2 font-semibold">Name(s)</th>
                  <th className="p-2 font-semibold">Duration(s)</th>
                  <th className="p-2 font-semibold">Start Date</th>
                  <th className="p-2 font-semibold">End Date</th>
                  <th className="p-2 font-semibold">Type</th>
                  <th className="p-2 font-semibold">Reason(s)</th>
                  <th className="p-2 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {[
                  {
                    name: "Abercener Iakobo",
                    duration: 60,
                    start: "22/04/2022",
                    end: "28/04/2022",
                    type: "Exam",
                    reason: "Examination",
                  },
                  {
                    name: "Abercener Iakobo",
                    duration: 130,
                    start: "22/04/2022",
                    end: "28/06/2022",
                    type: "Maternity",
                    reason: "Child Care",
                  },
                  {
                    name: "Abercener Iakobo",
                    duration: 5,
                    start: "22/04/2022",
                    end: "28/04/2022",
                    type: "Sick",
                    reason: "Personal",
                  },
                  {
                    name: "Abercener Iakobo",
                    duration: 6,
                    start: "22/04/2022",
                    end: "28/04/2022",
                    type: "Sick",
                    reason: "Personal",
                  },
                  {
                    name: "Abercener Iakobo",
                    duration: 20,
                    start: "22/04/2022",
                    end: "28/06/2022",
                    type: "Sick",
                    reason: "Personal",
                  },
                  {
                    name: "Abercener Iakobo",
                    duration: 5,
                    start: "22/04/2022",
                    end: "28/04/2022",
                    type: "Sick",
                    reason: "Personal",
                  },
                ].map((row, i) => (
                  <tr
                    className={i % 2 === 0 ? "bg-green-50" : "bg-yellow-50"}
                    key={i}
                  >
                    <td className="p-2">{row.name}</td>
                    <td className="p-2">{row.duration}</td>
                    <td className="p-2">{row.start}</td>
                    <td className="p-2">{row.end}</td>
                    <td className="p-2">{row.type}</td>
                    <td className="p-2">{row.reason}</td>
                    <td className="p-2">
                      <button className="bg-yellow-400 text-green-900 rounded w-20 py-1 text-xs font-bold hover:bg-green-700 hover:text-white transition cursor-pointer">
                        Actions
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && <Modal onClose={closeModal} leaveType={selectedLeave} />}
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

function Modal({ onClose, leaveType }) {
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
        {/* rest of the form unchanged */}
      </div>
    </div>
  );
}
