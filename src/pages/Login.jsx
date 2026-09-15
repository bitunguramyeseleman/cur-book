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
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
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
      } else if (
        message.toLowerCase().includes("email not confirmed")
      ) {
        setError("Please confirm your email address before signing in.");
      } else {
        setError(message);
      }
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
          className="w-full max-w-6xl min-h-[680px] flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16"
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
                Welcome back
              </h2>

              <p className="mt-3 text-sm sm:text-base leading-7 text-gray-500">
                Sign in to your account and continue using your
                application.
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
            className="w-full max-w-md lg:w-[440px]"
          >
            {/* Back */}
            <button
              onClick={() => navigate("/")}
              className="mb-5 flex items-center gap-2 text-sm font-semibold text-gray-500 transition hover:text-[#111827]"
            >
              <ArrowLeft size={17} />
              Back
            </button>

            {/* LOGIN FORM */}
            <div className="relative overflow-hidden rounded-[28px] border border-white/80 bg-white/70 p-7 sm:p-9 shadow-[0_25px_70px_rgba(0,0,0,0.10)] backdrop-blur-xl">
              {/* Decorative blur */}
              <div className="pointer-events-none absolute -right-20 -top-20 h-40 w-40 rounded-full bg-[#facc15]/20 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-[#facc15]/10 blur-3xl" />

              <div className="relative z-10">
                {/* Header */}
                <div className="mb-8">
                  <h1 className="text-3xl font-bold tracking-tight text-[#111827]">
                    Login
                  </h1>

                  <p className="mt-2 text-sm text-gray-500">
                    Enter your details to access your account.
                  </p>
                </div>

                {/* Error */}
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

                <form onSubmit={handleLogin} className="space-y-6">
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
                    <div className="mb-2 flex items-center justify-between">
                      <label className="block text-sm font-semibold text-gray-700">
                        Password
                      </label>

                      <Link
                        to="/forgot-password"
                        className="text-xs font-semibold text-gray-500 transition hover:text-[#111827]"
                      >
                        Forgot Password?
                      </Link>
                    </div>

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
                        placeholder="Enter your password"
                        autoComplete="current-password"
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
                  </div>

                  {/* REMEMBER ME */}
                  <div className="flex items-center justify-between">
                    <label className="flex cursor-pointer items-center gap-2">
                      <input
                        type="checkbox"
                        checked={rememberMe}
                        onChange={(e) =>
                          setRememberMe(e.target.checked)
                        }
                        disabled={loading}
                        className="h-4 w-4 cursor-pointer accent-[#facc15]"
                      />

                      <span className="text-xs font-medium text-gray-600">
                        Remember me
                      </span>
                    </label>
                  </div>

                  {/* LOGIN BUTTON */}
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={loading}
                    className="flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#facc15] text-sm font-bold text-[#111827] shadow-lg shadow-[#facc15]/25 transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {loading ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#111827]/30 border-t-[#111827]" />
                        Signing in...
                      </>
                    ) : (
                      <>
                        <LogIn size={17} />
                        Login
                      </>
                    )}
                  </motion.button>
                </form>

                {/* REGISTER */}
                <div className="mt-7 text-center">
                  <p className="text-sm text-gray-500">
                    Don't have an account?{" "}
                    <Link
                      to="/register"
                      className="font-bold text-[#111827] transition hover:text-[#f59e0b]"
                    >
                      Register
                    </Link>
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom */}
            <p className="mt-5 text-center text-xs text-gray-400">
              By continuing, you agree to our terms and conditions.
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}