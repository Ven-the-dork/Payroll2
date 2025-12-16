import { useState } from "react";
import { clockifyClockIn, clockifyClockOut } from "../utils/clockifyClient";

export default function AttendancePage() {
  // string | null: "in", "out", or null
  const [loading, setLoading] = useState(null);
  const [message, setMessage] = useState("");

  const handle = async (type) => {
    setLoading(type);
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
      const msg =
        e && typeof e === "object" && "message" in e
          ? e.message
          : "Something went wrong.";
      setMessage(msg);
      console.error("Attendance error:", e);
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto">
      <h1 className="text-xl font-semibold mb-4">Attendance</h1>

      <div className="flex gap-4 mb-4">
        <button
          onClick={() => handle("in")}
          disabled={loading !== null}
          className="px-4 py-2 bg-green-600 text-white rounded disabled:opacity-60"
        >
          {loading === "in" ? "Clocking in..." : "Clock in"}
        </button>

        <button
          onClick={() => handle("out")}
          disabled={loading !== null}
          className="px-4 py-2 bg-red-600 text-white rounded disabled:opacity-60"
        >
          {loading === "out" ? "Clocking out..." : "Clock out"}
        </button>
      </div>

      {message && <p className="text-sm">{message}</p>}
    </div>
  );
}

