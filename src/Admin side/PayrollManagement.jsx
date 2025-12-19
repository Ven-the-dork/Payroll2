import { useState, useEffect, useMemo } from "react";
import { 
  Menu, 
  Search, 
  Settings, 
  Download, 
  Calendar, 
  Users, 
  DollarSign, 
  Filter, 
  CheckSquare, 
  Square,
  ChevronRight
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";

import AdminBell from "../components/AdminBell";
import AdminSidebar from "../components/Adminnavbar/Payrolldashvar";
import FontSizeMenu from "../components/hooks/FontSizeMenu";
import AdminSetting from "../components/Adminsetting";

export default function PayrollManagement() {
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // UI
  const [searchTerm, setSearchTerm] = useState("");
  
  // Cutoff inputs
  const [startDate, setStartDate] = useState("2025-12-01");
  const [endDate, setEndDate] = useState("2025-12-31");

  // Data
  const [employees, setEmployees] = useState([]);
  const [attendanceCounts, setAttendanceCounts] = useState({}); // { [employee_id]: present_days }
  const [loadingEmployees, setLoadingEmployees] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  // Selection
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]); // uuid[]

  // Rate editing state
  const [savingRateById, setSavingRateById] = useState({}); // { [employee_id]: boolean }
  const [rateErrorById, setRateErrorById] = useState({}); // { [employee_id]: string }

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [processMsg, setProcessMsg] = useState("");

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

  const peso = (n) =>
    Number.isFinite(n)
      ? n.toLocaleString("en-PH", { style: "currency", currency: "PHP" })
      : "₱0.00";

  const setSavingFor = (id, val) => setSavingRateById((prev) => ({ ...prev, [id]: val }));
  const setRateErrorFor = (id, msg) => setRateErrorById((prev) => ({ ...prev, [id]: msg }));

  // 1) Load employees dynamically
  useEffect(() => {
    const loadEmployees = async () => {
      setLoadingEmployees(true);
      const { data, error } = await supabase
        .from("employees")
        .select("id, full_name, department, position, status, role, daily_rate")
        .eq("role", "user")
        .eq("status", "Active")
        .order("full_name", { ascending: true });

      if (error) {
        console.error("Load employees error:", error);
        setEmployees([]);
      } else {
        setEmployees((data || []).map((e) => ({ ...e, daily_rate: e.daily_rate ?? 0 })));
      }
      setLoadingEmployees(false);
    };
    loadEmployees();
  }, []);

  // 2) Load worked_days
  useEffect(() => {
    const loadAttendanceCounts = async () => {
      if (!startDate || !endDate) return;
      setLoadingAttendance(true);
      const { data, error } = await supabase
        .from("attendance_logs")
        .select("employee_id, shift_date")
        .gte("shift_date", startDate)
        .lte("shift_date", endDate)
        .not("clock_in_at", "is", null);

      if (error) {
        setAttendanceCounts({});
        setLoadingAttendance(false);
        return;
      }

      const counts = {};
      for (const row of data || []) {
        const key = row.employee_id;
        const day = row.shift_date;
        if (!counts[key]) counts[key] = new Set();
        counts[key].add(day);
      }

      const normalized = {};
      Object.keys(counts).forEach((k) => { normalized[k] = counts[k].size; });
      setAttendanceCounts(normalized);
      setLoadingAttendance(false);
    };
    loadAttendanceCounts();
  }, [startDate, endDate]);

  const filteredEmployees = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return employees;
    return employees.filter((e) => {
      const name = (e.full_name || "").toLowerCase();
      const dept = (e.department || "").toLowerCase();
      const pos = (e.position || "").toLowerCase();
      return name.includes(q) || dept.includes(q) || pos.includes(q);
    });
  }, [employees, searchTerm]);

  const toggleRow = (employeeId) => {
    setSelectedEmployeeIds((prev) =>
      prev.includes(employeeId) ? prev.filter((x) => x !== employeeId) : [...prev, employeeId]
    );
  };

  const toggleAll = () => {
    const visibleIds = filteredEmployees.map((e) => e.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedEmployeeIds.includes(id));
    if (allSelected) {
      setSelectedEmployeeIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedEmployeeIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleRateChange = (employeeId, value) => {
    setRateErrorFor(employeeId, "");
    setEmployees((prev) => prev.map((e) => (e.id === employeeId ? { ...e, daily_rate: value } : e)));
  };

  const saveRate = async (employeeId) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return;
    const rateNum = Number(emp.daily_rate);
    if (!Number.isFinite(rateNum) || rateNum < 0) {
      setRateErrorFor(employeeId, "Invalid rate");
      return;
    }
    setSavingFor(employeeId, true);
    setRateErrorFor(employeeId, "");
    try {
      const { error } = await supabase.from("employees").update({ daily_rate: rateNum }).eq("id", employeeId);
      if (error) throw error;
    } catch (err) {
      setRateErrorFor(employeeId, err?.message || "Failed to save");
    } finally {
      setSavingFor(employeeId, false);
    }
  };

  const rowsWithPreview = useMemo(() => {
    return filteredEmployees.map((e) => {
      const presentDays = attendanceCounts[e.id] || 0;
      const rate = Number(e.daily_rate) || 0;
      const grossPay = presentDays * rate;
      return { ...e, presentDays, grossPay };
    });
  }, [filteredEmployees, attendanceCounts]);

  const totalGross = useMemo(() => {
    return rowsWithPreview
      .filter((r) => selectedEmployeeIds.includes(r.id))
      .reduce((sum, r) => sum + (Number(r.grossPay) || 0), 0);
  }, [rowsWithPreview, selectedEmployeeIds]);

  const visibleIds = filteredEmployees.map((e) => e.id);
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedEmployeeIds.includes(id));

  const handleProcessPayroll = async () => {
    if (processing) return;
    setProcessMsg("");
    if (!startDate || !endDate) return setProcessMsg("Please select dates.");
    if (selectedEmployeeIds.length === 0) return setProcessMsg("Select at least 1 employee.");

    setProcessing(true);
    try {
      let runId = null;
      const { data: insertedRun, error: runInsertErr } = await supabase
        .from("payroll_runs")
        .insert([{ period_start: startDate, period_end: endDate }])
        .select("id")
        .maybeSingle();

      if (runInsertErr) {
        // Handle dup check logic (simplified for brevity)
        const { data: existingRun } = await supabase.from("payroll_runs").select("id").eq("period_start", startDate).eq("period_end", endDate).maybeSingle();
        runId = existingRun?.id ?? null;
      } else {
        runId = insertedRun?.id ?? null;
      }

      const records = rowsWithPreview
        .filter((r) => selectedEmployeeIds.includes(r.id))
        .map((r) => ({
          employee_id: r.id, period_start: startDate, period_end: endDate, gross_pay: Number(r.grossPay) || 0, status: "Paid", paid_at: new Date().toISOString(),
        }));

      const { error: recErr } = await supabase.from("payroll_records").upsert(records, { onConflict: "employee_id,period_start,period_end" });
      if (recErr) throw recErr;

      setProcessMsg(`Success! Run ID: ${runId}`);
      setSelectedEmployeeIds([]);
    } catch (err) {
      console.error(err); setProcessMsg(err?.message || "Failed.");
    } finally {
      setProcessing(false);
    }
  };

  const currentTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen flex bg-gray-50 font-sans text-gray-800">
      <AdminSidebar isOpen={isOpen} currentUser={currentUser} onLogout={handleLogout} onNavigate={(path) => navigate(path)} />

      <main className={`flex-1 flex flex-col transition-all duration-300 ${isOpen ? "lg:ml-0" : ""}`}>
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 sticky top-0 z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsOpen((s) => !s)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-800 tracking-tight">Payroll Processing</h1>
              <p className="text-xs text-gray-500 hidden sm:block">Calculate and disperse employee salaries</p>
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

          {/* Configuration Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
             <div className="flex flex-col md:flex-row gap-6 items-end">
                <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Calendar size={12}/> Cutoff Start</span>
                      <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                   </label>
                   <label className="block space-y-1.5">
                      <span className="text-xs font-bold text-gray-500 uppercase flex items-center gap-1"><Calendar size={12}/> Cutoff End</span>
                      <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none" />
                   </label>
                </div>
                
                <div className="w-full md:w-auto flex gap-3">
                   <button className="flex-1 md:flex-none flex items-center gap-2 px-5 py-2.5 bg-white border border-yellow-300 text-yellow-700 font-bold rounded-lg hover:bg-yellow-50 transition shadow-sm">
                      <Download size={16}/> Export Report
                   </button>
                </div>
             </div>
             {loadingAttendance && <p className="mt-2 text-xs text-orange-500 font-medium animate-pulse">Syncing attendance data...</p>}
             {processMsg && <div className={`mt-4 p-3 rounded-lg text-sm font-medium ${processMsg.includes('Success') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>{processMsg}</div>}
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
             <div className="bg-green-600 rounded-xl p-5 text-white shadow-lg shadow-green-100 flex items-center justify-between relative overflow-hidden">
                <div className="relative z-10">
                   <p className="text-green-100 text-xs font-bold uppercase mb-1">Selected Employees</p>
                   <p className="text-3xl font-extrabold">{selectedEmployeeIds.length}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm relative z-10"><Users size={24} className="text-white"/></div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
             </div>
             <div className="bg-yellow-400 rounded-xl p-5 text-green-900 shadow-lg shadow-yellow-100 flex items-center justify-between relative overflow-hidden">
                <div className="relative z-10">
                   <p className="text-green-800/70 text-xs font-bold uppercase mb-1">Total Gross Pay</p>
                   <p className="text-3xl font-extrabold">{peso(totalGross)}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-lg backdrop-blur-sm relative z-10"><DollarSign size={24} className="text-green-900"/></div>
                <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl"></div>
             </div>
          </div>

          {/* Table Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
             
             {/* Toolbar */}
             <div className="p-4 border-b border-gray-100 flex items-center gap-4 bg-gray-50/50">
                <div className="relative flex-1 max-w-md">
                   <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"/>
                   <input 
                      type="text" 
                      placeholder="Search employee..." 
                      value={searchTerm} 
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                   />
                </div>
             </div>

             <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                   <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500 font-semibold">
                         <th className="p-4 w-12 text-center">
                            <button onClick={toggleAll} className="text-gray-400 hover:text-green-600">
                               {allVisibleSelected ? <CheckSquare size={18}/> : <Square size={18}/>}
                            </button>
                         </th>
                         <th className="p-4">Employee</th>
                         <th className="p-4">Dept.</th>
                         <th className="p-4 text-center">Days</th>
                         <th className="p-4">Daily Rate</th>
                         <th className="p-4 text-right">Gross Pay</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-gray-50">
                      {loadingEmployees ? (
                         <tr><td colSpan="6" className="p-8 text-center text-gray-400">Loading directory...</td></tr>
                      ) : rowsWithPreview.length === 0 ? (
                         <tr><td colSpan="6" className="p-8 text-center text-gray-400">No employees match your search.</td></tr>
                      ) : (
                         rowsWithPreview.map((row) => {
                            const isSelected = selectedEmployeeIds.includes(row.id);
                            const errMsg = rateErrorById[row.id];
                            return (
                               <tr key={row.id} className={`group transition-colors ${isSelected ? 'bg-green-50/30' : 'hover:bg-gray-50'}`}>
                                  <td className="p-4 text-center">
                                     <button onClick={() => toggleRow(row.id)} className={`${isSelected ? 'text-green-600' : 'text-gray-300 group-hover:text-gray-400'}`}>
                                        {isSelected ? <CheckSquare size={18}/> : <Square size={18}/>}
                                     </button>
                                  </td>
                                  <td className="p-4">
                                     <div className="flex items-center gap-3">
                                        <div className="w-9 h-9 rounded-full bg-yellow-100 text-yellow-700 flex items-center justify-center font-bold text-xs">
                                           {row.full_name.charAt(0)}
                                        </div>
                                        <div>
                                           <div className="font-bold text-gray-800 text-sm">{row.full_name}</div>
                                           <div className="text-xs text-gray-400">{row.position}</div>
                                        </div>
                                     </div>
                                  </td>
                                  <td className="p-4 text-sm text-gray-600">{row.department}</td>
                                  <td className="p-4 text-center">
                                     <span className="inline-block px-2.5 py-0.5 rounded bg-gray-100 text-gray-700 font-bold text-xs">
                                        {attendanceCounts[row.id] ?? 0}
                                     </span>
                                  </td>
                                  <td className="p-4">
                                     <div className="relative max-w-[100px]">
                                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₱</span>
                                        <input 
                                           type="number" 
                                           value={row.daily_rate} 
                                           onChange={e => handleRateChange(row.id, e.target.value)}
                                           onBlur={() => saveRate(row.id)}
                                           className={`w-full pl-5 pr-2 py-1.5 rounded border text-sm font-medium focus:ring-2 outline-none ${errMsg ? 'border-red-300 focus:ring-red-200 bg-red-50' : 'border-gray-200 focus:ring-green-500'}`}
                                        />
                                     </div>
                                     {errMsg && <div className="text-[10px] text-red-500 mt-1">{errMsg}</div>}
                                  </td>
                                  <td className="p-4 text-right font-bold text-green-700 text-sm">
                                     {peso(Number(row.grossPay) || 0)}
                                  </td>
                               </tr>
                            );
                         })
                      )}
                   </tbody>
                </table>
             </div>
             
             {/* Sticky Footer Action Bar */}
             <div className="p-4 border-t border-gray-100 bg-gray-50 sticky bottom-0 z-10 flex justify-between items-center">
                <div className="text-sm text-gray-500">
                   <span className="font-bold text-gray-800">{selectedEmployeeIds.length}</span> employees selected for processing
                </div>
                <button 
                   onClick={handleProcessPayroll}
                   disabled={selectedEmployeeIds.length === 0 || processing}
                   className="flex items-center gap-2 bg-green-700 hover:bg-green-800 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-md shadow-green-200 transition-all transform active:scale-95"
                >
                   {processing ? "Processing..." : "Process Payroll"} <ChevronRight size={16}/>
                </button>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
