import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Check,
  Edit3,
  Loader2,
  Mail,
  Save,
  User,
  X,
  ZoomIn,
  ZoomOut,
  Calendar,
  Award,
  Shield,
  Settings,
  Bell,
  LogOut,
  Users,
  BookOpen,
} from "lucide-react";
import Cropper from "react-easy-crop";
import { supabase } from "../lib/supabaseClient";

export default function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");

  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Image editor
  const [showCropper, setShowCropper] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  // Stats
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
  });

  useEffect(() => {
    loadProfile();
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
        .maybeSingle();

      if (profileError) throw profileError;

      if (data) {
        setProfile(data);
        setUsername(data.username || "");
        setFullName(data.full_name || "");
        setBio(data.bio || "");
        setAvatarPreview(data.avatar_url || "");
      }

      // Load stats (simulated - you can replace with real data)
      setStats({
        posts: 12,
        followers: 156,
        following: 89,
      });

    } catch (err) {
      console.error("Profile loading error:", err);
      setError("Unable to load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile image must be smaller than 5MB.");
      return;
    }

    setError("");
    setSuccess("");

    const imageUrl = URL.createObjectURL(file);
    setSelectedImage(imageUrl);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setShowCropper(true);
    event.target.value = "";
  };

  const handleCropChange = (newCrop) => setCrop(newCrop);
  const handleCropComplete = (_, croppedPixels) => setCroppedAreaPixels(croppedPixels);

  const createCroppedImage = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Unable to create image editor.");

    const outputSize = 800;
    canvas.width = outputSize;
    canvas.height = outputSize;

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";

    context.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      outputSize,
      outputSize
    );

    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) reject(new Error("Unable to process the image."));
          else resolve(blob);
        },
        "image/jpeg",
        0.92
      );
    });
  };

  const handleApplyCrop = async () => {
    if (!selectedImage || !croppedAreaPixels) {
      setError("Please select an area of the image.");
      return;
    }

    try {
      setError("");
      const croppedBlob = await createCroppedImage(selectedImage, croppedAreaPixels);
      const previewUrl = URL.createObjectURL(croppedBlob);
      const croppedFile = new File([croppedBlob], "profile-image.jpg", {
        type: "image/jpeg",
      });

      setAvatarFile(croppedFile);
      setAvatarPreview(previewUrl);
      setShowCropper(false);
      URL.revokeObjectURL(selectedImage);
      setSelectedImage(null);
      setSuccess("Profile picture edited. Click Save Changes to upload it.");
    } catch (err) {
      console.error("Image crop error:", err);
      setError("Unable to edit the profile image. Please try again.");
    }
  };

  const handleCancelCrop = () => {
    if (selectedImage) URL.revokeObjectURL(selectedImage);
    setSelectedImage(null);
    setShowCropper(false);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  };

  const uploadAvatar = async () => {
    if (!avatarFile || !user) return profile?.avatar_url || null;

    try {
      setUploadingAvatar(true);
      const filePath = `${user.id}/profile-${crypto.randomUUID()}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, avatarFile, {
          cacheControl: "3600",
          contentType: "image/jpeg",
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
      return data.publicUrl;
    } catch (err) {
      console.error("Avatar upload error:", err);
      throw new Error("Unable to upload your profile image.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!username.trim()) {
        setError("Username is required.");
        setSaving(false);
        return;
      }

      if (username.trim().length < 3) {
        setError("Username must contain at least 3 characters.");
        setSaving(false);
        return;
      }

      let avatarUrl = profile?.avatar_url || null;
      if (avatarFile) {
        avatarUrl = await uploadAvatar();
      }

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          username: username.trim(),
          full_name: fullName.trim() || null,
          bio: bio.trim() || null,
          avatar_url: avatarUrl,
        })
        .eq("id", user.id)
        .select("id, username, full_name, bio, avatar_url, created_at")
        .single();

      if (updateError) throw updateError;

      setProfile(data);
      setUsername(data.username || "");
      setFullName(data.full_name || "");
      setBio(data.bio || "");
      setAvatarPreview(data.avatar_url || "");
      setAvatarFile(null);
      setEditing(false);
      setSuccess("Profile updated successfully.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      console.error("Profile update error:", err);
      if (err?.code === "23505") {
        setError("That username is already taken.");
      } else {
        setError(err?.message || "Unable to update your profile. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setUsername(profile?.username || "");
    setFullName(profile?.full_name || "");
    setBio(profile?.bio || "");
    setAvatarPreview(profile?.avatar_url || "");
    setAvatarFile(null);
    setError("");
    setSuccess("");
    setEditing(false);
    if (selectedImage) URL.revokeObjectURL(selectedImage);
    setSelectedImage(null);
    setShowCropper(false);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

  const createImage = (url) =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener("load", () => resolve(image));
      image.addEventListener("error", (error) => reject(error));
      image.setAttribute("crossOrigin", "anonymous");
      image.src = url;
    });

  const formatDate = (date) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
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
          <p className="mt-6 font-semibold text-gray-500">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[#f8f7f4] text-[#111827]">
        <main className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">

          {/* ================= PAGE HEADER ================= */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center gap-4"
          >
            <button
              onClick={() => navigate("/home")}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/80 backdrop-blur-sm border border-gray-200/60 text-gray-700 shadow-sm transition hover:border-[#facc15] hover:bg-[#facc15]/10 hover:shadow-md"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#facc15]">
                Account
              </p>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-[#111827] to-[#4b5563] bg-clip-text text-transparent">
                My Profile
              </h1>
            </div>
          </motion.div>

          {/* ================= SUCCESS & ERROR ================= */}
          <AnimatePresence>
            {success && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 flex items-center gap-3 rounded-2xl bg-[#facc15]/20 border border-[#facc15]/30 backdrop-blur-sm px-5 py-4"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#facc15]">
                  <Check size={18} className="text-[#111827]" />
                </div>
                <p className="text-sm font-bold text-[#111827]">{success}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6 flex items-center justify-between gap-4 rounded-2xl bg-red-50/80 backdrop-blur-sm border border-red-200/60 px-5 py-4"
            >
              <p className="text-sm font-semibold text-red-700">{error}</p>
              <button
                onClick={() => setError("")}
                className="rounded-lg p-1 text-red-400 transition hover:bg-red-100 hover:text-red-700"
              >
                <X size={18} />
              </button>
            </motion.div>
          )}

          {/* ================= PROFILE CARD ================= */}
          <motion.section
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="overflow-hidden rounded-3xl bg-white/80 backdrop-blur-sm border border-gray-200/60 shadow-sm"
          >
            {/* Cover */}
            <div className="relative h-40 bg-gradient-to-r from-[#111827] via-[#1a2332] to-[#0f172a] sm:h-48">
              <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-[#facc15]/20 blur-3xl" />
              <div className="absolute -bottom-20 -left-16 h-72 w-72 rounded-full bg-[#facc15]/10 blur-3xl" />
              <div className="absolute bottom-5 left-6 flex items-center gap-2">
                <span className="rounded-full bg-[#facc15] px-4 py-1.5 text-xs font-black text-[#111827] shadow-lg shadow-[#facc15]/30">
                  <Award size={12} className="inline mr-1" />
                  Verified Member
                </span>
              </div>
            </div>

            <div className="px-6 pb-7 sm:px-8">
              {/* Avatar & Actions */}
              <div className="-mt-14 flex flex-col gap-5 sm:-mt-16 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
                  <div className="relative group">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt={profile?.username || "Profile"}
                        className="h-28 w-28 rounded-3xl border-4 border-white object-cover shadow-xl sm:h-32 sm:w-32 ring-2 ring-[#facc15]/20"
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-3xl border-4 border-white bg-gradient-to-br from-[#facc15] to-[#fbbf24] text-[#111827] shadow-xl sm:h-32 sm:w-32">
                        <User size={48} />
                      </div>
                    )}

                    {editing && (
                      <label className="absolute -bottom-1 -right-1 flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl bg-[#facc15] text-[#111827] shadow-lg transition hover:scale-110 hover:bg-[#fbbf24]">
                        <Camera size={18} />
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleAvatarChange}
                          className="hidden"
                        />
                      </label>
                    )}
                  </div>

                  <div className="pb-1">
                    <h2 className="text-2xl sm:text-3xl font-extrabold">
                      {profile?.full_name || profile?.username || "User"}
                    </h2>
                    <p className="mt-0.5 text-sm font-semibold text-gray-500">
                      @{profile?.username || "username"}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        Joined {formatDate(profile?.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                {!editing ? (
                  <button
                    onClick={() => {
                      setEditing(true);
                      setError("");
                      setSuccess("");
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#111827] px-6 py-3 text-sm font-extrabold text-white transition hover:bg-[#facc15] hover:text-[#111827] shadow-md"
                  >
                    <Edit3 size={17} />
                    Edit Profile
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-gray-200/60 bg-white/80 backdrop-blur-sm px-5 py-3 text-sm font-extrabold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <X size={17} />
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving || uploadingAvatar}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#facc15] px-6 py-3 text-sm font-extrabold text-[#111827] transition hover:bg-[#fbbf24] disabled:cursor-not-allowed disabled:opacity-60 shadow-md shadow-[#facc15]/30"
                    >
                      {saving || uploadingAvatar ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save size={17} />
                          Save Changes
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {/* Bio */}
              <div className="mt-6 max-w-2xl">
                {editing ? (
                  <textarea
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell people something about yourself..."
                    rows={4}
                    maxLength={300}
                    className="w-full resize-none rounded-2xl border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm px-4 py-4 text-sm text-[#111827] outline-none transition placeholder:text-gray-400 focus:border-[#facc15] focus:bg-white focus:ring-4 focus:ring-[#facc15]/20"
                  />
                ) : (
                  <p className="text-sm leading-7 text-gray-600">
                    {profile?.bio || "No bio added yet. Tell people something about yourself."}
                  </p>
                )}
              </div>

              {/* Stats */}
              <div className="mt-6 flex items-center gap-8 border-t border-gray-200/60 pt-6">
                <div>
                  <p className="text-2xl font-extrabold text-[#111827]">{stats.posts}</p>
                  <p className="text-xs font-semibold text-gray-400">Posts</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-[#111827]">{stats.followers}</p>
                  <p className="text-xs font-semibold text-gray-400">Followers</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-[#111827]">{stats.following}</p>
                  <p className="text-xs font-semibold text-gray-400">Following</p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ================= ACCOUNT INFORMATION ================= */}
          <motion.section
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 rounded-3xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm sm:p-8"
          >
            <div className="mb-7">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-[#facc15] flex items-center gap-2">
                <Shield size={14} />
                Personal Information
              </p>
              <h2 className="mt-1 text-2xl font-extrabold">Account Information</h2>
              <p className="mt-2 text-sm text-gray-500">
                Manage the information connected to your CUR.BOOK account.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              {/* Username */}
              <div>
                <label className="mb-2 block text-sm font-extrabold text-gray-700">
                  Username
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter username"
                    maxLength={30}
                    className="w-full rounded-2xl border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm px-4 py-3.5 text-sm font-medium outline-none transition focus:border-[#facc15] focus:bg-white focus:ring-4 focus:ring-[#facc15]/20"
                  />
                ) : (
                  <div className="rounded-2xl border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm px-4 py-3.5">
                    <p className="text-sm font-semibold text-gray-800">
                      @{profile?.username || "Not set"}
                    </p>
                  </div>
                )}
              </div>

              {/* Full Name */}
              <div>
                <label className="mb-2 block text-sm font-extrabold text-gray-700">
                  Full Name
                </label>
                {editing ? (
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    maxLength={100}
                    className="w-full rounded-2xl border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm px-4 py-3.5 text-sm font-medium outline-none transition focus:border-[#facc15] focus:bg-white focus:ring-4 focus:ring-[#facc15]/20"
                  />
                ) : (
                  <div className="rounded-2xl border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm px-4 py-3.5">
                    <p className="text-sm font-semibold text-gray-800">
                      {profile?.full_name || "Not set"}
                    </p>
                  </div>
                )}
              </div>

              {/* Email */}
              <div>
                <label className="mb-2 block text-sm font-extrabold text-gray-700">
                  Email Address
                </label>
                <div className="flex items-center gap-3 rounded-2xl border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm px-4 py-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#facc15] text-[#111827]">
                    <Mail size={17} />
                  </div>
                  <p className="min-w-0 truncate text-sm font-semibold text-gray-800">
                    {user?.email || "No email"}
                  </p>
                </div>
                <p className="mt-2 text-xs text-gray-400">
                  Your email is managed by your authentication account.
                </p>
              </div>

              {/* Member Since */}
              <div>
                <label className="mb-2 block text-sm font-extrabold text-gray-700">
                  Member Since
                </label>
                <div className="rounded-2xl border border-gray-200/60 bg-gray-50/80 backdrop-blur-sm px-4 py-3.5">
                  <p className="text-sm font-semibold text-gray-800">
                    {formatDate(profile?.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </motion.section>

          {/* ================= QUICK ACTIONS ================= */}
          <motion.section
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 grid gap-4 sm:grid-cols-2"
          >
            {[
              { to: "/settings", icon: Settings, label: "Account Settings", desc: "Manage your account preferences", color: "bg-[#111827] text-white" },
              { to: "/notifications", icon: Bell, label: "Notifications", desc: "Check your latest updates", color: "bg-[#facc15] text-[#111827]" },
              { to: "/my-posts", icon: BookOpen, label: "My Posts", desc: "View all your published content", color: "bg-[#111827] text-white" },
              { to: "/community", icon: Users, label: "Community", desc: "Connect with other members", color: "bg-[#facc15] text-[#111827]" },
            ].map((item, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * idx }}
              >
                <Link
                  to={item.to}
                  className="group block rounded-3xl bg-white/80 backdrop-blur-sm border border-gray-200/60 p-6 shadow-sm transition hover:-translate-y-1 hover:border-[#facc15] hover:shadow-xl"
                >
                  <div className="flex items-center justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${item.color} transition group-hover:scale-105`}>
                      <item.icon size={22} className={item.color.includes("text-white") ? "text-white" : "text-[#111827]"} />
                    </div>
                    <span className="text-gray-400 transition group-hover:translate-x-1 group-hover:text-[#facc15]">
                      →
                    </span>
                  </div>
                  <h3 className="mt-5 text-lg font-extrabold">{item.label}</h3>
                  <p className="mt-2 text-sm leading-6 text-gray-500">{item.desc}</p>
                </Link>
              </motion.div>
            ))}
          </motion.section>

          {/* ================= LOGOUT ================= */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 text-center"
          >
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/login");
              }}
              className="inline-flex items-center gap-2 text-sm font-extrabold text-red-500 transition hover:text-red-600 hover:scale-105"
            >
              <LogOut size={17} />
              Sign Out
            </button>
          </motion.div>

        </main>
      </div>

      {/* ================= IMAGE CROPPER MODAL ================= */}
      <AnimatePresence>
        {showCropper && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[999] flex items-center justify-center bg-gray-950/90 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25 }}
              className="w-full max-w-2xl overflow-hidden rounded-3xl bg-white shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-200/60 px-5 py-4 sm:px-6">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-[#facc15]">
                    Profile Picture
                  </p>
                  <h2 className="mt-1 text-xl font-extrabold text-gray-900">
                    Edit Image
                  </h2>
                </div>
                <button
                  onClick={handleCancelCrop}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 text-gray-600 transition hover:bg-gray-200 hover:text-gray-900"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Cropper */}
              <div className="relative h-[350px] w-full bg-gray-950 sm:h-[450px]">
                <Cropper
                  image={selectedImage}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={true}
                  objectFit="contain"
                  onCropChange={handleCropChange}
                  onCropComplete={handleCropComplete}
                  onZoomChange={setZoom}
                />
              </div>

              {/* Controls */}
              <div className="space-y-5 bg-white p-5 sm:p-6">
                {/* Zoom */}
                <div>
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ZoomOut size={17} className="text-gray-500" />
                      <span className="text-sm font-extrabold text-gray-800">Zoom</span>
                      <ZoomIn size={17} className="text-gray-500" />
                    </div>
                    <span className="rounded-lg bg-gray-100 px-3 py-1 text-xs font-extrabold text-gray-700">
                      {zoom.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={zoom}
                    onChange={(event) => setZoom(Number(event.target.value))}
                    className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-[#facc15]"
                  />
                </div>

                {/* Info */}
                <div className="rounded-2xl bg-gray-50/80 backdrop-blur-sm px-4 py-3">
                  <p className="text-center text-xs font-semibold leading-5 text-gray-500">
                    Drag the image to position it. Use the slider to zoom in or out.
                    The circular area shows your final profile picture.
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    onClick={handleCancelCrop}
                    className="flex items-center justify-center gap-2 rounded-xl border border-gray-200/60 bg-white/80 backdrop-blur-sm px-6 py-3 font-extrabold text-gray-700 transition hover:bg-gray-100"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                  <button
                    onClick={handleApplyCrop}
                    className="flex items-center justify-center gap-2 rounded-xl bg-[#facc15] px-6 py-3 font-extrabold text-[#111827] shadow-lg shadow-[#facc15]/30 transition hover:bg-[#fbbf24]"
                  >
                    <Check size={18} />
                    Apply Edit
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