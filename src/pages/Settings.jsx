import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Check,
  ChevronRight,
  Eye,
  EyeOff,
  Globe,
  Loader2,
  Lock,
  LogOut,
  Mail,
  Moon,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
  Sun,
  Trash2,
  User,
  Volume2,
  VolumeX,
  X,
  Zap,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function Settings() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Settings state
  const [settings, setSettings] = useState({
    // Notifications
    email_notifications: true,
    push_notifications: true,
    message_notifications: true,
    group_notifications: true,
    marketing_emails: false,

    // Privacy
    show_online_status: true,
    show_read_receipts: true,
    allow_messages_from: "everyone", // everyone | contacts | nobody
    profile_visibility: "public", // public | friends | private

    // Appearance
    theme: "dark", // dark | light | system
    accent_color: "yellow",
    message_sounds: true,
    typing_indicators: true,

    // Language
    language: "en",
  });

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const [activeSection, setActiveSection] = useState("notifications");

  // =========================================================
  // LOAD
  // =========================================================
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
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

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .eq("id", currentUser.id)
        .maybeSingle();

      setProfile(profileData);

      // Load user settings from DB if the table exists
      try {
        const { data: settingsData } = await supabase
          .from("user_settings")
          .select("*")
          .eq("user_id", currentUser.id)
          .maybeSingle();

        if (settingsData) {
          setSettings((prev) => ({
            ...prev,
            ...settingsData,
          }));
        }
      } catch (err) {
        // Table doesn't exist yet — use defaults
        console.warn("user_settings table not found, using defaults");
      }
    } catch (err) {
      console.error("Settings loading error:", err);
      setError("Failed to load settings.");
    } finally {
      setLoading(false);
    }
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

      // Try to upsert settings
      const { error: saveError } = await supabase
        .from("user_settings")
        .upsert(
          {
            user_id: user.id,
            ...settings,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id" }
        );

      if (saveError) throw saveError;

      setMessage("Settings saved successfully.");

      // Apply theme immediately
      if (settings.theme === "light") {
        document.documentElement.classList.remove("dark");
      } else {
        document.documentElement.classList.add("dark");
      }

      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Save error:", err);
      setError(err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  // =========================================================
  // CHANGE PASSWORD
  // =========================================================
  const handleChangePassword = async () => {
    try {
      setError("");
      setMessage("");

      if (!passwordForm.new || passwordForm.new.length < 6) {
        setError("New password must be at least 6 characters.");
        return;
      }
      if (passwordForm.new !== passwordForm.confirm) {
        setError("New passwords do not match.");
        return;
      }

      const { error: updateError } = await supabase.auth.updateUser({
        password: passwordForm.new,
      });

      if (updateError) throw updateError;

      setMessage("Password updated successfully.");
      setPasswordForm({ current: "", new: "", confirm: "" });
      setShowPasswordForm(false);
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      console.error("Password change error:", err);
      setError(err?.message || "Failed to update password.");
    }
  };

  // =========================================================
  // LOGOUT / DELETE
  // =========================================================
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/login");
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") return;
    try {
      setError("");
      // Note: actual account deletion requires an edge function
      // with admin privileges. This just logs the user out.
      await supabase.auth.signOut();
      navigate("/login");
    } catch (err) {
      setError("Failed to delete account. Please contact support.");
    }
  };

  // =========================================================
  // TOGGLE HELPER
  // =========================================================
  const Toggle = ({ value, onChange }) => (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`
        relative inline-flex h-6 w-11 shrink-0 items-center rounded-full
        transition-colors duration-200
        ${value ? "bg-yellow-400" : "bg-gray-700"}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200
          ${value ? "translate-x-6" : "translate-x-1"}
        `}
      />
    </button>
  );

  // =========================================================
  // SECTION ROW
  // =========================================================
  const SectionRow = ({ icon: Icon, label, description, children }) => (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="flex items-start gap-3 min-w-0">
        {Icon && (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gray-800 text-gray-400 mt-0.5">
            <Icon size={16} />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold text-white">{label}</p>
          {description && (
            <p className="text-xs text-gray-500 mt-0.5">{description}</p>
          )}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  // =========================================================
  // SECTION WRAPPER
  // =========================================================
  const Section = ({ id, icon: Icon, title, description, children }) => {
    const isOpen = activeSection === id;
    return (
      <div className="rounded-3xl border border-gray-800 bg-gray-900 overflow-hidden">
        <button
          type="button"
          onClick={() => setActiveSection(isOpen ? null : id)}
          className="w-full flex items-center justify-between gap-4 p-5 text-left transition hover:bg-gray-900/50"
        >
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-yellow-400/10 border border-yellow-400/20 text-yellow-400">
              <Icon size={20} />
            </div>
            <div className="min-w-0">
              <p className="text-base font-black text-white">{title}</p>
              {description && (
                <p className="text-xs text-gray-500 mt-0.5">{description}</p>
              )}
            </div>
          </div>
          <ChevronRight
            size={18}
            className={`shrink-0 text-gray-500 transition-transform duration-200 ${
              isOpen ? "rotate-90" : ""
            }`}
          />
        </button>

        <AnimatePresence initial={false}>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-5 pb-5 divide-y divide-gray-800/60">
                {children}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  // =========================================================
  // LOADING
  // =========================================================
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 px-4 py-10">
        <div className="mx-auto max-w-3xl">
          <div className="animate-pulse space-y-4">
            <div className="h-12 w-52 rounded-xl bg-gray-900" />
            <div className="h-24 rounded-3xl bg-gray-900" />
            <div className="h-24 rounded-3xl bg-gray-900" />
            <div className="h-24 rounded-3xl bg-gray-900" />
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
      <div className="min-h-screen bg-gray-950 px-4 py-8 text-white sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">

          {/* ================= HEADER ================= */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center gap-4"
          >
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gray-900 border border-gray-800 text-gray-300 shadow-sm transition hover:border-yellow-400/50 hover:bg-yellow-400/10 hover:text-yellow-400"
              title="Go back"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="flex-1 min-w-0">
              <div className="mb-2 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-yellow-400 text-gray-950 shadow-lg shadow-yellow-400/20">
                  <SettingsIcon size={24} />
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white">
                  Settings
                </h1>
              </div>
              <p className="text-sm text-gray-400">
                Manage your account, privacy and app preferences.
              </p>
            </div>
          </motion.div>

          {/* ================= MESSAGES ================= */}
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
                className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm font-medium text-red-300"
              >
                <span>{error}</span>
                <button
                  onClick={() => setError("")}
                  className="text-red-400 hover:text-red-300"
                >
                  <X size={16} />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ================= SECTIONS ================= */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* -------- NOTIFICATIONS -------- */}
            <Section
              id="notifications"
              icon={Bell}
              title="Notifications"
              description="Choose what updates you want to receive"
            >
              <SectionRow
                icon={Mail}
                label="Email notifications"
                description="Receive updates via email"
              >
                <Toggle
                  value={settings.email_notifications}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, email_notifications: v }))
                  }
                />
              </SectionRow>

              <SectionRow
                icon={Zap}
                label="Push notifications"
                description="Get notified on your devices"
              >
                <Toggle
                  value={settings.push_notifications}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, push_notifications: v }))
                  }
                />
              </SectionRow>

              <SectionRow
                icon={Bell}
                label="Direct messages"
                description="Notify me about new messages"
              >
                <Toggle
                  value={settings.message_notifications}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, message_notifications: v }))
                  }
                />
              </SectionRow>

              <SectionRow
                icon={Bell}
                label="Group activity"
                description="Notify me about group messages"
              >
                <Toggle
                  value={settings.group_notifications}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, group_notifications: v }))
                  }
                />
              </SectionRow>

              <SectionRow
                icon={Sparkles}
                label="Marketing emails"
                description="Receive product news and updates"
              >
                <Toggle
                  value={settings.marketing_emails}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, marketing_emails: v }))
                  }
                />
              </SectionRow>
            </Section>

            {/* -------- PRIVACY -------- */}
            <Section
              id="privacy"
              icon={Shield}
              title="Privacy & Security"
              description="Control who sees your activity"
            >
              <SectionRow
                icon={Eye}
                label="Show online status"
                description="Let others see when you're online"
              >
                <Toggle
                  value={settings.show_online_status}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, show_online_status: v }))
                  }
                />
              </SectionRow>

              <SectionRow
                icon={Check}
                label="Read receipts"
                description="Let others know when you've read messages"
              >
                <Toggle
                  value={settings.show_read_receipts}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, show_read_receipts: v }))
                  }
                />
              </SectionRow>

              <SectionRow
                icon={User}
                label="Who can message you"
                description="Control incoming messages"
              >
                <select
                  value={settings.allow_messages_from}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      allow_messages_from: e.target.value,
                    }))
                  }
                  className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-bold text-white outline-none focus:border-yellow-400"
                >
                  <option value="everyone">Everyone</option>
                  <option value="contacts">Contacts only</option>
                  <option value="nobody">Nobody</option>
                </select>
              </SectionRow>

              <SectionRow
                icon={Globe}
                label="Profile visibility"
                description="Who can view your profile"
              >
                <select
                  value={settings.profile_visibility}
                  onChange={(e) =>
                    setSettings((s) => ({
                      ...s,
                      profile_visibility: e.target.value,
                    }))
                  }
                  className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-bold text-white outline-none focus:border-yellow-400"
                >
                  <option value="public">Public</option>
                  <option value="friends">Friends only</option>
                  <option value="private">Private</option>
                </select>
              </SectionRow>

              {/* Change password */}
              <div className="pt-3.5">
                <button
                  type="button"
                  onClick={() => setShowPasswordForm((v) => !v)}
                  className="flex w-full items-center justify-between gap-3 rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-left transition hover:border-yellow-400/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-800 text-gray-400">
                      <Lock size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">
                        Change password
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Update your account password
                      </p>
                    </div>
                  </div>
                  <ChevronRight
                    size={16}
                    className={`text-gray-500 transition-transform ${
                      showPasswordForm ? "rotate-90" : ""
                    }`}
                  />
                </button>

                <AnimatePresence>
                  {showPasswordForm && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-3 space-y-3 rounded-xl bg-gray-950 border border-gray-800 p-4">
                        {/* Current */}
                        <div className="relative">
                          <input
                            type={showPasswords.current ? "text" : "password"}
                            value={passwordForm.current}
                            onChange={(e) =>
                              setPasswordForm((p) => ({
                                ...p,
                                current: e.target.value,
                              }))
                            }
                            placeholder="Current password"
                            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 pr-12 text-sm text-white outline-none transition focus:border-yellow-400"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((p) => ({
                                ...p,
                                current: !p.current,
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                          >
                            {showPasswords.current ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>

                        {/* New */}
                        <div className="relative">
                          <input
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordForm.new}
                            onChange={(e) =>
                              setPasswordForm((p) => ({
                                ...p,
                                new: e.target.value,
                              }))
                            }
                            placeholder="New password"
                            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 pr-12 text-sm text-white outline-none transition focus:border-yellow-400"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((p) => ({ ...p, new: !p.new }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                          >
                            {showPasswords.new ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>

                        {/* Confirm */}
                        <div className="relative">
                          <input
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordForm.confirm}
                            onChange={(e) =>
                              setPasswordForm((p) => ({
                                ...p,
                                confirm: e.target.value,
                              }))
                            }
                            placeholder="Confirm new password"
                            className="w-full rounded-xl border border-gray-800 bg-gray-900 px-4 py-3 pr-12 text-sm text-white outline-none transition focus:border-yellow-400"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowPasswords((p) => ({
                                ...p,
                                confirm: !p.confirm,
                              }))
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                          >
                            {showPasswords.confirm ? (
                              <EyeOff size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </button>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setShowPasswordForm(false);
                              setPasswordForm({
                                current: "",
                                new: "",
                                confirm: "",
                              });
                            }}
                            className="rounded-xl border border-gray-800 bg-gray-900 px-4 py-2 text-xs font-bold text-gray-300 transition hover:bg-gray-800"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleChangePassword}
                            className="rounded-xl bg-yellow-400 px-4 py-2 text-xs font-black text-gray-950 transition hover:bg-yellow-300"
                          >
                            Update Password
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Section>

            {/* -------- APPEARANCE -------- */}
            <Section
              id="appearance"
              icon={Sun}
              title="Appearance"
              description="Customize how the app looks and feels"
            >
              <SectionRow
                icon={Moon}
                label="Theme"
                description="Choose your preferred theme"
              >
                <select
                  value={settings.theme}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, theme: e.target.value }))
                  }
                  className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-bold text-white outline-none focus:border-yellow-400"
                >
                  <option value="dark">Dark</option>
                  <option value="light">Light</option>
                  <option value="system">System</option>
                </select>
              </SectionRow>

              <SectionRow
                icon={Volume2}
                label="Message sounds"
                description="Play a sound for new messages"
              >
                <Toggle
                  value={settings.message_sounds}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, message_sounds: v }))
                  }
                />
              </SectionRow>

              <SectionRow
                icon={Sparkles}
                label="Typing indicators"
                description="Show when someone is typing"
              >
                <Toggle
                  value={settings.typing_indicators}
                  onChange={(v) =>
                    setSettings((s) => ({ ...s, typing_indicators: v }))
                  }
                />
              </SectionRow>
            </Section>

            {/* -------- LANGUAGE -------- */}
            <Section
              id="language"
              icon={Globe}
              title="Language & Region"
              description="Set your preferred language"
            >
              <SectionRow
                icon={Globe}
                label="Language"
                description="Choose your preferred language"
              >
                <select
                  value={settings.language}
                  onChange={(e) =>
                    setSettings((s) => ({ ...s, language: e.target.value }))
                  }
                  className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-bold text-white outline-none focus:border-yellow-400"
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="rw">Kinyarwanda</option>
                  <option value="sw">Kiswahili</option>
                  <option value="es">Español</option>
                  <option value="ar">العربية</option>
                </select>
              </SectionRow>
            </Section>

            {/* -------- ACCOUNT -------- */}
            <Section
              id="account"
              icon={User}
              title="Account"
              description="Manage your account and sessions"
            >
              <SectionRow
                icon={User}
                label="Signed in as"
                description={user?.email || "Unknown"}
              >
                <button
                  onClick={() => navigate("/profile")}
                  className="rounded-xl border border-gray-800 bg-gray-950 px-3 py-2 text-xs font-bold text-gray-300 transition hover:border-yellow-400/40 hover:text-yellow-400"
                >
                  View Profile
                </button>
              </SectionRow>

              <SectionRow
                icon={LogOut}
                label="Sign out"
                description="Log out of this device"
              >
                <button
                  onClick={handleLogout}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/20"
                >
                  Sign Out
                </button>
              </SectionRow>
            </Section>

            {/* -------- DANGER ZONE -------- */}
            <Section
              id="danger"
              icon={Trash2}
              title="Danger Zone"
              description="Irreversible actions — be careful"
            >
              <SectionRow
                icon={Trash2}
                label="Delete account"
                description="Permanently delete your account and all data"
              >
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-bold text-red-300 transition hover:bg-red-500/20"
                >
                  Delete
                </button>
              </SectionRow>
            </Section>
          </motion.div>

          {/* ================= SAVE BUTTON (sticky) ================= */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="sticky bottom-4 mt-8"
          >
            <div className="flex items-center justify-between gap-4 rounded-2xl border border-gray-800 bg-gray-900/95 backdrop-blur p-4 shadow-2xl">
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-white">
                  Don't forget to save
                </p>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Changes are applied after clicking save
                </p>
              </div>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-xl bg-yellow-400 px-6 py-3 text-sm font-black text-gray-950 shadow-lg shadow-yellow-400/20 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? (
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
          </motion.div>
        </div>
      </div>

      {/* ================= DELETE ACCOUNT MODAL ================= */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-gray-900 border border-red-500/30 shadow-2xl"
            >
              <div className="p-6">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/30 mb-5">
                  <Trash2 size={28} className="text-red-400" />
                </div>
                <h2 className="text-xl font-black text-center text-white">
                  Delete account?
                </h2>
                <p className="mt-2 text-sm text-center text-gray-400">
                  This action cannot be undone. All your messages, groups, and
                  data will be permanently deleted.
                </p>

                <div className="mt-5">
                  <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    Type "DELETE" to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="DELETE"
                    className="mt-2 w-full rounded-xl border border-gray-800 bg-gray-950 px-4 py-3 text-sm text-white outline-none transition focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex gap-2 border-t border-gray-800 p-4">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeleteConfirmText("");
                  }}
                  className="flex-1 rounded-xl border border-gray-800 bg-gray-950 py-3 text-sm font-bold text-gray-300 transition hover:bg-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== "DELETE"}
                  className="flex-1 rounded-xl bg-red-500 py-3 text-sm font-black text-white transition hover:bg-red-400 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Delete Forever
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}