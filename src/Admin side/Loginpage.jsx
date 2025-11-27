import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebaseConfig";
import { signInWithEmailAndPassword } from "firebase/auth";
import { supabase } from "../supabaseClient";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user"); // which portal UI the user selected
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      // 1. Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 2. Get user role from Supabase database
      const { data: userProfile, error: dbError } = await supabase
        .from("users")
        .select("role, email, full_name, department, position")
        .eq("firebase_uid", user.uid)
        .single();

      if (dbError || !userProfile) {
        throw new Error("User profile not found in database. Please contact administrator.");
      }

      // 3. Check if user's role matches the selected login portal
      if (role === "admin" && userProfile.role !== "admin") {
        setError("You don't have admin privileges. Please use the User Login portal.");
        await auth.signOut();
        return;
      }

      if (role === "user" && userProfile.role === "admin") {
        setError("Admin users should use the Admin Login portal.");
        await auth.signOut();
        return;
      }

      // 4. Store user data in sessionStorage for app usage
      sessionStorage.setItem(
        "user",
        JSON.stringify({
          uid: user.uid,
          email: user.email,
          role: userProfile.role,
          fullName: userProfile.full_name,
          department: userProfile.department,
          position: userProfile.position,
        })
      );

      // 5. Navigate based on actual role from DB (extra safety)
      if (userProfile.role === "admin") {
        navigate("/dashboard");
      } else {
        navigate("/dashboard_user");
      }
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

  // --- Dynamic UI based on role ---
  const color = {
    admin: {
      mainBg: "bg-gradient-to-r from-gray-900 via-gray-800 to-green-600",
      formBg: "bg-gray-900 text-white",
      button: "bg-green-400 hover:bg-yellow-400 text-gray-900",
      link: "text-green-300 hover:text-yellow-300",
      brandingBg: "bg-white text-green-700",
    },
    user: {
      mainBg: "bg-gradient-to-r from-green-400 via-green-600 to-green-800",
      formBg: "bg-white text-black",
      button: "bg-yellow-400 hover:bg-green-600 text-black",
      link: "text-green-700 hover:text-yellow-700",
      brandingBg: "bg-green-700 text-white",
    },
  }[role];

  const LoginForm = (
    <div className={`w-1/2 ${color.formBg} flex flex-col justify-center items-center p-8`}>
      <h2 className="text-3xl font-bold mb-2">
        {role === "admin" ? "Admin Login" : "Welcome Back !!"}
      </h2>
      <p className="mb-6">
        {role === "admin"
          ? "Please enter your admin credentials"
          : "Please enter your credentials to log in"}
      </p>
      {error && (
        <div className="w-full max-w-xs mb-4 bg-red-100 border border-red-400 text-red-700 px-3 py-2 rounded text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleLogin} className="w-full max-w-xs">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`w-full mb-4 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 ${
            role === "admin" ? "focus:ring-green-300" : "focus:ring-green-700"
          }`}
          required
          disabled={loading}
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={`w-full mb-3 px-4 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 ${
            role === "admin" ? "focus:ring-green-300" : "focus:ring-green-700"
          }`}
          required
          disabled={loading}
        />
        <div className="text-right mb-4">
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              alert("Password reset functionality coming soon!");
            }}
            className={`text-sm ${color.link} cursor-pointer`}
          >
            Forgot password?
          </a>
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full ${color.button} font-bold py-2 rounded transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {loading ? "SIGNING IN..." : "SIGN IN"}
        </button>
      </form>
    </div>
  );

  const InfoPanel = (
    <div className={`w-1/2 ${color.brandingBg} flex flex-col justify-center items-center p-8`}>
      <img src="src/assets/cvsu.svg" alt="Logo" className="w-20 mb-4" />
      <h2 className="text-3xl font-bold mb-2">CvSU Payroll</h2>
      <p className="mb-6 text-center">
        {role === "admin" ? "Want to log in as a regular user?" : "Are you an admin?"}
      </p>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {role === "admin" ? (
          <button
            onClick={() => {
              setRole("user");
              setError("");
            }}
            className="w-full bg-green-700 text-white py-2 rounded font-semibold hover:bg-green-600 transition"
            disabled={loading}
          >
            USER LOGIN
          </button>
        ) : (
          <button
            onClick={() => {
              setRole("admin");
              setError("");
            }}
            className="w-full bg-gray-900 text-yellow-400 py-2 rounded font-semibold hover:bg-gray-700 transition"
            disabled={loading}
          >
            ADMIN LOGIN
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className={`${color.mainBg} min-h-screen flex items-center justify-center`}>
      <div className="flex w-[850px] h-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {role === "admin" ? (
          <>
            {LoginForm}
            {InfoPanel}
          </>
        ) : (
          <>
            {InfoPanel}
            {LoginForm}
          </>
        )}
      </div>
    </div>
  );
}
