import { useEffect, useState } from "react";
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
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Home() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [news, setNews] = useState([]);
  const [trends, setTrends] = useState([]);
  const [trendIndex, setTrendIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isHoveringTrend, setIsHoveringTrend] = useState(false);

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

      if (!profileError) {
        setProfile(profileData);
      }

      const { data: newsData, error: newsError } = await supabase
        .from("news")
        .select(
          "id, title, description, image_url, video_url, audio_url, created_at"
        )
        .order("created_at", { ascending: false })
        .limit(20);

      if (!newsError) {
        setNews(newsData || []);
      }

      const { data: trendsData, error: trendsError } = await supabase
        .from("news")
        .select("id, title, image_url, created_at")
        .not("image_url", "is", null)
        .order("created_at", { ascending: false })
        .limit(10);

      if (!trendsError) {
        setTrends(trendsData || []);
      }
    } catch (error) {
      console.error("Home loading error:", error);
    } finally {
      setLoading(false);
    }
  };

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
    setTrendIndex(
      (current) => (current - 1 + trends.length) % trends.length
    );
  };

  const formatDate = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

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
    visible: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-[#f8f7f4] flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 border-4 border-gray-200 border-t-[#facc15] rounded-full mx-auto"
          />
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-6 text-gray-500 font-semibold tracking-wide"
          >
            CUR.BOOK
          </motion.p>
          <p className="text-xs text-gray-400 mt-1">loading your feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#f8f7f4] text-[#111827] min-h-screen">
      {/* ================= TRENDS CAROUSEL ================= */}
      <section className="pt-6 sm:pt-8 lg:pt-10 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
          >
            <motion.div
              variants={fadeUp}
              className="relative w-full max-w-6xl mx-auto"
              onMouseEnter={() => setIsHoveringTrend(true)}
              onMouseLeave={() => setIsHoveringTrend(false)}
            >
              <div className="relative overflow-hidden rounded-[2.5rem] bg-[#0c0a09] shadow-2xl shadow-black/20 ring-1 ring-white/10">
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

                    {/* Gradient overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0c0a09] via-[#0c0a09]/40 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0c0a09]/20 to-transparent" />

                    {/* Trend badge */}
                    <div className="absolute top-5 left-5 z-10">
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#facc15] text-[#0c0a09] font-black text-sm shadow-lg shadow-[#facc15]/30">
                        <Flame size={14} className="fill-[#0c0a09]" />
                        <span>TRENDING</span>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 z-10">
                      <motion.div
                        key={trends[trendIndex]?.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                      >
                        <p className="text-xs uppercase tracking-[0.2em] text-[#facc15] font-black mb-2">
                          <span className="inline-block w-2 h-2 rounded-full bg-[#facc15] mr-2 animate-pulse" />
                          Now trending
                        </p>
                        <h3 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white leading-tight max-w-2xl drop-shadow-lg">
                          {trends[trendIndex]?.title}
                        </h3>
                        <div className="flex items-center gap-4 mt-3 text-white/60 text-sm">
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
                          className="inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-2xl bg-[#facc15] text-[#0c0a09] font-black hover:bg-[#fbbf24] transition-all hover:scale-105 shadow-lg shadow-[#facc15]/30"
                        >
                          Read full story
                          <ArrowRight size={17} />
                        </Link>
                      </motion.div>
                    </div>

                    {/* Navigation arrows */}
                    {trends.length > 1 && (
                      <>
                        <button
                          onClick={previousTrend}
                          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm text-[#0c0a09] flex items-center justify-center hover:bg-[#facc15] transition-all hover:scale-110 shadow-lg"
                        >
                          <ArrowLeft size={19} />
                        </button>
                        <button
                          onClick={nextTrend}
                          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/90 backdrop-blur-sm text-[#0c0a09] flex items-center justify-center hover:bg-[#facc15] transition-all hover:scale-110 shadow-lg"
                        >
                          <ArrowRight size={19} />
                        </button>
                      </>
                    )}

                    {/* Progress indicators */}
                    {trends.length > 1 && (
                      <div className="absolute bottom-6 right-6 z-10 flex items-center gap-2">
                        {trends.map((trend, index) => (
                          <button
                            key={trend.id}
                            onClick={() => setTrendIndex(index)}
                            className={`h-2 rounded-full transition-all duration-300 ${
                              index === trendIndex
                                ? "w-8 bg-[#facc15]"
                                : "w-2 bg-white/40 hover:bg-white/70"
                            }`}
                          />
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-[280px] sm:h-[340px] lg:h-[400px] flex flex-col items-center justify-center text-center p-8 bg-[#0c0a09]">
                    <div className="w-20 h-20 rounded-3xl bg-[#facc15] flex items-center justify-center mb-6">
                      <Newspaper size={34} className="text-[#0c0a09]" />
                    </div>
                    <h3 className="text-2xl font-black text-white">No trends yet</h3>
                    <p className="text-gray-400 mt-3 max-w-sm">
                      Trending stories will appear here when they're published.
                    </p>
                    <Link
                      to="/news"
                      className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#facc15] text-[#0c0a09] font-black hover:bg-[#fbbf24] transition"
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
              { to: "/news", icon: Newspaper, label: "News", desc: "Latest stories", color: "bg-[#facc15]" },
              { to: "/community", icon: Users, label: "Community", desc: "Connect with others", color: "bg-[#111827] text-white" },
              { to: "/profile", icon: User, label: "Profile", desc: "Manage your account", color: "bg-[#facc15]" },
              { to: "/search", icon: Search, label: "Explore", desc: "Find content", color: "bg-[#111827] text-white" },
            ].map((item, idx) => (
              <motion.div key={idx} variants={fadeUp}>
                <Link
                  to={item.to}
                  className="group block bg-white/80 backdrop-blur-sm border border-white/60 rounded-2xl p-5 hover:border-[#facc15] hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
                >
                  <div className={`w-12 h-12 rounded-2xl ${item.color} flex items-center justify-center mb-4 group-hover:scale-110 transition duration-300 shadow-md`}>
                    <item.icon size={22} className={item.color.includes("text-white") ? "text-white" : "text-[#111827]"} />
                  </div>
                  <h3 className="font-extrabold text-[#111827]">{item.label}</h3>
                  <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ================= LATEST NEWS ================= */}
      <section className="py-12 bg-white/60 backdrop-blur-sm border-y border-gray-200/60">
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
                <p className="text-xs uppercase tracking-[0.2em] font-black text-[#facc15] flex items-center gap-2">
                  <Sparkles size={14} />
                  Stay updated
                </p>
                <h2 className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">
                  Latest News
                </h2>
                <p className="text-gray-500 mt-2">
                  Discover the newest stories on CUR.BOOK.
                </p>
              </div>
              <Link
                to="/news"
                className="hidden sm:inline-flex items-center gap-2 text-sm font-black text-[#111827] hover:text-[#facc15] transition-all group"
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
                    className="group bg-white rounded-2xl overflow-hidden border border-gray-200/60 hover:border-[#facc15] hover:shadow-2xl transition-all duration-300 news-card"
                  >
                    {item.image_url ? (
                      <div className="relative overflow-hidden">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-52 object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute top-4 left-4">
                          <span className="px-3 py-1.5 rounded-full bg-[#facc15] text-[#111827] text-xs font-black shadow-lg shadow-[#facc15]/30">
                            News
                          </span>
                        </div>
                        <div className="absolute top-4 right-4">
                          <span className="px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm text-white text-xs font-semibold">
                            <Clock size={12} className="inline mr-1" />
                            {formatDate(item.created_at)}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full h-52 bg-gradient-to-br from-[#111827] to-[#1f2937] flex items-center justify-center">
                        <Newspaper size={45} className="text-[#facc15]" />
                      </div>
                    )}

                    <div className="p-5">
                      <h3 className="font-extrabold text-lg mt-1 line-clamp-2 group-hover:text-[#facc15] transition">
                        {item.title}
                      </h3>
                      {item.description && (
                        <p className="text-sm text-gray-500 mt-3 line-clamp-3 leading-relaxed">
                          {item.description}
                        </p>
                      )}
                      <Link
                        to={`/news/${item.id}`}
                        className="inline-flex items-center gap-2 mt-5 text-sm font-extrabold text-[#111827] hover:text-[#facc15] transition group"
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
                className="bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-3xl p-12 text-center"
              >
                <div className="w-16 h-16 mx-auto rounded-2xl bg-[#facc15] flex items-center justify-center shadow-lg shadow-[#facc15]/30">
                  <Newspaper size={28} className="text-[#111827]" />
                </div>
                <h3 className="text-xl font-extrabold mt-5">No news yet</h3>
                <p className="text-gray-500 mt-2">
                  New stories will appear here when they are published.
                </p>
              </motion.div>
            )}

            <div className="sm:hidden mt-6">
              <Link
                to="/news"
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3.5 rounded-2xl bg-[#111827] text-white font-extrabold hover:bg-[#1f2937] transition"
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
            className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#111827] via-[#1a2332] to-[#0f172a] p-8 sm:p-12 lg:p-16 ring-1 ring-white/10"
          >
            {/* Decorative blobs */}
            <div className="absolute -right-24 -top-24 w-80 h-80 rounded-full bg-[#facc15]/20 blur-3xl" />
            <div className="absolute -left-24 -bottom-24 w-80 h-80 rounded-full bg-[#facc15]/10 blur-3xl" />

            <div className="relative z-10 max-w-3xl">
              <div className="w-14 h-14 rounded-2xl bg-[#facc15] flex items-center justify-center mb-6 shadow-lg shadow-[#facc15]/30">
                <Users size={27} className="text-[#111827]" />
              </div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white leading-tight">
                Be part of the <span className="text-[#facc15]">community</span>.
              </h2>
              <p className="text-gray-400 mt-5 max-w-2xl text-base sm:text-lg leading-relaxed">
                Discover people, share ideas, follow conversations and
                explore everything happening across CUR.BOOK.
              </p>
              <Link
                to="/community"
                className="inline-flex items-center gap-2 mt-7 px-7 py-3.5 rounded-2xl bg-[#facc15] text-[#111827] font-extrabold hover:bg-[#fbbf24] transition-all hover:scale-105 shadow-xl shadow-[#facc15]/30"
              >
                Join Community
                <ArrowRight size={18} />
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}