"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { holdById } from "@/lib/game/content";
import { claimQuest, equipGear, stowGear, travel } from "@/lib/game/engine";
import { luckOf } from "@/lib/game/world";
import type { Cutscene, GameState, HoldId, Rarity, Result } from "@/lib/game/types";

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
  useEffect(() => {
    if (!beat) return;
    speakLine(beat.speaker, beat.line, voice);
    return () => window.speechSynthesis?.cancel();
  }, [beat, voice, scene.index, scene.id]);

  if (!beat) return null;
  const last = scene.index >= scene.beats.length - 1;
  return (
    <button type="button" className="absolute inset-0 z-[75] overflow-hidden bg-[#14110e] text-left text-[#f4ead7]" onClick={onAdvance}>
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
        <p className="mt-4 text-xs tracking-[0.16em] text-[#f4ead7]/80 uppercase">{last ? "Tap to return to the road" : "Tap for the next line"}</p>
      </div>
    </button>
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
        <p className="font-display text-xl">Pack</p>
        <ul className="mt-2 flex flex-col gap-2">
          {(state.pack ?? []).map((gear) => (
            <li key={gear.id} className="flex items-center gap-3 rounded-xl bg-background px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium ${RARITY_CLASS[gear.rarity]}`}>
                  {gear.name}
                  <span className="ml-2 text-[10px] tracking-wide uppercase">{gear.rarity}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {gear.slot} · luck {gear.luck}
                  {worn.has(gear.id) ? " · worn" : ""}
                </p>
              </div>
              {worn.has(gear.id) ? (
                <Button type="button" variant="outline" className="h-10" onClick={() => act(stowGear(state, gear.id))}>
                  Stow
                </Button>
              ) : (
                <Button type="button" variant="outline" className="h-10" onClick={() => act(equipGear(state, gear.id))}>
                  Wear
                </Button>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
