import { useState, useEffect } from "react";
import { Menu, Search, Settings, Download } from "lucide-react";

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

  // Load current user from sessionStorage
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

  // Fetch audit logs
  useEffect(() => {
    const fetchAuditLogs = async () => {
      setLoading(true);
      setError("");

      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("timestamp", { ascending: sortDirection === "asc" });

      if (filterAction !== "all") {
        query = query.eq("action", filterAction);
      }

      if (searchTerm.trim()) {
        query = query.or(
          `user_name.ilike.%${searchTerm}%,details.ilike.%${searchTerm}%`
        );
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
    return date.toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getActionBadge = (action) => {
    const badges = {
      admin_login: { bg: "bg-blue-100", text: "text-blue-800", border: "border-blue-300" },
      admin_logout: { bg: "bg-gray-100", text: "text-gray-800", border: "border-gray-300" },
      created_employee: { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" },
      deleted_employee: { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" },
      updated_employee: { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" },
      approved_leave: { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" },
      rejected_leave: { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" },
    };

    return badges[action] || {
      bg: "bg-gray-100",
      text: "text-gray-800",
      border: "border-gray-300",
    };
  };

  const exportToCSV = () => {
    const headers = ["Timestamp", "Action", "Performed By", "Details"];
    const rows = auditLogs.map((log) => [
      formatDate(log.timestamp),
      log.action,
      log.user_name || "System",
      log.details,
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
   
      <AdminSidebar
        isOpen={isOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={(path) => navigate(path)}
        activePath="/audit-logs"  // if your sidebar supports it; otherwise remove
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden bg-white">
        {/* Top bar */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-6">
          <button
            onClick={() => setIsOpen((s) => !s)}
            className="self-start text-green-700 cursor-pointer hover:text-yellow-400 transition"
          >
            <Menu size={28} />
          </button>

          {/* Search + toolbar */}
          <div className="flex-1 flex flex-col items-center">
            <div className="w-full md:max-w-xl relative mb-2">
              <input
                type="text"
                placeholder="Search audit logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-full border-2 border-yellow-300 px-4 pr-10 py-2 text-sm md:text-base text-green-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              />
              <Search
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400"
              />
            </div>

            <div className="flex flex-wrap justify-center gap-2 text-xs sm:text-sm">
              <select
                value={filterAction}
                onChange={(e) => setFilterAction(e.target.value)}
                className="px-3 py-1.5 rounded-full border border-yellow-300 bg-white text-green-800 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="all">All Actions</option>
                <option value="admin_login">Login</option>
                <option value="admin_logout">Logout</option>
                <option value="created_employee">Created Employee</option>
                <option value="deleted_employee">Deleted Employee</option>
                <option value="updated_employee">Updated Employee</option>
              </select>

              <button
                onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
                className="px-3 py-1.5 rounded-full border border-yellow-300 bg-white text-green-800 text-xs sm:text-sm hover:bg-yellow-100 transition"
              >
                {sortDirection === "asc" ? "↑ Oldest First" : "↓ Newest First"}
              </button>

              <button
                onClick={exportToCSV}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-green-700 bg-green-700 text-white text-xs sm:text-sm hover:bg-green-800 transition"
              >
                <Download size={14} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Icon buttons */}
          <div className="flex items-center gap-3 md:gap-4 md:ml-6 self-end md:self-auto">
            <AdminBell />
              <AdminSetting
              trigger={
                <button
                  type="button"
                  className="flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-yellow-400 text-green-900 hover:bg-yellow-300 transition"
                  aria-label="Settings"
                >
                  <Settings size={18} />
                </button>
              }
            >
              {({ close }) => <FontSizeMenu closeMenu={close} />}
            </AdminSetting>
          </div>
        </div>

        {/* Page title */}
        <h1 className="text-3xl md:text-4xl font-extrabold text-green-800 mb-3">
          Audit Logs
        </h1>
        <p className="text-gray-600 mb-6">Complete activity history and audit trail</p>

        {/* Table */}
        <div className="mt-2 rounded-3xl bg-white shadow-sm border border-yellow-100 px-4 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6">
          {loading && <p className="mb-2 text-sm text-gray-500">Loading audit logs...</p>}
          {error && <p className="mb-2 text-sm text-red-600">{error}</p>}

          {!loading && !error && (
            <div className="max-h-[650px] overflow-x-auto overflow-y-auto border border-yellow-200 rounded-2xl">
              <table className="min-w-[900px] w-full border-collapse text-sm">
                <thead className="sticky top-0 bg-yellow-200 text-green-900 z-10">
                  <tr className="text-xs sm:text-sm font-semibold uppercase tracking-wide">
                    <th className="p-4 text-left">Timestamp</th>
                    <th className="p-4 text-left">Action</th>
                    <th className="p-4 text-left">Performed By</th>
                    <th className="p-4 text-left">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="p-8 text-center text-gray-500">
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log, idx) => {
                      const badge = getActionBadge(log.action);
                      return (
                        <tr
                          key={log.id}
                          className={`h-14 sm:h-16 ${
                            idx % 2 === 0 ? "bg-yellow-50" : "bg-white"
                          } hover:bg-yellow-100 transition`}
                        >
                          <td className="p-4 text-sm text-gray-600">
                            {formatDate(log.timestamp)}
                          </td>
                          <td className="p-4">
                            <span
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${badge.bg} ${badge.text} border ${badge.border}`}
                            >
                              {log.action.replace(/_/g, " ").toUpperCase()}
                            </span>
                          </td>
                          <td className="p-4 text-sm text-gray-800 font-medium">
                            {log.user_name || "System"}
                          </td>
                          <td className="p-4 text-sm text-gray-600">{log.details}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && auditLogs.length > 0 && (
            <div className="mt-4 text-sm text-gray-600">
              Showing {auditLogs.length} log{auditLogs.length !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
