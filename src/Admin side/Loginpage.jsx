import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("user"); 
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();

    console.log("Login as:", role, { email, password });

    if (role === "admin") {
      navigate("/dashboard");
    } else {
      navigate("/dashboard_user");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-green-700">
      <div className="flex w-[850px] h-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* LEFT SIDE – Login Form */}
        <div className="w-1/2 bg-white flex flex-col justify-center items-center p-8">
          <h2 className="text-3xl font-bold text-black mb-2">
            {role === "admin" ? "Admin Login" : "Welcome Back !!"}
          </h2>
          <p className="text-black mb-6">
            {role === "admin"
              ? "Please enter your admin credentials"
              : "Please enter your credentials to log in"}
          </p>

          <form onSubmit={handleLogin} className="w-full max-w-xs">
            <input
              type="text"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full mb-4 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full mb-3 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-black"
              required
            />

            <div className="text-right mb-4">
              <a
                href="#"
                className="text-sm text-black hover:underline cursor-pointer"
              >
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              className="w-full bg-green-700 text-black py-2 rounded-md hover:bg-yellow-500 transition cursor-pointer"
            >
              SIGN IN
            </button>
          </form>
        </div>

        {/* RIGHT SIDE – Role Switcher */}
        <div className="w-1/2 bg-green-700 text-white flex flex-col justify-center items-center p-8 rounded-l-[60px]">
          <img src="src/assets/cvsu.png" alt="Logo" className="w-20 mb-4" />
          <h2 className="text-3xl font-bold mb-2">CvSU Payroll</h2>
          <p className="text-white mb-6 text-center">
            {role === "admin"
              ? "Want to log in as a regular user?"
              : "Are you an admin?"}
          </p>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            {role === "admin" ? (
              <button
                onClick={() => setRole("user")}
                className="w-full bg-white text-black py-2 rounded-md font-semibold hover:bg-gray-100 transition cursor-pointer"
              >
                USER LOGIN
              </button>
            ) : (
              <button
                onClick={() => setRole("admin")}
                className="w-full bg-white text-black py-2 rounded-md font-semibold hover:bg-gray-100 transition cursor-pointer"
              >
                ADMIN LOGIN
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
