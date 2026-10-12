import { HOLDS, holdById } from "@/lib/game/content";
import type { GameState, HoldId } from "@/lib/game/types";

const MARKS: Record<HoldId, { x: number; y: number }> = {
  highbarrow: { x: 38, y: 28 },
  ashfold: { x: 68, y: 33 },
  greenmere: { x: 47, y: 48 },
  saltmere: { x: 20, y: 67 },
  vesper: { x: 76, y: 56 },
  woolford: { x: 50, y: 71 },
};

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
    <div className="relative overflow-hidden rounded-2xl shadow-inner ring-1 ring-[#c4a15a]/40">
      <img src="/art/realm-map.jpg" alt="Painted map of the Westmark" className="block h-auto w-full" />
      {HOLDS.map((hold) => {
        const mark = MARKS[hold.id];
        const mine = hold.id === state.player.holdId;
        const active = selected === hold.id;
        return (
          <button
            key={hold.id}
            type="button"
            onClick={() => onSelect(hold.id)}
            aria-pressed={active}
            aria-label={`${hold.name}, ${hold.region}`}
            className="absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
            style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
          >
            <span
              className={`flex size-8 items-center justify-center rounded-full text-[10px] font-semibold text-[#f8f1e4] shadow-lg ${active ? "ring-2 ring-white" : "ring-1 ring-black/40"} ${mine ? "bg-[#6e1e22]" : "bg-[#1c1612]/80"}`}
            >
              {mine ? "You" : hold.name.slice(0, 1)}
            </span>
            <span className="mt-0.5 rounded bg-[#1c1612]/75 px-1 text-[9px] tracking-wide text-[#f4ead7]">{hold.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export function HoldBrief({ state, holdId }: { state: GameState; holdId: HoldId }) {
  const hold = holdById(holdId);
  const mine = holdId === state.player.holdId;
  const member = state.compact.members.find((item) => item.holdId === holdId);
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <img src={`/art/hold-${hold.id}.jpg`} alt="" className="h-28 w-full object-cover" />
      <div className="p-4">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{hold.region}</p>
        <h3 className="font-display text-2xl leading-tight">{hold.name}</h3>
        <p className="mt-2 text-sm leading-relaxed text-foreground/80">{hold.text}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#3d4a62]">{hold.myth}</p>
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
    </div>
  );
}
