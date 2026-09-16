import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, X, Play, Pause, Music, Loader2, Check, ChevronLeft,
} from "lucide-react";

// =========================================================
// SONG PICKER MODAL
//  - powered by iTunes Search API (free, no key)
//  - tap album art to preview (30s)
//  - tap "USE" to select the song
// =========================================================
export default function SongPicker({ open, onClose, onSelect, currentSong }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // playback state
  const [playingId, setPlayingId] = useState(null);
  const [progress, setProgress] = useState(0); // 0 → 1 for the playing song

  const audioRef = useRef(null);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const rafRef = useRef(null);

  // ---------------------------------------------------------
  // RESET ON OPEN / STOP AUDIO ON CLOSE
  // ---------------------------------------------------------
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setError("");
      setPlayingId(null);
      setProgress(0);
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      stopAudio();
    }
  }, [open]); // eslint-disable-line

  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setPlayingId(null);
    setProgress(0);
  };

  // ---------------------------------------------------------
  // DEBOUNCED SEARCH
  // ---------------------------------------------------------
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        setError("");
        const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
          q
        )}&media=music&entity=song&limit=25`;

        const res = await fetch(url);
        if (!res.ok) throw new Error("Search failed");
        const data = await res.json();

        setResults(
          (data.results || []).map((r) => ({
            id: r.trackId,
            title: r.trackName,
            artist: r.artistName,
            album: r.collectionName,
            artwork: r.artworkUrl100?.replace("100x100", "300x300"),
            previewUrl: r.previewUrl,
            durationMs: r.trackTimeMillis,
          }))
        );
      } catch (err) {
        console.error("song search:", err);
        setError("Couldn't load songs. Try again.");
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open]);

  // ---------------------------------------------------------
  // PLAY / PAUSE PREVIEW
  // ---------------------------------------------------------
  const togglePreview = (song) => {
    if (!song.previewUrl) return;

    // pause current
    if (playingId === song.id) {
      stopAudio();
      return;
    }

    stopAudio();

    const audio = new Audio(song.previewUrl);
    audio.volume = 0.9;
    audioRef.current = audio;
    audio.play();
    setPlayingId(song.id);
    setProgress(0);

    const startedAt = Date.now();
    const total = 30000; // iTunes previews are ~30s

    const tick = () => {
      const elapsed = Date.now() - startedAt;
      setProgress(Math.min(1, elapsed / total));
      if (elapsed >= total || audio.paused || audio.ended) {
        // loop the animation back to 0 while playing
        if (!audio.paused && !audio.ended) rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    audio.onended = () => {
      setPlayingId(null);
      setProgress(0);
      cancelAnimationFrame(rafRef.current);
    };
  };

  // ---------------------------------------------------------
  // SELECT
  // ---------------------------------------------------------
  const handleSelect = (song) => {
    stopAudio();
    onSelect(song);
    onClose();
  };

  const isCurrent = (song) =>
    currentSong?.title === song.title &&
    currentSong?.artist === song.artist;

  // ---------------------------------------------------------
  // RENDER
  // ---------------------------------------------------------
  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          {/* BACKDROP */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[240] bg-black/80 backdrop-blur-md"
          />

          {/* MODAL */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="
              fixed left-1/2 top-1/2 z-[245] w-[calc(100%-24px)] max-w-md
              -translate-x-1/2 -translate-y-1/2
              bg-gray-950 border border-yellow-400/20 rounded-3xl
              shadow-2xl shadow-black/70
              flex flex-col overflow-hidden
            "
            style={{ maxHeight: "85vh" }}
          >
            {/* HEADER */}
            <div className="flex items-center justify-between border-b border-gray-800 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-yellow-400 text-gray-950">
                  <Music size={16} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Add a song</h3>
                  <p className="text-[11px] text-gray-500">
                    Tap a cover to preview
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

            {/* SEARCH */}
            <div className="border-b border-gray-800 p-4">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search songs, artists, albums..."
                  className="w-full rounded-xl border border-gray-800 bg-gray-900 pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20"
                />
              </div>
            </div>

            {/* NOW PLAYING BANNER */}
            <AnimatePresence>
              {playingId && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="border-b border-yellow-400/20 bg-yellow-400/5"
                >
                  <div className="flex items-center gap-3 p-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-gray-950">
                      <Music size={14} />
                    </div>
                    <p className="flex-1 truncate text-xs font-bold text-yellow-400">
                      Preview playing — tap ▶ again to stop
                    </p>
                    <button
                      onClick={stopAudio}
                      className="text-[11px] font-black text-yellow-400 hover:underline"
                    >
                      STOP
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* RESULTS */}
            <div className="flex-1 overflow-y-auto p-2">
              {loading && (
                <div className="flex items-center justify-center py-12 text-gray-500">
                  <Loader2 size={20} className="animate-spin" />
                </div>
              )}

              {!loading && error && (
                <div className="text-center py-12 px-6">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {!loading && !error && query.trim() === "" && (
                <div className="text-center py-12 px-6">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900">
                    <Music size={20} className="text-gray-600" />
                  </div>
                  <p className="text-sm font-bold text-gray-400">
                    Search for a song
                  </p>
                  <p className="text-[11px] text-gray-600 mt-1">
                    Try "Blinding Lights" or "The Weeknd"
                  </p>
                </div>
              )}

              {!loading &&
                !error &&
                query.trim() !== "" &&
                results.length === 0 && (
                  <div className="text-center py-12 px-6">
                    <p className="text-sm text-gray-500">No songs found</p>
                  </div>
                )}

              {!loading && results.length > 0 && (
                <div className="space-y-1">
                  {results.map((song) => {
                    const isPlaying = playingId === song.id;
                    const selected = isCurrent(song);
                    const ringPct = isPlaying ? progress : 0;

                    return (
                      <div
                        key={song.id}
                        className={`
                          group flex items-center gap-3 rounded-2xl p-2.5 transition
                          ${
                            selected
                              ? "bg-yellow-400/10 ring-1 ring-yellow-400/40"
                              : isPlaying
                              ? "bg-gray-900 ring-1 ring-yellow-400/30"
                              : "hover:bg-gray-900"
                          }
                        `}
                      >
                        {/* ALBUM ART + BIG PLAY BUTTON */}
                        <button
                          type="button"
                          onClick={() => togglePreview(song)}
                          className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl"
                          title={isPlaying ? "Pause preview" : "Play preview"}
                        >
                          {song.artwork ? (
                            <img
                              src={song.artwork}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center bg-gray-900">
                              <Music size={20} className="text-gray-600" />
                            </div>
                          )}

                          {/* dark overlay with play/pause */}
                          <span
                            className={`
                              absolute inset-0 flex items-center justify-center
                              bg-black/45 transition-opacity
                              ${
                                isPlaying
                                  ? "opacity-100"
                                  : "opacity-0 group-hover:opacity-100"
                              }
                            `}
                          >
                            {isPlaying ? (
                              <Pause
                                size={20}
                                className="text-white"
                                fill="white"
                              />
                            ) : (
                              <Play
                                size={20}
                                className="text-white"
                                fill="white"
                              />
                            )}
                          </span>

                          {/* circular progress ring (only while playing) */}
                          {isPlaying && (
                            <svg
                              className="pointer-events-none absolute inset-0 -rotate-90"
                              viewBox="0 0 56 56"
                            >
                              <circle
                                cx="28"
                                cy="28"
                                r="26"
                                fill="none"
                                stroke="#facc15"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeDasharray={`${2 * Math.PI * 26}`}
                                strokeDashoffset={`${
                                  2 * Math.PI * 26 * (1 - ringPct)
                                }`}
                                style={{ transition: "stroke-dashoffset 80ms linear" }}
                              />
                            </svg>
                          )}
                        </button>

                        {/* SONG INFO — tap to select */}
                        <button
                          type="button"
                          onClick={() => handleSelect(song)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-bold text-white">
                            {song.title}
                          </p>
                          <p className="truncate text-[11px] text-gray-500">
                            {song.artist}
                          </p>
                        </button>

                        {/* SELECT / SELECTED */}
                        {selected ? (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-400 text-gray-950">
                            <Check size={16} strokeWidth={3} />
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSelect(song)}
                            className="shrink-0 rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-[10px] font-black text-gray-300 transition hover:border-yellow-400/40 hover:text-yellow-400"
                          >
                            USE
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FOOTER */}
            <div className="border-t border-gray-800 p-3">
              <button
                type="button"
                onClick={() => {
                  stopAudio();
                  onSelect(null);
                  onClose();
                }}
                className="w-full rounded-xl bg-gray-900 border border-gray-800 py-2.5 text-xs font-black text-gray-400 transition hover:text-white"
              >
                Remove song
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}