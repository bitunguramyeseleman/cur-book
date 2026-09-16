import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Image as ImageIcon,
  Loader2,
  Send,
  X,
  Check,
  Music,
  ChevronRight,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import SongPicker from "../components/SongPicker";

const STEPS = ["Photo", "Caption", "Song"];

export default function Post({ onClose, onPosted }) {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [caption, setCaption] = useState("");
  const [song, setSong] = useState(null); // { id, title, artist, artwork, previewUrl }

  const [step, setStep] = useState(0); // 0=photo, 1=caption, 2=song
  const [uploading, setUploading] = useState(false);
  const [notice, setNotice] = useState(null);

  // song picker modal
  const [showSongPicker, setShowSongPicker] = useState(false);

  const inputRef = useRef(null);

  // =========================================================
  // LOAD USER
  // =========================================================
  useEffect(() => {
    (async () => {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!currentUser) {
        if (onClose) onClose();
        else navigate("/login");
        return;
      }
      setUser(currentUser);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();
      setProfile(profileData);
    })();
    // eslint-disable-next-line
  }, []);

  // auto-dismiss notice
  useEffect(() => {
    if (!notice) return;
    const t = setTimeout(() => setNotice(null), 2600);
    return () => clearTimeout(t);
  }, [notice]);

  // =========================================================
  // PICK IMAGE
  // =========================================================
  const handleFileSelect = (event) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      setNotice({ type: "error", text: "Please select an image." });
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setNotice({ type: "error", text: "Image must be smaller than 10MB." });
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    event.target.value = "";
  };

  // =========================================================
  // STEP NAVIGATION
  // =========================================================
  const goNext = () => {
    if (step === 0 && !file) {
      setNotice({ type: "error", text: "Please choose a picture first." });
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };

  const goBack = () => {
    if (step === 0) {
      handleCancel();
      return;
    }
    setStep((s) => s - 1);
  };

  // =========================================================
  // POST
  // =========================================================
  const handlePost = async () => {
    if (!file || !user) {
      setNotice({ type: "error", text: "Please select an image." });
      return;
    }

    try {
      setUploading(true);

      const ext = file.name.split(".").pop();
      const filePath = `${user.id}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(filePath, file, {
          cacheControl: "3600",
          contentType: file.type,
        });
      if (uploadError) throw uploadError;

      const {
        data: { publicUrl },
      } = supabase.storage.from("post-images").getPublicUrl(filePath);

      const { error: insertError } = await supabase.from("posts").insert({
        user_id: user.id,
        image_url: publicUrl,
        caption: caption.trim() || null,
        // JSONB column — see SQL below
        song: song || null,
      });
      if (insertError) throw insertError;

      if (preview) URL.revokeObjectURL(preview);
      setFile(null);
      setPreview("");
      setCaption("");
      setSong(null);
      setStep(0);

      setNotice({ type: "success", text: "Posted successfully! 🎉" });
      setTimeout(() => {
        if (onPosted) onPosted();
        else navigate("/home");
      }, 900);
    } catch (err) {
      console.error("Post error:", err);
      setNotice({
        type: "error",
        text: err.message || "Failed to post. Please try again.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview("");
    setCaption("");
    setSong(null);
    setStep(0);
    if (onClose) onClose();
    else navigate(-1);
  };

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="bg-gray-950 text-white">
      <div className="mx-auto w-full max-w-xl px-3 py-3 space-y-3">
        {/* HEADER */}
        <div className="flex items-center justify-between rounded-2xl border border-gray-800 bg-gray-900 px-2 py-2">
          <button
            onClick={goBack}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-800 hover:text-white active:scale-95"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">
              Step {step + 1} of {STEPS.length} · {STEPS[step]}
            </p>
            <h1 className="text-sm font-black">New Post</h1>
          </div>

          <button
            onClick={handleCancel}
            title="Close"
            className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition hover:bg-gray-800 hover:text-white active:scale-95"
          >
            <X size={20} />
          </button>
        </div>

        {/* STEP PROGRESS */}
        <div className="flex items-center gap-2 px-1">
          {STEPS.map((label, i) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div
                className={`h-1.5 flex-1 rounded-full transition ${
                  i <= step ? "bg-yellow-400" : "bg-gray-800"
                }`}
              />
            </div>
          ))}
        </div>

        {/* CARD */}
        <div className="relative overflow-hidden rounded-[28px] border border-gray-800 bg-gray-900 p-4">
          <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-yellow-400/10 blur-3xl" />

          <div className="relative">
            {/* USER INFO */}
            {profile && (
              <div className="mb-4 flex items-center gap-3">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt="You"
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-yellow-400/40"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-400 font-black text-gray-950">
                    {(profile.username || profile.full_name || "U")
                      .charAt(0)
                      .toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-white">
                    {profile.username || profile.full_name || "You"}
                  </p>
                  <p className="text-[11px] text-gray-500">Sharing publicly</p>
                </div>
              </div>
            )}

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />

            <AnimatePresence mode="wait">
              {/* ============ STEP 0: PHOTO ============ */}
              {step === 0 && (
                <motion.div
                  key="step-photo"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                >
                  {!preview ? (
                    <button
                      type="button"
                      onClick={() => inputRef.current?.click()}
                      className="flex aspect-square w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-gray-800 bg-gray-950 transition hover:border-yellow-400/40 hover:bg-gray-900/50 active:scale-[0.99]"
                    >
                      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-400 text-gray-950 shadow-lg shadow-yellow-400/20">
                        <ImageIcon size={28} />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-black text-white">
                          Tap to select a photo
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          JPG, PNG, GIF — max 10MB
                        </p>
                      </div>
                    </button>
                  ) : (
                    <div className="relative overflow-hidden rounded-3xl bg-gray-950">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-[460px] w-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => inputRef.current?.click()}
                        className="absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80 active:scale-95"
                        title="Change image"
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
                        className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-red-500/80 active:scale-95"
                        title="Remove"
                      >
                        <X size={18} />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}

              {/* ============ STEP 1: CAPTION ============ */}
              {step === 1 && (
                <motion.div
                  key="step-caption"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="space-y-4"
                >
                  {preview && (
                    <div className="relative overflow-hidden rounded-2xl bg-gray-950">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-[240px] w-full object-contain"
                      />
                    </div>
                  )}
                  <div>
                    <label className="mb-2 block text-[10px] font-black uppercase tracking-widest text-gray-500">
                      Add your words
                    </label>
                    <textarea
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      placeholder="Write a caption..."
                      rows={4}
                      maxLength={300}
                      autoFocus
                      className="w-full resize-none rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20"
                    />
                    <p className="mt-1 text-right text-[10px] text-gray-600">
                      {caption.length}/300
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ============ STEP 2: SONG ============ */}
              {step === 2 && (
                <motion.div
                  key="step-song"
                  initial={{ opacity: 0, x: 30 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -30 }}
                  className="space-y-4"
                >
                  {preview && (
                    <div className="relative overflow-hidden rounded-2xl bg-gray-950">
                      <img
                        src={preview}
                        alt="Preview"
                        className="max-h-[240px] w-full object-contain"
                      />
                    </div>
                  )}

                  <div className="rounded-2xl border border-gray-800 bg-gray-950 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400/15 text-yellow-400">
                        <Music size={16} />
                      </div>
                      <div>
                        <p className="text-sm font-black">Add a song</p>
                        <p className="text-[11px] text-gray-500">
                          Optional — shown with your post
                        </p>
                      </div>
                    </div>

                    {song ? (
                      <div className="flex items-center gap-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/5 p-3">
                        {song.artwork && (
                          <img
                            src={song.artwork}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-xl object-cover"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-black text-white">
                            {song.title}
                          </p>
                          <p className="truncate text-[11px] text-gray-400">
                            {song.artist}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowSongPicker(true)}
                          className="shrink-0 rounded-lg border border-gray-800 bg-gray-900 px-3 py-1.5 text-[10px] font-black text-gray-300 transition hover:border-yellow-400/40 hover:text-yellow-400"
                        >
                          CHANGE
                        </button>
                        <button
                          type="button"
                          onClick={() => setSong(null)}
                          title="Remove song"
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-gray-500 transition hover:text-red-400"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setShowSongPicker(true)}
                        className="flex w-full items-center gap-3 rounded-2xl border border-dashed border-gray-800 bg-gray-900/60 px-4 py-3 text-left transition hover:border-yellow-400/40 hover:bg-gray-900"
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
                        <ChevronRight
                          size={18}
                          className="shrink-0 text-gray-600"
                        />
                      </button>
                    )}
                  </div>

                  {caption && (
                    <div className="rounded-2xl border border-gray-800 bg-gray-950 p-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                        Caption
                      </p>
                      <p className="text-sm text-gray-300 whitespace-pre-wrap break-words">
                        {caption}
                      </p>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* ACTION BUTTON */}
        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={goNext}
            disabled={step === 0 && !file}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-4 text-sm font-black text-gray-950 shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Next
            <ChevronRight size={18} />
          </button>
        ) : (
          <button
            type="button"
            onClick={handlePost}
            disabled={!file || uploading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-4 text-sm font-black text-gray-950 shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {uploading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Posting...
              </>
            ) : (
              <>
                <Send size={18} fill="currentColor" />
                Share Post
              </>
            )}
          </button>
        )}
      </div>

      {/* SONG PICKER MODAL */}
      <SongPicker
        open={showSongPicker}
        onClose={() => setShowSongPicker(false)}
        onSelect={(picked) => setSong(picked)}
        currentSong={song}
      />

      {/* ===== CENTERED NOTIFICATION MODAL ===== */}
      <AnimatePresence>
        {notice && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[180] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6"
            onClick={() => setNotice(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.85, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 20 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              onClick={(e) => e.stopPropagation()}
              className={`
                w-full max-w-xs rounded-3xl border p-6 text-center shadow-2xl backdrop-blur-md
                ${
                  notice.type === "success"
                    ? "border-yellow-400/40 bg-gray-900/95 text-yellow-300"
                    : "border-red-500/40 bg-gray-900/95 text-red-300"
                }
              `}
            >
              <div
                className={`
                  mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl
                  ${
                    notice.type === "success"
                      ? "bg-yellow-400 text-gray-950"
                      : "bg-red-500 text-white"
                  }
                `}
              >
                {notice.type === "success" ? (
                  <Check size={26} />
                ) : (
                  <X size={26} />
                )}
              </div>
              <p className="text-sm font-black">
                {notice.type === "success" ? "Success" : "Oops!"}
              </p>
              <p className="mt-1 text-xs text-gray-300">{notice.text}</p>

              <button
                onClick={() => setNotice(null)}
                className="mt-4 w-full rounded-xl bg-gray-800 py-2.5 text-xs font-black text-white transition hover:bg-gray-700 active:scale-95"
              >
                OK
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}