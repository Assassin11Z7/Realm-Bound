import type { CSSProperties, ReactNode } from "react";
import type { BuildingId, HoldId } from "@/lib/game/types";

const VB_W = 400;
const VB_H = 300;

const SHORT: Record<BuildingId, string> = {
  hall: "Stores",
  yard: "Yard",
  shrine: "Shrine",
  market: "Market",
  watch: "Watch",
  forge: "Forge",
  still: "Brew",
  loom: "Loom",
  strongroom: "Vault",
};

const SITES: { id: BuildingId; x: number; y: number; row: "back" | "front" }[] = [
  { id: "watch", x: 40, y: 162, row: "back" },
  { id: "shrine", x: 106, y: 164, row: "back" },
  { id: "hall", x: 174, y: 166, row: "back" },
  { id: "strongroom", x: 242, y: 162, row: "back" },
  { id: "forge", x: 306, y: 164, row: "back" },
  { id: "still", x: 366, y: 166, row: "back" },
  { id: "yard", x: 74, y: 276, row: "front" },
  { id: "market", x: 200, y: 280, row: "front" },
  { id: "loom", x: 326, y: 276, row: "front" },
];

const HIT: Record<BuildingId, { w: number; h: number }> = {
  watch: { w: 50, h: 118 },
  shrine: { w: 56, h: 102 },
  hall: { w: 78, h: 96 },
  strongroom: { w: 58, h: 78 },
  forge: { w: 62, h: 76 },
  still: { w: 56, h: 72 },
  yard: { w: 92, h: 62 },
  market: { w: 98, h: 56 },
  loom: { w: 92, h: 60 },
};

const COTTAGES = [
  { x: 72, y: 132 },
  { x: 142, y: 126 },
  { x: 214, y: 134 },
  { x: 284, y: 128 },
];

type Land = { sky0: string; sky1: string; hill: string; ground: string; field: string; road: string; roof: string };

const LAND: Record<HoldId, Land> = {
  greenmere: { sky0: "#f0d7a8", sky1: "#7eabc4", hill: "#7d9a58", ground: "#5f8344", field: "#c6a45c", road: "#cbb892", roof: "#7c2a24" },
  highbarrow: { sky0: "#e7eef4", sky1: "#8ea6bf", hill: "#9aa3b0", ground: "#b7c0ca", field: "#d5dde4", road: "#8d8680", roof: "#4e5966" },
  ashfold: { sky0: "#e4d2b0", sky1: "#6f917c", hill: "#234232", ground: "#3d5a40", field: "#6b4f36", road: "#6b5344", roof: "#3d4a32" },
  saltmere: { sky0: "#f4ead7", sky1: "#8eb0bf", hill: "#c4b59a", ground: "#d2c2a4", field: "#e4d3b4", road: "#b7a48a", roof: "#1e3a40" },
  vesper: { sky0: "#f3e4ea", sky1: "#b3a4c4", hill: "#6e6258", ground: "#8a7d6c", field: "#a89880", road: "#6e6258", roof: "#3a3154" },
  woolford: { sky0: "#f6ecd4", sky1: "#b7c5d4", hill: "#8fa06a", ground: "#a3b27a", field: "#e4dcc8", road: "#c4b59a", roof: "#6b4428" },
};

const HAIR = ["#2a2118", "#4a3424", "#6b4428", "#1c1612", "#8a6a3a"];
const LANES = ["a", "b", "c", "d"] as const;
const LANE_POSE: Record<(typeof LANES)[number], { left: string; top: string }> = {
  a: { left: "10%", top: "64%" },
  b: { left: "78%", top: "67%" },
  c: { left: "18%", top: "71%" },
  d: { left: "70%", top: "69%" },
};

type Stage = 1 | 2 | 3;

type Theme = {
  field: string;
  charge: string;
  snow: boolean;
  smoke: boolean;
  lit: boolean;
  roof: string;
  mill: boolean;
  shrine: boolean;
  stake: boolean;
};

const FRAME: Record<BuildingId, { w: number; h: number }> = {
  watch: { w: 28, h: 78 },
  shrine: { w: 36, h: 72 },
  hall: { w: 60, h: 60 },
  strongroom: { w: 42, h: 46 },
  forge: { w: 44, h: 50 },
  still: { w: 52, h: 46 },
  yard: { w: 72, h: 32 },
  market: { w: 36, h: 28 },
  loom: { w: 50, h: 48 },
};

function stageOf(level: number): Stage {
  if (level >= 5) return 3;
  if (level >= 3) return 2;
  return 1;
}

function standY(site: (typeof SITES)[number]): number {
  return site.row === "back" ? site.y + 36 : site.y + 2;
}

export function TownScene({
  holdId,
  snow,
  cold,
  buildings,
  project,
  souls,
  weary,
  merry,
  sworn,
  departed,
  field,
  charge,
  youField,
  youCharge,
  showYou,
  mill,
  shrineLit,
  stake,
  ire,
  picked,
  onPick,
}: {
  holdId: HoldId;
  snow: boolean;
  cold: boolean;
  buildings: Partial<Record<BuildingId, number>> | null;
  project: BuildingId | null;
  souls: number;
  weary: boolean;
  merry: boolean;
  sworn: boolean;
  departed: boolean;
  field: string;
  charge: string;
  youField: string;
  youCharge: string;
  showYou: boolean;
  mill: boolean;
  shrineLit: boolean;
  stake: boolean;
  ire: number;
  picked: BuildingId | null;
  onPick?: (id: BuildingId) => void;
}) {
  const land = LAND[holdId];
  const theme: Theme = { field, charge, snow, smoke: !cold && !departed, lit: true, roof: land.roof, mill, shrine: shrineLit, stake };
  const homes = Math.max(4, Math.min(COTTAGES.length, Math.round(souls / 16)));
  const gid = `town-${holdId}`;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="pointer-events-none block h-auto w-full" aria-hidden="true">
        <defs>
          <linearGradient id={`${gid}-sky`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={land.sky1} />
            <stop offset="78%" stopColor={land.sky0} />
          </linearGradient>
          <linearGradient id={`${gid}-ground`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={land.hill} />
            <stop offset="42%" stopColor={land.ground} />
            <stop offset="100%" stopColor={land.field} />
          </linearGradient>
        </defs>
        <rect width={VB_W} height={VB_H} fill={`url(#${gid}-sky)`} />
        <g className="wm-town-cloud" fill="#fff" opacity="0.75">
          <ellipse cx="0" cy="0" rx="26" ry="8" />
          <ellipse cx="18" cy="2" rx="16" ry="7" />
          <ellipse cx="-16" cy="3" rx="14" ry="6" />
        </g>
        <g className="wm-town-cloud wm-town-cloud-b" fill="#fff" opacity="0.55">
          <ellipse cx="0" cy="0" rx="18" ry="6" />
          <ellipse cx="12" cy="1" rx="10" ry="5" />
        </g>
        <Skyline holdId={holdId} />
        <path d={`M0 124 C 80 110, 170 136, 270 116 C 340 106, 380 120, 400 112 L 400 ${VB_H} L 0 ${VB_H} Z`} fill={`url(#${gid}-ground)`} />
        {holdId === "greenmere" && (
          <g opacity="0.28" stroke="#c6a45c" strokeWidth="2.5">
            <path d="M0 248 H400" />
            <path d="M0 260 H400" />
            <path d="M0 272 H400" />
          </g>
        )}
        <path d="M0 186 C 70 176, 150 198, 250 184 C 320 174, 370 192, 400 180 L 400 236 C 330 250, 220 228, 130 246 C 60 258, 20 236, 0 240 Z" fill={land.road} />
        <path d="M16 198 C 90 190, 170 210, 260 196" fill="none" stroke="#fff" strokeWidth="1.1" opacity="0.28" />
        <path d="M30 214 C 120 206, 210 224, 340 210" fill="none" stroke="#1c1612" strokeWidth="0.8" opacity="0.12" />

        {COTTAGES.slice(0, Math.min(COTTAGES.length, homes)).map((home, index) => (
          <g key={`${home.x}-${home.y}`} transform={`translate(${home.x} ${home.y}) scale(0.72)`} opacity={departed ? 0.55 : 1}>
            <Cottage roof={index % 2 === 0 ? land.roof : "#6b4428"} snow={snow} smoke={theme.smoke && index % 2 === 0} />
          </g>
        ))}

        {buildings ? (
          SITES.map((site) => {
            const level = buildings[site.id] ?? 0;
            const rising = project === site.id;
            return (
              <g key={site.id} transform={`translate(${site.x} ${site.y})`}>
                <Work id={site.id} level={level} rising={rising} theme={theme} picked={picked === site.id} />
              </g>
            );
          })
        ) : (
          <g transform="translate(200 166)" opacity={departed ? 0.55 : 1}>
            <Hall stage={sworn ? 2 : 1} theme={theme} />
            {sworn && <Flag field={field} charge={charge} x={14} y={-78} />}
            {departed && <path d="M-28 4 H30" stroke="#6e1e22" strokeWidth="1.6" />}
          </g>
        )}

        <g transform="translate(200 228)">
          <Well />
        </g>

        {holdId === "woolford" && (
          <>
            <g transform="translate(36 292)">
              <Sheep />
            </g>
            <g transform="translate(118 296)">
              <g className="wm-town-sheep wm-town-sheep-b">
                <SheepShape />
              </g>
            </g>
          </>
        )}
        {holdId === "ashfold" && (
          <g transform="translate(18 128)">
            <Deer />
          </g>
        )}

        <g className="wm-town-bird" fill="none" stroke="#231910" strokeWidth="1.3" strokeLinecap="round">
          <path className="wm-flap" d="M0 0 c2.4 -3.4 4.6 -3.4 6.6 0" />
          <path className="wm-flap" d="M6.6 0 c2.2 -3.2 4.2 -3.2 6.2 0" style={{ animationDelay: "-0.18s" }} />
        </g>
        <g className="wm-town-bird wm-town-bird-b" fill="none" stroke="#231910" strokeWidth="1.2" strokeLinecap="round">
          <path className="wm-flap" d="M0 0 c2 -2.6 3.6 -2.6 5.4 0" />
          <path className="wm-flap" d="M5.4 0 c1.8 -2.6 3.4 -2.6 5.2 0" style={{ animationDelay: "-0.2s" }} />
        </g>

        {ire >= 45 && (
          <g className={ire >= 70 ? "wm-town-wing wm-town-wing-hot" : "wm-town-wing"} opacity={Math.min(0.5, ire / 180)}>
            <path d="M0 8 C 36 -18, 78 -6, 120 6 C 86 14, 40 16, 0 8 Z" fill="#14110e" />
            <path d="M18 6 C 40 -8, 62 -2, 78 6" fill="none" stroke="#e6c56e" strokeWidth="0.6" opacity="0.45" />
          </g>
        )}
      </svg>

      <TownFolk
        souls={souls}
        weary={weary}
        merry={merry}
        departed={departed}
        field={field}
        charge={charge}
        youField={youField}
        youCharge={youCharge}
        showYou={showYou}
        buildings={buildings}
        project={project}
      />

      {(snow || cold) && (
        <svg viewBox={`0 0 ${VB_W} ${VB_H}`} className="pointer-events-none absolute inset-0 z-[2] h-full w-full" aria-hidden="true">
          {snow && <Snowfall />}
          {cold && <rect width={VB_W} height={VB_H} fill="#243044" opacity="0.12" />}
        </svg>
      )}

      {onPick &&
        buildings &&
        SITES.map((site) => {
          const level = buildings[site.id] ?? 0;
          const rising = project === site.id;
          const hit = HIT[site.id];
          const grow = level >= 5 ? 1.12 : level >= 3 ? 1.06 : 1;
          const w = hit.w * grow;
          const h = hit.h * grow;
          return (
            <button
              key={site.id}
              type="button"
              className={`wm-town-hit absolute z-10 rounded-md ${picked === site.id ? "bg-[#e6c56e]/20 ring-2 ring-[#e6c56e]" : ""}`}
              style={{
                left: `${((site.x - w / 2) / VB_W) * 100}%`,
                top: `${((site.y - h) / VB_H) * 100}%`,
                width: `${(w / VB_W) * 100}%`,
                height: `${(h / VB_H) * 100}%`,
              }}
              aria-pressed={picked === site.id}
              onClick={() => onPick(site.id)}
            >
              <span className="sr-only">
                {SHORT[site.id]}, level {level} of 5{rising ? ", rising" : ""}
              </span>
              {picked === site.id && level > 0 && (
                <span className="absolute -top-1 left-1/2 -translate-x-1/2 rounded bg-[#1c1612]/80 px-1 py-px text-[9px] whitespace-nowrap text-[#f4ead7]">
                  {SHORT[site.id]} {level}
                </span>
              )}
            </button>
          );
        })}
    </div>
  );
}

function TownFolk({
  souls,
  weary,
  merry,
  departed,
  field,
  charge,
  youField,
  youCharge,
  showYou,
  buildings,
  project,
}: {
  souls: number;
  weary: boolean;
  merry: boolean;
  departed: boolean;
  field: string;
  charge: string;
  youField: string;
  youCharge: string;
  showYou: boolean;
  buildings: Partial<Record<BuildingId, number>> | null;
  project: BuildingId | null;
}) {
  const cloaks = [field, "#2c4a38", "#6e1e22", "#3a3154", "#6b4428", charge];
  const count = departed ? 1 : weary ? Math.max(2, Math.min(4, Math.round(souls / 22))) : Math.max(3, Math.min(5, Math.round(souls / 18)));
  const gait = weary ? "wm-town-weary" : merry ? "wm-town-merry" : "";

  const crew: { id: string; x: number; y: number; pace?: boolean; node: ReactNode }[] = [];
  if (buildings) {
    for (const site of SITES) {
      if ((buildings[site.id] ?? 0) <= 0) continue;
      const y = standY(site);
      if (site.id === "watch") crew.push({ id: "guard", x: site.x + 18, y, pace: true, node: <Figure cloak="#4e5966" hair="#1c1612" tool="spear" weary={weary} /> });
      if (site.id === "shrine") crew.push({ id: "priest", x: site.x + 16, y, node: <Figure cloak="#e7e0d4" hair="#6b4428" weary={weary} /> });
      if (site.id === "forge") crew.push({ id: "smith", x: site.x + 20, y, node: <Figure cloak="#3a3530" hair="#2a2118" tool="hammer" weary={weary} /> });
      if (site.id === "still") crew.push({ id: "brewer", x: site.x - 16, y, node: <Figure cloak="#6b4428" hair="#4a3424" sack weary={weary} /> });
      if (site.id === "market") crew.push({ id: "vendor", x: site.x, y, node: <Figure cloak="#7c2a24" hair="#2a2118" tool="tray" weary={weary} /> });
      if (site.id === "yard") crew.push({ id: "farmer", x: site.x + 28, y, node: <Figure cloak="#2c4a38" hair="#6b4428" sack weary={weary} /> });
      if (site.id === "loom") crew.push({ id: "weaver", x: site.x - 22, y, node: <Figure cloak="#e7d7b8" hair="#4a3424" weary={weary} /> });
      if (site.id === "strongroom") crew.push({ id: "warden", x: site.x + 18, y, pace: true, node: <Figure cloak="#5c5146" hair="#1c1612" tool="spear" weary={weary} /> });
      if (site.id === "hall") crew.push({ id: "steward", x: site.x - 24, y, node: <Figure cloak={field} hair="#2a2118" banner={charge} weary={weary} /> });
    }
    if (project) {
      const site = SITES.find((item) => item.id === project);
      if (site) crew.push({ id: "mason", x: site.x + (site.row === "back" ? 26 : 18), y: standY(site), node: <Figure cloak="#6b4428" hair="#2a2118" tool="hammer" /> });
    }
  }

  return (
    <div className={`pointer-events-none absolute inset-0 z-[1] ${gait}`}>
      {Array.from({ length: count }, (_, index) => (
        <Walker
          key={index}
          lane={LANES[index % LANES.length]}
          delay={index * 2.6}
          dur={14 + (index % 3) * 2}
          cloak={cloaks[index % cloaks.length]}
          hair={HAIR[index % HAIR.length]}
          sack={index % 3 === 0}
          beard={index % 2 === 1}
          weary={weary}
        />
      ))}
      {showYou && !departed && (
        <Walker lane="b" delay={1.2} dur={18} cloak={youField} hair="#2a2118" banner={youCharge} lord weary={weary} />
      )}
      {!departed && <Cart />}
      {!departed && <Hound />}
      {crew.map((member) => (
        <Spot key={member.id} x={member.x} y={member.y} pace={member.pace}>
          {member.node}
        </Spot>
      ))}
    </div>
  );
}

function Walker({
  lane,
  delay,
  dur,
  cloak,
  hair,
  sack,
  beard,
  banner,
  lord,
  weary,
}: {
  lane: (typeof LANES)[number];
  delay: number;
  dur: number;
  cloak: string;
  hair: string;
  sack?: boolean;
  beard?: boolean;
  banner?: string;
  lord?: boolean;
  weary?: boolean;
}) {
  const pose = LANE_POSE[lane];
  return (
    <div
      className={`wm-town-folk wm-walk-${lane} absolute w-[9%]`}
      style={
        {
          left: pose.left,
          top: pose.top,
          transform: "translate(-50%, -100%)",
          "--wm-dur": dur,
          "--wm-delay": delay,
        } as CSSProperties
      }
    >
      <div className="wm-bob">
        <Figure cloak={cloak} hair={hair} sack={sack} beard={beard} banner={banner} lord={lord} weary={weary} />
      </div>
    </div>
  );
}

function Spot({ x, y, pace, children }: { x: number; y: number; pace?: boolean; children: ReactNode }) {
  return (
    <div
      className={`absolute w-[9%] ${pace ? "wm-pace" : ""}`}
      style={{ left: `${(x / VB_W) * 100}%`, top: `${(y / VB_H) * 100}%`, transform: "translate(-50%, -100%)" }}
    >
      <div className="wm-bob">{children}</div>
    </div>
  );
}

export function Figure({
  cloak,
  hair = "#2a2118",
  sack,
  beard,
  banner,
  tool,
  lord,
  weary,
}: {
  cloak: string;
  hair?: string;
  sack?: boolean;
  beard?: boolean;
  banner?: string;
  tool?: "hammer" | "spear" | "tray";
  lord?: boolean;
  weary?: boolean;
}) {
  return (
    <svg viewBox="-20 -48 44 54" className="block w-full overflow-visible" aria-hidden="true">
      <g transform={weary ? "rotate(8)" : undefined}>
        <ellipse cx="1" cy="2" rx="7" ry="1.8" fill="#1c1612" opacity="0.18" />
        <g transform="translate(-1 -28)">
          <g className={tool === "hammer" ? undefined : "wm-arm wm-arm-b"}>
            <path d="M0 0 Q -1 6 1 11" fill="none" stroke="#d7b097" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        </g>
        <g transform="translate(-2.4 -13)">
          <g className="wm-town-leg">
            <path d="M0 0 L -0.4 11" fill="none" stroke="#3a2a22" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M-0.4 11 L 2 11.5" stroke="#2a2118" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        </g>
        <g transform="translate(2.4 -13)">
          <g className="wm-town-leg wm-town-leg-b">
            <path d="M0 0 L 0.3 11" fill="none" stroke="#2a2218" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M0.3 11 L 2.6 11.3" stroke="#2a2118" strokeWidth="2.2" strokeLinecap="round" />
          </g>
        </g>
        <path d="M-6.2 -32 L 6.2 -32 L 8 -12 L -8 -12 Z" fill={cloak} />
        <path d="M-6.2 -32 L -4 -32 L -5.2 -12 L -8 -12 Z" fill="#fff" opacity="0.16" />
        <path d="M-6 -20 H 6" stroke="#1c1612" strokeWidth="1.2" opacity="0.35" />
        <circle cy="-36" r="4.3" fill="#e6c2a2" />
        <path d="M-4.3 -37.2 Q 0 -43.2 4.3 -37.2 Q 1.4 -39.4 -4.3 -37.2" fill={hair} />
        {beard && <path d="M-2.4 -33.2 Q 0 -29.6 2.4 -33.2" fill={hair} />}
        {lord && <path d="M-4.8 -38.4 H 4.8" stroke="#e6c56e" strokeWidth="1.15" strokeLinecap="round" />}
        <g transform="translate(1.2 -28)">
          <g className={tool === "hammer" ? undefined : "wm-arm"}>
            <path d="M0 0 Q 1 6 0 11" fill="none" stroke="#e6c2a2" strokeWidth="2.2" strokeLinecap="round" />
          </g>
          {sack && <circle cx="1" cy="13" r="3.1" fill="#c4a574" stroke="#6b5344" strokeWidth="0.4" />}
          {tool === "hammer" && (
            <g className="wm-town-hammer" transform="translate(0 9)">
              <rect x="0" y="-1" width="12" height="2.1" rx="0.4" fill="#6b5344" />
              <rect x="10" y="-3.3" width="4" height="6.2" rx="0.4" fill="#8d8680" />
            </g>
          )}
        </g>
        {tool === "spear" && (
          <g>
            <path d="M9 -8 L 11 -42" stroke="#6b5344" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M11 -42 L 8.2 -36 L 13.6 -36 Z" fill="#8d8680" />
          </g>
        )}
        {tool === "tray" && (
          <g transform="translate(10 -22)">
            <ellipse rx="6.5" ry="2" fill="#e7d3a8" stroke="#6b5344" strokeWidth="0.4" />
            <circle cx="-2" cy="-2.2" r="1.5" fill="#c6a45c" />
            <circle cx="2.2" cy="-2.2" r="1.5" fill="#7c2a24" />
          </g>
        )}
        {banner && (
          <g transform="translate(9 -46)">
            <rect width="1.2" height="16" fill="#3a2a22" />
            <g className="wm-town-flag">
              <path d="M1.2 0 H13 L10.2 4.2 L13 8.4 H1.2 Z" fill={cloak} />
              <path d="M1.6 3.4 H11" stroke={banner} strokeWidth="1.5" />
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}

function Cart() {
  return (
    <div className="wm-town-cart absolute w-[16%]" style={{ left: "8%", top: "76%", transform: "translate(-50%, -100%)" }}>
      <svg viewBox="-4 -16 58 34" className="block w-full overflow-visible" aria-hidden="true">
        <rect x="12" y="0" width="26" height="12" rx="1" fill="#6b4428" />
        <polygon points="12,0 24,0 21,-5 14,-5" fill="#e7d3a8" />
        <rect x="34" y="4" width="12" height="2.4" fill="#5c4636" />
        <circle cx="22" cy="-8" r="3.1" fill="#e6c2a2" />
        <path d="M18.6 -9.4 Q 22 -13.2 25.4 -9.4 Q 23 -11 18.6 -9.4" fill="#2a2118" />
        <path d="M18 -5.5 H26 L27 2 H17 Z" fill="#2c4a38" />
        <g transform="translate(18 14)">
          <g className="wm-town-wheel">
            <circle r="4.2" fill="#2a2118" />
            <path d="M0 -3.6 V3.6 M-3.6 0 H3.6" stroke="#c4a574" strokeWidth="0.8" />
          </g>
        </g>
        <g transform="translate(34 14)">
          <g className="wm-town-wheel" style={{ animationDelay: "-0.25s" }}>
            <circle r="4.2" fill="#2a2118" />
            <path d="M0 -3.6 V3.6 M-3.6 0 H3.6" stroke="#c4a574" strokeWidth="0.8" />
          </g>
        </g>
      </svg>
    </div>
  );
}

function Hound() {
  return (
    <div className="wm-town-hound absolute w-[8.5%]" style={{ left: "6%", top: "78%", transform: "translate(-50%, -100%)" }}>
      <svg viewBox="-16 -14 32 18" className="block w-full overflow-visible" aria-hidden="true">
        <ellipse cx="1" cy="2" rx="8" ry="1.5" fill="#1c1612" opacity="0.15" />
        <g transform="translate(-5 -1)">
          <g className="wm-town-leg">
            <path d="M0 0 V6" stroke="#4a3424" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </g>
        <g transform="translate(4 -1)">
          <g className="wm-town-leg wm-town-leg-b">
            <path d="M0 0 V6" stroke="#4a3424" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        </g>
        <ellipse cx="0" cy="-3" rx="8" ry="4" fill="#6b4428" />
        <circle cx="7.2" cy="-5" r="2.7" fill="#5c3a22" />
        <circle cx="8.2" cy="-5.2" r="0.45" fill="#231910" />
        <path d="M-8 -4 Q -13 -2 -11 -7" stroke="#6b4428" strokeWidth="1.5" fill="none" strokeLinecap="round" className="wm-town-sway" />
      </svg>
    </div>
  );
}

function Work({
  id,
  level,
  rising,
  theme,
  picked,
}: {
  id: BuildingId;
  level: number;
  rising: boolean;
  theme: Theme;
  picked: boolean;
}) {
  const unbuilt = level <= 0 && !rising;
  const look = unbuilt ? { ...theme, smoke: false, lit: false } : theme;
  const front = id === "yard" || id === "market" || id === "loom";
  return (
    <g>
      {picked && <ellipse cx="0" cy="4" rx="26" ry="6" fill="none" stroke="#e6c56e" strokeWidth="1.6" className="wm-town-flicker" />}
      <g key={`${id}-${level}`} className={level > 0 ? "wm-town-arrive" : undefined}>
        <Body id={id} stage={level <= 0 ? 1 : stageOf(level)} theme={look} />
      </g>
      {level > 0 && <Pips level={level} />}
      {rising && <Scaffold w={FRAME[id].w} h={FRAME[id].h} />}
      {level === 0 && (
        <text
          y={front ? 20 : 16}
          textAnchor="middle"
          fontSize="11"
          fontWeight="600"
          fill="#231910"
          stroke="#f3eadb"
          strokeWidth="3"
          paintOrder="stroke"
          style={{ fontFamily: "var(--font-outfit), ui-sans-serif, sans-serif" }}
        >
          {SHORT[id]}
        </text>
      )}
      {id === "watch" && theme.stake && <Stake />}
      {id === "shrine" && theme.shrine && level === 0 && <Candle />}
    </g>
  );
}

function Body({ id, stage, theme }: { id: BuildingId; stage: Stage; theme: Theme }) {
  if (id === "hall") return <Hall stage={stage} theme={theme} />;
  if (id === "watch") return <Watch stage={stage} theme={theme} />;
  if (id === "shrine") return <Shrine stage={stage} theme={theme} />;
  if (id === "forge") return <Forge stage={stage} theme={theme} />;
  if (id === "still") return <Still stage={stage} theme={theme} />;
  if (id === "loom") return <Loom stage={stage} theme={theme} />;
  if (id === "strongroom") return <Vault stage={stage} theme={theme} />;
  if (id === "market") return <Market stage={stage} />;
  return <Yard stage={stage} theme={theme} />;
}

function Walls({ w, h, fill, posts = 0 }: { w: number; h: number; fill: string; posts?: number }) {
  return (
    <g>
      <ellipse cx="3" cy="3" rx={w * 0.5} ry="4.2" fill="#1c1612" opacity="0.16" />
      <rect x={-w / 2 + 4} y={-h + 3} width={w} height={h} fill="#1c1612" opacity="0.1" />
      <rect x={-w / 2} y={-h} width={w} height={h} fill={fill} />
      <rect x={-w / 2} y={-h} width="3.2" height={h} fill="#fff" opacity="0.16" />
      <rect x={w / 2 - 3} y={-h} width="3" height={h} fill="#000" opacity="0.08" />
      <rect x={-w / 2} y={-5} width={w} height="5" fill="#5c5146" opacity="0.28" />
      {posts > 1 &&
        Array.from({ length: posts }, (_, index) => (
          <rect key={index} x={-w / 2 + 3 + (index * (w - 6)) / (posts - 1)} y={-h} width="2" height={h} fill="#6b4428" opacity="0.45" />
        ))}
    </g>
  );
}

function Roof({ w, eave, peak, color, snow }: { w: number; eave: number; peak: number; color: string; snow: boolean }) {
  const y = -eave;
  return (
    <g>
      <polygon points={`${-w / 2 - 5},${y + 1} ${w / 2 + 5},${y + 1} 0,${y - peak}`} fill={color} />
      <polygon points={`${-w / 2 - 5},${y + 1} ${-w / 2 + 2},${y + 1} 0,${y - peak}`} fill="#fff" opacity="0.14" />
      {snow && <polygon points={`${-w / 2 - 3},${y} ${w / 2 + 3},${y} 0,${y - peak + 3}`} fill="#f7fbff" opacity="0.75" />}
    </g>
  );
}

function Door({ x = -4.5, w = 9, h = 14 }: { x?: number; w?: number; h?: number }) {
  return (
    <g>
      <rect x={x} y={-h} width={w} height={h} rx="1" fill="#2a2118" />
      <circle cx={x + w - 2.2} cy={-h / 2} r="0.7" fill="#e6c56e" />
    </g>
  );
}

function Win({ x, y, w = 6, h = 7, lit = true }: { x: number; y: number; w?: number; h?: number; lit?: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} rx="0.6" fill="#241c16" />
      <rect className={lit ? "wm-town-flicker" : undefined} x={x + 0.7} y={y + 0.7} width={w - 1.4} height={h - 1.4} rx="0.3" fill={lit ? "#f6e2a8" : "#9aa8b4"} />
      <path d={`M${x + w / 2} ${y} V${y + h} M${x} ${y + h / 2} H${x + w}`} stroke="#241c16" strokeWidth="0.5" />
    </g>
  );
}

function Chimney({ x, y, smoke }: { x: number; y: number; smoke: boolean }) {
  return (
    <g>
      <rect x={x} y={y} width="6" height="14" fill="#6e6862" />
      <rect x={x - 1} y={y} width="8" height="2.2" fill="#4a4540" />
      {smoke && <Smoke x={x + 3} y={y - 1} />}
    </g>
  );
}

function Hall({ stage, theme }: { stage: Stage; theme: Theme }) {
  const w = stage === 1 ? 52 : stage === 2 ? 60 : 70;
  const h = stage === 3 ? 48 : 34;
  const peak = stage === 3 ? 26 : 18;
  return (
    <g>
      {stage >= 2 && (
        <g transform="translate(-38 6)">
          <Walls w={24} h={22} fill="#d7b58a" />
          <Roof w={24} eave={22} peak={12} color={theme.roof} snow={theme.snow} />
          <Win x={-5} y={-16} lit={theme.lit} />
        </g>
      )}
      <Walls w={w} h={h} fill="#e4c89a" posts={3} />
      <Roof w={w} eave={h} peak={peak} color={theme.roof} snow={theme.snow} />
      <Door />
      <Win x={-w / 2 + 6} y={-h + 8} lit={theme.lit} />
      <Win x={w / 2 - 13} y={-h + 8} lit={theme.lit} />
      {stage === 3 && <Win x={-3} y={-h + 8} lit={theme.lit} />}
      {stage === 3 && <rect x={-12} y={-h + 2} width="24" height="3" fill="#5c4636" />}
      <Chimney x={w * 0.22} y={-h - 12} smoke={theme.smoke} />
      <Flag field={theme.field} charge={theme.charge} x={w * 0.08} y={-h - peak - 2} />
    </g>
  );
}

function Watch({ stage, theme }: { stage: Stage; theme: Theme }) {
  const h = 68 + (stage - 1) * 18;
  const w = 22 + (stage - 1) * 2;
  return (
    <g>
      <ellipse cx="2" cy="3" rx={w * 0.7} ry="4" fill="#1c1612" opacity="0.16" />
      <rect x={-w / 2} y={-h} width={w} height={h} fill="#9a938c" />
      <rect x={-w / 2} y={-h} width="3.5" height={h} fill="#c9c2ba" />
      {Array.from({ length: 4 }, (_, index) => (
        <path key={index} d={`M${-w / 2} ${-h + 12 + index * (h / 5)} H${w / 2}`} stroke="#6e6862" strokeWidth="0.7" opacity="0.45" />
      ))}
      {Array.from({ length: 3 }, (_, index) => (
        <rect key={index} x={-w / 2 + index * (w / 3) + 0.6} y={-h - 8} width={w / 3 - 2} height="9" fill="#7a746e" />
      ))}
      {theme.snow && <rect x={-w / 2 - 1} y={-h - 1} width={w + 2} height="3" fill="#f7fbff" />}
      <Door w={7} h={12} x={-3.5} />
      <Win x={-2.4} y={-h * 0.72} w={4.8} h={7} lit={theme.lit} />
      {stage >= 2 && <Win x={-2.4} y={-h * 0.46} w={4.8} h={6} lit={theme.lit} />}
      <Flag field={theme.field} charge={theme.charge} x={-0.6} y={-h - 16} />
    </g>
  );
}

function Shrine({ stage, theme }: { stage: Stage; theme: Theme }) {
  const h = 36 + (stage - 1) * 6;
  const peak = 28 + stage * 4;
  return (
    <g>
      {stage >= 2 && (
        <g transform="translate(22 8)">
          <Walls w={18} h={18} fill="#efe8dc" />
          <Roof w={18} eave={18} peak={12} color={theme.roof} snow={theme.snow} />
        </g>
      )}
      <Walls w={28 + stage * 2} h={h} fill="#f4efe6" />
      <Roof w={30 + stage * 2} eave={h} peak={peak} color={theme.roof} snow={theme.snow} />
      <Win x={-4} y={-h + 10} w={8} h={10} lit={theme.lit} />
      <Door w={7} h={12} x={-3.5} />
      <rect x="-1.1" y={-h - peak - 12} width="2.2" height="14" fill="#e6c56e" />
      <rect x="-5" y={-h - peak - 8} width="10" height="2.2" fill="#e6c56e" />
      {stage >= 2 && <Candle />}
    </g>
  );
}

function Forge({ stage, theme }: { stage: Stage; theme: Theme }) {
  const w = 36 + (stage - 1) * 8;
  const h = 28 + (stage - 1) * 4;
  return (
    <g>
      <Walls w={w} h={h} fill="#5c5146" />
      <Roof w={w} eave={h} peak={14} color="#2a2118" snow={theme.snow} />
      <rect className={theme.lit ? "wm-town-flicker" : undefined} x={-w * 0.28} y={-14} width={12 + stage * 2} height="10" rx="1" fill={theme.lit ? "#e07a3d" : "#3a2a22"} />
      {theme.lit && <rect className="wm-town-flicker" x={-w * 0.28} y={-14} width={12 + stage * 2} height="3" fill="#f6e2a8" opacity="0.85" />}
      <polygon points={`${w * 0.05},0 ${w * 0.42},0 ${w * 0.48},-4 ${w * 0.28},-7 ${w * 0.02},-4`} fill="#5c5854" />
      <Chimney x={w * 0.18} y={-h - 12} smoke={theme.smoke} />
      {theme.lit && stage >= 1 && (
        <>
          <circle className="wm-town-spark" cx="6" cy={-h} r="1.3" fill="#e6c56e" />
          <circle className="wm-town-spark wm-town-spark-b" cx="12" cy={-h + 4} r="1" fill="#f4ead7" />
        </>
      )}
    </g>
  );
}

function Still({ stage, theme }: { stage: Stage; theme: Theme }) {
  return (
    <g>
      <g transform="translate(12 0)">
        <Walls w={26} h={26} fill="#d7b58a" />
        <Roof w={26} eave={26} peak={14} color="#6b4428" snow={theme.snow} />
        <Door w={7} h={12} x={-3.5} />
        <Win x={4} y={-18} lit={theme.lit} />
      </g>
      {Array.from({ length: Math.min(stage, 2) }, (_, index) => (
        <g key={index} transform={`translate(${-26 + index * 14} 0)`}>
          <rect x="-6" y="-14" width="12" height="12" fill="#b87333" />
          <ellipse cx="0" cy="-14" rx="6" ry="2.6" fill="#d59a5c" />
          <ellipse cx="0" cy="-2" rx="6" ry="2.2" fill="#8d5a32" />
          {theme.smoke && <Smoke x={0} y={-18} />}
        </g>
      ))}
      {stage === 3 && (
        <g transform="translate(32 0)">
          <ellipse cx="0" cy="-3" rx="4.5" ry="3.4" fill="#6b4428" />
          <ellipse cx="7" cy="-1" rx="3.6" ry="2.8" fill="#5c3a22" />
        </g>
      )}
    </g>
  );
}

function Loom({ stage, theme }: { stage: Stage; theme: Theme }) {
  const h = 26 + (stage - 1) * 4;
  return (
    <g>
      <Walls w={40 + stage * 4} h={h} fill="#e7d7b8" posts={2} />
      <Roof w={42 + stage * 4} eave={h} peak={14} color={theme.roof} snow={theme.snow} />
      <Door />
      <Win x={-18} y={-h + 7} lit={theme.lit} />
      {stage >= 2 && <Win x={10} y={-h + 7} lit={theme.lit} />}
      <Chimney x={8} y={-h - 10} smoke={theme.smoke} />
      <Clothesline count={stage + 1} y={-h + 4} />
    </g>
  );
}

function Vault({ stage, theme }: { stage: Stage; theme: Theme }) {
  const w = 34 + (stage - 1) * 6;
  const h = 30 + (stage - 1) * 6;
  return (
    <g>
      <Walls w={w} h={h} fill="#8a8680" />
      <Roof w={w} eave={h} peak={8} color="#4e5966" snow={theme.snow} />
      <rect x={-w * 0.22} y={-h * 0.62} width={w * 0.44} height={h * 0.62} rx="1" fill="#2c2824" />
      <rect x={-w * 0.26} y={-h * 0.5} width={w * 0.52} height="2.2" fill="#c4a574" />
      <rect x={-w * 0.26} y={-h * 0.28} width={w * 0.52} height="2.2" fill="#c4a574" />
      <circle cx={w * 0.08} cy={-h * 0.22} r="1.4" fill="#e6c56e" />
      {stage >= 2 && (
        <>
          <rect x={-w / 2 - 3} y={-h * 0.7} width="4" height={h * 0.7} fill="#6e6862" />
          <rect x={w / 2 - 1} y={-h * 0.7} width="4" height={h * 0.7} fill="#6e6862" />
        </>
      )}
      {stage === 3 && (
        <>
          <rect x={-w / 2 - 3} y={-h * 0.7 - 6} width="6" height="6" fill="#5c5854" />
          <rect x={w / 2 - 3} y={-h * 0.7 - 6} width="6" height="6" fill="#5c5854" />
        </>
      )}
    </g>
  );
}

function Market({ stage }: { stage: Stage }) {
  const count = stage;
  const colors = ["#7c2a24", "#2c4a38", "#1e3a40"];
  return (
    <g>
      {Array.from({ length: count }, (_, index) => {
        const x = (index - (count - 1) / 2) * 26;
        return (
          <g key={index} transform={`translate(${x} 0)`}>
            <rect x="-10" y="-4" width="20" height="4" fill="#6b5344" />
            <rect x="-9" y="-16" width="18" height="12" fill="#f3e6cc" />
            <g className="wm-town-awning" style={{ animationDelay: `${index * 0.25}s` }}>
              <path d="M-12 -16 Q 0 -24 12 -16 L 11 -10 Q 0 -15 -11 -10 Z" fill={colors[index]} />
            </g>
            <rect x="-1" y="-12" width="2" height="12" fill="#6b5344" />
            <rect x="-7" y="-8" width="4" height="3" fill="#c6a45c" />
            <rect x="3" y="-7" width="4" height="3" fill="#7c2a24" />
          </g>
        );
      })}
    </g>
  );
}

function Yard({ stage, theme }: { stage: Stage; theme: Theme }) {
  const stalks = 4 + stage * 2;
  return (
    <g>
      <rect x="-34" y="-16" width="68" height="18" rx="2" fill="#6f8f48" />
      <rect x="-34" y="-5" width="68" height="7" fill="#5f7a3c" />
      {Array.from({ length: stalks }, (_, index) => (
        <g key={index} transform={`translate(${-30 + index * (60 / stalks)} 0)`}>
          <g className="wm-town-sway" style={{ animationDelay: `${index * 0.12}s` }}>
            <path d="M0 0 Q 2 -10 0 -18" fill="none" stroke="#e6c56e" strokeWidth="1.6" strokeLinecap="round" />
          </g>
        </g>
      ))}
      {stage >= 2 && <Fence />}
      {(stage >= 2 || theme.mill) && <Mill fast={theme.mill} />}
    </g>
  );
}

function Fence() {
  return (
    <g stroke="#6b4428" strokeWidth="1.2" strokeLinecap="round">
      <path d="M-36 -1 H36" />
      <path d="M-36 4 H36" />
      {[-36, -18, 0, 18, 36].map((x) => (
        <path key={x} d={`M${x} 6 V-8`} />
      ))}
    </g>
  );
}

function Mill({ fast }: { fast: boolean }) {
  return (
    <g transform="translate(-24 -8)">
      <Walls w={16} h={18} fill="#e7d3a8" />
      <Roof w={16} eave={18} peak={10} color="#7c2a24" snow={false} />
      <g transform="translate(14 -10)">
        <g className={fast ? "wm-town-spin wm-town-spin-fast" : "wm-town-spin"}>
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <polygon key={angle} transform={`rotate(${angle})`} points="0,0 2.2,-15 -2.2,-15" fill="#f4ead7" stroke="#6b4428" strokeWidth="0.45" />
          ))}
          <circle r="2.1" fill="#6b4428" />
        </g>
      </g>
    </g>
  );
}

function Clothesline({ count, y }: { count: number; y: number }) {
  const cloth = ["#7c2a24", "#e6c56e", "#2c4a38", "#f4ead7"];
  return (
    <g transform={`translate(0 ${y})`}>
      <path d="M-22 -8 H24" stroke="#5c4636" strokeWidth="0.8" />
      {cloth.slice(0, Math.min(4, count)).map((fill, index) => (
        <g key={fill} transform={`translate(${-16 + index * 12} -8)`}>
          <g className="wm-town-sway" style={{ animationDelay: `${index * 0.15}s` }}>
            <rect x="-3.2" y="0" width="7" height="9" fill={fill} />
          </g>
        </g>
      ))}
    </g>
  );
}

function Cottage({ roof, snow, smoke }: { roof: string; snow: boolean; smoke: boolean }) {
  return (
    <g>
      <ellipse cx="1" cy="2" rx="13" ry="3" fill="#1c1612" opacity="0.14" />
      <rect x="-12" y="-16" width="24" height="16" fill="#e7d3a8" />
      <rect x="-12" y="-16" width="3" height="16" fill="#fff" opacity="0.18" />
      <polygon points="-14,-16 14,-16 0,-30" fill={roof} />
      {snow && <polygon points="-14,-16 14,-16 0,-30" fill="#f7fbff" opacity="0.62" />}
      <rect x="-2.5" y="-9" width="5" height="9" fill="#2a2118" />
      <Win x={-10} y={-12} w={4.5} h={5} />
      <rect x="5" y="-26" width="3.2" height="10" fill="#6e6862" />
      {smoke && <Smoke x={6.6} y={-28} />}
    </g>
  );
}

function Well() {
  return (
    <g>
      <ellipse cx="0" cy="2" rx="10" ry="3.4" fill="#8d8680" />
      <ellipse cx="0" cy="0" rx="8" ry="2.6" fill="#243044" />
      <path d="M-8 0 V-12 M8 0 V-12" stroke="#6b4428" strokeWidth="1.4" />
      <path d="M-9 -12 H9" stroke="#6b4428" strokeWidth="1.4" />
      <path d="M-8 -12 L0 -18 L8 -12" fill="#6b4428" />
      <g className="wm-town-sway">
        <path d="M0 -12 V-4" stroke="#5c4636" strokeWidth="0.7" />
        <rect x="-2" y="-4" width="4" height="3" fill="#6b5344" />
      </g>
    </g>
  );
}

function Pips({ level }: { level: number }) {
  if (level <= 0) return null;
  return (
    <g>
      {Array.from({ length: level }, (_, index) => (
        <circle key={index} cx={(index - (level - 1) / 2) * 4.6} cy="9" r="1.5" fill="#e6c56e" stroke="#231910" strokeWidth="0.35" />
      ))}
    </g>
  );
}

function Scaffold({ w, h }: { w: number; h: number }) {
  const top = -h;
  const half = w / 2;
  return (
    <g>
      <g stroke="#3a2a22" strokeWidth="2.1" fill="none" strokeLinecap="round">
        <path d={`M${-half} 4 V${top}`} />
        <path d={`M${half} 4 V${top}`} />
        <path d={`M${-half - 2} ${top + 8} H${half + 2}`} stroke="#e6c56e" />
        <path d={`M${-half - 2} ${top * 0.5} H${half + 2}`} />
        <path d={`M${-half} 4 L${half} ${top * 0.35}`} />
        <path d={`M${half} 4 L${-half} ${top * 0.35}`} />
      </g>
      <g className="wm-town-ghost">
        <rect className="wm-town-beam" x={-half + 4} y={top + 14} width={w - 8} height="4" fill="#e7c99a" />
      </g>
      <circle className="wm-town-spark" cx="-6" cy="-8" r="1.2" fill="#c4b59a" />
      <circle className="wm-town-spark wm-town-spark-b" cx="8" cy="-4" r="1" fill="#e7d3a8" />
    </g>
  );
}

function Flag({ field, charge, x, y }: { field: string; charge: string; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="0" y="0" width="1.3" height="18" fill="#3a2a22" />
      <g className="wm-town-flag">
        <path d="M1.3 0 H15 L12 4.5 L15 9 H1.3 Z" fill={field} />
        <path d="M1.8 3.6 H12.4" stroke={charge} strokeWidth="1.5" />
      </g>
    </g>
  );
}

function Smoke({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r="2.5" fill="#f4f1ea" className="wm-town-smoke" />
      <circle r="1.8" cx="1.6" fill="#fff" className="wm-town-smoke" style={{ animationDelay: "-1.3s" }} />
    </g>
  );
}

function Candle() {
  return (
    <g transform="translate(-14 2)">
      <rect x="-1.5" y="-10" width="3" height="10" fill="#f4ead7" />
      <circle className="wm-town-flicker" cy="-12" r="1.8" fill="#e6c56e" />
    </g>
  );
}

function Stake() {
  return (
    <g transform="translate(18 0)">
      <rect x="-1.1" y="-28" width="2.2" height="28" fill="#3a3530" />
      <polygon points="-5,-28 5,-28 0,-36" fill="#8d8680" />
      <circle className="wm-town-flicker" cy="-18" r="1.6" fill="#9fd0e0" />
    </g>
  );
}

function Skyline({ holdId }: { holdId: HoldId }) {
  if (holdId === "highbarrow") {
    return (
      <g>
        <polygon points="20,128 78,42 136,128" fill="#d5dde4" />
        <polygon points="78,42 98,72 58,72" fill="#f7fbff" />
        <polygon points="120,130 190,54 250,130" fill="#c5d0dc" />
        <polygon points="190,54 210,80 170,80" fill="#f7fbff" />
        <polygon points="240,128 304,66 368,128" fill="#b7c3d0" />
      </g>
    );
  }
  if (holdId === "vesper") {
    return (
      <g>
        <polygon points="250,132 312,74 392,132" fill="#6e6258" />
        <rect x="334" y="66" width="3" height="18" fill="#e7e0d4" />
        <rect x="327" y="72" width="16" height="2.4" fill="#e7e0d4" />
        <Pine x={40} y={128} h={38} />
        <Pine x={78} y={132} h={28} />
      </g>
    );
  }
  if (holdId === "saltmere") {
    return (
      <g>
        <path d="M0 126 C 40 116, 90 132, 150 120 L 150 142 L 0 142 Z" fill="#7f93a3" opacity="0.9" />
        <path className="wm-town-sway" d="M8 124 Q 40 118 70 124" fill="none" stroke="#f4ead7" strokeWidth="1" opacity="0.45" />
        <path d="M250 124 C 310 110, 360 128, 400 116 L 400 144 L 250 144 Z" fill="#8eabba" />
        <g className="wm-town-boat">
          <path d="M-12 2 Q 0 8 12 2 L 8 5 Q 0 9 -8 5 Z" fill="#6b4428" />
          <path d="M0 2 V-14" stroke="#5c4636" strokeWidth="1.1" />
          <path d="M0 -14 L 9 -3 L 0 -3 Z" fill="#f4ead7" />
        </g>
      </g>
    );
  }
  const pines = holdId === "ashfold" ? [18, 48, 86, 300, 338, 372] : [24, 58, 340, 374];
  return (
    <g>
      {pines.map((x, index) => (
        <Pine key={x} x={x} y={128 - (index % 2) * 4} h={holdId === "ashfold" ? 42 : 30} />
      ))}
    </g>
  );
}

function Pine({ x, y, h }: { x: number; y: number; h: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect x="-1.4" y={-h * 0.2} width="2.8" height={h * 0.22} fill="#4a3424" />
      <polygon points={`0,${-h} ${-11},0 11,0`} fill="#1e3a2a" />
      <polygon points={`0,${-h * 0.62} ${-8},${-h * 0.22} 8,${-h * 0.22}`} fill="#2f4a38" />
    </g>
  );
}

function Sheep() {
  return (
    <g className="wm-town-sheep">
      <SheepShape />
    </g>
  );
}

function SheepShape() {
  return (
    <g>
      <ellipse cx="0" cy="0" rx="7" ry="4.2" fill="#f7f1e6" />
      <circle cx="6" cy="-1.5" r="2.6" fill="#f7f1e6" />
      <circle cx="6.8" cy="-1.8" r="0.45" fill="#231910" />
      <g transform="translate(-3 3)">
        <g className="wm-town-leg">
          <path d="M0 0 V4" stroke="#6b5344" strokeWidth="1" />
        </g>
      </g>
      <g transform="translate(2 3)">
        <g className="wm-town-leg wm-town-leg-b">
          <path d="M0 0 V4" stroke="#6b5344" strokeWidth="1" />
        </g>
      </g>
    </g>
  );
}

function Deer() {
  return (
    <g className="wm-town-deer">
      <ellipse cx="0" cy="0" rx="9" ry="3.4" fill="#6b4428" />
      <circle cx="8" cy="-1.5" r="2.2" fill="#6b4428" />
      <path d="M7 -3 L5 -10 M9 -3 L12 -10" stroke="#5c4636" strokeWidth="1" fill="none" />
      <g transform="translate(-6 2)">
        <g className="wm-town-leg">
          <path d="M0 0 V4" stroke="#4a3424" strokeWidth="1" />
        </g>
      </g>
      <g transform="translate(-1 2)">
        <g className="wm-town-leg wm-town-leg-b">
          <path d="M0 0 V4" stroke="#4a3424" strokeWidth="1" />
        </g>
      </g>
    </g>
  );
}

function Snowfall() {
  return (
    <g fill="#fff">
      {Array.from({ length: 18 }, (_, index) => (
        <circle
          key={index}
          className="wm-town-snow"
          cx={(index * 47) % 400}
          cy={-6}
          r={index % 3 === 0 ? 1.6 : 1}
          style={{ animationDelay: `${-index * 0.4}s`, animationDuration: `${3.4 + (index % 4)}s` }}
        />
      ))}
    </g>
  );
}
