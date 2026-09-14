import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  Clock,
  Loader2,
  RefreshCw,
  Trash2,
  X,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function Notifications() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [markingAll, setMarkingAll] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setError("");

      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!currentUser) {
        navigate("/login");
        return;
      }

      setUser(currentUser);

      const { data, error: notificationError } =
        await supabase
          .from("notifications")
          .select(
            "id, user_id, title, message, is_read, created_at"
          )
          .eq("user_id", currentUser.id)
          .order("created_at", {
            ascending: false,
          });

      if (notificationError) {
        throw notificationError;
      }

      setNotifications(data || []);
    } catch (err) {
      console.error(
        "Notifications loading error:",
        err
      );

      setError(
        "Unable to load your notifications. Please try again."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadNotifications();
  };

  const markAsRead = async (notificationId) => {
    try {
      setProcessingId(notificationId);
      setError("");

      const { error: updateError } =
        await supabase
          .from("notifications")
          .update({
            is_read: true,
          })
          .eq("id", notificationId)
          .eq("user_id", user.id);

      if (updateError) {
        throw updateError;
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId
            ? {
                ...notification,
                is_read: true,
              }
            : notification
        )
      );
    } catch (err) {
      console.error(
        "Mark notification error:",
        err
      );

      setError(
        "Unable to mark this notification as read."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const markAllAsRead = async () => {
    try {
      setMarkingAll(true);
      setError("");
      setSuccess("");

      const unreadNotifications =
        notifications.filter(
          (notification) => !notification.is_read
        );

      if (unreadNotifications.length === 0) {
        setSuccess("All notifications are already read.");

        setTimeout(() => {
          setSuccess("");
        }, 2500);

        return;
      }

      const { error: updateError } =
        await supabase
          .from("notifications")
          .update({
            is_read: true,
          })
          .eq("user_id", user.id)
          .eq("is_read", false);

      if (updateError) {
        throw updateError;
      }

      setNotifications((current) =>
        current.map((notification) => ({
          ...notification,
          is_read: true,
        }))
      );

      setSuccess("All notifications marked as read.");

      setTimeout(() => {
        setSuccess("");
      }, 2500);
    } catch (err) {
      console.error(
        "Mark all notifications error:",
        err
      );

      setError(
        "Unable to mark all notifications as read."
      );
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      setProcessingId(notificationId);
      setError("");

      const { error: deleteError } =
        await supabase
          .from("notifications")
          .delete()
          .eq("id", notificationId)
          .eq("user_id", user.id);

      if (deleteError) {
        throw deleteError;
      }

      setNotifications((current) =>
        current.filter(
          (notification) =>
            notification.id !== notificationId
        )
      );
    } catch (err) {
      console.error(
        "Delete notification error:",
        err
      );

      setError(
        "Unable to delete this notification."
      );
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (date) => {
    if (!date) {
      return "";
    }

    const notificationDate = new Date(date);
    const now = new Date();

    const difference =
      now.getTime() -
      notificationDate.getTime();

    const seconds = Math.floor(
      difference / 1000
    );

    if (seconds < 60) {
      return "Just now";
    }

    const minutes = Math.floor(
      seconds / 60
    );

    if (minutes < 60) {
      return `${minutes} ${
        minutes === 1 ? "minute" : "minutes"
      } ago`;
    }

    const hours = Math.floor(
      minutes / 60
    );

    if (hours < 24) {
      return `${hours} ${
        hours === 1 ? "hour" : "hours"
      } ago`;
    }

    const days = Math.floor(
      hours / 24
    );

    if (days < 7) {
      return `${days} ${
        days === 1 ? "day" : "days"
      } ago`;
    }

    return notificationDate.toLocaleDateString(
      "en-US",
      {
        year: "numeric",
        month: "short",
        day: "numeric",
      }
    );
  };

  const unreadCount = notifications.filter(
    (notification) => !notification.is_read
  ).length;

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-gray-100 flex items-center justify-center px-4">
        <div className="text-center">
          <motion.div
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 1,
              repeat: Infinity,
              ease: "linear",
            }}
            className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border-4 border-gray-200 border-t-yellow-400"
          />

          <p className="mt-5 font-semibold text-gray-500">
            Loading notifications...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">

        {/* HEADER */}
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/home")}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-700 shadow-sm transition hover:border-yellow-400 hover:bg-yellow-50"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <p className="text-xs font-black uppercase tracking-widest text-yellow-500">
                Account
              </p>

              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
                  Notifications
                </h1>

                {unreadCount > 0 && (
                  <span className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-black text-gray-900">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-black text-gray-700 shadow-sm transition hover:border-yellow-400 hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "animate-spin"
                  : ""
              }
            />

            Refresh
          </button>
        </motion.div>

        {/* SUCCESS */}
        <AnimatePresence>
          {success && (
            <motion.div
              initial={{
                opacity: 0,
                y: -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -10,
              }}
              className="mb-5 flex items-center gap-3 rounded-2xl border border-yellow-300 bg-yellow-50 px-5 py-4"
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-400">
                <Check size={18} />
              </div>

              <p className="text-sm font-bold text-gray-800">
                {success}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ERROR */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{
                opacity: 0,
                y: -10,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                y: -10,
              }}
              className="mb-5 flex items-center justify-between gap-4 rounded-2xl border border-gray-300 bg-white px-5 py-4"
            >
              <p className="text-sm font-semibold text-gray-700">
                {error}
              </p>

              <button
                onClick={() => setError("")}
                className="rounded-lg p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-900"
              >
                <X size={18} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* TOP ACTION BAR */}
        {notifications.length > 0 && (
          <motion.div
            initial={{
              opacity: 0,
              y: 15,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="mb-5 flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="text-sm font-black text-gray-900">
                {unreadCount === 0
                  ? "You're all caught up."
                  : `${unreadCount} unread ${
                      unreadCount === 1
                        ? "notification"
                        : "notifications"
                    }`}
              </p>

              <p className="mt-1 text-xs text-gray-500">
                Stay updated with activity on cur.book.
              </p>
            </div>

            <button
              onClick={markAllAsRead}
              disabled={
                markingAll ||
                unreadCount === 0
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {markingAll ? (
                <Loader2
                  size={16}
                  className="animate-spin"
                />
              ) : (
                <CheckCheck size={16} />
              )}

              Mark all as read
            </button>
          </motion.div>
        )}

        {/* EMPTY STATE */}
        {notifications.length === 0 && (
          <motion.div
            initial={{
              opacity: 0,
              y: 25,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            className="rounded-3xl border border-gray-200 bg-white px-6 py-16 text-center shadow-sm"
          >
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-3xl bg-yellow-400 text-gray-900">
              <Bell size={34} />
            </div>

            <h2 className="mt-6 text-2xl font-black">
              No notifications yet
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-gray-500">
              When there is something important to
              tell you, your notifications will appear
              here.
            </p>

            <button
              onClick={() => navigate("/home")}
              className="mt-7 rounded-xl bg-gray-900 px-6 py-3 text-sm font-black text-white transition hover:bg-yellow-400 hover:text-gray-900"
            >
              Back to Home
            </button>
          </motion.div>
        )}

        {/* NOTIFICATIONS */}
        {notifications.length > 0 && (
          <div className="space-y-3">
            {notifications.map(
              (notification, index) => {
                const isUnread =
                  !notification.is_read;

                const isProcessing =
                  processingId ===
                  notification.id;

                return (
                  <motion.article
                    key={notification.id}
                    initial={{
                      opacity: 0,
                      y: 20,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      duration: 0.35,
                      delay: index * 0.04,
                    }}
                    className={`group relative overflow-hidden rounded-2xl border bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                      isUnread
                        ? "border-yellow-300"
                        : "border-gray-200"
                    }`}
                  >
                    {/* UNREAD INDICATOR */}
                    {isUnread && (
                      <div className="absolute left-0 top-0 h-full w-1 bg-yellow-400" />
                    )}

                    <div className="flex gap-4 p-5 sm:p-6">

                      {/* ICON */}
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${
                          isUnread
                            ? "bg-yellow-400 text-gray-900"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        <Bell size={21} />
                      </div>

                      {/* CONTENT */}
                      <div className="min-w-0 flex-1">

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h2
                                className={`text-base ${
                                  isUnread
                                    ? "font-black text-gray-900"
                                    : "font-bold text-gray-700"
                                }`}
                              >
                                {notification.title ||
                                  "Notification"}
                              </h2>

                              {isUnread && (
                                <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-gray-800">
                                  New
                                </span>
                              )}
                            </div>

                            <div className="mt-1 flex items-center gap-1.5 text-xs font-medium text-gray-400">
                              <Clock size={13} />

                              <span>
                                {formatDate(
                                  notification.created_at
                                )}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* MESSAGE */}
                        <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-500">
                          {notification.message ||
                            "You have a new notification."}
                        </p>

                        {/* ACTIONS */}
                        <div className="mt-5 flex flex-wrap items-center gap-2">

                          {isUnread && (
                            <button
                              onClick={() =>
                                markAsRead(
                                  notification.id
                                )
                              }
                              disabled={isProcessing}
                              className="inline-flex items-center gap-2 rounded-xl bg-yellow-400 px-3.5 py-2 text-xs font-black text-gray-900 transition hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {isProcessing ? (
                                <Loader2
                                  size={14}
                                  className="animate-spin"
                                />
                              ) : (
                                <Check size={14} />
                              )}

                              Mark as read
                            </button>
                          )}

                          <button
                            onClick={() =>
                              deleteNotification(
                                notification.id
                              )
                            }
                            disabled={isProcessing}
                            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3.5 py-2 text-xs font-black text-gray-500 transition hover:border-gray-300 hover:bg-gray-100 hover:text-gray-900 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isProcessing ? (
                              <Loader2
                                size={14}
                                className="animate-spin"
                              />
                            ) : (
                              <Trash2 size={14} />
                            )}

                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </motion.article>
                );
              }
            )}
          </div>
        )}
      </main>
    </div>
  );
}