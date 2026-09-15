import { useState } from "react";

// =========================================================
// HELPERS
// =========================================================
export const getDisplayName = (p) =>
  p?.full_name?.trim() || p?.username?.trim() || "User";

export const getInitials = (p) => {
  const name = getDisplayName(p);
  return name
    .split(" ")
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
};

// =========================================================
// COLOR PALETTE — deterministic per user
// =========================================================
const AVATAR_COLORS = [
  "from-yellow-400 to-amber-500",
  "from-pink-500 to-rose-500",
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-fuchsia-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-violet-500",
  "from-lime-500 to-green-500",
  "from-sky-500 to-blue-600",
  "from-rose-500 to-pink-600",
  "from-fuchsia-500 to-purple-600",
  "from-teal-500 to-emerald-600",
];

const getAvatarColor = (id) => {
  if (!id) return AVATAR_COLORS[0];
  const sum = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
};

// =========================================================
// AVATAR COMPONENT
// =========================================================
export default function Avatar({
  person,
  size = "md",
  online = false,
  ring = false,
}) {
  const sizes = {
    xs: "w-7 h-7 text-[10px]",
    sm: "w-9 h-9 text-xs",
    md: "w-11 h-11 text-sm",
    lg: "w-14 h-14 text-base",
    xl: "w-24 h-24 text-2xl",
  };

  const [imageError, setImageError] = useState(false);

  const seed = person?.id || person?.username || "user";
  const dicebearUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
    seed
  )}&backgroundColor=facc15,fbbf24,f59e0b`;

  const url = person?.avatar_url || dicebearUrl;
  const showFallback = !url || imageError;

  return (
    <div className="relative shrink-0">
      {showFallback ? (
        <div
          className={`
            ${sizes[size]} rounded-full
            bg-gradient-to-br ${getAvatarColor(seed)}
            flex items-center justify-center
            font-black text-white shadow-lg
            ${ring ? "ring-2 ring-yellow-400/40" : ""}
          `}
        >
          {getInitials(person)}
        </div>
      ) : (
        <img
          src={url}
          alt={getDisplayName(person)}
          onError={() => setImageError(true)}
          className={`
            ${sizes[size]} rounded-full object-cover
            border border-gray-700 bg-yellow-400/10
            ${ring ? "ring-2 ring-yellow-400/40" : ""}
          `}
        />
      )}

      {online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-gray-950" />
      )}
    </div>
  );
}