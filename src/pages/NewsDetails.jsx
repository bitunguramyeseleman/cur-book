import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  FileAudio,
  MessageCircle,
  Share2,
  Video,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function NewsDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [shareMessage, setShareMessage] = useState("");

  useEffect(() => {
    loadNews();
  }, [id]);

  const loadNews = async () => {
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
          "id, title, description, image_url, video_url, audio_url, created_by, created_at"
        )
        .eq("id", id)
        .single();

      if (newsError) {
        throw newsError;
      }

      setNews(data);
    } catch (err) {
      console.error("News details error:", err);
      setError("This news article could not be found.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return "Unknown date";

    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleShare = async () => {
    const url = window.location.href;

    try {
      if (navigator.share) {
        await navigator.share({
          title: news?.title || "cur.book News",
          text: news?.description || "",
          url,
        });

        return;
      }

      await navigator.clipboard.writeText(url);

      setShareMessage("Link copied!");

      setTimeout(() => {
        setShareMessage("");
      }, 2500);
    } catch (err) {
      console.error("Share error:", err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
            <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-200" />

            <div className="ml-3 h-7 w-32 animate-pulse rounded bg-gray-200" />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="h-6 w-24 animate-pulse rounded bg-gray-200" />

          <div className="mt-6 grid gap-8 lg:grid-cols-2">
            <div className="h-[380px] animate-pulse rounded-3xl bg-gray-200" />

            <div className="space-y-5">
              <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
              <div className="h-12 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
              <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !news) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm"
        >
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-yellow-100">
            <span className="text-2xl font-black text-gray-900">!</span>
          </div>

          <h1 className="mt-5 text-2xl font-black text-gray-900">
            News Not Found
          </h1>

          <p className="mt-2 text-sm leading-6 text-gray-500">
            {error || "The article you're looking for doesn't exist."}
          </p>

          <button
            onClick={() => navigate("/news")}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-gray-900 transition hover:bg-yellow-500"
          >
            <ArrowLeft size={17} />
            Back to News
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 border-b border-gray-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/news")}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 text-gray-700 transition hover:border-yellow-400 hover:bg-yellow-50"
            >
              <ArrowLeft size={20} />
            </button>

            <Link
              to="/home"
              className="text-2xl font-black tracking-tight text-gray-900"
            >
              cur<span className="text-yellow-500">.</span>book
            </Link>
          </div>

          <Link
            to="/news"
            className="hidden rounded-xl bg-yellow-400 px-4 py-2 text-sm font-black text-gray-900 transition hover:bg-yellow-500 sm:block"
          >
            All News
          </Link>
        </div>
      </header>

      {/* MAIN */}
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* BACK */}
        <motion.button
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={() => navigate("/news")}
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-gray-500 transition hover:text-gray-900"
        >
          <ArrowLeft size={17} />
          Back to News
        </motion.button>

        {/* ARTICLE */}
        <motion.article
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm"
        >
          {/* TOP SECTION */}
          <div className="grid lg:grid-cols-2">
            {/* LEFT - PHOTO */}
            <div className="relative min-h-[300px] overflow-hidden bg-gray-900 lg:min-h-[520px]">
              {news.image_url ? (
                <img
                  src={news.image_url}
                  alt={news.title}
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full min-h-[300px] items-center justify-center bg-gray-900 lg:min-h-[520px]">
                  <span className="text-6xl font-black text-yellow-400">
                    cur.
                  </span>
                </div>
              )}

              {/* IMAGE OVERLAY */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

              {/* MEDIA BADGES */}
              <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                {news.video_url && (
                  <span className="flex items-center gap-2 rounded-full bg-gray-900/90 px-3 py-2 text-xs font-bold text-white backdrop-blur">
                    <Video size={14} />
                    Video
                  </span>
                )}

                {news.audio_url && (
                  <span className="flex items-center gap-2 rounded-full bg-yellow-400 px-3 py-2 text-xs font-bold text-gray-900">
                    <FileAudio size={14} />
                    Voice
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT - DESCRIPTION */}
            <div className="flex flex-col justify-center p-6 sm:p-8 lg:p-10">
              {/* DATE */}
              <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-gray-400">
                <span className="inline-flex items-center gap-2">
                  <Calendar size={16} />
                  {formatDate(news.created_at)}
                </span>

                <span className="hidden h-1 w-1 rounded-full bg-gray-300 sm:block" />

                <span>{formatTime(news.created_at)}</span>
              </div>

              {/* TITLE */}
              <h1 className="mt-5 text-3xl font-black leading-tight tracking-tight text-gray-900 sm:text-4xl">
                {news.title}
              </h1>

              {/* YELLOW LINE */}
              <div className="mt-5 h-1.5 w-16 rounded-full bg-yellow-400" />

              {/* DESCRIPTION */}
              <div className="mt-6">
                {news.description ? (
                  <p className="whitespace-pre-wrap text-base leading-8 text-gray-600 sm:text-lg">
                    {news.description}
                  </p>
                ) : (
                  <p className="text-gray-400">
                    No description was provided for this article.
                  </p>
                )}
              </div>

              {/* ACTIONS */}
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleShare}
                  className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-3 text-sm font-black text-gray-900 transition hover:bg-yellow-500"
                >
                  <Share2 size={17} />
                  Share
                </button>

                <button
                  onClick={() => {
                    document
                      .getElementById("comments")
                      ?.scrollIntoView({
                        behavior: "smooth",
                      });
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-5 py-3 text-sm font-bold text-gray-700 transition hover:border-yellow-400 hover:bg-yellow-50"
                >
                  <MessageCircle size={17} />
                  Comments
                </button>

                {shareMessage && (
                  <motion.span
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="text-sm font-bold text-gray-600"
                  >
                    {shareMessage}
                  </motion.span>
                )}
              </div>
            </div>
          </div>

          {/* MEDIA SECTION */}
          <div className="border-t border-gray-200 bg-gray-50 p-5 sm:p-8 lg:p-10">
            {/* VOICE / AUDIO */}
            {news.audio_url && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400">
                    <FileAudio size={19} className="text-gray-900" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-gray-900">
                      Voice
                    </h2>

                    <p className="text-xs font-medium text-gray-400">
                      Listen to this news
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                  <audio
                    controls
                    className="w-full"
                    src={news.audio_url}
                  >
                    Your browser does not support audio playback.
                  </audio>
                </div>
              </motion.section>
            )}

            {/* VIDEO */}
            {news.video_url && (
              <motion.section
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className={news.audio_url ? "mt-10" : ""}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-yellow-400">
                    <Video size={19} className="text-gray-900" />
                  </div>

                  <div>
                    <h2 className="text-xl font-black text-gray-900">
                      Video
                    </h2>

                    <p className="text-xs font-medium text-gray-400">
                      Watch this news
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-sm">
                  <video
                    controls
                    playsInline
                    className="max-h-[650px] w-full"
                    src={news.video_url}
                  >
                    Your browser does not support video playback.
                  </video>
                </div>
              </motion.section>
            )}

            {/* NO MEDIA */}
            {!news.audio_url && !news.video_url && (
              <div className="rounded-2xl border border-dashed border-gray-300 bg-white p-8 text-center">
                <p className="text-sm font-semibold text-gray-400">
                  No voice or video is available for this article.
                </p>
              </div>
            )}
          </div>

          {/* COMMENTS */}
          <motion.section
            id="comments"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="border-t border-gray-200 p-5 sm:p-8 lg:p-10"
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-black text-gray-900">
                  Comments
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Join the conversation about this article.
                </p>
              </div>

              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-100">
                <MessageCircle
                  size={20}
                  className="text-gray-900"
                />
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-8 text-center">
              <MessageCircle
                size={28}
                className="mx-auto text-gray-400"
              />

              <p className="mt-3 font-bold text-gray-700">
                Comments are coming next.
              </p>

              <p className="mt-1 text-sm text-gray-400">
                We will connect this section to your news comments table.
              </p>
            </div>
          </motion.section>
        </motion.article>

        {/* MORE NEWS */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 text-center"
        >
          <Link
            to="/news"
            className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-gray-900 transition hover:bg-yellow-500"
          >
            <ArrowLeft size={17} />
            Explore More News
          </Link>
        </motion.div>
      </main>

      {/* FOOTER */}
      <footer className="mt-12 border-t border-gray-200 bg-gray-900 text-gray-300">
        <div className="mx-auto max-w-7xl px-4 py-8 text-center sm:px-6 lg:px-8">
          <div className="text-2xl font-black text-white">
            cur<span className="text-yellow-400">.</span>book
          </div>

          <p className="mt-2 text-sm text-gray-500">
            Discover stories and stay connected.
          </p>

          <div className="mt-5 flex justify-center gap-5 text-sm">
            <Link
              to="/home"
              className="transition hover:text-yellow-400"
            >
              Home
            </Link>

            <Link
              to="/news"
              className="text-yellow-400"
            >
              News
            </Link>

            <Link
              to="/community"
              className="transition hover:text-yellow-400"
            >
              Community
            </Link>

            <Link
              to="/profile"
              className="transition hover:text-yellow-400"
            >
              Profile
            </Link>
          </div>

          <div className="mt-6 border-t border-gray-800 pt-5 text-xs text-gray-600">
            © {new Date().getFullYear()} cur.book. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}