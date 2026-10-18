"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  COMING_SOON,
  FIELD_CAP,
  HEROES,
  heroAbilities,
  heroEffectLine,
  heroPieceNote,
  heroSpec,
  heroSynergyRead,
  taskPhase,
  type HeroSpec,
} from "@/lib/game/heroes";
import { equipOnHero, restHeroAtHold, sendHeroOut, unequipFromHero } from "@/lib/game/engine";
import { WORN_SLOTS, traitText } from "@/lib/game/world";
import type { GameState, Gear, HeroId, HeroRarity, Result, WornSlot } from "@/lib/game/types";

const RARITY_LABEL: Record<HeroRarity, string> = {
  common: "Common",
  uncanny: "Uncanny",
  legendary: "Legendary",
  divine: "Divine",
};

const RARITY_WASH: Record<HeroRarity, string> = {
  common: "#3e5c49",
  uncanny: "#3d4a62",
  legendary: "#8d6b2e",
  divine: "#6a3d78",
};

function HeroPortrait({ spec, locked, className = "h-24 w-20" }: { spec: HeroSpec; locked: boolean; className?: string }) {
  const wash = RARITY_WASH[spec.rarity];
  const stroke = locked ? "#1c1612" : spec.rarity === "divine" ? "#e6c56e" : "#1c1612";
  const fill = locked ? "#d9d1c3" : wash;
  const weight = locked ? 3.6 : 2.1;
  return (
    <svg viewBox="0 0 80 96" className={`wm-portrait ${className}`} aria-hidden="true">
      {!locked && <ellipse cx="40" cy="50" rx="32" ry="40" fill={wash} opacity="0.2" />}
      <path d="M14 94 V60 Q40 42 66 60 V94 Z" fill={fill} stroke={stroke} strokeWidth={weight} />
      <circle cx="40" cy="30" r="15" fill={fill} stroke={stroke} strokeWidth={weight} />
      {spec.mark === "gate" && <path d="M27 18 h26 v7 h-26 z" fill="none" stroke={stroke} strokeWidth="2" />}
      {spec.mark === "pike" && <path d="M40 6 v16 M36 10 h8" fill="none" stroke={stroke} strokeWidth="2" />}
      {spec.mark === "wool" && <path d="M26 24 q14 -10 28 0" fill="none" stroke={stroke} strokeWidth="2" />}
      {spec.mark === "hearth" && <path d="M34 36 h12 v6 h-12 z" fill="none" stroke={stroke} strokeWidth="2" />}
      {spec.mark === "moth" && <path d="M22 28 q10 -14 18 0 q8 -14 18 0" fill="none" stroke={stroke} strokeWidth="2" />}
      {spec.mark === "salt" && <path d="M32 14 h16 l-3 8 h-10 z" fill="none" stroke={stroke} strokeWidth="2" />}
      {spec.mark === "lion" && <path d="M24 20 q16 -16 32 0 q-4 8 -16 6 q-12 2 -16 -6 z" fill="none" stroke={stroke} strokeWidth="2" />}
      {spec.mark === "ship" && <path d="M30 70 h20 l-3 6 h-14 z M40 58 v12" fill="none" stroke={stroke} strokeWidth="2" />}
      {spec.mark === "barrow" && <path d="M22 70 q18 -16 36 0" fill="none" stroke={stroke} strokeWidth="2" />}
      {spec.mark === "maze" && <path d="M30 22 h14 v8 h-8 v6 h8" fill="none" stroke={stroke} strokeWidth="2" />}
      {spec.mark === "owl" && (
        <path d="M32 28 h5 v4 h-5 z M43 28 h5 v4 h-5 z M36 34 h8" fill="none" stroke={stroke} strokeWidth="2" />
      )}
      {spec.mark === "raven" && <path d="M48 24 q12 4 8 12 q-8 -2 -10 -8 z" fill="none" stroke={stroke} strokeWidth="2" />}
      {spec.mark === "bolt" && <path d="M44 12 l-8 14 h6 l-4 12 12 -16 h-6 z" fill={locked ? "none" : "#e6c56e"} stroke={stroke} strokeWidth="1.6" />}
    </svg>
  );
}

function rarityGroups(): { title: string; lede: string; ids: HeroId[] }[] {
  return [
    {
      title: "Westmark",
      lede: "Named warriors of the valley. Common, then uncanny.",
      ids: HEROES.filter((hero) => hero.rarity === "common" || hero.rarity === "uncanny").map((hero) => hero.id),
    },
    {
      title: "Legendary",
      lede: "Old heroes. The missions are longer.",
      ids: HEROES.filter((hero) => hero.rarity === "legendary").map((hero) => hero.id),
    },
    {
      title: "Divine",
      lede: "Gods. The hardest missions, and almost never a chance meeting.",
      ids: HEROES.filter((hero) => hero.rarity === "divine").map((hero) => hero.id),
    },
  ];
}

export function HeroesPanel({
  state,
  act,
  part,
  focus,
  onFocus,
  onOpen,
}: {
  state: GameState;
  act: (result: Result) => void;
  part: "roster" | "company" | "missions";
  focus: HeroId;
  onFocus: (id: HeroId) => void;
  onOpen: (id: HeroId, unlocked: boolean) => void;
}) {
  if (part === "missions") return <Missions state={state} focus={focus} />;
  if (part === "company") return <Company state={state} act={act} focus={focus} onFocus={onFocus} />;
  return <Roster state={state} onOpen={onOpen} />;
}

function Roster({ state, onOpen }: { state: GameState; onOpen: (id: HeroId, unlocked: boolean) => void }) {
  const tasks = state.heroTasks ?? [];
  const out = (state.heroes ?? []).filter((hero) => hero.fielded).length;
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {out} of {FIELD_CAP} on the road. Locked names are still only an outline. Missions are the sure way in.
      </p>
      {rarityGroups().map((group) => (
        <section key={group.title} className="flex flex-col gap-2">
          <div>
            <p className="font-display text-xl">{group.title}</p>
            <p className="text-xs text-muted-foreground">{group.lede}</p>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {group.ids.map((id) => {
              const spec = heroSpec(id);
              const record = (state.heroes ?? []).find((hero) => hero.id === id);
              const unlocked = Boolean(record?.unlocked);
              const now = tasks.find((task) => task.heroId === id && taskPhase(tasks, task) === "now");
              return (
                <li key={id}>
                  <button
                    type="button"
                    data-hero={id}
                    data-unlocked={unlocked ? "yes" : "no"}
                    data-rarity={spec.rarity}
                    onClick={() => onOpen(id, unlocked)}
                    className={`flex h-full w-full flex-col items-center rounded-2xl px-2 py-4 text-center ${unlocked ? "wm-hero-live" : "wm-hero-locked"}`}
                  >
                    <HeroPortrait spec={spec} locked={!unlocked} />
                    <p className={`mt-1.5 text-sm font-medium ${unlocked ? "" : "tracking-wide text-[#1c1612]"}`}>{spec.name}</p>
                    <p
                      className="text-[10px] tracking-wide uppercase"
                      style={{ color: unlocked ? RARITY_WASH[spec.rarity] : "#5c5146" }}
                    >
                      {RARITY_LABEL[spec.rarity]}
                      {record?.fielded ? " · out" : unlocked ? " · at the hold" : " · outline"}
                    </p>
                    {!unlocked && now && (
                      <p className="mt-1 line-clamp-3 text-[11px] leading-snug text-muted-foreground">
                        {now.title}. {now.progress}/{now.need}
                      </p>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      <section>
        <p className="font-display text-xl">Later</p>
        <p className="text-xs text-muted-foreground">Chairs kept for heroes the valley has not named.</p>
        <ul className="mt-3 grid grid-cols-2 gap-3">
          {COMING_SOON.map((slot) => (
            <li key={slot.id} data-coming-soon={slot.id} className="wm-soon flex flex-col items-center rounded-2xl px-3 py-5 text-center">
              <p className="text-[10px] tracking-[0.2em] text-[#8d6b2e] uppercase">Reserved</p>
              <div className="my-3 grid size-16 place-items-center rounded-full border border-dashed border-[#1c1612]/45 bg-[#fbf6ec]/70">
                <span className="font-display text-2xl leading-none text-[#8d6b2e]">—</span>
              </div>
              <p className="font-display text-lg leading-none">Coming Soon</p>
              <p className="mt-2 text-[11px] leading-snug text-muted-foreground">{slot.line}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Company({
  state,
  act,
  focus,
  onFocus,
}: {
  state: GameState;
  act: (result: Result) => void;
  focus: HeroId;
  onFocus: (id: HeroId) => void;
}) {
  const unlocked = HEROES.filter((hero) => (state.heroes ?? []).some((record) => record.id === hero.id && record.unlocked));
  const spec = heroSpec(focus);
  const record = (state.heroes ?? []).find((hero) => hero.id === focus);
  const ready = Boolean(record?.unlocked);
  const [slot, setSlot] = useState<WornSlot>("cloak");
  const wornId = record?.worn?.[slot];
  const worn = (state.pack ?? []).find((gear) => gear.id === wornId);
  const choices = (state.pack ?? []).filter((gear) => gear.slot === slot && gear.id !== wornId);
  const out = (state.heroes ?? []).filter((hero) => hero.fielded).length;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {out} of {FIELD_CAP} heroes are out. Gear comes from the shared armory on the Road tab. Treasures are not worn.
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {unlocked.map((hero) => {
          const row = (state.heroes ?? []).find((item) => item.id === hero.id);
          const active = hero.id === focus;
          return (
            <button
              key={hero.id}
              type="button"
              onClick={() => onFocus(hero.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${active ? "bg-[#1c1612] text-[#f4ead7]" : "text-muted-foreground ring-1 ring-border"}`}
            >
              {hero.name}
              {row?.fielded ? " · out" : ""}
            </button>
          );
        })}
        {unlocked.length === 0 && <p className="text-sm text-muted-foreground">No one has come to the banner.</p>}
      </div>
      {ready && record && (
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-hero-sheet={spec.id}>
          <div className="flex gap-3">
            <HeroPortrait spec={spec} locked={false} className="h-28 w-24 shrink-0" />
            <div className="min-w-0">
              <p className="text-[11px] tracking-[0.16em] text-[#8d6b2e] uppercase">
                {RARITY_LABEL[spec.rarity]} · {spec.epithet}
              </p>
              <p className="font-display text-2xl leading-none">{spec.name}</p>
              <p className="mt-2 text-sm leading-relaxed">{spec.blurb}</p>
            </div>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-[#3d4a62]">{heroEffectLine(spec)}</p>
          <div className="mt-4">
            <p className="text-[11px] tracking-[0.16em] text-[#8d6b2e] uppercase">Abilities</p>
            <ul className="mt-2 flex flex-col gap-2">
              {heroAbilities(spec.id).map((ability) => (
                <li key={ability.name} data-ability={ability.name} className="wm-ability rounded-xl bg-background px-3 py-2.5">
                  <p className="text-[10px] tracking-[0.16em] text-[#8d6b2e] uppercase">Ability</p>
                  <p className="mt-1 text-sm font-medium">{ability.name}</p>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted-foreground">{ability.text}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <p className="text-[11px] tracking-[0.16em] text-[#8d6b2e] uppercase">Gear synergy</p>
            <ul className="mt-2 flex flex-col gap-2">
              {heroSynergyRead(state, spec.id).map((synergy) => (
                <li
                  key={synergy.name}
                  data-synergy={synergy.name}
                  data-synergy-state={synergy.state}
                  className={
                    synergy.state === "active"
                      ? "rounded-xl bg-[#f6ead0] px-3 py-2.5 ring-1 ring-[#8d6b2e]"
                      : "rounded-xl bg-background px-3 py-2.5"
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${synergy.state === "active" ? "text-[#6a4a12]" : ""}`}>{synergy.name}</p>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] tracking-wide uppercase ${
                        synergy.state === "active"
                          ? "bg-[#7c2a24] text-[#f4ead7]"
                          : synergy.state === "ready"
                            ? "bg-[#e6c56e] text-[#1c1612]"
                            : "bg-[#e7dcc6] text-[#5c5146]"
                      }`}
                    >
                      {synergy.state === "active" ? "Live" : synergy.state === "ready" ? "Ready" : "Open"}
                    </span>
                  </div>
                  <p className={`mt-1 text-sm leading-relaxed ${synergy.state === "active" ? "text-[#6a4a12]" : "text-muted-foreground"}`}>
                    {synergy.text}
                  </p>
                  {synergy.unlock && (
                    <p
                      className={`mt-1 text-sm leading-relaxed ${synergy.state === "active" ? "text-[#6a4a12]" : "text-muted-foreground"}`}
                      data-relic-unlock={synergy.state}
                    >
                      {synergy.state === "active" ? "Unlock active. " : "Unlock. "}
                      {synergy.unlock}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <Button
            type="button"
            className="mt-3 h-11 w-full"
            variant={record.fielded ? "outline" : "default"}
            onClick={() => act(record.fielded ? restHeroAtHold(state, spec.id) : sendHeroOut(state, spec.id))}
          >
            {record.fielded ? "Rest at the hold" : "Send onto the road"}
          </Button>
        </div>
      )}
      {ready && record && (
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-display text-xl">Kit</p>
          <div className="mt-3 flex gap-1.5">
            {WORN_SLOTS.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setSlot(item)}
                className={`rounded-full px-2.5 py-1 text-[11px] tracking-wide uppercase ${slot === item ? "bg-[#1c1612] text-[#f4ead7]" : "text-muted-foreground ring-1 ring-border"}`}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="mt-3">
            {worn ? (
              <Piece
                gear={worn}
                action="Take off"
                note={heroPieceNote(state, spec.id, worn)}
                onAction={() => act(unequipFromHero(state, spec.id, slot))}
              />
            ) : (
              <p className="text-sm text-muted-foreground">Nothing in the {slot}.</p>
            )}
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {choices.map((gear) => {
              const holder = (state.heroes ?? []).find((hero) => Object.values(hero.worn ?? {}).includes(gear.id));
              const holderName = holder ? heroSpec(holder.id).name : null;
              return (
                <li key={gear.id}>
                  <Piece
                    gear={gear}
                    action={holderName ? `Take from ${holderName}` : "Equip"}
                    note={heroPieceNote(state, spec.id, gear)}
                    onAction={() => act(equipOnHero(state, spec.id, gear.id))}
                  />
                </li>
              );
            })}
            {choices.length === 0 && <li className="text-sm text-muted-foreground">No spare {slot} in the armory.</li>}
          </ul>
        </div>
      )}
      {!ready && <p className="text-sm text-muted-foreground">Choose an unlocked hero. Locked names stay on the roster until the mission is done.</p>}
    </div>
  );
}

function Piece({ gear, action, note, onAction }: { gear: Gear; action: string; note?: string | null; onAction: () => void }) {
  const unique = Boolean(gear.relic);
  const live = Boolean(note?.startsWith("Synergy active"));
  const equipping = action === "Equip" || action.startsWith("Take from ");
  return (
    <div className={`flex items-start gap-3 rounded-xl px-3 py-3 ${unique ? `wm-relic ${live ? "wm-relic-live" : ""}` : "bg-background"}`}>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${unique ? "text-[#6a4a12]" : ""}`}>
          {gear.name}
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {unique ? <span className="rounded-full bg-[#8d6b2e] px-2 py-0.5 text-[10px] tracking-wide text-[#f4ead7] uppercase">Unique relic</span> : null}
          {live ? <span className="rounded-full bg-[#7c2a24] px-2 py-0.5 text-[10px] tracking-wide text-[#f4ead7] uppercase">Unlock live</span> : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{traitText(gear)}</p>
        {note ? <p className="mt-1.5 text-xs leading-relaxed text-[#6a4a12]">{note}</p> : null}
      </div>
      <Button type="button" variant={equipping ? "default" : "outline"} className="h-9 shrink-0" onClick={onAction}>
        {action}
      </Button>
    </div>
  );
}

function Missions({ state, focus }: { state: GameState; focus: HeroId }) {
  const tasks = state.heroTasks ?? [];
  const active = tasks.filter((task) => taskPhase(tasks, task) === "now" && task.heroId !== "sela");
  const later = tasks.filter((task) => taskPhase(tasks, task) === "later");
  const done = tasks.filter((task) => task.status === "claimed");
  const ordered = [...active].sort((a, b) => (a.heroId === focus ? -1 : 0) - (b.heroId === focus ? -1 : 0));
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm leading-relaxed text-muted-foreground">
        Finish the step that is open and the hero comes to the banner. A rare meeting on the road can still name them first.
      </p>
      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="font-display text-xl">Open</p>
        <ul className="mt-3 flex flex-col gap-4">
          {ordered.map((task) => {
            const spec = heroSpec(task.heroId);
            return (
              <li key={task.id} data-mission={task.id}>
                <p className="text-sm font-medium">
                  {spec.name}
                  <span className="ml-2 text-[10px] tracking-wide text-muted-foreground uppercase">{RARITY_LABEL[spec.rarity]}</span>
                </p>
                <p className="text-sm">{task.title}</p>
                <p className="text-xs text-muted-foreground">
                  Step {task.chain} · {task.progress}/{task.need}
                </p>
                <Progress className="mt-2" value={task.need === 0 ? 100 : (task.progress / task.need) * 100} />
                <p className="mt-1 text-sm leading-relaxed">{task.detail}</p>
              </li>
            );
          })}
          {ordered.length === 0 && <li className="text-sm text-muted-foreground">Every written mission is finished.</li>}
        </ul>
      </section>
      {later.length > 0 && (
        <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-display text-xl">Still ahead</p>
          <ul className="mt-3 flex flex-col gap-3">
            {later.map((task) => (
              <li key={task.id}>
                <p className="text-sm font-medium">
                  {heroSpec(task.heroId).name} · {task.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  Step {task.chain} · waits on the step before it · {task.progress}/{task.need}
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">{task.detail}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="font-display text-xl">Finished</p>
        <ul className="mt-3 flex flex-col gap-2">
          {done.map((task) => (
            <li key={task.id} className="text-sm">
              <span className="font-medium">{heroSpec(task.heroId).name}.</span> {task.title}
            </li>
          ))}
          {done.length === 0 && <li className="text-sm text-muted-foreground">None yet.</li>}
        </ul>
      </section>
    </div>
  );
}
