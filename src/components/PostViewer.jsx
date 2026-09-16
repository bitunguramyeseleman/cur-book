import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Heart, MessageCircle, Trash2, Loader2, Music,
  ChevronDown, Play, Pause, Share2, Send,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Avatar, { getDisplayName } from "./Avatar";

// =========================================================
// POST VIEWER
//  - mobile: fullscreen post + bottom sheets (comments / likers)
//  - desktop: side-by-side modal
//  - song auto-plays when the post opens
// =========================================================
export default function PostViewer({ post, currentUser, onClose, onCountsChange }) {
  const [likes, setLikes] = useState([]);
  const [comments, setComments] = useState([]);
  const [commentLikes, setCommentLikes] = useState({});
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  // sheets
  const [sheetOpen, setSheetOpen] = useState(false);       // comments
  const [likersOpen, setLikersOpen] = useState(false);     // who liked
  const [toast, setToast] = useState(null);

  // song playback
  const audioRef = useRef(null);
  const [songPlaying, setSongPlaying] = useState(false);

  const bottomRef = useRef(null);

  // ---------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!post?.id) return;
      setLoading(true);

      const [likesRes, commentsRes] = await Promise.all([
        supabase.from("post_likes").select("id, user_id").eq("post_id", post.id),
        supabase
          .from("post_comments")
          .select("id, user_id, content, created_at")
          .eq("post_id", post.id)
          .order("created_at", { ascending: true }),
      ]);

      if (cancelled) return;

      setLikes(likesRes.data || []);
      const cmts = commentsRes.data || [];
      setComments(cmts);

      if (cmts.length) {
        const ids = cmts.map((c) => c.id);
        const { data: cl } = await supabase
          .from("comment_likes")
          .select("id, comment_id, user_id")
          .in("comment_id", ids);

        const map = {};
        (cl || []).forEach((r) => {
          if (!map[r.comment_id]) map[r.comment_id] = [];
          map[r.comment_id].push({ id: r.id, user_id: r.user_id });
        });
        if (!cancelled) setCommentLikes(map);
      } else {
        setCommentLikes({});
      }

      // hydrate profiles — including likers so the Likers sheet has names/avatars
      const userIds = new Set([
        ...cmts.map((c) => c.user_id),
        ...(likesRes.data || []).map((l) => l.user_id),
        post.user_id,
      ]);
      if (userIds.size) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", [...userIds]);
        if (!cancelled) {
          const map = {};
          (profs || []).forEach((p) => (map[p.id] = p));
          setProfiles(map);
        }
      }

      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [post?.id]);

  // ---------------------------------------------------------
  // AUTO-PLAY SONG
  // ---------------------------------------------------------
  useEffect(() => {
    const url = post?.song?.previewUrl;
    if (!url) return;

    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    const audio = new Audio(url);
    audio.volume = 0.8;
    audioRef.current = audio;

    audio
      .play()
      .then(() => setSongPlaying(true))
      .catch(() => setSongPlaying(false));

    audio.onended = () => setSongPlaying(false);

    return () => {
      audio.pause();
      audioRef.current = null;
      setSongPlaying(false);
    };
  }, [post?.song?.previewUrl, post?.id]);

  const toggleSong = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (songPlaying) {
      audio.pause();
      setSongPlaying(false);
    } else {
      audio.play().then(() => setSongPlaying(true)).catch(() => {});
    }
  };

  // ---------------------------------------------------------
  // REALTIME
  // ---------------------------------------------------------
  useEffect(() => {
    if (!post?.id) return;

    const channel = supabase
      .channel(`post-viewer-${post.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "post_likes", filter: `post_id=eq.${post.id}` },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setLikes((prev) =>
              prev.some((l) => l.id === payload.new.id) ? prev : [...prev, payload.new]
            );
          } else if (payload.eventType === "DELETE") {
            setLikes((prev) => prev.filter((l) => l.id !== payload.old.id));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_comments", filter: `post_id=eq.${post.id}` },
        async (payload) => {
          const c = payload.new;
          setComments((prev) =>
            prev.some((x) => x.id === c.id) ? prev : [...prev, c]
          );
          if (!profiles[c.user_id]) {
            const { data } = await supabase
              .from("profiles")
              .select("id, username, full_name, avatar_url")
              .eq("id", c.user_id)
              .maybeSingle();
            if (data) setProfiles((prev) => ({ ...prev, [data.id]: data }));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "post_comments", filter: `post_id=eq.${post.id}` },
        (payload) => setComments((prev) => prev.filter((c) => c.id !== payload.old.id))
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comment_likes" },
        (payload) => {
          const row = payload.new || payload.old;
          if (!row) return;
          setCommentLikes((prev) => {
            const list = prev[row.comment_id] || [];
            if (payload.eventType === "INSERT") {
              if (list.some((l) => l.id === row.id)) return prev;
              return { ...prev, [row.comment_id]: [...list, { id: row.id, user_id: row.user_id }] };
            }
            if (payload.eventType === "DELETE") {
              return { ...prev, [row.comment_id]: list.filter((l) => l.id !== row.id) };
            }
            return prev;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line
  }, [post?.id]);

  useEffect(() => {
    if (onCountsChange && post?.id) {
      onCountsChange(post.id, { likes: likes.length, comments: comments.length });
    }
    // eslint-disable-next-line
  }, [likes.length, comments.length]);

  // ---------------------------------------------------------
  // DERIVED
  // ---------------------------------------------------------
  const hasLiked = useMemo(
    () => likes.some((l) => l.user_id === currentUser?.id),
    [likes, currentUser?.id]
  );

  const myCommentLike = (commentId) =>
    (commentLikes[commentId] || []).some((l) => l.user_id === currentUser?.id);

  const author = profiles[post?.user_id] || {};

  // ---------------------------------------------------------
  // LIKE POST
  // ---------------------------------------------------------
  const toggleLike = async () => {
    if (!currentUser) return;
    const existing = likes.find((l) => l.user_id === currentUser.id);

    if (existing) {
      setLikes((prev) => prev.filter((l) => l.id !== existing.id));
      const { error } = await supabase.from("post_likes").delete().eq("id", existing.id);
      if (error) setLikes((prev) => [...prev, existing]);
    } else {
      const tempId = `temp-${Date.now()}`;
      setLikes((prev) => [...prev, { id: tempId, user_id: currentUser.id }]);

      const { data, error } = await supabase
        .from("post_likes")
        .insert({ post_id: post.id, user_id: currentUser.id })
        .select()
        .single();

      if (error) {
        setLikes((prev) => prev.filter((l) => l.id !== tempId));
      } else {
        setLikes((prev) => prev.map((l) => (l.id === tempId ? data : l)));
      }
    }
  };

  // ---------------------------------------------------------
  // LIKE COMMENT
  // ---------------------------------------------------------
  const toggleCommentLike = async (commentId) => {
    if (!currentUser) return;
    const list = commentLikes[commentId] || [];
    const existing = list.find((l) => l.user_id === currentUser.id);

    if (existing) {
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: (prev[commentId] || []).filter((l) => l.id !== existing.id),
      }));
      const { error } = await supabase.from("comment_likes").delete().eq("id", existing.id);
      if (error) {
        setCommentLikes((prev) => ({
          ...prev,
          [commentId]: [...(prev[commentId] || []), existing],
        }));
      }
    } else {
      const tempId = `temp-${Date.now()}`;
      setCommentLikes((prev) => ({
        ...prev,
        [commentId]: [...(prev[commentId] || []), { id: tempId, user_id: currentUser.id }],
      }));

      const { data, error } = await supabase
        .from("comment_likes")
        .insert({ comment_id: commentId, user_id: currentUser.id })
        .select()
        .single();

      if (error) {
        setCommentLikes((prev) => ({
          ...prev,
          [commentId]: (prev[commentId] || []).filter((l) => l.id !== tempId),
        }));
      } else {
        setCommentLikes((prev) => ({
          ...prev,
          [commentId]: (prev[commentId] || []).map((l) =>
            l.id === tempId ? data : l
          ),
        }));
      }
    }
  };

  // ---------------------------------------------------------
  // SEND / DELETE COMMENT
  // ---------------------------------------------------------
  const sendComment = async (e) => {
    e?.preventDefault();
    const content = text.trim();
    if (!content || !currentUser || sending) return;

    setSending(true);
    const tempId = `temp-${Date.now()}`;
    const optimistic = {
      id: tempId,
      user_id: currentUser.id,
      content,
      created_at: new Date().toISOString(),
      _optimistic: true,
    };
    setComments((prev) => [...prev, optimistic]);
    setText("");

    requestAnimationFrame(() =>
      bottomRef.current?.scrollIntoView({ behavior: "smooth" })
    );

    try {
      const { data, error } = await supabase
        .from("post_comments")
        .insert({ post_id: post.id, user_id: currentUser.id, content })
        .select()
        .single();
      if (error) throw error;

      setComments((prev) => prev.map((c) => (c.id === tempId ? data : c)));

      if (!profiles[currentUser.id]) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .eq("id", currentUser.id)
          .maybeSingle();
        if (p) setProfiles((prev) => ({ ...prev, [p.id]: p }));
      }
    } catch (err) {
      console.error(err);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setText(content);
    } finally {
      setSending(false);
    }
  };

  const deleteComment = async (comment) => {
    if (comment.user_id !== currentUser?.id) return;
    const backup = comments;
    setComments((prev) => prev.filter((c) => c.id !== comment.id));
    const { error } = await supabase.from("post_comments").delete().eq("id", comment.id);
    if (error) setComments(backup);
  };

  // ---------------------------------------------------------
  // SHARE
  // ---------------------------------------------------------
  const sharePost = async () => {
    const url = `${window.location.origin}/post/${post.id}`;
    const text = post.caption
      ? `"${post.caption}" — ${getDisplayName(author)}`
      : `Check this out on CUR.BOOK`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: getDisplayName(author),
          text,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setToast({ type: "success", text: "Link copied" });
        setTimeout(() => setToast(null), 2000);
      }
    } catch {
      /* user cancelled */
    }
  };

  if (!post) return null;

  // ---------------------------------------------------------
  // SHARED BITS
  // ---------------------------------------------------------
  const Header = () => (
    <div className="flex items-center gap-3 p-4">
      <Avatar person={author} size="md" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-black text-white">
          {getDisplayName(author)}
        </p>
      </div>
    </div>
  );

  // Actions: like (opens likers), comment (opens comments sheet), share
  const ActionRow = () => (
    <div className="flex items-center gap-1 px-3 pt-3">
      {/* Like — tap count (or icon) opens likers sheet */}
      <button
        onClick={() => setLikersOpen(true)}
        className={`flex items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-black transition active:scale-95 ${
          hasLiked ? "text-red-400" : "text-white"
        }`}
      >
        <Heart size={22} fill={hasLiked ? "currentColor" : "none"} />
        {likes.length}
      </button>

      {/* Comment */}
      <button
        onClick={() => setSheetOpen(true)}
        className="flex items-center gap-1.5 rounded-xl px-2 py-2 text-sm font-black text-white transition active:scale-95"
      >
        <MessageCircle size={22} />
        {comments.length}
      </button>

      {/* Share — right of comment */}
      <button
        onClick={sharePost}
        className="flex items-center gap-1.5 rounded-xl px-2 py-2 text-white transition active:scale-95"
        title="Share"
      >
        <Share2 size={21} />
      </button>
    </div>
  );

  const SongCard = ({ compact = false }) =>
    post.song ? (
      <button
        type="button"
        onClick={toggleSong}
        className={`flex items-center gap-2.5 rounded-2xl border border-gray-800 bg-gray-900/60 p-2.5 text-left transition hover:border-yellow-400/40 ${
          compact ? "" : "mx-4 mt-3"
        }`}
      >
        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
          {post.song.artwork ? (
            <img
              src={post.song.artwork}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-yellow-400/15 text-yellow-400">
              <Music size={14} />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-bold text-white">
            {post.song.title}
          </p>
          <p className="truncate text-[10px] text-gray-500">
            {post.song.artist}
          </p>
        </div>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-gray-950">
          {songPlaying ? (
            <Pause size={14} fill="currentColor" />
          ) : (
            <Play size={14} fill="currentColor" />
          )}
        </div>
      </button>
    ) : null;

  const CommentsList = () => (
    <>
      {loading ? (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      ) : comments.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900">
            <MessageCircle size={22} className="text-gray-600" />
          </div>
          <p className="text-sm font-black text-white">No comments yet</p>
          <p className="mt-1 text-xs text-gray-500">Start the conversation.</p>
        </div>
      ) : (
        comments.map((c) => {
          const cAuthor = profiles[c.user_id];
          const cLikes = commentLikes[c.id] || [];
          const liked = myCommentLike(c.id);
          const mine = c.user_id === currentUser?.id;

          return (
            <div key={c.id} className="group flex gap-3">
              <Avatar person={cAuthor || {}} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="rounded-2xl border border-gray-800 bg-gray-900/70 px-3.5 py-2.5">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-xs font-black text-white">
                      {getDisplayName(cAuthor || {})}
                    </p>
                    {mine && (
                      <span className="rounded-full border border-yellow-400/20 bg-yellow-400/10 px-1.5 py-0.5 text-[9px] font-black text-yellow-400">
                        YOU
                      </span>
                    )}
                  </div>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-200">
                    {c.content}
                  </p>
                </div>

                <div className="mt-1 flex items-center gap-3 pl-1 text-[11px] text-gray-500">
                  <span>
                    {c.created_at &&
                      new Date(c.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                  </span>

                  <button
                    onClick={() => toggleCommentLike(c.id)}
                    className={`flex items-center gap-1 font-bold transition ${
                      liked ? "text-red-400" : "hover:text-red-400"
                    }`}
                  >
                    <Heart size={12} fill={liked ? "currentColor" : "none"} />
                    {cLikes.length > 0 ? cLikes.length : "Like"}
                  </button>

                  {mine && (
                    <button
                      onClick={() => deleteComment(c)}
                      className="ml-auto opacity-0 transition group-hover:opacity-100 hover:text-red-400"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })
      )}
      <div ref={bottomRef} />
    </>
  );

  const LikersList = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <Loader2 className="animate-spin" size={20} />
        </div>
      );
    }
    if (likes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-gray-900">
            <Heart size={22} className="text-gray-600" />
          </div>
          <p className="text-sm font-black text-white">No likes yet</p>
          <p className="mt-1 text-xs text-gray-500">Be the first to like this.</p>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        {likes.map((l) => {
          const p = profiles[l.user_id];
          const isMe = l.user_id === currentUser?.id;
          return (
            <div
              key={l.id}
              className="flex items-center gap-3 rounded-2xl p-2.5 hover:bg-gray-900"
            >
              <Avatar person={p || {}} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-white">
                  {getDisplayName(p || {})}
                  {isMe && (
                    <span className="ml-2 text-[10px] font-black text-yellow-400">
                      YOU
                    </span>
                  )}
                </p>
                <p className="truncate text-[11px] text-gray-500">
                  @{p?.username || "user"}
                </p>
              </div>
              <Heart size={16} className="text-red-400" fill="currentColor" />
            </div>
          );
        })}
      </div>
    );
  };

  const Composer = () => (
    <form onSubmit={sendComment} className="border-t border-gray-800 p-3">
      <div className="flex items-center gap-2 rounded-2xl border border-gray-800 bg-gray-900 p-1.5 transition focus-within:border-yellow-400/60">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          className="flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600"
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-gray-950 transition hover:bg-yellow-300 disabled:opacity-40"
        >
          {sending ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} fill="currentColor" />
          )}
        </button>
      </div>
    </form>
  );

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return createPortal(
    <AnimatePresence>
      {/* BACKDROP */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[150] bg-black/75 backdrop-blur-md"
      />

      {/* =========================================================
          MOBILE
          ========================================================= */}
      <div className="md:hidden fixed inset-0 z-[155] pointer-events-none">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="pointer-events-auto flex h-full flex-col bg-gray-950"
          onClick={(e) => e.stopPropagation()}
        >
          {/* TOP BAR */}
          <div className="flex items-center justify-between border-b border-gray-800 px-3 py-3">
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
            >
              <X size={20} />
            </button>
            <p className="text-sm font-black">Post</p>
            <div className="w-9" />
          </div>

          {/* SCROLL */}
          <div className="flex-1 overflow-y-auto">
            <Header />

            {/* IMAGE */}
            <div className="relative bg-black">
              {post.video_url ? (
                <video
                  src={post.video_url}
                  controls
                  autoPlay
                  playsInline
                  className="max-h-[70vh] w-full object-contain"
                />
              ) : (
                <img
                  src={post.image_url}
                  alt={post.caption || "Post"}
                  className="max-h-[70vh] w-full object-contain"
                />
              )}
            </div>

            {/* ACTIONS */}
            <ActionRow />

            {/* SONG */}
            {post.song && <SongCard />}

            {/* CAPTION */}
            {post.caption && (
              <div className="px-4 pt-3">
                <p className="text-sm leading-6 text-gray-100 whitespace-pre-wrap break-words">
                  <span className="mr-2 font-black">
                    {author.username || "user"}
                  </span>
                  {post.caption}
                </p>
              </div>
            )}

            {/* VIEW COMMENTS */}
            <button
              onClick={() => setSheetOpen(true)}
              className="mt-3 block w-full px-4 pb-6 text-left text-xs font-semibold text-gray-500"
            >
              View all {comments.length} comments
            </button>
          </div>

          {/* ============ COMMENTS SHEET ============ */}
          <AnimatePresence>
            {sheetOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setSheetOpen(false)}
                  className="absolute inset-0 z-[20] bg-black/40"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 320, damping: 34 }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 120) setSheetOpen(false);
                  }}
                  className="absolute inset-x-0 bottom-0 z-[25] flex h-[75vh] flex-col rounded-t-3xl border-t border-gray-800 bg-gray-950 shadow-2xl"
                >
                  <div className="flex justify-center pt-3">
                    <div className="h-1 w-10 rounded-full bg-gray-700" />
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
                    <p className="text-sm font-black">Comments</p>
                    <button
                      onClick={() => setSheetOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:text-white"
                    >
                      <ChevronDown size={20} />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
                    <CommentsList />
                  </div>
                  <Composer />
                </motion.div>
              </>
            )}
          </AnimatePresence>

          {/* ============ LIKERS SHEET ============ */}
          <AnimatePresence>
            {likersOpen && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setLikersOpen(false)}
                  className="absolute inset-0 z-[20] bg-black/40"
                />
                <motion.div
                  initial={{ y: "100%" }}
                  animate={{ y: 0 }}
                  exit={{ y: "100%" }}
                  transition={{ type: "spring", stiffness: 320, damping: 34 }}
                  drag="y"
                  dragConstraints={{ top: 0, bottom: 0 }}
                  dragElastic={0.2}
                  onDragEnd={(_, info) => {
                    if (info.offset.y > 120) setLikersOpen(false);
                  }}
                  className="absolute inset-x-0 bottom-0 z-[25] flex h-[60vh] flex-col rounded-t-3xl border-t border-gray-800 bg-gray-950 shadow-2xl"
                >
                  <div className="flex justify-center pt-3">
                    <div className="h-1 w-10 rounded-full bg-gray-700" />
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
                    <p className="text-sm font-black">
                      Liked by {likes.length}
                    </p>
                    <button
                      onClick={() => setLikersOpen(false)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-400 hover:text-white"
                    >
                      <ChevronDown size={20} />
                    </button>
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
                    <LikersList />
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* =========================================================
          DESKTOP
          ========================================================= */}
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="hidden md:flex fixed inset-0 z-[155] items-center justify-center p-4 pointer-events-none"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative grid w-full max-w-5xl max-h-[94vh] grid-cols-[1.4fr_1fr] overflow-hidden rounded-3xl border border-gray-800 bg-gray-950 shadow-2xl pointer-events-auto"
        >
          <button
            onClick={onClose}
            className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
          >
            <X size={18} />
          </button>

          {/* LEFT: image */}
          <div className="relative flex items-center justify-center bg-black">
            {post.video_url ? (
              <video
                src={post.video_url}
                controls
                autoPlay
                className="max-h-[94vh] w-full object-contain"
              />
            ) : (
              <img
                src={post.image_url}
                alt={post.caption || "Post"}
                className="max-h-[94vh] w-full object-contain"
              />
            )}
          </div>

          {/* RIGHT: comments */}
          <div className="flex min-h-0 flex-col bg-gray-950">
            <Header />

            {post.song && (
              <div className="px-4 pb-3">
                <SongCard compact />
              </div>
            )}

            {post.caption && (
              <div className="border-t border-gray-800 px-4 py-3">
                <p className="whitespace-pre-wrap break-words text-sm text-gray-100">
                  <span className="mr-2 font-black">
                    {author.username || "user"}
                  </span>
                  {post.caption}
                </p>
              </div>
            )}

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto border-t border-gray-800 px-4 py-4">
              <CommentsList />
            </div>

            <div className="border-t border-gray-800">
              <ActionRow />
            </div>

            <Composer />
          </div>
        </div>
      </motion.div>

      {/* TOAST */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="pointer-events-none fixed bottom-6 left-1/2 z-[200] -translate-x-1/2"
          >
            <div className="rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-2 text-xs font-bold text-yellow-400 backdrop-blur-md">
              {toast.text}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>,
    document.body
  );
}