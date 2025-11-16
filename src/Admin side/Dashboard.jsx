import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
} from 'lucide-react';

export default function Dashboard() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? 'w-64' : 'w-20'
        } bg-green-700 text-white rounded-r-lg flex flex-col justify-between py-6 transition-all duration-300 relative`}
      >
        <div>
          {/* Profile Section */}
          <div
            className={`flex flex-col items-center mb-8 transition-all duration-300 ${
              !isOpen && 'hidden'
            }`}
          >
            <div className="w-20 h-20 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg">
              <span className="text-3xl font-bold text-green-800">👤</span>
            </div>
            <h2 className="mt-3 text-lg text-white font-bold">Name</h2>
            <p className="text-yellow-300 text-sm">Position</p>
          </div>
          {/* Features Section */}
          <div className="px-4">
            <h3 className={`text-yellow-300 text-xs uppercase mb-2 ${!isOpen && 'hidden'}`}>
              Features
            </h3>
            <nav className="space-y-1">
              {/* Dashboard */}
              <div className="relative group">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer bg-yellow-400 text-green-800 font-semibold">
                  <LayoutDashboard size={18} /> {isOpen && 'Dashboard'}
                </button>
              </div>
              {/* Messages */}
              <div className="relative group">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-yellow-300 hover:text-green-900 transition font-semibold">
                  <Mail size={18} /> {isOpen && 'Messages'}
                </button>
              </div>
            </nav>
            {/* Organization */}
            <h3 className={`text-yellow-300 text-xs uppercase mt-6 mb-2 ${!isOpen && 'hidden'}`}>
              Organization
            </h3>
            <nav className="space-y-1">
              {/* Employee Management */}
              <div className="relative group">
                <button
                  onClick={() => navigate("/employee")}
                  className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-yellow-300 hover:text-green-900 transition font-semibold"
                >
                  <Users size={18} /> {isOpen && "Employee Management"}
                </button>
              </div>
              {/* Leave Management */}
              <div className="relative group">
                <button
                  onClick={() => navigate('/leave-management')}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-yellow-300 hover:text-green-900 transition font-semibold"
                >
                  <CalendarDays size={18} /> {isOpen && 'Leave Management'}
                </button>
              </div>
              {/* Payroll Management */}
              <div className="relative group">
                <button className="w-full flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-yellow-300 hover:text-green-900 transition font-semibold">
                  <CreditCard size={18} /> {isOpen && 'Payroll Management'}
                </button>
              </div>
            </nav>
          </div>
        </div>
        {/* Logout Button */}
        <div className="px-6">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 bg-yellow-400 text-green-800 font-bold py-2 rounded-lg cursor-pointer hover:bg-yellow-300 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            <Power size={18} />
            {isOpen && 'Log Out'}
          </button>
        </div>
      </aside>
      {/* Main Content */}
      <main className="flex-1 p-8 overflow-x-hidden bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          {/* Sidebar toggle */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-green-700 cursor-pointer hover:text-yellow-400 transition"
          >
            <Menu size={28} />
          </button>
          {/* Center search bar */}
          <div className="flex-1 flex justify-center relative">
            <input
              type="text"
              placeholder="Search..."
              className="w-1/2 pl-4 pr-10 py-2 rounded-full border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-500 text-green-800 shadow-sm"
            />
            <Search
              size={18}
              className="absolute right-[calc(50%-10rem)] top-1/2 -translate-y-1/2 text-yellow-400 cursor-pointer"
            />
          </div>
          {/* Right-side icons */}
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
        {/* Dashboard Header */}
        <h1 className="text-3xl font-bold text-green-800 mb-6">Dashboard</h1>
        {/* Scrollable Indicator Cards */}
        <div className="flex overflow-x-auto gap-6 pb-6 no-scrollbar">
          {/* Messages */}
          <div className="flex-1 min-w-[250px] bg-green-700 text-yellow-300 rounded-2xl p-8 flex items-center justify-between shadow-lg">
            <Mail size={60} />
            <div className="text-right">
              <p className="text-4xl font-bold leading-none">4</p>
              <p className="text-lg mt-1">Messages</p>
            </div>
          </div>
          {/* Employees */}
          <div className="flex-1 min-w-[250px] bg-green-700 text-yellow-300 rounded-2xl p-8 flex items-center justify-between shadow-lg">
            <Users size={60} />
            <div className="text-right">
              <p className="text-4xl font-bold leading-none">12</p>
              <p className="text-lg mt-1">Employees</p>
            </div>
          </div>
          {/* Leaves */}
          <div className="flex-1 min-w-[250px] bg-green-700 text-yellow-300 rounded-2xl p-8 flex items-center justify-between shadow-lg">
            <CalendarDays size={60} />
            <div className="text-right">
              <p className="text-4xl font-bold leading-none">3</p>
              <p className="text-lg mt-1">Leaves</p>
            </div>
          </div>
          {/* Payrolls */}
          <div className="flex-1 min-w-[250px] bg-green-700 text-yellow-300 rounded-2xl p-8 flex items-center justify-between shadow-lg">
            <CreditCard size={60} />
            <div className="text-right">
              <p className="text-4xl font-bold leading-none">8</p>
              <p className="text-lg mt-1">Payrolls</p>
            </div>
          </div>
        </div>
        {/* Section Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Applied Jobs */}
          <div className="bg-yellow-50 rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-3">Applied Jobs</h2>
            <p className="text-green-700">Dashboard</p>
          </div>
          {/* Employees */}
          <div className="bg-yellow-50 rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-3">Employees</h2>
            <p className="text-green-700">Dashboard</p>
          </div>
          {/* Candidates */}
          <div className="bg-yellow-50 rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-3">Candidates</h2>
            <p className="text-green-700">Dashboard</p>
          </div>
          {/* Payrolls */}
          <div className="bg-yellow-50 rounded-2xl shadow-md p-6">
            <h2 className="text-lg font-semibold text-green-800 mb-3">Payrolls</h2>
            <p className="text-green-700">Dashboard</p>
          </div>
        </div>
      </main>
    </div>
  );
}
