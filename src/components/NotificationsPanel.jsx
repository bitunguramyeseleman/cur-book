import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { useNavigate } from "react-router-dom";
import Avatar, { getDisplayName, getInitials } from "./Avatar";

// =========================================================
// HELPERS
// =========================================================
const formatRelative = (date) => {
  if (!date) return "";
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const getSectionLabel = (date) => {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays < 1) return "Today";
  if (diffDays < 7) return "This week";
  if (diffDays < 30) return "This month";
  return "Earlier";
};

const detectType = (n) => {
  const text = `${n.title || ""} ${n.message || ""}`.toLowerCase();
  if (text.includes("follower") || text.includes("started following"))
    return "follow";
  if (text.includes("liked") || text.includes("like")) return "like";
  if (text.includes("comment")) return "comment";
  if (text.includes("message")) return "message";
  return "other";
};

// =========================================================
// AVATAR STACK — uses shared Avatar for single, initials for stacks
// =========================================================
function AvatarStack({ title, actors = [] }) {
  // If real actors data is available, use it
  if (actors?.length > 0) {
    const named = actors.slice(0, 2);
    const extra = actors.length - named.length;

    if (named.length === 1 && extra === 0) {
      return (
        <div className="relative h-12 w-12">
          <Avatar
            person={{
              id: named[0].id,
              username: named[0].name,
              avatar_url: named[0].avatar_url,
            }}
            size="md"
          />
        </div>
      );
    }

    return (
      <div className="relative h-12 w-12">
        {named.map((actor, i) => (
          <div
            key={i}
            className="absolute flex h-9 w-9 items-center justify-center rounded-full border-2 border-black overflow-hidden"
            style={{
              left: i === 0 ? 0 : 18,
              top: i === 0 ? 0 : 14,
              zIndex: named.length - i,
            }}
          >
            <Avatar
              person={{
                id: actor.id,
                username: actor.name,
                avatar_url: actor.avatar_url,
              }}
              size="sm"
            />
          </div>
        ))}
        {extra > 0 && (
          <div
            className="absolute flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-gray-800 text-[10px] font-bold text-gray-400"
            style={{ left: 18, top: 14 }}
          >
            +{extra}
          </div>
        )}
      </div>
    );
  }

  // Fallback: parse names from title
  const parts = title
    .split(/,|and/)
    .map((s) => s.trim())
    .filter(Boolean);
  const othersMatch = title.match(/(\d+)\s+others/i);
  const othersCount = othersMatch ? parseInt(othersMatch[1], 10) : 0;
  const namedAvatars = parts
    .filter((p) => !/^\d+\s+others$/i.test(p))
    .slice(0, 2);

  if (namedAvatars.length === 1 && othersCount === 0) {
    return (
      <div className="relative h-12 w-12">
        <Avatar
          person={{ id: namedAvatars[0], username: namedAvatars[0] }}
          size="md"
        />
      </div>
    );
  }

  return (
    <div className="relative h-12 w-12">
      {namedAvatars.map((name, i) => (
        <div
          key={i}
          className="absolute flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-gradient-to-br from-gray-700 to-gray-900 text-xs font-bold text-white"
          style={{
            left: i === 0 ? 0 : 18,
            top: i === 0 ? 0 : 14,
            zIndex: namedAvatars.length - i,
          }}
        >
          {getInitials({ username: name })}
        </div>
      ))}
      {othersCount > 0 && namedAvatars.length < 2 && (
        <div
          className="absolute flex h-9 w-9 items-center justify-center rounded-full border-2 border-black bg-gray-800 text-[10px] font-bold text-gray-400"
          style={{ left: 18, top: 14 }}
        >
          +{othersCount}
        </div>
      )}
    </div>
  );
}

// =========================================================
// MAIN PANEL
// =========================================================
export default function NotificationsPanel({ onClose }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");

  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  const load = async () => {
    try {
      setError("");
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        navigate("/login");
        return;
      }
      setUser(currentUser);

      const { data, error: e } = await supabase
        .from("notifications")
        .select("id, user_id, title, message, is_read, created_at")
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: false });

      if (e) throw e;
      setNotifications(data || []);
    } catch (err) {
      console.error(err);
      setError("Unable to load notifications.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await load();
  };

  const markAsRead = async (id) => {
    try {
      setProcessingId(id);
      const { error: e } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", id)
        .eq("user_id", user.id);
      if (e) throw e;
      setNotifications((cur) =>
        cur.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);
      const unread = notifications.filter((n) => !n.is_read);
      if (unread.length === 0) {
        setSuccess("All caught up.");
        setTimeout(() => setSuccess(""), 2000);
        return;
      }
      const { error: e } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      if (e) throw e;
      setNotifications((cur) => cur.map((n) => ({ ...n, is_read: true })));
      setSuccess("All marked as read.");
      setTimeout(() => setSuccess(""), 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (id) => {
    try {
      setProcessingId(id);
      const { error: e } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (e) throw e;
      setNotifications((cur) => cur.filter((n) => n.id !== id));
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === "all") return true;
    const t = detectType(n);
    if (activeFilter === "people") return t === "follow";
    if (activeFilter === "comments") return t === "comment" || t === "like";
    if (activeFilter === "follows") return t === "follow";
    return true;
  });

  const grouped = filteredNotifications.reduce((acc, n) => {
    const section = getSectionLabel(n.created_at);
    if (!acc[section]) acc[section] = [];
    acc[section].push(n);
    return acc;
  }, {});

  const sectionOrder = ["Today", "This week", "This month", "Earlier"];

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "people", label: "People you follow" },
    { key: "comments", label: "Comments" },
    { key: "follows", label: "Follows" },
  ];

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex h-full flex-col bg-black text-white">
      {/* ================= HEADER ================= */}
      <div className="shrink-0 border-b border-gray-900">
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
            {unreadCount > 0 && (
              <span className="rounded-full bg-yellow-400 px-2 py-0.5 text-[11px] font-black text-gray-950">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-900 hover:text-white disabled:opacity-60"
              title="Refresh"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin" : ""}
              />
            </button>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-900 hover:text-white"
              title="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex gap-2 overflow-x-auto px-4 pb-3 scrollbar-hide">
          {FILTERS.map((f) => {
            const active = activeFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={`shrink-0 rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                  active
                    ? "border-white bg-white text-black"
                    : "border-gray-700 bg-black text-white hover:border-gray-500"
                }`}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ================= TOASTS ================= */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mt-3 flex items-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-3 py-2"
          >
            <Check size={14} className="text-yellow-400" />
            <p className="text-xs font-semibold">{success}</p>
          </motion.div>
        )}

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mx-4 mt-3 flex items-center justify-between gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2"
          >
            <p className="text-xs font-semibold text-red-300">{error}</p>
            <button
              onClick={() => setError("")}
              className="text-red-400 hover:text-red-300"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= MARK ALL ================= */}
      {notifications.some((n) => !n.is_read) && (
        <div className="px-4 pt-3 flex justify-end">
          <button
            onClick={markAllAsRead}
            disabled={markingAll}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-400 hover:text-yellow-400"
          >
            {markingAll ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <CheckCheck size={12} />
            )}
            Mark all as read
          </button>
        </div>
      )}

      {/* ================= LIST ================= */}
      <div className="flex-1 overflow-y-auto pb-6">
        {loading ? (
          <div className="space-y-2 p-4">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl bg-gray-900/40 p-3"
              >
                <div className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-gray-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-800" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-800" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="px-6 py-20 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-gray-800">
              <Bell size={32} className="text-gray-600" strokeWidth={1.5} />
            </div>
            <h2 className="mt-6 text-xl font-bold">No notifications</h2>
            <p className="mx-auto mt-2 max-w-xs text-sm text-gray-500">
              When someone interacts with you, you'll see it here.
            </p>
          </div>
        ) : (
          sectionOrder.map((section) => {
            const items = grouped[section];
            if (!items || items.length === 0) return null;
            return (
              <div key={section}>
                <h2 className="px-4 pt-5 pb-2 text-base font-bold">
                  {section}
                </h2>
                <div className="divide-y divide-gray-900/80">
                  {items.map((n) => {
                    const isUnread = !n.is_read;
                    const isProcessing = processingId === n.id;
                    const type = detectType(n);

                    return (
                      <motion.div
                        key={n.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={() => {
                          if (isUnread && !isProcessing) markAsRead(n.id);
                        }}
                        className={`group relative flex items-center gap-3 px-4 py-3 cursor-pointer transition hover:bg-gray-900/40 ${
                          isUnread ? "" : "opacity-70"
                        }`}
                      >
                        {/* Avatar stack */}
                        <div className="relative shrink-0">
                          <AvatarStack
                            title={n.title}
                            actors={n.actors}
                          />
                        </div>

                        {/* Text */}
                        <div className="min-w-0 flex-1">
                          <p className="text-sm leading-snug text-white">
                            <span className="font-bold">{n.title}</span>{" "}
                            <span className="text-gray-300">{n.message}</span>{" "}
                            <span className="text-xs text-gray-500 ml-1">
                              {formatRelative(n.created_at)}
                            </span>
                          </p>
                        </div>

                        {/* Right */}
                        <div className="flex shrink-0 items-center gap-2">
                          {type === "follow" ? (
                            <button
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-lg bg-blue-500 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-blue-600"
                            >
                              Follow Back
                            </button>
                          ) : n.thumbnail_url ? (
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gray-800">
                              <img
                                src={n.thumbnail_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-gray-800 to-gray-900" />
                          )}

                          {/* Delete on hover */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(n.id);
                            }}
                            disabled={isProcessing}
                            className="absolute right-2 top-1/2 hidden -translate-y-1/2 h-7 w-7 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-red-500/20 hover:text-red-400 group-hover:flex"
                          >
                            {isProcessing ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Trash2 size={12} />
                            )}
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}