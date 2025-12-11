import { useState } from "react";
import { clockifyClockIn, clockifyClockOut } from "../utils/clockifyClient";

export default function AttendancePage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handle = async (type) => {
    setLoading(true);
    setMessage("");
    try {
      if (type === "in") {
        await clockifyClockIn();
        setMessage("Clocked in.");
      } else {
        await clockifyClockOut();
        setMessage("Clocked out.");
      }
    } catch (e) {
      setMessage(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4">Attendance</h1>
      <div className="flex gap-4 mb-4">
        <button
          onClick={() => handle("in")}
          disabled={loading}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          Clock in
        </button>
        <button
          onClick={() => handle("out")}
          disabled={loading}
          className="px-4 py-2 bg-red-600 text-white rounded"
        >
          Clock out
        </button>
      </div>
      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}
