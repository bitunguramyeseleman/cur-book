import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Camera, Check, Edit3, Heart, Loader2,
  MoreVertical, PlaySquare, Save, Settings, Share2,
  X, MessageCircle, Image as ImageIcon, Sparkles,
} from "lucide-react";
import Cropper from "react-easy-crop";
import { supabase } from "../lib/supabaseClient";
import PostViewer from "../components/PostViewer"; // 👈 NEW

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState({
    username: "",
    full_name: "",
    bio: "",
    avatar_url: "",
    created_at: "",
  });

  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [activePost, setActivePost] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [editing, setEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");

  // =========================================================
  // LOAD
  // =========================================================
  useEffect(() => {
    loadProfile();
    // eslint-disable-next-line
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) throw authError;
      if (!currentUser) {
        navigate("/login");
        return;
      }

      setUser(currentUser);

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, full_name, bio, avatar_url, created_at")
        .eq("id", currentUser.id)
        .single();

      if (profileError) throw profileError;

      setProfile({
        username: data.username || "",
        full_name: data.full_name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
        created_at: data.created_at || "",
      });

      setAvatarPreview(data.avatar_url || "");

      await loadPosts(currentUser.id);
    } catch (err) {
      console.error("Profile loading error:", err);
      setError(err.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  // =========================================================
  // LOAD POSTS (+ live like/comment counts)
  // =========================================================
  const loadPosts = async (userId) => {
    try {
      setLoadingPosts(true);

      const { data, error: e } = await supabase
        .from("posts")
        .select("id, user_id, image_url, video_url, caption, song, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (e) throw e;

      const ids = (data || []).map((p) => p.id);
      const likesMap = {};
      const commentsMap = {};

      if (ids.length) {
        const [likesRes, commentsRes] = await Promise.all([
          supabase.from("post_likes").select("post_id").in("post_id", ids),
          supabase.from("post_comments").select("post_id").in("post_id", ids),
        ]);

        (likesRes.data || []).forEach((r) => {
          likesMap[r.post_id] = (likesMap[r.post_id] || 0) + 1;
        });
        (commentsRes.data || []).forEach((r) => {
          commentsMap[r.post_id] = (commentsMap[r.post_id] || 0) + 1;
        });
      }

      setPosts(
        (data || []).map((p) => ({
          ...p,
          likes_count: likesMap[p.id] || 0,
          comments_count: commentsMap[p.id] || 0,
        }))
      );
    } catch (err) {
      console.error("Posts loading error:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  // =========================================================
  // AVATAR
  // =========================================================
  const handleAvatarSelect = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError("");
    setMessage("");

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be smaller than 10MB.");
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setShowEditor(true);
    event.target.value = "";
  };

  const handleCropChange = (newCrop) => setCrop(newCrop);
  const handleCropComplete = (_, pixels) => setCroppedAreaPixels(pixels);

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", reject);
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const createCroppedImage = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Could not create image editor.");

    const outputSize = 800;
    canvas.width = outputSize;
    canvas.height = outputSize;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      image,
      pixelCrop.x, pixelCrop.y, pixelCrop.width, pixelCrop.height,
      0, 0, outputSize, outputSize
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Crop failed."))),
        "image/jpeg",
        0.92
      );
    });
  };

  const handleApplyCrop = async () => {
    if (!selectedImage || !croppedAreaPixels) {
      setError("Please select and crop an image.");
      return;
    }

    try {
      setError("");
      const croppedBlob = await createCroppedImage(selectedImage, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(croppedBlob);

      setAvatarPreview(previewUrl);
      setProfile((prev) => ({ ...prev, avatar_url: previewUrl }));
      window.__curBookCroppedAvatar = croppedBlob;

      setShowEditor(false);
      URL.revokeObjectURL(selectedImage);
      setSelectedImage(null);
      setMessage("Profile picture changed. Save your profile to upload it.");
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to edit image.");
    }
  };

  const handleCancelCrop = () => {
    if (selectedImage) URL.revokeObjectURL(selectedImage);
    setSelectedImage(null);
    setShowEditor(false);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  // =========================================================
  // SAVE
  // =========================================================
  const handleSave = async () => {
    if (!user) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");

      let avatarUrl = profile.avatar_url;
      const croppedBlob = window.__curBookCroppedAvatar;

      if (croppedBlob) {
        const fileName = `profile-${crypto.randomUUID()}.jpg`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(filePath, croppedBlob, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from("avatars")
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
        window.__curBookCroppedAvatar = null;
      }

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          username: profile.username.trim() || null,
          full_name: profile.full_name.trim() || null,
          bio: profile.bio.trim() || null,
          avatar_url: avatarUrl || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id)
        .select()
        .single();

      if (updateError) {
        if (updateError.code === "23505") {
          throw new Error("That username is already being used.");
        }
        throw updateError;
      }

      setProfile((prev) => ({
        ...prev,
        username: data.username || "",
        full_name: data.full_name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
      }));

      setAvatarPreview(data.avatar_url || "");
      setMessage("Profile updated successfully.");
      setEditing(false);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // HELPERS
  // =========================================================
  const formatDate = (date) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const handleShare = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({
          title: profile.username ? `@${profile.username}` : "My Profile",
          text: "Check out my profile on cur.book",
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setMessage("Profile link copied.");
        setTimeout(() => setMessage(""), 2500);
      }
    } catch (err) {
      console.log("Share cancelled.");
    }
  };

  const getInitial = () =>
    (profile.full_name || profile.username || "U").charAt(0).toUpperCase();

  const postsList = useMemo(() => {
    if (activeTab === "all" || activeTab === "posts")
      return posts.filter((p) => p.image_url && !p.video_url);
    if (activeTab === "reels") return posts.filter((p) => p.video_url);
    return [];
  }, [posts, activeTab]);

  const totalPosts = posts.length;

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 overflow-x-hidden">
        <div className="mx-auto w-full max-w-2xl px-3 pt-3 space-y-3">
          <div className="h-14 rounded-2xl bg-gray-900 animate-pulse" />
          <div className="h-64 rounded-[28px] bg-gray-900 animate-pulse" />
          <div className="h-96 rounded-[28px] bg-gray-900 animate-pulse" />
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <>
      <div className="min-h-screen bg-gray-950 text-white pb-24 overflow-x-hidden">
        <div className="mx-auto w-full max-w-2xl px-3 pt-3 space-y-3">

          {/* =================================================
              HEADER BAR
          ================================================= */}
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between rounded-2xl border border-gray-800 bg-gray-900 px-2 py-2"
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition active:scale-95 hover:bg-gray-800 hover:text-white"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="text-center">
              <p className="text-[10px] font-black uppercase tracking-widest text-yellow-400">
                Account
              </p>
              <h1 className="text-sm font-black">
                {profile.username ? `@${profile.username}` : "Profile"}
              </h1>
            </div>

            <button
              type="button"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-gray-400 transition active:scale-95 hover:bg-gray-800 hover:text-white"
            >
              <MoreVertical size={20} />
            </button>
          </motion.header>

          {/* =================================================
              MAIN PROFILE CARD
          ================================================= */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="relative overflow-hidden rounded-[28px] border border-gray-800 bg-gray-900 p-4"
          >
            <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-yellow-400/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-56 w-56 rounded-full bg-yellow-400/5 blur-3xl" />

            <div className="relative">
              {/* TOP ROW */}
              <div className="flex items-center gap-3">
                {/* AVATAR */}
                <div className="relative shrink-0">
                  <div className="h-[72px] w-[72px] overflow-hidden rounded-full bg-gray-950 ring-2 ring-gray-800">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-400 to-yellow-500 text-2xl font-black text-gray-950">
                        {getInitial()}
                      </div>
                    )}
                  </div>

                  <label
                    htmlFor="avatar-upload"
                    className="absolute -bottom-1 -right-1 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-yellow-400 text-gray-950 shadow-md shadow-yellow-400/40 ring-2 ring-gray-900 transition active:scale-95"
                  >
                    <Camera size={14} strokeWidth={3} />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* STATS */}
                <div className="flex flex-1 items-center justify-around">
                  <div className="text-center">
                    <p className="text-base font-black text-white">{totalPosts}</p>
                    <p className="text-[11px] text-gray-500">Posts</p>
                  </div>
                  <div className="text-center">
                    <p className="text-base font-black text-white">0</p>
                    <p className="text-[11px] text-gray-500">Friends</p>
                  </div>
                </div>

                {/* ADD STORY */}
                <button
                  onClick={() => navigate("/upload")}
                  className="shrink-0 flex items-center gap-1.5 rounded-2xl bg-yellow-400 px-3.5 py-2.5 text-xs font-black text-gray-950 shadow-lg shadow-yellow-400/30 transition active:scale-95 hover:bg-yellow-300"
                >
                  <Sparkles size={14} strokeWidth={3} />
                  Add Story
                </button>
              </div>

              {/* USERNAME + BIO */}
              <div className="mt-4">
                <h2 className="truncate text-base font-black text-white">
                  {profile.full_name || profile.username || "User"}
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">
                  {profile.username ? `@${profile.username}` : "Username"}
                </p>

                {profile.bio ? (
                  <p className="mt-3 whitespace-pre-line text-sm leading-5 text-gray-400">
                    {profile.bio}
                  </p>
                ) : (
                  <p className="mt-3 text-sm italic text-gray-600">
                    No bio yet.
                  </p>
                )}
              </div>

              {/* ACTION ROW */}
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-800 bg-gray-950 px-3 py-3 text-sm font-black text-white transition active:scale-[0.98] hover:border-yellow-400/40 hover:bg-gray-900"
                >
                  <Edit3 size={16} />
                  Edit profile
                </button>

                <button
                  type="button"
                  onClick={handleShare}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-gray-800 bg-gray-950 px-3 py-3 text-sm font-black text-white transition active:scale-[0.98] hover:border-yellow-400/40 hover:bg-gray-900"
                >
                  <Share2 size={16} />
                  Share profile
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/settings")}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-gray-800 bg-gray-950 text-gray-300 transition active:scale-95 hover:border-yellow-400/40 hover:text-yellow-400"
                  title="Settings"
                >
                  <Settings size={18} />
                </button>
              </div>

              {/* JOINED */}
              <p className="mt-3 text-[11px] text-gray-600">
                Joined {formatDate(profile.created_at)}
              </p>
            </div>
          </motion.section>

          {/* =================================================
              TABS + CONTENT CARD
          ================================================= */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="overflow-hidden rounded-[28px] border border-gray-800 bg-gray-900"
          >
            {/* Tabs */}
            <div className="grid grid-cols-3 border-b border-gray-800">
              {[
                { key: "all", label: "All" },
                { key: "posts", label: "Posts" },
                { key: "reels", label: "Friends" },
              ].map((tab) => {
                const active = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`relative flex h-14 items-center justify-center text-sm font-black transition ${
                      active
                        ? "text-yellow-400"
                        : "text-gray-500 active:text-gray-300"
                    }`}
                  >
                    {tab.label}
                    {active && (
                      <motion.div
                        layoutId="profile-tab-underline"
                        className="absolute bottom-0 left-0 right-0 h-[2px] bg-yellow-400"
                        transition={{
                          type: "spring",
                          stiffness: 380,
                          damping: 30,
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Content */}
            <div className="min-h-[380px] p-3">
              {loadingPosts ? (
                <div className="grid grid-cols-3 gap-1.5">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square animate-pulse rounded-2xl bg-gray-950"
                    />
                  ))}
                </div>
              ) : postsList.length === 0 ? (
                <PostsEmptyState onUpload={() => navigate("/upload")} />
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {postsList.map((post, index) => (
                    <motion.button
                      key={post.id}
                      type="button"
                      onClick={() => setActivePost(post)}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(index * 0.03, 0.4) }}
                      className="group relative aspect-square overflow-hidden rounded-2xl bg-gray-950"
                    >
                      {post.video_url ? (
                        <>
                          <video
                            src={post.video_url}
                            className="h-full w-full object-cover"
                            muted
                            playsInline
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                            <PlaySquare size={24} className="text-white drop-shadow" />
                          </div>
                        </>
                      ) : (
                        <>
                          <img
                            src={post.image_url}
                            alt={post.caption || "Post"}
                            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            loading="lazy"
                          />
                          <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/50 opacity-0 transition group-hover:opacity-100">
                            <div className="flex items-center gap-1 text-white">
                              <Heart size={14} fill="currentColor" />
                              <span className="text-xs font-bold">
                                {post.likes_count || 0}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-white">
                              <MessageCircle size={14} fill="currentColor" />
                              <span className="text-xs font-bold">
                                {post.comments_count || 0}
                              </span>
                            </div>
                          </div>
                        </>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>

          {/* FOOTER */}
          <div className="py-6 text-center">
            <p className="text-xs text-gray-600">
              cur<span className="text-yellow-400">.</span>book
            </p>
          </div>
        </div>
      </div>

      {/* =================================================
          POST VIEWER — likes, comments, likeable comments
      ================================================= */}
      <AnimatePresence>
        {activePost && (
          <PostViewer
            post={activePost}
            currentUser={user}
            onClose={() => setActivePost(null)}
            onCountsChange={(postId, { likes, comments }) => {
              setPosts((prev) =>
                prev.map((p) =>
                  p.id === postId
                    ? { ...p, likes_count: likes, comments_count: comments }
                    : p
                )
              );
            }}
          />
        )}
      </AnimatePresence>

      {/* =================================================
          EDIT MODAL — Android bottom sheet
      ================================================= */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-end justify-center bg-black/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="w-full max-w-lg max-h-[92vh] overflow-hidden rounded-t-[28px] border-t border-gray-800 bg-gray-950 shadow-2xl"
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="h-1 w-10 rounded-full bg-gray-800" />
              </div>

              <div className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
                <h2 className="text-base font-black text-white">Edit Profile</h2>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-gray-400 transition active:scale-95 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="max-h-[65vh] space-y-4 overflow-y-auto p-4">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-900 ring-2 ring-yellow-400/40">
                      {avatarPreview ? (
                        <img
                          src={avatarPreview}
                          alt="Profile"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-400 to-yellow-500 text-3xl font-black text-gray-950">
                          {getInitial()}
                        </div>
                      )}
                    </div>

                    <label
                      htmlFor="modal-avatar-upload"
                      className="absolute -bottom-1 -right-1 flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-yellow-400 text-gray-950 ring-2 ring-gray-950 transition active:scale-95"
                    >
                      <Camera size={15} strokeWidth={3} />
                      <input
                        id="modal-avatar-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Username
                  </label>
                  <input
                    type="text"
                    value={profile.username}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, username: e.target.value }))
                    }
                    placeholder="Username"
                    className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Full name
                  </label>
                  <input
                    type="text"
                    value={profile.full_name}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, full_name: e.target.value }))
                    }
                    placeholder="Full name"
                    className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-[10px] font-black uppercase tracking-widest text-gray-500">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder="Write something about yourself..."
                    rows={3}
                    maxLength={300}
                    className="w-full resize-none rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20"
                  />
                  <p className="mt-1 text-right text-[10px] text-gray-600">
                    {profile.bio.length}/300
                  </p>
                </div>
              </div>

              <div className="flex gap-2 border-t border-gray-800 p-4 pb-6">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-2xl border border-gray-800 bg-gray-900 py-3.5 text-sm font-bold text-gray-300 transition active:scale-[0.98] hover:bg-gray-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-yellow-400 py-3.5 text-sm font-black text-gray-950 shadow-lg shadow-yellow-400/20 transition active:scale-[0.98] hover:bg-yellow-300 disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={17} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={17} />
                      Save
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================
          CROP MODAL
      ================================================= */}
      <AnimatePresence>
        {showEditor && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-3"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl overflow-hidden rounded-[28px] border border-gray-800 bg-gray-950 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-800 px-5 py-3">
                <div>
                  <h2 className="text-base font-black text-white">
                    Edit Profile Picture
                  </h2>
                  <p className="text-[11px] text-gray-500">
                    Move and zoom your image.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-900 text-gray-400 transition active:scale-95 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="relative h-[400px] w-full bg-black">
                <Cropper
                  image={selectedImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={true}
                  onCropChange={handleCropChange}
                  onCropComplete={handleCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              <div className="space-y-4 p-4">
                <div>
                  <div className="mb-2 flex justify-between">
                    <span className="text-sm font-bold text-gray-300">Zoom</span>
                    <span className="text-xs text-gray-500">
                      {zoom.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(e) => setZoom(Number(e.target.value))}
                    className="w-full accent-yellow-400"
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancelCrop}
                    className="flex-1 rounded-2xl border border-gray-800 bg-gray-900 py-3.5 text-sm font-bold text-gray-300 transition active:scale-[0.98] hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    className="flex-1 rounded-2xl bg-yellow-400 py-3.5 text-sm font-black text-gray-950 transition active:scale-[0.98] hover:bg-yellow-300"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* =================================================
          TOAST — Android snackbar (bottom)
      ================================================= */}
      <AnimatePresence>
        {(message || error) && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="pointer-events-none fixed bottom-5 left-1/2 z-[110] w-[calc(100%-24px)] max-w-sm -translate-x-1/2"
          >
            <div
              className={`
                pointer-events-auto flex items-center gap-3 rounded-2xl border px-4 py-3 shadow-2xl backdrop-blur-md
                ${
                  message
                    ? "border-yellow-400/30 bg-yellow-400/10 text-yellow-400"
                    : "border-red-500/30 bg-red-500/10 text-red-300"
                }
              `}
            >
              {message ? <Check size={16} /> : <X size={16} />}
              <p className="flex-1 text-xs font-semibold">{message || error}</p>
              <button
                onClick={() => {
                  setMessage("");
                  setError("");
                }}
                className="text-current opacity-60 hover:opacity-100"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// =========================================================
// EMPTY STATE
// =========================================================
function PostsEmptyState({ onUpload }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[300px] flex-col items-center justify-center px-6 py-10 text-center"
    >
      <div className="relative">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gray-800">
          <Camera size={32} className="text-gray-600" />
        </div>
        <div className="absolute -right-1.5 -top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-gray-950 shadow-lg shadow-yellow-400/30">
          <Sparkles size={13} strokeWidth={3} />
        </div>
      </div>

      <h3 className="mt-5 text-base font-black text-white">No posts yet</h3>

      <p className="mt-1.5 max-w-[240px] text-xs text-gray-500">
        When you share photos, they'll appear on your profile.
      </p>

      <button
        type="button"
        onClick={onUpload}
        className="mt-5 flex items-center gap-2 rounded-2xl bg-yellow-400 px-5 py-3 text-xs font-black text-gray-950 shadow-lg shadow-yellow-400/20 transition active:scale-95 hover:bg-yellow-300"
      >
        <ImageIcon size={14} strokeWidth={3} />
        Share your first photo
      </button>
    </motion.div>
  );
}