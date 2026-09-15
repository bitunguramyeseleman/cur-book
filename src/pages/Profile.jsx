import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Camera,
  Check,
  Image as ImageIcon,
  Loader2,
  Save,
  Settings,
  User,
  X,
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

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Image editor states
  const [selectedImage, setSelectedImage] = useState(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [showEditor, setShowEditor] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState("");

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
    } catch (err) {
      console.error("Profile loading error:", err);
      setError(err.message || "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

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
  const handleCropComplete = (_, croppedPixels) => setCroppedAreaPixels(croppedPixels);

  const createCroppedImage = async (imageSrc, pixelCrop) => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Could not create image editor.");

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
          if (!blob) reject(new Error("Failed to create cropped image."));
          else resolve(blob);
        },
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
      setProfile((previous) => ({ ...previous, avatar_url: previewUrl }));

      window.__curBookCroppedAvatar = croppedBlob;

      setShowEditor(false);
      URL.revokeObjectURL(selectedImage);
      setSelectedImage(null);

      setMessage("Profile picture edited. Click Save Profile to upload it.");
    } catch (err) {
      console.error("Crop error:", err);
      setError(err.message || "Failed to edit the image.");
    }
  };

  const handleCancelCrop = () => {
    if (selectedImage) URL.revokeObjectURL(selectedImage);
    setSelectedImage(null);
    setShowEditor(false);
    setZoom(1);
    setCrop({ x: 0, y: 0 });
  };

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

        const {
          data: { publicUrl },
        } = supabase.storage.from("avatars").getPublicUrl(filePath);

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

      setProfile((previous) => ({
        ...previous,
        username: data.username || "",
        full_name: data.full_name || "",
        bio: data.bio || "",
        avatar_url: data.avatar_url || "",
      }));

      setAvatarPreview(data.avatar_url || "");
      setMessage("Profile updated successfully.");

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Profile save error:", err);
      setError(err.message || "Failed to update your profile.");
    } finally {
      setSaving(false);
    }
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
    return new Date(date).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-10">
        <div className="mx-auto max-w-4xl">
          <div className="animate-pulse space-y-6">
            <div className="h-12 w-52 rounded-xl bg-gray-900" />
            <div className="h-72 rounded-3xl bg-gray-900" />
            <div className="h-96 rounded-3xl bg-gray-900" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-950 px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">

          {/* PAGE HEADER */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="flex items-center gap-4">
              {/* BACK BUTTON */}
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 border border-gray-800 text-gray-300 shadow-sm transition hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-400"
                title="Go back"
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-gray-950 shadow-lg shadow-yellow-400/20">
                    <User size={24} />
                  </div>

                  <h1 className="text-3xl font-black tracking-tight text-white">
                    My Profile
                  </h1>
                </div>

                <p className="text-sm text-gray-400">
                  Manage your cur.book profile and personal information.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-800 bg-gray-900 px-5 py-3 font-semibold text-gray-300 shadow-sm transition hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-400"
            >
              <Settings size={18} />
              Settings
            </button>
          </motion.div>

          {/* MESSAGES */}
          <AnimatePresence>
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 flex items-center gap-3 rounded-2xl border border-yellow-400/30 bg-yellow-400/10 px-5 py-4 text-sm font-semibold text-white"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-yellow-400">
                  <Check size={17} className="text-gray-950" />
                </div>
                <span>{message}</span>
              </motion.div>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-medium text-red-300"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* PROFILE HERO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 overflow-hidden rounded-3xl border border-gray-800 bg-gray-900 shadow-sm"
          >
            <div className="h-32 bg-black">
              <div className="h-full bg-gradient-to-r from-black via-gray-900 to-yellow-400/20" />
            </div>

            <div className="px-6 pb-7">
              <div className="-mt-16 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">

                {/* AVATAR */}
                <div className="relative">
                  <div className="h-32 w-32 overflow-hidden rounded-full border-4 border-gray-900 bg-yellow-400 shadow-xl">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Profile"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-4xl font-black text-gray-950">
                        {(profile.full_name || profile.username || "U")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* CAMERA BUTTON */}
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-1 right-1 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-4 border-gray-900 bg-yellow-400 text-gray-950 shadow-lg transition hover:scale-105 hover:bg-yellow-300"
                  >
                    <Camera size={19} />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarSelect}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* PROFILE INFO */}
                <div className="flex-1 sm:pb-2">
                  <h2 className="text-2xl font-black text-white">
                    {profile.full_name || profile.username || "User"}
                  </h2>

                  {profile.username && (
                    <p className="mt-1 text-sm text-gray-400">
                      @{profile.username}
                    </p>
                  )}

                  <p className="mt-2 text-xs font-medium text-gray-500">
                    Member since {formatDate(profile.created_at)}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* EDIT PROFILE */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-3xl border border-gray-800 bg-gray-900 p-6 shadow-sm sm:p-8"
          >
            <div className="mb-7">
              <h2 className="text-xl font-black text-white">Edit Profile</h2>
              <p className="mt-1 text-sm text-gray-400">
                Update your public profile information.
              </p>
            </div>

            <div className="space-y-6">

              {/* USERNAME */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-bold text-gray-300"
                >
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={profile.username}
                  onChange={(event) =>
                    setProfile((previous) => ({
                      ...previous,
                      username: event.target.value,
                    }))
                  }
                  placeholder="Enter your username"
                  className="w-full rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3.5 text-white outline-none transition placeholder:text-gray-600 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10"
                />
              </div>

              {/* FULL NAME */}
              <div>
                <label
                  htmlFor="full_name"
                  className="mb-2 block text-sm font-bold text-gray-300"
                >
                  Full Name
                </label>
                <input
                  id="full_name"
                  type="text"
                  value={profile.full_name}
                  onChange={(event) =>
                    setProfile((previous) => ({
                      ...previous,
                      full_name: event.target.value,
                    }))
                  }
                  placeholder="Enter your full name"
                  className="w-full rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3.5 text-white outline-none transition placeholder:text-gray-600 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10"
                />
              </div>

              {/* BIO */}
              <div>
                <label
                  htmlFor="bio"
                  className="mb-2 block text-sm font-bold text-gray-300"
                >
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={profile.bio}
                  onChange={(event) =>
                    setProfile((previous) => ({
                      ...previous,
                      bio: event.target.value,
                    }))
                  }
                  placeholder="Tell people a little about yourself..."
                  rows={5}
                  maxLength={300}
                  className="w-full resize-none rounded-2xl border border-gray-800 bg-gray-950 px-4 py-3.5 text-white outline-none transition placeholder:text-gray-600 focus:border-yellow-400 focus:ring-4 focus:ring-yellow-400/10"
                />
                <p className="mt-2 text-right text-xs text-gray-500">
                  {profile.bio.length}/300
                </p>
              </div>

              {/* SAVE */}
              <div className="flex justify-end border-t border-gray-800 pt-6">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-7 py-3.5 font-black text-gray-950 shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <Loader2 size={19} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={19} />
                      Save Profile
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* QUICK LINKS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2"
          >
            <button
              type="button"
              onClick={() => navigate("/notifications")}
              className="flex items-center justify-between rounded-2xl border border-gray-800 bg-gray-900 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-400/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <p className="font-bold text-white">Notifications</p>
                  <p className="text-sm text-gray-400">View your latest updates</p>
                </div>
              </div>
            </button>

            <button
              type="button"
              onClick={() => navigate("/settings")}
              className="flex items-center justify-between rounded-2xl border border-gray-800 bg-gray-900 p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-yellow-400/50"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gray-800 text-gray-300">
                  <Settings size={20} />
                </div>
                <div>
                  <p className="font-bold text-white">Settings</p>
                  <p className="text-sm text-gray-400">Manage your preferences</p>
                </div>
              </div>
            </button>
          </motion.div>
        </div>
      </div>

      {/* IMAGE EDITOR MODAL */}
      <AnimatePresence>
        {showEditor && selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl overflow-hidden rounded-3xl bg-gray-900 border border-gray-800 shadow-2xl"
            >
              {/* MODAL HEADER */}
              <div className="flex items-center justify-between border-b border-gray-800 px-5 py-4">
                <div>
                  <h2 className="text-lg font-black text-white">
                    Edit Profile Picture
                  </h2>
                  <p className="text-xs text-gray-500">
                    Move and zoom your image to adjust it.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCancelCrop}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-800 text-gray-400 transition hover:bg-gray-700 hover:text-white"
                >
                  <X size={20} />
                </button>
              </div>

              {/* CROP AREA */}
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

              {/* CONTROLS */}
              <div className="space-y-5 p-5">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-bold text-gray-200">Zoom</span>
                    <span className="text-xs font-semibold text-gray-500">
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
                    className="w-full accent-yellow-400"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleCancelCrop}
                    className="flex items-center justify-center gap-2 rounded-2xl border border-gray-700 bg-gray-800 px-6 py-3 font-bold text-gray-300 transition hover:bg-gray-700"
                  >
                    <X size={18} />
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyCrop}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-yellow-400 px-6 py-3 font-black text-gray-950 shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300"
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