"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { holdById } from "@/lib/game/content";
import { drinkPotion, storeGear, storePotion, takeGear, takePotion } from "@/lib/game/craft";
import { POTIONS } from "@/lib/game/craft";
import { claimQuest, equipGear, sellGear, stowGear, travel } from "@/lib/game/engine";
import { WORN_SLOTS, carryCap, carriedWeight, gearWeight, luckOf, storedWeight, traitText, vaultCap } from "@/lib/game/world";
import type { Cutscene, GameState, Gear, HoldId, PotionId, Rarity, Result } from "@/lib/game/types";

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
  onSell,
  onWear,
  onStore,
}: {
  gear: Gear;
  worn: boolean;
  onSell: () => void;
  onWear?: () => void;
  onStore?: () => void;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-medium ${RARITY_CLASS[gear.rarity]}`}>
          {gear.name}
          <span className="ml-2 text-[10px] tracking-wide uppercase">{gear.rarity}</span>
        </p>
        <p className="text-xs leading-relaxed text-muted-foreground">{gear.line}</p>
        <p className="text-xs text-muted-foreground">
          {traitText(gear)} · {gearWeight(gear)} wt
          {worn ? " · worn" : ""}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {onWear && (
          <Button type="button" variant="outline" className="h-9" onClick={onWear}>
            {worn ? "Stow" : "Wear"}
          </Button>
        )}
        {onStore && (
          <Button type="button" variant="ghost" className="h-9" onClick={onStore}>
            Store
          </Button>
        )}
        <Button type="button" variant="ghost" className="h-9" onClick={onSell}>
          Sell
        </Button>
      </div>
    </div>
  );
}

export function ExplorePanel({
  state,
  holdId,
  act,
}: {
  state: GameState;
  holdId: HoldId;
  act: (result: Result) => void;
}) {
  const here = state.where ?? state.player.holdId;
  const place = holdById(here);
  const selected = holdById(holdId);
  const standing = holdId === here;
  const worn = new Set(Object.values(state.worn ?? {}));
  const [bin, setBin] = useState<"bag" | "store">("bag");
  const potionIds = Object.keys(POTIONS) as PotionId[];
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Where you stand</p>
        <p className="mt-1 font-display text-2xl">{place.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">Luck on the road {luckOf(state)}. Miles walked {state.miles ?? 0}.</p>
        <Button type="button" className="mt-3 h-11 w-full" disabled={standing} onClick={() => act(travel(state, holdId))}>
          {standing ? "You stand here" : `Walk to ${selected.name}`}
        </Button>
      </div>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="font-display text-xl">Tasks</p>
        <ul className="mt-2 flex flex-col gap-3">
          {(state.quests ?? []).map((quest) => (
            <li key={quest.id}>
              <p className="text-sm font-medium">{quest.title}</p>
              <p className="text-xs text-muted-foreground">
                {quest.giver} · {quest.progress}/{quest.need} · {quest.status === "claimed" ? "paid" : quest.status === "ready" ? "reward waiting" : "open"}
              </p>
              <p className="mt-1 text-sm leading-relaxed">{quest.detail}</p>
              {quest.status === "ready" && (
                <Button type="button" className="mt-2 h-10" onClick={() => act(claimQuest(state, quest.id))}>
                  Claim {quest.reward}g and a roll
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-xl">Bag</p>
          <p className="text-xs text-muted-foreground">Luck {luckOf(state)}</p>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {bin === "bag" ? `Carried ${carriedWeight(state)} / ${carryCap(state)} weight` : `Strongroom ${storedWeight(state)} / ${vaultCap(state)} weight`}
          {(state.tonics?.luck ?? 0) > 0 ? ` · luck drink, ${state.tonics.luck} walks` : ""}
          {state.tonics?.purse ? " · coin drink until dusk" : ""}
        </p>
        <div className="mt-2 flex gap-2">
          <Button type="button" variant={bin === "bag" ? "default" : "outline"} className="h-9" onClick={() => setBin("bag")}>
            Bag
          </Button>
          <Button type="button" variant={bin === "store" ? "default" : "outline"} className="h-9" onClick={() => setBin("store")}>
            Strongroom
          </Button>
        </div>
        {bin === "store" ? (
          <div className="mt-3 flex flex-col gap-2">
            {(state.vault ?? []).length === 0 && potionIds.every((id) => (state.cellar?.[id] ?? 0) < 1) && (
              <p className="text-sm text-muted-foreground">The strongroom is empty. Store loot from the bag. Raising it holds more.</p>
            )}
            {(state.vault ?? []).map((gear) => (
              <div key={gear.id} className="rounded-xl bg-background px-3 py-2">
                <p className="text-sm font-medium">{gear.name}</p>
                <p className="text-xs text-muted-foreground">{gear.line}</p>
                <Button type="button" variant="outline" className="mt-2 h-9" onClick={() => act(takeGear(state, gear.id))}>
                  Take · {gearWeight(gear)} wt
                </Button>
              </div>
            ))}
            {potionIds.filter((id) => (state.cellar?.[id] ?? 0) > 0).map((id) => (
              <div key={id} className="flex items-center justify-between gap-2 rounded-xl bg-background px-3 py-2">
                <p className="text-sm">{POTIONS[id].name} · {state.cellar[id]}</p>
                <Button type="button" variant="outline" className="h-9" onClick={() => act(takePotion(state, id))}>
                  Take
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        {bin === "bag" ? (
        <>
        <ul className="mt-3 flex flex-col gap-2">
          {WORN_SLOTS.map((slot) => {
            const gear = (state.pack ?? []).find((item) => item.id === (state.worn ?? {})[slot]);
            return (
              <li key={slot} className="rounded-xl bg-background px-3 py-2">
                <p className="text-[10px] tracking-wide text-muted-foreground uppercase">{slot}</p>
                {gear ? (
                  <GearRow
                    gear={gear}
                    worn
                    onSell={() => act(sellGear(state, gear.id))}
                    onWear={() => act(stowGear(state, gear.id))}
                    onStore={() => act(storeGear(state, gear.id))}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">Empty</p>
                )}
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-xs tracking-wide text-muted-foreground uppercase">In the pack</p>
        <ul className="mt-2 flex flex-col gap-2">
          {(state.pack ?? []).filter((gear) => !worn.has(gear.id)).map((gear) => (
            <li key={gear.id} className="rounded-xl bg-background px-3 py-2">
              <GearRow
                gear={gear}
                worn={false}
                onSell={() => act(sellGear(state, gear.id))}
                onWear={gear.slot === "hoard" ? undefined : () => act(equipGear(state, gear.id))}
                onStore={() => act(storeGear(state, gear.id))}
              />
            </li>
          ))}
          {(state.pack ?? []).every((gear) => worn.has(gear.id)) && (
            <li className="text-sm text-muted-foreground">Nothing loose. The road still has ditches.</li>
          )}
        </ul>
        <p className="mt-4 text-xs tracking-wide text-muted-foreground uppercase">Draughts</p>
        <ul className="mt-2 flex flex-col gap-2">
          {potionIds.filter((id) => (state.brew?.[id] ?? 0) > 0).map((id) => (
            <li key={id} className="rounded-xl bg-background px-3 py-2">
              <p className="text-sm font-medium">
                {POTIONS[id].name}
                <span className="ml-2 text-xs text-muted-foreground">× {state.brew[id]}</span>
              </p>
              <p className="text-xs text-muted-foreground">{POTIONS[id].line}</p>
              <div className="mt-2 flex gap-2">
                <Button type="button" className="h-9" onClick={() => act(drinkPotion(state, id))}>
                  Drink
                </Button>
                <Button type="button" variant="outline" className="h-9" onClick={() => act(storePotion(state, id))}>
                  Store
                </Button>
              </div>
            </li>
          ))}
          {potionIds.every((id) => (state.brew?.[id] ?? 0) < 1) && (
            <li className="text-sm text-muted-foreground">No drinks. Raise a brew house and make them.</li>
          )}
        </ul>
        </>
        ) : null}
      </div>
    </div>
  );
}
