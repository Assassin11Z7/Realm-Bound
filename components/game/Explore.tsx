"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { holdById } from "@/lib/game/content";
import { drinkPotion, storeGear, storePotion, takeGear, takePotion } from "@/lib/game/craft";
import { POTIONS } from "@/lib/game/craft";
import { claimQuest, sellGear, travel, unequipFromHero } from "@/lib/game/engine";
import { fieldedNames, gearBearer, gearHeroNotes, heroFordRenown, heroRoadTeach, heroWagonGold } from "@/lib/game/heroes";
import { WORN_SLOTS, carryCap, carriedWeight, gearCompare, gearWeight, luckOf, pardonReady, storedWeight, traitText, vaultCap, wornRelic } from "@/lib/game/world";
import type { Cutscene, GameState, Gear, GearSlot, HoldId, PotionId, Rarity, Result, WornSlot } from "@/lib/game/types";

const RARITY_CLASS: Record<Rarity, string> = {
  common: "text-muted-foreground",
  uncanny: "text-[#3d4a62]",
  relic: "text-[#8d6b2e]",
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
  onSell?: () => void;
  onWear?: () => void;
  onStore?: () => void;
  onTake?: () => void;
}) {
  const unique = Boolean(gear.relic);
  const compare = unique ? gearCompare(gear, against ?? null, worn) : "";
  return (
    <div className={`flex items-start gap-2 ${unique ? "rounded-xl bg-[#f6ead0] px-2 py-2 ring-2 ring-[#8d6b2e]" : ""}`} data-relic={gear.relic ?? undefined}>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${unique ? "text-[#6a4a12]" : RARITY_CLASS[gear.rarity]}`}>
          {gear.name}
          {unique ? (
            <span className="ml-2 rounded-full bg-[#8d6b2e] px-1.5 py-0.5 text-[10px] tracking-wide text-[#f4ead7] uppercase">Unique relic</span>
          ) : (
            <span className="ml-2 text-[10px] tracking-wide uppercase">{gear.rarity}</span>
          )}
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">{gear.line}</p>
        <p className={`text-xs ${unique ? "text-[#6a4a12]" : "text-muted-foreground"}`}>
          {traitText(gear)} · {gearWeight(gear)} wt
          {bearer ? ` · ${bearer}` : worn ? " · worn" : ""}
        </p>
        {compare && <p className="mt-1 text-xs leading-relaxed text-[#6a4a12]">{compare}</p>}
        {notes?.map((note) => (
          <p key={note} className="mt-1 text-xs leading-relaxed text-[#3d4a62]" data-gear-synergy="yes">
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
  const selected = holdById(holdId);
  const standing = holdId === here;
  const wornIds = new Set(Object.values(state.worn ?? {}));
  const heroWornIds = new Set(
    (state.heroes ?? []).flatMap((hero) => Object.values(hero.worn ?? {}).filter((id): id is string => Boolean(id))),
  );
  const potionIds = Object.keys(POTIONS) as PotionId[];
  const loose = (state.pack ?? []).filter((gear) => !wornIds.has(gear.id) && !heroWornIds.has(gear.id));

  if (part === "armory") {
    const names = fieldedNames(state);
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          Luck {luckOf(state)}. Carried {carriedWeight(state)} / {carryCap(state)} weight.
          {(state.tonics?.luck ?? 0) > 0 ? ` Luck drink, ${state.tonics.luck} walks.` : ""}
          {names.length > 0 ? ` Out: ${names.join(", ")}.` : " No hero is on the road."}
        </p>
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

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-[11px] tracking-[0.16em] text-[#8d6b2e] uppercase">Where you stand</p>
        <p className="mt-1 font-display text-2xl">{place.name}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Luck on the road {luckOf(state)}. Miles walked {state.miles ?? 0}.
          {fieldedNames(state).length > 0
            ? ` ${fieldedNames(state).join(", ")} ${fieldedNames(state).length === 1 ? "walks" : "walk"} with the gear.`
            : " No hero is out, so the road has only what was left worn."}
          {heroRoadTeach(state) > 0 ? ` Walks teach +${heroRoadTeach(state)}.` : ""}
          {heroFordRenown(state) > 0 ? ` Crossings grant +${heroFordRenown(state)} renown.` : ""}
          {heroWagonGold(state) > 0 ? ` A successful call pays +${heroWagonGold(state)} gold.` : ""}
        </p>
        <Button type="button" className="mt-4 h-11 w-full" disabled={standing} onClick={() => act(travel(state, holdId))}>
          {standing ? "You stand here" : `Walk to ${selected.name}`}
        </Button>
      </div>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
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
