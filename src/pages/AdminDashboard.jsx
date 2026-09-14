import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Newspaper,
  ShoppingBag,
  Users,
  UsersRound,
  Flag,
  Settings,
  LogOut,
  Plus,
  ArrowRight,
  Activity,
  ShieldCheck,
  Menu,
  X,
} from "lucide-react";

import { supabase } from "../lib/supabaseClient";

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  show: {
    opacity: 1,
    y: 0,
  },
};

function StatCard({ icon: Icon, title, value, description }) {
  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -5 }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">
            {title}
          </p>

          <h3 className="mt-2 text-3xl font-black text-gray-900">
            {value}
          </h3>

          <p className="mt-1 text-xs text-gray-400">
            {description}
          </p>
        </div>

        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-yellow-400 text-gray-900">
          <Icon size={23} />
        </div>
      </div>
    </motion.div>
  );
}

function AdminDashboard() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [stats, setStats] = useState({
    users: 0,
    news: 0,
    products: 0,
    groups: 0,
    reports: 0,
  });

  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    try {
      setLoading(true);

      // Get current authenticated user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        console.error("User error:", userError);
        navigate("/login");
        return;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      setUser(user);

      // Check ADMIN role
      // IMPORTANT:
      // Your app_role enum uses lowercase "admin"
      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError) {
        console.error("Role check error:", roleError);
        navigate("/home");
        return;
      }

      if (!roleData) {
        console.error("User is not an admin.");
        navigate("/home");
        return;
      }

      // Load admin profile
      const { data: profileData, error: profileError } =
        await supabase
          .from("profiles")
          .select("username, full_name, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

      if (profileError) {
        console.error("Profile error:", profileError);
      }

      setProfile(profileData || null);

      // Load dashboard statistics
      await loadStats();
    } catch (error) {
      console.error("Admin check error:", error);
      navigate("/home");
    } finally {
      setLoading(false);
    }
  }

  async function loadStats() {
    try {
      const [
        usersResult,
        newsResult,
        productsResult,
        groupsResult,
        reportsResult,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("news")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("products")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("groups")
          .select("*", {
            count: "exact",
            head: true,
          }),

        supabase
          .from("reports")
          .select("*", {
            count: "exact",
            head: true,
          }),
      ]);

      if (usersResult.error) {
        console.error(
          "Users statistics error:",
          usersResult.error
        );
      }

      if (newsResult.error) {
        console.error(
          "News statistics error:",
          newsResult.error
        );
      }

      if (productsResult.error) {
        console.error(
          "Products statistics error:",
          productsResult.error
        );
      }

      if (groupsResult.error) {
        console.error(
          "Groups statistics error:",
          groupsResult.error
        );
      }

      if (reportsResult.error) {
        console.error(
          "Reports statistics error:",
          reportsResult.error
        );
      }

      setStats({
        users: usersResult.count || 0,
        news: newsResult.count || 0,
        products: productsResult.count || 0,
        groups: groupsResult.count || 0,
        reports: reportsResult.count || 0,
      });
    } catch (error) {
      console.error("Statistics loading error:", error);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100">
        <div className="text-center">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear",
            }}
            className="mx-auto h-12 w-12 rounded-full border-4 border-gray-200 border-t-yellow-400"
          />

          <p className="mt-4 font-medium text-gray-600">
            Loading admin dashboard...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/20 lg:hidden"
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen w-72 flex-col border-r border-gray-200 bg-white transition-transform duration-300 ${
          sidebarOpen
            ? "translate-x-0"
            : "-translate-x-full lg:translate-x-0"
        }`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center justify-between border-b border-gray-200 px-6">
          <Link
            to="/admin"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3"
          >
            <motion.div
              whileHover={{
                rotate: 5,
                scale: 1.05,
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 font-black text-gray-900 shadow-sm"
            >
              C
            </motion.div>

            <div>
              <h1 className="text-lg font-black">
                cur
                <span className="text-yellow-500">.book</span>
              </h1>

              <p className="text-xs font-medium text-gray-400">
                Admin Panel
              </p>
            </div>
          </Link>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-2 overflow-y-auto p-4">
          {/* Dashboard */}
          <Link
            to="/admin"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-xl bg-yellow-400 px-4 py-3 font-semibold text-gray-900 shadow-sm transition hover:bg-yellow-500"
          >
            <LayoutDashboard size={20} />
            Dashboard
          </Link>

          {/* News */}
          <Link
            to="/admin/news"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <Newspaper size={20} />
            News
          </Link>

          {/* Products */}
          <Link
            to="/admin/products"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <ShoppingBag size={20} />
            Products
          </Link>

          {/* Users */}
          <Link
            to="/admin/users"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <Users size={20} />
            Users
          </Link>

          {/* Groups */}
          <Link
            to="/admin/groups"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <UsersRound size={20} />
            Groups
          </Link>

          {/* Reports */}
          <Link
            to="/admin/reports"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center justify-between rounded-xl px-4 py-3 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <span className="flex items-center gap-3">
              <Flag size={20} />
              Reports
            </span>

            {stats.reports > 0 && (
              <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-xs font-bold text-gray-900">
                {stats.reports}
              </span>
            )}
          </Link>

          {/* Settings */}
          <Link
            to="/admin/settings"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center gap-3 rounded-xl px-4 py-3 font-medium text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <Settings size={20} />
            Settings
          </Link>
        </nav>

        {/* Admin Profile */}
        <div className="border-t border-gray-200 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-gray-100 p-3">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Admin"
                className="h-10 w-10 rounded-full object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 font-bold text-gray-900">
                {(
                  profile?.full_name ||
                  profile?.username ||
                  "A"
                )
                  .charAt(0)
                  .toUpperCase()}
              </div>
            )}

            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-gray-900">
                {profile?.full_name ||
                  profile?.username ||
                  "Admin"}
              </p>

              <p className="truncate text-xs text-gray-500">
                {user?.email}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-72">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/90 px-4 py-4 backdrop-blur-xl sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            {/* Mobile menu */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-xl border border-gray-200 bg-white p-2 text-gray-700 transition hover:border-yellow-400 hover:bg-yellow-50 lg:hidden"
            >
              <Menu size={22} />
            </button>

            {/* Desktop title */}
            <div className="hidden lg:block">
              <p className="text-sm text-gray-500">
                Administration
              </p>

              <h2 className="text-xl font-black">
                Dashboard
              </h2>
            </div>

            {/* Right actions */}
            <div className="ml-auto flex items-center gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 sm:flex">
                <ShieldCheck
                  size={17}
                  className="text-yellow-500"
                />

                <span className="text-sm font-semibold">
                  Administrator
                </span>
              </div>

              <Link
                to="/home"
                className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:border-yellow-400 hover:bg-yellow-50"
              >
                View Site
              </Link>
            </div>
          </div>
        </header>

        {/* Dashboard Body */}
        <div className="p-4 sm:p-6 lg:p-8">
          {/* Welcome Banner */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="relative mb-8 overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8"
          >
            {/* Decorative yellow circle */}
            <motion.div
              animate={{
                scale: [1, 1.1, 1],
                opacity: [0.15, 0.25, 0.15],
              }}
              transition={{
                duration: 4,
                repeat: Infinity,
              }}
              className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-yellow-400"
            />

            <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1 text-xs font-bold text-gray-900">
                  <Activity size={14} />
                  System Overview
                </div>

                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Welcome back,{" "}
                  <span className="text-yellow-500">
                    {profile?.full_name ||
                      profile?.username ||
                      "Admin"}
                  </span>
                </h1>

                <p className="mt-3 max-w-2xl text-gray-500">
                  Manage news, users, products, groups and
                  reports from your cur.book administration
                  panel.
                </p>
              </div>

              <Link
                to="/admin/news/create"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 font-bold text-gray-900 shadow-lg shadow-yellow-200 transition hover:-translate-y-1 hover:bg-yellow-500"
              >
                <Plus size={19} />
                Create News
              </Link>
            </div>
          </motion.div>

          {/* Statistics */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"
          >
            <StatCard
              icon={Users}
              title="Total Users"
              value={stats.users}
              description="Registered users"
            />

            <StatCard
              icon={Newspaper}
              title="Total News"
              value={stats.news}
              description="Published news"
            />

            <StatCard
              icon={ShoppingBag}
              title="Products"
              value={stats.products}
              description="Marketplace products"
            />

            <StatCard
              icon={UsersRound}
              title="Groups"
              value={stats.groups}
              description="Community groups"
            />

            <StatCard
              icon={Flag}
              title="Reports"
              value={stats.reports}
              description="Submitted reports"
            />
          </motion.div>

          {/* Management Cards */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* News Management */}
            <motion.div
              initial={{
                opacity: 0,
                x: -20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.3,
              }}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400">
                    <Newspaper size={21} />
                  </div>

                  <div>
                    <h3 className="font-black">
                      News Management
                    </h3>

                    <p className="text-sm text-gray-500">
                      Manage platform news
                    </p>
                  </div>
                </div>

                <Link
                  to="/admin/news"
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <ArrowRight size={20} />
                </Link>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3">
                <Link
                  to="/admin/news"
                  className="rounded-xl border border-gray-200 p-4 transition hover:border-yellow-400 hover:bg-yellow-50"
                >
                  <p className="text-2xl font-black">
                    {stats.news}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    All News
                  </p>
                </Link>

                <Link
                  to="/admin/news/create"
                  className="flex items-center justify-center gap-2 rounded-xl bg-yellow-400 p-4 font-bold text-gray-900 transition hover:bg-yellow-500"
                >
                  <Plus size={18} />
                  Add News
                </Link>
              </div>
            </motion.div>

            {/* User Management */}
            <motion.div
              initial={{
                opacity: 0,
                x: 20,
              }}
              animate={{
                opacity: 1,
                x: 0,
              }}
              transition={{
                delay: 0.4,
              }}
              className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400">
                    <Users size={21} />
                  </div>

                  <div>
                    <h3 className="font-black">
                      User Management
                    </h3>

                    <p className="text-sm text-gray-500">
                      View and manage users
                    </p>
                  </div>
                </div>

                <Link
                  to="/admin/users"
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
                >
                  <ArrowRight size={20} />
                </Link>
              </div>

              <div className="mt-6">
                <div className="rounded-xl border border-gray-200 p-4 transition hover:border-yellow-400">
                  <p className="text-3xl font-black">
                    {stats.users}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Registered users
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Actions */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.5,
            }}
            className="mt-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="mb-5">
              <h3 className="text-lg font-black">
                Quick Actions
              </h3>

              <p className="text-sm text-gray-500">
                Quickly access the most important admin
                functions.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Link
                to="/admin/news/create"
                className="group flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-yellow-400 hover:bg-yellow-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-400 text-gray-900">
                  <Plus size={19} />
                </div>

                <div>
                  <p className="font-bold">Create News</p>
                  <p className="text-xs text-gray-500">
                    Publish an article
                  </p>
                </div>
              </Link>

              <Link
                to="/admin/news"
                className="group flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-yellow-400 hover:bg-yellow-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-400 text-gray-900">
                  <Newspaper size={19} />
                </div>

                <div>
                  <p className="font-bold">Manage News</p>
                  <p className="text-xs text-gray-500">
                    Edit or delete news
                  </p>
                </div>
              </Link>

              <Link
                to="/admin/users"
                className="group flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-yellow-400 hover:bg-yellow-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-400 text-gray-900">
                  <Users size={19} />
                </div>

                <div>
                  <p className="font-bold">Manage Users</p>
                  <p className="text-xs text-gray-500">
                    View registered users
                  </p>
                </div>
              </Link>

              <Link
                to="/admin/reports"
                className="group flex items-center gap-3 rounded-xl border border-gray-200 p-4 transition hover:border-yellow-400 hover:bg-yellow-50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-400 text-gray-900">
                  <Flag size={19} />
                </div>

                <div>
                  <p className="font-bold">Reports</p>
                  <p className="text-xs text-gray-500">
                    Review reports
                  </p>
                </div>
              </Link>
            </div>
          </motion.div>

          {/* Admin Security Notice */}
          <motion.div
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              delay: 0.6,
            }}
            className="mt-6 flex gap-4 rounded-2xl border border-yellow-300 bg-yellow-50 p-5"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400 text-gray-900">
              <ShieldCheck size={20} />
            </div>

            <div>
              <h3 className="font-bold text-gray-900">
                Administrator Access
              </h3>

              <p className="mt-1 text-sm leading-6 text-gray-600">
                You are viewing the administration area.
                Administrative actions should remain protected
                by Supabase Row Level Security policies.
              </p>
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default AdminDashboard;