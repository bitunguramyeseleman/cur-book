import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Send, Smile, Paperclip, Users, Crown, Check, Loader2,
  X, LogOut, ChevronDown,
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

const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "";

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
};

const EMOJIS = ["😀","😂","🥰","😎","🤔","👍","🔥","❤️","🎉","😢","😡","🙏","💯","✨","😴","🤝"];

function Avatar({ person, size = "md" }) {
  const sizes = {
    xs: "w-7 h-7 text-[10px]",
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

function GroupAvatar({ group, size = "md" }) {
  const sizes = {
    sm: "w-10 h-10 text-xs",
    md: "w-12 h-12 text-sm",
    lg: "w-16 h-16 text-base",
  };
  return group?.avatar_url ? (
    <img
      src={group.avatar_url}
      alt={group.name}
      className={`${sizes[size]} rounded-2xl object-cover border border-gray-700`}
    />
  ) : (
    <div
      className={`${sizes[size]} rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center font-black text-gray-950`}
    >
      {group?.name?.charAt(0)?.toUpperCase() || "G"}
    </div>
  );
}

// =========================================================
// MAIN
// =========================================================
export default function GroupChat() {
  const { groupId: groupIdParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  // Always use numeric group id for realtime filters + inserts
  const groupId = useMemo(() => {
    const n = Number(groupIdParam);
    return Number.isNaN(n) ? null : n;
  }, [groupIdParam]);

  const [me, setMe] = useState(null);
  const [group, setGroup] = useState(location.state?.group || null);
  const [members, setMembers] = useState([]);
  const [messages, setMessages] = useState([]);
  const [profilesMap, setProfilesMap] = useState({});

  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [rtStatus, setRtStatus] = useState("CONNECTING"); // debug badge

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [autoScroll, setAutoScroll] = useState(true);

  // =========================================================
  // INIT
  // =========================================================
  useEffect(() => {
    if (groupId == null) {
      setError("Invalid group id.");
      setLoading(false);
      return;
    }
    init();
    // eslint-disable-next-line
  }, [groupId]);

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
        setError("Please login.");
        return;
      }
      setMe(currentUser);

      // Verify membership
      const { data: membership, error: mErr } = await supabase
        .from("group_members")
        .select("role")
        .eq("group_id", groupId)
        .eq("user_id", currentUser.id)
        .maybeSingle();

      if (mErr) throw mErr;
      if (!membership) {
        setError("You're not a member of this group.");
        return;
      }

      await Promise.all([loadGroup(), loadMembers(), loadMessages()]);
    } catch (err) {
      console.error("[GroupChat] init error:", err);
      setError(err?.message || "Failed to load group.");
    } finally {
      setLoading(false);
    }
  };

  const loadGroup = async () => {
    const { data, error: gErr } = await supabase
      .from("groups")
      .select("*")
      .eq("id", groupId)
      .single();
    if (gErr) throw gErr;
    setGroup(data);
  };

  const loadMembers = async () => {
    const { data: rows, error: mErr } = await supabase
      .from("group_members")
      .select("user_id, role, joined_at")
      .eq("group_id", groupId);
    if (mErr) throw mErr;

    const ids = (rows || []).map((r) => r.user_id);
    if (!ids.length) {
      setMembers([]);
      return;
    }

    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .in("id", ids);

    const map = new Map((profiles || []).map((p) => [p.id, p]));
    const enriched = (rows || []).map((r) => ({
      ...r,
      profile: map.get(r.user_id),
    }));

    setMembers(enriched);
    setProfilesMap((prev) => {
      const next = { ...prev };
      map.forEach((v, k) => (next[k] = v));
      return next;
    });
  };

  const loadMessages = async () => {
    const { data, error: msgErr } = await supabase
      .from("messages")
      .select("id, sender_id, group_id, message, created_at")
      .eq("group_id", groupId)
      .order("created_at", { ascending: true });
    if (msgErr) throw msgErr;

    const list = data || [];
    setMessages(list);

    const unknownIds = [
      ...new Set(
        list
          .map((m) => m.sender_id)
          .filter((id) => id && !profilesMap[id])
      ),
    ];

    if (unknownIds.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", unknownIds);

      const map = {};
      (profiles || []).forEach((p) => (map[p.id] = p));
      setProfilesMap((prev) => ({ ...prev, ...map }));
    }
  };

  // =========================================================
  // REALTIME — with fresh session + retry + logging
  // =========================================================
  useEffect(() => {
    if (!me?.id || groupId == null) return;

    let channel;
    let cancelled = false;

    const setup = async () => {
      // 1. Ensure we have a fresh session so realtime has the JWT
      const { data: sessionData, error: sessionErr } =
        await supabase.auth.getSession();

      if (sessionErr) {
        console.error("[RT] getSession error:", sessionErr);
      }
      if (!sessionData?.session) {
        console.warn("[RT] no session — realtime may be unauthorized");
      }

      // 2. Set the auth token on realtime (Supabase v2 does this automatically,
      //    but calling explicitly helps in edge cases after login)
      if (sessionData?.session?.access_token) {
        try {
          supabase.realtime.setAuth(sessionData.session.access_token);
        } catch (e) {
          console.warn("[RT] setAuth failed:", e);
        }
      }

      if (cancelled) return;

      const channelName = `group-${groupId}-${me.id}`;
      console.log("[RT] subscribing", {
        channelName,
        groupId,
        userId: me.id,
        filter: `group_id=eq.${groupId}`,
      });

      channel = supabase
        .channel(channelName)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `group_id=eq.${groupId}`,
          },
          (payload) => {
            console.log("[RT] 📩 incoming", payload.new);
            const msg = payload.new;
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );

            // Fetch sender profile if missing
            setProfilesMap((prev) => {
              if (prev[msg.sender_id]) return prev;
              // fire-and-forget fetch
              supabase
                .from("profiles")
                .select("id, username, full_name, avatar_url")
                .eq("id", msg.sender_id)
                .maybeSingle()
                .then(({ data }) => {
                  if (data) {
                    setProfilesMap((p) => ({ ...p, [data.id]: data }));
                  }
                });
              return prev;
            });
          }
        )
        .subscribe((status, err) => {
          console.log("[RT] status:", status, err || "");
          setRtStatus(status);
          if (status === "CHANNEL_ERROR") {
            // Retry once after 2s
            console.warn("[RT] channel error, will retry in 2s");
            setTimeout(() => {
              if (!cancelled && channel) {
                supabase.removeChannel(channel);
                channel = null;
                setup();
              }
            }, 2000);
          }
        });
    };

    setup();

    return () => {
      cancelled = true;
      if (channel) {
        console.log("[RT] cleanup");
        supabase.removeChannel(channel);
      }
    };
  }, [me?.id, groupId]);

  // =========================================================
  // AUTO SCROLL
  // =========================================================
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setAutoScroll(nearBottom);
  };

  useEffect(() => {
    if (autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, autoScroll]);

  // =========================================================
  // SEND (optimistic)
  // =========================================================
  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = messageText.trim();
    if (!text || !me || sending || groupId == null) return;

    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      sender_id: me.id,
      group_id: groupId,
      message: text,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };

    try {
      setSending(true);
      setError("");
      setMessageText("");
      setShowEmoji(false);

      setMessages((prev) => [...prev, optimistic]);
      setAutoScroll(true);

      const { data, error: sendErr } = await supabase
        .from("messages")
        .insert({
          sender_id: me.id,
          receiver_id: null,
          group_id: groupId,
          message: text,
          is_read: false,
        })
        .select()
        .single();

      if (sendErr) throw sendErr;

      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? data : m))
      );
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      console.error("[send] error:", err);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setMessageText(text);
      setError(err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  const insertEmoji = (emoji) => {
    setMessageText((t) => t + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  // =========================================================
  // LEAVE GROUP
  // =========================================================
  const leaveGroup = async () => {
    if (!me || groupId == null) return;
    if (!confirm("Leave this group?")) return;
    try {
      const { error: delErr } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", groupId)
        .eq("user_id", me.id);
      if (delErr) throw delErr;
      navigate("/community");
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to leave group.");
    }
  };

  // =========================================================
  // LOADING / ERROR SCREENS
  // =========================================================
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gray-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-yellow-400" size={32} />
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gray-950 text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center">
          <h2 className="text-xl font-black mb-2">Can't open this group</h2>
          <p className="text-sm text-gray-400">{error}</p>
          <button
            onClick={() => navigate("/community")}
            className="mt-6 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-gray-950 hover:bg-yellow-300"
          >
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="h-[calc(100vh-80px)] min-h-[600px] bg-gray-950 text-white flex flex-col">

      {/* ================= HEADER ================= */}
      <header className="h-[72px] shrink-0 border-b border-gray-800 bg-gray-950 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => navigate("/community")}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-gray-400 transition hover:text-white"
          >
            <ArrowLeft size={18} />
          </button>

          <GroupAvatar group={group} size="sm" />

          <div className="min-w-0">
            <h2 className="font-black text-sm sm:text-base truncate">
              {group?.name}
            </h2>
            <p className="text-xs text-gray-500 truncate flex items-center gap-1.5">
              <span>
                {members.length} {members.length === 1 ? "member" : "members"}
              </span>
              <span className="text-gray-700">·</span>
              {/* Tiny realtime status dot */}
              <span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  rtStatus === "SUBSCRIBED"
                    ? "bg-green-500"
                    : rtStatus === "CHANNEL_ERROR"
                    ? "bg-red-500"
                    : "bg-yellow-500"
                }`}
                title={`Realtime: ${rtStatus}`}
              />
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowMembersPanel(true)}
            title="Members"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-900 hover:text-yellow-400"
          >
            <Users size={18} />
          </button>
          <button
            onClick={leaveGroup}
            title="Leave group"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 transition hover:bg-red-500/10 hover:text-red-400"
          >
            <LogOut size={17} />
          </button>
        </div>
      </header>

      {/* ================= MESSAGES ================= */}
      <div
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 relative"
      >
        {messages.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-4">
                <Users size={26} className="text-yellow-400" />
              </div>
              <h3 className="font-black">No messages yet</h3>
              <p className="text-gray-500 text-sm mt-1">
                Be the first to say something in {group?.name}
              </p>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            <div className="space-y-1">
              {messages.map((message, index) => {
                const mine = message.sender_id === me?.id;
                const prev = messages[index - 1];
                const next = messages[index + 1];
                const sender = profilesMap[message.sender_id];

                const showDateSeparator =
                  !prev || !isSameDay(prev.created_at, message.created_at);
                const isFirstInGroup =
                  !prev ||
                  prev.sender_id !== message.sender_id ||
                  !isSameDay(prev.created_at, message.created_at);
                const isLastInGroup =
                  !next ||
                  next.sender_id !== message.sender_id ||
                  !isSameDay(next.created_at, message.created_at);

                const bubbleRadius = mine
                  ? `rounded-2xl ${
                      isFirstInGroup ? "rounded-tr-2xl" : "rounded-tr-md"
                    } ${isLastInGroup ? "rounded-br-md" : "rounded-br-2xl"}`
                  : `rounded-2xl ${
                      isFirstInGroup ? "rounded-tl-2xl" : "rounded-tl-md"
                    } ${isLastInGroup ? "rounded-bl-md" : "rounded-bl-2xl"}`;

                return (
                  <div key={message.id}>
                    {showDateSeparator && (
                      <div className="flex justify-center my-6">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-900 px-3 py-1.5 rounded-full">
                          {isSameDay(message.created_at, new Date())
                            ? "Today"
                            : formatDate(message.created_at)}
                        </span>
                      </div>
                    )}

                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${
                        mine ? "justify-end" : "justify-start"
                      } ${isLastInGroup ? "mb-2" : "mb-0.5"}`}
                    >
                      <div
                        className={`max-w-[80%] sm:max-w-[65%] flex gap-2 ${
                          mine ? "flex-row-reverse" : "flex-row"
                        }`}
                      >
                        {!mine && (
                          <div className="w-9 shrink-0">
                            {isLastInGroup && (
                              <Avatar
                                person={sender || { id: message.sender_id }}
                                size="sm"
                              />
                            )}
                          </div>
                        )}

                        <div
                          className={`flex flex-col ${
                            mine ? "items-end" : "items-start"
                          }`}
                        >
                          {!mine && isFirstInGroup && (
                            <p className="text-[11px] font-bold text-yellow-400 mb-1 px-1">
                              {getDisplayName(sender)}
                            </p>
                          )}

                          <div
                            className={`
                              px-4 py-2.5 shadow-sm transition-opacity
                              ${bubbleRadius}
                              ${
                                mine
                                  ? "bg-yellow-400 text-gray-950"
                                  : "bg-gray-800 text-gray-200 border border-gray-700"
                              }
                              ${
                                message._optimistic
                                  ? "opacity-70"
                                  : "opacity-100"
                              }
                            `}
                          >
                            <p className="text-sm leading-6 whitespace-pre-wrap break-words">
                              {message.message}
                            </p>
                          </div>

                          {isLastInGroup && (
                            <div
                              className={`flex items-center gap-1.5 mt-1 ${
                                mine ? "justify-end" : "justify-start"
                              }`}
                            >
                              <span className="text-[9px] text-gray-600">
                                {formatTime(message.created_at)}
                              </span>
                              {mine && message._optimistic && (
                                <Loader2
                                  size={11}
                                  className="text-gray-500 animate-spin"
                                />
                              )}
                              {mine && !message._optimistic && (
                                <Check size={12} className="text-yellow-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}

        {/* Scroll-to-bottom button */}
        <AnimatePresence>
          {!autoScroll && (
            <motion.button
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              onClick={() => {
                setAutoScroll(true);
                messagesEndRef.current?.scrollIntoView({
                  behavior: "smooth",
                });
              }}
              className="sticky bottom-4 left-1/2 -translate-x-1/2 z-20 rounded-full bg-yellow-400 text-gray-950 p-2.5 shadow-2xl hover:bg-yellow-300"
            >
              <ChevronDown size={18} strokeWidth={3} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* ================= COMPOSER ================= */}
      <div className="shrink-0 border-t border-gray-800 p-3 sm:p-4 bg-gray-950">
        <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative">
          <AnimatePresence>
            {showEmoji && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                className="absolute bottom-full mb-2 left-0 bg-gray-900 border border-gray-800 rounded-2xl p-3 shadow-2xl grid grid-cols-8 gap-1 w-[280px] z-50"
              >
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => insertEmoji(emoji)}
                    className="w-8 h-8 rounded-lg hover:bg-gray-800 flex items-center justify-center text-lg transition"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-end gap-2 bg-gray-900 border border-gray-800 rounded-2xl p-2 focus-within:border-yellow-400/60 transition">
            <button
              type="button"
              className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center text-gray-600 hover:text-yellow-400 hover:bg-gray-800 transition"
            >
              <Paperclip size={19} />
            </button>
            <button
              type="button"
              onClick={() => setShowEmoji((s) => !s)}
              className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center transition ${
                showEmoji
                  ? "text-yellow-400 bg-gray-800"
                  : "text-gray-600 hover:text-yellow-400 hover:bg-gray-800"
              }`}
            >
              <Smile size={19} />
            </button>

            <textarea
              ref={inputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              rows={1}
              placeholder="Write a message..."
              className="flex-1 resize-none bg-transparent outline-none text-sm text-white placeholder:text-gray-600 py-2.5 px-2 max-h-32"
            />

            <motion.button
              whileTap={{ scale: 0.92 }}
              type="submit"
              disabled={!messageText.trim() || sending}
              className="w-11 h-11 shrink-0 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-yellow-300 transition"
            >
              {sending ? (
                <Loader2 size={19} className="animate-spin" />
              ) : (
                <Send size={19} fill="currentColor" />
              )}
            </motion.button>
          </div>

          {error && (
            <p className="text-xs text-red-400 mt-2 px-2">{error}</p>
          )}

          <p className="hidden sm:block text-[9px] text-gray-700 text-center mt-2">
            Press Enter to send • Shift + Enter for a new line
          </p>
        </form>
      </div>

      {/* ================= MEMBERS PANEL ================= */}
      <AnimatePresence>
        {showMembersPanel && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMembersPanel(false)}
              className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 z-[90] w-full sm:w-[380px] bg-gray-950 border-l border-gray-800 flex flex-col"
            >
              <div className="flex items-center justify-between border-b border-gray-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                    <Users size={18} className="text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-black text-white">Members</h3>
                    <p className="text-xs text-gray-500">
                      {members.length} total
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMembersPanel(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-gray-400 transition hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-1">
                {members.map((m) => {
                  const p = m.profile;
                  if (!p) return null;
                  const isMe = m.user_id === me?.id;
                  return (
                    <div
                      key={m.user_id}
                      className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-800 bg-gray-900"
                    >
                      <Avatar person={p} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-white truncate">
                          {getDisplayName(p)} {isMe && "(you)"}
                        </p>
                        <p className="text-[11px] text-gray-500 truncate">
                          @{p.username || "user"}
                        </p>
                      </div>
                      {m.role === "admin" && (
                        <span className="shrink-0 inline-flex items-center gap-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                          <Crown size={10} />
                          Admin
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}