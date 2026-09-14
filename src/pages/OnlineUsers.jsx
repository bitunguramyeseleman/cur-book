import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MessageCircle, Users, CircleDot, Loader2, RefreshCw,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

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

function Avatar({ person, size = "md", ring = false }) {
  const sizes = {
    xs: "w-7 h-7 text-[10px]",
    sm: "w-9 h-9 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-20 h-20 text-xl",
  };
  return person?.avatar_url ? (
    <img
      src={person.avatar_url}
      alt={getDisplayName(person)}
      className={`${sizes[size]} rounded-full object-cover border border-gray-700 ${
        ring ? "ring-2 ring-green-500/60" : ""
      }`}
    />
  ) : (
    <div
      className={`${sizes[size]} rounded-full bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 flex items-center justify-center font-bold text-gray-300 ${
        ring ? "ring-2 ring-green-500/60" : ""
      }`}
    >
      {getInitials(person)}
    </div>
  );
}

// =========================================================
// MAIN
// =========================================================
export default function OnlineUsers() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const channelRef = useRef(null);

  // =========================================================
  // INIT
  // =========================================================
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      try {
        setLoading(true);
        setError("");

        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;
        if (!currentUser) {
          setError("Please login to see online users.");
          return;
        }

        if (!mounted) return;
        setMe(currentUser);

        await setupPresence(currentUser);
      } catch (err) {
        console.error(err);
        setError(err?.message || "Failed to load online users.");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
      if (channelRef.current) {
        try {
          channelRef.current.untrack();
        } catch {}
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, []);

  // =========================================================
  // PRESENCE
  // =========================================================
  const setupPresence = async (currentUser) => {
    // Reuse the same channel name as Layout so we track consistently
    const channel = supabase.channel("global-online-users", {
      config: { presence: { key: currentUser.id } },
    });

    channelRef.current = channel;

    const handleSync = async () => {
      const state = channel.presenceState();
      const ids = Object.keys(state).filter((id) => id !== currentUser.id);

      if (ids.length === 0) {
        setOnlineUsers([]);
        return;
      }

      const { data, error: profilesError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio")
        .in("id", ids);

      if (profilesError) {
        console.error(profilesError);
        return;
      }

      const map = new Map((data || []).map((p) => [p.id, p]));
      const ordered = ids.map((id) => map.get(id)).filter(Boolean);
      setOnlineUsers(ordered);
    };

    channel
      .on("presence", { event: "sync" }, handleSync)
      .on("presence", { event: "join" }, handleSync)
      .on("presence", { event: "leave" }, handleSync);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          online_at: new Date().toISOString(),
          user_id: currentUser.id,
        });
      }
    });
  };

  // =========================================================
  // FILTER
  // =========================================================
  const filteredUsers = useMemo(() => {
    const v = search.trim().toLowerCase();
    if (!v) return onlineUsers;
    return onlineUsers.filter(
      (p) =>
        getDisplayName(p).toLowerCase().includes(v) ||
        (p.username?.toLowerCase() || "").includes(v)
    );
  }, [onlineUsers, search]);

  // =========================================================
  // ACTIONS
  // =========================================================
  const startChat = (person) => {
    navigate("/community", { state: { openUserId: person.id } });
  };

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      <div className="max-w-5xl mx-auto p-6 sm:p-8">

        {/* HEADER */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <CircleDot size={22} className="text-green-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black flex items-center gap-3 flex-wrap">
                Online Users
                <span className="flex items-center gap-1.5 text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/20 px-2.5 py-1 rounded-full">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                  </span>
                  Live
                </span>
              </h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {onlineUsers.length === 0
                  ? "No one else is online right now"
                  : `${onlineUsers.length} ${
                      onlineUsers.length === 1 ? "person" : "people"
                    } online`}
              </p>
            </div>
          </div>
        </div>

        {/* SEARCH */}
        <div className="relative mb-6">
          <Search
            size={17}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search online users..."
            className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-yellow-400 transition"
          />
        </div>

        {/* ERROR */}
        {error && (
          <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/5 p-4 text-sm text-red-300">
            {error}
          </div>
        )}

        {/* BODY */}
        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="h-24 rounded-2xl bg-gray-900 animate-pulse"
              />
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-gray-800 bg-gray-900 p-12 text-center"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <Users size={28} className="text-gray-600" />
            </div>
            <h2 className="text-lg font-black">
              {search ? "No users match your search" : "No one else is online"}
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              {search
                ? "Try a different keyword."
                : "When other members open cur.book, they'll appear here in real-time."}
            </p>
          </motion.div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence>
              {filteredUsers.map((person, index) => (
                <motion.div
                  key={person.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: index * 0.03 }}
                  className="group relative rounded-2xl border border-gray-800 bg-gray-900 p-4 transition-all duration-200 hover:border-green-500/50 hover:shadow-[0_0_24px_-8px_rgba(34,197,94,0.35)]"
                >
                  {/* Content */}
                  <div className="flex items-start gap-3">
                    {/* Avatar with green ring + pulse */}
                    <div className="relative shrink-0">
                      <div className="rounded-full ring-2 ring-green-500/60 p-0.5">
                        <Avatar person={person} size="md" />
                      </div>
                      <span className="absolute bottom-0 right-0 flex h-3.5 w-3.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
                        <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-green-500 border-2 border-gray-900" />
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-sm truncate text-white group-hover:text-green-400 transition">
                          {getDisplayName(person)}
                        </h3>
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Online
                        </span>
                      </div>

                      <p className="text-xs text-gray-500 truncate mt-0.5">
                        @{person.username || "user"}
                      </p>

                      {person.bio && (
                        <p className="text-[11px] text-gray-600 truncate mt-1">
                          {person.bio}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom action */}
                  <button
                    onClick={() => startChat(person)}
                    className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-gray-800 border border-gray-700 py-2.5 text-xs font-black text-gray-200 transition hover:bg-yellow-400 hover:text-gray-950 hover:border-yellow-400 active:scale-[0.98]"
                  >
                    <MessageCircle size={14} />
                    Start Chat
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* FOOTER HINT */}
        <div className="mt-8 flex items-center justify-center gap-2 text-xs text-gray-600">
          <RefreshCw size={12} />
          This list updates automatically in real-time
        </div>
      </div>
    </div>
  );
}