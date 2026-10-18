"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { holdById } from "@/lib/game/content";
import { drinkPotion, storeGear, storePotion, takeGear, takePotion } from "@/lib/game/craft";
import { POTIONS } from "@/lib/game/craft";
import { beginRoad, chooseRoad, claimQuest, dismissRoad, openBellRoad, sellGear, unequipFromHero } from "@/lib/game/engine";
import { activeRelicPairs, bellRoadRead, fieldedNames, gearBearer, gearHeroNotes, heroFordRenown, heroRelicBonus, heroRoadTeach, heroWagonGold } from "@/lib/game/heroes";
import { WORN_SLOTS, carryCap, carriedWeight, gearCompare, gearWeight, luckOf, pardonReady, relicFindChance, storedWeight, traitText, vaultCap, wornRelic } from "@/lib/game/world";
import { ROAD_ART, ROAD_BEAT_LABEL } from "./art";
import { Metric } from "./stat";
import type { Cutscene, GameState, Gear, GearSlot, HoldId, PotionId, Rarity, Result, WornSlot } from "@/lib/game/types";

const RARITY_CLASS: Record<Rarity, string> = {
  common: "text-[#6b5344]",
  uncanny: "text-[#3f4d2e]",
  relic: "text-[#8a5a12]",
};

export function speakLine(speaker: string, line: string, voice: boolean) {
  if (!voice || typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(`${speaker}. ${line}`);
  utterance.rate = 0.94;
  utterance.pitch = 0.86;
  window.speechSynthesis.speak(utterance);
}

export function CutsceneView({
  scene,
  voice,
  onAdvance,
}: {
  scene: Cutscene;
  voice: boolean;
  onAdvance: () => void;
}) {
  const beat = scene.beats[Math.min(scene.index, scene.beats.length - 1)];
  const [heardKey, setHeardKey] = useState("");
  if (!beat) return null;
  const key = `${scene.id}:${scene.index}`;
  const last = scene.index >= scene.beats.length - 1;
  const ready = heardKey === key;

  function onTap() {
    if (voice && heardKey !== key) {
      setHeardKey(key);
      speakLine(beat.speaker, beat.line, voice);
      return;
    }
    const upcoming = scene.beats[scene.index + 1];
    if (upcoming) {
      setHeardKey(`${scene.id}:${scene.index + 1}`);
      speakLine(upcoming.speaker, upcoming.line, voice);
    } else {
      window.speechSynthesis?.cancel();
    }
    onAdvance();
  }

  return (
    <button type="button" className="absolute inset-0 z-[75] overflow-hidden bg-[#14110e] text-left text-[#f4ead7]" onClick={onTap}>
      <img key={`${scene.id}-${scene.index}`} src={beat.art} alt="" className="wm-scene absolute inset-0 h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,#14110e_0%,rgba(20,17,14,0.88)_22%,rgba(20,17,14,0.2)_48%,transparent_68%)]" />
      <div className="absolute inset-x-0 bottom-0 flex flex-col px-5 pt-16 pb-[max(1.75rem,env(safe-area-inset-bottom))]">
        <div className="mb-3 flex gap-1.5" aria-hidden="true">
          {scene.beats.map((item, index) => (
            <span key={`${scene.id}-${item.speaker}-${index}`} className={`h-1 flex-1 rounded-full ${index <= scene.index ? "bg-[#e6c56e]" : "bg-[#f4ead7]/25"}`} />
          ))}
        </div>
        <p className="text-xs tracking-[0.22em] text-[#e6c56e] uppercase">{beat.speaker}</p>
        <p key={`${scene.id}-line-${scene.index}`} className="wm-rise mt-2 font-display text-[1.7rem] leading-snug">
          {beat.line}
        </p>
        <p className="mt-4 text-xs tracking-[0.16em] text-[#f4ead7]/80 uppercase">
          {ready ? (last ? "Tap to return to the road" : "Tap for the next line") : voice ? "Tap to hear this line" : "Tap to continue"}
        </p>
      </div>
    </button>
  );
}

function GearRow({
  gear,
  worn,
  bearer,
  against,
  notes,
  paired = false,
  onSell,
  onWear,
  onStore,
  onTake,
}: {
  gear: Gear;
  worn: boolean;
  bearer?: string | null;
  against?: Gear | null;
  notes?: string[];
  paired?: boolean;
  onSell?: () => void;
  onWear?: () => void;
  onStore?: () => void;
  onTake?: () => void;
}) {
  const unique = Boolean(gear.relic);
  const compare = unique ? gearCompare(gear, against ?? null, worn) : "";
  return (
    <div
      className={`wm-gear flex items-start gap-3 px-3 py-3 ${unique ? "wm-relic" : ""} ${paired ? "wm-relic-live" : ""}`}
      data-rarity={gear.rarity}
      data-relic={gear.relic ?? undefined}
      data-paired={paired ? "yes" : "no"}
    >
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${unique ? "text-[#6a4a12]" : RARITY_CLASS[gear.rarity]}`}>{gear.name}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {unique ? (
            <span className="wm-relic-badge">Unique relic</span>
          ) : (
            <span className="wm-rarity-badge" data-rarity={gear.rarity}>
              {gear.rarity}
            </span>
          )}
          {paired ? (
            <span className="rounded-full bg-[#7c2a24] px-2 py-0.5 text-[10px] tracking-wide text-[#f4ead7] uppercase">Unlock live</span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{gear.line}</p>
        <p className={`text-xs ${unique ? "text-[#6a4a12]" : "text-muted-foreground"}`}>
          {traitText(gear)} · {gearWeight(gear)} wt
          {bearer ? ` · ${bearer}` : worn ? " · worn" : ""}
        </p>
        {compare && <p className="mt-1 text-xs leading-relaxed text-[#6a4a12]">{compare}</p>}
        {notes?.map((note) => (
          <p key={note} className="mt-1.5 text-xs leading-relaxed text-[#3d4a62]" data-gear-synergy="yes">
            {note}
          </p>
        ))}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {onWear && (
          <Button type="button" variant="outline" className="h-9" onClick={onWear}>
            {worn ? "Take off" : "Wear"}
          </Button>
        )}
        {onStore && (
          <Button type="button" variant="ghost" className="h-9" onClick={onStore}>
            Store
          </Button>
        )}
        {onTake && (
          <Button type="button" variant="outline" className="h-9" onClick={onTake}>
            Take
          </Button>
        )}
        {onSell && (
          <Button type="button" variant="ghost" className="h-9" onClick={onSell}>
            Sell
          </Button>
        )}
      </div>
    </div>
  );
}

function wornInSlot(state: GameState, slot: Gear["slot"]): Gear | null {
  const id = (state.worn ?? {})[slot];
  if (!id) return null;
  return (state.pack ?? []).find((item) => item.id === id) ?? null;
}

export function RoadDepart({
  state,
  holdId,
  act,
}: {
  state: GameState;
  holdId: HoldId;
  act: (result: Result) => void;
}) {
  const here = state.where ?? state.player.holdId;
  const selected = holdById(holdId);
  const standing = holdId === here;
  return (
    <Button
      type="button"
      data-road-action="set-out"
      className="h-12 w-full text-base"
      disabled={standing || Boolean(state.scene)}
      onClick={() => act(beginRoad(state, holdId))}
    >
      {standing ? `The company is at ${selected.name}` : `Set out for ${selected.name}`}
    </Button>
  );
}

export function RoadSequence({
  state,
  act,
  onOpen,
}: {
  state: GameState;
  act: (result: Result) => void;
  onOpen?: (section: "armory" | "loot") => void;
}) {
  const road = state.road;
  if (!road) return null;
  const place = holdById(road.dest).name;
  if (road.outcome) {
    const gear = road.outcome.gearName ? (state.pack ?? []).find((item) => item.name === road.outcome?.gearName) : undefined;
    const relic = road.outcome.relicName ? (state.pack ?? []).find((item) => item.name === road.outcome?.relicName) : undefined;
    const slot = gear?.slot ?? road.outcome.gearSlot;
    const hoard = slot === "hoard";
    const wearable = Boolean((gear && gear.slot !== "hoard") || relic || (slot && slot !== "hoard"));
    return (
      <section className="wm-event overflow-hidden rounded-2xl ring-1 ring-[#8d6b2e]/40" data-road-outcome={road.outcome.tone} id="road-sequence">
        <img src={ROAD_ART.last} alt="" className="h-40 w-full object-cover" />
        <div className="p-5">
        <p className="wm-kicker">{road.outcome.title}</p>
        <p className="mt-3 font-display text-[1.7rem] leading-none">{place}</p>
        <p className="mt-3 text-sm leading-relaxed">{road.outcome.line}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Wearable finds sit in the armory, beside what a hero already wears. Treasures sit under Loot. The bag is goods.
        </p>
        <div className="mt-4 flex flex-col gap-2">
          {wearable && onOpen && (
            <Button type="button" variant="outline" className="h-11 w-full" onClick={() => onOpen("armory")}>
              Compare it in the Armory
            </Button>
          )}
          {hoard && onOpen && (
            <Button type="button" variant="outline" className="h-11 w-full" onClick={() => onOpen("loot")}>
              Compare it under Loot
            </Button>
          )}
          <Button type="button" className="h-12 w-full" onClick={() => act(dismissRoad(state))}>
            Back to the road
          </Button>
        </div>
        </div>
      </section>
    );
  }
  const beat = road.beats[Math.min(road.index, road.beats.length - 1)];
  if (!beat) return null;
  const names = fieldedNames(state);
  const art = ROAD_ART[beat.id as keyof typeof ROAD_ART] ?? ROAD_ART.fork;
  return (
    <section className="wm-event overflow-hidden rounded-2xl ring-1 ring-[#8d6b2e]/40" data-road-beat={beat.id} id="road-sequence">
      <img src={art} alt="" className="h-40 w-full object-cover" />
      <div className="p-5">
      <p className="wm-kicker">
        The road · {road.index + 1} of {road.beats.length}
      </p>
      <p className="mt-3 font-display text-[1.7rem] leading-none">{beat.title}</p>
      <p className="mt-2 text-sm leading-relaxed">{beat.body}</p>
      <p className="mt-2 text-xs leading-relaxed text-[#6a4a12]">
        {names.length > 0 ? `Out with the company: ${names.join(", ")}.` : "No hero is out. The road has only the gear left worn."}
      </p>
      <div className="mt-4 flex flex-col gap-2">
        {beat.choices.map((choice) => (
          <button
            key={choice.id}
            type="button"
            data-road-choice={choice.id}
            className="rounded-xl bg-[#fbf6ec] px-3 py-3 text-left ring-1 ring-[#8d6b2e]/35"
            onClick={() => act(chooseRoad(state, choice.id))}
          >
            <span className="block text-sm font-medium">{choice.label}</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{choice.detail}</span>
            {choice.because && <span className="mt-1.5 block text-xs leading-relaxed text-[#8d6b2e]">{choice.because}</span>}
          </button>
        ))}
      </div>
      </div>
    </section>
  );
}

function bestLoose(state: GameState, slot: GearSlot, wornId?: string): Gear | null {
  const options = (state.pack ?? []).filter((item) => item.slot === slot && item.id !== wornId);
  if (options.length === 0) return null;
  return [...options].sort((a, b) => b.luck - a.luck || b.worth - a.worth)[0];
}

export function ExplorePanel({
  state,
  holdId,
  act,
  part = "explore",
}: {
  state: GameState;
  holdId: HoldId;
  act: (result: Result) => void;
  part?: "explore" | "armory" | "loot";
}) {
  const here = state.where ?? state.player.holdId;
  const place = holdById(here);
  const wornIds = new Set(Object.values(state.worn ?? {}));
  const heroWornIds = new Set(
    (state.heroes ?? []).flatMap((hero) => Object.values(hero.worn ?? {}).filter((id): id is string => Boolean(id))),
  );
  const potionIds = Object.keys(POTIONS) as PotionId[];
  const loose = (state.pack ?? []).filter((gear) => !wornIds.has(gear.id) && !heroWornIds.has(gear.id));
  const pairs = activeRelicPairs(state);
  const relicLive = (gear: Gear) => Boolean(gear.relic && pairs.some((pair) => pair.id.endsWith(`:${gear.relic}`)));

  if (part === "armory") {
    const names = fieldedNames(state);
    const relicPct = Math.round(relicFindChance(state, "walk", heroRelicBonus(state, "walk")) * 100);
    return (
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-3 gap-2">
          <Metric label="Luck" value={luckOf(state)} />
          <Metric label="Relic chance" value={relicPct} suffix="%" />
          <Metric label="Weight" value={carriedWeight(state)} suffix={`/${carryCap(state)}`} />
        </div>
        <p className="text-sm text-muted-foreground">
          {(state.tonics?.luck ?? 0) > 0 ? `Luck drink, ${state.tonics.luck} walks. ` : ""}
          {names.length > 0 ? `Out: ${names.join(", ")}.` : "No hero is on the road."}
        </p>
        {pairs.map((pair) => (
          <p key={pair.id} className="wm-pair text-sm leading-relaxed" data-relic-pair={pair.id}>
            Relic paired. {pair.hero} wears the {pair.relic}. {pair.opens}
          </p>
        ))}
        {wornRelic(state, "unspoken-hem") && (
          <p className="text-sm leading-relaxed text-[#6a4a12]">
            {pardonReady(state)
              ? "The Unspoken Hem can still swallow one failure before the wagons are called again."
              : "The Unspoken Hem has already spoken for this call of the wagons."}
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {WORN_SLOTS.map((slot) => {
            const wornHere = (state.heroes ?? []).flatMap((hero) => {
              const gearId = hero.worn?.[slot];
              const gear = (state.pack ?? []).find((item) => item.id === gearId);
              return gear ? [{ hero, gear }] : [];
            });
            const gear = wornHere[0]?.gear;
            const better = bestLoose(state, slot, gear?.id);
            const relicLoose = (state.pack ?? []).find((item) => item.slot === slot && item.relic && item.id !== gear?.id);
            const wornLuck = gear?.luck ?? 0;
            return (
              <li key={slot} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
                <p className="text-[11px] tracking-[0.16em] text-[#8d6b2e] uppercase">{slot}</p>
                {wornHere.length === 0 && <p className="mt-1 text-sm text-muted-foreground">No hero wears this.</p>}
                {wornHere.map(({ hero, gear: piece }) => (
                  <GearRow
                    key={piece.id}
                    gear={piece}
                    worn
                    bearer={gearBearer(state, piece.id)?.name ?? hero.id}
                    against={piece}
                    notes={gearHeroNotes(state, piece)}
                    paired={relicLive(piece)}
                    onSell={() => act(sellGear(state, piece.id))}
                    onWear={() => act(unequipFromHero(state, hero.id, slot as WornSlot))}
                    onStore={() => act(storeGear(state, piece.id))}
                  />
                ))}
                {better && !better.relic && (
                  <p className="mt-3 text-sm leading-relaxed">
                    In the pack, {better.name} is luck {better.luck}
                    {gear ? `, against ${wornLuck} worn.` : ". The slot is empty."}
                  </p>
                )}
                {better?.relic && <p className="mt-3 text-sm leading-relaxed text-[#6a4a12]">{gearCompare(better, gear ?? null, false)}</p>}
                {relicLoose && relicLoose.id !== better?.id && (
                  <p className="mt-3 text-sm leading-relaxed text-[#6a4a12]">{gearCompare(relicLoose, gear ?? null, false)}</p>
                )}
              </li>
            );
          })}
        </ul>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-display text-xl">In the armory</p>
          <p className="mt-1 text-sm text-muted-foreground">Loose kit. Assign it from Heroes, then Company.</p>
          <ul className="mt-3 flex flex-col gap-3">
            {loose.filter((gear) => gear.slot !== "hoard").map((gear) => (
              <li key={gear.id} className="rounded-xl bg-background px-3 py-2">
                <GearRow
                  gear={gear}
                  worn={false}
                  against={wornInSlot(state, gear.slot)}
                  notes={gearHeroNotes(state, gear)}
                  paired={relicLive(gear)}
                  onSell={() => act(sellGear(state, gear.id))}
                  onStore={() => act(storeGear(state, gear.id))}
                />
              </li>
            ))}
            {loose.every((gear) => gear.slot === "hoard") && (
              <li className="text-sm text-muted-foreground">No spare cloak, weapon, or charm. Treasures sit under Loot. The strongroom does too.</li>
            )}
          </ul>
        </div>
      </div>
    );
  }

  if (part === "loot") {
    const hoard = loose.filter((gear) => gear.slot === "hoard");
    return (
      <div className="flex flex-col gap-4">
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-display text-xl">Found on the road</p>
          <ul className="mt-3 flex flex-col gap-3">
            {hoard.map((gear) => (
              <li key={gear.id} className="rounded-xl bg-background px-3 py-2">
                <GearRow
                  gear={gear}
                  worn={false}
                  notes={gearHeroNotes(state, gear)}
                  paired={relicLive(gear)}
                  onSell={() => act(sellGear(state, gear.id))}
                  onStore={() => act(storeGear(state, gear.id))}
                />
              </li>
            ))}
            {hoard.length === 0 && <li className="text-sm text-muted-foreground">No loose treasure. The ditches are not empty forever.</li>}
          </ul>
        </div>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-display text-xl">Strongroom</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {storedWeight(state)} / {vaultCap(state)} weight
          </p>
          <div className="mt-3 flex flex-col gap-2">
            {(state.vault ?? []).length === 0 && potionIds.every((id) => (state.cellar?.[id] ?? 0) < 1) && (
              <p className="text-sm text-muted-foreground">Empty. Store a piece from Gear or Loot. Raising the strongroom holds more.</p>
            )}
            {(state.vault ?? []).map((gear) => (
              <div key={gear.id} className="rounded-xl bg-background px-3 py-2">
                <GearRow
                  gear={gear}
                  worn={false}
                  against={wornInSlot(state, gear.slot)}
                  notes={gearHeroNotes(state, gear)}
                  paired={relicLive(gear)}
                  onTake={() => act(takeGear(state, gear.id))}
                />
              </div>
            ))}
            {potionIds
              .filter((id) => (state.cellar?.[id] ?? 0) > 0)
              .map((id) => (
                <div key={id} className="flex items-center justify-between gap-2 rounded-xl bg-background px-3 py-2">
                  <p className="text-sm">
                    {POTIONS[id].name} · {state.cellar[id]}
                  </p>
                  <Button type="button" variant="outline" className="h-10" onClick={() => act(takePotion(state, id))}>
                    Take
                  </Button>
                </div>
              ))}
          </div>
        </div>
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-display text-xl">Drinks</p>
          <ul className="mt-3 flex flex-col gap-3">
            {potionIds
              .filter((id) => (state.brew?.[id] ?? 0) > 0)
              .map((id) => (
                <li key={id} className="rounded-xl bg-background px-3 py-2">
                  <p className="text-sm font-medium">
                    {POTIONS[id].name}
                    <span className="ml-2 text-xs text-muted-foreground">× {state.brew[id]}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">{POTIONS[id].line}</p>
                  <div className="mt-2 flex gap-2">
                    <Button type="button" className="h-10" onClick={() => act(drinkPotion(state, id))}>
                      Drink
                    </Button>
                    <Button type="button" variant="outline" className="h-10" onClick={() => act(storePotion(state, id))}>
                      Store
                    </Button>
                  </div>
                </li>
              ))}
            {potionIds.every((id) => (state.brew?.[id] ?? 0) < 1) && (
              <li className="text-sm text-muted-foreground">No drinks. Raise a brew house on the Hold tab and make them.</li>
            )}
          </ul>
        </div>
      </div>
    );
  }

  const relicPct = Math.round(relicFindChance(state, "walk", heroRelicBonus(state, "walk")) * 100);
  const bell = bellRoadRead(state);
  return (
    <div className="flex flex-col gap-5">
      <div className="wm-event rounded-2xl p-5 ring-1 ring-[#8d6b2e]/40">
        <p className="wm-kicker">On the road</p>
        <p className="mt-3 font-display text-[2rem] leading-none">{place.name}</p>
        <div className="mt-4 grid grid-cols-3 gap-2">
          <Metric label="Luck" value={luckOf(state)} />
          <Metric label="Relic chance" value={relicPct} suffix="%" />
          <Metric label="Miles" value={state.miles ?? 0} />
        </div>
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
          {fieldedNames(state).length > 0
            ? `${fieldedNames(state).join(", ")} ${fieldedNames(state).length === 1 ? "is" : "are"} out with the company.`
            : "No hero is out, so the road has only the gear left worn."}
          {heroRoadTeach(state) > 0 ? ` The road teaches +${heroRoadTeach(state)}.` : ""}
          {heroFordRenown(state) > 0 ? ` Crossings grant +${heroFordRenown(state)} renown.` : ""}
          {heroWagonGold(state) > 0 ? ` A successful call pays +${heroWagonGold(state)} gold.` : ""}
        </p>
        <ul className="mt-4 grid grid-cols-3 gap-2">
          {(Object.keys(ROAD_ART) as (keyof typeof ROAD_ART)[]).map((id) => (
            <li key={id}>
              <img src={ROAD_ART[id]} alt="" className="h-16 w-full rounded-lg object-cover ring-1 ring-[#8d6b2e]/35" />
              <p className="mt-1 text-center text-[10px] tracking-wide text-[#6b5344] uppercase">{ROAD_BEAT_LABEL[id]}</p>
            </li>
          ))}
        </ul>
        {!state.road && (
          <div className="mt-4">
            <RoadDepart state={state} holdId={holdId} act={act} />
          </div>
        )}
      </div>
      {bell && (
        <div className="wm-event rounded-2xl bg-[#f6ead0] p-5 ring-1 ring-[#8d6b2e]" data-bell-road={bell.open ? "open" : "heard"}>
          <p className="wm-kicker">The Ford Bell</p>
          <p className="mt-3 font-display text-2xl leading-none">{bell.open ? "The bell is ringing" : "The bell has rung"}</p>
          <p className="mt-2 text-sm leading-relaxed">{bell.detail}</p>
          <p className="mt-2 text-xs leading-relaxed text-[#8d6b2e]">{bell.because}</p>
          {bell.open && (
            <Button type="button" className="mt-3 h-11 w-full" onClick={() => act(openBellRoad(state))}>
              Go to the sound
            </Button>
          )}
        </div>
      )}
      <div className="rounded-2xl bg-card p-5 ring-1 ring-foreground/10">
        <p className="font-display text-xl">Tasks on this road</p>
        <ul className="mt-3 flex flex-col gap-4">
          {(state.quests ?? []).map((quest) => (
            <li key={quest.id}>
              <p className="text-sm font-medium">{quest.title}</p>
              <p className="text-xs text-muted-foreground">
                {quest.giver} · {quest.progress}/{quest.need} · {quest.status === "claimed" ? "paid" : quest.status === "ready" ? "reward waiting" : "open"}
              </p>
              <p className="mt-1 text-sm leading-relaxed">{quest.detail}</p>
              {quest.status === "ready" && (
                <Button type="button" className="mt-2 h-11" onClick={() => act(claimQuest(state, quest.id))}>
                  Claim {quest.reward}g and a roll
                </Button>
              )}
            </li>
          ))}
          {(state.quests ?? []).length === 0 && <li className="text-sm text-muted-foreground">No open task. The road will offer another.</li>}
        </ul>
      </div>
    </div>
  );
}
