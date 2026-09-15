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

    if (
      !username ||
      !fullName ||
      !email ||
      !password ||
      !confirmPassword
    ) {
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
        throw new Error(
          "Account could not be created. Please try again."
        );
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

      setError(
        err?.message ||
          "Something went wrong while creating your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#f8f7f4] text-[#111827] overflow-hidden">
      <div className="min-h-screen flex items-center justify-center px-5 py-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-6xl min-h-[720px] flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16"
        >
          {/* LEFT SIDE */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full lg:w-1/2 flex flex-col items-center lg:items-start justify-center text-center lg:text-left"
          >
            <Link to="/" className="inline-block">
              <motion.img
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.2 }}
                src="/app.png"
                alt="App logo"
                className="w-56 sm:w-64 md:w-72 lg:w-80 h-auto object-contain"
              />
            </Link>

            <div className="mt-6 max-w-md">
              <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#111827]">
                Join us today
              </h2>

              <p className="mt-3 text-sm sm:text-base leading-7 text-gray-500">
                Create your account and become part of the community.
              </p>
            </div>

            <div className="mt-8 hidden lg:flex items-center gap-3 text-sm text-gray-400">
              <div className="h-px w-12 bg-gray-300" />
              <span>Simple. Secure. Fast.</span>
              <div className="h-px w-12 bg-gray-300" />
            </div>
          </motion.div>

          {/* RIGHT SIDE */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md lg:w-[460px]"
          >
            {/* BACK */}
            <button
              onClick={() => navigate("/")}
              className="mb-5 flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#111827]"
            >
              <ArrowLeft size={17} />
              Back
            </button>

            {/* REGISTER CARD */}
            <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/70 p-7 sm:p-9 shadow-[0_25px_70px_rgba(0,0,0,0.10)] backdrop-blur-xl">
              {/* Decorative Effects */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#facc15]/20 blur-3xl" />

              <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-[#facc15]/10 blur-3xl" />

              <div className="relative z-10">
                {/* HEADER */}
                <div className="mb-7">
                  <h1 className="text-3xl font-bold tracking-tight text-[#111827]">
                    Register
                  </h1>

                  <p className="mt-2 text-sm text-gray-500">
                    Create your account to get started.
                  </p>
                </div>

                {/* ERROR */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                    >
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />

                      <span className="text-xs font-medium">
                        {error}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* SUCCESS */}
                <AnimatePresence>
                  {success && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="mb-5 flex items-start gap-2.5 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
                    >
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />

                      <span className="text-xs font-medium">
                        {success}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* FORM */}
                <form
                  onSubmit={handleRegister}
                  className="space-y-5"
                >
                  {/* USERNAME */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Username
                    </label>

                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="text"
                        name="username"
                        value={form.username}
                        onChange={handleChange}
                        placeholder="Choose a username"
                        autoComplete="username"
                        disabled={loading}
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white/80 pl-11 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#facc15] focus:ring-4 focus:ring-[#facc15]/15 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* FULL NAME */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Full name
                    </label>

                    <div className="relative">
                      <User
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="text"
                        name="fullName"
                        value={form.fullName}
                        onChange={handleChange}
                        placeholder="Your full name"
                        autoComplete="name"
                        disabled={loading}
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white/80 pl-11 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#facc15] focus:ring-4 focus:ring-[#facc15]/15 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* EMAIL */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Email address
                    </label>

                    <div className="relative">
                      <Mail
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        autoComplete="email"
                        disabled={loading}
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white/80 pl-11 pr-4 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#facc15] focus:ring-4 focus:ring-[#facc15]/15 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>

                  {/* PASSWORD */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Password
                    </label>

                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type={showPassword ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handleChange}
                        placeholder="Create a password"
                        autoComplete="new-password"
                        disabled={loading}
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white/80 pl-11 pr-12 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#facc15] focus:ring-4 focus:ring-[#facc15]/15 disabled:cursor-not-allowed disabled:opacity-50"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowPassword(!showPassword)
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#111827]"
                        tabIndex="-1"
                      >
                        {showPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    <p className="mt-1 text-[10px] font-medium text-gray-400">
                      Password must contain at least 6 characters.
                    </p>
                  </div>

                  {/* CONFIRM PASSWORD */}
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Confirm password
                    </label>

                    <div className="relative">
                      <Lock
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                      />

                      <input
                        type={
                          showConfirmPassword
                            ? "text"
                            : "password"
                        }
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder="Confirm your password"
                        autoComplete="new-password"
                        disabled={loading}
                        className="h-12 w-full rounded-xl border border-gray-200 bg-white/80 pl-11 pr-12 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#facc15] focus:ring-4 focus:ring-[#facc15]/15 disabled:cursor-not-allowed disabled:opacity-50"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(
                            !showConfirmPassword
                          )
                        }
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-[#111827]"
                        tabIndex="-1"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* TERMS */}
                  <p className="text-[10px] leading-relaxed font-medium text-gray-400">
                    By creating an account, you agree to use the
                    application responsibly and follow the community
                    rules.
                  </p>

                  {/* REGISTER BUTTON */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#facc15] text-sm font-bold text-[#111827] shadow-lg shadow-[#facc15]/25 transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#111827]/30 border-t-[#111827]" />
                        Creating account...
                      </>
                    ) : (
                      <>
                        <UserPlus size={17} />
                        Register
                      </>
                    )}
                  </motion.button>
                </form>

                {/* LOGIN LINK */}
                <div className="mt-7 text-center">
                  <p className="text-sm text-gray-500">
                    Already have an account?{" "}
                    <Link
                      to="/login"
                      className="font-bold text-[#111827] transition hover:text-[#f59e0b]"
                    >
                      Login
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* FOOTER */}
            <p className="mt-5 text-center text-xs text-gray-400">
              Create your account and start your journey.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}