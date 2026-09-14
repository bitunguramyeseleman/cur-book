import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import {
  Bell,
  LogOut,
  Menu,
  Search,
  User,
  X,
  Home,
  Newspaper,
  MessageCircle,
  Users,
  CircleDot,
  UsersRound,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";

// =========================================================
// CONSTANTS
// =========================================================
const NAV_LINKS = [
  { to: "/home", label: "Home", icon: Home },
  { to: "/news", label: "News", icon: Newspaper },
];

const COMMUNITY_LINKS = [
  { key: "groups", label: "Groups", icon: UsersRound },
  { key: "online", label: "Online", icon: CircleDot, live: true },
  { key: "chat", label: "Chat", icon: MessageCircle },
];

// =========================================================
// HELPERS
// =========================================================
const getDisplayName = (p) =>
  p?.full_name?.trim() || p?.username?.trim() || "User";

const getInitials = (p) =>
  getDisplayName(p)
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");

function Avatar({ person, size = "md" }) {
  const sizes = {
    sm: "w-9 h-9 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-14 h-14 text-base",
  };
  return person?.avatar_url ? (
    <img
      src={person.avatar_url}
      alt={getDisplayName(person)}
      className={`${sizes[size]} rounded-full object-cover border border-gray-700`}
    />
  ) : (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center font-bold text-gray-300`}
    >
      {getInitials(person)}
    </div>
  );
}

// =========================================================
// MAIN LAYOUT
// =========================================================
export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [mobileMenu, setMobileMenu] = useState(false);

  const meRef = useRef(null);

  // =========================================================
  // LOAD USER
  // =========================================================
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

  useEffect(() => {
    document.body.style.overflow = mobileMenu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenu]);

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
      meRef.current = currentUser;

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

  // =========================================================
  // ACTIVE HELPERS
  // =========================================================
  const isActive = (path, exact = false) => {
    if (exact) return location.pathname === path;
    if (path === "/home") return location.pathname === "/home";
    return location.pathname.startsWith(path);
  };

  const isCommunityLinkActive = (key) => {
    const p = location.pathname;
    if (key === "groups")
      return (
        p.startsWith("/community/groups") || p.startsWith("/community/group/")
      );
    if (key === "online") return p.startsWith("/community/online");
    if (key === "chat") return p === "/community" || p === "/community/";
    return false;
  };

  const handleCommunityClick = (key, onNavigate) => {
    if (key === "groups") {
      navigate("/community/groups");
      if (onNavigate) onNavigate();
      return;
    }
    if (key === "online") {
      navigate("/community/online");
      if (onNavigate) onNavigate();
      return;
    }
    if (key === "chat") {
      navigate("/community");
      if (onNavigate) onNavigate();
      return;
    }
  };

  // =========================================================
  // SIDEBAR CONTENT
  // =========================================================
  const SidebarContent = ({ onNavigate }) => (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center border-b border-gray-800 px-6">
        <Link
          to="/home"
          onClick={onNavigate}
          className="text-lg font-black tracking-tight text-white"
        >
          CUR<span className="text-yellow-400">.</span>BOOK
        </Link>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-2 text-[10px] font-black uppercase tracking-widest text-gray-600">
          Menu
        </p>

        {NAV_LINKS.map(({ to, label, icon: Icon }) => {
          const active = isActive(to);
          return (
            <Link
              key={to}
              to={to}
              onClick={onNavigate}
              className={`
                relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold
                transition-all duration-200
                ${
                  active
                    ? "text-gray-900"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }
              `}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-xl bg-yellow-400 shadow-[0_4px_14px_-4px_rgba(250,204,21,0.6)]"
                />
              )}
              <Icon size={18} className="relative z-10 shrink-0" />
              <span className="relative z-10">{label}</span>
            </Link>
          );
        })}

        <p className="px-3 pb-2 pt-6 text-[10px] font-black uppercase tracking-widest text-gray-600">
          Community
        </p>

        {COMMUNITY_LINKS.map(({ key, label, icon: Icon, live }) => {
          const active = isCommunityLinkActive(key);
          return (
            <button
              key={key}
              type="button"
              onClick={() => handleCommunityClick(key, onNavigate)}
              className={`
                relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold
                transition-all duration-200 text-left
                ${
                  active
                    ? "text-gray-900"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                }
              `}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-pill"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  className="absolute inset-0 rounded-xl bg-yellow-400 shadow-[0_4px_14px_-4px_rgba(250,204,21,0.6)]"
                />
              )}
              <Icon size={18} className="relative z-10 shrink-0" />
              <span className="relative z-10">{label}</span>

              {live && (
                <span className="relative z-10 ml-auto flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
              )}
            </button>
          );
        })}

        <p className="px-3 pb-2 pt-6 text-[10px] font-black uppercase tracking-widest text-gray-600">
          Account
        </p>

        <Link
          to="/search"
          onClick={onNavigate}
          className={`
            flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition
            ${
              isActive("/search")
                ? "bg-yellow-400 text-gray-900"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }
          `}
        >
          <Search size={18} className="shrink-0" />
          Search
        </Link>

        <Link
          to="/notifications"
          onClick={onNavigate}
          className={`
            flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition
            ${
              isActive("/notifications")
                ? "bg-yellow-400 text-gray-900"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }
          `}
        >
          <div className="relative shrink-0">
            <Bell size={18} />
            <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-yellow-400 ring-2 ring-gray-950" />
          </div>
          Notifications
        </Link>

        <Link
          to="/profile"
          onClick={onNavigate}
          className={`
            flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition
            ${
              isActive("/profile")
                ? "bg-yellow-400 text-gray-900"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }
          `}
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile"
              className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-yellow-400"
            />
          ) : (
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-gray-900">
              <User size={14} />
            </div>
          )}
          Profile
        </Link>
      </nav>

      <div className="border-t border-gray-800 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-gray-900 p-3">
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Profile"
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-yellow-400"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-gray-900">
              <User size={16} />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">
              {profile?.username || profile?.full_name || "User"}
            </p>
            <p className="truncate text-[11px] text-gray-500">
              {user?.email || "Member"}
            </p>
          </div>
          <span className="h-2 w-2 shrink-0 rounded-full bg-green-500" />
        </div>

        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10"
        >
          <LogOut size={18} className="shrink-0" />
          Logout
        </button>
      </div>
    </div>
  );

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* DESKTOP SIDEBAR */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] border-r border-gray-800 bg-gray-950 lg:block">
        <SidebarContent />
      </aside>

      {/* MOBILE TOP BAR */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur-md lg:hidden">
        <Link
          to="/home"
          className="text-lg font-black tracking-tight text-gray-900"
        >
          CUR<span className="text-yellow-500">.</span>BOOK
        </Link>
        <button
          onClick={() => setMobileMenu(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition hover:bg-yellow-100"
        >
          <Menu size={22} />
        </button>
      </header>

      {/* MOBILE DRAWER */}
      <AnimatePresence>
        {mobileMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenu(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[280px] bg-gray-950 lg:hidden"
            >
              <button
                onClick={() => setMobileMenu(false)}
                className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-gray-400 transition hover:text-white"
              >
                <X size={18} />
              </button>
              <SidebarContent onNavigate={() => setMobileMenu(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN CONTENT */}
      <div className="lg:pl-[260px]">
        <main>
          <Outlet />
        </main>

        {/* FOOTER */}
        <footer className="mt-12 bg-gray-900 text-gray-300">
          <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3 lg:px-8">
            <div>
              <Link to="/home" className="text-2xl font-black text-white">
                cur<span className="text-yellow-400">.</span>book
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-6 text-gray-400">
                A modern community platform where people can discover news,
                connect with others and explore products.
              </p>
            </div>

            <div>
              <h3 className="font-black text-white">Platform</h3>
              <div className="mt-4 flex flex-col gap-3 text-sm">
                {NAV_LINKS.map(({ to, label }) => (
                  <Link
                    key={to}
                    to={to}
                    className="transition hover:text-yellow-400"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-black text-white">Account</h3>
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
    </div>
  );
}