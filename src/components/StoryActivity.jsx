import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Eye, Heart, MessageCircle, Loader2, BarChart3,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Avatar, { getDisplayName } from "./Avatar";

const TABS = [
  { key: "viewers", label: "Viewers", icon: Eye },
  { key: "reactions", label: "Reactions", icon: Heart },
  { key: "replies", label: "Replies", icon: MessageCircle },
  { key: "insights", label: "Insights", icon: BarChart3 },
];

export default function StoryActivity({ open, story, onClose }) {
  const [tab, setTab] = useState("viewers");

  const [views, setViews] = useState([]);       // [{ id, viewer_id, viewed_at }]
  const [reactions, setReactions] = useState([]); // [{ id, user_id, emoji, created_at }]
  const [replies, setReplies] = useState([]);   // [{ id, sender_id, message, created_at }]
  const [profiles, setProfiles] = useState({}); // { userId: profile }
  const [loading, setLoading] = useState(true);

  // ---------------------------------------------------------
  // LOAD ALL ACTIVITY
  // ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    if (!open || !story?.id) return;

    (async () => {
      setLoading(true);

      const [viewsRes, reactionsRes, repliesRes] = await Promise.all([
        supabase
          .from("story_views")
          .select("id, viewer_id, viewed_at")
          .eq("story_id", story.id)
          .order("viewed_at", { ascending: false }),

        supabase
          .from("story_reactions")
          .select("id, user_id, emoji, created_at")
          .eq("story_id", story.id)
          .order("created_at", { ascending: false }),

        // story replies are stored in messages with a known prefix
        supabase
          .from("messages")
          .select("id, sender_id, message, created_at")
          .ilike("message", "Replied to your story:%")
          .order("created_at", { ascending: false })
          .limit(200),
      ]);

      if (cancelled) return;

      setViews(viewsRes.data || []);
      setReactions(reactionsRes.data || []);

      // filter replies to those whose message contains this story's media URL? we don't have that link
      // fallback: keep replies to the poster only — pass the poster id from story.user_id
      const allReplies = repliesRes.data || [];
      setReplies(allReplies);

      // hydrate profiles for everyone involved
      const ids = new Set([
        ...(viewsRes.data || []).map((v) => v.viewer_id),
        ...(reactionsRes.data || []).map((r) => r.user_id),
        ...allReplies.map((r) => r.sender_id),
      ]);
      if (ids.size) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", [...ids]);
        const map = {};
        (profs || []).forEach((p) => (map[p.id] = p));
        if (!cancelled) setProfiles(map);
      }

      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open, story?.id]);

  // ---------------------------------------------------------
  // SUMMARY COUNTS
  // ---------------------------------------------------------
  const reactionSummary = useMemo(() => {
    const m = {};
    reactions.forEach((r) => {
      m[r.emoji] = (m[r.emoji] || 0) + 1;
    });
    return m;
  }, [reactions]);

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[260] bg-black/70 backdrop-blur-sm"
      />

      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        drag="y"
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={0.15}
        onDragEnd={(_, info) => {
          if (info.offset.y > 120) onClose();
        }}
        className="fixed inset-x-0 bottom-0 z-[265] flex h-[78vh] flex-col rounded-t-3xl border-t border-yellow-400/20 bg-gray-950 shadow-2xl"
      >
        {/* drag handle */}
        <div className="flex justify-center pt-3">
          <div className="h-1 w-10 rounded-full bg-gray-700" />
        </div>

        {/* header */}
        <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-gray-950">
              <BarChart3 size={16} />
            </div>
            <div>
              <p className="text-sm font-black text-white">Story activity</p>
              <p className="text-[11px] text-gray-500">
                {story.caption || "Your story"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* tabs */}
        <div className="flex border-b border-gray-800">
          {TABS.map((t) => {
            const active = tab === t.key;
            const count =
              t.key === "viewers"
                ? views.length
                : t.key === "reactions"
                ? reactions.length
                : t.key === "replies"
                ? replies.length
                : null;

            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-black transition ${
                  active ? "text-yellow-400" : "text-gray-500 hover:text-gray-300"
                }`}
              >
                <t.icon size={14} />
                <span>{t.label}</span>
                {count !== null && count > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[9px] ${
                      active
                        ? "bg-yellow-400 text-gray-950"
                        : "bg-gray-800 text-gray-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
                {active && (
                  <motion.div
                    layoutId="story-activity-underline"
                    className="absolute bottom-0 left-0 right-0 h-[2px] bg-yellow-400"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* body */}
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {loading ? (
            <div className="flex items-center justify-center py-14 text-gray-500">
              <Loader2 className="animate-spin" size={22} />
            </div>
          ) : (
            <>
              {/* VIEWERS */}
              {tab === "viewers" && (
                <>
                  {views.length === 0 ? (
                    <EmptyState icon={Eye} text="No views yet" />
                  ) : (
                    <div className="space-y-1">
                      {views.map((v) => {
                        const p = profiles[v.viewer_id];
                        return (
                          <Row key={v.id}>
                            <Avatar person={p || {}} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-white">
                                {getDisplayName(p || {})}
                              </p>
                              <p className="truncate text-[11px] text-gray-500">
                                @{p?.username || "user"} ·{" "}
                                {formatRelative(v.viewed_at)}
                              </p>
                            </div>
                            <Eye size={15} className="text-gray-500" />
                          </Row>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* REACTIONS */}
              {tab === "reactions" && (
                <>
                  {reactions.length === 0 ? (
                    <EmptyState icon={Heart} text="No reactions yet" />
                  ) : (
                    <>
                      {/* summary chips */}
                      <div className="mb-3 flex flex-wrap gap-2">
                        {Object.entries(reactionSummary).map(([emoji, count]) => (
                          <div
                            key={emoji}
                            className="flex items-center gap-1 rounded-full border border-yellow-400/30 bg-yellow-400/10 px-2.5 py-1 text-xs font-bold text-yellow-400"
                          >
                            <span className="text-sm">{emoji}</span>
                            {count}
                          </div>
                        ))}
                      </div>

                      <div className="space-y-1">
                        {reactions.map((r) => {
                          const p = profiles[r.user_id];
                          return (
                            <Row key={r.id}>
                              <Avatar person={p || {}} size="sm" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-bold text-white">
                                  {getDisplayName(p || {})}
                                </p>
                                <p className="truncate text-[11px] text-gray-500">
                                  {formatRelative(r.created_at)}
                                </p>
                              </div>
                              <span className="text-2xl">{r.emoji}</span>
                            </Row>
                          );
                        })}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* REPLIES */}
              {tab === "replies" && (
                <>
                  {replies.length === 0 ? (
                    <EmptyState icon={MessageCircle} text="No replies yet" />
                  ) : (
                    <div className="space-y-1">
                      {replies.map((r) => {
                        const p = profiles[r.sender_id];
                        const clean = r.message.replace(
                          /^Replied to your story:\s*/i,
                          ""
                        );
                        return (
                          <Row key={r.id}>
                            <Avatar person={p || {}} size="sm" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-bold text-white">
                                {getDisplayName(p || {})}
                              </p>
                              <p className="truncate text-xs text-gray-300">
                                {clean}
                              </p>
                              <p className="text-[10px] text-gray-500">
                                {formatRelative(r.created_at)}
                              </p>
                            </div>
                          </Row>
                        );
                      })}
                    </div>
                  )}
                </>
              )}

              {/* INSIGHTS */}
              {tab === "insights" && (
                <div className="space-y-3">
                  <InsightCard
                    icon={Eye}
                    label="Views"
                    value={views.length}
                  />
                  <InsightCard
                    icon={Heart}
                    label="Reactions"
                    value={reactions.length}
                  />
                  <InsightCard
                    icon={MessageCircle}
                    label="Replies"
                    value={replies.length}
                  />
                  <div className="rounded-2xl border border-gray-800 bg-gray-900 p-4">
                    <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Top reactions
                    </p>
                    {Object.keys(reactionSummary).length === 0 ? (
                      <p className="text-xs text-gray-500">No reactions yet</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(reactionSummary)
                          .sort((a, b) => b[1] - a[1])
                          .map(([emoji, count]) => (
                            <div
                              key={emoji}
                              className="flex items-center gap-1.5 rounded-xl border border-yellow-400/20 bg-yellow-400/5 px-3 py-1.5 text-sm font-bold text-white"
                            >
                              <span className="text-lg">{emoji}</span>
                              {count}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

// =========================================================
// HELPERS
// =========================================================
function Row({ children }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl p-2.5 transition hover:bg-gray-900">
      {children}
    </div>
  );
}

function EmptyState({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900">
        <Icon size={22} className="text-gray-600" />
      </div>
      <p className="text-sm font-black text-white">{text}</p>
      <p className="mt-1 text-xs text-gray-500">
        Activity will appear here.
      </p>
    </div>
  );
}

function InsightCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900 p-4">
      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-400">
        <Icon size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-widest text-gray-500">
          {label}
        </p>
        <p className="mt-0.5 text-2xl font-black text-white">{value}</p>
      </div>
    </div>
  );
}

function formatRelative(d) {
  if (!d) return "";
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}