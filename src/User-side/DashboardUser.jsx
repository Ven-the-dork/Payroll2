import { useState } from "react";
import { Bell, User, Settings, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom"; 


export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
   const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800">
      {/* Top Navigation */}
      <header className="bg-white shadow-sm">
        <nav className="container mx-auto flex justify-between items-center px-6 py-4">
          <div className="flex items-center space-x-8">
            <h1 className="text-xl font-bold text-blue-600">Dashboard</h1>
            <div className="flex space-x-6 text-gray-600">
              {["Dashboard", "Requests", "Payroll", "Company", "Extras"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab.toLowerCase())}
                  className={`pb-1 border-b-2 cursor-pointer ${
                    activeTab === tab.toLowerCase()
                      ? "border-blue-500 text-blue-600 font-semibold"
                      : "border-transparent hover:text-blue-500"
                }`}
              >
            {tab}
            </button>
              ))}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Bell className="w-5 h-5 text-gray-600 hover:text-blue-500 cursor-pointer" />
            <User className="w-5 h-5 text-gray-600 hover:text-blue-500 cursor-pointer" />
            <Settings className="w-5 h-5 text-gray-600 hover:text-blue-500 cursor-pointer" />
            <button onClick={() => navigate("/")} className="cursor-pointer">
              <LogOut className="w-5 h-5 text-gray-600 hover:text-red-500" />
            </button>
          </div>

        </nav>
      </header>

      {/* Main Dashboard Content */}
      <main className="container mx-auto px-6 py-8">
        {/* Profile Card */}
        <div className="bg-green-700 text-white rounded-2xl p-6 flex justify-between items-center shadow-md">
          <div>
            <h2 className="text-2xl font-bold">User</h2>
            <p className="text-gray-300">Role</p>
          </div>
          <button className="bg-white text-black px-4 py-2 cursor-pointer rounded-lg font-semibold hover:bg-gray-100 transition">
            Edit Profile
          </button>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-wrap gap-4">
          {["Apply for Leave", "KPI Goals", "Take Appraisal", "View Payslip", "Update Profile", "Events"].map((action) => (
            <button
              key={action}
              className="bg-white border border-gray-200 shadow-sm rounded-lg px-4 py-2 text-gray-700 hover:bg-blue-50 transition cursor-pointer"
            >
              {action}
            </button>
          ))}
        </div>

        {/* Grid Sections */}
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Available Leave Days */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3">Available Leave Days</h3>
            <div className="space-y-3">
              <ProgressBar label="Annual Leave" value="10 of 20 days" percent={50} />
              <ProgressBar label="Sick Leave" value="6 of 10 days" percent={60} />
              <ProgressBar label="Compassionate Leave" value="8 of 10 days" percent={80} />
            </div>
          </div>

          {/* To-dos */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3">To-dos</h3>
            <ul className="space-y-2 text-sm">
              {[
                "Complete Onboarding Document Upload",
                "Follow up on client documents",
                "Design creative assets",
                "Schedule weekly call for HR project",
                "Follow up on client documents"
              ].map((task, i) => (
                <li key={i} className="p-2 bg-gray-100 rounded-md">{task}</li>
              ))}
            </ul>
          </div>

          {/* Pay Breakdown */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3">April Payslip Breakdown</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500">
                  <th className="text-left">Earnings</th>
                  <th className="text-left">Amount</th>
                  <th className="text-left">Deductions</th>
                  <th className="text-left">Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Basic Pay</td>
                  <td>₱60,000</td>
                  <td>₱12,000</td>
                  <td>₱48,000</td>
                </tr>
                <tr>
                  <td>Bonus</td>
                  <td>₱5,000</td>
                  <td>-</td>
                  <td>₱5,000</td>
                </tr>
                <tr className="font-semibold border-t">
                  <td colSpan="3" className="pt-2">Total Earnings</td>
                  <td className="pt-2">₱53,000</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Announcements */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3">Announcement(s)</h3>
            <ul className="space-y-2 text-sm">
              {[
                "Welcome message – new team member joining soon!",
                "Sandwich Project Manager kickoff at the meeting hall",
                "Office Space Update"
              ].map((note, i) => (
                <li key={i} className="p-2 bg-gray-100 rounded-md">{note}</li>
              ))}
            </ul>
          </div>

          {/* Birthdays */}
          <div className="bg-white p-4 rounded-xl shadow-sm">
            <h3 className="font-semibold mb-3">Birthdays</h3>
            <ul className="space-y-2 text-sm">
              {[
                "Brian Mathers - April 25th",
                "Judith Knight - April 25th",
                "Aiden Brown - April 25th"
              ].map((bday, i) => (
                <li key={i} className="p-2 bg-gray-100 rounded-md flex justify-between items-center">
                  {bday}
                  <button className="bg-blue-500 text-white px-2 py-1 text-xs rounded-lg hover:bg-blue-600 transition cursor-pointer">
                    Send Wish
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}

function ProgressBar({ label, value, percent }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-gray-500">{value}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}
