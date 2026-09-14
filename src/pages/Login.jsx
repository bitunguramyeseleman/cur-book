import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  LogIn,
  Mail,
  Lock,
  AlertCircle,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      if (!data?.user) {
        throw new Error("Login failed. Please try again.");
      }

      navigate("/home");
    } catch (err) {
      console.error("Login error:", err);

      const message = err?.message || "Unable to sign in.";

      if (message.toLowerCase().includes("invalid login credentials")) {
        setError("Incorrect email or password.");
      } else if (message.toLowerCase().includes("email not confirmed")) {
        setError("Please confirm your email address before signing in.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#111827] flex items-center justify-center px-4 py-6">
      {/* Background Effects - Light theme */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 h-80 w-80 rounded-full bg-[#facc15]/20 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-80 w-80 rounded-full bg-[#facc15]/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-96 w-96 rounded-full bg-white/30 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-sm"
      >
        {/* Back Button */}
        <button
          onClick={() => navigate("/")}
          className="absolute -top-14 left-0 flex items-center gap-2 text-sm text-gray-500 hover:text-[#facc15] transition font-semibold"
        >
          <ArrowLeft size={16} />
          Back
        </button>

        {/* Logo */}
        <div className="mb-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#facc15] shadow-lg shadow-[#facc15]/30">
              <span className="text-lg font-black text-[#111827]">C</span>
            </div>
            <span className="text-2xl font-extrabold tracking-tight text-[#111827]">
              cur<span className="text-[#facc15]">.</span>book
            </span>
          </Link>
          <p className="mt-2 text-sm text-gray-500">
            Welcome back. Sign in to continue.
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-5 shadow-xl shadow-gray-200/50">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-xl font-extrabold text-[#111827] flex items-center gap-2">
              <Sparkles size={18} className="text-[#facc15]" />
              Welcome back
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Sign in to your cur.book account.
            </p>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200/60 bg-red-50/80 backdrop-blur-sm px-3.5 py-2.5 text-sm text-red-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <span className="text-xs font-medium">{error}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3.5">
            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-gray-700">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm py-2.5 pl-10 pr-3.5 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#facc15] focus:ring-4 focus:ring-[#facc15]/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs font-extrabold text-gray-700">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-[#facc15] transition hover:text-[#fbbf24]"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm py-2.5 pl-10 pr-10 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#facc15] focus:ring-4 focus:ring-[#facc15]/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#111827]"
                  tabIndex="-1"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#facc15] py-2.5 text-sm font-extrabold text-[#111827] transition hover:bg-[#fbbf24] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-[#facc15]/30"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#111827]/30 border-t-[#111827]" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4" />
                  Sign in
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <div className="mt-5 border-t border-gray-200/60 pt-4 text-center">
            <p className="text-xs text-gray-500 font-semibold">
              Don't have an account?{" "}
              <Link
                to="/register"
                className="font-extrabold text-[#facc15] transition hover:text-[#fbbf24]"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-4 text-center">
          <Link
            to="/"
            className="text-xs text-gray-400 font-medium transition hover:text-[#111827]"
          >
            ← Back to home
          </Link>
        </div>
      </motion.div>
    </div>
  );
}