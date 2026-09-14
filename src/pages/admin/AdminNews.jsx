import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Image as ImageIcon,
  Video,
  Music,
  Upload,
  Trash2,
  Newspaper,
  Loader2,
  LogOut,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";

export default function AdminNews() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [news, setNews] = useState([]);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [audioFile, setAudioFile] = useState(null);

  const [imagePreview, setImagePreview] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);

  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    checkAdmin();
  }, []);

  async function checkAdmin() {
    setLoading(true);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        navigate("/login");
        return;
      }

      const { data: roleData, error: roleError } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();

      if (roleError || !roleData) {
        navigate("/home");
        return;
      }

      setUser(user);

      await loadNews();
    } catch (err) {
      console.error(err);
      setError("Unable to load admin news page.");
    } finally {
      setLoading(false);
    }
  }

  async function loadNews() {
    const { data, error } = await supabase
      .from("news")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError(error.message);
      return;
    }

    setNews(data || []);
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function handleVideoChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  }

  function handleAudioChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    setAudioFile(file);
    setAudioPreview(URL.createObjectURL(file));
  }

  async function uploadFile(file, bucket, folder) {
    if (!file) return null;

    const extension = file.name.split(".").pop();

    const fileName = `${crypto.randomUUID()}.${extension}`;

    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      throw uploadError;
    }

    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function publishNews(event) {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!title.trim()) {
      setError("Please enter a news title.");
      return;
    }

    setPublishing(true);

    try {
      const imageUrl = await uploadFile(
        imageFile,
        "news-images",
        user.id
      );

      const videoUrl = await uploadFile(
        videoFile,
        "news-videos",
        user.id
      );

      const audioUrl = await uploadFile(
        audioFile,
        "news-audio",
        user.id
      );

      const { error: insertError } = await supabase
        .from("news")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          image_url: imageUrl,
          video_url: videoUrl,
          audio_url: audioUrl,
          created_by: user.id,
        });

      if (insertError) {
        throw insertError;
      }

      setTitle("");
      setDescription("");

      setImageFile(null);
      setVideoFile(null);
      setAudioFile(null);

      setImagePreview(null);
      setVideoPreview(null);
      setAudioPreview(null);

      document
        .querySelectorAll('input[type="file"]')
        .forEach((input) => {
          input.value = "";
        });

      setMessage("News published successfully.");

      await loadNews();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to publish news.");
    } finally {
      setPublishing(false);
    }
  }

  async function deleteNews(id) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this news?"
    );

    if (!confirmed) return;

    setError("");
    setMessage("");

    const { error } = await supabase
      .from("news")
      .delete()
      .eq("id", id);

    if (error) {
      setError(error.message);
      return;
    }

    setMessage("News deleted successfully.");

    await loadNews();
  }

  async function logout() {
    await supabase.auth.signOut();
    navigate("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Loader2
            className="animate-spin mx-auto text-yellow-500"
            size={40}
          />

          <p className="mt-4 font-bold text-gray-600">
            Loading admin panel...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">

      {/* HEADER */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">

        <div className="max-w-7xl mx-auto px-4">

          <div className="h-20 flex items-center justify-between">

            <div className="flex items-center gap-4">

              <Link
                to="/admin"
                className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-yellow-400 transition"
              >
                <ArrowLeft size={19} />
              </Link>

              <div className="flex items-center gap-3">

                <div className="w-11 h-11 bg-yellow-400 rounded-2xl flex items-center justify-center">
                  <Newspaper size={22} />
                </div>

                <div>
                  <h1 className="font-black text-xl">
                    News Management
                  </h1>

                  <p className="text-xs text-gray-500">
                    Administrator
                  </p>
                </div>

              </div>

            </div>

            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-900 text-white font-bold hover:bg-gray-800 transition"
            >
              <LogOut size={17} />
              Logout
            </button>

          </div>

        </div>

      </header>


      {/* CONTENT */}
      <main className="max-w-7xl mx-auto px-4 py-10">

        {/* STATUS */}
        {message && (
          <div className="mb-6 p-4 rounded-2xl bg-yellow-100 border border-yellow-200 flex items-center gap-3">
            <CheckCircle2
              className="text-yellow-600"
              size={20}
            />

            <p className="font-semibold">
              {message}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-gray-200 border border-gray-300 flex items-center gap-3">
            <AlertCircle size={20} />

            <p className="font-semibold">
              {error}
            </p>
          </div>
        )}


        <div className="grid lg:grid-cols-[1fr_420px] gap-8">

          {/* CREATE NEWS */}
          <section className="bg-white rounded-3xl border border-gray-200 p-6 md:p-8">

            <div className="mb-8">

              <p className="text-sm font-black uppercase tracking-widest text-yellow-600">
                Create
              </p>

              <h2 className="text-3xl font-black mt-2">
                Publish News
              </h2>

              <p className="text-gray-500 mt-2">
                Create a news article and attach media.
              </p>

            </div>


            <form
              onSubmit={publishNews}
              className="space-y-6"
            >

              {/* TITLE */}
              <div>

                <label className="block font-bold mb-2">
                  News Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter news title..."
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 outline-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                />

              </div>


              {/* DESCRIPTION */}
              <div>

                <label className="block font-bold mb-2">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(e) =>
                    setDescription(e.target.value)
                  }
                  placeholder="Write the news description..."
                  rows={7}
                  className="w-full px-4 py-3.5 rounded-xl border border-gray-200 outline-none resize-none focus:border-yellow-500 focus:ring-2 focus:ring-yellow-100"
                />

              </div>


              {/* IMAGE */}
              <div>

                <label className="block font-bold mb-2">
                  News Image
                </label>

                <label className="block border-2 border-dashed border-gray-300 rounded-2xl p-6 cursor-pointer hover:border-yellow-500 hover:bg-yellow-50 transition">

                  <div className="flex items-center gap-4">

                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <ImageIcon />
                    </div>

                    <div>
                      <p className="font-bold">
                        Choose image
                      </p>

                      <p className="text-sm text-gray-500">
                        JPG, PNG or WEBP
                      </p>
                    </div>

                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />

                </label>

                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="mt-4 w-full max-h-80 object-cover rounded-2xl"
                  />
                )}

              </div>


              {/* VIDEO */}
              <div>

                <label className="block font-bold mb-2">
                  News Video
                </label>

                <label className="block border-2 border-dashed border-gray-300 rounded-2xl p-6 cursor-pointer hover:border-yellow-500 hover:bg-yellow-50 transition">

                  <div className="flex items-center gap-4">

                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Video />
                    </div>

                    <div>
                      <p className="font-bold">
                        Choose video
                      </p>

                      <p className="text-sm text-gray-500">
                        MP4, WebM or MOV
                      </p>
                    </div>

                  </div>

                  <input
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                    className="hidden"
                  />

                </label>

                {videoPreview && (
                  <video
                    src={videoPreview}
                    controls
                    className="mt-4 w-full rounded-2xl"
                  />
                )}

              </div>


              {/* AUDIO */}
              <div>

                <label className="block font-bold mb-2">
                  News Audio
                </label>

                <label className="block border-2 border-dashed border-gray-300 rounded-2xl p-6 cursor-pointer hover:border-yellow-500 hover:bg-yellow-50 transition">

                  <div className="flex items-center gap-4">

                    <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                      <Music />
                    </div>

                    <div>
                      <p className="font-bold">
                        Choose audio
                      </p>

                      <p className="text-sm text-gray-500">
                        MP3, WAV or OGG
                      </p>
                    </div>

                  </div>

                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleAudioChange}
                    className="hidden"
                  />

                </label>

                {audioPreview && (
                  <audio
                    src={audioPreview}
                    controls
                    className="mt-4 w-full"
                  />
                )}

              </div>


              {/* PUBLISH */}
              <button
                type="submit"
                disabled={publishing}
                className="w-full py-4 rounded-2xl bg-yellow-400 hover:bg-yellow-500 font-black flex items-center justify-center gap-3 transition disabled:opacity-60"
              >

                {publishing ? (
                  <>
                    <Loader2
                      size={20}
                      className="animate-spin"
                    />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    Publish News
                  </>
                )}

              </button>

            </form>

          </section>


          {/* NEWS LIST */}
          <section>

            <div className="flex items-center justify-between mb-5">

              <div>
                <p className="text-sm font-black uppercase tracking-widest text-yellow-600">
                  Published
                </p>

                <h2 className="text-2xl font-black mt-1">
                  Your News
                </h2>

              </div>

              <span className="px-3 py-1.5 bg-yellow-100 rounded-full font-black text-sm">
                {news.length}
              </span>

            </div>


            <div className="space-y-4">

              {news.length === 0 ? (

                <div className="bg-white border border-gray-200 rounded-3xl p-8 text-center">

                  <Newspaper
                    size={40}
                    className="mx-auto mb-4"
                  />

                  <h3 className="font-black text-lg">
                    No news yet
                  </h3>

                  <p className="text-gray-500 mt-2">
                    Published news will appear here.
                  </p>

                </div>

              ) : (

                news.map((item) => (

                  <div
                    key={item.id}
                    className="bg-white border border-gray-200 rounded-2xl overflow-hidden"
                  >

                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.title}
                        className="w-full h-40 object-cover"
                      />
                    )}

                    <div className="p-5">

                      <h3 className="font-black text-lg">
                        {item.title}
                      </h3>

                      {item.description && (
                        <p className="text-sm text-gray-500 mt-2 line-clamp-3">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-5">

                        <span className="text-xs text-gray-400">
                          {item.created_at
                            ? new Date(
                                item.created_at
                              ).toLocaleDateString()
                            : ""}
                        </span>

                        <button
                          onClick={() =>
                            deleteNews(item.id)
                          }
                          className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-yellow-400 flex items-center justify-center transition"
                        >
                          <Trash2 size={17} />
                        </button>

                      </div>

                    </div>

                  </div>

                ))

              )}

            </div>

          </section>

        </div>

      </main>

    </div>
  );
}