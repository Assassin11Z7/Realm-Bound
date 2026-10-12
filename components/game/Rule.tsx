"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { holdById } from "@/lib/game/content";
import { chooseCrossing, choosePetition, dismissCrossing, setEdict, stockSettlement } from "@/lib/game/engine";
import { EDICTS, modsBlurb } from "@/lib/game/realm";
import type { EdictId, GameState, HoldId, Result } from "@/lib/game/types";
import { useFrame } from "./frame";

function lawName(id: EdictId | undefined): string {
  return EDICTS.find((item) => item.id === id)?.name ?? "Leave them be";
}

export function PeopleStrip({ state, onOpen }: { state: GameState; onOpen: () => void }) {
  const home = (state.settlements ?? []).find((item) => item.holdId === state.player.holdId);
  if (!home) return null;
  const memory = (state.marks ?? []).length;
  return (
    <button type="button" onClick={onOpen} className="rounded-2xl bg-card p-4 text-left ring-1 ring-foreground/10">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">The people</p>
      <p className="mt-1 font-display text-2xl leading-none">
        {home.souls} people at {holdById(home.holdId).name}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Mood {home.mood} · food {home.bread} · firewood {home.hearth} · {lawName(home.edict)}
      </p>
      {memory > 0 && (
        <p className="mt-2 text-sm">
          {memory} choice{memory === 1 ? "" : "s"} still bind the realm.
        </p>
      )}
    </button>
  );
}

export function MarksCard({ state }: { state: GameState }) {
  const marks = state.marks ?? [];
  const blurb = modsBlurb(state);
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-coach="creatures">
      <p className="font-display text-xl">What the realm remembers</p>
      {blurb && <p className="mt-2 text-sm leading-relaxed">{blurb}</p>}
      {marks.length === 0 ? (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          No bargain has been struck. Creatures will come to the road. What you choose stays true after they leave.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {[...marks].reverse().slice(0, 6).map((mark) => (
            <li key={`${mark.id}-${mark.day}`} className="text-sm leading-relaxed">
              <span className="font-medium">{mark.creature}.</span> {mark.summary}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function PeoplePanel({ state, act }: { state: GameState; act: (result: Result) => void }) {
  const frame = useFrame();
  const [lawFor, setLawFor] = useState<HoldId | null>(null);
  const blurb = modsBlurb(state);
  const ruling = state.settlements?.find((item) => item.holdId === lawFor);

  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="font-display text-xl">The people</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Laws last until you change them. Grain feeds the food store. Timber feeds the fires. Leave them be, and nothing comes out of your own stores.
      </p>
      {blurb && <p className="mt-2 text-sm leading-relaxed">{blurb}</p>}
      {state.petition && (
        <div className="mt-3 rounded-xl bg-background p-3 ring-1 ring-gold/50">
          <p className="text-xs tracking-wide text-[#8d6b2e] uppercase">The people ask</p>
          <p className="mt-1 font-display text-lg leading-tight">{state.petition.title}</p>
          <p className="mt-2 text-sm leading-relaxed">{state.petition.body}</p>
          <div className="mt-3 flex flex-col gap-2">
            {state.petition.choices.map((choice) => (
              <Button
                key={choice.id}
                type="button"
                variant="secondary"
                className="h-auto min-h-11 flex-col items-start gap-0.5 py-2 text-left whitespace-normal"
                onClick={() => act(choosePetition(state, choice.id))}
              >
                <span>{choice.label}</span>
                <span className="text-xs font-normal opacity-80">{choice.detail}</span>
              </Button>
            ))}
          </div>
        </div>
      )}
      <div className="mt-3 flex flex-col gap-3">
        {(state.settlements ?? []).map((settlement) => {
          const place = holdById(settlement.holdId).name;
          const home = settlement.holdId === state.player.holdId;
          return (
            <div key={settlement.holdId} className="rounded-xl bg-background p-3" data-coach={home ? "people" : undefined}>
              <div className="flex items-baseline justify-between gap-2">
                <p className="font-medium">
                  {place}
                  {home ? " · your hold" : ""}
                </p>
                <p className="text-sm">{settlement.souls} people</p>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span>Mood</span>
                <span className={settlement.mood < 40 ? "text-primary" : ""}>{settlement.mood}</span>
              </div>
              <Progress value={settlement.mood} className="mt-1 h-1.5" />
              <p className="mt-2 text-xs text-muted-foreground">
                Food {settlement.bread} · firewood {settlement.hearth} · {lawName(settlement.edict)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" className="h-10" onClick={() => act(stockSettlement(state, settlement.holdId, "bread", 1))}>
                  Send 1 grain
                </Button>
                <Button type="button" variant="outline" className="h-10" onClick={() => act(stockSettlement(state, settlement.holdId, "hearth", 1))}>
                  Send 1 timber
                </Button>
                <Button type="button" variant="outline" className="h-10" onClick={() => setLawFor(settlement.holdId)}>
                  Set a law
                </Button>
              </div>
            </div>
          );
        })}
      </div>

      <Dialog open={Boolean(ruling)} onOpenChange={(open) => !open && setLawFor(null)}>
        <DialogContent container={frame} className="max-h-[80%] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{ruling ? `A law for ${holdById(ruling.holdId).name}` : "A law"}</DialogTitle>
            <DialogDescription>The law you set stays until you replace it.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {EDICTS.map((edict) => {
              const standing = ruling?.edict === edict.id;
              return (
                <Button
                  key={edict.id}
                  type="button"
                  variant={standing ? "secondary" : "outline"}
                  className="h-auto min-h-11 flex-col items-start gap-0.5 py-2 text-left whitespace-normal"
                  disabled={standing}
                  onClick={() => {
                    if (!ruling) return;
                    act(setEdict(state, ruling.holdId, edict.id));
                    setLawFor(null);
                  }}
                >
                  <span>{standing ? `${edict.name} · standing` : edict.name}</span>
                  <span className="text-xs font-normal opacity-80">{edict.detail}</span>
                </Button>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CrossingDialog({ state, act }: { state: GameState; act: (result: Result) => void }) {
  const frame = useFrame();
  const crossing = state.omen ? null : state.crossing;
  return (
    <Dialog
      open={Boolean(crossing)}
      onOpenChange={(open) => {
        if (!open && state.crossing && !state.omen) act(dismissCrossing(state));
      }}
    >
      <DialogContent container={frame} className="max-h-[88%] overflow-y-auto p-0" showCloseButton={false}>
        {crossing && (
          <>
            <div className="h-40 overflow-hidden">
              <img src={crossing.art} alt="" className="wm-drift h-full w-full object-cover" />
            </div>
            <div className="wm-rise px-4 pt-4">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{crossing.title}</DialogTitle>
                <DialogDescription>
                  {crossing.creature} · {crossing.disposition === "kind" ? "a kindness" : "a threat"}
                </DialogDescription>
              </DialogHeader>
              <p className="mt-3 text-sm leading-relaxed">{crossing.body}</p>
              <p className="mt-3 text-xs tracking-wide text-[#8d6b2e] uppercase">The choice stays in force after they leave.</p>
              {crossing.choices.some((choice) => choice.gamble) && (
                <p className="mt-2 text-xs tracking-wide text-[#8d6b2e] uppercase">One path rolls twelve bones. Faces 1–6 pay. 7–12 turn.</p>
              )}
              <div className="mt-4 flex flex-col gap-2 pb-4">
                {crossing.choices.map((choice) => (
                  <Button
                    key={choice.id}
                    type="button"
                    variant={choice.gamble ? "default" : "secondary"}
                    className="h-auto min-h-11 flex-col items-start gap-0.5 py-2 text-left whitespace-normal"
                    onClick={() => act(chooseCrossing(state, choice.id))}
                  >
                    <span>{choice.gamble ? `Roll · ${choice.label}` : choice.label}</span>
                    <span className="text-xs font-normal opacity-80">{choice.detail}</span>
                  </Button>
                ))}
                <Button type="button" variant="ghost" className="h-11" onClick={() => act(dismissCrossing(state))}>
                  Let them pass
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
