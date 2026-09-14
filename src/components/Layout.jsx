import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  LogOut,
  Menu,
  Search,
  User,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Layout({ children }) {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    setMobileMenu(false);
  }, [location.pathname]);

  const loadUser = async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(currentUser);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();

      setProfile(profileData);
    } catch (error) {
      console.error("Layout user error:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const isActive = (path) => {
    if (path === "/home") {
      return location.pathname === "/home";
    }

    return location.pathname.startsWith(path);
  };

  const navClass = (path) => {
    const active = isActive(path);

    return active
      ? "rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-gray-900 transition"
      : "rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition hover:bg-gray-100 hover:text-gray-900";
  };

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* LOGO */}
          <Link
            to="/home"
            className="text-l font-black tracking-tight text-gray-900"
          >
            CUR<span className="text-yellow-500">.</span>BOOK
          </Link>

          {/* DESKTOP NAVIGATION */}
          <nav className="hidden items-center gap-1 md:flex">
            <Link to="/home" className={navClass("/home")}>
              Home
            </Link>

            <Link to="/news" className={navClass("/news")}>
              News
            </Link>

            <Link to="/community" className={navClass("/community")}>
              Community
            </Link>
          </nav>

          {/* RIGHT SIDE */}
          <div className="hidden items-center gap-2 md:flex">
            {/* SEARCH */}
            <button
              onClick={() => navigate("/search")}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              title="Search"
            >
              <Search size={20} />
            </button>

            {/* NOTIFICATIONS */}
            <button
              onClick={() => navigate("/notifications")}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              title="Notifications"
            >
              <Bell size={20} />
            </button>

            {/* PROFILE */}
            <button
              onClick={() => navigate("/profile")}
              className="ml-1 flex items-center gap-2 rounded-xl px-2 py-1.5 transition hover:bg-gray-100"
            >
              {profile?.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.username || "Profile"}
                  className="h-9 w-9 rounded-full object-cover ring-2 ring-yellow-400"
                />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-400 text-gray-900">
                  <User size={18} />
                </div>
              )}

              <div className="hidden text-left lg:block">
                <p className="max-w-[120px] truncate text-sm font-black text-gray-900">
                  {profile?.username ||
                    profile?.full_name ||
                    "Profile"}
                </p>

                <p className="text-xs text-gray-400">
                  View profile
                </p>
              </div>
            </button>

            {/* LOGOUT */}
            <button
              onClick={handleLogout}
              className="flex h-10 w-10 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-100 hover:text-gray-900"
              title="Logout"
            >
              <LogOut size={19} />
            </button>
          </div>

          {/* MOBILE MENU BUTTON */}
          <button
            onClick={() => setMobileMenu((current) => !current)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition hover:bg-yellow-100 md:hidden"
          >
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* MOBILE MENU */}
        {mobileMenu && (
          <div className="border-t border-gray-200 bg-white md:hidden">
            <div className="mx-auto max-w-7xl space-y-2 px-4 py-4 sm:px-6">
              <Link
                to="/home"
                className={`block ${navClass("/home")}`}
              >
                Home
              </Link>

              <Link
                to="/news"
                className={`block ${navClass("/news")}`}
              >
                News
              </Link>

              <Link
                to="/community"
                className={`block ${navClass("/community")}`}
              >
                Community
              </Link>

              <Link
                to="/search"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                <Search size={18} />
                Search
              </Link>

              <Link
                to="/notifications"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                <Bell size={18} />
                Notifications
              </Link>

              <Link
                to="/profile"
                className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                {profile?.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="Profile"
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400">
                    <User size={16} />
                  </div>
                )}

                Profile
              </Link>

              <button
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-sm font-semibold text-gray-600 transition hover:bg-gray-100"
              >
                <LogOut size={18} />
                Logout
              </button>
            </div>
          </div>
        )}
      </header>

      {/* PAGE CONTENT */}
      <main>{children}</main>

      {/* FOOTER */}
      <footer className="mt-12 bg-gray-900 text-gray-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
          {/* BRAND */}
          <div>
            <Link
              to="/home"
              className="text-2xl font-black text-white"
            >
              cur<span className="text-yellow-400">.</span>book
            </Link>

            <p className="mt-4 max-w-sm text-sm leading-6 text-gray-400">
              A modern community platform where people can discover
              news, connect with others and explore products.
            </p>
          </div>

          {/* PLATFORM */}
          <div>
            <h3 className="font-black text-white">
              Platform
            </h3>

            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Link
                to="/home"
                className="transition hover:text-yellow-400"
              >
                Home
              </Link>

              <Link
                to="/news"
                className="transition hover:text-yellow-400"
              >
                News
              </Link>

              <Link
                to="/community"
                className="transition hover:text-yellow-400"
              >
                Community
              </Link>
            </div>
          </div>

          {/* ACCOUNT */}
          <div>
            <h3 className="font-black text-white">
              Account
            </h3>

            <div className="mt-4 flex flex-col gap-3 text-sm">
              <Link
                to="/profile"
                className="transition hover:text-yellow-400"
              >
                Profile
              </Link>

              <Link
                to="/settings"
                className="transition hover:text-yellow-400"
              >
                Settings
              </Link>

              <Link
                to="/notifications"
                className="transition hover:text-yellow-400"
              >
                Notifications
              </Link>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800">
          <div className="mx-auto max-w-7xl px-4 py-5 text-center text-xs text-gray-500 sm:px-6 lg:px-8">
            © {new Date().getFullYear()} CUR.BOOK. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}