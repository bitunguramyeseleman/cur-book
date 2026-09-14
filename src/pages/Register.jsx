import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  EyeOff,
  UserPlus,
  Mail,
  Lock,
  User,
  CheckCircle,
  AlertCircle,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    fullName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const username = form.username.trim();
    const fullName = form.fullName.trim();
    const email = form.email.trim().toLowerCase();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    // Validation
    if (!username || !fullName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    if (username.length > 30) {
      setError("Username cannot be longer than 30 characters.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            full_name: fullName,
          },
        },
      });

      if (signUpError) throw signUpError;

      if (!data || !data.user) {
        throw new Error("Account could not be created. Please try again.");
      }

      if (data.session) {
        setSuccess("Account created successfully! Redirecting...");
        setTimeout(() => navigate("/home"), 1200);
        return;
      }

      setSuccess(
        "Account created successfully! Please check your email to confirm your account."
      );
      setTimeout(() => navigate("/login"), 3000);
    } catch (err) {
      console.error("Registration error:", err);
      setError(err?.message || "Something went wrong while creating your account.");
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
            Create your account and join the community.
          </p>
        </div>

        {/* Register Card */}
        <div className="rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-5 shadow-xl shadow-gray-200/50">
          {/* Header */}
          <div className="mb-5">
            <h1 className="text-xl font-extrabold text-[#111827] flex items-center gap-2">
              <Sparkles size={18} className="text-[#facc15]" />
              Create account
            </h1>
            <p className="mt-0.5 text-sm text-gray-500">
              Enter your information to get started.
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

          {/* Success Message */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-4 flex items-start gap-2.5 rounded-xl border border-green-200/60 bg-green-50/80 backdrop-blur-sm px-3.5 py-2.5 text-sm text-green-700"
              >
                <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                <span className="text-xs font-medium">{success}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-3.5">
            {/* Username */}
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-gray-700">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="username"
                  value={form.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  autoComplete="username"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm py-2.5 pl-10 pr-3.5 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#facc15] focus:ring-4 focus:ring-[#facc15]/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

            {/* Full Name */}
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-gray-700">
                Full name
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  name="fullName"
                  value={form.fullName}
                  onChange={handleChange}
                  placeholder="Your full name"
                  autoComplete="name"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm py-2.5 pl-10 pr-3.5 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#facc15] focus:ring-4 focus:ring-[#facc15]/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>

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
              <label className="mb-1.5 block text-xs font-extrabold text-gray-700">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Create a password"
                  autoComplete="new-password"
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
              <p className="mt-1 text-[10px] text-gray-400 font-medium">
                Password must contain at least 6 characters.
              </p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="mb-1.5 block text-xs font-extrabold text-gray-700">
                Confirm password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm your password"
                  autoComplete="new-password"
                  disabled={loading}
                  className="w-full rounded-xl border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm py-2.5 pl-10 pr-10 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#facc15] focus:ring-4 focus:ring-[#facc15]/20 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#111827]"
                  tabIndex="-1"
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Terms */}
            <p className="text-[10px] leading-relaxed text-gray-400 font-medium">
              By creating an account, you agree to use cur.book responsibly and
              follow the community rules.
            </p>

            {/* Register Button */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#facc15] py-2.5 text-sm font-extrabold text-[#111827] transition hover:bg-[#fbbf24] active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 shadow-lg shadow-[#facc15]/30"
            >
              {loading ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#111827]/30 border-t-[#111827]" />
                  Creating account...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create account
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-5 border-t border-gray-200/60 pt-4 text-center">
            <p className="text-xs text-gray-500 font-semibold">
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-extrabold text-[#facc15] transition hover:text-[#fbbf24]"
              >
                Sign in
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