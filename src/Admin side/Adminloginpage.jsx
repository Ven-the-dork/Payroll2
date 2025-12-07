import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebaseConfig";
import { supabase } from "../supabaseClient";
import { logAudit } from "../utils/auditLog";
import { Shield, Lock, Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdminLogin(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // 1. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;

      // 2. Check if user is admin in Supabase
      const { data: employee, error: dbError } = await supabase
        .from("employees")
        .select("*")
        .eq("firebase_uid", firebaseUser.uid)
        .single();

      if (dbError || !employee) {
        setError("User not found in database");
        await auth.signOut();
        setLoading(false);
        return;
      }

      // 3. Verify admin role
      if (employee.role !== "admin") {
        setError("Access Denied: Admin credentials required");
        await auth.signOut();
        setLoading(false);
        return;
      }

      // 4. Log the admin login - AUDIT LOG
      await logAudit({
        action: "admin_login",
        details: `Admin logged in: ${employee.full_name} (${employee.position}, ${employee.department})`,
        currentUser: {
          employeeId: employee.id,
          uid: firebaseUser.uid,
          fullName: employee.full_name,
          email: firebaseUser.email,
        },
      });

      // 5. Store user data in session
      const userData = {
        uid: firebaseUser.uid,
        email: firebaseUser.email,
        fullName: employee.full_name,
        position: employee.position,
        department: employee.department,
        role: employee.role,
        employeeId: employee.id,
        can_view_payroll: employee.can_view_payroll || false,
      };
      sessionStorage.setItem("user", JSON.stringify(userData));

      // 6. Navigate to admin dashboard
      navigate("/dashboard", { replace: true });
    } catch (error) {
      console.error("Login error:", error);
      if (error.code === "auth/invalid-credential") {
        setError("Invalid email or password");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please try again later.");
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-600 via-green-700 to-green-900 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-yellow-400 shadow-lg mb-4">
            <Shield size={40} className="text-green-900" />
          </div>
          <h1 className="text-3xl font-bold text-yellow-400 mb-2">ADMIN PORTAL</h1>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8 border-4 border-yellow-400">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-700 mb-4">
              <Lock size={32} className="text-yellow-400" />
            </div>
            <h2 className="text-2xl font-bold text-green-900 mb-2">Secure Access</h2>
            <p className="text-sm text-gray-600">Administrator authentication required</p>
          </div>

          <form onSubmit={handleAdminLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-green-900 mb-2">
                Admin Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kingjustinbororo@gmail.com"
                className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all bg-gray-50"
                required
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-green-900 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-green-600 focus:outline-none focus:ring-2 focus:ring-green-200 transition-all bg-gray-50 pr-12"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-green-700 transition-colors"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-red-50 border border-red-200">
                <span className="text-xl">⚠️</span>
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 hover:bg-green-800 text-white font-bold py-3 px-6 rounded-full shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? "Authenticating..." : "Login as Admin"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500 flex items-center justify-center gap-1">
              🔒 This is a secure admin-only area
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <button
            onClick={() => navigate("/")}
            className="text-yellow-300 hover:text-yellow-100 font-semibold text-sm underline transition-colors"
          >
            ← Employee Login
          </button>
        </div>
      </div>
    </div>
  );
}
