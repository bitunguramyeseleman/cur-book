import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Send,
  ArrowLeft,
  MoreVertical,
  Phone,
  Video,
  Info,
  Smile,
  Paperclip,
  Check,
  CheckCheck,
  MessageCircle,
  Users,
  X,
  Circle,
} from "lucide-react";

import { supabase } from "../lib/supabaseClient";


// =========================================================
// HELPERS
// =========================================================

const getDisplayName = (person) => {
  if (!person) return "Unknown User";

  return (
    person.full_name?.trim() ||
    person.username?.trim() ||
    "User"
  );
};


const getInitials = (person) => {
  const name = getDisplayName(person);

  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
};


const formatTime = (date) => {
  if (!date) return "";

  const value = new Date(date);

  return value.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
};


const formatDate = (date) => {
  if (!date) return "";

  const value = new Date(date);

  return value.toLocaleDateString([], {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};


// =========================================================
// AVATAR
// =========================================================

function Avatar({ person, size = "md", online = false }) {
  const sizes = {
    sm: "w-9 h-9 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-24 h-24 text-2xl",
  };

  return (
    <div className="relative shrink-0">
      {person?.avatar_url ? (
        <img
          src={person.avatar_url}
          alt={getDisplayName(person)}
          className={`${sizes[size]} rounded-full object-cover border border-gray-700`}
        />
      ) : (
        <div
          className={`${sizes[size]} rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-gray-300`}
        >
          {getInitials(person)}
        </div>
      )}

      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-950" />
      )}
    </div>
  );
}


// =========================================================
// MAIN COMMUNITY
// =========================================================

export default function Community() {
  const [user, setUser] = useState(null);

  const [users, setUsers] = useState([]);
  const [conversations, setConversations] = useState([]);

  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedConversation, setSelectedConversation] = useState(null);

  const [messages, setMessages] = useState([]);

  const [search, setSearch] = useState("");
  const [messageText, setMessageText] = useState("");

  const [unreadCounts, setUnreadCounts] = useState({});

  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);

  const [mobileShowChat, setMobileShowChat] = useState(false);

  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const typingTimeoutRef = useRef(null);

  const presenceChannelRef = useRef(null);

  const selectedUserRef = useRef(null);


  // =========================================================
  // KEEP SELECTED USER REF UPDATED
  // =========================================================

  useEffect(() => {
    selectedUserRef.current = selectedUser;
  }, [selectedUser]);


  // =========================================================
  // INITIAL AUTH
  // =========================================================

  useEffect(() => {
    initialize();

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
    };
  }, []);


  // =========================================================
  // INITIALIZE
  // =========================================================

  const initialize = async () => {
    try {
      setLoadingUsers(true);
      setError("");

      const {
        data: { user: currentUser },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError) {
        throw authError;
      }

      if (!currentUser) {
        setError("Please login to use Community.");
        setLoadingUsers(false);
        return;
      }

      setUser(currentUser);

      await Promise.all([
        loadUsers(currentUser.id),
        loadConversations(currentUser.id),
        loadUnreadCounts(currentUser.id),
      ]);
    } catch (err) {
      console.error("Community initialization error:", err);

      setError(
        err?.message ||
          "Something went wrong while loading Community."
      );
    } finally {
      setLoadingUsers(false);
    }
  };


  // =========================================================
  // LOAD USERS
  // =========================================================

  const loadUsers = async (userId) => {
    const { data, error: usersError } = await supabase
      .from("profiles")
      .select(
        "id, username, full_name, bio, avatar_url, created_at"
      )
      .neq("id", userId)
      .order("full_name", {
        ascending: true,
      });

    if (usersError) {
      throw usersError;
    }

    setUsers(data || []);
  };


  // =========================================================
  // LOAD CONVERSATIONS
  // =========================================================

  const loadConversations = async (userId) => {
    const { data, error: conversationsError } = await supabase
      .from("conversations")
      .select("*")
      .or(
        `user_one.eq.${userId},user_two.eq.${userId}`
      )
      .order("created_at", {
        ascending: false,
      });

    if (conversationsError) {
      throw conversationsError;
    }

    setConversations(data || []);
  };


  // =========================================================
  // LOAD UNREAD COUNTS
  // =========================================================

  const loadUnreadCounts = async (userId) => {
    const { data, error: unreadError } = await supabase
      .from("messages")
      .select("sender_id")
      .eq("receiver_id", userId)
      .eq("is_read", false);

    if (unreadError) {
      console.error(
        "Unread messages error:",
        unreadError
      );

      return;
    }

    const counts = {};

    (data || []).forEach((message) => {
      if (!message.sender_id) return;

      counts[message.sender_id] =
        (counts[message.sender_id] || 0) + 1;
    });

    setUnreadCounts(counts);
  };


  // =========================================================
  // FIND CONVERSATION
  // =========================================================

  const findConversation = (otherUserId) => {
    if (!user) return null;

    return (
      conversations.find(
        (conversation) =>
          (
            conversation.user_one === user.id &&
            conversation.user_two === otherUserId
          ) ||
          (
            conversation.user_one === otherUserId &&
            conversation.user_two === user.id
          )
      ) || null
    );
  };


  // =========================================================
  // CREATE / GET CONVERSATION
  // =========================================================

  const getOrCreateConversation = async (otherUserId) => {
    if (!user) return null;

    const existing = findConversation(otherUserId);

    if (existing) {
      return existing;
    }

    const userOne =
      user.id < otherUserId
        ? user.id
        : otherUserId;

    const userTwo =
      user.id < otherUserId
        ? otherUserId
        : user.id;


    const { data, error: insertError } = await supabase
      .from("conversations")
      .insert({
        user_one: userOne,
        user_two: userTwo,
      })
      .select()
      .single();


    if (!insertError && data) {
      setConversations((previous) => [
        data,
        ...previous,
      ]);

      return data;
    }


    // Another request may have created it.
    if (
      insertError?.code === "23505"
    ) {
      const { data: existingConversation } =
        await supabase
          .from("conversations")
          .select("*")
          .or(
            `and(user_one.eq.${user.id},user_two.eq.${otherUserId}),and(user_one.eq.${otherUserId},user_two.eq.${user.id})`
          )
          .maybeSingle();

      if (existingConversation) {
        setConversations((previous) => [
          existingConversation,
          ...previous.filter(
            (item) =>
              item.id !== existingConversation.id
          ),
        ]);

        return existingConversation;
      }
    }

    if (insertError) {
      throw insertError;
    }

    return data;
  };


  // =========================================================
  // OPEN CHAT
  // =========================================================

  const openChat = async (person) => {
    try {
      setError("");
      setSelectedUser(person);
      setMobileShowChat(true);
      setOtherUserTyping(false);

      const conversation =
        await getOrCreateConversation(person.id);

      setSelectedConversation(conversation);

      await loadMessages(person.id);

      await markMessagesRead(person.id);

      setUnreadCounts((previous) => ({
        ...previous,
        [person.id]: 0,
      }));

      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    } catch (err) {
      console.error("Open chat error:", err);

      setError(
        err?.message ||
          "Unable to open this conversation."
      );
    }
  };


  // =========================================================
  // LOAD MESSAGES
  // =========================================================

  const loadMessages = async (otherUserId) => {
    if (!user) return;

    setLoadingMessages(true);

    try {
      const { data, error: messagesError } =
        await supabase
          .from("messages")
          .select(
            "id, sender_id, receiver_id, group_id, message, created_at, is_read"
          )
          .or(
            `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`
          )
          .order("created_at", {
            ascending: true,
          });

      if (messagesError) {
        throw messagesError;
      }

      setMessages(data || []);
    } catch (err) {
      console.error("Load messages error:", err);

      setError(
        err?.message ||
          "Unable to load messages."
      );
    } finally {
      setLoadingMessages(false);
    }
  };


  // =========================================================
  // MARK MESSAGES READ
  // =========================================================

  const markMessagesRead = async (senderId) => {
    if (!user) return;

    const { error: rpcError } =
      await supabase.rpc(
        "mark_messages_read",
        {
          p_sender_id: senderId,
        }
      );

    if (rpcError) {
      console.error(
        "Mark messages read error:",
        rpcError
      );
    }
  };


  // =========================================================
  // SCROLL TO BOTTOM
  // =========================================================

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);


  // =========================================================
  // REALTIME MESSAGES
  // =========================================================

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`messages-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `receiver_id=eq.${user.id}`,
        },
        async (payload) => {
          const incomingMessage = payload.new;

          const activeUser =
            selectedUserRef.current;


          // If the incoming message belongs to
          // the currently opened chat.
          if (
            activeUser &&
            incomingMessage.sender_id ===
              activeUser.id
          ) {
            setMessages((previous) => {
              const exists = previous.some(
                (item) =>
                  item.id === incomingMessage.id
              );

              if (exists) {
                return previous;
              }

              return [
                ...previous,
                incomingMessage,
              ];
            });


            // Immediately mark it read.
            await markMessagesRead(
              incomingMessage.sender_id
            );

            setUnreadCounts((previous) => ({
              ...previous,
              [incomingMessage.sender_id]: 0,
            }));

            return;
          }


          // Otherwise increase unread count.
          setUnreadCounts((previous) => ({
            ...previous,
            [incomingMessage.sender_id]:
              (previous[incomingMessage.sender_id] ||
                0) + 1,
          }));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `sender_id=eq.${user.id}`,
        },
        (payload) => {
          const newMessage = payload.new;

          const activeUser =
            selectedUserRef.current;

          if (
            activeUser &&
            newMessage.receiver_id ===
              activeUser.id
          ) {
            setMessages((previous) => {
              const exists = previous.some(
                (item) =>
                  item.id === newMessage.id
              );

              if (exists) {
                return previous;
              }

              return [
                ...previous,
                newMessage,
              ];
            });
          }
        }
      )
      .subscribe();


    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);


  // =========================================================
  // TYPING PRESENCE
  // =========================================================

  useEffect(() => {
    if (!user || !selectedUser) {
      setOtherUserTyping(false);
      return;
    }

    if (presenceChannelRef.current) {
      supabase.removeChannel(
        presenceChannelRef.current
      );

      presenceChannelRef.current = null;
    }


    const ids = [
      user.id,
      selectedUser.id,
    ].sort();

    const channelName =
      `typing-${ids[0]}-${ids[1]}`;


    const channel = supabase.channel(
      channelName,
      {
        config: {
          presence: {
            key: user.id,
          },
        },
      }
    );


    presenceChannelRef.current = channel;


    channel.on(
      "presence",
      {
        event: "sync",
      },
      () => {
        const state =
          channel.presenceState();

        const otherPresence =
          state[selectedUser.id] || [];

        const typing =
          otherPresence.some(
            (presence) =>
              presence.typing === true
          );

        setOtherUserTyping(typing);
      }
    );


    channel.on(
      "presence",
      {
        event: "join",
      },
      () => {
        const state =
          channel.presenceState();

        const otherPresence =
          state[selectedUser.id] || [];

        setOtherUserTyping(
          otherPresence.some(
            (presence) =>
              presence.typing === true
          )
        );
      }
    );


    channel.on(
      "presence",
      {
        event: "leave",
      },
      () => {
        setOtherUserTyping(false);
      }
    );


    channel.subscribe(
      async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            typing: false,
          });
        }
      }
    );


    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current
        );
      }

      channel.untrack();

      supabase.removeChannel(channel);

      if (
        presenceChannelRef.current ===
        channel
      ) {
        presenceChannelRef.current = null;
      }

      setOtherUserTyping(false);
    };
  }, [user, selectedUser]);


  // =========================================================
  // UPDATE TYPING STATUS
  // =========================================================

  const updateTypingStatus = async (typing) => {
    const channel =
      presenceChannelRef.current;

    if (!channel) return;

    try {
      await channel.track({
        typing,
      });
    } catch (err) {
      console.error(
        "Typing presence error:",
        err
      );
    }
  };


  // =========================================================
  // MESSAGE INPUT
  // =========================================================

  const handleMessageChange = async (event) => {
    const value = event.target.value;

    setMessageText(value);

    if (!selectedUser) {
      return;
    }


    if (typingTimeoutRef.current) {
      clearTimeout(
        typingTimeoutRef.current
      );
    }


    if (value.trim()) {
      await updateTypingStatus(true);

      typingTimeoutRef.current =
        setTimeout(() => {
          updateTypingStatus(false);
        }, 1500);

      return;
    }


    await updateTypingStatus(false);
  };


  // =========================================================
  // SEND MESSAGE
  // =========================================================

  const sendMessage = async (event) => {
    event?.preventDefault();

    const text = messageText.trim();

    if (
      !text ||
      !user ||
      !selectedUser ||
      sending
    ) {
      return;
    }


    try {
      setSending(true);
      setError("");


      await updateTypingStatus(false);


      if (typingTimeoutRef.current) {
        clearTimeout(
          typingTimeoutRef.current
        );
      }


      const conversation =
        selectedConversation ||
        (await getOrCreateConversation(
          selectedUser.id
        ));


      if (!conversation) {
        throw new Error(
          "Conversation could not be created."
        );
      }


      if (!selectedConversation) {
        setSelectedConversation(
          conversation
        );
      }


      const { data, error: sendError } =
        await supabase
          .from("messages")
          .insert({
            sender_id: user.id,
            receiver_id: selectedUser.id,
            group_id: null,
            message: text,
            is_read: false,
          })
          .select()
          .single();


      if (sendError) {
        throw sendError;
      }


      if (data) {
        setMessages((previous) => {
          const exists = previous.some(
            (item) =>
              item.id === data.id
          );

          if (exists) {
            return previous;
          }

          return [
            ...previous,
            data,
          ];
        });
      }


      setMessageText("");


      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    } catch (err) {
      console.error(
        "Send message error:",
        err
      );

      setError(
        err?.message ||
          "Message could not be sent."
      );
    } finally {
      setSending(false);
    }
  };


  // =========================================================
  // FILTER USERS
  // =========================================================

  const filteredUsers = useMemo(() => {
    const value =
      search.trim().toLowerCase();

    if (!value) {
      return users;
    }

    return users.filter((person) => {
      const name =
        getDisplayName(person).toLowerCase();

      const username =
        person.username
          ?.toLowerCase() || "";

      return (
        name.includes(value) ||
        username.includes(value)
      );
    });
  }, [users, search]);


  // =========================================================
  // BACK TO USER LIST ON MOBILE
  // =========================================================

  const handleMobileBack = () => {
    setMobileShowChat(false);

    setTimeout(() => {
      setOtherUserTyping(false);
    }, 200);
  };


  // =========================================================
  // CLOSE ERROR
  // =========================================================

  const closeError = () => {
    setError("");
  };


  // =========================================================
  // USER NOT AUTHENTICATED
  // =========================================================

  if (!user && !loadingUsers) {
    return (
      <div className="min-h-[calc(100vh-80px)] bg-gray-950 text-white flex items-center justify-center px-4">
        <motion.div
          initial={{
            opacity: 0,
            y: 20,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          className="max-w-md w-full bg-gray-900 border border-gray-800 rounded-3xl p-8 text-center"
        >
          <div className="w-16 h-16 mx-auto rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center mb-5">
            <MessageCircle size={30} />
          </div>

          <h1 className="text-2xl font-black mb-3">
            Community Chat
          </h1>

          <p className="text-gray-400 mb-6">
            Please login to start chatting
            with other cur.book users.
          </p>
        </motion.div>
      </div>
    );
  }


  // =========================================================
  // MAIN UI
  // =========================================================

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gray-950 text-white">

      {/* ERROR */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{
              opacity: 0,
              y: -20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              y: -20,
            }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-32px)] max-w-lg"
          >
            <div className="bg-gray-900 border border-red-500/30 rounded-2xl shadow-2xl p-4 flex items-start gap-3">
              <div className="flex-1">
                <p className="font-bold text-sm">
                  Chat error
                </p>

                <p className="text-xs text-gray-400 mt-1">
                  {error}
                </p>
              </div>

              <button
                onClick={closeError}
                className="text-gray-500 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>


      {/* CHAT CONTAINER */}
      <div className="h-[calc(100vh-80px)] min-h-[600px] max-w-[1600px] mx-auto p-3 sm:p-5">

        <div className="relative h-full overflow-hidden rounded-3xl border border-gray-800 bg-gray-900 shadow-2xl flex">


          {/* =================================================
              LEFT SIDEBAR
          ================================================= */}

          <aside
            className={`
              absolute inset-y-0 left-0
              w-full sm:w-[300px] lg:w-[340px]
              sm:relative sm:inset-auto
              z-30 sm:z-auto
              border-r border-gray-800
              bg-gray-950
              flex flex-col
              transition-transform duration-300
              ${
                mobileShowChat
                  ? "-translate-x-full sm:translate-x-0"
                  : "translate-x-0"
              }
            `}
          >

            {/* HEADER */}

            <div className="p-5 border-b border-gray-800">

              <div className="flex items-center justify-between mb-5">

                <div className="flex items-center gap-3">

                  <div className="w-11 h-11 rounded-2xl bg-yellow-400 text-gray-950 flex items-center justify-center">
                    <MessageCircle
                      size={23}
                      strokeWidth={2.5}
                    />
                  </div>

                  <div>
                    <h1 className="text-lg font-black">
                      Community
                    </h1>

                    <p className="text-xs text-gray-500">
                      {users.length} members
                    </p>
                  </div>

                </div>

                <div className="hidden sm:flex w-9 h-9 rounded-xl bg-gray-900 border border-gray-800 items-center justify-center">
                  <Users
                    size={17}
                    className="text-yellow-400"
                  />
                </div>

              </div>


              {/* SEARCH */}

              <div className="relative">

                <Search
                  size={17}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500"
                />

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search people..."
                  className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-sm text-white placeholder:text-gray-600 outline-none focus:border-yellow-400 transition"
                />

              </div>

            </div>


            {/* USERS */}

            <div className="flex-1 overflow-y-auto p-3">

              {loadingUsers ? (
                <div className="space-y-2">

                  {[1, 2, 3, 4, 5, 6].map(
                    (item) => (
                      <div
                        key={item}
                        className="h-16 rounded-2xl bg-gray-900 animate-pulse"
                      />
                    )
                  )}

                </div>
              ) : filteredUsers.length === 0 ? (

                <div className="text-center px-6 py-16">

                  <div className="w-14 h-14 mx-auto rounded-2xl bg-gray-900 flex items-center justify-center mb-4">
                    <Users
                      size={24}
                      className="text-gray-600"
                    />
                  </div>

                  <p className="font-bold text-gray-300">
                    No users found
                  </p>

                  <p className="text-xs text-gray-600 mt-1">
                    Try another search.
                  </p>

                </div>
              ) : (

                <div className="space-y-1">

                  {filteredUsers.map(
                    (person, index) => {

                      const isSelected =
                        selectedUser?.id ===
                        person.id;

                      const unread =
                        unreadCounts[
                          person.id
                        ] || 0;

                      return (
                        <motion.button
                          key={person.id}
                          initial={{
                            opacity: 0,
                            x: -10,
                          }}
                          animate={{
                            opacity: 1,
                            x: 0,
                          }}
                          transition={{
                            delay:
                              index * 0.025,
                          }}
                          onClick={() =>
                            openChat(person)
                          }
                          className={`
                            w-full flex items-center gap-3
                            p-3 rounded-2xl
                            text-left
                            transition-all
                            ${
                              isSelected
                                ? "bg-yellow-400 text-gray-950"
                                : "hover:bg-gray-900 text-white"
                            }
                          `}
                        >

                          <Avatar
                            person={person}
                            size="md"
                          />


                          <div className="min-w-0 flex-1">

                            <div className="flex items-center justify-between gap-2">

                              <p
                                className={`
                                  font-bold text-sm truncate
                                  ${
                                    isSelected
                                      ? "text-gray-950"
                                      : "text-gray-200"
                                  }
                                `}
                              >
                                {getDisplayName(
                                  person
                                )}
                              </p>


                              {unread > 0 && (
                                <motion.span
                                  initial={{
                                    scale: 0,
                                  }}
                                  animate={{
                                    scale: 1,
                                  }}
                                  className={`
                                    min-w-5 h-5 px-1.5
                                    rounded-full
                                    flex items-center justify-center
                                    text-[10px]
                                    font-black
                                    ${
                                      isSelected
                                        ? "bg-gray-950 text-yellow-400"
                                        : "bg-yellow-400 text-gray-950"
                                    }
                                  `}
                                >
                                  {unread > 99
                                    ? "99+"
                                    : unread}
                                </motion.span>
                              )}

                            </div>


                            <div className="flex items-center gap-1.5 mt-1">

                              <Circle
                                size={7}
                                fill="currentColor"
                                className={
                                  isSelected
                                    ? "text-gray-950"
                                    : "text-gray-600"
                                }
                              />

                              <span
                                className={`
                                  text-[11px] truncate
                                  ${
                                    isSelected
                                      ? "text-gray-800"
                                      : "text-gray-500"
                                  }
                                `}
                              >
                                Tap to start
                                chatting
                              </span>

                            </div>

                          </div>

                        </motion.button>
                      );
                    }
                  )}

                </div>
              )}

            </div>


            {/* CURRENT USER */}

            {user && (
              <div className="p-4 border-t border-gray-800">

                <div className="flex items-center gap-3">

                  <Avatar
                    person={user}
                    size="sm"
                  />

                  <div className="min-w-0 flex-1">

                    <p className="text-sm font-bold truncate">
                      You
                    </p>

                    <p className="text-[11px] text-gray-500 truncate">
                      {user.email}
                    </p>

                  </div>

                  <div className="w-2.5 h-2.5 rounded-full bg-green-500" />

                </div>

              </div>
            )}

          </aside>


          {/* =================================================
              CENTER CHAT
          ================================================= */}

          <main
            className={`
              flex-1 min-w-0
              ${
                mobileShowChat
                  ? "flex"
                  : "hidden"
              }
              sm:flex
              flex-col
              bg-gray-900
            `}
          >

            {!selectedUser ? (

              <div className="flex-1 flex items-center justify-center p-8">

                <motion.div
                  initial={{
                    opacity: 0,
                    scale: 0.95,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  className="text-center max-w-md"
                >

                  <div className="w-20 h-20 mx-auto rounded-3xl bg-gray-800 border border-gray-700 flex items-center justify-center mb-6">
                    <MessageCircle
                      size={34}
                      className="text-yellow-400"
                    />
                  </div>

                  <h2 className="text-2xl font-black">
                    Start a conversation
                  </h2>

                  <p className="text-gray-500 mt-2 text-sm">
                    Select someone from the
                    community to start chatting.
                  </p>

                </motion.div>

              </div>

            ) : (

              <>

                {/* CHAT HEADER */}

                <header className="h-[76px] shrink-0 border-b border-gray-800 px-4 sm:px-6 flex items-center justify-between bg-gray-900">

                  <div className="flex items-center gap-3 min-w-0">

                    <button
                      onClick={
                        handleMobileBack
                      }
                      className="sm:hidden w-9 h-9 rounded-xl bg-gray-800 flex items-center justify-center text-gray-300"
                    >
                      <ArrowLeft size={18} />
                    </button>


                    <Avatar
                      person={selectedUser}
                      size="md"
                    />


                    <div className="min-w-0">

                      <h2 className="font-black text-sm sm:text-base truncate">
                        {getDisplayName(
                          selectedUser
                        )}
                      </h2>


                      {otherUserTyping ? (

                        <div className="flex items-center gap-1 mt-0.5">

                          <span className="text-xs text-green-400 font-semibold">
                            typing
                          </span>

                          <span className="flex gap-1 ml-1">

                            {[0, 1, 2].map(
                              (dot) => (
                                <motion.span
                                  key={dot}
                                  animate={{
                                    y: [
                                      0,
                                      -4,
                                      0,
                                    ],
                                    opacity: [
                                      0.4,
                                      1,
                                      0.4,
                                    ],
                                  }}
                                  transition={{
                                    duration: 0.8,
                                    repeat:
                                      Infinity,
                                    delay:
                                      dot * 0.15,
                                  }}
                                  className="w-1.5 h-1.5 rounded-full bg-green-400"
                                />
                              )
                            )}

                          </span>

                        </div>

                      ) : (

                        <p className="text-xs text-gray-500 mt-0.5">
                          @{selectedUser.username ||
                            "user"}
                        </p>

                      )}

                    </div>

                  </div>


                  {/* HEADER ACTIONS */}

                  <div className="flex items-center gap-1">

                    <button className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-gray-500 hover:text-yellow-400 hover:bg-gray-800 transition">
                      <Phone size={17} />
                    </button>

                    <button className="hidden sm:flex w-9 h-9 rounded-xl items-center justify-center text-gray-500 hover:text-yellow-400 hover:bg-gray-800 transition">
                      <Video size={18} />
                    </button>

                    <button className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-yellow-400 hover:bg-gray-800 transition">
                      <Info size={18} />
                    </button>

                    <button className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:text-yellow-400 hover:bg-gray-800 transition">
                      <MoreVertical size={18} />
                    </button>

                  </div>

                </header>


                {/* MESSAGES */}

                <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">

                  {loadingMessages ? (

                    <div className="space-y-4">

                      {[1, 2, 3, 4].map(
                        (item) => (
                          <div
                            key={item}
                            className={`flex ${
                              item % 2 === 0
                                ? "justify-end"
                                : "justify-start"
                            }`}
                          >
                            <div className="w-48 h-12 rounded-2xl bg-gray-800 animate-pulse" />
                          </div>
                        )
                      )}

                    </div>

                  ) : messages.length === 0 ? (

                    <div className="h-full flex items-center justify-center">

                      <div className="text-center">

                        <div className="w-16 h-16 mx-auto rounded-2xl bg-gray-800 flex items-center justify-center mb-4">
                          <MessageCircle
                            size={26}
                            className="text-yellow-400"
                          />
                        </div>

                        <h3 className="font-black">
                          No messages yet
                        </h3>

                        <p className="text-gray-500 text-sm mt-1">
                          Say hello to{" "}
                          {getDisplayName(
                            selectedUser
                          )}
                        </p>

                      </div>

                    </div>

                  ) : (

                    <div className="max-w-4xl mx-auto">

                      {/* DATE */}

                      <div className="flex justify-center mb-6">

                        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-600 bg-gray-800 px-3 py-1.5 rounded-full">
                          Today
                        </span>

                      </div>


                      <div className="space-y-3">

                        {messages.map(
                          (message, index) => {

                            const mine =
                              message.sender_id ===
                              user.id;

                            const previous =
                              messages[
                                index - 1
                              ];

                            const showDate =
                              !previous ||
                              formatDate(
                                previous.created_at
                              ) !==
                                formatDate(
                                  message.created_at
                                );

                            return (
                              <div key={message.id}>

                                {showDate &&
                                  index !==
                                    0 && (
                                    <div className="flex justify-center my-6">

                                      <span className="text-[10px] font-bold text-gray-600 bg-gray-800 px-3 py-1 rounded-full">
                                        {formatDate(
                                          message.created_at
                                        )}
                                      </span>

                                    </div>
                                  )}


                                <motion.div
                                  initial={{
                                    opacity: 0,
                                    y: 8,
                                  }}
                                  animate={{
                                    opacity: 1,
                                    y: 0,
                                  }}
                                  className={`flex ${
                                    mine
                                      ? "justify-end"
                                      : "justify-start"
                                  }`}
                                >

                                  <div
                                    className={`
                                      max-w-[80%]
                                      sm:max-w-[65%]
                                      flex gap-2
                                      ${
                                        mine
                                          ? "flex-row-reverse"
                                          : "flex-row"
                                      }
                                    `}
                                  >

                                    {!mine && (
                                      <Avatar
                                        person={
                                          selectedUser
                                        }
                                        size="sm"
                                      />
                                    )}


                                    <div>

                                      <div
                                        className={`
                                          px-4 py-3
                                          rounded-2xl
                                          shadow-sm
                                          ${
                                            mine
                                              ? "bg-yellow-400 text-gray-950 rounded-br-md"
                                              : "bg-gray-800 text-gray-200 border border-gray-700 rounded-bl-md"
                                          }
                                        `}
                                      >

                                        <p className="text-sm leading-6 whitespace-pre-wrap break-words">
                                          {
                                            message.message
                                          }
                                        </p>

                                      </div>


                                      <div
                                        className={`
                                          flex items-center gap-1.5
                                          mt-1.5
                                          ${
                                            mine
                                              ? "justify-end"
                                              : "justify-start"
                                          }
                                        `}
                                      >

                                        <span className="text-[9px] text-gray-600">
                                          {formatTime(
                                            message.created_at
                                          )}
                                        </span>


                                        {mine && (
                                          message.is_read ? (
                                            <CheckCheck
                                              size={13}
                                              className="text-yellow-500"
                                            />
                                          ) : (
                                            <Check
                                              size={13}
                                              className="text-gray-600"
                                            />
                                          )
                                        )}

                                      </div>

                                    </div>

                                  </div>

                                </motion.div>

                              </div>
                            );
                          }
                        )}


                        {/* TYPING MESSAGE */}

                        <AnimatePresence>
                          {otherUserTyping && (
                            <motion.div
                              initial={{
                                opacity: 0,
                                y: 10,
                              }}
                              animate={{
                                opacity: 1,
                                y: 0,
                              }}
                              exit={{
                                opacity: 0,
                                y: 10,
                              }}
                              className="flex items-end gap-2"
                            >

                              <Avatar
                                person={
                                  selectedUser
                                }
                                size="sm"
                              />

                              <div className="bg-gray-800 border border-gray-700 rounded-2xl rounded-bl-md px-4 py-3">

                                <div className="flex items-center gap-1.5">

                                  {[0, 1, 2].map(
                                    (dot) => (
                                      <motion.span
                                        key={dot}
                                        animate={{
                                          y: [
                                            0,
                                            -5,
                                            0,
                                          ],
                                        }}
                                        transition={{
                                          duration:
                                            0.7,
                                          repeat:
                                            Infinity,
                                          delay:
                                            dot *
                                            0.15,
                                        }}
                                        className="w-2 h-2 rounded-full bg-green-400"
                                      />
                                    )
                                  )}

                                </div>

                              </div>

                            </motion.div>
                          )}
                        </AnimatePresence>


                        <div
                          ref={messagesEndRef}
                        />

                      </div>

                    </div>

                  )}

                </div>


                {/* MESSAGE COMPOSER */}

                <div className="shrink-0 border-t border-gray-800 p-3 sm:p-4 bg-gray-900">

                  <form
                    onSubmit={sendMessage}
                    className="max-w-4xl mx-auto"
                  >

                    <div className="flex items-end gap-2 bg-gray-950 border border-gray-800 rounded-2xl p-2 focus-within:border-yellow-400/60 transition">

                      <button
                        type="button"
                        className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center text-gray-600 hover:text-yellow-400 hover:bg-gray-900 transition"
                      >
                        <Paperclip size={19} />
                      </button>


                      <button
                        type="button"
                        className="hidden sm:flex w-10 h-10 rounded-xl items-center justify-center text-gray-600 hover:text-yellow-400 hover:bg-gray-900 transition"
                      >
                        <Smile size={19} />
                      </button>


                      <textarea
                        ref={inputRef}
                        value={messageText}
                        onChange={
                          handleMessageChange
                        }
                        onKeyDown={(
                          event
                        ) => {
                          if (
                            event.key ===
                              "Enter" &&
                            !event.shiftKey
                          ) {
                            event.preventDefault();
                            sendMessage();
                          }
                        }}
                        rows={1}
                        placeholder="Write a message..."
                        className="flex-1 resize-none bg-transparent outline-none text-sm text-white placeholder:text-gray-600 py-2.5 px-2 max-h-32"
                      />


                      <motion.button
                        whileTap={{
                          scale: 0.92,
                        }}
                        type="submit"
                        disabled={
                          !messageText.trim() ||
                          sending
                        }
                        className="w-11 h-11 shrink-0 rounded-xl bg-yellow-400 text-gray-950 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed hover:bg-yellow-300 transition"
                      >
                        <Send
                          size={19}
                          fill="currentColor"
                        />
                      </motion.button>

                    </div>


                    <p className="hidden sm:block text-[9px] text-gray-700 text-center mt-2">
                      Press Enter to send • Shift
                      + Enter for a new line
                    </p>

                  </form>

                </div>

              </>

            )}

          </main>


          {/* =================================================
              RIGHT PROFILE PANEL
          ================================================= */}

          <aside className="hidden xl:flex w-[280px] border-l border-gray-800 bg-gray-950 flex-col">

            {selectedUser ? (

              <>

                {/* PROFILE */}

                <div className="p-7 text-center border-b border-gray-800">

                  <div className="flex justify-end mb-2">
                    <button className="w-8 h-8 rounded-lg hover:bg-gray-900 text-gray-600 hover:text-white transition">
                      <MoreVertical
                        size={17}
                      />
                    </button>
                  </div>


                  <div className="flex justify-center">

                    <Avatar
                      person={selectedUser}
                      size="xl"
                    />

                  </div>


                  <h3 className="font-black text-lg mt-4">
                    {getDisplayName(
                      selectedUser
                    )}
                  </h3>


                  <p className="text-xs text-gray-600 mt-1">
                    @{selectedUser.username ||
                      "user"}
                  </p>


                  <div className="flex justify-center items-center gap-1.5 mt-3">

                    <span className="w-2 h-2 rounded-full bg-green-500" />

                    <span className="text-xs text-gray-500">
                      Community member
                    </span>

                  </div>


                  {selectedUser.bio && (
                    <p className="text-xs leading-5 text-gray-500 mt-4">
                      {selectedUser.bio}
                    </p>
                  )}

                </div>


                {/* PROFILE INFORMATION */}

                <div className="p-5">

                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-4">
                    Information
                  </p>


                  <div className="space-y-3">

                    <div className="p-3 rounded-xl bg-gray-900 border border-gray-800">

                      <p className="text-[10px] text-gray-600 uppercase font-bold">
                        Username
                      </p>

                      <p className="text-sm text-gray-300 mt-1">
                        @{selectedUser.username ||
                          "user"}
                      </p>

                    </div>


                    <div className="p-3 rounded-xl bg-gray-900 border border-gray-800">

                      <p className="text-[10px] text-gray-600 uppercase font-bold">
                        Joined
                      </p>

                      <p className="text-sm text-gray-300 mt-1">
                        {formatDate(
                          selectedUser.created_at
                        )}
                      </p>

                    </div>

                  </div>

                </div>


                {/* ACTIONS */}

                <div className="mt-auto p-5">

                  <button className="w-full py-3 rounded-xl bg-gray-900 border border-gray-800 text-sm font-bold text-gray-400 hover:text-yellow-400 hover:border-yellow-400/30 transition">
                    View Profile
                  </button>

                </div>

              </>

            ) : (

              <div className="flex-1 flex items-center justify-center p-8 text-center">

                <div>

                  <Info
                    size={30}
                    className="mx-auto text-gray-700 mb-3"
                  />

                  <p className="text-sm text-gray-600">
                    Select a person to see
                    their profile.
                  </p>

                </div>

              </div>

            )}

          </aside>

        </div>

      </div>

    </div>
  );
}