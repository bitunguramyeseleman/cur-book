import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Send, Trash2, Pencil, Check,
  Music, Play, Pause, Heart, Eye,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Avatar, { getDisplayName } from "./Avatar";
import StoryActivity from "./StoryActivity";

const STORY_DURATION = 5000; // ms
const EMOJIS = ["❤️", "😂", "😮", "😢", "🔥", "👏", "🙏", "💯"];

export default function StoryViewer({
  groups,
  initialGroupIndex,
  currentUser,
  onClose,
  onStorySeen,
}) {
  const [groupIndex, setGroupIndex] = useState(initialGroupIndex);
  const [storyIndex, setStoryIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [replyText, setReplyText] = useState("");

  // reactions picker
  const [showReactions, setShowReactions] = useState(false);

  // activity sheet (poster only)
  const [showActivity, setShowActivity] = useState(false);

  // editing caption
  const [editingCaption, setEditingCaption] = useState(false);
  const [captionDraft, setCaptionDraft] = useState("");

  // song
  const audioRef = useRef(null);
  const [songPlaying, setSongPlaying] = useState(false);

  const rafRef = useRef(null);
  const startTimeRef = useRef(null);

  const group = groups[groupIndex];
  const story = group?.stories?.[storyIndex];
  const profile = group?.profile || {};
  const isMine = currentUser?.id === profile?.id;

  // ---------------------------------------------------------
  // NEXT / PREV
  // ---------------------------------------------------------
  const next = () => {
    if (!group) return;
    if (storyIndex < group.stories.length - 1) {
      setStoryIndex((i) => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex((i) => i + 1);
      setStoryIndex(0);
    } else {
      onClose?.();
    }
  };

  const prev = () => {
    if (!group) return;
    if (storyIndex > 0) {
      setStoryIndex((i) => i - 1);
    } else if (groupIndex > 0) {
      setGroupIndex((i) => i - 1);
      setStoryIndex(0);
    }
  };

  // ---------------------------------------------------------
  // ON STORY CHANGE — reset UI + mark seen
  // ---------------------------------------------------------
  useEffect(() => {
    if (story) onStorySeen?.(story.id);
    setProgress(0);
    setShowReactions(false);
    setEditingCaption(false);
    setCaptionDraft(story?.caption || "");
    startTimeRef.current = Date.now();
  }, [story?.id]); // eslint-disable-line

  // ---------------------------------------------------------
  // PROGRESS TIMER
  // ---------------------------------------------------------
  useEffect(() => {
    if (!story) return;
    const tick = () => {
      const elapsed = Date.now() - (startTimeRef.current || Date.now());
      const pct = Math.min(1, elapsed / STORY_DURATION);
      setProgress(pct);
      if (pct >= 1) next();
      else rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line
  }, [story?.id]);

  // ---------------------------------------------------------
  // SONG AUTO-PLAY
  // ---------------------------------------------------------
  useEffect(() => {
    const url = story?.song?.previewUrl;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setSongPlaying(false);

    if (!url) return;

    const a = new Audio(url);
    a.volume = 0.85;
    audioRef.current = a;
    a.play()
      .then(() => setSongPlaying(true))
      .catch(() => setSongPlaying(false));
    a.onended = () => setSongPlaying(false);

    return () => {
      a.pause();
      audioRef.current = null;
      setSongPlaying(false);
    };
  }, [story?.id, story?.song?.previewUrl]);

  const toggleSong = () => {
    const a = audioRef.current;
    if (!a) return;
    if (songPlaying) {
      a.pause();
      setSongPlaying(false);
    } else {
      a.play().then(() => setSongPlaying(true)).catch(() => {});
    }
  };

  // ---------------------------------------------------------
  // EMOJI REACTION (only for non-owners)
  // ---------------------------------------------------------
  const reactToStory = async (emoji) => {
    if (!currentUser || !story) return;
    // replace existing reaction for this user
    await supabase
      .from("story_reactions")
      .delete()
      .eq("story_id", story.id)
      .eq("user_id", currentUser.id);

    await supabase
      .from("story_reactions")
      .insert({ story_id: story.id, user_id: currentUser.id, emoji });

    setShowReactions(false);
  };

  // ---------------------------------------------------------
  // POSTER: EDIT CAPTION / DELETE
  // ---------------------------------------------------------
  const saveCaption = async () => {
    if (!isMine || !story) return;
    const val = captionDraft.trim();
    const { error } = await supabase
      .from("stories")
      .update({ caption: val || null })
      .eq("id", story.id);
    if (!error) {
      story.caption = val || null;
      setEditingCaption(false);
    }
  };

  const deleteStory = async () => {
    if (!isMine || !story) return;
    if (!window.confirm("Delete this story?")) return;
    const { error } = await supabase
      .from("stories")
      .delete()
      .eq("id", story.id);
    if (error) return;

    // remove from local groups and move to next
    group.stories = group.stories.filter((s) => s.id !== story.id);
    if (group.stories.length === 0) {
      onClose?.();
    } else {
      setStoryIndex(Math.max(0, storyIndex - 1));
    }
  };

  // ---------------------------------------------------------
  // KEYBOARD
  // ---------------------------------------------------------
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line
  }, [groupIndex, storyIndex]);

  // ---------------------------------------------------------
  // REPLY (DM to owner)
  // ---------------------------------------------------------
  const sendReply = async (e) => {
    e?.preventDefault();
    const text = replyText.trim();
    if (!text || !currentUser || !profile?.id) return;

    await supabase.from("messages").insert({
      sender_id: currentUser.id,
      receiver_id: profile.id,
      group_id: null,
      message: `Replied to your story: ${text}`,
      is_read: false,
    });

    setReplyText("");
  };

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  if (!group || !story) return null;

  const coverColor = story.cover_color || "#facc15";

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[220] bg-black"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.98 }}
        className="fixed inset-0 z-[225] flex items-center justify-center"
      >
        <div className="relative flex h-full w-full max-w-[440px] flex-col bg-black">
          {/* ================= PROGRESS BARS ================= */}
          <div className="absolute left-0 right-0 top-0 z-30 flex gap-1 p-3">
            {group.stories.map((s, i) => (
              <div
                key={s.id}
                className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
              >
                <div
                  className="h-full transition-[width] duration-100 ease-linear"
                  style={{
                    backgroundColor: coverColor,
                    width:
                      i < storyIndex
                        ? "100%"
                        : i === storyIndex
                        ? `${progress * 100}%`
                        : "0%",
                  }}
                />
              </div>
            ))}
          </div>

          {/* ================= HEADER ================= */}
          <div className="absolute left-0 right-0 top-5 z-30 flex items-center gap-3 p-3">
            <div
              className="rounded-full p-[2px]"
              style={{ backgroundColor: coverColor }}
            >
              <div className="rounded-full bg-black p-[1.5px]">
                <Avatar person={profile} size="sm" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-white">
                {getDisplayName(profile)}
              </p>
              <p className="text-[10px] text-white/70">
                {new Date(story.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* ============ POSTER MENU ============ */}
            {isMine && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setEditingCaption((v) => !v)}
                  title="Edit caption"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/70"
                >
                  <Pencil size={15} />
                </button>

                <button
                  onClick={() => setShowActivity(true)}
                  title="Story activity"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/70"
                >
                  <Eye size={16} />
                </button>

                <button
                  onClick={deleteStory}
                  title="Delete story"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-red-500/70"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}

            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur hover:bg-black/70"
            >
              <X size={18} />
            </button>
          </div>

          {/* ================= MEDIA ================= */}
          <div
            className="relative flex-1 overflow-hidden"
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - rect.left;
              if (x < rect.width / 3) prev();
              else next();
            }}
          >
            {story.media_type === "video" ? (
              <video
                src={story.media_url}
                autoPlay
                playsInline
                controls={false}
                className="h-full w-full object-contain"
              />
            ) : (
              <img
                src={story.media_url}
                alt=""
                className="h-full w-full object-contain"
              />
            )}

            {/* cover-color glow */}
            <div
              className="pointer-events-none absolute inset-x-0 bottom-0 h-40"
              style={{
                background: `linear-gradient(to top, ${coverColor}40, transparent)`,
              }}
            />

            {/* ============ CAPTION (editable if mine) ============ */}
            {editingCaption && isMine ? (
              <div className="absolute bottom-28 left-4 right-4 z-30">
                <div className="flex items-center gap-2 rounded-2xl border border-white/20 bg-black/70 p-2 backdrop-blur">
                  <input
                    value={captionDraft}
                    onChange={(e) => setCaptionDraft(e.target.value)}
                    placeholder="Edit caption..."
                    maxLength={120}
                    className="flex-1 bg-transparent px-2 py-1.5 text-sm text-white outline-none placeholder:text-white/50"
                  />
                  <button
                    onClick={saveCaption}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-gray-950"
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                </div>
              </div>
            ) : (
              story.caption && (
                <div className="absolute bottom-28 left-4 right-4 z-20">
                  <p className="rounded-2xl bg-black/50 px-4 py-2 text-center text-sm font-semibold text-white backdrop-blur">
                    {story.caption}
                  </p>
                </div>
              )
            )}

            {/* ============ SONG PILL ============ */}
            {story.song && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  toggleSong();
                }}
                className="absolute bottom-20 left-4 right-4 z-20 flex items-center gap-2.5 rounded-2xl border border-white/15 bg-black/60 p-2 backdrop-blur"
              >
                {story.song.artwork ? (
                  <img
                    src={story.song.artwork}
                    alt=""
                    className="h-9 w-9 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-yellow-400/20 text-yellow-400">
                    <Music size={14} />
                  </div>
                )}
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-xs font-bold text-white">
                    {story.song.title}
                  </p>
                  <p className="truncate text-[10px] text-white/70">
                    {story.song.artist}
                  </p>
                </div>
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-gray-950">
                  {songPlaying ? (
                    <Pause size={12} fill="currentColor" />
                  ) : (
                    <Play size={12} fill="currentColor" />
                  )}
                </div>
              </button>
            )}

            {/* ============ NAV ZONES ============ */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                prev();
              }}
              className="absolute left-0 top-0 z-10 flex h-full w-1/3 items-center justify-start bg-gradient-to-r from-black/20 to-transparent opacity-0 transition hover:opacity-100"
            >
              <ChevronLeft size={26} className="ml-2 text-white/80" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                next();
              }}
              className="absolute right-0 top-0 z-10 flex h-full w-1/3 items-center justify-end bg-gradient-to-l from-black/20 to-transparent opacity-0 transition hover:opacity-100"
            >
              <ChevronRight size={26} className="mr-2 text-white/80" />
            </button>
          </div>

          {/* ================= BOTTOM BAR ================= */}
          {/* For viewers (not the poster): reply + reactions */}
          {!isMine && (
            <div className="z-30 flex items-center gap-2 border-t border-white/10 bg-black/70 p-3 backdrop-blur">
              <div className="relative flex-1">
                <input
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder={`Reply to ${getDisplayName(profile)}...`}
                  className="w-full rounded-full border border-white/15 bg-transparent px-4 py-2.5 pr-12 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/40"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowReactions((v) => !v);
                  }}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                >
                  <Heart size={15} />
                </button>
              </div>
              <button
                onClick={sendReply}
                disabled={!replyText.trim()}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 text-gray-950 disabled:opacity-40"
              >
                <Send size={16} fill="currentColor" />
              </button>
            </div>
          )}

          {/* For the poster: only a hint + activity button */}
          {isMine && (
            <div className="z-30 flex items-center justify-between gap-2 border-t border-white/10 bg-black/70 p-3 backdrop-blur">
              <p className="text-[11px] font-semibold text-white/60">
                This is your story
              </p>
              <button
                onClick={() => setShowActivity(true)}
                className="flex items-center gap-2 rounded-full bg-yellow-400 px-4 py-2 text-xs font-black text-gray-950"
              >
                <Eye size={14} />
                See activity
              </button>
            </div>
          )}

          {/* ================= REACTION PICKER ================= */}
          <AnimatePresence>
            {showReactions && !isMine && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="z-40 flex items-center gap-1 border-t border-white/10 bg-black/90 px-3 py-3 backdrop-blur"
                onClick={(e) => e.stopPropagation()}
              >
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => reactToStory(emoji)}
                    className="flex h-11 flex-1 items-center justify-center rounded-xl text-2xl transition hover:scale-125 hover:bg-white/10"
                  >
                    {emoji}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ================= ACTIVITY SHEET ================= */}
          {isMine && (
            <StoryActivity
              open={showActivity}
              story={story}
              onClose={() => setShowActivity(false)}
            />
          )}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}