import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  ChevronRight,
  FileAudio,
  Play,
  Search,
  Video,
  X,
  Sparkles,
  TrendingUp,
  Clock,
  Eye,
  Bookmark,
  Share2,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function News() {
  const navigate = useNavigate();

  const [news, setNews] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // grid | list

  useEffect(() => {
    checkUserAndLoadNews();
  }, []);

  const checkUserAndLoadNews = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) {
        throw userError;
      }

      if (!user) {
        navigate("/login");
        return;
      }

      const { data, error: newsError } = await supabase
        .from("news")
        .select(
          "id, title, description, image_url, video_url, audio_url, created_by, created_at, category"
        )
        .order("created_at", { ascending: false });

      if (newsError) {
        throw newsError;
      }

      setNews(data || []);
    } catch (err) {
      console.error("News loading error:", err);
      setError("Unable to load news. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(news.map(item => item.category).filter(Boolean));
    return ["all", ...Array.from(cats)];
  }, [news]);

  const filteredNews = useMemo(() => {
    let result = news;

    // Search filter
    const keyword = search.trim().toLowerCase();
    if (keyword) {
      result = result.filter((item) => {
        const title = item.title?.toLowerCase() || "";
        const description = item.description?.toLowerCase() || "";
        return title.includes(keyword) || description.includes(keyword);
      });
    }

    // Category filter
    if (selectedCategory !== "all") {
      result = result.filter(item => item.category === selectedCategory);
    }

    return result;
  }, [news, search, selectedCategory]);

  const formatDate = (date) => {
    if (!date) return "Unknown date";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTimeAgo = (date) => {
    if (!date) return "";
    const diff = Math.floor((new Date() - new Date(date)) / 1000 / 60);
    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return `${Math.floor(diff / 1440)}d ago`;
  };

  const truncateText = (text, length = 130) => {
    if (!text) return "";
    if (text.length <= length) return text;
    return `${text.substring(0, length)}...`;
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 25 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] },
    },
  };

  const stagger = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: 0.06,
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#111827]">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ================= HEADER ================= */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#facc15]/20 px-4 py-1.5 text-sm font-black text-[#111827] border border-[#facc15]/30">
                <Sparkles size={14} className="text-[#facc15]" />
                Latest Updates
              </div>
              <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-[#111827] to-[#4b5563] bg-clip-text text-transparent">
                News
              </h1>
              <p className="mt-2 max-w-2xl text-gray-500 text-lg">
                Discover the latest stories, updates and important
                information from CUR.BOOK.
              </p>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-2 bg-white/80 backdrop-blur-sm rounded-2xl p-1 border border-gray-200/60 shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  viewMode === "grid"
                    ? "bg-[#facc15] text-[#111827] shadow-md"
                    : "text-gray-500 hover:text-[#111827]"
                }`}
              >
                Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  viewMode === "list"
                    ? "bg-[#facc15] text-[#111827] shadow-md"
                    : "text-gray-500 hover:text-[#111827]"
                }`}
              >
                List
              </button>
            </div>
          </div>
        </motion.div>

        {/* ================= SEARCH & FILTERS ================= */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8 space-y-4"
        >
          {/* Search */}
          <div className="relative max-w-2xl">
            <Search
              size={20}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search news articles..."
              className="w-full rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm py-4 pl-12 pr-12 text-sm font-medium text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#facc15] focus:ring-4 focus:ring-[#facc15]/20 shadow-sm"
            />
            <AnimatePresence>
              {search && (
                <motion.button
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-[#111827]"
                >
                  <X size={18} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* Categories */}
          {categories.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-full text-sm font-bold transition-all ${
                    selectedCategory === cat
                      ? "bg-[#facc15] text-[#111827] shadow-md shadow-[#facc15]/30"
                      : "bg-white/60 backdrop-blur-sm text-gray-600 hover:bg-[#facc15]/20 hover:text-[#111827] border border-gray-200/60"
                  }`}
                >
                  {cat === "all" ? "All" : cat}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        {/* ================= ERROR ================= */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-8 rounded-2xl border border-red-200/60 bg-red-50/80 backdrop-blur-sm p-6 text-center"
            >
              <p className="font-semibold text-red-700">{error}</p>
              <button
                onClick={checkUserAndLoadNews}
                className="mt-4 rounded-xl bg-[#facc15] px-6 py-2.5 text-sm font-bold text-[#111827] transition hover:bg-[#fbbf24] shadow-md shadow-[#facc15]/30"
              >
                Try Again
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= LOADING ================= */}
        {loading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`grid gap-6 ${
              viewMode === "grid" 
                ? "sm:grid-cols-2 lg:grid-cols-3" 
                : "grid-cols-1"
            }`}
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60"
              >
                <div className="h-52 animate-pulse bg-gradient-to-r from-gray-200 to-gray-100" />
                <div className="space-y-4 p-5">
                  <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
                  <div className="h-6 w-4/5 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                </div>
              </div>
            ))}
          </motion.div>
        ) : filteredNews.length === 0 ? (
          /* ================= EMPTY ================= */
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-3xl bg-white/80 backdrop-blur-sm border border-gray-200/60 px-6 py-16 text-center"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-[#facc15]/20">
              <Search size={32} className="text-[#facc15]" />
            </div>
            <h2 className="mt-5 text-2xl font-extrabold text-[#111827]">
              No news found
            </h2>
            <p className="mx-auto mt-2 max-w-md text-gray-500">
              {search
                ? `We couldn't find anything matching "${search}".`
                : "There are no news articles available yet."}
            </p>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-5 rounded-xl bg-[#facc15] px-6 py-2.5 text-sm font-bold text-[#111827] transition hover:bg-[#fbbf24] shadow-md shadow-[#facc15]/30"
              >
                Clear Search
              </button>
            )}
          </motion.div>
        ) : (
          /* ================= NEWS GRID/LIST ================= */
          <>
            <motion.div
              variants={stagger}
              initial="hidden"
              animate="visible"
              className={`grid gap-6 ${
                viewMode === "grid" 
                  ? "sm:grid-cols-2 lg:grid-cols-3" 
                  : "grid-cols-1"
              }`}
            >
              {filteredNews.map((item, index) => (
                <motion.article
                  key={item.id}
                  variants={fadeUp}
                  whileHover={{ y: -6 }}
                  className={`group overflow-hidden rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm hover:shadow-2xl transition-all duration-300 ${
                    viewMode === "list" ? "flex flex-col sm:flex-row" : ""
                  }`}
                >
                  {/* ================= IMAGE ================= */}
                  <Link
                    to={`/news/${item.id}`}
                    className={`relative block overflow-hidden ${
                      viewMode === "list" ? "sm:w-72 flex-shrink-0" : ""
                    }`}
                  >
                    {item.image_url ? (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className={`w-full object-cover transition duration-700 group-hover:scale-105 ${
                          viewMode === "list" ? "h-56 sm:h-full" : "h-56"
                        }`}
                      />
                    ) : (
                      <div className={`flex items-center justify-center bg-gradient-to-br from-[#111827] to-[#1f2937] ${
                        viewMode === "list" ? "h-56 sm:h-full" : "h-56"
                      }`}>
                        <span className="text-5xl font-black text-[#facc15]">
                          cur.
                        </span>
                      </div>
                    )}

                    {/* Overlay gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition group-hover:opacity-100" />

                    {/* Media badges */}
                    <div className="absolute left-4 top-4 flex gap-2">
                      {item.video_url && (
                        <span className="flex items-center gap-1.5 rounded-full bg-black/80 backdrop-blur-sm px-3 py-1.5 text-xs font-bold text-white">
                          <Video size={13} />
                          Video
                        </span>
                      )}
                      {item.audio_url && (
                        <span className="flex items-center gap-1.5 rounded-full bg-[#facc15] px-3 py-1.5 text-xs font-bold text-[#111827]">
                          <FileAudio size={13} />
                          Audio
                        </span>
                      )}
                    </div>

                    {/* Play button */}
                    {item.video_url && (
                      <div className="absolute bottom-4 right-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#facc15] text-[#111827] shadow-lg shadow-[#facc15]/30 transition group-hover:scale-110">
                        <Play size={20} fill="currentColor" />
                      </div>
                    )}
                  </Link>

                  {/* ================= CONTENT ================= */}
                  <div className={`flex-1 p-5 ${viewMode === "list" ? "flex flex-col justify-between" : ""}`}>
                    <div>
                      {/* Meta */}
                      <div className="mb-3 flex flex-wrap items-center gap-3 text-xs font-semibold text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={13} />
                          {formatDate(item.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={13} />
                          {getTimeAgo(item.created_at)}
                        </span>
                        {item.category && (
                          <span className="px-2 py-0.5 rounded-full bg-[#facc15]/20 text-[#facc15] text-[10px] font-black uppercase tracking-wider">
                            {item.category}
                          </span>
                        )}
                      </div>

                      {/* Title */}
                      <Link to={`/news/${item.id}`}>
                        <h2 className={`font-extrabold leading-tight text-[#111827] transition group-hover:text-[#facc15] ${
                          viewMode === "list" ? "text-2xl" : "text-xl"
                        }`}>
                          {item.title}
                        </h2>
                      </Link>

                      {/* Description */}
                      {item.description && (
                        <p className={`mt-3 text-gray-500 leading-relaxed ${
                          viewMode === "list" ? "line-clamp-3" : "line-clamp-3"
                        }`}>
                          {truncateText(item.description, viewMode === "list" ? 200 : 130)}
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="mt-5 flex items-center justify-between">
                      <Link
                        to={`/news/${item.id}`}
                        className="inline-flex items-center gap-2 text-sm font-extrabold text-[#111827] transition group-hover:text-[#facc15]"
                      >
                        Read More
                        <ChevronRight
                          size={17}
                          className="transition-transform group-hover:translate-x-1"
                        />
                      </Link>

                      <div className="flex items-center gap-2">
                        <button className="p-2 rounded-xl text-gray-400 hover:text-[#facc15] hover:bg-[#facc15]/10 transition">
                          <Bookmark size={18} />
                        </button>
                        <button className="p-2 rounded-xl text-gray-400 hover:text-[#facc15] hover:bg-[#facc15]/10 transition">
                          <Share2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.article>
              ))}
            </motion.div>

            {/* ================= RESULT COUNT ================= */}
            {!loading && filteredNews.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-10 text-center text-sm font-medium text-gray-400"
              >
                Showing {filteredNews.length}{" "}
                {filteredNews.length === 1 ? "article" : "articles"}
                {search && ` matching "${search}"`}
              </motion.div>
            )}
          </>
        )}
      </main>
    </div>
  );
}