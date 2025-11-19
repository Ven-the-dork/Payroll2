import { Bell, User, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom"; 

export default function ApplyForLeaveMockup() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-green-50 text-green-900 font-sans">
      {/* Top bar with icons rightmost */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto flex justify-between items-center px-2 sm:px-4 md:px-6 py-3 sm:py-4">
          <div className="flex items-center space-x-4 sm:space-x-8">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-green-700">Dashboard</h1>
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <Bell className="w-5 h-5 text-green-600 hover:text-yellow-500 cursor-pointer transition" />
            <User className="w-5 h-5 text-green-600 hover:text-yellow-500 cursor-pointer transition" />
            <Settings className="w-5 h-5 text-green-600 hover:text-yellow-500 cursor-pointer transition" />
            <button onClick={() => navigate("/")} className="cursor-pointer">
              <LogOut className="w-5 h-5 text-green-600 hover:text-red-500 transition" />
            </button>
          </div>
        </nav>
      </header>

      {/* Breadcrumb */}
      <div className="w-full max-w-6xl mx-auto mt-6 mb-2">
        <div className="text-xs bg-white px-4 py-2 rounded border border-yellow-100 text-green-700 mb-2">
          Dashboard {'>'} Apply for Leave
        </div>

        {/* Leave Application Cards */}
        <div className="bg-white rounded p-4 mb-3 flex items-center gap-4 overflow-x-auto">
          <LeaveTypeCard days={60} label="Annual Leave" />
          <LeaveTypeCard days={20} label="Sick Leave" />
          <LeaveTypeCard days={60} label="Maternity Leave" />
          <LeaveTypeCard days={30} label="Compassionate Leave" />
        </div>

        {/* Leave History */}
        <div className="bg-white rounded p-4 shadow border border-yellow-200">
          <div className="flex justify-between mb-2 items-center">
            <span className="font-bold text-base text-green-800">Leave History</span>
            <div className="flex items-center gap-2">
              <button className="h-8 px-4 bg-yellow-400 text-green-900 text-xs rounded font-bold hover:bg-yellow-300 transition">Export</button>
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
                  <tr className={i % 2 === 0 ? "bg-green-50" : "bg-yellow-50"} key={i}>
                    <td className="p-2">{row.name}</td>
                    <td className="p-2">{row.duration}</td>
                    <td className="p-2">{row.start}</td>
                    <td className="p-2">{row.end}</td>
                    <td className="p-2">{row.type}</td>
                    <td className="p-2">{row.reason}</td>
                    <td className="p-2">
                      <button className="bg-yellow-400 text-green-900 rounded w-20 py-1 text-xs font-bold hover:bg-green-700 hover:text-white transition">Actions</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function LeaveTypeCard({ days, label }) {
  return (
    <div className="bg-green-900 text-yellow-400 rounded shadow min-w-[150px] flex flex-col items-center justify-between px-6 py-3 border-2 border-yellow-300">
      <span className="text-2xl font-bold">{days}</span>
      <span className="font-bold">{label}</span>
      <button className="mt-2 px-4 py-1 bg-green-700 text-white rounded text-xs font-bold hover:bg-yellow-400 hover:text-green-900 transition">
        Apply
      </button>
    </div>
  );
}
