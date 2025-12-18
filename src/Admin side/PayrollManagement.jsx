import { useState, useEffect, useMemo } from "react";
import { Menu, Search, Settings, Download } from "lucide-react";

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
  const [selectedPeriod, setSelectedPeriod] = useState("Custom");

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

  const peso = (n) =>
    Number.isFinite(n)
      ? n.toLocaleString("en-PH", { style: "currency", currency: "PHP" })
      : "₱0.00";

  const setSavingFor = (id, val) => {
    setSavingRateById((prev) => ({ ...prev, [id]: val }));
  };

  const setRateErrorFor = (id, msg) => {
    setRateErrorById((prev) => ({ ...prev, [id]: msg }));
  };

  // 1) Load employees dynamically (role=user, Active only)
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
        setEmployees(
          (data || []).map((e) => ({
            ...e,
            daily_rate: e.daily_rate ?? 0,
          }))
        );
      }

      setLoadingEmployees(false);
    };

    loadEmployees();
  }, []);

  // 2) Load worked_days per employee for selected cutoff (clock_in_at != null)
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
        console.error("Load attendance counts error:", error);
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
      Object.keys(counts).forEach((k) => {
        normalized[k] = counts[k].size;
      });

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
      prev.includes(employeeId)
        ? prev.filter((x) => x !== employeeId)
        : [...prev, employeeId]
    );
  };

  const toggleAll = () => {
    const visibleIds = filteredEmployees.map((e) => e.id);
    const allSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedEmployeeIds.includes(id));

    if (allSelected) {
      setSelectedEmployeeIds((prev) =>
        prev.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedEmployeeIds((prev) =>
        Array.from(new Set([...prev, ...visibleIds]))
      );
    }
  };

  // Edit daily rate locally as user types
  const handleRateChange = (employeeId, value) => {
    setRateErrorFor(employeeId, "");
    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, daily_rate: value } : e))
    );
  };

  // Save daily rate to Supabase on blur
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
      const { error } = await supabase
        .from("employees")
        .update({ daily_rate: rateNum })
        .eq("id", employeeId);

      if (error) throw error;
    } catch (err) {
      console.error("Save daily_rate error:", err);
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
  const allVisibleSelected =
    visibleIds.length > 0 &&
    visibleIds.every((id) => selectedEmployeeIds.includes(id));

  const handleProcessPayroll = async () => {
    if (processing) return;

    setProcessMsg("");

    if (!startDate || !endDate) {
      setProcessMsg("Please select a start and end date.");
      return;
    }

    if (selectedEmployeeIds.length === 0) {
      setProcessMsg("Select at least 1 employee.");
      return;
    }

    setProcessing(true);
    try {
      // 1) Ensure payroll_runs row exists for this cutoff
      // Avoid .single() coercion errors by using maybeSingle in the fallback.
      let runId = null;

      const { data: insertedRun, error: runInsertErr } = await supabase
        .from("payroll_runs")
        .insert([{ period_start: startDate, period_end: endDate }])
        .select("id")
        .maybeSingle();

      if (runInsertErr) {
        const msg = String(
          runInsertErr?.message || runInsertErr?.details || ""
        ).toLowerCase();

        const looksLikeDuplicate =
          msg.includes("duplicate") || msg.includes("unique");

        if (!looksLikeDuplicate) throw runInsertErr;

        const { data: existingRun, error: runFetchErr } = await supabase
          .from("payroll_runs")
          .select("id")
          .eq("period_start", startDate)
          .eq("period_end", endDate)
          .maybeSingle();

        if (runFetchErr) throw runFetchErr;
        runId = existingRun?.id ?? null;
      } else {
        runId = insertedRun?.id ?? null;
      }

      // 2) Save payroll_records rows (GROSS PAY ONLY)
      const records = rowsWithPreview
        .filter((r) => selectedEmployeeIds.includes(r.id))
        .map((r) => ({
          employee_id: r.id,
          period_start: startDate,
          period_end: endDate,
          gross_pay: Number(r.grossPay) || 0,
          status: "Paid",
          paid_at: new Date().toISOString(),
        }));

      const { error: recErr } = await supabase
        .from("payroll_records")
        .upsert(records, { onConflict: "employee_id,period_start,period_end" });

      if (recErr) throw recErr;

      setProcessMsg(
        `Payroll processed successfully${runId ? `. Run ID: ${runId}` : ""}`
      
      
      );
      setSelectedEmployeeIds([]);
    } catch (err) {
      console.error("Process payroll error:", err);
      setProcessMsg(err?.message || "Failed to process payroll.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Sidebar */}
      <AdminSidebar
        isOpen={isOpen}
        currentUser={currentUser}
        onLogout={handleLogout}
        onNavigate={(path) => navigate(path)}
      />

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden bg-[#faf7ea]">
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
            <div className="w-full md:max-w-xl relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search employee, department, position..."
                className="w-full rounded-full border-2 border-yellow-300 px-4 pr-10 py-2 text-sm md:text-base text-green-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-green-600 bg-white"
              />
              <Search
                size={18}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400"
              />
            </div>
          </div>

          {/* Right icons */}
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

        {/* Header + Export */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-green-800">
              Process Payroll
            </h1>
            <p className="text-sm text-gray-600">
              Gross Pay = Present Days × Employee Daily Rate
            </p>
          </div>
          <button className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-green-800 border border-yellow-300 shadow-sm hover:bg-yellow-50 cursor-pointer">
            <Download size={16} />
            Export Report
          </button>
        </div>

        {/* Payroll controls */}
        <section className="bg-white rounded-2xl shadow-sm border border-yellow-100 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Cutoff start
              </p>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-sm bg-white text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>

            <div>
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Cutoff end
              </p>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border border-yellow-200 rounded-lg px-3 py-2 text-sm bg-white text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600"
              />
            </div>
          </div>

          {loadingAttendance && (
            <p className="mt-3 text-sm text-gray-600">
              Loading attendance totals...
            </p>
          )}

          {processMsg && (
            <p
              className={`mt-3 text-sm ${
                processMsg.includes("successfully")
                  ? "text-green-700"
                  : "text-red-600"
              }`}
            >
              {processMsg}
            </p>
          )}
        </section>

        {/* Summary cards */}
        <section className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Selected employees
              </p>
              <p className="text-xl font-bold text-green-800">
                {selectedEmployeeIds.length}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-yellow-100 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-500 mb-1">
                Total Gross Pay (selected)
              </p>
              <p className="text-xl font-bold text-green-800">
                {peso(totalGross)}
              </p>
            </div>
          </div>
        </section>

        {/* Employees table */}
        <section className="bg-white rounded-2xl shadow-sm border border-yellow-100 p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-[#f5f0d9] text-green-900">
                <tr className="text-xs uppercase tracking-wide">
                  <th className="w-10 p-3 text-left">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAll}
                      disabled={rowsWithPreview.length === 0}
                    />
                  </th>
                  <th className="p-3 text-left">Employee</th>
                  <th className="p-3 text-left">Department</th>
                  <th className="p-3 text-left">Worked days</th>
                  <th className="p-3 text-left">Daily rate</th>
                  <th className="p-3 text-left">Gross pay</th>
                </tr>
              </thead>

              <tbody>
                {loadingEmployees ? (
                  <tr>
                    <td className="p-4 text-gray-600" colSpan={6}>
                      Loading employees...
                    </td>
                  </tr>
                ) : rowsWithPreview.length === 0 ? (
                  <tr>
                    <td className="p-4 text-gray-600" colSpan={6}>
                      No employees found.
                    </td>
                  </tr>
                ) : (
                  rowsWithPreview.map((row, idx) => {
                    const checked = selectedEmployeeIds.includes(row.id);
                    const saving = !!savingRateById[row.id];
                    const errMsg = rateErrorById[row.id] || "";

                    return (
                      <tr
                        key={row.id}
                        className={`h-12 ${
                          idx % 2 === 0 ? "bg-white" : "bg-[#faf7ea]"
                        } border-t border-yellow-100`}
                      >
                        <td className="p-3 align-middle">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRow(row.id)}
                          />
                        </td>

                        <td className="p-3 align-middle text-green-900">
                          {row.full_name || "Unnamed"}
                          <div className="text-[11px] text-gray-500">
                            {row.position || ""}
                          </div>
                        </td>

                        <td className="p-3 align-middle text-gray-800">
                          {row.department || "—"}
                        </td>

                        <td className="p-3 align-middle text-gray-800">
                          {attendanceCounts[row.id] ?? 0}
                        </td>

                        <td className="p-3 align-middle text-gray-800">
                          <div className="flex flex-col">
                            <input
                              type="number"
                              inputMode="decimal"
                              value={row.daily_rate ?? 0}
                              onChange={(e) =>
                                handleRateChange(row.id, e.target.value)
                              }
                              onBlur={() => saveRate(row.id)}
                              disabled={saving}
                              className="w-28 border border-yellow-200 rounded-lg px-2 py-1 text-sm bg-white text-green-900 focus:outline-none focus:ring-2 focus:ring-green-600 disabled:opacity-60"
                            />
                            {errMsg && (
                              <span className="text-[11px] text-red-600">
                                {errMsg}
                              </span>
                            )}
                            {!errMsg && saving && (
                              <span className="text-[11px] text-gray-500">
                                Saving...
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 align-middle font-semibold text-green-800">
                          {peso(Number(row.grossPay) || 0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-[#faf7ea] border-t border-yellow-100">
            <p className="text-xs text-gray-600">
              {selectedEmployeeIds.length} selected
            </p>

            <button
              type="button"
              disabled={selectedEmployeeIds.length === 0 || processing}
              onClick={handleProcessPayroll}
              className="inline-flex items-center justify-center rounded-full bg-green-700 px-5 py-2 text-sm font-semibold text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-800 transition"
            >
              {processing ? "Processing..." : "Process Selected Payroll"}
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
