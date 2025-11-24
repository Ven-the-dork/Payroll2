import { useState } from "react";
import { Bell, User, Settings, LogOut, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

const DEFAULT_PROFILE = {
  name: "Abercener Iakobo",
  email: "abercener@example.com",
  department: "HR",
  role: "Manager",
  contact: "+63 900 000 0000",
  address: "123 Main Street, City",
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const navigate = useNavigate();

  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [profile, setProfile] = useState(DEFAULT_PROFILE);

  // Show these actions:
  const quickActions = [
    {
      label: "Apply for Leave",
      onClick: () => navigate("/applyforleave"),
    },
    {
      label: "Update Profile",
      onClick: () => setProfileModalOpen(true),
    },
  ];

  function handleProfileChange(e) {
    setProfile((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  }

  return (
    <div className="min-h-screen bg-green-50 text-green-900">
      {/* Top Navigation */}
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

      {/* Main Dashboard Content */}
      <main className="container mx-auto px-2 sm:px-4 md:px-6 py-4 sm:py-8">
        {/* Profile Card */}
        <div className="bg-green-700 text-white rounded-2xl p-6 flex flex-col sm:flex-row justify-between items-center gap-4 shadow-lg">
          <div className="flex flex-col items-center sm:items-start">
            <h2 className="text-lg sm:text-2xl font-bold">{profile.name}</h2>
            <p className="text-yellow-200">{profile.role}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 flex flex-col sm:flex-row flex-wrap gap-2 sm:gap-4">
          {quickActions.map((action) => (
            <button
              key={action.label}
              className="bg-yellow-400 shadow px-6 py-2 rounded-lg font-semibold text-green-900 hover:bg-yellow-300 hover:scale-105 transition border-none flex-1 sm:flex-none cursor-pointer"
              onClick={action.onClick}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Grid Sections */}
        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Available Leave Days */}
          <div className="bg-green-700 p-4 rounded-xl shadow-lg text-white">
            <h3 className="font-bold mb-3 text-yellow-300">Available Leave Days</h3>
            <div className="space-y-3">
              <ProgressBar label="Annual Leave" value="10 of 20 days" percent={50} />
              <ProgressBar label="Sick Leave" value="6 of 10 days" percent={60} />
              <ProgressBar label="Compassionate Leave" value="8 of 10 days" percent={80} />
            </div>
          </div>

          {/* To-dos */}
          <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl shadow text-green-900">
            <h3 className="font-semibold mb-3 text-green-800">To-dos</h3>
            <ul className="space-y-2 text-sm">
              {[
                "Complete Onboarding Document Upload",
                "Follow up on client documents",
                "Design creative assets",
                "Schedule weekly call for HR project",
                "Follow up on client documents",
              ].map((task, i) => (
                <li key={i} className="p-2 bg-yellow-50 rounded-md">
                  {task}
                </li>
              ))}
            </ul>
          </div>

          {/* Pay Breakdown */}
          <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl shadow text-green-900">
            <h3 className="font-semibold mb-3 text-green-800">April Payslip Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[400px]">
                <thead>
                  <tr className="text-yellow-700">
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
                    <td colSpan="3" className="pt-2">
                      Total Earnings
                    </td>
                    <td className="pt-2">₱53,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Announcements */}
          <div className="bg-yellow-50 border-2 border-yellow-200 p-4 rounded-xl shadow text-green-900">
            <h3 className="font-semibold mb-3 text-green-800">Announcement(s)</h3>
            <ul className="space-y-2 text-sm">
              {[
                "Welcome message – new team member joining soon!",
                "Sandwich Project Manager kickoff at the meeting hall",
                "Office Space Update",
              ].map((note, i) => (
                <li key={i} className="p-2 bg-white rounded-md">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </main>
      {profileModalOpen && (
        <ProfileModal
          onClose={() => setProfileModalOpen(false)}
          profile={profile}
          onChange={handleProfileChange}
        />
      )}
    </div>
  );
}

function ProgressBar({ label, value, percent }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-yellow-100">{value}</span>
      </div>
      <div className="w-full bg-yellow-200 rounded-full h-2">
        <div
          className="bg-yellow-400 h-2 rounded-full"
          style={{ width: `${percent}%` }}
        ></div>
      </div>
    </div>
  );
}

// The modal for editing profile (with cursor pointers and blur backdrop)
function ProfileModal({ onClose, profile, onChange }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-blur bg-opacity-40 backdrop-blur-sm">
      <div className="bg-white rounded-xl max-w-lg w-full p-8 relative shadow-lg border-2 border-yellow-400 animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-green-800 hover:text-red-500 transition cursor-pointer"
        >
          <X size={24} />
        </button>
        <div className="flex flex-col items-center mb-5">
          <span className="text-3xl mb-2">📝</span>
          <h2 className="font-bold text-2xl text-center mb-1">Update Profile</h2>
          <p className="text-gray-500 text-sm text-center">You can edit your information below.</p>
        </div>
        <form className="space-y-4">
          <div>
            <label className="block mb-1 text-sm font-semibold">Full Name</label>
            <input
              name="name"
              value={profile.name}
              onChange={onChange}
              className="w-full rounded-md px-3 py-2 bg-yellow-50 border"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Email</label>
            <input
              name="email"
              value={profile.email}
              onChange={onChange}
              className="w-full rounded-md px-3 py-2 bg-yellow-50 border"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Department</label>
            <input
              name="department"
              value={profile.department}
              onChange={onChange}
              className="w-full rounded-md px-3 py-2 bg-yellow-50 border"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Role/Position</label>
            <input
              name="role"
              value={profile.role}
              onChange={onChange}
              className="w-full rounded-md px-3 py-2 bg-yellow-50 border"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Contact</label>
            <input
              name="contact"
              value={profile.contact}
              onChange={onChange}
              className="w-full rounded-md px-3 py-2 bg-yellow-50 border"
            />
          </div>
          <div>
            <label className="block mb-1 text-sm font-semibold">Address</label>
            <input
              name="address"
              value={profile.address}
              onChange={onChange}
              className="w-full rounded-md px-3 py-2 bg-yellow-50 border"
            />
          </div>
          <div className="flex gap-4 mt-4">
            <button
              type="submit"
              className="w-full bg-green-700 text-white py-2 rounded font-bold hover:bg-yellow-400 hover:text-green-900 transition cursor-pointer"
            >
              Save
            </button>
            <button
              type="reset"
              className="w-full bg-white border-2 border-black text-black py-2 rounded font-bold hover:bg-yellow-400 hover:text-green-900 transition cursor-pointer"
            >
              Reset
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
