import { useId } from "react";
import type { Banner, GoodId, SigilId } from "@/lib/game/types";

const GOOD_INK: Record<GoodId, string> = {
  grain: "#8d6b2e",
  timber: "#6b4428",
  iron: "#4d5966",
  salt: "#6d7c88",
  wool: "#8a7356",
  relics: "#7c2a24",
};

export function GoodIcon({ good, className = "size-7" }: { good: GoodId; className?: string }) {
  const ink = GOOD_INK[good];
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      {good === "grain" && (
        <path
          d="M16 3c1 4 1 6 0 8 2-1 4-1 6 1-2 1-3 3-3 5 3 0 5 2 6 5-4-1-6 1-7 4 0-3-1-6-2-8-1 2-2 5-2 8-1-3-3-5-7-4 1-3 3-5 6-5 0-2-1-4-3-5 2-2 4-2 6-1 1-2 1-4 0-8Z"
          fill={ink}
        />
      )}
      {good === "timber" && (
        <g fill={ink}>
          <rect x="5" y="8" width="22" height="6" rx="3" />
          <rect x="5" y="16" width="22" height="6" rx="3" />
          <circle cx="8" cy="11" r="1.2" fill="#f3eadb" />
          <circle cx="8" cy="19" r="1.2" fill="#f3eadb" />
        </g>
      )}
      {good === "iron" && (
        <path d="M6 12h14l6 4-6 4H6l3-4-3-4Z" fill={ink} />
      )}
      {good === "salt" && (
        <g fill={ink}>
          <path d="M16 4 20 12 16 14 12 12Z" />
          <path d="M8 14 13 18 11 26 6 20Z" />
          <path d="M24 14 26 20 21 26 19 18Z" />
        </g>
      )}
      {good === "wool" && (
        <g fill={ink}>
          <circle cx="12" cy="14" r="5" />
          <circle cx="18" cy="12" r="5" />
          <circle cx="20" cy="18" r="5" />
          <circle cx="13" cy="19" r="5" />
        </g>
      )}
      {good === "relics" && (
        <g fill={ink}>
          <circle cx="16" cy="16" r="6" fill="none" stroke={ink} strokeWidth="2.4" />
          <circle cx="16" cy="16" r="2" />
          <path d="M16 4v4M16 24v4M4 16h4M24 16h4" stroke={ink} strokeWidth="2" />
        </g>
      )}
    </svg>
  );
}

export function Sigil({ id, color, className = "size-full" }: { id: SigilId; color: string; className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <SigilShape id={id} color={color} />
    </svg>
  );
}

function SigilShape({ id, color }: { id: SigilId; color: string }) {
  return (
    <>
      {id === "crown" && (
        <path d="M4 22 6 10l6 6 4-10 4 10 6-6 2 12H4Z" fill={color} />
      )}
      {id === "sun" && (
        <g fill={color}>
          <circle cx="16" cy="16" r="5" />
          <path d="M15 2h2v5h-2zM15 25h2v5h-2zM2 15h5v2H2zM25 15h5v2h-5zM5.4 6.8l1.4-1.4 3.5 3.5-1.4 1.4zM21.7 23.1l1.4-1.4 3.5 3.5-1.4 1.4zM6.8 26.6l-1.4-1.4 3.5-3.5 1.4 1.4zM23.1 10.3l-1.4-1.4 3.5-3.5 1.4 1.4z" />
        </g>
      )}
      {id === "scales" && (
        <path
          d="M15 4h2v6h6v2h-5.2l4.7 8.2a5 5 0 1 1-4.2 2.3L16 14.2 13.7 22.5a5 5 0 1 1-4.2-2.3L14.2 12H9V10h6V4Z"
          fill={color}
        />
      )}
      {id === "antler" && (
        <path
          d="M15 28V14l-2-2 1-4-3-1 1-3-3-2 2-2 4 3 1 4 1-4 4-3 2 2-3 2 1 3-3 1 1 4-2 2v14h-2Z"
          fill={color}
        />
      )}
      {id === "wolf" && (
        <path d="M6 8 10 6l2 6 4-2 4 2 2-6 4 2-2 8 2 4-4 2v6H10v-6l-4-2 2-4-2-8Z" fill={color} />
      )}
      {id === "tower" && (
        <path d="M8 28V12h3V8h3v4h4V8h3v4h3v16H8Zm6-4h4v4h-4v-4Z" fill={color} />
      )}
      {id === "wave" && (
        <path
          d="M2 12c3 0 3 4 6 4s3-4 6-4 3 4 6 4 3-4 6-4 3 4 6 4"
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      )}
      {id === "wheat" && (
        <path
          d="M16 28V8m0 0c-3-1-5-4-5-4 1 4 1 6 0 8 3-1 5-4 5-4Zm0 6c3-1 5-4 5-4-1 4-1 6 0 8-3-1-5-4-5-4Zm0 4c-3-1-5-4-5-4 1 4 1 6 0 8 3-1 5-4 5-4Z"
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}
      {id === "wave" && (
        <path
          d="M2 20c3 0 3 4 6 4s3-4 6-4 3 4 6 4 3-4 6-4 3 4 6 4"
          fill="none"
          stroke={color}
          strokeWidth="2.4"
          strokeLinecap="round"
        />
      )}
    </>
  );
}

export function BannerMark({
  banner,
  className = "h-20 w-16",
  title,
}: {
  banner: Banner;
  className?: string;
  title?: string;
}) {
  const clip = `shield-${useId().replace(/:/g, "")}`;
  return (
    <svg
      viewBox="0 0 80 96"
      className={className}
      {...(title ? { role: "img" as const, "aria-label": title } : { "aria-hidden": true as const })}
    >
      <defs>
        <clipPath id={clip}>
          <path d="M8 6h64v48c0 20-14 32-32 38C22 86 8 74 8 54V6Z" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clip})`}>
        <rect width="80" height="96" fill={banner.field} />
        {banner.division === "pale" && <rect x="40" width="40" height="96" fill={banner.charge} opacity="0.95" />}
        {banner.division === "fess" && <rect y="36" width="80" height="16" fill={banner.charge} />}
        {banner.division === "chevron" && (
          <path d="M8 62 40 34 72 62v12L40 48 8 74V62Z" fill={banner.charge} />
        )}
      </g>
      <path
        d="M8 6h64v48c0 20-14 32-32 38C22 86 8 74 8 54V6Z"
        fill="none"
        stroke="#1c1612"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <circle cx="40" cy="40" r="15" fill={banner.charge} />
      <g transform="translate(26 26) scale(0.875)">
        <SigilShape id={banner.sigil} color={banner.field} />
      </g>
    </svg>
  );
}
