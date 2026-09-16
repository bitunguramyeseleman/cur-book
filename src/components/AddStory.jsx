import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, Image as ImageIcon, Loader2, Send, Check, Camera,
  Music, ChevronRight, Play, Pause,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import SongPicker from "./SongPicker";

// Yellow-family cover colors
const COVER_COLORS = [
  "#facc15", // yellow-400
  "#fde047", // yellow-300
  "#fbbf24", // amber-400
  "#f59e0b", // amber-500
  "#eab308", // yellow-500
  "#fcd34d", // amber-300
  "#fef08a", // yellow-200
  "#ffd60a", // vivid yellow
];

export default function AddStory({ open, currentUser, onClose, onPosted }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [mediaType, setMediaType] = useState("image");
  const [caption, setCaption] = useState("");
  const [song, setSong] = useState(null);          // { title, artist, artwork, previewUrl }
  const [coverColor, setCoverColor] = useState(COVER_COLORS[0]);
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showSongPicker, setShowSongPicker] = useState(false);

  // small preview audio for the chosen song
  const audioRef = useRef(null);
  const [songPlaying, setSongPlaying] = useState(false);

  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) {
      if (preview) URL.revokeObjectURL(preview);
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setFile(null);
      setPreview("");
      setCaption("");
      setMediaType("image");
      setSong(null);
      setSongPlaying(false);
      setCoverColor(COVER_COLORS[0]);
      setNotice(null);
    }
  }, [open]); // eslint-disable-line

  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2400);
    return () => clearTimeout(t);
  }, [notice]);

  const handleFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;

    const isImage = f.type.startsWith("image/");
    const isVideo = f.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setNotice({ type: "error", text: "Please select an image or video." });
      return;
    }
    if (f.size > 25 * 1024 * 1024) {
      setNotice({ type: "error", text: "File must be smaller than 25MB." });
      return;
    }

    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setMediaType(isVideo ? "video" : "image");
    setPreview(URL.createObjectURL(f));
    e.target.value = "";
  };

  const toggleSongPreview = () => {
    if (!song?.previewUrl) return;
    if (songPlaying) {
      audioRef.current?.pause();
      setSongPlaying(false);
      return;
    }
    if (audioRef.current) audioRef.current.pause();
    const a = new Audio(song.previewUrl);
    audioRef.current = a;
    a.play().then(() => setSongPlaying(true)).catch(() => {});
    a.onended = () => setSongPlaying(false);
  };

  const handlePost = async () => {
    if (!file || !currentUser) {
      setNotice({ type: "error", text: "Please choose media first." });
      return;
    }
    try {
      setUploading(true);

      const ext = (file.name.split(".").pop() || "bin").toLowerCase();
      const filePath = `${currentUser.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("story-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType: file.type,
        });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("story-media").getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("stories").insert({
        user_id: currentUser.id,
        media_url: publicUrl,
        media_type: mediaType,
        caption: caption.trim() || null,
        song: song || null,
        cover_color: coverColor,
      });
      if (insertError) throw insertError;

      setNotice({ type: "success", text: "Story posted! 🎉" });
      setTimeout(() => {
        onPosted?.();
        onClose?.();
      }, 700);
    } catch (err) {
      console.error("Story post error:", err);
      setNotice({
        type: "error",
        text: err.message || "Failed to post story.",
      });
    } finally {
      setUploading(false);
    }
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md"
      />

      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="fixed inset-0 z-[205] flex items-center justify-center p-3 sm:p-6 pointer-events-none"
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="pointer-events-auto flex w-full max-w-md max-h-[94vh] flex-col overflow-hidden rounded-3xl border border-yellow-400/20 bg-gray-950 shadow-2xl"
        >
          {/* header */}
          <div className="flex items-center justify-between border-b border-gray-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-gray-950">
                <Camera size={16} />
              </div>
              <div>
                <p className="text-sm font-black text-white">New story</p>
                <p className="text-[11px] text-gray-500">Visible for 24h</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-gray-400 transition hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          {/* body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <input
              ref={inputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFile}
              className="hidden"
            />

            {!preview ? (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                style={{ backgroundColor: `${coverColor}15` }}
                className="flex aspect-[9/14] w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-yellow-400/40 transition hover:border-yellow-400 active:scale-[0.99]"
              >
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-2xl text-gray-950 shadow-lg"
                  style={{ backgroundColor: coverColor }}
                >
                  <ImageIcon size={28} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-white">
                    Tap to add your story
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Image or video — max 25MB
                  </p>
                </div>
              </button>
            ) : (
              <div className="relative overflow-hidden rounded-3xl bg-black">
                {mediaType === "video" ? (
                  <video
                    src={preview}
                    controls
                    autoPlay
                    muted
                    playsInline
                    className="max-h-[55vh] w-full object-contain"
                  />
                ) : (
                  <img
                    src={preview}
                    alt="Story preview"
                    className="max-h-[55vh] w-full object-contain"
                  />
                )}

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
                  title="Change"
                >
                  <Camera size={18} />
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (preview) URL.revokeObjectURL(preview);
                    setPreview("");
                    setFile(null);
                  }}
                  className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-red-500/80"
                  title="Remove"
                >
                  <X size={18} />
                </button>
              </div>
            )}

            {/* COVER COLOR */}
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-500">
                Cover color
              </label>
              <div className="flex flex-wrap gap-2">
                {COVER_COLORS.map((c) => {
                  const active = c === coverColor;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setCoverColor(c)}
                      style={{ backgroundColor: c }}
                      className={`relative h-9 w-9 rounded-full transition ${
                        active
                          ? "ring-2 ring-white ring-offset-2 ring-offset-gray-950 scale-110"
                          : "hover:scale-105"
                      }`}
                      title={c}
                    >
                      {active && (
                        <Check
                          size={14}
                          strokeWidth={4}
                          className="absolute inset-0 m-auto text-gray-950"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SONG */}
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-500">
                Song (optional)
              </label>

              {song ? (
                <div className="flex items-center gap-2.5 rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-2.5">
                  <button
                    type="button"
                    onClick={toggleSongPreview}
                    className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl"
                  >
                    {song.artwork ? (
                      <img
                        src={song.artwork}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-yellow-400/20 text-yellow-400">
                        <Music size={16} />
                      </div>
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50">
                      {songPlaying ? (
                        <Pause size={14} fill="white" className="text-white" />
                      ) : (
                        <Play size={14} fill="white" className="text-white" />
                      )}
                    </span>
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-white">
                      {song.title}
                    </p>
                    <p className="truncate text-[10px] text-gray-500">
                      {song.artist}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSongPicker(true)}
                    className="shrink-0 rounded-lg border border-gray-800 bg-gray-900 px-2.5 py-1.5 text-[10px] font-black text-gray-300 transition hover:border-yellow-400/40 hover:text-yellow-400"
                  >
                    CHANGE
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current = null;
                      }
                      setSong(null);
                      setSongPlaying(false);
                    }}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-gray-500 transition hover:text-red-400"
                  >
                    <X size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowSongPicker(true)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-yellow-400/30 bg-gray-900/60 px-4 py-3 text-left transition hover:border-yellow-400/60 hover:bg-gray-900"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-400">
                    <Music size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-black text-white">
                      Choose a song
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      Search millions of tracks — with preview
                    </p>
                  </div>
                  <ChevronRight size={18} className="shrink-0 text-gray-600" />
                </button>
              )}
            </div>

            {/* CAPTION */}
            <div>
              <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-500">
                Caption (optional)
              </label>
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                maxLength={120}
                placeholder="Add a caption..."
                className="w-full rounded-2xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20"
              />
              <p className="mt-1 text-right text-[10px] text-gray-600">
                {caption.length}/120
              </p>
            </div>
          </div>

          {/* footer */}
          <div className="border-t border-gray-800 p-3">
            <button
              type="button"
              onClick={handlePost}
              disabled={!file || uploading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-4 text-sm font-black text-gray-950 shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 active:scale-[0.98] disabled:opacity-40"
            >
              {uploading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <Send size={18} fill="currentColor" />
                  Share story
                </>
              )}
            </button>
          </div>
        </div>

        {/* Song picker (reused) */}
        <SongPicker
          open={showSongPicker}
          onClose={() => setShowSongPicker(false)}
          onSelect={(picked) => setSong(picked)}
          currentSong={song}
        />

        {/* notice */}
        <AnimatePresence>
          {notice && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className={`pointer-events-auto fixed bottom-6 left-1/2 z-[220] -translate-x-1/2 rounded-2xl border px-4 py-3 text-xs font-bold backdrop-blur-md ${
                notice.type === "success"
                  ? "border-yellow-400/40 bg-yellow-400/10 text-yellow-400"
                  : "border-red-500/40 bg-red-500/10 text-red-300"
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {notice.type === "success" ? (
                  <Check size={14} />
                ) : (
                  <X size={14} />
                )}
                {notice.text}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}