import { HOLDS, holdById } from "@/lib/game/content";
import type { GameState, HoldId } from "@/lib/game/types";
import { BannerMark } from "./marks";

const VIEW_W = 340;
const VIEW_H = 460;

export function RealmMap({
  state,
  selected,
  onSelect,
}: {
  state: GameState;
  selected: HoldId;
  onSelect: (holdId: HoldId) => void;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-[#14343b] shadow-inner ring-1 ring-[#0e2428]">
      <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="block h-auto w-full" aria-hidden>
        <rect width={VIEW_W} height={VIEW_H} fill="#14343b" />
        <path
          d="M-10 80 C40 40 20 160 10 220 C0 280 24 340 8 400 L-10 460 L-10 80Z"
          fill="#1c4650"
        />
        <path
          d="M46 64
             C100 28 176 22 230 46
             C292 72 318 118 304 162
             C324 206 312 250 286 292
             C308 336 274 392 196 424
             C132 450 78 436 58 386
             C34 340 48 300 70 268
             C42 230 30 176 44 124
             C34 96 36 78 46 64Z"
          fill="#3f5646"
        />
        <path
          d="M78 96
             C120 70 180 66 220 86
             C260 108 274 150 262 186
             C278 220 268 258 246 292
             C260 328 236 372 180 396
             C130 416 96 400 84 360
             C70 322 86 292 104 268
             C84 236 74 190 86 146
             C78 120 74 104 78 96Z"
          fill="#4a6352"
        />
        <path
          d="M196 92 C184 130 168 160 150 196 C132 230 108 258 78 292"
          fill="none"
          stroke="#7eb0b8"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M196 92 C184 130 168 160 150 196 C132 230 108 258 78 292"
          fill="none"
          stroke="#d5eef2"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
        <path
          d="M214 78 L156 198 L92 278 L146 378 L240 300 L258 164 L214 78"
          fill="none"
          stroke="#e6c56e"
          strokeWidth="1.4"
          strokeDasharray="3 4"
          strokeOpacity="0.7"
        />
        <g fill="#6d7d86">
          <path d="M188 58 L204 92 H172Z" />
          <path d="M206 48 L226 90 H186Z" />
          <path d="M226 60 L244 96 H208Z" />
        </g>
        <g fill="#2a4634">
          <circle cx="246" cy="150" r="7" />
          <circle cx="262" cy="158" r="9" />
          <circle cx="274" cy="146" r="6" />
          <circle cx="252" cy="170" r="5" />
          <circle cx="278" cy="168" r="7" />
        </g>
        <g fill="none" stroke="#2c4a38" strokeWidth="2">
          <path d="M118 360 q10 8 0 16" />
          <path d="M136 352 q12 10 0 18" />
          <path d="M156 366 q10 8 0 16" />
        </g>
        <path d="M228 286 v28 M236 292 v22 M244 286 v30" stroke="#cbbfa8" strokeWidth="2" />
        <text x="18" y="28" fill="#d5eef2" fontSize="11" letterSpacing="1.5">
          GREYWATER
        </text>
        <text x="250" y="44" fill="#f4ead7" fontSize="11" opacity="0.8">
          NORTH
        </text>
      </svg>
      {HOLDS.map((hold) => {
        const mine = hold.id === state.player.holdId;
        const member = state.compact.members.find((item) => item.holdId === hold.id);
        const active = selected === hold.id;
        return (
          <button
            key={hold.id}
            type="button"
            onClick={() => onSelect(hold.id)}
            aria-pressed={active}
            aria-label={`${hold.name}, ${hold.region}`}
            className="absolute flex size-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
            style={{ left: `${(hold.x / VIEW_W) * 100}%`, top: `${(hold.y / VIEW_H) * 100}%` }}
          >
            <span
              className={`flex size-8 items-center justify-center rounded-full shadow-md ring-2 ${active ? "ring-white" : "ring-[#1c1612]/40"}`}
              style={{ background: mine ? state.player.banner.field : member?.inCompact === false ? "#5c5146" : "#7c2a24" }}
            >
              {mine ? (
                <BannerMark banner={state.player.banner} className="h-7 w-5" />
              ) : (
                <span className="font-display text-[10px] text-[#f8f1e4]">{hold.name.slice(0, 1)}</span>
              )}
            </span>
          </button>
        );
      })}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between px-3 pb-2 text-[10px] tracking-wide text-[#f4ead7]/80">
        <span>The Westmark</span>
        <span>Tap a hold</span>
      </div>
    </div>
  );
}

export function HoldBrief({ state, holdId }: { state: GameState; holdId: HoldId }) {
  const hold = holdById(holdId);
  const mine = holdId === state.player.holdId;
  const member = state.compact.members.find((item) => item.holdId === holdId);
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">{hold.region}</p>
      <h3 className="font-display text-2xl leading-tight">{hold.name}</h3>
      <p className="mt-2 text-sm leading-relaxed text-foreground/80">{hold.text}</p>
      <p className="mt-3 text-sm">
        Grows <span className="font-medium">{hold.produces}</span>
        {hold.needs.length ? ` · hungers for ${hold.needs.join(" and ")}` : ""}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        {mine
          ? "Your banner flies here."
          : member
            ? member.inCompact
              ? `${member.name}, ${member.epithet}, is sworn to your compact.`
              : `${member.name} has left the compact. This hold sends nothing.`
            : `${hold.lord} keeps ${hold.name} outside your oath.`}
      </p>
    </div>
  );
}
