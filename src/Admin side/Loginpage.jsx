import { useState, useEffect } from "react"; // Add useEffect
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { supabase } from "../supabaseClient";
import cvsuLogo from "../assets/cvsu.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // SECRET TRIGGER: Click logo 5 times to access admin login
  useEffect(() => {
    let clickCount = 0;
    let clickTimer = null;

    const handleLogoClick = () => {
      clickCount++;
      
      if (clickTimer) clearTimeout(clickTimer);
      
      // If 5 clicks within 3 seconds, redirect to hidden admin login
      if (clickCount === 5) {
        navigate("/admin-login");
        clickCount = 0;
      }
      
      // Reset counter after 3 seconds
      clickTimer = setTimeout(() => {
        clickCount = 0;
      }, 3000);
    };

    const logo = document.getElementById("secret-logo");
    if (logo) {
      logo.addEventListener("click", handleLogoClick);
    }

    return () => {
      if (logo) {
        logo.removeEventListener("click", handleLogoClick);
      }
      if (clickTimer) clearTimeout(clickTimer);
    };
  }, [navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Firebase auth
      const userCredential = await signInWithEmailAndPassword(
        auth,
        email.trim(),
        password.trim()
      );
      const user = userCredential.user;

      // 2. Supabase profile
      const { data: userProfile, error: dbError } = await supabase
        .from("employees")
        .select(
          "id, firebase_uid, role, email, full_name, department, position, can_view_payroll"
        )
        .eq("firebase_uid", user.uid)
        .maybeSingle();

      if (dbError) {
        throw new Error("Failed to load user profile from database.");
      }

      if (!userProfile) {
        throw new Error(
          "User profile not found in database. Please contact administrator."
        );
      }

      // 3. ONLY ALLOW REGULAR USERS (block admins)
      if (userProfile.role === "admin") {
        setError("Admin users should use the admin portal.");
        await auth.signOut();
        return;
      }
      // 4. Store user data in sessionStorage
      sessionStorage.setItem(
        "user",
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          role: userProfile.role,
          fullName: userProfile.full_name,
          department: userProfile.department,
          position: userProfile.position,
          employeeId: userProfile.id,
          can_view_payroll: userProfile.can_view_payroll || false, // Make sure this is here
        })
      );


      // 5. Navigate to user dashboard
      navigate("/dashboard_user");
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        setError("No account found with this email address.");
      } else if (error.code === "auth/wrong-password") {
        setError("Incorrect password. Please try again.");
      } else if (error.code === "auth/invalid-email") {
        setError("Invalid email address format.");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many failed login attempts. Please try again later.");
      } else if (error.code === "auth/invalid-credential") {
        setError("Invalid email or password.");
      } else {
        setError(error.message || "Failed to login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-green-400 via-green-600 to-green-800 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo with SECRET TRIGGER */}
        <div className="text-center mb-6">
          <img
            id="secret-logo"
            src={cvsuLogo}
            alt="Company Logo"
            className="w-24 h-24 mx-auto mb-4 cursor-pointer"
          />
          <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-2">
            Employee Portal
          </h1>
          <p className="text-green-100 text-sm">
            Please enter your credentials to log in
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-2xl font-bold text-green-800 mb-6 text-center">
            Login
          </h2>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@company.com"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-green-600 transition"
              />
            </div>

            {error && (
              <div className="bg-red-50 border-2 border-red-400 text-red-700 px-4 py-3 rounded-lg text-sm font-semibold">
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-yellow-400 hover:bg-green-600 text-black hover:text-white font-bold py-3 rounded-lg transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Need help? Contact your administrator
            </p>
          </div>
        </div>

        {/* Footer hint (subtle) */}
        <div className="text-center mt-6">
          <p className="text-xs text-green-100 opacity-50">
            © 2025 Employee Management System
          </p>
        </div>
      </div>
    </div>
  );
}
