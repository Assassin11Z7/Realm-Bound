"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  COMING_SOON,
  FIELD_CAP,
  HEROES,
  activeRelicPairs,
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

function HeroPortrait({ spec, locked, className = "w-20" }: { spec: HeroSpec; locked: boolean; className?: string }) {
  return (
    <span className={`wm-portrait-well wm-rarity-${spec.rarity} ${locked ? "is-locked" : ""} ${className}`}>
      <img
        src={spec.portrait}
        alt=""
        className={`wm-portrait aspect-[3/4] ${locked ? "wm-portrait-ink" : ""}`}
      />
    </span>
  );
}

function RarityMark({ rarity, quiet = false }: { rarity: HeroRarity; quiet?: boolean }) {
  return (
    <span className={`wm-rarity-badge ${quiet ? "is-quiet" : ""}`} data-rarity={rarity}>
      {RARITY_LABEL[rarity]}
    </span>
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
      lede: "Old names, and valley legends whose missions stop short of the gods.",
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
                    <p className={`wm-rarity-name mt-1.5 text-sm font-medium ${unlocked ? "" : "tracking-wide"}`} data-rarity={unlocked ? spec.rarity : undefined}>
                      {spec.name}
                    </p>
                    <p className="mt-1 flex flex-col items-center gap-1">
                      <RarityMark rarity={spec.rarity} quiet={!unlocked} />
                      <span className="text-[10px] tracking-wide text-[#5c5146] uppercase">
                        {record?.fielded ? "out" : unlocked ? "at the hold" : "outline"}
                      </span>
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
              <div className="wm-soon-frame my-3 w-20">
                <img src="/art/heroes/reserved.jpg" alt="" className="wm-portrait wm-portrait-soon aspect-[3/4]" />
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
  const pairs = activeRelicPairs(state);
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
          const paired = pairs.some((pair) => pair.id.startsWith(`${hero.id}:`));
          return (
            <button
              key={hero.id}
              type="button"
              onClick={() => onFocus(hero.id)}
              data-rarity={hero.rarity}
              data-paired={paired ? "yes" : "no"}
              className={`wm-hero-chip wm-rarity-${hero.rarity} shrink-0 rounded-full px-3 py-1.5 text-xs ${active ? "is-active" : "text-muted-foreground"}`}
            >
              <span className="wm-rarity-dot" aria-hidden="true" />
              {hero.name}
              {row?.fielded ? " · out" : ""}
              {paired ? " · paired" : ""}
            </button>
          );
        })}
        {unlocked.length === 0 && <p className="text-sm text-muted-foreground">No one has come to the banner.</p>}
      </div>
      {ready && record && (
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-hero-sheet={spec.id}>
          <div className="flex gap-3">
            <HeroPortrait spec={spec} locked={false} className="w-24 shrink-0" />
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-2">
                <RarityMark rarity={spec.rarity} />
                <span className="text-[11px] tracking-[0.16em] text-[#8d6b2e] uppercase">{spec.epithet}</span>
              </p>
              <p className="wm-rarity-name mt-1 font-display text-2xl leading-none" data-rarity={spec.rarity}>
                {spec.name}
              </p>
              <p className="mt-2 text-sm leading-relaxed">{spec.blurb}</p>
            </div>
          </div>
          {pairs
            .filter((pair) => pair.id.startsWith(`${spec.id}:`))
            .map((pair) => (
              <p key={pair.id} className="wm-pair mt-3 text-sm leading-relaxed" data-relic-pair={pair.id}>
                Relic paired. {pair.hero} wears the {pair.relic}. {pair.opens}
              </p>
            ))}
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
                paired={pairs.some((pair) => pair.id.endsWith(`:${worn.relic}`))}
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
                    paired={pairs.some((pair) => pair.id.endsWith(`:${gear.relic}`))}
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

function Piece({
  gear,
  action,
  note,
  paired = false,
  onAction,
}: {
  gear: Gear;
  action: string;
  note?: string | null;
  paired?: boolean;
  onAction: () => void;
}) {
  const unique = Boolean(gear.relic);
  const live = Boolean(note?.startsWith("Synergy active"));
  const equipping = action === "Equip" || action.startsWith("Take from ");
  return (
    <div
      className={`wm-gear flex items-start gap-3 px-3 py-3 ${unique ? "wm-relic" : ""} ${paired ? "wm-relic-live" : ""}`}
      data-rarity={gear.rarity}
      data-paired={paired ? "yes" : "no"}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${unique ? "text-[#6a4a12]" : ""}`}>{gear.name}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {unique ? <span className="wm-relic-badge">Unique relic</span> : <span className="wm-rarity-badge" data-rarity={gear.rarity}>{gear.rarity}</span>}
          {paired ? <span className="rounded-full bg-[#7c2a24] px-2 py-0.5 text-[10px] tracking-wide text-[#f4ead7] uppercase">Unlock live</span> : null}
          {!paired && live ? <span className="rounded-full bg-[#e6c56e] px-2 py-0.5 text-[10px] tracking-wide text-[#1c1612] uppercase">Synergy live</span> : null}
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
                  <span className="ml-2 align-middle">
                    <RarityMark rarity={spec.rarity} />
                  </span>
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
