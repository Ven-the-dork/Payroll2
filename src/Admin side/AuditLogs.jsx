import { useState, useEffect } from "react";
import { 
  Menu, 
  Search, 
  Settings, 
  Download, 
  FileText, 
  Filter, 
  Clock, 
  User, 
  Activity,
  ArrowUpDown
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import AdminBell from "../components/AdminBell";
import AdminSidebar from "../components/Adminnavbar/Auditdashvar"; 
import FontSizeMenu from "../components/hooks/FontSizeMenu";
import AdminSetting from "../components/Adminsetting";

export default function AuditLogs() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState("all");
  const [sortDirection, setSortDirection] = useState("desc");

  const handleLogout = async () => {
    await signOut(auth);
    sessionStorage.removeItem("user");
    navigate("/", { replace: true });
  };

  useEffect(() => {
    const stored = sessionStorage.getItem("user");
    if (stored) {
      try { setCurrentUser(JSON.parse(stored)); } catch { setCurrentUser(null); }
    }
  }, []);

  useEffect(() => {
    const fetchAuditLogs = async () => {
      setLoading(true);
      setError("");

      let query = supabase.from("audit_logs").select("*").order("timestamp", { ascending: sortDirection === "asc" });

      if (filterAction !== "all") {
        query = query.eq("action", filterAction);
      }

      if (searchTerm.trim()) {
        query = query.or(`user_name.ilike.%${searchTerm}%,details.ilike.%${searchTerm}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("Error fetching audit logs:", fetchError);
        setError("Failed to load audit logs. Please try again.");
      } else {
        setAuditLogs(data || []);
      }
      setLoading(false);
    };

    fetchAuditLogs();
  }, [searchTerm, filterAction, sortDirection]);

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const getActionBadge = (action) => {
    const badges = {
      admin_login: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", ring: "ring-blue-600/20" },
      admin_logout: { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", ring: "ring-gray-600/20" },
      created_employee: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", ring: "ring-green-600/20" },
      deleted_employee: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", ring: "ring-red-600/20" },
      updated_employee: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", ring: "ring-yellow-600/20" },
      approved_leave: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", ring: "ring-emerald-600/20" },
      rejected_leave: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200", ring: "ring-orange-600/20" },
      recalled_leave: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", ring: "ring-purple-600/20" },
    };

    return badges[action] || { bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", ring: "ring-gray-600/20" };
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "Action", "Performed By", "Details"];
    const rows = auditLogs.map((log) => [
      formatDate(log.timestamp), log.action, log.user_name || "System", log.details,
    ]);
    const csvContent = [headers.join(","), ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans text-gray-800">
      <AdminSidebar isOpen={isOpen} currentUser={currentUser} onLogout={handleLogout} onNavigate={(path) => navigate(path)} activePath="/audit-logs" />

      <main className={`flex-1 flex flex-col transition-all duration-300 ${isOpen ? "lg:ml-0" : ""}`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsOpen((s) => !s)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">Audit Logs</h1>
              <p className="text-xs text-gray-500 hidden sm:block">System activity and security trail</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <span className="hidden md:block text-xs text-gray-400 font-medium">Last updated: {currentTime}</span>
             <div className="h-6 w-px bg-gray-200 mx-2 hidden md:block"></div>
             <AdminBell />
             <AdminSetting trigger={<button className="w-10 h-10 rounded-full bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border border-yellow-200 flex items-center justify-center"><Settings size={20}/></button>}>
               {({ close }) => <FontSizeMenu closeMenu={close} />}
             </AdminSetting>
          </div>
        </header>

        <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">

           {/* Filter Card */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                 {/* Search */}
                 <div className="md:col-span-5 relative">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1.5"><Search size={12}/> Search Logs</label>
                    <div className="relative">
                       <input 
                         type="text" 
                         placeholder="Search user, action, details..." 
                         value={searchTerm} 
                         onChange={e => setSearchTerm(e.target.value)}
                         className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                       />
                       <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                    </div>
                 </div>

                 {/* Action Filter */}
                 <div className="md:col-span-3">
                    <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1 mb-1.5"><Filter size={12}/> Filter Action</label>
                    <select value={filterAction} onChange={e => setFilterAction(e.target.value)} className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none cursor-pointer">
                        <option value="all">All Actions</option>
                        <option value="admin_login">Login</option>
                        <option value="admin_logout">Logout</option>
                        <option value="created_employee">Created Employee</option>
                        <option value="deleted_employee">Deleted Employee</option>
                        <option value="updated_employee">Updated Employee</option>
                        <option value="approved_leave">Approved Leave</option>
                        <option value="rejected_leave">Rejected Leave</option>
                    </select>
                 </div>

                 {/* Sort & Export Actions */}
                 <div className="md:col-span-4 flex gap-2">
                    <button 
                       onClick={() => setSortDirection(d => d === 'asc' ? 'desc' : 'asc')}
                       className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-bold transition shadow-sm"
                    >
                       <ArrowUpDown size={16}/> {sortDirection === 'asc' ? 'Oldest' : 'Newest'}
                    </button>
                    <button 
                       onClick={exportToCSV}
                       className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-sm font-bold transition shadow-green-200 shadow-md"
                    >
                       <Download size={16}/> CSV
                    </button>
                 </div>
              </div>
           </div>

           {/* Logs Table Card */}
           <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col min-h-[500px]">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/30">
                 <h3 className="font-bold text-gray-800 flex items-center gap-2"><FileText size={18} className="text-gray-400"/> Activity History</h3>
                 <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{auditLogs.length} entries</span>
              </div>
              
              <div className="overflow-x-auto flex-1">
                 <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold sticky top-0 z-10">
                       <tr>
                          <th className="p-4 w-48"><div className="flex items-center gap-1"><Clock size={14}/> Timestamp</div></th>
                          <th className="p-4 w-48"><div className="flex items-center gap-1"><Activity size={14}/> Action</div></th>
                          <th className="p-4 w-48"><div className="flex items-center gap-1"><User size={14}/> User</div></th>
                          <th className="p-4">Details</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                       {loading ? (
                          <tr><td colSpan="4" className="p-12 text-center text-gray-400 animate-pulse">Fetching audit logs...</td></tr>
                       ) : error ? (
                          <tr><td colSpan="4" className="p-12 text-center text-red-500 font-medium">{error}</td></tr>
                       ) : auditLogs.length === 0 ? (
                          <tr><td colSpan="4" className="p-12 text-center text-gray-400">No matching logs found.</td></tr>
                       ) : (
                          auditLogs.map((log) => {
                             const badge = getActionBadge(log.action);
                             return (
                                <tr key={log.id} className="hover:bg-gray-50/80 transition-colors group">
                                   <td className="p-4 whitespace-nowrap text-gray-500 font-mono text-xs">{formatDate(log.timestamp)}</td>
                                   <td className="p-4">
                                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wide ring-1 ring-inset ${badge.bg} ${badge.text} ${badge.ring}`}>
                                         {log.action.replace(/_/g, " ")}
                                      </span>
                                   </td>
                                   <td className="p-4">
                                      <div className="font-bold text-gray-700 text-sm flex items-center gap-2">
                                         <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-500">
                                            {log.user_name ? log.user_name.charAt(0) : "S"}
                                         </div>
                                         {log.user_name || "System"}
                                      </div>
                                   </td>
                                   <td className="p-4 text-gray-600 text-sm leading-relaxed max-w-lg truncate group-hover:whitespace-normal group-hover:overflow-visible group-hover:bg-white group-hover:shadow-lg group-hover:rounded-lg group-hover:z-20 relative transition-all">
                                      {log.details}
                                   </td>
                                </tr>
                             );
                          })
                       )}
                    </tbody>
                 </table>
              </div>
           </div>
        </div>
      </main>
    </div>
  );
}
