import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Camera, Check, Edit3, Grid3X3, Heart, Loader2,
  MoreHorizontal, PlaySquare, Save, Settings, Share2, Tag, User,
  X, MessageCircle, Image as ImageIcon, Sparkles,
} from "lucide-react";
import Cropper from "react-easy-crop";
import { supabase } from "../lib/supabaseClient";

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

  const [activeTab, setActiveTab] = useState("posts");

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

  const loadPosts = async (userId) => {
    try {
      setLoadingPosts(true);

      const { data, error: e } = await supabase
        .from("posts")
        .select("id, image_url, video_url, caption, likes_count, comments_count, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (e) throw e;
      setPosts(data || []);
    } catch (err) {
      console.error("Posts loading error:", err);
    } finally {
      setLoadingPosts(false);
    }
  };

  // =========================================================
  // AVATAR CROP
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

  const formatShortDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString([], { day: "numeric", month: "short" });
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
    if (activeTab === "posts") return posts.filter((p) => p.image_url && !p.video_url);
    if (activeTab === "reels") return posts.filter((p) => p.video_url);
    return [];
  }, [posts, activeTab]);

  const totalPosts = posts.length;

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="mx-auto max-w-3xl">
          <div className="h-14 border-b border-gray-800 animate-pulse bg-gray-900" />
          <div className="px-5 py-8">
            <div className="flex items-center gap-8">
              <div className="h-24 w-24 rounded-full bg-gray-800 animate-pulse sm:h-32 sm:w-32" />
              <div className="flex-1 space-y-3">
                <div className="h-5 w-40 rounded bg-gray-800 animate-pulse" />
                <div className="h-4 w-64 rounded bg-gray-800 animate-pulse" />
                <div className="h-4 w-48 rounded bg-gray-800 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================
  return (
    <>
      <div className="min-h-screen bg-gray-950 text-white">
        <div className="mx-auto w-full max-w-3xl">

          {/* ================= TOP BAR ================= */}
          <motion.header
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-800 bg-gray-950/95 px-4 backdrop-blur"
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-900 hover:text-white"
            >
              <ArrowLeft size={22} />
            </button>

            <h1 className="text-base font-bold">
              {profile.username ? `@${profile.username}` : "Profile"}
            </h1>

            <button
              type="button"
              className="flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-900 hover:text-white"
            >
              <MoreHorizontal size={23} />
            </button>
          </motion.header>

          {/* ================= PROFILE HEADER ================= */}
          <motion.section
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="px-5 pb-6 pt-7"
          >
            <div className="flex items-start gap-6 sm:gap-10">

              {/* AVATAR */}
              <div className="relative shrink-0">
                <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-900 ring-1 ring-gray-800 sm:h-32 sm:w-32">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-400 to-yellow-500 text-4xl font-black text-gray-950">
                      {getInitial()}
                    </div>
                  )}
                </div>

                <label
                  htmlFor="avatar-upload"
                  className="group absolute inset-0 flex cursor-pointer items-center justify-center rounded-full bg-black/0 opacity-0 transition hover:bg-black/40 hover:opacity-100"
                  title="Change picture"
                >
                  <Camera size={26} className="text-white drop-shadow" />
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
              <div className="flex flex-1 items-center justify-around pt-3">
                <button className="text-center transition hover:opacity-70">
                  <p className="text-xl font-bold text-white">{totalPosts}</p>
                  <p className="text-xs text-gray-500">Posts</p>
                </button>

                <button className="text-center transition hover:opacity-70">
                  <p className="text-xl font-bold text-white">0</p>
                  <p className="text-xs text-gray-500">Followers</p>
                </button>

                <button className="text-center transition hover:opacity-70">
                  <p className="text-xl font-bold text-white">0</p>
                  <p className="text-xs text-gray-500">Following</p>
                </button>
              </div>
            </div>

            {/* NAME + BIO */}
            <div className="mt-5">
              <h2 className="text-base font-bold text-white">
                {profile.full_name || profile.username || "User"}
              </h2>

              {profile.username && (
                <p className="mt-0.5 text-sm text-gray-500">@{profile.username}</p>
              )}

              {profile.bio ? (
                <p className="mt-3 whitespace-pre-line text-sm leading-5 text-gray-300">
                  {profile.bio}
                </p>
              ) : (
                <p className="mt-3 text-sm italic text-gray-600">No bio yet.</p>
              )}
            </div>

            {/* BUTTONS */}
            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-400 px-4 py-2.5 text-sm font-black text-gray-950 shadow-md shadow-yellow-400/20 transition hover:bg-yellow-300 active:scale-[0.98]"
              >
                <Edit3 size={16} />
                Edit Profile
              </button>

              <button
                type="button"
                onClick={handleShare}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm font-bold text-gray-200 transition hover:border-yellow-400/40 hover:bg-gray-800 hover:text-yellow-400 active:scale-[0.98]"
              >
                <Share2 size={16} />
                Share Profile
              </button>

              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-xl border border-gray-800 bg-gray-900 text-gray-400 transition hover:border-yellow-400/40 hover:bg-gray-800 hover:text-yellow-400 active:scale-[0.98]"
                title="Settings"
              >
                <Settings size={17} />
              </button>
            </div>

            {/* MEMBER INFO */}
            <p className="mt-4 text-xs text-gray-500">
              Joined {formatDate(profile.created_at)}
            </p>
          </motion.section>

          {/* ================= MESSAGES ================= */}
          <AnimatePresence>
            {(message || error) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {message && (
                  <div className="mx-5 mb-4 flex items-center gap-2 rounded-xl border border-yellow-400/30 bg-yellow-400/10 px-4 py-3 text-sm font-semibold text-yellow-400">
                    <Check size={17} />
                    {message}
                  </div>
                )}
                {error && (
                  <div className="mx-5 mb-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm font-medium text-red-300">
                    {error}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ================= TABS ================= */}
          <div className="sticky top-14 z-20 grid grid-cols-3 border-y border-gray-800 bg-gray-950">
            {[
              { key: "posts", icon: Grid3X3 },
              { key: "reels", icon: PlaySquare },
              { key: "tagged", icon: Tag },
            ].map(({ key, icon: Icon }) => {
              const active = activeTab === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setActiveTab(key)}
                  className={`relative flex h-12 items-center justify-center transition ${
                    active
                      ? "text-yellow-400"
                      : "text-gray-500 hover:text-gray-300"
                  }`}
                >
                  <Icon size={21} />
                  {active && (
                    <motion.div
                      layoutId="profile-tab"
                      className="absolute bottom-0 h-[2px] w-full bg-yellow-400"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* ================= TAB CONTENT ================= */}
          {activeTab === "posts" && (
            <>
              {loadingPosts ? (
                <div className="grid grid-cols-3 gap-[2px] bg-gray-950">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-900 animate-pulse" />
                  ))}
                </div>
              ) : postsList.length === 0 ? (
                <PostsEmptyState onUpload={() => navigate("/upload")} />
              ) : (
                <div className="grid grid-cols-3 gap-[2px] bg-gray-950">
                  {postsList.map((post, index) => (
                    <motion.button
                      key={post.id}
                      type="button"
                      onClick={() => setActivePost(post)}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(index * 0.03, 0.4) }}
                      className="group relative aspect-square overflow-hidden bg-gray-900"
                    >
                      <img
                        src={post.image_url}
                        alt={post.caption || "Post"}
                        className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />

                      {/* Hover overlay */}
                      <div className="absolute inset-0 flex items-center justify-center gap-6 bg-black/50 opacity-0 transition group-hover:opacity-100">
                        <div className="flex items-center gap-1.5 text-white">
                          <Heart size={18} fill="currentColor" />
                          <span className="text-sm font-bold">
                            {post.likes_count || 0}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-white">
                          <MessageCircle size={18} fill="currentColor" />
                          <span className="text-sm font-bold">
                            {post.comments_count || 0}
                          </span>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "reels" && (
            <>
              {loadingPosts ? (
                <div className="grid grid-cols-3 gap-[2px] bg-gray-950">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="aspect-square bg-gray-900 animate-pulse" />
                  ))}
                </div>
              ) : postsList.length === 0 ? (
                <EmptyTab
                  icon={PlaySquare}
                  title="No Reels Yet"
                  description="Short videos you share will appear here."
                />
              ) : (
                <div className="grid grid-cols-3 gap-[2px] bg-gray-950">
                  {postsList.map((post) => (
                    <button
                      key={post.id}
                      type="button"
                      onClick={() => setActivePost(post)}
                      className="group relative aspect-square overflow-hidden bg-gray-900"
                    >
                      <video
                        src={post.video_url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <PlaySquare size={28} className="text-white drop-shadow" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {activeTab === "tagged" && (
            <EmptyTab
              icon={Tag}
              title="Photos of You"
              description="Photos and videos you're tagged in will appear here."
            />
          )}

          {/* FOOTER */}
          <div className="px-5 py-10 text-center">
            <p className="text-xs text-gray-600">
              cur<span className="text-yellow-400">.</span>book
            </p>
          </div>
        </div>
      </div>

      {/* ================= POST PREVIEW MODAL ================= */}
      <AnimatePresence>
        {activePost && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setActivePost(null)}
              className="fixed inset-0 z-[95] bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
            >
              <div className="relative max-h-[90vh] max-w-3xl w-full overflow-hidden rounded-3xl bg-black shadow-2xl pointer-events-auto border border-gray-800">
                <button
                  onClick={() => setActivePost(null)}
                  className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur hover:bg-black/80"
                >
                  <X size={18} />
                </button>

                {activePost.video_url ? (
                  <video
                    src={activePost.video_url}
                    controls
                    autoPlay
                    className="max-h-[80vh] w-full"
                  />
                ) : (
                  <img
                    src={activePost.image_url}
                    alt={activePost.caption || "Post"}
                    className="max-h-[80vh] w-full object-contain"
                  />
                )}

                {(activePost.caption || activePost.created_at) && (
                  <div className="p-4 bg-gray-950 text-white border-t border-gray-800">
                    {activePost.caption && (
                      <p className="text-sm leading-6">{activePost.caption}</p>
                    )}
                    <p className="mt-2 text-[11px] text-gray-500">
                      {formatShortDate(activePost.created_at)}
                    </p>
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ================= EDIT PROFILE MODAL ================= */}
      <AnimatePresence>
        {editing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.97 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-gray-950 border border-gray-800 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
                <h2 className="text-lg font-bold text-white">Edit Profile</h2>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-gray-400 transition hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-5 p-5 max-h-[70vh] overflow-y-auto">
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="h-24 w-24 overflow-hidden rounded-full bg-gray-900 ring-2 ring-yellow-400/40">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-yellow-400 to-yellow-500 text-3xl font-black text-gray-950">
                          {getInitial()}
                        </div>
                      )}
                    </div>

                    <label
                      htmlFor="modal-avatar-upload"
                      className="absolute bottom-0 right-0 flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-yellow-400 text-gray-950 ring-2 ring-gray-950 transition hover:scale-105"
                    >
                      <Camera size={15} />
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
                  <label className="mb-2 block text-sm font-bold text-gray-300">
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
                  <label className="mb-2 block text-sm font-bold text-gray-300">
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
                  <label className="mb-2 block text-sm font-bold text-gray-300">
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder="Write something about yourself..."
                    rows={4}
                    maxLength={300}
                    className="w-full resize-none rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none transition focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/20"
                  />
                  <p className="mt-1 text-right text-xs text-gray-600">
                    {profile.bio.length}/300
                  </p>
                </div>
              </div>

              <div className="flex gap-3 border-t border-gray-800 p-5">
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="flex-1 rounded-xl border border-gray-800 bg-gray-900 py-3 text-sm font-bold text-gray-300 transition hover:bg-gray-800"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-yellow-400 py-3 text-sm font-black text-gray-950 shadow-md shadow-yellow-400/20 transition hover:bg-yellow-300 disabled:opacity-60"
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

      {/* ================= CROP MODAL ================= */}
      <AnimatePresence>
        {showEditor && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl overflow-hidden rounded-2xl bg-gray-950 border border-gray-800 shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Edit Profile Picture
                  </h2>
                  <p className="text-xs text-gray-500">Move and zoom your image.</p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-900 text-gray-400 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="relative h-[400px] w-full bg-black sm:h-[500px]">
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

              <div className="space-y-5 p-5">
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

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={handleCancelCrop}
                    className="flex-1 rounded-xl border border-gray-800 bg-gray-900 py-3 text-sm font-bold text-gray-300 hover:bg-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    className="flex-1 rounded-xl bg-yellow-400 py-3 text-sm font-black text-gray-950 hover:bg-yellow-300"
                  >
                    Apply
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// =========================================================
// SUB-COMPONENTS
// =========================================================
function PostsEmptyState({ onUpload }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[400px] flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center rounded-full border-2 border-gray-800">
          <Camera size={40} className="text-gray-600" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-8 w-8 items-center justify-center rounded-full bg-yellow-400 text-gray-950 shadow-lg shadow-yellow-400/30">
          <Sparkles size={15} />
        </div>
      </div>

      <h3 className="mt-6 text-xl font-bold text-white">Share Photos</h3>

      <p className="mt-2 max-w-xs text-sm text-gray-500">
        When you share photos, they'll appear on your profile.
      </p>

      <button
        type="button"
        onClick={onUpload}
        className="mt-6 flex items-center gap-2 rounded-xl bg-yellow-400 px-5 py-2.5 text-sm font-black text-gray-950 shadow-md shadow-yellow-400/20 transition hover:bg-yellow-300 active:scale-[0.98]"
      >
        <ImageIcon size={16} />
        Share your first photo
      </button>
    </motion.div>
  );
}

function EmptyTab({ icon: Icon, title, description }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex min-h-[300px] flex-col items-center justify-center px-6 py-16 text-center"
    >
      <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-gray-800">
        <Icon size={32} className="text-gray-600" />
      </div>
      <h3 className="mt-5 text-lg font-bold text-white">{title}</h3>
      <p className="mt-1 max-w-xs text-sm text-gray-500">{description}</p>
    </motion.div>
  );
}