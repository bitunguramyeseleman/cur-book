import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Newspaper,
  Search,
  Users,
  User,
  Sparkles,
  Flame,
  Clock,
  Eye,
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Music,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Avatar, { getDisplayName } from "../components/Avatar";
import PostViewer from "../components/PostViewer";
import StoryBar from "../components/StoryBar";
import AddStory from "../components/AddStory";

export default function Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  // news / trends
  const [news, setNews] = useState([]);
  const [trends, setTrends] = useState([]);
  const [trendIndex, setTrendIndex] = useState(0);
  const [isHoveringTrend, setIsHoveringTrend] = useState(false);

  // social feed
  const [feed, setFeed] = useState([]);
  const [feedLoading, setFeedLoading] = useState(true);
  const [activePost, setActivePost] = useState(null);
  const [toast, setToast] = useState(null);

  // add story
  const [addStoryOpen, setAddStoryOpen] = useState(false);

  const [loading, setLoading] = useState(true);

  // =========================================================
  // LOAD
  // =========================================================
  useEffect(() => {
    loadHome();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        navigate("/login");
      } else {
        setUser(session.user);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const loadHome = async () => {
    try {
      setLoading(true);

      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !currentUser) {
        navigate("/login");
        return;
      }

      setUser(currentUser);

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url, bio")
        .eq("id", currentUser.id)
        .maybeSingle();

      if (!profileError) setProfile(profileData);

      const { data: newsData } = await supabase
        .from("news")
        .select("id, title, description, image_url, video_url, audio_url, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      setNews(newsData || []);

      const { data: trendsData } = await supabase
        .from("news")
        .select("id, title, image_url, created_at")
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);
      setTrends(trendsData || []);

      await loadFeed(currentUser.id);
    } catch (error) {
      console.error("Home loading error:", error);
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD FEED
  // =========================================================
  const loadFeed = async (currentUserId) => {
    setFeedLoading(true);
    try {
      const { data: posts, error: postsError } = await supabase
        .from("posts")
        .select("id, user_id, image_url, video_url, caption, song, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      if (postsError) throw postsError;
      if (!posts?.length) {
        setFeed([]);
        return;
      }

      const postIds = posts.map((p) => p.id);
      const authorIds = [...new Set(posts.map((p) => p.user_id))];

      const { data: authors } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", authorIds);
      const authorMap = {};
      (authors || []).forEach((a) => (authorMap[a.id] = a));

      const [likesRes, commentsRes] = await Promise.all([
        supabase.from("post_likes").select("id, post_id, user_id").in("post_id", postIds),
        supabase.from("post_comments").select("id, post_id").in("post_id", postIds),
      ]);

      const likesByPost = {};
      (likesRes.data || []).forEach((l) => {
        if (!likesByPost[l.post_id]) likesByPost[l.post_id] = [];
        likesByPost[l.post_id].push(l);
      });

      const commentCount = {};
      (commentsRes.data || []).forEach((c) => {
        commentCount[c.post_id] = (commentCount[c.post_id] || 0) + 1;
      });

      setFeed(
        posts.map((p) => {
          const likes = likesByPost[p.id] || [];
          return {
            ...p,
            author: authorMap[p.user_id] || null,
            likes,
            likes_count: likes.length,
            comments_count: commentCount[p.id] || 0,
            liked_by_me: likes.some((l) => l.user_id === currentUserId),
          };
        })
      );
    } catch (err) {
      console.error("Feed load error:", err);
    } finally {
      setFeedLoading(false);
    }
  };

  // =========================================================
  // REALTIME FEED
  // =========================================================
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("home-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        async (payload) => {
          const p = payload.new;

          let alreadyHave = false;
          setFeed((prev) => {
            alreadyHave = prev.some((x) => x.id === p.id);
            return prev;
          });
          if (alreadyHave) return;

          const { data: author } = await supabase
            .from("profiles")
            .select("id, username, full_name, avatar_url")
            .eq("id", p.user_id)
            .maybeSingle();

          setFeed((prev) => [
            {
              ...p,
              author: author || null,
              likes: [],
              likes_count: 0,
              comments_count: 0,
              liked_by_me: false,
            },
            ...prev,
          ]);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_likes" },
        (payload) => {
          const l = payload.new;
          setFeed((prev) =>
            prev.map((p) => {
              if (p.id !== l.post_id) return p;
              if (p.likes.some((x) => x.id === l.id)) return p;
              const likes = [...p.likes, l];
              return {
                ...p,
                likes,
                likes_count: likes.length,
                liked_by_me: likes.some((x) => x.user_id === user.id),
              };
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "post_likes" },
        (payload) => {
          const l = payload.old;
          setFeed((prev) =>
            prev.map((p) => {
              if (p.id !== l.post_id) return p;
              const likes = p.likes.filter((x) => x.id !== l.id);
              return {
                ...p,
                likes,
                likes_count: likes.length,
                liked_by_me: likes.some((x) => x.user_id === user.id),
              };
            })
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "post_comments" },
        (payload) => {
          const c = payload.new;
          setFeed((prev) =>
            prev.map((p) =>
              p.id === c.post_id
                ? { ...p, comments_count: (p.comments_count || 0) + 1 }
                : p
            )
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "post_comments" },
        (payload) => {
          const c = payload.old;
          setFeed((prev) =>
            prev.map((p) =>
              p.id === c.post_id
                ? { ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) }
                : p
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // =========================================================
  // CAROUSEL AUTO-ROTATE
  // =========================================================
  useEffect(() => {
    if (trends.length <= 1 || isHoveringTrend) return;
    const interval = setInterval(() => {
      setTrendIndex((current) => (current + 1) % trends.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [trends.length, isHoveringTrend]);

  const nextTrend = () => {
    if (trends.length === 0) return;
    setTrendIndex((current) => (current + 1) % trends.length);
  };
  const previousTrend = () => {
    if (trends.length === 0) return;
    setTrendIndex((current) => (current - 1 + trends.length) % trends.length);
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatRelative = (d) => {
    if (!d) return "";
    const diff = (Date.now() - new Date(d)) / 1000;
    if (diff < 60) return "now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
    return new Date(d).toLocaleDateString([], { day: "numeric", month: "short" });
  };

  // =========================================================
  // LIKE / SHARE
  // =========================================================
  const toggleLike = async (post) => {
    if (!user) return;
    const wasLiked = post.liked_by_me;
    const existing = post.likes.find((l) => l.user_id === user.id);

    setFeed((prev) =>
      prev.map((p) => {
        if (p.id !== post.id) return p;
        if (wasLiked) {
          const likes = p.likes.filter((l) => l.user_id !== user.id);
          return { ...p, likes, likes_count: likes.length, liked_by_me: false };
        }
        const optimistic = { id: `temp-${Date.now()}`, user_id: user.id, post_id: p.id };
        const likes = [...p.likes, optimistic];
        return { ...p, likes, likes_count: likes.length, liked_by_me: true };
      })
    );

    if (wasLiked && existing) {
      const { error } = await supabase.from("post_likes").delete().eq("id", existing.id);
      if (error) {
        setFeed((prev) =>
          prev.map((p) => {
            if (p.id !== post.id) return p;
            const likes = [...p.likes, existing];
            return { ...p, likes, likes_count: likes.length, liked_by_me: true };
          })
        );
      }
    } else {
      const { data, error } = await supabase
        .from("post_likes")
        .insert({ post_id: post.id, user_id: user.id })
        .select()
        .single();
      if (error) {
        setFeed((prev) =>
          prev.map((p) => {
            if (p.id !== post.id) return p;
            const likes = p.likes.filter((l) => l.user_id !== user.id);
            return { ...p, likes, likes_count: likes.length, liked_by_me: false };
          })
        );
      } else {
        setFeed((prev) =>
          prev.map((p) =>
            p.id !== post.id
              ? p
              : {
                  ...p,
                  likes: p.likes.map((l) =>
                    l.user_id === user.id && l.id.startsWith("temp-") ? data : l
                  ),
                }
          )
        );
      }
    }
  };

  const sharePost = async (post) => {
    const url = `${window.location.origin}/post/${post.id}`;
    const text = post.caption ? `"${post.caption}"` : "Check this out on CUR.BOOK";

    try {
      if (navigator.share) {
        await navigator.share({
          title: post.author ? getDisplayName(post.author) : "CUR.BOOK",
          text,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setToast({ type: "success", text: "Link copied to clipboard" });
        setTimeout(() => setToast(null), 2200);
      }
    } catch {
      /* user cancelled */
    }
  };

  // =========================================================
  // CALLBACKS
  // =========================================================
  const handleCountsChange = useCallback((postId, { likes, comments }) => {
    setFeed((prev) =>
      prev.map((p) =>
        p.id === postId
          ? { ...p, likes_count: likes, comments_count: comments }
          : p
      )
    );
  }, []);

  // =========================================================
  // VARIANTS
  // =========================================================
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] },
    },
  };
  const stagger = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
  };

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="min-h-[70vh] bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-gray-800 border-t-yellow-400 rounded-full mx-auto"
          />
          <p className="mt-6 text-gray-400 font-semibold tracking-wide">CUR.BOOK</p>
          <p className="text-xs text-gray-600 mt-1">loading your feed...</p>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <div className="bg-gray-950 text-white min-h-screen">

      {/* ================= STORY BAR ================= */}
      <section className="pt-4 pb-2">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">
          <StoryBar
            currentUser={user}
            onAddStory={() => setAddStoryOpen(true)}
          />
        </div>
      </section>

      {/* ================= TRENDS CAROUSEL ================= */}
      <section className="pt-2 sm:pt-4 lg:pt-6 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={stagger} initial="hidden" animate="visible">
            <motion.div
              variants={fadeUp}
              className="relative w-full max-w-6xl mx-auto"
              onMouseEnter={() => setIsHoveringTrend(true)}
              onMouseLeave={() => setIsHoveringTrend(false)}
            >
              <div className="relative overflow-hidden rounded-[2.5rem] bg-black shadow-2xl shadow-black/50 ring-1 ring-gray-800">
                {trends.length > 0 ? (
                  <>
                    <AnimatePresence mode="wait">
                      <motion.img
                        key={trends[trendIndex]?.id}
                        src={trends[trendIndex]?.image_url}
                        alt={trends[trendIndex]?.title || "Trend"}
                        initial={{ opacity: 0, scale: 1.08 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        className="w-full h-[280px] sm:h-[340px] lg:h-[400px] object-cover"
                      />
                    </AnimatePresence>

                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

                    <div className="absolute top-5 left-5 z-10">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-400 text-gray-950 font-black text-sm shadow-lg shadow-yellow-400/30">
                        <Flame size={14} className="fill-gray-950" />
                        <span>TRENDING</span>
                      </div>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10">
                      <motion.div
                        key={trends[trendIndex]?.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <p className="text-xs uppercase tracking-[0.2em] text-yellow-400 font-black mb-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-yellow-400 mr-2 animate-pulse" />
                          Now trending
                        </p>
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight max-w-2xl drop-shadow-lg">
                          {trends[trendIndex]?.title}
                        </h3>
                        <div className="flex items-center gap-4 mt-3 text-white/70 text-sm">
                          <span className="flex items-center gap-1">
                            <Clock size={14} />
                            {formatDate(trends[trendIndex]?.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye size={14} />
                            2.4k views
                          </span>
                        </div>
                        <Link
                          to={`/news/${trends[trendIndex]?.id}`}
                          className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-2xl bg-yellow-400 text-gray-950 font-black hover:bg-yellow-300 transition-all hover:scale-105 shadow-lg shadow-yellow-400/30"
                        >
                          Read full story
                          <ArrowRight size={17} />
                        </Link>
                      </motion.div>
                    </div>

                    {trends.length > 1 && (
                      <>
                        <button
                          onClick={previousTrend}
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-gray-950/80 backdrop-blur-sm text-white flex items-center justify-center hover:bg-yellow-400 hover:text-gray-950 transition-all hover:scale-110 shadow-lg border border-gray-800"
                        >
                          <ArrowLeft size={19} />
                        </button>
                        <button
                          onClick={nextTrend}
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-gray-950/80 backdrop-blur-sm text-white flex items-center justify-center hover:bg-yellow-400 hover:text-gray-950 transition-all hover:scale-110 shadow-lg border border-gray-800"
                        >
                          <ArrowRight size={19} />
                        </button>
                      </>
                    )}

                    {trends.length > 1 && (
                      <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2">
                        {trends.map((trend, index) => (
                          <button
                            key={trend.id}
                            onClick={() => setTrendIndex(index)}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              index === trendIndex
                                ? "w-8 bg-yellow-400"
                                : "w-2 bg-white/40 hover:bg-white/70"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-[280px] sm:h-[340px] lg:h-[400px] flex flex-col items-center justify-center text-center p-8 bg-gray-900">
                    <div className="w-20 h-20 rounded-3xl bg-yellow-400 flex items-center justify-center mb-6">
                      <Newspaper size={34} className="text-gray-950" />
                    </div>
                    <h3 className="text-2xl font-black text-white">No trends yet</h3>
                    <p className="text-gray-400 mt-3 max-w-sm">
                      Trending stories will appear here when they're published.
                    </p>
                    <Link
                      to="/news"
                      className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-yellow-400 text-gray-950 font-black hover:bg-yellow-300 transition"
                    >
                      Explore News
                      <ArrowRight size={17} />
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ================= SOCIAL FEED ================= */}
      <section className="pb-10">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <motion.div variants={fadeUp} className="flex items-end justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] font-black text-yellow-400 flex items-center gap-2">
                  <Sparkles size={14} />
                  Live feed
                </p>
                <h2 className="text-2xl sm:text-3xl font-extrabold mt-1 tracking-tight text-white">
                  From the community
                </h2>
              </div>
            </motion.div>

            {feedLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className="rounded-3xl border border-gray-800 bg-gray-900 overflow-hidden"
                  >
                    <div className="flex items-center gap-3 p-4">
                      <div className="h-10 w-10 rounded-full bg-gray-800 animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-28 rounded bg-gray-800 animate-pulse" />
                        <div className="h-2 w-16 rounded bg-gray-800 animate-pulse" />
                      </div>
                    </div>
                    <div className="aspect-square bg-gray-800 animate-pulse" />
                    <div className="p-4 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-gray-800 animate-pulse" />
                      <div className="h-3 w-1/2 rounded bg-gray-800 animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            ) : feed.length === 0 ? (
              <motion.div
                variants={fadeUp}
                className="rounded-3xl border border-gray-800 bg-gray-900 p-10 text-center"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-400/30">
                  <Sparkles size={26} className="text-gray-950" />
                </div>
                <h3 className="mt-5 text-xl font-extrabold text-white">
                  No posts yet
                </h3>
                <p className="mt-2 text-sm text-gray-400">
                  Be the first to share something with the community.
                </p>
              </motion.div>
            ) : (
              feed.map((post) => (
                <FeedCard
                  key={post.id}
                  post={post}
                  user={user}
                  onLike={() => toggleLike(post)}
                  onOpen={() => setActivePost(post)}
                  onShare={() => sharePost(post)}
                />
              ))
            )}
          </motion.div>
        </div>
      </section>

      {/* ================= QUICK LINKS ================= */}
      <section className="pb-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4"
          >
            {[
              { to: "/news", icon: Newspaper, label: "News", desc: "Latest stories", color: "bg-yellow-400 text-gray-950" },
              { to: "/community", icon: Users, label: "Community", desc: "Connect with others", color: "bg-gray-800 text-white" },
              { to: "/profile", icon: User, label: "Profile", desc: "Manage your account", color: "bg-yellow-400 text-gray-950" },
              { to: "/search", icon: Search, label: "Explore", desc: "Find content", color: "bg-gray-800 text-white" },
            ].map((item, idx) => (
              <motion.div key={idx} variants={fadeUp}>
                <Link
                  to={item.to}
                  className="group block bg-gray-900 border border-gray-800 rounded-2xl p-5 hover:border-yellow-400/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition duration-300 shadow-md`}>
                    <item.icon size={22} />
                  </div>
                  <h3 className="font-extrabold text-white">{item.label}</h3>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================= LATEST NEWS ================= */}
      <section className="py-12 bg-gray-900/50 border-y border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.15 }}
          >
            <motion.div
              variants={fadeUp}
              className="flex items-end justify-between gap-4 mb-10"
            >
              <div>
                <p className="text-xs uppercase tracking-[0.2em] font-black text-yellow-400 flex items-center gap-2">
                  <Sparkles size={14} />
                  Stay updated
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight text-white">
                  Latest News
                </h2>
                <p className="text-gray-400 mt-2">
                  Discover the newest stories on CUR.BOOK.
                </p>
              </div>
              <Link
                to="/news"
                className="hidden sm:inline-flex items-center gap-2 text-sm font-black text-white hover:text-yellow-400 transition-all group"
              >
                View all
                <ChevronRight size={17} className="group-hover:translate-x-1 transition" />
              </Link>
            </motion.div>

            {news.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {news.slice(0, 6).map((item) => (
                  <motion.article
                    variants={fadeUp}
                    key={item.id}
                    className="group bg-gray-900 rounded-2xl overflow-hidden border border-gray-800 hover:border-yellow-400/50 hover:shadow-2xl hover:shadow-yellow-400/10 transition-all duration-300 news-card"
                  >
                    {item.image_url ? (
                      <div className="relative overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-52 object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1.5 rounded-full bg-yellow-400 text-gray-950 text-xs font-black shadow-lg shadow-yellow-400/30">
                            News
                          </span>
                        </div>
                        <div className="absolute top-4 right-4">
                          <span className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-xs font-semibold">
                            <Clock size={12} className="inline mr-1" />
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-52 bg-gradient-to-br from-gray-800 to-gray-900 flex items-center justify-center">
                        <Newspaper size={45} className="text-yellow-400" />
                      </div>
                    )}

                    <div className="p-5">
                      <h3 className="font-extrabold text-lg mt-1 line-clamp-2 text-white group-hover:text-yellow-400 transition">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-gray-400 mt-3 line-clamp-3 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      <Link
                        to={`/news/${item.id}`}
                        className="inline-flex items-center gap-2 mt-5 text-sm font-extrabold text-white hover:text-yellow-400 transition group"
                      >
                        Read article
                        <ArrowRight size={16} className="group-hover:translate-x-1 transition" />
                      </Link>
                    </div>
                  </motion.article>
                ))}
              </div>
            ) : (
              <motion.div
                variants={fadeUp}
                className="bg-gray-900 border border-gray-800 rounded-3xl p-12 text-center"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-yellow-400 flex items-center justify-center shadow-lg shadow-yellow-400/30">
                  <Newspaper size={28} className="text-gray-950" />
                </div>
                <h3 className="text-xl font-extrabold mt-5 text-white">No news yet</h3>
                <p className="text-gray-400 mt-2">
                  New stories will appear here when they are published.
                </p>
              </motion.div>
            )}

            <div className="sm:hidden mt-6">
              <Link
                to="/news"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-yellow-400 text-gray-950 font-extrabold hover:bg-yellow-300 transition"
              >
                View all news
                <ChevronRight size={17} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= COMMUNITY CTA ================= */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-gray-900 via-gray-900 to-black p-8 sm:p-12 lg:p-16 ring-1 ring-gray-800"
          >
            <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-yellow-400/20 blur-3xl" />
            <div className="absolute -left-24 -bottom-24 w-80 h-80 rounded-full bg-yellow-400/10 blur-3xl" />

            <div className="relative z-10 max-w-3xl">
              <div className="w-14 h-14 rounded-2xl bg-yellow-400 flex items-center justify-center mb-6 shadow-lg shadow-yellow-400/30">
                <Users size={27} className="text-gray-950" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                Be part of the <span className="text-yellow-400">community</span>.
              </h2>
              <p className="text-gray-400 mt-5 max-w-2xl text-base sm:text-lg leading-relaxed">
                Discover people, share ideas, follow conversations and
                explore everything happening across CUR.BOOK.
              </p>
              <Link
                to="/community"
                className="inline-flex items-center gap-2 mt-7 px-7 py-3.5 rounded-2xl bg-yellow-400 text-gray-950 font-extrabold hover:bg-yellow-300 transition-all hover:scale-105 shadow-xl shadow-yellow-400/30"
              >
                Join Community
                <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ================= POST VIEWER ================= */}
      <AnimatePresence>
        {activePost && (
          <PostViewer
            post={activePost}
            currentUser={user}
            onClose={() => setActivePost(null)}
            onCountsChange={handleCountsChange}
          />
        )}
      </AnimatePresence>

      {/* ================= ADD STORY MODAL ================= */}
      <AddStory
        open={addStoryOpen}
        currentUser={user}
        onClose={() => setAddStoryOpen(false)}
        onPosted={() => setAddStoryOpen(false)}
      />

      {/* ================= TOAST ================= */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            className="pointer-events-none fixed bottom-5 left-1/2 z-[200] -translate-x-1/2"
          >
            <div
              className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md ${
                toast.type === "error"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-yellow-400/30 bg-yellow-400/10 text-yellow-400"
              }`}
            >
              <p className="text-xs font-semibold">{toast.text}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// =========================================================
// FEED CARD
// =========================================================
function FeedCard({ post, user, onLike, onOpen, onShare }) {
  const author = post.author || {};

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="overflow-hidden rounded-3xl border border-gray-800 bg-gray-900 shadow-lg shadow-black/20"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <Avatar person={author} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white">
            {getDisplayName(author)}
          </p>
          <p className="text-[11px] text-gray-500">
            @{author.username || "user"} · {formatRelativeShort(post.created_at)}
          </p>
        </div>
        <button
          className="flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-gray-800 hover:text-white"
          title="More"
        >
          <MoreHorizontal size={18} />
        </button>
      </div>

      {/* Image / video */}
      <button
        onClick={onOpen}
        className="relative block w-full overflow-hidden bg-black"
      >
        {post.video_url ? (
          <video
            src={post.video_url}
            className="max-h-[520px] w-full object-contain"
            muted
            playsInline
          />
        ) : (
          <img
            src={post.image_url}
            alt={post.caption || "Post"}
            className="max-h-[520px] w-full object-contain"
            loading="lazy"
          />
        )}
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1 px-3 pt-3">
        <button
          onClick={onLike}
          className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black transition active:scale-95 ${
            post.liked_by_me
              ? "text-red-400 hover:bg-red-500/10"
              : "text-white hover:bg-gray-800"
          }`}
        >
          <Heart size={20} fill={post.liked_by_me ? "currentColor" : "none"} />
          {post.likes_count || 0}
        </button>

        <button
          onClick={onOpen}
          className="flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black text-white transition hover:bg-gray-800 active:scale-95"
        >
          <MessageCircle size={20} />
          {post.comments_count || 0}
        </button>

        <button
          onClick={onShare}
          className="ml-auto flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-black text-white transition hover:bg-gray-800 active:scale-95"
        >
          <Share2 size={19} />
        </button>
      </div>

      {/* Caption + song */}
      {(post.caption || post.song) && (
        <div className="px-4 pb-4 pt-2 space-y-2">
          {post.caption && (
            <p className="text-sm leading-6 text-gray-200 whitespace-pre-wrap break-words">
              <span className="mr-2 font-black text-white">
                {author.username || "user"}
              </span>
              {post.caption}
            </p>
          )}

          {post.song && (
            <div className="flex items-center gap-2.5 rounded-2xl border border-gray-800 bg-gray-950 p-2.5">
              {post.song.artwork && (
                <img
                  src={post.song.artwork}
                  alt=""
                  className="h-9 w-9 rounded-lg object-cover"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-white">
                  {post.song.title}
                </p>
                <p className="truncate text-[10px] text-gray-500">
                  {post.song.artist}
                </p>
              </div>
              <Music size={14} className="text-yellow-400" />
            </div>
          )}
        </div>
      )}
    </motion.article>
  );
}

// =========================================================
// HELPERS
// =========================================================
function formatRelativeShort(d) {
  if (!d) return "";
  const diff = (Date.now() - new Date(d)) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return new Date(d).toLocaleDateString([], { day: "numeric", month: "short" });
}