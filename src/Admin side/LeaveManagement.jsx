import { useState } from 'react';
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
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LeaveManagement() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [openDropdown, setOpenDropdown] = useState(null);
  const [openHistoryDropdown, setOpenHistoryDropdown] = useState(null);

  const toggleTab = (tabName) => {
    setActiveTab(activeTab === tabName ? null : tabName);
  };

  const handleRecallClick = (employee) => {
    setSelectedEmployee(employee);
    setShowPopup(true);
  };

  const closePopup = () => {
    setShowPopup(false);
    setSelectedEmployee(null);
  };

  const toggleDropdown = (index) => {
    setOpenDropdown(openDropdown === index ? null : index);
  };

  const toggleHistoryDropdown = (index) => {
    setOpenHistoryDropdown(openHistoryDropdown === index ? null : index);
  };

  // Hardcoded data for recall and settings
  const leaveData = [
    { name: 'John Doe', duration: 5, start: '22/04/2022', end: '28/04/2022', type: 'Casual', reason: 'Personal' },
    { name: 'Jane Smith', duration: 7, start: '22/04/2022', end: '30/04/2022', type: 'Casual', reason: 'Vacation' },
    { name: 'Mike Johnson', duration: 7, start: '22/04/2022', end: '28/06/2022', type: 'Sick', reason: 'Medical' },
    { name: 'Sarah Lee', duration: 5, start: '22/04/2022', end: '28/04/2022', type: 'Casual', reason: 'Family' },
    { name: 'Alex Tan', duration: 5, start: '22/04/2022', end: '28/04/2022', type: 'Vacation', reason: 'Trip' },
  ];

  const leaveSettings = [
    { plan: 'Maternity', duration: 60, recall: 'No', autoRenew: 'No' },
    { plan: 'Sick', duration: 14, recall: 'No', autoRenew: 'Yes' },
    { plan: 'Compassionate', duration: 30, recall: 'No', autoRenew: 'No' },
    { plan: 'Exam', duration: 20, recall: 'No', autoRenew: 'No' },
    { plan: 'Paternity', duration: 60, recall: 'No', autoRenew: 'No' },
    { plan: 'Casual', duration: 10, recall: 'Yes', autoRenew: 'No' },
  ];

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          isOpen ? 'w-64' : 'w-20'
        } bg-green-700 text-white rounded-r-lg flex flex-col justify-between py-6 transition-all duration-300 relative`}
      >
        <div>
          {/* Profile Section */}
          <div className={`flex flex-col items-center mb-8 transition-all duration-300 ${!isOpen && 'hidden'}`}>
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
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center gap-3 px-3 py-2 cursor-pointer rounded-lg hover:bg-yellow-300 hover:text-green-900 transition font-semibold"
              >
                <LayoutDashboard size={18} /> {isOpen && 'Dashboard'}
              </button>
              <button className="w-full flex items-center gap-3 px-3 cursor-pointer py-2 rounded-lg hover:bg-yellow-300 hover:text-green-900 transition font-semibold">
                <Mail size={18} /> {isOpen && 'Messages'}
              </button>
            </nav>
            {/* Organization */}
            <h3 className={`text-yellow-300 text-xs uppercase mt-6 mb-2 ${!isOpen && 'hidden'}`}>
              Organization
            </h3>
            <nav className="space-y-1">
              <button
                onClick={() => navigate("/employee")}
                className="w-full flex items-center gap-3 px-3 cursor-pointer py-2 rounded-lg hover:bg-yellow-300 hover:text-green-900 transition font-semibold"
              >
                <Users size={18} /> {isOpen && "Employee Management"}
              </button>
              <button className="w-full flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg bg-yellow-400 text-green-900 font-semibold transition">
                <CalendarDays size={18} /> {isOpen && 'Leave Management'}
              </button>
              <button className="w-full flex items-center gap-3 cursor-pointer px-3 py-2 rounded-lg hover:bg-yellow-300 hover:text-green-900 transition font-semibold">
                <CreditCard size={18} /> {isOpen && 'Payroll Management'}
              </button>
            </nav>
          </div>
        </div>
        {/* Logout Button */}
        <div className="px-6">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center justify-center gap-2 cursor-pointer bg-yellow-400 text-green-800 font-bold py-2 rounded-lg hover:bg-yellow-300 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            <Power size={18} />
            {isOpen && 'Log Out'}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto overflow-x-hidden bg-white">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
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
              className="w-1/2 pl-4 pr-10 py-2 rounded-full border border-yellow-200 focus:outline-none focus:ring-2 focus:ring-green-600 text-green-800 shadow-sm"
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

        {/* Header */}
        <h1 className="text-3xl font-bold text-green-800 mb-6">Leave Management</h1>

        {/* Toggle Buttons */}
        <div className="flex justify-center gap-8 mb-6">
          <button
            onClick={() => toggleTab('settings')}
            className={`px-10 py-3 rounded-lg cursor-pointer shadow-md transition ${
              activeTab === 'settings'
                ? 'bg-yellow-400 text-green-900 font-bold'
                : 'bg-green-700 text-white hover:bg-yellow-400 hover:text-green-900'
            }`}
          >
            Leave Settings
          </button>
          <button
            onClick={() => toggleTab('recall')}
            className={`px-10 py-3 rounded-lg cursor-pointer shadow-md transition ${
              activeTab === 'recall'
                ? 'bg-yellow-400 text-green-900 font-bold'
                : 'bg-green-700 text-white hover:bg-yellow-400 hover:text-green-900'
            }`}
          >
            Leave Recall
          </button>
          <button
            onClick={() => toggleTab('history')}
            className={`px-10 py-3 rounded-lg cursor-pointer shadow-md transition ${
              activeTab === 'history'
                ? 'bg-yellow-400 text-green-900 font-bold'
                : 'bg-green-700 text-white hover:bg-yellow-400 hover:text-green-900'
            }`}
          >
            Leave History
          </button>
        </div>

        {/* Leave Settings */}
        {activeTab === 'settings' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Create Leave Settings */}
            <div className="p-6 bg-white rounded-2xl shadow-md">
              <h2 className="text-lg font-semibold underline mb-4 text-green-800">Create Leave Settings</h2>
              <form className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-green-800 font-semibold">Leave Plan Name</label>
                    <input type="text" placeholder="Maternity" className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200" />
                  </div>
                  <div>
                    <label className="text-sm text-green-800 font-semibold">Duration (days)</label>
                    <input type="number" placeholder="60" className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-green-800 font-semibold">Do you want to activate Leave Recall for this plan?</label>
                  <select className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200">
                    <option>Select option</option>
                    <option>Yes</option>
                    <option>No</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-green-800 font-semibold">Activate leave bonus?</label>
                    <select className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200">
                      <option>Select option</option>
                      <option>Yes</option>
                      <option>No</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm text-green-800 font-semibold">Bonus percentage?</label>
                    <input type="number" placeholder="%" className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200" />
                  </div>
                </div>
                <div>
                  <label className="text-sm text-green-800 font-semibold">Select Leave Allocation</label>
                  <select className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200">
                    <option>Senior Level</option>
                    <option>Junior Level</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-green-800 font-semibold">Reason for Recall</label>
                  <textarea className="w-full p-2 bg-yellow-50 rounded-md border border-yellow-200" rows="2"></textarea>
                </div>
                <button type="button" className="w-full bg-green-700 text-white cursor-pointer py-2 rounded-md hover:bg-yellow-400 hover:text-green-900 font-bold">
                  Create
                </button>
              </form>
            </div>
            {/* Manage Leave Settings */}
            <div className="p-6 bg-white rounded-2xl shadow-md">
              <h2 className="text-lg font-semibold mb-4 text-green-800">Manage Leave Settings</h2>
              <div className="max-h-96 overflow-y-auto">
                <table className="w-full border-collapse text-sm">
                  <thead className="bg-yellow-200 text-green-800">
                    <tr>
                      <th className="p-3 text-left">Leave Plan</th>
                      <th className="p-3 text-left">Duration</th>
                      <th className="p-3 text-left">Recall / AutoRenew</th>
                      <th className="p-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leaveSettings.map((setting, index) => (
                      <tr key={index} className={`${index % 2 === 0 ? "bg-yellow-50" : "bg-white"} hover:bg-yellow-100`}>
                        <td className="p-3">{setting.plan}</td>
                        <td className="p-3">{setting.duration}</td>
                        <td className="p-3">{`${setting.recall} / ${setting.autoRenew}`}</td>
                        <td className="relative  p-3">
                          <button 
                            onClick={() => toggleDropdown(index)}
                            className="bg-green-700 text-white px-4 py-1 rounded-md cursor-pointer flex items-center gap-1 hover:bg-yellow-400 hover:text-green-900"
                          >Actions<ChevronDown size={16} />
                          </button>
                          {openDropdown === index &&(
                            <div className="absolute z-50 mt-2 w-28 bg-yellow-400 border border-yellow-200 rounded-md shadow-lg">
                              <button className="block w-full text-left px-3 py-2 cursor-pointer hover:bg-yellow-100 text-sm">Edit</button>
                              <button className="block w-full text-left px-3 py-2 cursor-pointer hover:bg-yellow-100 text-sm text-red-600">Delete</button>
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
        {activeTab === 'recall' && (
          <div className="p-6 bg-white rounded-2xl shadow-md relative">
            <h2 className="text-lg font-semibold mb-4 text-green-800">Ongoing Leave Applications</h2>
            <div className="max-h-80 overflow-y-auto rounded-lg border border-yellow-200">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-yellow-200 text-green-800 z-10">
                  <tr>
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
                    <tr key={index} className={`${index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'} hover:bg-yellow-100`}>
                      <td className="p-3">{leave.name}</td>
                      <td className="p-3">{leave.duration}</td>
                      <td className="p-3">{leave.start}</td>
                      <td className="p-3">{leave.end}</td>
                      <td className="p-3">{leave.type}</td>
                      <td className="p-3">{leave.reason}</td>
                      <td className="p-3">
                        <button
                          onClick={() => handleRecallClick(leave)}
                          className="bg-green-700 text-white cursor-pointer px-4 py-1 rounded hover:bg-yellow-400 hover:text-green-900 font-bold"
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
                <div className="bg-white rounded-2xl shadow-lg p-6 w-[450px] relative">
                  <button
                    className="absolute top-3 right-3 text-green-700 hover:text-yellow-400 text-xl"
                    onClick={closePopup}
                  >
                    &times;
                  </button>
                  <div className="flex items-center mb-4">
                    <span className="text-2xl mr-2">🔁</span>
                    <h2 className="text-lg font-semibold text-green-800">Leave Recall</h2>
                  </div>
                  <p className="text-green-800 mb-4 text-sm">
                    Fill in the required details to recall this employee
                  </p>
                  <form className="space-y-3">
                    <div>
                      <label className="block text-green-800 text-sm mb-1">Employee Name</label>
                      <input
                        type="text"
                        value={selectedEmployee?.name || ''}
                        readOnly
                        className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                      />
                    </div>
                    <div>
                      <label className="block text-green-800 text-sm mb-1">Department</label>
                      <input
                        type="text"
                        placeholder="Enter department"
                        className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                      />
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-green-800 text-sm mb-1">Start Date</label>
                        <input
                          type="date"
                          value="2022-04-22"
                          className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-green-800 text-sm mb-1">End Date</label>
                        <input
                          type="date"
                          value="2022-04-28"
                          className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="block text-green-800 text-sm mb-1">Days Remaining</label>
                        <input
                          type="number"
                          placeholder="0"
                          className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-green-800 text-sm mb-1">New Resumption Date</label>
                        <input
                          type="date"
                          className="w-full bg-yellow-50 border border-yellow-200 rounded-md p-2"
                        />
                      </div>
                    </div>
                    <div className="flex justify-between mt-4">
                      <button
                        type="button"
                        className="bg-green-700 text-white px-5 cursor-pointer py-2 rounded-md hover:bg-yellow-400 hover:text-green-900 font-bold"
                      >
                        Initiate Recall
                      </button>
                      <button
                        type="button"
                        onClick={closePopup}
                        className="border border-green-700 text-green-700 px-5 py-2 cursor-pointer rounded-md hover:bg-yellow-100"
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
        {activeTab === 'history' && (
          <div className="p-6 bg-white rounded-2xl shadow-md">
            <h2 className="text-xl text-green-800 mb-3">Leave History</h2>
            <div className="max-h-96 overflow-y-auto">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-yellow-200 text-green-800">
                  <tr>
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
                    <tr key={index} className={`${index % 2 === 0 ? 'bg-yellow-50' : 'bg-white'} hover:bg-yellow-100`}>
                      <td className="p-3">{item.name}</td>
                      <td className="p-3">{item.type}</td>
                      <td className="p-3">{item.start}</td>
                      <td className="p-3">{item.end}</td>
                      <td className="p-3">{item.duration}</td>
                      <td className="p-3">{item.reason}</td>
                      <td className="relative p-3">
                        <button
                          onClick={() => toggleHistoryDropdown(index)}
                          className="bg-green-700 text-white px-4 py-1 rounded-md cursor-pointer flex items-center gap-1 hover:bg-yellow-400 hover:text-green-900 font-bold"
                        >
                          Actions <ChevronDown size={16} />
                        </button>
                        {openHistoryDropdown === index && (
                          <div className="absolute z-50 mt-2 w-28 bg-yellow-400 border border-yellow-200 rounded-md shadow-lg">
                            <button className="block w-full text-left px-3 py-2 cursor-pointer hover:bg-yellow-100 text-sm">Approve</button>
                            <button className="block w-full text-left px-3 py-2 cursor-pointer hover:bg-yellow-100 text-sm text-red-600">Decline</button>
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
      </main>
    </div>
  );
}