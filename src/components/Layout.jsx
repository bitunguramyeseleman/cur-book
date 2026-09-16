import { useEffect, useRef, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  Outlet,
} from "react-router-dom";
import {
  Bell,
  LogOut,
  Menu,
  Search,
  X,
  Home,
  Newspaper,
  MessageCircle,
  CircleDot,
  UsersRound,
  Camera,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "../lib/supabaseClient";
import NotificationsPanel from "./NotificationsPanel";
import Avatar from "./Avatar";
import Post from "../pages/Post";

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
// LOGO
// =========================================================
function Logo({ iconSize = "h-9 w-9" }) {
  return (
    <div className="flex items-center gap-2.5">
      <img
        src="/app.png"
        alt="CUR.BOOK logo"
        className={`${iconSize} object-contain rounded-lg shrink-0`}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
      <span className="text-lg font-black tracking-tight text-white">
        CUR<span className="text-yellow-400">.</span>BOOK
      </span>
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

  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Post overlay
  const [isPostOpen, setIsPostOpen] = useState(false);

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
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    setMobileMenu(false);
    setShowNotifications(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = mobileMenu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenu]);

  // lock body scroll while post overlay is open
  useEffect(() => {
    if (isPostOpen) {
      document.body.style.overflow = "hidden";
    } else if (!mobileMenu) {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isPostOpen, mobileMenu]);

  // =========================================================
  // UNREAD BADGE
  // =========================================================
  useEffect(() => {
    if (!user) return;

    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    };

    fetchUnread();

    const channel = supabase
      .channel(`notifications-badge-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => fetchUnread()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

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
      <div className="flex h-16 items-center border-b border-gray-800 px-5">
        <Link
          to="/home"
          onClick={onNavigate}
          className="flex items-center gap-2.5"
        >
          <Logo />
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

        {/* Post — opens overlay */}
        <button
          type="button"
          onClick={() => {
            setIsPostOpen(true);
            if (onNavigate) onNavigate();
          }}
          className="relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200 text-left text-gray-400 hover:bg-gray-800 hover:text-white"
        >
          <Camera size={18} className="shrink-0" />
          <span>Post</span>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-black bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
            NEW
          </span>
        </button>

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

        <button
          type="button"
          onClick={() => {
            setShowNotifications(true);
            if (onNavigate) onNavigate();
          }}
          className={`
            relative w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold
            transition text-left
            ${
              showNotifications
                ? "bg-yellow-400 text-gray-900"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }
          `}
        >
          <div className="relative shrink-0">
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-400 px-1 text-[9px] font-black text-gray-950 ring-2 ring-gray-950">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </div>
          Notifications
          {unreadCount > 0 && (
            <span className="ml-auto text-[10px] font-black text-yellow-400">
              {unreadCount}
            </span>
          )}
        </button>

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
          <Avatar person={profile} size="sm" />
          Profile
        </Link>
      </nav>

      <div className="border-t border-gray-800 p-3">
        <div className="mb-2 flex items-center gap-3 rounded-xl bg-gray-900 p-3">
          <Avatar person={profile} size="sm" online />
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
        <Link to="/home" className="flex items-center gap-2">
          <img
            src="/app.png"
            alt="CUR.BOOK logo"
            className="h-9 w-9 object-contain rounded-lg"
            onError={(e) => (e.currentTarget.style.display = "none")}
          />
          <span className="text-lg font-black tracking-tight text-gray-900">
            CUR<span className="text-yellow-500">.</span>BOOK
          </span>
        </Link>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsPostOpen(true)}
            title="New post"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400 text-gray-950 transition hover:bg-yellow-300"
          >
            <Camera size={19} />
          </button>

          <button
            onClick={() => setShowNotifications(true)}
            className="relative flex h-10 w-10 items-center justify-center rounded-xl text-gray-700 transition hover:bg-gray-100"
          >
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-yellow-400 px-1 text-[9px] font-black text-gray-950 ring-2 ring-white">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenu(true)}
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-700 transition hover:bg-yellow-100"
          >
            <Menu size={22} />
          </button>
        </div>
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

      {/* NOTIFICATIONS DRAWER */}
      <AnimatePresence>
        {showNotifications && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowNotifications(false)}
              className="fixed inset-0 z-[75] bg-black/40 backdrop-blur-[2px]"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 320, damping: 32 }}
              className="fixed inset-y-0 left-0 z-[80] w-full sm:w-[420px] bg-black border-r border-gray-900 flex flex-col shadow-2xl shadow-black/70"
            >
              <NotificationsPanel
                onClose={() => setShowNotifications(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* POST OVERLAY MODAL */}
      <AnimatePresence>
        {isPostOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPostOpen(false)}
              className="fixed inset-0 z-[110] bg-black/70 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="fixed inset-0 z-[115] flex items-start justify-center overflow-y-auto p-3 sm:p-6"
              onClick={() => setIsPostOpen(false)}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                className="relative w-full max-w-xl rounded-[28px] border border-gray-800 bg-gray-950 shadow-2xl shadow-black/70 my-4 sm:my-8"
              >
                <Post
                  onClose={() => setIsPostOpen(false)}
                  onPosted={() => setIsPostOpen(false)}
                />
              </div>
            </motion.div>
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
              <Link to="/home" className="inline-flex items-center gap-2.5">
                <img
                  src="/app.png"
                  alt="CUR.BOOK logo"
                  className="h-10 w-10 object-contain rounded-lg"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
                <span className="text-2xl font-black tracking-tight text-white">
                  cur<span className="text-yellow-400">.</span>book
                </span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-6 text-gray-400">
                A modern community platform where people can discover news,
                connect with others and explore products.
              </p>
            </div>

            <div>
              <h3 className="font-black text-white">Platform</h3>
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
                <button
                  type="button"
                  onClick={() => setIsPostOpen(true)}
                  className="text-left transition hover:text-yellow-400"
                >
                  Post
                </button>
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