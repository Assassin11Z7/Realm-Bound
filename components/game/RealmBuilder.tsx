"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { holdById } from "@/lib/game/content";
import { BUILDINGS, buildingCost, startProject } from "@/lib/game/progress";
import type { BuildingId, GameState, HoldId, Result } from "@/lib/game/types";

const TW = 156;
const TH = 78;
const WORLD_W = 1080;
const WORLD_H = 780;
const OX = 500;
const OY = 120;

const ART: Record<BuildingId, { src: string; w: number }> = {
  hall: { src: "/art/iso/hall.png", w: 176 },
  watch: { src: "/art/iso/watch.png", w: 78 },
  shrine: { src: "/art/iso/shrine.png", w: 132 },
  forge: { src: "/art/iso/forge.png", w: 158 },
  still: { src: "/art/iso/still.png", w: 156 },
  loom: { src: "/art/iso/loom.png", w: 150 },
  strongroom: { src: "/art/iso/vault.png", w: 140 },
  market: { src: "/art/iso/market.png", w: 188 },
  yard: { src: "/art/iso/yard.png", w: 176 },
};

const SITES: { id: BuildingId; c: number; r: number }[] = [
  { id: "watch", c: 0, r: 0 },
  { id: "shrine", c: 3, r: 1 },
  { id: "forge", c: 5, r: 1 },
  { id: "hall", c: 2, r: 2 },
  { id: "strongroom", c: 4, r: 2 },
  { id: "yard", c: 1, r: 3 },
  { id: "market", c: 3, r: 3 },
  { id: "loom", c: 5, r: 3 },
  { id: "still", c: 3, r: 4 },
];

const TREES: { c: number; r: number; src: string; w: number }[] = [
  { c: 0, r: 1, src: "/art/iso/oak.png", w: 110 },
  { c: 6, r: 0, src: "/art/iso/pine.png", w: 86 },
  { c: 0, r: 2, src: "/art/iso/pine.png", w: 74 },
  { c: 6, r: 2, src: "/art/iso/oak.png", w: 108 },
  { c: 0, r: 5, src: "/art/iso/oak.png", w: 132 },
  { c: 6, r: 5, src: "/art/iso/pine.png", w: 92 },
  { c: 4, r: 5, src: "/art/iso/oak.png", w: 96 },
  { c: 2, r: 0, src: "/art/iso/pine.png", w: 68 },
];

const PATH = new Set(["2,1", "1,2", "2,2", "3,2", "4,2", "1,3", "2,3", "3,3", "3,4"]);

const LOOP: [number, number][] = [
  [0.7, 3.05],
  [2.05, 3.15],
  [3.45, 3.25],
  [4.7, 3.35],
  [3.35, 4.2],
  [1.35, 4.05],
];

const CLOAKS = ["none", "hue-rotate(16deg) saturate(1.15)", "hue-rotate(-18deg) brightness(1.05)", "saturate(0.65) brightness(0.95)", "hue-rotate(32deg) saturate(0.85)"];

const THEME: Record<HoldId, { sky: string; grass: [string, string]; earth: string; dirt: string; filter: string }> = {
  greenmere: { sky: "linear-gradient(#7eb6e0 0%, #d5ecb4 62%, #5e9440 100%)", grass: ["#74b050", "#62a044"], earth: "#6d4c2c", dirt: "#c9a56c", filter: "none" },
  highbarrow: { sky: "linear-gradient(#d5e6f2 0%, #eef3f4 55%, #c5d4d4 100%)", grass: ["#e4eeea", "#d5e2dc"], earth: "#8a8178", dirt: "#d2cdc4", filter: "saturate(0.2) brightness(1.12)" },
  ashfold: { sky: "linear-gradient(#6e675e 0%, #4a433c 58%, #2e2a26 100%)", grass: ["#5a564c", "#4a463e"], earth: "#3a3028", dirt: "#7a6850", filter: "saturate(0.55) brightness(0.86)" },
  saltmere: { sky: "linear-gradient(#f2d7a4 0%, #f0e2b8 58%, #d7c48a 100%)", grass: ["#d2c07a", "#c4b06a"], earth: "#a07848", dirt: "#e0c48a", filter: "sepia(0.22) saturate(1.12)" },
  vesper: { sky: "linear-gradient(#2c2448 0%, #6a4a68 55%, #3a4038 100%)", grass: ["#3e5340", "#354838"], earth: "#3a3028", dirt: "#6a5844", filter: "saturate(0.72) brightness(0.84)" },
  woolford: { sky: "linear-gradient(#9ec8ea 0%, #e4efc0 60%, #b7c86a 100%)", grass: ["#8fb85a", "#c6b86a"], earth: "#7a5a34", dirt: "#d2b27a", filter: "sepia(0.08) saturate(1.05)" },
};

const DIAMOND = "polygon(50% 0, 100% 50%, 50% 100%, 0 50%)";

function iso(c: number, r: number) {
  return { x: OX + (c - r) * (TW / 2), y: OY + (c + r) * (TH / 2) };
}

function along(points: { x: number; y: number }[], u: number) {
  const n = points.length;
  const f = u * n;
  const i = Math.floor(f) % n;
  const t = f - Math.floor(f);
  const a = points[i];
  const b = points[(i + 1) % n];
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

function Folk({
  points,
  count,
  weary,
  merry,
}: {
  points: { x: number; y: number }[];
  count: number;
  weary: boolean;
  merry: boolean;
}) {
  const roots = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const nodes = roots.current.filter((node): node is HTMLDivElement => Boolean(node));
    const paint = (node: HTMLDivElement, x: number, y: number, flip: number) => {
      node.style.left = `${x}px`;
      node.style.top = `${y}px`;
      node.style.transform = `translate(-50%, -100%) scaleX(${flip})`;
      node.style.zIndex = String(Math.round(y));
    };
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || points.length < 2) {
      nodes.forEach((node, index) => {
        const spot = points[index % points.length];
        paint(node, spot.x, spot.y, 1);
      });
      return;
    }
    const period = weary ? 14000 : merry ? 7800 : 10400;
    const started = performance.now();
    let frameId = 0;
    const tick = (now: number) => {
      nodes.forEach((node, index) => {
        const u = ((now - started) / period + index / nodes.length) % 1;
        const spot = along(points, u);
        const next = along(points, (u + 0.02) % 1);
        paint(node, spot.x, spot.y, next.x < spot.x - 0.3 ? -1 : 1);
      });
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [points, count, weary, merry]);

  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          ref={(node) => {
            roots.current[index] = node;
          }}
          className="wm-iso-walk pointer-events-none absolute"
          style={{
            left: points[index % points.length]?.x ?? 0,
            top: points[index % points.length]?.y ?? 0,
            transform: "translate(-50%, -100%)",
            filter: `drop-shadow(0 6px 2px rgba(30,18,8,.35)) ${CLOAKS[index % CLOAKS.length]}`,
            zIndex: Math.round(points[index % points.length]?.y ?? 0),
            animationDelay: `${-index * 0.14}s`,
          }}
        />
      ))}
    </>
  );
}

export function RealmBuilder({
  state,
  holdId,
  act,
}: {
  state: GameState;
  holdId: HoldId;
  act?: (result: Result) => void;
}) {
  const hold = holdById(holdId);
  const mine = holdId === state.player.holdId;
  const camp = mine ? state.campaign : null;
  const buildable = Boolean(act && camp);
  const settlement = state.settlements?.find((item) => item.holdId === holdId);
  const souls = settlement?.souls ?? 40;
  const mood = settlement?.mood ?? 60;
  const bread = settlement?.bread ?? 8;
  const weary = mood < 40 || bread === 0;
  const merry = mood >= 70 && bread > 0;
  const theme = THEME[holdId];
  const snow = holdId === "highbarrow" || state.day > 12;
  const member = state.compact.members.find((item) => item.holdId === holdId);
  const [picked, setPicked] = useState<BuildingId | null>(null);
  const [popId, setPopId] = useState<BuildingId | null>(null);
  const viewRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const panRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const suppressClick = useRef(false);
  const prevLevels = useRef<Partial<Record<BuildingId, number>> | null>(null);

  const loop = useMemo(() => LOOP.map(([c, r]) => iso(c, r)), []);
  const projectId = camp?.project ?? null;
  const crew = useMemo(() => {
    const site = SITES.find((item) => item.id === projectId);
    if (!site) return null;
    return [iso(site.c - 0.15, site.r + 0.72), iso(site.c + 0.35, site.r + 0.62)];
  }, [projectId]);

  const spec = picked ? BUILDINGS.find((item) => item.id === picked) : null;
  const pickedLevel = picked && camp ? (camp.buildings[picked] ?? 0) : picked ? (picked === "hall" || picked === "shrine" ? 1 : 0) : 0;
  const cost = picked && camp ? buildingCost(state, picked) : null;
  const projectName = BUILDINGS.find((item) => item.id === projectId)?.name;

  useEffect(() => {
    const levels = camp?.buildings;
    if (!levels) return;
    const prev = prevLevels.current;
    if (prev) {
      (Object.keys(levels) as BuildingId[]).forEach((id) => {
        if ((levels[id] ?? 0) > (prev[id] ?? 0)) setPopId(id);
      });
    }
    prevLevels.current = { ...levels };
  }, [camp?.buildings]);

  useEffect(() => {
    const view = viewRef.current;
    const world = worldRef.current;
    if (!view || !world) return;
    const hall = iso(2, 2);
    const next = clampPan(view, view.clientWidth / 2 - hall.x, view.clientHeight * 0.58 - hall.y);
    panRef.current = next;
    world.style.transform = `translate(${next.x}px, ${next.y}px)`;
  }, [holdId]);

  const tiles = useMemo(() => {
    const cells: { c: number; r: number; x: number; y: number }[] = [];
    for (let r = 0; r <= 5; r += 1) {
      for (let c = 0; c <= 6; c += 1) cells.push({ c, r, ...iso(c, r) });
    }
    return cells;
  }, []);

  return (
    <section className="overflow-hidden rounded-2xl bg-[#1c2418] ring-1 ring-foreground/10" aria-label={`Realm of ${hold.name}`}>
      <div
        ref={viewRef}
        className="relative h-[460px] touch-none overflow-hidden"
        style={{ background: theme.sky }}
        onPointerDown={(event) => {
          if (event.button !== 0) return;
          dragRef.current = { x: event.clientX, y: event.clientY, px: panRef.current.x, py: panRef.current.y, moved: false };
        }}
        onPointerMove={(event) => {
          const drag = dragRef.current;
          const view = viewRef.current;
          const world = worldRef.current;
          if (!drag || !view || !world) return;
          const dx = event.clientX - drag.x;
          const dy = event.clientY - drag.y;
          if (!drag.moved && Math.hypot(dx, dy) < 8) return;
          drag.moved = true;
          const next = clampPan(view, drag.px + dx, drag.py + dy);
          panRef.current = next;
          world.style.transform = `translate(${next.x}px, ${next.y}px)`;
        }}
        onPointerUp={() => {
          suppressClick.current = Boolean(dragRef.current?.moved);
          dragRef.current = null;
        }}
        onPointerLeave={() => {
          suppressClick.current = Boolean(dragRef.current?.moved);
          dragRef.current = null;
        }}
        onClickCapture={(event) => {
          if (!suppressClick.current) return;
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }}
      >
        <div className="wm-iso-cloud pointer-events-none absolute top-8 h-8 w-28 rounded-full bg-white/75 blur-[2px]" />
        <div className="wm-iso-cloud pointer-events-none absolute top-16 h-6 w-20 rounded-full bg-white/55 blur-[2px]" style={{ animationDuration: "38s", animationDelay: "-14s" }} />
        {snow &&
          Array.from({ length: 16 }, (_, index) => (
            <span
              key={index}
              className="wm-iso-snow pointer-events-none absolute top-0 size-1 rounded-full bg-white"
              style={{ left: `${(index * 17) % 100}%`, animationDelay: `${-index * 0.35}s`, opacity: 0.85 }}
            />
          ))}
        <div ref={worldRef} className="absolute left-0 top-0 will-change-transform" style={{ width: WORLD_W, height: WORLD_H, filter: theme.filter }}>
          <div
            className="absolute rounded-[50%]"
            style={{
              left: OX - 220,
              top: OY + 40,
              width: 760,
              height: 460,
              background: `radial-gradient(ellipse at center, ${theme.grass[0]} 0%, ${theme.grass[0]}cc 42%, transparent 72%)`,
            }}
          />
          {tiles.map((tile) => {
            const key = `${tile.c},${tile.r}`;
            const dirt = PATH.has(key);
            const shade = (tile.c + tile.r) % 2 === 0 ? theme.grass[0] : theme.grass[1];
            return (
              <div key={key} className="absolute" style={{ left: tile.x, top: tile.y, width: TW - 6, height: TH - 3, transform: "translate(-50%, -50%)", zIndex: 1 }}>
                <span className="absolute inset-x-0 top-2 bottom-[-8px]" style={{ background: theme.earth, clipPath: DIAMOND }} />
                <span className="absolute inset-0" style={{ background: dirt ? theme.dirt : shade, clipPath: DIAMOND }} />
              </div>
            );
          })}
          {TREES.map((tree) => {
            const spot = iso(tree.c, tree.r);
            return (
              <img
                key={`${tree.c}-${tree.r}-${tree.src}`}
                src={tree.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute"
                style={{ left: spot.x, top: spot.y, width: tree.w, transform: "translate(-50%, -100%)", zIndex: Math.round(spot.y), filter: "drop-shadow(0 10px 4px rgba(30,20,8,.28))" }}
              />
            );
          })}
          {SITES.map((site) => {
            const spot = iso(site.c, site.r);
            const level = camp ? (camp.buildings[site.id] ?? 0) : site.id === "hall" || site.id === "shrine" ? 1 : 0;
            const show = camp ? site.id === "hall" || level > 0 : site.id === "hall" || site.id === "shrine";
            const pad = Boolean(camp) && site.id !== "hall" && level === 0;
            const rising = projectId === site.id;
            const art = ART[site.id];
            const name = BUILDINGS.find((item) => item.id === site.id)?.name ?? site.id;
            if (!show && !pad) return null;
            if (pad) {
              return (
                <button
                  key={site.id}
                  type="button"
                  aria-label={`${name}, empty plot`}
                  onClick={() => setPicked(site.id)}
                  className={`absolute cursor-pointer border-0 bg-transparent p-0 ${picked === site.id ? "wm-iso-pad" : ""}`}
                  style={{ left: spot.x, top: spot.y, width: 96, height: 52, transform: "translate(-50%, -62%)", zIndex: Math.round(spot.y) }}
                >
                  <span className="absolute inset-x-0 top-2 bottom-[-7px]" style={{ background: "#6d4c2c", clipPath: DIAMOND }} />
                  <span className="absolute inset-0" style={{ background: picked === site.id ? "#e7d3a4" : "#cbbba6", clipPath: DIAMOND }} />
                  <span className="absolute inset-0 grid place-items-center font-display text-xl text-[#3a2e22]">+</span>
                  {rising && <Scaffold />}
                </button>
              );
            }
            const scale = 1 + Math.max(0, level - 1) * 0.06;
            return (
              <div key={site.id} className="contents">
                <div
                  className="pointer-events-none absolute"
                  style={{ left: spot.x, top: spot.y, width: art.w, transform: "translate(-50%, -100%)", zIndex: Math.round(spot.y) }}
                >
                  <span className="absolute top-full left-1/2 h-3 w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-black/25 blur-[1px]" />
                  <span className={`block origin-bottom ${popId === site.id ? "wm-iso-pop" : ""}`} style={{ transform: `scale(${scale})` }} onAnimationEnd={() => setPopId(null)}>
                    <img src={art.src} alt="" draggable={false} className="w-full" style={{ filter: "drop-shadow(0 14px 6px rgba(30,18,8,.35))" }} />
                    {rising && <Scaffold side />}
                  </span>
                  <span className="absolute top-full left-1/2 mt-1 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#1c1612]/80 px-2 py-0.5 text-[10px] font-medium tracking-wide text-[#f8f1e4]">
                    {name}
                    {level > 0 && (
                      <span className="ml-1 inline-flex gap-0.5 align-middle">
                        {Array.from({ length: level }, (_, index) => (
                          <i key={index} className="inline-block size-1 rounded-full bg-[#e6c56e]" />
                        ))}
                      </span>
                    )}
                  </span>
                </div>
                <button
                  type="button"
                  aria-pressed={picked === site.id}
                  aria-label={`${name}, level ${level}`}
                  onClick={() => setPicked(site.id)}
                  className="absolute cursor-pointer border-0 bg-transparent p-0"
                  style={{ left: spot.x, top: spot.y, width: 92, height: 48, transform: "translate(-50%, -58%)", zIndex: Math.round(spot.y) + 1, clipPath: DIAMOND }}
                />
              </div>
            );
          })}
          <Folk points={loop} count={camp ? 5 : 3} weary={weary} merry={merry} />
          {crew && <Folk points={crew} count={1} weary={false} merry={false} />}
          {projectId &&
            [0, 1, 2].map((index) => {
              const site = SITES.find((item) => item.id === projectId);
              if (!site) return null;
              const spot = iso(site.c, site.r);
              return (
                <span
                  key={index}
                  className="wm-iso-dust pointer-events-none absolute size-2 rounded-full bg-[#e7d3a8]"
                  style={{ left: spot.x + (index - 1) * 14, top: spot.y - 8, zIndex: Math.round(spot.y) + 1, animationDelay: `${index * 0.35}s`, ["--dx" as string]: `${(index - 1) * 16}px` }}
                />
              );
            })}
        </div>
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_70px_rgba(18,14,8,.38)]" />
        <div className="pointer-events-none absolute top-3 left-3 rounded-full bg-[#1c1612]/75 px-3 py-1 text-xs text-[#f8f1e4]">
          {hold.name}
          <span className="text-[#e6c56e]"> · {souls} souls</span>
        </div>
        {projectName && (
          <div className="pointer-events-none absolute top-3 right-3 rounded-full bg-[#7c2a24]/90 px-3 py-1 text-[10px] tracking-wide text-[#f8f1e4] uppercase">
            {projectName} rising
          </div>
        )}
        {spec && (
          <div className="absolute inset-x-3 bottom-3 z-30 rounded-2xl bg-[#1c1612]/90 p-3 text-[#f8f1e4] shadow-xl backdrop-blur-sm">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium">
                {spec.name}
                <span className="ml-2 text-xs text-[#e6c56e]">{camp ? `level ${pickedLevel}/5` : "standing"}</span>
              </p>
              <button type="button" className="text-xs text-[#f4ead7]/70" onClick={() => setPicked(null)} aria-label="Close">
                Close
              </button>
            </div>
            <p className="mt-1 text-xs leading-relaxed text-[#f4ead7]/75">{spec.blurb}</p>
            {buildable && cost && camp?.project === spec.id && <p className="mt-2 text-xs tracking-wide text-[#e6c56e] uppercase">Rises at dawn</p>}
            {buildable && cost && camp?.project && camp.project !== spec.id && (
              <p className="mt-2 text-xs leading-relaxed text-[#f4ead7]/70">Another work is already rising. It finishes when you seal the day.</p>
            )}
            {buildable && cost && !camp?.project && pickedLevel >= 5 && <p className="mt-2 text-xs tracking-wide text-[#f4ead7]/60 uppercase">As high as the ridge</p>}
            {buildable && cost && !camp?.project && pickedLevel < 5 && (
              <Button type="button" variant="outline" className="mt-2 h-10 bg-[#f8f1e4] text-[#231910]" onClick={() => act?.(startProject(state, spec.id))}>
                Raise · {cost.gold}g, {cost.qty} {cost.good}
              </Button>
            )}
            {!buildable && mine && <p className="mt-2 text-xs leading-relaxed text-[#f4ead7]/70">Open the Hold tab to raise a plot. The work finishes at the next dawn.</p>}
            {!mine && (
              <p className="mt-2 text-xs leading-relaxed text-[#f4ead7]/70">
                {member?.inCompact ? `${member.name} keeps this ground for you.` : member ? `${member.name} has taken the people home.` : `${hold.lord} keeps ${hold.name}.`}
              </p>
            )}
          </div>
        )}
        {!spec && buildable && (
          <p className="pointer-events-none absolute inset-x-3 bottom-3 rounded-full bg-[#1c1612]/70 px-3 py-1.5 text-center text-[11px] text-[#f8f1e4]/85">
            {projectName ? `${projectName} finishes when you seal the day.` : "Drag to look around. Tap a plot to raise it."}
          </p>
        )}
      </div>
    </section>
  );
}

function Scaffold({ side }: { side?: boolean }) {
  return (
    <span className={`pointer-events-none absolute bottom-0 ${side ? "left-0 w-[42%]" : "left-1/2 w-[78%] -translate-x-1/2"}`}>
      <img src="/art/iso/scaffold.png" alt="" draggable={false} className="wm-iso-drop w-full" />
    </span>
  );
}

function clampPan(view: HTMLDivElement, x: number, y: number) {
  const minX = Math.min(48, view.clientWidth - WORLD_W + 80);
  const minY = Math.min(36, view.clientHeight - WORLD_H + 70);
  return {
    x: Math.min(48, Math.max(minX, x)),
    y: Math.min(36, Math.max(minY, y)),
  };
}
