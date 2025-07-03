"use client"; // ✅ Ensures the page runs in the browser (not server-rendered)

import { useRouter } from "next/navigation"; // ✅ Used for programmatic navigation
import { useState } from "react"; // ✅ React state for input fields and login logic

export default function LoginPage() {
  const router = useRouter();

  // ✅ State variables for form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true); // ✅ Tracks "Remember Me" checkbox state


  // ✅ Function to handle login logic
  const login = async () => {
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        const now = Date.now();

        // ✅ Save session flag (persistent if "Remember Me" is checked)
        if (rememberMe) {
          localStorage.setItem("isLoggedIn", "true");
          localStorage.setItem("loginTimestamp", now.toString());
        } else {
          sessionStorage.setItem("isLoggedIn", "true");
          sessionStorage.setItem("loginTimestamp", now.toString());
        }

        // ✅ Redirect to ChatApp page ("/")
        router.push("/");
      } else {
        alert("Invalid email or password");
      }
    } catch (err) {
      alert("Error validating login");
      console.error("Login API error:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-6 bg-gray-100">
      <div className="w-full max-w-sm bg-white p-8 rounded shadow-md space-y-4">
        {/* ✅ Login form header */}
        <h2 className="text-2xl font-bold text-center">Login</h2>

        {/* ✅ Email input field */}
        <input
          type="email"
          className="w-full p-3 border rounded"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        {/* ✅ Password input field */}
        <input
          type="password"
          className="w-full p-3 border rounded"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />

        {/* ✅ Remember Me checkbox */}
        <label className="text-sm flex items-center gap-2">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={() => setRememberMe(!rememberMe)}
          />
          Remember Me
        </label>

        {/* ✅ Login Button */}
        <button
          className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
          onClick={login}
        >
          Login
        </button>
      </div>
    </div>
  );
}
