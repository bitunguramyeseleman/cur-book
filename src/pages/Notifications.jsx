import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Send, ArrowLeft, MoreVertical, Phone, Video, Info,
  Smile, Paperclip, Check, CheckCheck, MessageCircle, Users, X,
  Loader2, ChevronDown, Crown, Image as ImageIcon, BellOff, User,
  ChevronRight, AtSign, Calendar, Sparkles,
  Reply, Pencil, Forward, Trash2,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Avatar, { getDisplayName } from "../components/Avatar";

// =========================================================
// HELPERS
// =========================================================
const formatTime = (d) =>
  d ? new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short", year: "numeric" }) : "";

const formatRelative = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const now = new Date();
  const diff = (now - date) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString([], { day: "numeric", month: "short" });
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
};

const EMOJIS = ["😀","😂","🥰","😎","🤔","👍","🔥","❤️","🎉","😢","😡","🙏","💯","✨","😴","🤝"];
const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// =========================================================
// GROUP AVATAR
// =========================================================
function GroupAvatar({ group, size = "md" }) {
  const sizes = {
    sm: "w-9 h-9 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-24 h-24 text-2xl",
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
// TYPING DOTS
// =========================================================
function TypingDots({ className = "" }) {
  return (
    <span className={`flex gap-1 ${className}`}>
      {[0, 1, 2].map((d) => (
        <motion.span
          key={d}
          animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: d * 0.15 }}
          className="w-1.5 h-1.5 rounded-full bg-current"
        />
      ))}
    </span>
  );
}

// =========================================================
// ACCORDION ROW
// =========================================================
function AccordionRow({ label, icon: Icon, open, onToggle, subtitle, children }) {
  return (
    <div className="border-b border-gray-800/60">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 text-left transition hover:bg-gray-900/50"
      >
        <div className="flex items-center gap-3 min-w-0">
          {Icon && (
            <div className="w-8 h-8 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center shrink-0">
              <Icon size={14} className="text-gray-400" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-bold text-white truncate">{label}</p>
            {subtitle && (
              <p className="text-[11px] text-gray-500 truncate">{subtitle}</p>
            )}
          </div>
        </div>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-500 transition-transform duration-200 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =========================================================
// MESSAGE ACTIONS POPOVER
// =========================================================
function MessageActionsPopover({
  mine, onReply, onEdit, onForward, onDelete, onReact, alignRight,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: -4 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -4 }}
      transition={{ duration: 0.14 }}
      className={`absolute top-full mt-2 z-40 ${alignRight ? "right-0" : "left-0"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="bg-gray-950 border border-gray-800 rounded-2xl shadow-2xl overflow-hidden min-w-[160px]">
        <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-gray-800/80">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className="w-8 h-8 rounded-full hover:bg-gray-800 flex items-center justify-center text-lg transition hover:scale-110"
            >
              {emoji}
            </button>
          ))}
        </div>

        <button
          onClick={onReply}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-200 hover:bg-gray-800 transition"
        >
          <Reply size={14} />
          Reply
        </button>
        {mine && (
          <button
            onClick={onEdit}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-200 hover:bg-gray-800 transition"
          >
            <Pencil size={14} />
            Edit
          </button>
        )}
        <button
          onClick={onForward}
          className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-gray-200 hover:bg-gray-800 transition"
        >
          <Forward size={14} />
          Forward
        </button>
        {mine && (
          <button
            onClick={onDelete}
            className="w-full flex items-center gap-3 px-3 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-500/10 transition"
          >
            <Trash2 size={14} />
            Delete
          </button>
        )}
      </div>
    </motion.div>
  );
}

// =========================================================
// MAIN
// =========================================================
export default function Community() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");
  const [unreadCounts, setUnreadCounts] = useState({});
  const [lastMessages, setLastMessages] = useState({});
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);
  const [error, setError] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [rtStatus, setRtStatus] = useState("CONNECTING");

  // ---- Filter tabs ----
  const [activeTab, setActiveTab] = useState("all");

  // ---- Online ----
  const [onlineUserIds, setOnlineUserIds] = useState(new Set());
  const onlineChannelRef = useRef(null);

  // ---- Groups list ----
  const [myGroups, setMyGroups] = useState([]);
  const [loadingGroups, setLoadingGroups] = useState(false);

  // ---- Inline Group Chat ----
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupMessages, setGroupMessages] = useState([]);
  const [groupMembers, setGroupMembers] = useState([]);
  const [groupProfiles, setGroupProfiles] = useState({});
  const [loadingGroupMessages, setLoadingGroupMessages] = useState(false);

  // ---- Profile drawer + panel ----
  const [showProfileDrawer, setShowProfileDrawer] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(true);

  // ---- Media modal ----
  const [showMediaModal, setShowMediaModal] = useState(false);

  // ---- Accordion ----
  const [openSection, setOpenSection] = useState(null);

  // ---- Message actions ----
  const [actionMessage, setActionMessage] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  const [editText, setEditText] = useState("");
  const [forwardMessage, setForwardMessage] = useState(null);

  // ---- Reactions ----
  const [reactions, setReactions] = useState({});

  // ---- Typing refs ----
  const [typingChannelReady, setTypingChannelReady] = useState(false);
  const isTypingRef = useRef(false);
  const typingStopRef = useRef(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const presenceChannelRef = useRef(null);
  const selectedUserRef = useRef(null);

  useEffect(() => { selectedUserRef.current = selectedUser; }, [selectedUser]);

  // =========================================================
  // INIT
  // =========================================================
  useEffect(() => {
    initialize();
    return () => {
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      if (onlineChannelRef.current) {
        try { onlineChannelRef.current.untrack(); } catch {}
        supabase.removeChannel(onlineChannelRef.current);
        onlineChannelRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, []);

  const initialize = async () => {
    try {
      setLoadingUsers(true);
      setError("");
      const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!currentUser) {
        setError("Please login to use Community.");
        setLoadingUsers(false);
        return;
      }
      setUser(currentUser);
      await Promise.all([
        loadUsers(currentUser.id),
        loadConversations(currentUser.id),
        loadUnreadCounts(currentUser.id),
        loadLastMessages(currentUser.id),
        loadMyGroups(currentUser.id),
      ]);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Something went wrong.");
    } finally {
      setLoadingUsers(false);
    }
  };

  // Reset panels when switching chats
  useEffect(() => {
    setShowProfileDrawer(false);
    setShowProfilePanel(true);
    setShowMediaModal(false);
    setOpenSection(null);
    setActionMessage(null);
    setReplyTo(null);
    setEditingMessage(null);
    setForwardMessage(null);
  }, [selectedUser?.id, selectedGroup?.id]);

  // Close drawer on resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setShowProfileDrawer(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Close action popover on outside click
  useEffect(() => {
    const handler = () => setActionMessage(null);
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  // =========================================================
  // LOADERS
  // =========================================================
  const loadUsers = async (userId) => {
    const { data, error: e } = await supabase
      .from("profiles")
      .select("id, username, full_name, bio, avatar_url, created_at")
      .neq("id", userId)
      .order("full_name", { ascending: true });
    if (e) throw e;
    setUsers(data || []);
  };

  const loadConversations = async (userId) => {
    const { data, error: e } = await supabase
      .from("conversations")
      .select("*")
      .or(`user_one.eq.${userId},user_two.eq.${userId}`)
      .order("created_at", { ascending: false });
    if (e) throw e;
    setConversations(data || []);
  };

  const loadUnreadCounts = async (userId) => {
    const { data, error: e } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", userId)
      .eq("is_read", false)
      .is("group_id", null);
    if (e) { console.error(e); return; }
    const counts = {};
    (data || []).forEach((m) => {
      if (m.sender_id) counts[m.sender_id] = (counts[m.sender_id] || 0) + 1;
    });
    setUnreadCounts(counts);
  };

  const loadLastMessages = useCallback(async (userId) => {
    const { data, error: e } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, message, created_at, is_read")
      .is("group_id", null)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(200);
    if (e) { console.error(e); return; }
    const map = {};
    (data || []).forEach((m) => {
      const other = m.sender_id === userId ? m.receiver_id : m.sender_id;
      if (!map[other]) map[other] = m;
    });
    setLastMessages(map);
  }, []);

  const loadMyGroups = useCallback(async (userId) => {
    if (!userId) return;
    setLoadingGroups(true);
    try {
      const { data: memberships, error: mErr } = await supabase
        .from("group_members")
        .select("group_id, role")
        .eq("user_id", userId);
      if (mErr) throw mErr;
      if (!memberships?.length) {
        setMyGroups([]);
        return;
      }

      const groupIds = memberships.map((m) => m.group_id);
      const roleMap = new Map(memberships.map((m) => [m.group_id, m.role]));

      const { data: groups, error: gErr } = await supabase
        .from("groups")
        .select("*")
        .in("id", groupIds)
        .order("created_at", { ascending: false });
      if (gErr) throw gErr;

      const { data: memberRows } = await supabase
        .from("group_members")
        .select("group_id")
        .in("group_id", groupIds);

      const countMap = {};
      (memberRows || []).forEach((m) => {
        countMap[m.group_id] = (countMap[m.group_id] || 0) + 1;
      });

      setMyGroups(
        (groups || []).map((g) => ({
          ...g,
          my_role: roleMap.get(g.id) || "member",
          member_count: countMap[g.id] || 0,
        }))
      );
    } catch (err) {
      console.error("[groups] load error:", err);
    } finally {
      setLoadingGroups(false);
    }
  }, []);

  // =========================================================
  // REACTIONS LOADER
  // =========================================================
  const loadReactions = useCallback(async (messageIds) => {
    if (!messageIds.length) return;
    const { data, error } = await supabase
      .from("message_reactions")
      .select("id, message_id, user_id, emoji")
      .in("message_id", messageIds);
    if (error) { console.error(error); return; }
    const map = {};
    (data || []).forEach((r) => {
      if (!map[r.message_id]) map[r.message_id] = [];
      map[r.message_id].push(r);
    });
    setReactions((prev) => ({ ...prev, ...map }));
  }, []);

  // =========================================================
  // ONLINE USERS TRACKING
  // =========================================================
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("community-online", {
      config: { presence: { key: user.id } },
    });
    onlineChannelRef.current = channel;

    const syncOnline = () => {
      const state = channel.presenceState();
      const ids = new Set(Object.keys(state));
      setOnlineUserIds(ids);
    };

    channel
      .on("presence", { event: "sync" }, syncOnline)
      .on("presence", { event: "join" }, syncOnline)
      .on("presence", { event: "leave" }, syncOnline);

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({
          online_at: new Date().toISOString(),
          user_id: user.id,
        });
        syncOnline();
      }
    });

    return () => {
      try { channel.untrack(); } catch {}
      supabase.removeChannel(channel);
      onlineChannelRef.current = null;
    };
  }, [user]);

  // =========================================================
  // DM CONVERSATION HELPERS
  // =========================================================
  const findConversation = (otherUserId) => {
    if (!user) return null;
    return conversations.find(
      (c) =>
        (c.user_one === user.id && c.user_two === otherUserId) ||
        (c.user_one === otherUserId && c.user_two === user.id)
    ) || null;
  };

  const getOrCreateConversation = async (otherUserId) => {
    if (!user) return null;
    const existing = findConversation(otherUserId);
    if (existing) return existing;

    const [u1, u2] = user.id < otherUserId ? [user.id, otherUserId] : [otherUserId, user.id];
    const { data, error: insertError } = await supabase
      .from("conversations")
      .insert({ user_one: u1, user_two: u2 })
      .select()
      .single();

    if (!insertError && data) {
      setConversations((prev) => [data, ...prev]);
      return data;
    }

    if (insertError?.code === "23505") {
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("*")
        .or(`and(user_one.eq.${user.id},user_two.eq.${otherUserId}),and(user_one.eq.${otherUserId},user_two.eq.${user.id})`)
        .maybeSingle();
      if (existingConv) {
        setConversations((prev) => [existingConv, ...prev.filter((i) => i.id !== existingConv.id)]);
        return existingConv;
      }
    }
    if (insertError) throw insertError;
    return data;
  };

  // =========================================================
  // OPEN DM CHAT
  // =========================================================
  const openChat = async (person) => {
    try {
      stopTypingNow();
      setOtherUserTyping(false);

      setError("");
      setSelectedGroup(null);
      setGroupMessages([]);
      setGroupMembers([]);
      setReactions({});

      setSelectedUser(person);
      setMobileShowChat(true);
      setAutoScroll(true);

      const conversation = await getOrCreateConversation(person.id);
      setSelectedConversation(conversation);
      await loadMessages(person.id);
      await markMessagesRead(person.id);

      setUnreadCounts((p) => ({ ...p, [person.id]: 0 }));
      setTimeout(() => inputRef.current?.focus(), 250);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to open conversation.");
    }
  };

  // =========================================================
  // OPEN GROUP CHAT
  // =========================================================
  const openGroupChat = async (group) => {
    try {
      stopTypingNow();
      setOtherUserTyping(false);

      setError("");
      setSelectedUser(null);
      setSelectedConversation(null);
      setMessages([]);
      setReactions({});

      setSelectedGroup(group);
      setMobileShowChat(true);
      setAutoScroll(true);

      await Promise.all([
        loadGroupMessages(group.id),
        loadGroupMembers(group.id),
      ]);

      setTimeout(() => inputRef.current?.focus(), 250);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to open group.");
    }
  };

  const loadMessages = async (otherUserId) => {
    if (!user) return;
    setLoadingMessages(true);
    try {
      const { data, error: e } = await supabase
        .from("messages")
        .select("id, sender_id, receiver_id, group_id, message, created_at, is_read, reply_to, edited_at, deleted_at")
        .is("group_id", null)
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true });
      if (e) throw e;
      setMessages(data || []);
      if (data?.length) {
        loadReactions(data.map((m) => m.id));
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  };

  const loadGroupMessages = async (groupId) => {
    setLoadingGroupMessages(true);
    try {
      const { data, error: e } = await supabase
        .from("messages")
        .select("id, sender_id, group_id, message, created_at, reply_to, edited_at, deleted_at")
        .eq("group_id", groupId)
        .order("created_at", { ascending: true });
      if (e) throw e;
      setGroupMessages(data || []);

      if (data?.length) {
        loadReactions(data.map((m) => m.id));

        const unknown = [
          ...new Set(
            (data || [])
              .map((m) => m.sender_id)
              .filter((id) => id && !groupProfiles[id])
          ),
        ];
        if (unknown.length) {
          const { data: profiles } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .in("id", unknown);
          const map = {};
          (profiles || []).forEach((p) => (map[p.id] = p));
          setGroupProfiles((prev) => ({ ...prev, ...map }));
        }
      }
    } catch (err) {
      console.error(err);
      setError(err?.message || "Unable to load group messages.");
    } finally {
      setLoadingGroupMessages(false);
    }
  };

  const loadGroupMembers = async (groupId) => {
    try {
      const { data: rows, error: mErr } = await supabase
        .from("group_members")
        .select("user_id, role, joined_at")
        .eq("group_id", groupId);
      if (mErr) throw mErr;

      const ids = (rows || []).map((r) => r.user_id);
      if (!ids.length) {
        setGroupMembers([]);
        return;
      }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", ids);

      const map = new Map((profiles || []).map((p) => [p.id, p]));
      setGroupMembers(
        (rows || []).map((r) => ({ ...r, profile: map.get(r.user_id) }))
      );

      setGroupProfiles((prev) => {
        const next = { ...prev };
        map.forEach((v, k) => (next[k] = v));
        return next;
      });
    } catch (err) {
      console.error(err);
    }
  };

  // =========================================================
  // MARK READ
  // =========================================================
  const markMessagesRead = async (senderId) => {
    if (!user) return;
    const { error: rpcError } = await supabase.rpc("mark_messages_read", { p_sender_id: senderId });
    if (rpcError) {
      await supabase
        .from("messages")
        .update({ is_read: true })
        .eq("sender_id", senderId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    }
  };

  // =========================================================
  // AUTO SCROLL
  // =========================================================
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setAutoScroll(nearBottom);
  };

  const activeMessagesLength = (selectedGroup ? groupMessages : messages).length;

  useEffect(() => {
    if (!autoScroll) return;
    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
    // eslint-disable-next-line
  }, [activeMessagesLength, otherUserTyping, autoScroll]);

  // =========================================================
  // REALTIME — DM MESSAGES
  // =========================================================
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${user.id}` },
        async (payload) => {
          const msg = payload.new;
          if (msg.group_id) return;
          const active = selectedUserRef.current;

          setLastMessages((prev) => ({ ...prev, [msg.sender_id]: msg }));

          if (active && msg.sender_id === active.id) {
            setMessages((prev) =>
              prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
            );
            await markMessagesRead(msg.sender_id);
            setUnreadCounts((p) => ({ ...p, [msg.sender_id]: 0 }));
            return;
          }
          setUnreadCounts((p) => ({
            ...p,
            [msg.sender_id]: (p[msg.sender_id] || 0) + 1,
          }));
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `sender_id=eq.${user.id}` },
        (payload) => {
          const msg = payload.new;
          if (msg.group_id) return;
          setLastMessages((prev) => ({ ...prev, [msg.receiver_id]: msg }));
          const active = selectedUserRef.current;
          if (!active || msg.receiver_id !== active.id) return;

          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            const idx = prev.findIndex(
              (m) =>
                m._optimistic &&
                m.message === msg.message &&
                m.receiver_id === msg.receiver_id
            );
            if (idx !== -1) {
              const next = [...prev];
              next[idx] = msg;
              return next;
            }
            return [...prev, msg];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        (payload) => {
          const updated = payload.new;
          setMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
          setGroupMessages((prev) =>
            prev.map((m) => (m.id === updated.id ? { ...m, ...updated } : m))
          );
        }
      )
      .subscribe((status) => {
        setRtStatus(status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // =========================================================
  // REALTIME — GROUP MESSAGES
  // =========================================================
  useEffect(() => {
    if (!user || !selectedGroup) return;

    const groupIdNum = Number(selectedGroup.id);
    const channel = supabase
      .channel(`group-${groupIdNum}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `group_id=eq.${groupIdNum}`,
        },
        async (payload) => {
          const msg = payload.new;
          setGroupMessages((prev) =>
            prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]
          );
          if (!groupProfiles[msg.sender_id]) {
            const { data } = await supabase
              .from("profiles")
              .select("id, username, full_name, avatar_url")
              .eq("id", msg.sender_id)
              .maybeSingle();
            if (data) {
              setGroupProfiles((prev) => ({ ...prev, [data.id]: data }));
            }
          }
        }
      )
      .subscribe((status) => {
        console.log("[RT] Group status:", status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line
  }, [user, selectedGroup?.id]);

  // =========================================================
  // REALTIME — REACTIONS
  // =========================================================
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`reactions-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "message_reactions" },
        (payload) => {
          const r = payload.new;
          setReactions((prev) => {
            const list = prev[r.message_id] || [];
            if (list.some((x) => x.id === r.id)) return prev;
            return { ...prev, [r.message_id]: [...list, r] };
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "message_reactions" },
        (payload) => {
          const r = payload.old;
          setReactions((prev) => {
            const list = prev[r.message_id] || [];
            return { ...prev, [r.message_id]: list.filter((x) => x.id !== r.id) };
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // =========================================================
  // TYPING PRESENCE
  // =========================================================
  useEffect(() => {
    if (!user || !selectedUser || selectedGroup) {
      setOtherUserTyping(false);
      setTypingChannelReady(false);
      return;
    }

    if (presenceChannelRef.current) {
      supabase.removeChannel(presenceChannelRef.current);
      presenceChannelRef.current = null;
    }

    const ids = [user.id, selectedUser.id].sort();
    const channel = supabase.channel(`typing-${ids[0]}-${ids[1]}`, {
      config: { presence: { key: user.id } },
    });
    presenceChannelRef.current = channel;

    const handleSync = () => {
      const state = channel.presenceState();
      const other = state[selectedUser.id] || [];
      const isTyping = other.some((p) => p.typing === true);
      setOtherUserTyping(isTyping);
    };

    channel
      .on("presence", { event: "sync" }, handleSync)
      .on("presence", { event: "join" }, handleSync)
      .on("presence", { event: "leave" }, () => setOtherUserTyping(false));

    channel.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await channel.track({ typing: false, at: Date.now() });
        setTypingChannelReady(true);
      } else {
        setTypingChannelReady(false);
      }
    });

    return () => {
      if (typingStopRef.current) clearTimeout(typingStopRef.current);
      isTypingRef.current = false;
      try { channel.untrack(); } catch {}
      supabase.removeChannel(channel);
      if (presenceChannelRef.current === channel) presenceChannelRef.current = null;
      setTypingChannelReady(false);
      setOtherUserTyping(false);
    };
  }, [user, selectedUser, selectedGroup]);

  const updateTypingStatus = useCallback(
    async (typing) => {
      const channel = presenceChannelRef.current;
      if (!channel || !typingChannelReady) return;
      try {
        await channel.track({ typing, at: Date.now() });
      } catch (e) { /* best-effort */ }
    },
    [typingChannelReady]
  );

  // =========================================================
  // TOGGLE PROFILE VIEW
  // =========================================================
  const toggleProfileView = () => {
    if (window.innerWidth >= 1280) {
      setShowProfilePanel((v) => !v);
    } else {
      setShowProfileDrawer((v) => !v);
    }
  };

  const toggleSection = (key) => {
    setOpenSection((current) => (current === key ? null : key));
  };

  // =========================================================
  // MEDIA ITEMS
  // =========================================================
  const mediaItems = useMemo(() => {
    const list = selectedGroup ? groupMessages : messages;
    const items = [];

    const imageRegex = /(https?:\/\/[^\s]+\.(?:png|jpg|jpeg|gif|webp|svg|bmp)(?:\?[^\s]*)?)/gi;
    const urlRegex = /(https?:\/\/[^\s]+)/gi;

    list.forEach((msg) => {
      if (msg.deleted_at) return;
      const text = msg.message || "";
      const images = text.match(imageRegex) || [];
      images.forEach((url) => {
        items.push({ id: `${msg.id}-img-${url}`, type: "image", url, message: msg });
      });

      const urls = text.match(urlRegex) || [];
      urls.forEach((url) => {
        if (!imageRegex.test(url)) {
          items.push({ id: `${msg.id}-link-${url}`, type: "link", url, message: msg });
        }
      });
    });

    return items.reverse();
  }, [selectedGroup, groupMessages, messages]);

  // =========================================================
  // MESSAGE ACTIONS
  // =========================================================
  const toggleReaction = async (messageId, emoji) => {
    if (!user) return;
    const existing = (reactions[messageId] || []).find(
      (r) => r.user_id === user.id && r.emoji === emoji
    );

    if (existing) {
      setReactions((prev) => ({
        ...prev,
        [messageId]: (prev[messageId] || []).filter((r) => r.id !== existing.id),
      }));
      const { error } = await supabase
        .from("message_reactions")
        .delete()
        .eq("id", existing.id);
      if (error) console.error(error);
    } else {
      const tempId = `temp-${Date.now()}`;
      const optimistic = { id: tempId, message_id: messageId, user_id: user.id, emoji };
      setReactions((prev) => ({
        ...prev,
        [messageId]: [...(prev[messageId] || []), optimistic],
      }));
      const { data, error } = await supabase
        .from("message_reactions")
        .insert({ message_id: messageId, user_id: user.id, emoji })
        .select()
        .single();
      if (error) {
        setReactions((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] || []).filter((r) => r.id !== tempId),
        }));
      } else {
        setReactions((prev) => ({
          ...prev,
          [messageId]: (prev[messageId] || []).map((r) => (r.id === tempId ? data : r)),
        }));
      }
    }
    setActionMessage(null);
  };

  const deleteMessage = async (message) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("messages")
      .update({ deleted_at: now, message: "" })
      .eq("id", message.id);
    if (error) { console.error(error); return; }

    if (selectedGroup) {
      setGroupMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, deleted_at: now, message: "" } : m))
      );
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, deleted_at: now, message: "" } : m))
      );
    }
    setActionMessage(null);
  };

  const saveEdit = async () => {
    const text = editText.trim();
    if (!text || !editingMessage) return;
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("messages")
      .update({ message: text, edited_at: now })
      .eq("id", editingMessage.id);
    if (error) { console.error(error); return; }

    if (selectedGroup) {
      setGroupMessages((prev) =>
        prev.map((m) => (m.id === editingMessage.id ? { ...m, message: text, edited_at: now } : m))
      );
    } else {
      setMessages((prev) =>
        prev.map((m) => (m.id === editingMessage.id ? { ...m, message: text, edited_at: now } : m))
      );
    }
    setEditingMessage(null);
    setEditText("");
  };

  const startReply = (message) => {
    setReplyTo(message);
    setActionMessage(null);
    inputRef.current?.focus();
  };

  const cancelReply = () => setReplyTo(null);

  const startEdit = (message) => {
    setEditingMessage(message);
    setEditText(message.message);
    setActionMessage(null);
  };

  const forwardTo = async (target) => {
    if (!forwardMessage) return;
    const text = forwardMessage.message;

    if (target.type === "user") {
      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: target.id,
        group_id: null,
        message: text,
        is_read: false,
      });
    } else if (target.type === "group") {
      await supabase.from("messages").insert({
        sender_id: user.id,
        receiver_id: null,
        group_id: target.id,
        message: text,
        is_read: false,
      });
    }
    setForwardMessage(null);
  };

  // =========================================================
  // INPUT
  // =========================================================
  const handleMessageChange = (e) => {
    const value = e.target.value;
    setMessageText(value);
    if (!selectedUser || selectedGroup) return;

    if (typingStopRef.current) clearTimeout(typingStopRef.current);

    if (value.trim()) {
      if (!isTypingRef.current) {
        isTypingRef.current = true;
        updateTypingStatus(true);
      }
      typingStopRef.current = setTimeout(() => {
        isTypingRef.current = false;
        updateTypingStatus(false);
      }, 2500);
    } else {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        updateTypingStatus(false);
      }
    }
  };

  const stopTypingNow = () => {
    if (isTypingRef.current) {
      isTypingRef.current = false;
      updateTypingStatus(false);
    }
    if (typingStopRef.current) clearTimeout(typingStopRef.current);
  };

  const insertEmoji = (emoji) => {
    setMessageText((t) => t + emoji);
    setShowEmoji(false);
    inputRef.current?.focus();
  };

  // =========================================================
  // SEND
  // =========================================================
  const sendMessage = async (e) => {
    e?.preventDefault();
    const text = messageText.trim();
    if (!text || !user || sending) return;
    if (!selectedUser && !selectedGroup) return;

    const isGroup = !!selectedGroup;
    const tempId = `temp-${Date.now()}`;

    const optimistic = isGroup
      ? {
          id: tempId,
          sender_id: user.id,
          group_id: selectedGroup.id,
          message: text,
          created_at: new Date().toISOString(),
          reply_to: replyTo?.id || null,
          _optimistic: true,
        }
      : {
          id: tempId,
          sender_id: user.id,
          receiver_id: selectedUser.id,
          group_id: null,
          message: text,
          created_at: new Date().toISOString(),
          is_read: false,
          reply_to: replyTo?.id || null,
          _optimistic: true,
        };

    stopTypingNow();

    setMessageText("");
    setShowEmoji(false);
    setSending(true);
    setError("");
    setAutoScroll(true);

    const currentReply = replyTo;
    setReplyTo(null);

    if (isGroup) {
      setGroupMessages((prev) => [...prev, optimistic]);
    } else {
      setMessages((prev) => [...prev, optimistic]);
      setLastMessages((prev) => ({ ...prev, [selectedUser.id]: optimistic }));
    }

    try {
      let insertPayload;

      if (isGroup) {
        insertPayload = {
          sender_id: user.id,
          receiver_id: null,
          group_id: selectedGroup.id,
          message: text,
          is_read: false,
          reply_to: currentReply?.id || null,
        };
      } else {
        const conversation =
          selectedConversation || (await getOrCreateConversation(selectedUser.id));
        if (!conversation) throw new Error("Conversation could not be created.");
        if (!selectedConversation) setSelectedConversation(conversation);

        insertPayload = {
          sender_id: user.id,
          receiver_id: selectedUser.id,
          group_id: null,
          message: text,
          is_read: false,
          reply_to: currentReply?.id || null,
        };
      }

      const { data, error: sendError } = await supabase
        .from("messages")
        .insert(insertPayload)
        .select()
        .single();

      if (sendError) throw sendError;

      if (isGroup) {
        setGroupMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
      } else {
        setMessages((prev) => prev.map((m) => (m.id === tempId ? data : m)));
        setLastMessages((prev) => ({ ...prev, [selectedUser.id]: data }));
      }

      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (err) {
      console.error("[send] failed:", err);
      if (isGroup) {
        setGroupMessages((prev) => prev.filter((m) => m.id !== tempId));
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setLastMessages((prev) => {
          const next = { ...prev };
          delete next[selectedUser.id];
          return next;
        });
      }
      setMessageText(text);
      setError(err?.message || "Message could not be sent.");
    } finally {
      setSending(false);
    }
  };

  // =========================================================
  // FILTERS
  // =========================================================
  const filteredUsers = useMemo(() => {
    const value = search.trim().toLowerCase();

    let base = users;
    if (activeTab === "online") {
      base = users.filter((p) => onlineUserIds.has(p.id));
    }

    const list = value
      ? base.filter((p) =>
          getDisplayName(p).toLowerCase().includes(value) ||
          (p.username?.toLowerCase() || "").includes(value)
        )
      : base;

    return [...list].sort((a, b) => {
      const aMsg = lastMessages[a.id]?.created_at;
      const bMsg = lastMessages[b.id]?.created_at;
      if (aMsg && bMsg) return new Date(bMsg) - new Date(aMsg);
      if (aMsg) return -1;
      if (bMsg) return 1;
      const aUnread = unreadCounts[a.id] || 0;
      const bUnread = unreadCounts[b.id] || 0;
      if (aUnread !== bUnread) return bUnread - aUnread;
      return getDisplayName(a).localeCompare(getDisplayName(b));
    });
  }, [users, search, lastMessages, unreadCounts, activeTab, onlineUserIds]);

  const filteredGroups = useMemo(() => {
    const value = search.trim().toLowerCase();
    if (!value) return myGroups;
    return myGroups.filter(
      (g) =>
        g.name?.toLowerCase().includes(value) ||
        g.description?.toLowerCase().includes(value)
    );
  }, [myGroups, search]);

  const handleMobileBack = () => {
    stopTypingNow();
    setMobileShowChat(false);
    setSelectedUser(null);
    setSelectedGroup(null);
    setMessages([]);
    setGroupMessages([]);
    setOtherUserTyping(false);
  };

  const hasActiveChat = !!selectedUser || !!selectedGroup;
  const activeMessages = selectedGroup ? groupMessages : messages;
  const activeLoading = selectedGroup ? loadingGroupMessages : loadingMessages;

  // =========================================================
  // PANEL BODY
  // =========================================================
  const PanelBody = () => (
    <div className="flex flex-col h-full text-white">
      <div className="flex flex-col items-center pt-8 pb-5 px-6 text-center border-b border-gray-800">
        {selectedGroup ? (
          <GroupAvatar group={selectedGroup} size="xl" />
        ) : (
          <Avatar
            person={selectedUser}
            size="xl"
            online={onlineUserIds.has(selectedUser.id)}
          />
        )}

        <h3 className="font-black text-lg mt-4 text-white">
          {selectedGroup ? selectedGroup.name : getDisplayName(selectedUser)}
        </h3>

        <p className="text-xs text-gray-500 mt-1">
          {selectedGroup
            ? "Active now"
            : onlineUserIds.has(selectedUser.id)
            ? "Active now"
            : "Offline"}
        </p>
      </div>

      <div className="flex justify-center gap-6 px-6 py-5 border-b border-gray-800">
        {!selectedGroup && (
          <button
            title="Profile"
            className="flex flex-col items-center gap-1.5 text-gray-400 transition hover:text-yellow-400"
          >
            <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
              <User size={17} />
            </div>
            <span className="text-[10px] font-bold">Profile</span>
          </button>
        )}

        <button
          title="Mute"
          className="flex flex-col items-center gap-1.5 text-gray-400 transition hover:text-yellow-400"
        >
          <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
            <BellOff size={17} />
          </div>
          <span className="text-[10px] font-bold">Mute</span>
        </button>

        <button
          title="Search"
          className="flex flex-col items-center gap-1.5 text-gray-400 transition hover:text-yellow-400"
        >
          <div className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center">
            <Search size={17} />
          </div>
          <span className="text-[10px] font-bold">Search</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto py-2">
        <AccordionRow
          label="Customize chat"
          icon={Sparkles}
          open={openSection === "customize"}
          onToggle={() => toggleSection("customize")}
        >
          <div className="px-5 pb-4">
            <div className="p-3 rounded-xl bg-gray-900 border border-gray-800 text-xs text-gray-400">
              Chat customization coming soon.
            </div>
          </div>
        </AccordionRow>

        {selectedGroup && (
          <AccordionRow
            label="Chat members"
            icon={Users}
            open={openSection === "members"}
            onToggle={() => toggleSection("members")}
            subtitle={`${groupMembers.length} ${
              groupMembers.length === 1 ? "member" : "members"
            }`}
          >
            <div className="px-5 pb-4 space-y-2">
              {groupMembers.map((m) => {
                const p = m.profile;
                if (!p) return null;
                const isMe = m.user_id === user?.id;
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
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </AccordionRow>
        )}

        <AccordionRow
          label={selectedGroup ? "Media, files and links" : "Media & files"}
          icon={ImageIcon}
          open={openSection === "media"}
          onToggle={() => toggleSection("media")}
          subtitle={
            mediaItems.length === 0
              ? "Nothing shared yet"
              : `${mediaItems.length} item${mediaItems.length === 1 ? "" : "s"}`
          }
        >
          <div className="px-5 pb-4">
            {mediaItems.length === 0 ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 mx-auto rounded-xl bg-gray-900 flex items-center justify-center mb-2">
                  <ImageIcon size={20} className="text-gray-600" />
                </div>
                <p className="text-xs text-gray-500">No media shared yet</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-1.5">
                  {mediaItems.slice(0, 6).map((item) => (
                    <a
                      key={item.id}
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group relative aspect-square rounded-lg overflow-hidden border border-gray-800 bg-gray-900 hover:border-yellow-400/50 transition"
                    >
                      {item.type === "image" ? (
                        <img
                          src={item.url}
                          alt="media"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Paperclip size={16} className="text-yellow-400" />
                        </div>
                      )}
                    </a>
                  ))}
                </div>
                {mediaItems.length > 0 && (
                  <button
                    onClick={() => setShowMediaModal(true)}
                    className="w-full mt-3 rounded-xl bg-gray-900 border border-gray-800 py-2.5 text-xs font-bold text-gray-300 transition hover:border-yellow-400/40 hover:text-yellow-400"
                  >
                    See all {mediaItems.length} items
                  </button>
                )}
              </>
            )}
          </div>
        </AccordionRow>

        {!selectedGroup && selectedUser && (
          <AccordionRow
            label="Details"
            icon={Info}
            open={openSection === "details"}
            onToggle={() => toggleSection("details")}
          >
            <div className="px-5 pb-4 space-y-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
                <div className="flex items-center gap-2 text-gray-500">
                  <AtSign size={14} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Username
                  </span>
                </div>
                <span className="text-sm text-gray-300">
                  @{selectedUser.username || "user"}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-gray-900 border border-gray-800">
                <div className="flex items-center gap-2 text-gray-500">
                  <Calendar size={14} />
                  <span className="text-[11px] font-bold uppercase tracking-wider">
                    Joined
                  </span>
                </div>
                <span className="text-sm text-gray-300">
                  {formatDate(selectedUser.created_at)}
                </span>
              </div>
            </div>
          </AccordionRow>
        )}
      </div>
    </div>
  );

  // =========================================================
  // NOT AUTH
  // =========================================================
  if (!user && !loadingUsers) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gray-950 text-white flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center mb-5">
            <MessageCircle size={30} />
          </div>
          <h1 className="text-2xl font-black mb-3">Community Chat</h1>
          <p className="text-gray-400 mb-6">
            Please login to start chatting with other cur.book users.
          </p>
        </motion.div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-950 text-white">
      {/* ERROR TOAST */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-lg"
          >
            <div className="bg-gray-900 border border-red-500/30 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
              <div className="flex-1">
                <p className="font-bold text-sm">Chat error</p>
                <p className="text-xs text-gray-400 mt-1">{error}</p>
              </div>
              <button onClick={() => setError("")} className="text-gray-500 hover:text-white">
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-[calc(100vh-80px)] min-h-[600px] max-w-[1600px] mx-auto p-3 sm:p-5">
        <div className="relative h-full overflow-hidden rounded-3xl border border-gray-800 bg-gray-900 shadow-2xl flex">

          {/* ================= SIDEBAR ================= */}
          <aside
            className={`
              absolute inset-y-0 left-0 w-full sm:w-[320px] lg:w-[360px]
              sm:relative sm:inset-auto z-30 sm:z-auto
              border-r border-gray-800 bg-gray-950 flex flex-col
              transition-transform duration-300
              ${mobileShowChat ? "-translate-x-full sm:translate-x-0" : "translate-x-0"}
            `}
          >
            <div className="p-5 border-b border-gray-800">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center">
                    <MessageCircle size={23} strokeWidth={2.5} />
                  </div>
                  <div>
                    <h1 className="text-lg font-black">Community</h1>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span>{users.length} members</span>
                      <span className="text-gray-700">·</span>
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
                <div className="hidden sm:flex w-9 h-9 rounded-xl bg-gray-900 border border-gray-800 items-center justify-center">
                  <Users size={17} className="text-yellow-400" />
                </div>
              </div>

              <div className="relative">
                <Search size={17} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={
                    activeTab === "groups"
                      ? "Search groups..."
                      : activeTab === "online"
                      ? "Search online users..."
                      : "Search people..."
                  }
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-yellow-400 transition"
                />
              </div>

              <div className="mt-3 grid grid-cols-3 gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1">
                {[
                  { key: "all", label: "All" },
                  { key: "groups", label: "Groups" },
                  { key: "online", label: "Online" },
                ].map((tab) => {
                  const active = activeTab === tab.key;
                  return (
                    <button
                      key={tab.key}
                      type="button"
                      onClick={() => setActiveTab(tab.key)}
                      className={`
                        relative rounded-lg py-2 text-xs font-black transition-all
                        ${active ? "text-gray-950" : "text-gray-400 hover:text-white"}
                      `}
                    >
                      {active && (
                        <motion.span
                          layoutId="community-tab-pill"
                          transition={{ type: "spring", stiffness: 380, damping: 30 }}
                          className="absolute inset-0 rounded-lg bg-yellow-400 shadow-[0_2px_10px_-2px_rgba(250,204,21,0.5)]"
                        />
                      )}
                      <span className="relative z-10 flex items-center justify-center gap-1.5">
                        {tab.key === "online" && (
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-green-500" />
                          </span>
                        )}
                        {tab.label}
                        {tab.key === "online" && onlineUserIds.size > 1 && (
                          <span className={`text-[9px] font-bold ${active ? "text-gray-800" : "text-gray-500"}`}>
                            {onlineUserIds.size - 1}
                          </span>
                        )}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {activeTab === "groups" ? (
                loadingGroups ? (
                  <div className="space-y-2 p-1">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-20 rounded-2xl bg-gray-900 animate-pulse" />
                    ))}
                  </div>
                ) : filteredGroups.length === 0 ? (
                  <div className="text-center px-6 py-16">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-900 flex items-center justify-center mb-4">
                      <Users size={24} className="text-gray-600" />
                    </div>
                    <p className="font-bold text-gray-300">
                      {search ? "No groups match" : "No groups yet"}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {search
                        ? "Try another keyword."
                        : "Create a group to start chatting together."}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {filteredGroups.map((group) => {
                      const isSelected = selectedGroup?.id === group.id;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => openGroupChat(group)}
                          className={`
                            w-full flex items-center gap-3 p-3 rounded-2xl text-left transition
                            ${isSelected ? "bg-yellow-400 text-gray-950" : "hover:bg-gray-900 text-white"}
                          `}
                        >
                          <GroupAvatar group={group} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className={`font-bold text-sm truncate ${isSelected ? "text-gray-950" : "text-gray-200"}`}>
                              {group.name}
                            </p>
                            <p className={`text-[11px] truncate mt-0.5 ${isSelected ? "text-gray-700" : "text-gray-500"}`}>
                              {group.member_count}{" "}
                              {group.member_count === 1 ? "member" : "members"}
                            </p>
                          </div>
                          {group.my_role === "admin" && (
                            <span
                              className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                isSelected
                                  ? "bg-gray-950 text-yellow-400"
                                  : "bg-yellow-400/10 border border-yellow-400/20 text-yellow-400"
                              }`}
                            >
                              <Crown size={10} />
                              Admin
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )
              ) : loadingUsers ? (
                <div className="space-y-2 p-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-16 rounded-2xl bg-gray-900 animate-pulse" />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center px-6 py-16">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-900 flex items-center justify-center mb-4">
                    <Users size={24} className="text-gray-600" />
                  </div>
                  <p className="font-bold text-gray-300">
                    {activeTab === "online" ? "No one is online" : "No users found"}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {activeTab === "online"
                      ? "Check back later or start a chat with someone."
                      : "Try another search."}
                  </p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {filteredUsers.map((person, index) => {
                    const isSelected = selectedUser?.id === person.id;
                    const unread = unreadCounts[person.id] || 0;
                    const last = lastMessages[person.id];
                    const isOnline = onlineUserIds.has(person.id);

                    return (
                      <motion.button
                        key={person.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: Math.min(index * 0.02, 0.3) }}
                        onClick={() => openChat(person)}
                        className={`
                          w-full flex items-center gap-3 p-3 rounded-2xl text-left transition-all
                          ${isSelected ? "bg-yellow-400 text-gray-950" : "hover:bg-gray-900 text-white"}
                        `}
                      >
                        <Avatar person={person} size="md" online={isOnline} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p className={`font-bold text-sm truncate ${isSelected ? "text-gray-950" : "text-gray-200"}`}>
                              {getDisplayName(person)}
                            </p>
                            <div className="flex items-center gap-1.5 shrink-0">
                              {last && (
                                <span className={`text-[10px] ${isSelected ? "text-gray-700" : "text-gray-500"}`}>
                                  {formatRelative(last.created_at)}
                                </span>
                              )}
                              {unread > 0 && (
                                <motion.span
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className={`
                                    min-w-5 h-5 px-1.5 rounded-full flex items-center justify-center text-[10px] font-black
                                    ${isSelected ? "bg-gray-950 text-yellow-400" : "bg-yellow-400 text-gray-950"}
                                  `}
                                >
                                  {unread > 99 ? "99+" : unread}
                                </motion.span>
                              )}
                            </div>
                          </div>
                          <p className={`text-[11px] truncate mt-1 ${isSelected ? "text-gray-700" : "text-gray-500"}`}>
                            {isOnline && !last
                              ? "Online now"
                              : last
                              ? `${last.sender_id === user.id ? "You: " : ""}${last.message}`
                              : "Tap to start chatting"}
                          </p>
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              )}
            </div>

            {user && (
              <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3">
                  <Avatar person={user} size="sm" online />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold truncate">You</p>
                    <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />
                </div>
              </div>
            )}
          </aside>

          {/* ================= MAIN CHAT ================= */}
          <main className={`
            flex-1 min-w-0 flex-col bg-gray-900
            ${mobileShowChat ? "flex" : "hidden"} sm:flex
          `}>
            {!hasActiveChat ? (
              <div className="flex-1 flex items-center justify-center p-8">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center max-w-md"
                >
                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-6">
                    <MessageCircle size={34} className="text-yellow-400" />
                  </div>
                  <h2 className="text-2xl font-black">Start a conversation</h2>
                  <p className="text-gray-500 mt-2 text-sm">
                    Select someone or a group to start chatting.
                  </p>
                </motion.div>
              </div>
            ) : (
              <>
                {/* HEADER */}
                <header className="h-[76px] shrink-0 border-b border-gray-800 px-3 sm:px-6 flex items-center justify-between bg-gray-900/95 backdrop-blur">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={handleMobileBack}
                      className="sm:hidden w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-gray-300 shrink-0 transition hover:bg-gray-700"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={toggleProfileView}
                      className="
                        group flex items-center gap-3 min-w-0 text-left rounded-xl px-2 py-1.5                        cursor-pointer
                        transition-all duration-200
                        hover:bg-yellow-400/10
                        hover:ring-1 hover:ring-yellow-400/30
                        active:scale-[0.98]
                      "
                    >
                      {selectedGroup ? (
                        <>
                          <GroupAvatar group={selectedGroup} size="md" />
                          <div className="min-w-0">
                            <h2 className="font-black text-sm sm:text-base truncate text-white group-hover:text-yellow-400 transition">
                              {selectedGroup.name}
                            </h2>
                            <p className="text-xs text-gray-500 mt-0.5 truncate">
                              {groupMembers.length}{" "}
                              {groupMembers.length === 1 ? "member" : "members"}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <Avatar
                            person={selectedUser}
                            size="md"
                            online={onlineUserIds.has(selectedUser.id)}
                          />
                          <div className="min-w-0">
                            <h2 className="font-black text-sm sm:text-base truncate text-white group-hover:text-yellow-400 transition">
                              {getDisplayName(selectedUser)}
                            </h2>
                            {otherUserTyping ? (
                              <div className="flex items-center gap-1.5 mt-0.5 text-green-400">
                                <span className="text-xs font-semibold">typing</span>
                                <TypingDots />
                              </div>
                            ) : (
                              <p className="text-xs text-gray-500 mt-0.5 truncate">
                                {onlineUserIds.has(selectedUser.id) ? (
                                  <span className="text-green-400 font-semibold">Online</span>
                                ) : (
                                  <>@{selectedUser.username || "user"}</>
                                )}
                              </p>
                            )}
                          </div>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!selectedGroup && (
                      <>
                        <button className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-gray-500 hover:text-yellow-400 hover:bg-gray-800 transition">
                          <Phone size={17} />
                        </button>
                        <button className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-gray-500 hover:text-yellow-400 hover:bg-gray-800 transition">
                          <Video size={18} />
                        </button>
                      </>
                    )}
                    <button
                      onClick={toggleProfileView}
                      className={`
                        w-9 h-9 rounded-xl flex items-center justify-center transition
                        ${
                          showProfilePanel
                            ? "text-yellow-400 bg-gray-800"
                            : "text-gray-500 hover:text-yellow-400 hover:bg-gray-800"
                        }
                      `}
                    >
                      <Info size={18} />
                    </button>
                    <button className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-yellow-400 hover:bg-gray-800 transition">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </header>

                {/* MESSAGES */}
                <div
                  ref={messagesContainerRef}
                  onScroll={handleScroll}
                  className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 relative"
                >
                  {activeLoading ? (
                    <div className="space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className={`flex ${i % 2 === 0 ? "justify-end" : "justify-start"}`}>
                          <div className="w-48 h-12 rounded-2xl bg-gray-800 animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : activeMessages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
                          <MessageCircle size={26} className="text-yellow-400" />
                        </div>
                        <h3 className="font-black">No messages yet</h3>
                        <p className="text-gray-500 text-sm mt-1">
                          {selectedGroup
                            ? `Be the first to say something in ${selectedGroup.name}`
                            : `Say hello to ${getDisplayName(selectedUser)}`}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-4xl mx-auto">
                      <div className="space-y-1">
                        {activeMessages.map((message, index) => {
                          const mine = message.sender_id === user.id;
                          const prev = activeMessages[index - 1];
                          const next = activeMessages[index + 1];

                          const showDateSeparator = !prev || !isSameDay(prev.created_at, message.created_at);
                          const isFirstInGroup =
                            !prev ||
                            prev.sender_id !== message.sender_id ||
                            !isSameDay(prev.created_at, message.created_at);
                          const isLastInGroup =
                            !next ||
                            next.sender_id !== message.sender_id ||
                            !isSameDay(next.created_at, message.created_at);

                          const sender = selectedGroup
                            ? groupProfiles[message.sender_id]
                            : selectedUser;

                          const bubbleRadius = mine
                            ? `rounded-2xl ${isFirstInGroup ? "rounded-tr-2xl" : "rounded-tr-md"} ${isLastInGroup ? "rounded-br-md" : "rounded-br-2xl"}`
                            : `rounded-2xl ${isFirstInGroup ? "rounded-tl-2xl" : "rounded-tl-md"} ${isLastInGroup ? "rounded-bl-md" : "rounded-bl-2xl"}`;

                          const repliedMessage = message.reply_to
                            ? activeMessages.find((m) => m.id === message.reply_to)
                            : null;
                          const repliedSender = repliedMessage
                            ? (selectedGroup
                                ? groupProfiles[repliedMessage.sender_id]
                                : repliedMessage.sender_id === user.id
                                ? user
                                : selectedUser)
                            : null;

                          const msgReactions = reactions[message.id] || [];
                          const groupedReactions = msgReactions.reduce((acc, r) => {
                            acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                            return acc;
                          }, {});

                          const isActionOpen = actionMessage?.id === message.id;

                          return (
                            <div key={message.id} className="relative group/msg">
                              {showDateSeparator && (
                                <div className="flex justify-center my-6">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-800 px-3 py-1.5 rounded-full">
                                    {isSameDay(message.created_at, new Date())
                                      ? "Today"
                                      : formatDate(message.created_at)}
                                  </span>
                                </div>
                              )}

                              <motion.div
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`flex ${mine ? "justify-end" : "justify-start"} ${isLastInGroup ? "mb-2" : "mb-0.5"}`}
                              >
                                <div className={`max-w-[80%] sm:max-w-[65%] flex gap-2 ${mine ? "flex-row-reverse" : "flex-row"}`}>
                                  {!mine && (
                                    <div className="w-9 shrink-0">
                                      {isLastInGroup && <Avatar person={sender} size="sm" />}
                                    </div>
                                  )}

                                  <div className={`flex flex-col ${mine ? "items-end" : "items-start"} relative`}>
                                    {!mine && selectedGroup && isFirstInGroup && (
                                      <p className="text-[11px] font-bold text-yellow-400 mb-1 px-1">
                                        {getDisplayName(sender)}
                                      </p>
                                    )}

                                    {repliedMessage && (
                                      <div
                                        className={`mb-1 px-3 py-1.5 rounded-xl border-l-2 border-yellow-400 bg-gray-800/60 max-w-full ${
                                          mine ? "self-end" : "self-start"
                                        }`}
                                      >
                                        <p className="text-[10px] font-bold text-yellow-400">
                                          {repliedMessage.sender_id === user.id
                                            ? "You"
                                            : getDisplayName(repliedSender)}
                                        </p>
                                        <p className="text-[11px] text-gray-400 truncate">
                                          {repliedMessage.deleted_at
                                            ? "Deleted message"
                                            : repliedMessage.message}
                                        </p>
                                      </div>
                                    )}

                                    <div className="relative">
                                      <div
                                        className={`
                                          px-4 py-2.5 shadow-sm transition-opacity
                                          ${bubbleRadius}
                                          ${
                                            message.deleted_at
                                              ? "bg-gray-800/50 text-gray-500 italic border border-gray-700/50"
                                              : mine
                                              ? "bg-yellow-400 text-gray-950"
                                              : "bg-gray-800 text-gray-200 border border-gray-700"
                                          }
                                          ${message._optimistic ? "opacity-70" : "opacity-100"}
                                        `}
                                      >
                                        <p className="text-sm leading-6 whitespace-pre-wrap break-words">
                                          {message.deleted_at
                                            ? "This message was deleted"
                                            : message.message}
                                        </p>
                                        {message.edited_at && !message.deleted_at && (
                                          <p
                                            className={`text-[9px] mt-0.5 ${
                                              mine ? "text-gray-700" : "text-gray-500"
                                            }`}
                                          >
                                            edited
                                          </p>
                                        )}
                                      </div>

                                      {!message.deleted_at && !message._optimistic && (
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setActionMessage(isActionOpen ? null : message);
                                          }}
                                          className={`
                                            absolute top-1/2 -translate-y-1/2
                                            opacity-0 group-hover/msg:opacity-100 transition-opacity
                                            w-7 h-7 rounded-full bg-gray-950 border border-gray-800 text-gray-400
                                            flex items-center justify-center hover:text-yellow-400 hover:border-yellow-400/40
                                            ${mine ? "-left-9" : "-right-9"}
                                          `}
                                        >
                                          <ChevronDown size={14} />
                                        </button>
                                      )}

                                      <AnimatePresence>
                                        {isActionOpen && (
                                          <MessageActionsPopover
                                            mine={mine}
                                            alignRight={mine}
                                            onReply={() => startReply(message)}
                                            onEdit={() => startEdit(message)}
                                            onForward={() => {
                                              setForwardMessage(message);
                                              setActionMessage(null);
                                            }}
                                            onDelete={() => deleteMessage(message)}
                                            onReact={(emoji) => toggleReaction(message.id, emoji)}
                                          />
                                        )}
                                      </AnimatePresence>
                                    </div>

                                    {Object.keys(groupedReactions).length > 0 && (
                                      <div className={`flex flex-wrap gap-1 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
                                        {Object.entries(groupedReactions).map(([emoji, count]) => {
                                          const iReacted = msgReactions.some(
                                            (r) => r.emoji === emoji && r.user_id === user.id
                                          );
                                          return (
                                            <button
                                              key={emoji}
                                              onClick={() => toggleReaction(message.id, emoji)}
                                              className={`
                                                inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold border transition
                                                ${
                                                  iReacted
                                                    ? "bg-yellow-400/20 border-yellow-400/40 text-yellow-400"
                                                    : "bg-gray-800 border-gray-700 text-gray-300 hover:border-yellow-400/40"
                                                }
                                              `}
                                            >
                                              <span>{emoji}</span>
                                              <span>{count}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {isLastInGroup && (
                                      <div className={`flex items-center gap-1.5 mt-1 ${mine ? "justify-end" : "justify-start"}`}>
                                        <span className="text-[9px] text-gray-600">
                                          {formatTime(message.created_at)}
                                        </span>
                                        {mine && !message._optimistic && !selectedGroup && !message.deleted_at && (
                                          message.is_read ? (
                                            <CheckCheck size={13} className="text-yellow-500" />
                                          ) : (
                                            <Check size={13} className="text-gray-500" />
                                          )
                                        )}
                                        {mine && message._optimistic && (
                                          <Loader2 size={11} className="text-gray-500 animate-spin" />
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            </div>
                          );
                        })}

                        <AnimatePresence>
                          {!selectedGroup && otherUserTyping && (
                            <motion.div
                              key="typing-bubble"
                              initial={{ opacity: 0, y: 10, scale: 0.9 }}
                              animate={{ opacity: 1, y: 0, scale: 1 }}
                              exit={{ opacity: 0, y: 10, scale: 0.9 }}
                              transition={{ duration: 0.18 }}
                              className="flex items-end gap-2 mt-2"
                            >
                              <Avatar person={selectedUser} size="sm" />
                              <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
                                <div className="flex items-center gap-1">
                                  {[0, 1, 2].map((dot) => (
                                    <motion.span
                                      key={dot}
                                      animate={{
                                        y: [0, -4, 0],
                                        opacity: [0.4, 1, 0.4],
                                        scale: [0.9, 1.1, 0.9],
                                      }}
                                      transition={{
                                        duration: 1,
                                        repeat: Infinity,
                                        delay: dot * 0.15,
                                        ease: "easeInOut",
                                      }}
                                      className="w-2 h-2 rounded-full bg-green-400"
                                    />
                                  ))}
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>

                        <div ref={messagesEndRef} />
                      </div>
                    </div>
                  )}

                  <AnimatePresence>
                    {!autoScroll && activeMessages.length > 0 && (
                      <motion.button
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        onClick={() => {
                          setAutoScroll(true);
                          messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
                        }}
                        className="sticky bottom-2 left-1/2 -translate-x-1/2 z-20 rounded-full bg-yellow-400 text-gray-950 p-2.5 shadow-2xl hover:bg-yellow-300"
                      >
                        <ChevronDown size={18} strokeWidth={3} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>

                {/* COMPOSER */}
                <div className="shrink-0 border-t border-gray-800 p-3 sm:p-4 bg-gray-900">
                  <AnimatePresence>
                    {replyTo && (
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 6 }}
                        className="max-w-4xl mx-auto mb-2 flex items-start gap-3 rounded-xl bg-gray-950 border border-yellow-400/30 px-3 py-2"
                      >
                        <div className="flex-1 min-w-0 border-l-2 border-yellow-400 pl-3">
                          <p className="text-[10px] font-bold text-yellow-400">
                            Replying to{" "}
                            {replyTo.sender_id === user.id
                              ? "yourself"
                              : selectedGroup
                              ? getDisplayName(
                                  groupProfiles[replyTo.sender_id] || {}
                                )
                              : getDisplayName(selectedUser)}
                          </p>
                          <p className="text-xs text-gray-400 truncate">
                            {replyTo.message}
                          </p>
                        </div>
                        <button
                          onClick={cancelReply}
                          className="flex h-6 w-6 items-center justify-center rounded-lg bg-gray-900 text-gray-500 hover:text-white"
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form onSubmit={sendMessage} className="max-w-4xl mx-auto relative">
                    <AnimatePresence>
                      {showEmoji && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute bottom-full mb-2 left-0 bg-gray-950 border border-gray-800 rounded-2xl p-3 shadow-2xl grid grid-cols-8 gap-1 w-[280px] z-50"
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

                    <div className="flex items-end gap-2 bg-gray-950 border border-gray-800 rounded-2xl p-2 focus-within:border-yellow-400/60 transition">
                      <button
                        type="button"
                        className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center text-gray-600 hover:text-yellow-400 hover:bg-gray-900 transition"
                      >
                        <Paperclip size={19} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowEmoji((s) => !s)}
                        className={`hidden sm:flex w-10 h-10 rounded-xl items-center justify-center transition ${showEmoji ? "text-yellow-400 bg-gray-900" : "text-gray-600 hover:text-yellow-400 hover:bg-gray-900"}`}
                      >
                        <Smile size={19} />
                      </button>

                      <textarea
                        ref={inputRef}
                        value={messageText}
                        onChange={handleMessageChange}
                        onBlur={stopTypingNow}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                        rows={1}
                        placeholder={
                          selectedGroup
                            ? `Message ${selectedGroup.name}...`
                            : "Write a message..."
                        }
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

                    <p className="hidden sm:block text-[9px] text-gray-700 text-center mt-2">
                      Press Enter to send • Shift + Enter for a new line
                    </p>
                  </form>
                </div>
              </>
            )}
          </main>

          {/* ================= DESKTOP INFO PANEL (xl+) ================= */}
          <AnimatePresence initial={false}>
            {showProfilePanel && (
              <motion.aside
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                className="hidden xl:flex border-l border-gray-800 bg-gray-950 overflow-hidden shrink-0"
              >
                {hasActiveChat ? (
                  <div className="w-[320px] h-full">
                    <PanelBody />
                  </div>
                ) : (
                  <div className="w-[320px] h-full flex items-center justify-center p-8 text-center">
                    <div>
                      <Info size={30} className="mx-auto text-gray-700 mb-3" />
                      <p className="text-sm text-gray-600">
                        Select a person or group to see details.
                      </p>
                    </div>
                  </div>
                )}
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ================= MOBILE INFO DRAWER ================= */}
      <AnimatePresence>
        {showProfileDrawer && hasActiveChat && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileDrawer(false)}
              className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm xl:hidden"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 right-0 z-[110] w-full sm:w-[400px] bg-gray-950 border-l border-gray-800 flex flex-col xl:hidden"
            >
              <div className="flex items-center justify-between border-b border-gray-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
                    <Info size={18} className="text-yellow-400" />
                  </div>
                  <h2 className="font-black text-white">
                    {selectedGroup ? "Group Info" : "Profile"}
                  </h2>
                </div>
                <button
                  onClick={() => setShowProfileDrawer(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-gray-400 transition hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden">
                <PanelBody />
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* ================= EDIT MODAL ================= */}
      <AnimatePresence>
        {editingMessage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setEditingMessage(null); setEditText(""); }}
              className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] w-[calc(100%-32px)] max-w-md bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl p-5"
            >
              <h3 className="font-black text-white mb-3">Edit message</h3>
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                rows={3}
                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-yellow-400 resize-none"
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setEditingMessage(null); setEditText(""); }}
                  className="flex-1 rounded-xl bg-gray-900 border border-gray-800 py-3 text-sm font-bold text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  disabled={!editText.trim()}
                  className="flex-1 rounded-xl bg-yellow-400 py-3 text-sm font-black text-gray-950 hover:bg-yellow-300 disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================= FORWARD MODAL ================= */}
      <AnimatePresence>
        {forwardMessage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setForwardMessage(null)}
              className="fixed inset-0 z-[140] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[150] w-[calc(100%-32px)] max-w-md bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
              style={{ maxHeight: "80vh" }}
            >
              <div className="p-5 border-b border-gray-800">
                <h3 className="font-black text-white">Forward to</h3>
                <p className="text-xs text-gray-500 mt-0.5 truncate">
                  {forwardMessage.message}
                </p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-1">
                {myGroups.length > 0 && (
                  <>
                    <p className="text-[10px] font-black uppercase text-gray-600 px-3 pt-2">
                      Groups
                    </p>
                    {myGroups.map((g) => (
                      <button
                        key={`g-${g.id}`}
                        onClick={() => forwardTo({ type: "group", id: g.id })}
                        className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-900 text-left transition"
                      >
                        <GroupAvatar group={g} size="sm" />
                        <span className="text-sm font-bold text-white truncate">
                          {g.name}
                        </span>
                      </button>
                    ))}
                  </>
                )}

                <p className="text-[10px] font-black uppercase text-gray-600 px-3 pt-3">
                  People
                </p>
                {users.map((p) => (
                  <button
                    key={`u-${p.id}`}
                    onClick={() => forwardTo({ type: "user", id: p.id })}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-gray-900 text-left transition"
                  >
                    <Avatar person={p} size="sm" />
                    <span className="text-sm font-bold text-white truncate">
                      {getDisplayName(p)}
                    </span>
                  </button>
                ))}
              </div>

              <div className="p-4 border-t border-gray-800">
                <button
                  onClick={() => setForwardMessage(null)}
                  className="w-full rounded-xl bg-gray-900 border border-gray-800 py-3 text-sm font-bold text-gray-300 hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================= MEDIA & FILES MODAL ================= */}
      <AnimatePresence>
        {showMediaModal && hasActiveChat && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowMediaModal(false)}
              className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              className="fixed inset-x-4 top-[5%] bottom-[5%] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[560px] sm:max-h-[85vh] z-[130] bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-gray-800 p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-yellow-400 flex items-center justify-center text-gray-950">
                    <ImageIcon size={18} />
                  </div>
                  <div>
                    <h2 className="font-black text-white">Media & Files</h2>
                    <p className="text-xs text-gray-500">
                      {selectedGroup ? selectedGroup.name : getDisplayName(selectedUser)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowMediaModal(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-gray-400 transition hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5">
                {mediaItems.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-900 flex items-center justify-center mb-4">
                      <ImageIcon size={26} className="text-gray-600" />
                    </div>
                    <h3 className="font-black text-white">No media yet</h3>
                    <p className="text-xs text-gray-500 mt-2 max-w-xs mx-auto">
                      Images and files shared in this chat will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {mediaItems.map((item) => (
                      <a
                        key={item.id}
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative aspect-square rounded-xl overflow-hidden border border-gray-800 bg-gray-900 hover:border-yellow-400/50 transition"
                      >
                        {item.type === "image" ? (
                          <img
                            src={item.url}
                            alt="media"
                            className="w-full h-full object-cover group-hover:scale-105 transition"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center">
                            <div className="w-10 h-10 rounded-lg bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center mb-2">
                              <Paperclip size={16} className="text-yellow-400" />
                            </div>
                            <p className="text-[10px] text-gray-500 truncate w-full">
                              {new URL(item.url).hostname}
                            </p>
                          </div>
                        )}
                      </a>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-800 p-4">
                <button
                  onClick={() => setShowMediaModal(false)}
                  className="w-full rounded-xl bg-gray-900 border border-gray-800 py-3 text-sm font-bold text-gray-300 transition hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}