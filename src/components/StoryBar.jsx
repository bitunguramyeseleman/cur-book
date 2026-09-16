import { useEffect, useMemo, useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import Avatar, { getDisplayName } from "./Avatar";
import StoryViewer from "./StoryViewer";

// default yellow if a story has no cover_color
const DEFAULT_COVER = "#facc15";

export default function StoryBar({ currentUser, onAddStory }) {
  const [stories, setStories] = useState([]);   // raw rows
  const [profiles, setProfiles] = useState({}); // { userId: profile }
  const [viewedIds, setViewedIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [viewerIndex, setViewerIndex] = useState(null);

  // ---------------------------------------------------------
  // GROUP STORIES BY USER
  // ---------------------------------------------------------
  const grouped = useMemo(() => {
    const map = new Map();
    stories.forEach((s) => {
      if (!map.has(s.user_id)) map.set(s.user_id, []);
      map.get(s.user_id).push(s);
    });

    // sort stories within a user: oldest → newest
    for (const arr of map.values()) {
      arr.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
    }

    // order users: me first, then unseen, then seen
    const users = [...map.keys()];
    users.sort((a, b) => {
      if (a === currentUser?.id) return -1;
      if (b === currentUser?.id) return 1;
      const aUnseen = map.get(a).some((s) => !viewedIds.has(s.id));
      const bUnseen = map.get(b).some((s) => !viewedIds.has(s.id));
      if (aUnseen && !bUnseen) return -1;
      if (!aUnseen && bUnseen) return 1;
      return 0;
    });

    return users.map((uid) => ({
      userId: uid,
      profile: profiles[uid] || (uid === currentUser?.id ? currentUser : {}),
      stories: map.get(uid),
      hasUnseen: map.get(uid).some((s) => !viewedIds.has(s.id)),
      coverColor:
        map.get(uid)[map.get(uid).length - 1]?.cover_color || DEFAULT_COVER,
    }));
  }, [stories, profiles, viewedIds, currentUser]);

  // ---------------------------------------------------------
  // LOAD
  // ---------------------------------------------------------
  const loadStories = async () => {
    setLoading(true);
    try {
      const nowIso = new Date().toISOString();

      const { data: rows, error } = await supabase
        .from("stories")
        .select(
          "id, user_id, media_url, media_type, caption, song, cover_color, created_at, expires_at"
        )
        .gt("expires_at", nowIso)
        .order("created_at", { ascending: true });
      if (error) throw error;

      setStories(rows || []);

      const ids = [...new Set((rows || []).map((r) => r.user_id))];
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", ids);
        const map = {};
        (profs || []).forEach((p) => (map[p.id] = p));
        setProfiles(map);
      }

      if (currentUser?.id && rows?.length) {
        const storyIds = rows.map((r) => r.id);
        const { data: views } = await supabase
          .from("story_views")
          .select("story_id")
          .eq("viewer_id", currentUser.id)
          .in("story_id", storyIds);
        setViewedIds(new Set((views || []).map((v) => v.story_id)));
      }
    } catch (err) {
      console.error("Story load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    loadStories();

    const channel = supabase
      .channel("stories-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "stories" },
        () => loadStories()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
    // eslint-disable-next-line
  }, [currentUser?.id]);

  // ---------------------------------------------------------
  // MARK VIEWED
  // ---------------------------------------------------------
  const markViewed = async (storyId) => {
    if (!currentUser?.id) return;
    if (viewedIds.has(storyId)) return;

    setViewedIds((prev) => new Set(prev).add(storyId));

    // don't log a "view" on your own story
    const ownerId = stories.find((s) => s.id === storyId)?.user_id;
    if (ownerId === currentUser.id) return;

    await supabase
      .from("story_views")
      .insert({ story_id: storyId, viewer_id: currentUser.id });
  };

  if (!currentUser) return null;

  const myGroup = grouped.find((g) => g.userId === currentUser.id);
  const myCover = myGroup?.coverColor || DEFAULT_COVER;

  const openMyStory = () => {
    if (myGroup) {
      const idx = grouped.findIndex((x) => x.userId === currentUser.id);
      if (idx >= 0) setViewerIndex(idx);
    } else {
      onAddStory();
    }
  };

  return (
    <>
      <div className="w-full">
        <div className="flex gap-3 overflow-x-auto pb-2 px-1 scrollbar-hide">
          {/* ================= MY STORY TILE ================= */}
          <div className="group flex w-[74px] shrink-0 flex-col items-center">
            <div className="relative">
              {/* ring — tap opens my story, or composer if none */}
              <button
                type="button"
                onClick={openMyStory}
                className="block rounded-full p-[2.5px] focus:outline-none"
                style={{
                  background: myGroup
                    ? `linear-gradient(135deg, ${myCover}, #f59e0b, #eab308)`
                    : "transparent",
                }}
              >
                <div
                  className={`rounded-full p-[2px] ${
                    myGroup ? "bg-gray-950" : "bg-transparent"
                  }`}
                >
                  <div className="h-[66px] w-[66px] overflow-hidden rounded-full bg-gray-900 ring-2 ring-gray-800">
                    {myGroup?.profile?.avatar_url ? (
                      <img
                        src={myGroup.profile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : currentUser?.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-900 text-gray-500">
                        <Plus size={22} />
                      </div>
                    )}
                  </div>
                </div>
              </button>

              {/* "+" badge — always opens composer */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddStory();
                }}
                title="Add new story"
                className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-yellow-400 text-gray-950 ring-4 ring-gray-950 transition hover:scale-110"
              >
                <Plus size={14} strokeWidth={3} />
              </button>
            </div>
            <p className="mt-1.5 w-full truncate text-center text-[10px] font-bold text-gray-300">
              Your story
            </p>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="flex items-center px-4 text-gray-500">
              <Loader2 size={16} className="animate-spin" />
            </div>
          )}

          {/* ================= OTHER USERS ================= */}
          {!loading &&
            grouped
              .filter((g) => g.userId !== currentUser.id)
              .map((g) => {
                const cover = g.coverColor || DEFAULT_COVER;

                return (
                  <button
                    key={g.userId}
                    type="button"
                    onClick={() => {
                      const idx = grouped.findIndex((x) => x.userId === g.userId);
                      if (idx >= 0) setViewerIndex(idx);
                    }}
                    className="group flex w-[74px] shrink-0 flex-col items-center"
                  >
                    <div
                      className="rounded-full p-[2.5px]"
                      style={{
                        background: g.hasUnseen
                          ? `linear-gradient(135deg, ${cover}, #f59e0b, #eab308)`
                          : "linear-gradient(135deg, #374151, #374151)",
                      }}
                    >
                      <div className="rounded-full bg-gray-950 p-[2px]">
                        <div className="h-[62px] w-[62px] overflow-hidden rounded-full bg-gray-900">
                          <Avatar person={g.profile} size="sm" />
                        </div>
                      </div>
                    </div>
                    <p className="mt-1.5 w-full truncate text-center text-[10px] font-bold text-gray-300">
                      {getDisplayName(g.profile)}
                    </p>
                  </button>
                );
              })}
        </div>
      </div>

      {/* ================= STORY VIEWER ================= */}
      {viewerIndex !== null && grouped[viewerIndex] && (
        <StoryViewer
          groups={grouped}
          initialGroupIndex={viewerIndex}
          currentUser={currentUser}
          onClose={() => {
            setViewerIndex(null);
            loadStories();
          }}
          onStorySeen={markViewed}
        />
      )}
    </>
  );
}