import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Search, X, Users, UsersRound, Crown, MessageCircle,
  UserPlus, Check, Loader2, Trash2, Sparkles, LogIn, LogOut,
  ChevronRight,
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

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString([], { day: "numeric", month: "short" }) : "";

function Avatar({ person, size = "md" }) {
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
    xl: "w-20 h-20 text-xl",
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
export default function Groups() {
  const navigate = useNavigate();

  const [me, setMe] = useState(null);
  const [groups, setGroups] = useState([]);
  const [myGroupIds, setMyGroupIds] = useState(new Set());
  const [myRoles, setMyRoles] = useState({});
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all"); // "all" | "mine"

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [activeGroup, setActiveGroup] = useState(null);
  const [joiningId, setJoiningId] = useState(null);

  // =========================================================
  // INIT
  // =========================================================
  useEffect(() => {
    init();
    // eslint-disable-next-line
  }, []);

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
        setError("Please login to view groups.");
        return;
      }

      setMe(currentUser);

      await Promise.all([
        loadAllGroups(),
        loadMyMemberships(currentUser.id),
        loadAllUsers(currentUser.id),
      ]);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to load groups.");
    } finally {
      setLoading(false);
    }
  };

  // Load ALL groups (public directory)
  const loadAllGroups = async () => {
    const { data: groupData, error: gErr } = await supabase
      .from("groups")
      .select("*")
      .order("created_at", { ascending: false });

    if (gErr) throw gErr;

    // Fetch member counts
    const { data: memberRows } = await supabase
      .from("group_members")
      .select("group_id");

    const countMap = {};
    (memberRows || []).forEach((m) => {
      countMap[m.group_id] = (countMap[m.group_id] || 0) + 1;
    });

    setGroups(
      (groupData || []).map((g) => ({
        ...g,
        member_count: countMap[g.id] || 0,
      }))
    );
  };

  // Load MY memberships
  const loadMyMemberships = async (userId) => {
    const { data: memberships, error: mErr } = await supabase
      .from("group_members")
      .select("group_id, role")
      .eq("user_id", userId);

    if (mErr) throw mErr;

    const ids = new Set((memberships || []).map((m) => m.group_id));
    const roles = {};
    (memberships || []).forEach((m) => {
      roles[m.group_id] = m.role;
    });

    setMyGroupIds(ids);
    setMyRoles(roles);
  };

  const loadAllUsers = async (userId) => {
    const { data, error: uErr } = await supabase
      .from("profiles")
      .select("id, username, full_name, avatar_url")
      .neq("id", userId)
      .order("full_name", { ascending: true });

    if (uErr) throw uErr;
    setAllUsers(data || []);
  };

  // =========================================================
  // FILTER + SEARCH
  // =========================================================
  const filteredGroups = useMemo(() => {
    const v = search.trim().toLowerCase();

    let list = groups;

    if (activeFilter === "mine") {
      list = list.filter((g) => myGroupIds.has(g.id));
    }

    if (v) {
      list = list.filter(
        (g) =>
          g.name?.toLowerCase().includes(v) ||
          g.description?.toLowerCase().includes(v)
      );
    }

    return list;
  }, [groups, search, activeFilter, myGroupIds]);

  const mineCount = useMemo(
    () => groups.filter((g) => myGroupIds.has(g.id)).length,
    [groups, myGroupIds]
  );

  // =========================================================
  // JOIN GROUP
  // =========================================================
  const joinGroup = async (group) => {
    try {
      setJoiningId(group.id);
      setError("");

      const { error: rpcError } = await supabase.rpc("join_group", {
        p_group_id: group.id,
      });

      if (rpcError) throw rpcError;

      setMyGroupIds((prev) => {
        const next = new Set(prev);
        next.add(group.id);
        return next;
      });
      setMyRoles((prev) => ({ ...prev, [group.id]: "member" }));
      setGroups((prev) =>
        prev.map((g) =>
          g.id === group.id
            ? { ...g, member_count: (g.member_count || 0) + 1 }
            : g
        )
      );
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to join group.");
    } finally {
      setJoiningId(null);
    }
  };

  // =========================================================
  // LEAVE GROUP
  // =========================================================
  const leaveGroup = async (group) => {
    if (!confirm(`Leave "${group.name}"?`)) return;
    try {
      setError("");
      const { error: rpcError } = await supabase.rpc("leave_group", {
        p_group_id: group.id,
      });

      if (rpcError) throw rpcError;

      setMyGroupIds((prev) => {
        const next = new Set(prev);
        next.delete(group.id);
        return next;
      });
      setGroups((prev) =>
        prev.map((g) =>
          g.id === group.id
            ? { ...g, member_count: Math.max((g.member_count || 1) - 1, 0) }
            : g
        )
      );
      setMyRoles((prev) => {
        const next = { ...prev };
        delete next[group.id];
        return next;
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to leave group.");
    }
  };

  // =========================================================
  // OPEN GROUP CHAT (navigate to route)
  // =========================================================
  const openGroupChat = (group) => {
    navigate(`/community/group/${group.id}`, { state: { group } });
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
            <div className="w-12 h-12 rounded-2xl bg-yellow-400/10 border border-yellow-400/20 flex items-center justify-center">
              <UsersRound size={22} className="text-yellow-400" />
            </div>
            <div>
              <h1 className="text-2xl font-black">Groups</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {groups.length === 0
                  ? "No groups yet — be the first to create one"
                  : `${groups.length} ${
                      groups.length === 1 ? "group" : "groups"
                    } on the platform`}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-gray-950 transition hover:bg-yellow-300 active:scale-95"
          >
            <Plus size={18} strokeWidth={3} />
            Create Group
          </button>
        </div>

        {/* SEARCH + FILTER */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search
              size={17}
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search groups..."
              className="w-full bg-gray-900 border border-gray-800 rounded-2xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-yellow-400 transition"
            />
          </div>

          <div className="grid grid-cols-2 gap-1 bg-gray-900 border border-gray-800 rounded-2xl p-1 shrink-0">
            {[
              { key: "all", label: `All (${groups.length})` },
              { key: "mine", label: `Mine (${mineCount})` },
            ].map((tab) => {
              const active = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveFilter(tab.key)}
                  className={`
                    relative rounded-xl px-4 py-2 text-xs font-black transition-all
                    ${
                      active
                        ? "text-gray-950"
                        : "text-gray-400 hover:text-white"
                    }
                  `}
                >
                  {active && (
                    <motion.span
                      layoutId="groups-filter-pill"
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 30,
                      }}
                      className="absolute inset-0 rounded-xl bg-yellow-400"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
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
                className="h-32 rounded-2xl bg-gray-900 animate-pulse"
              />
            ))}
          </div>
        ) : filteredGroups.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-3xl border border-gray-800 bg-gray-900 p-12 text-center"
          >
            <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
              <UsersRound size={28} className="text-gray-600" />
            </div>
            <h2 className="text-lg font-black">
              {search
                ? "No groups match your search"
                : activeFilter === "mine"
                ? "You're not in any group yet"
                : "No groups yet"}
            </h2>
            <p className="text-sm text-gray-500 mt-2 max-w-sm mx-auto">
              {search
                ? "Try a different keyword."
                : "Create your first group and start chatting with your people."}
            </p>
            {!search && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-sm font-black text-gray-950 transition hover:bg-yellow-300"
              >
                <Plus size={16} strokeWidth={3} />
                Create a group
              </button>
            )}
          </motion.div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <AnimatePresence>
              {filteredGroups.map((group, i) => {
                const isMember = myGroupIds.has(group.id);
                const isAdmin = myRoles[group.id] === "admin";
                const isJoining = joiningId === group.id;

                return (
                  <motion.div
                    key={group.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => isMember && openGroupChat(group)}
                    className={`
                      group relative rounded-2xl border bg-gray-900 p-4 transition-all duration-200
                      ${
                        isMember
                          ? "border-gray-800 hover:border-yellow-400/50 hover:shadow-[0_0_24px_-8px_rgba(250,204,21,0.35)] cursor-pointer"
                          : "border-gray-800 hover:border-gray-700"
                      }
                    `}
                  >
                    {/* Top-right action icons */}
                    <div className="absolute right-3 top-3 flex items-center gap-1 z-10">
                      {isMember && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveGroup(group);
                              setShowMembersModal(true);
                            }}
                            title="Manage members"
                            className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800/80 backdrop-blur text-gray-400 transition hover:bg-gray-700 hover:text-yellow-400"
                          >
                            <UserPlus size={14} />
                          </button>

                          {!isAdmin && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                leaveGroup(group);
                              }}
                              title="Leave group"
                              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800/80 backdrop-blur text-gray-400 transition hover:bg-red-500/20 hover:text-red-400"
                            >
                              <LogOut size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>

                    {/* Avatar + name + badges */}
                    <div className="flex items-start gap-3 pr-20">
                      <GroupAvatar group={group} size="md" />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-black text-sm truncate text-white group-hover:text-yellow-400 transition">
                            {group.name}
                          </h3>

                          {isAdmin && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-yellow-400/10 border border-yellow-400/20 px-2 py-0.5 text-[10px] font-bold text-yellow-400">
                              <Crown size={10} />
                              Admin
                            </span>
                          )}

                          {isMember && !isAdmin && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 border border-green-500/20 px-2 py-0.5 text-[10px] font-bold text-green-400">
                              <Check size={10} />
                              Member
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {group.description || "No description"}
                        </p>

                        <div className="flex items-center gap-2 mt-2 text-[11px] text-gray-500">
                          <span className="inline-flex items-center gap-1">
                            <Users size={11} />
                            {group.member_count}{" "}
                            {group.member_count === 1 ? "member" : "members"}
                          </span>
                          <span className="text-gray-700">·</span>
                          <span>{formatDate(group.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom CTA */}
                    {!isMember ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          joinGroup(group);
                        }}
                        disabled={isJoining}
                        className="mt-3 w-full flex items-center justify-center gap-2 rounded-xl bg-gray-800 border border-gray-700 py-2.5 text-xs font-black text-gray-200 transition hover:bg-yellow-400 hover:text-gray-950 hover:border-yellow-400 disabled:opacity-50 active:scale-[0.98]"
                      >
                        {isJoining ? (
                          <>
                            <Loader2 size={14} className="animate-spin" />
                            Joining...
                          </>
                        ) : (
                          <>
                            <LogIn size={14} />
                            Join Group
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="mt-3 flex items-center justify-between text-[11px] font-bold">
                        <span className="text-gray-600 group-hover:text-yellow-400/80 transition inline-flex items-center gap-1">
                          <MessageCircle size={11} />
                          Click to open chat
                        </span>
                        <ChevronRight
                          size={14}
                          className="text-gray-700 transition group-hover:translate-x-0.5 group-hover:text-yellow-400"
                        />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* CREATE MODAL */}
      <CreateGroupModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        me={me}
        allUsers={allUsers}
        onCreated={(newGroup) => {
          setGroups((prev) => [newGroup, ...prev]);
          setMyGroupIds((prev) => {
            const next = new Set(prev);
            next.add(newGroup.id);
            return next;
          });
          setMyRoles((prev) => ({ ...prev, [newGroup.id]: "admin" }));
          setShowCreateModal(false);
        }}
      />

      {/* MEMBERS MODAL */}
      <MembersModal
        open={showMembersModal}
        onClose={() => setShowMembersModal(false)}
        group={activeGroup}
        me={me}
        allUsers={allUsers}
        onMembersChanged={(groupId, delta) => {
          setGroups((prev) =>
            prev.map((g) =>
              g.id === groupId
                ? {
                    ...g,
                    member_count: Math.max((g.member_count || 0) + delta, 0),
                  }
                : g
            )
          );
        }}
      />
    </div>
  );
}

// =========================================================
// CREATE GROUP MODAL
// =========================================================
function CreateGroupModal({ open, onClose, me, allUsers, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setName("");
      setDescription("");
      setSearch("");
      setSelected([]);
      setError("");
    }
  }, [open]);

  const filteredUsers = useMemo(() => {
    const v = search.trim().toLowerCase();
    if (!v) return allUsers;
    return allUsers.filter(
      (u) =>
        getDisplayName(u).toLowerCase().includes(v) ||
        u.username?.toLowerCase().includes(v)
    );
  }, [allUsers, search]);

  const toggleUser = (userId) => {
    setSelected((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleCreate = async () => {
    setError("");
    if (!name.trim()) {
      setError("Group name is required.");
      return;
    }

    try {
      setCreating(true);

      const { data: groupId, error: rpcError } = await supabase.rpc(
        "create_group_with_creator",
        {
          p_name: name.trim(),
          p_description: description.trim() || null,
          p_avatar_url: null,
        }
      );

      if (rpcError) throw rpcError;

      if (selected.length > 0) {
        const { error: addError } = await supabase.rpc(
          "add_members_to_group",
          {
            p_group_id: groupId,
            p_user_ids: selected,
          }
        );
        if (addError) throw addError;
      }

      const { data: newGroup } = await supabase
        .from("groups")
        .select("*")
        .eq("id", groupId)
        .single();

      onCreated({
        ...newGroup,
        my_role: "admin",
        member_count: selected.length + 1,
      });
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to create group.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed inset-x-4 top-[5%] bottom-[5%] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[520px] sm:max-h-[85vh] z-[90] bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-gray-800 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-yellow-400 flex items-center justify-center text-gray-950">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h2 className="font-black text-white">Create Group</h2>
                  <p className="text-xs text-gray-500">
                    Add people and start chatting
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-gray-400 transition hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                  Group Name *
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Design Team"
                  maxLength={60}
                  className="mt-2 w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-yellow-400 transition"
                />
              </div>

              <div>
                <label className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What is this group about?"
                  rows={3}
                  maxLength={200}
                  className="mt-2 w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-yellow-400 transition resize-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-black uppercase tracking-widest text-gray-500">
                    Add Members
                  </label>
                  {selected.length > 0 && (
                    <span className="text-[11px] font-bold text-yellow-400">
                      {selected.length} selected
                    </span>
                  )}
                </div>

                <div className="relative">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search people..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-yellow-400 transition"
                  />
                </div>

                <div className="mt-3 max-h-64 overflow-y-auto space-y-1 pr-1">
                  {filteredUsers.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-6">
                      No users found
                    </p>
                  ) : (
                    filteredUsers.map((person) => {
                      const isSelected = selected.includes(person.id);
                      return (
                        <button
                          key={person.id}
                          type="button"
                          onClick={() => toggleUser(person.id)}
                          className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition ${
                            isSelected
                              ? "bg-yellow-400/10 border border-yellow-400/30"
                              : "hover:bg-gray-900 border border-transparent"
                          }`}
                        >
                          <Avatar person={person} size="sm" />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-bold text-white truncate">
                              {getDisplayName(person)}
                            </p>
                            <p className="text-[11px] text-gray-500 truncate">
                              @{person.username || "user"}
                            </p>
                          </div>
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center transition ${
                              isSelected
                                ? "bg-yellow-400 text-gray-950"
                                : "bg-gray-800 text-transparent"
                            }`}
                          >
                            <Check size={14} strokeWidth={3} />
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
                  {error}
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 p-4 flex gap-2">
              <button
                onClick={onClose}
                disabled={creating}
                className="flex-1 rounded-xl bg-gray-900 border border-gray-800 py-3 text-sm font-bold text-gray-300 transition hover:bg-gray-800 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !name.trim()}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 text-sm font-black text-gray-950 transition hover:bg-yellow-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus size={16} strokeWidth={3} />
                    Create Group
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// =========================================================
// MEMBERS MODAL
// =========================================================
function MembersModal({ open, onClose, group, me, allUsers, onMembersChanged }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && group) {
      loadMembers();
      setSearch("");
      setError("");
    }
    // eslint-disable-next-line
  }, [open, group?.id]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const { data, error: mErr } = await supabase
        .from("group_members")
        .select("user_id, role, joined_at")
        .eq("group_id", group.id);

      if (mErr) throw mErr;

      const ids = (data || []).map((m) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", ids);

      const map = new Map((profiles || []).map((p) => [p.id, p]));
      const enriched = (data || []).map((m) => ({
        ...m,
        profile: map.get(m.user_id),
      }));

      setMembers(enriched);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to load members.");
    } finally {
      setLoading(false);
    }
  };

  const memberIds = useMemo(() => members.map((m) => m.user_id), [members]);

  const filteredNonMembers = useMemo(() => {
    const v = search.trim().toLowerCase();
    const nonMembers = allUsers.filter((u) => !memberIds.includes(u.id));
    if (!v) return nonMembers;
    return nonMembers.filter(
      (u) =>
        getDisplayName(u).toLowerCase().includes(v) ||
        u.username?.toLowerCase().includes(v)
    );
  }, [allUsers, memberIds, search]);

  const handleAdd = async (userId) => {
    try {
      setAdding(true);
      setError("");

      const { error: addErr } = await supabase.rpc("add_members_to_group", {
        p_group_id: group.id,
        p_user_ids: [userId],
      });

      if (addErr) throw addErr;

      await loadMembers();
      onMembersChanged?.(group.id, 1);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to add member.");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId) => {
    try {
      setError("");
      const { error: delErr } = await supabase
        .from("group_members")
        .delete()
        .eq("group_id", group.id)
        .eq("user_id", userId);

      if (delErr) throw delErr;

      setMembers((prev) => prev.filter((m) => m.user_id !== userId));
      onMembersChanged?.(group.id, -1);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to remove member.");
    }
  };

  const isAdmin = members.find(
    (m) => m.user_id === me?.id && m.role === "admin"
  );

  return (
    <AnimatePresence>
      {open && group && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[80] bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            className="fixed inset-x-4 top-[5%] bottom-[5%] sm:inset-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-[520px] sm:max-h-[85vh] z-[90] bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-gray-800 p-5">
              <div className="flex items-center gap-3 min-w-0">
                <GroupAvatar group={group} size="sm" />
                <div className="min-w-0">
                  <h2 className="font-black text-white truncate">
                    {group.name}
                  </h2>
                  <p className="text-xs text-gray-500">
                    {members.length}{" "}
                    {members.length === 1 ? "member" : "members"}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-gray-400 transition hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">
                  Current Members
                </p>

                {loading ? (
                  <div className="space-y-2">
                    {[...Array(3)].map((_, i) => (
                      <div
                        key={i}
                        className="h-14 rounded-xl bg-gray-900 animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-1">
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
                          {(isAdmin || isMe) && (
                            <button
                              onClick={() => handleRemove(m.user_id)}
                              title={isMe ? "Leave group" : "Remove member"}
                              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-lg bg-gray-800 text-gray-500 transition hover:bg-red-500/10 hover:text-red-400"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-500 mb-3">
                  Add People
                </p>

                <div className="relative mb-3">
                  <Search
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search users to add..."
                    className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-gray-600 outline-none focus:border-yellow-400 transition"
                  />
                </div>

                <div className="max-h-56 overflow-y-auto space-y-1 pr-1">
                  {filteredNonMembers.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-6">
                      {search
                        ? "No users found"
                        : "Everyone is already a member 🎉"}
                    </p>
                  ) : (
                    filteredNonMembers.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-800 bg-gray-900"
                      >
                        <Avatar person={p} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white truncate">
                            {getDisplayName(p)}
                          </p>
                          <p className="text-[11px] text-gray-500 truncate">
                            @{p.username || "user"}
                          </p>
                        </div>
                        <button
                          disabled={adding}
                          onClick={() => handleAdd(p.id)}
                          className="shrink-0 flex items-center gap-1.5 rounded-lg bg-yellow-400 px-3 py-1.5 text-xs font-black text-gray-950 transition hover:bg-yellow-300 disabled:opacity-50 active:scale-95"
                        >
                          <Plus size={12} strokeWidth={3} />
                          Add
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-xl border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-300">
                  {error}
                </div>
              )}
            </div>

            <div className="border-t border-gray-800 p-4">
              <button
                onClick={onClose}
                className="w-full rounded-xl bg-gray-900 border border-gray-800 py-3 text-sm font-bold text-gray-300 transition hover:bg-gray-800"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}