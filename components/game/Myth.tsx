"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { MILL_COST, SHRINE_COST, STAKE_COST, WYRM_NAME, holdById } from "@/lib/game/content";
import { chooseOmen, dismissOmen, fulfillOath, offerTribute, raiseMill, raiseShrine, raiseStake } from "@/lib/game/engine";
import type { GameState, Result } from "@/lib/game/types";
import { OMEN_ART } from "./art";
import { useFrame } from "./frame";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function WyrmCard({ state, act }: { state: GameState; act: (result: Result) => void }) {
  const ire = state.wyrm?.ire ?? 0;
  return (
    <div className="overflow-hidden rounded-2xl bg-[#1c2430] text-[#f4ead7] ring-1 ring-[#e6c56e]/30">
      <div className="relative h-40">
        <img src="/art/wyrm-vell.jpg" alt="" className="h-full w-full object-cover object-[center_20%]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#1c2430] via-[#1c2430]/20 to-transparent" />
        <div className="absolute right-3 bottom-3 left-3">
          <p className="text-[11px] tracking-[0.2em] uppercase text-[#e6c56e]">Frost-wyrm</p>
          <p className="font-display text-2xl leading-none">{WYRM_NAME}</p>
        </div>
      </div>
      <div className="px-4 pt-3 pb-4">
        <div className="flex items-center justify-between text-xs">
          <span>Ire</span>
          <span>{ire}/100</span>
        </div>
        <Progress value={ire} className="mt-1 h-1.5 bg-white/10" />
        <p className="mt-3 text-sm leading-relaxed text-[#f4ead7]/80">
          {WYRM_NAME} roosts above the pale mountains. Tribute cools that gold eye. Leave the ire to climb, and a shadow scorches the hall.
        </p>
        <div className="mt-3 flex flex-col gap-2">
          <Button type="button" className="h-11" onClick={() => act(offerTribute(state, "iron"))}>
            Offer 2 iron
          </Button>
          <Button type="button" variant="secondary" className="h-11" onClick={() => act(offerTribute(state, "salt"))}>
            Offer 3 salt
          </Button>
          <Button type="button" variant="outline" className="h-11 border-white/20 bg-transparent text-[#f4ead7] hover:bg-white/10" onClick={() => act(offerTribute(state, "relic"))}>
            Offer a relic
          </Button>
        </div>
      </div>
    </div>
  );
}

export function WorksCard({ state, act }: { state: GameState; act: (result: Result) => void }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <img src="/art/hall.jpg" alt="" className="h-24 w-full object-cover" />
      <div className="flex flex-col gap-2 p-4">
        <p className="font-display text-xl">Works</p>
        <WorkRow
          done={state.works.mill}
          title="Mill"
          detail={`+1 yield each dawn · ${MILL_COST.gold} gold, ${MILL_COST.timber} timber`}
          onBuild={() => act(raiseMill(state))}
        />
        <WorkRow
          done={state.works.shrine}
          title="Shrine"
          detail={`Kin rest easier each dawn · ${SHRINE_COST.gold} gold`}
          onBuild={() => act(raiseShrine(state))}
        />
        <WorkRow
          done={state.works.stake}
          title="Wyrm-stake"
          detail={`${WYRM_NAME} wakes more slowly · ${STAKE_COST.gold} gold, ${STAKE_COST.iron} iron`}
          onBuild={() => act(raiseStake(state))}
        />
      </div>
    </div>
  );
}

function WorkRow({
  done,
  title,
  detail,
  onBuild,
}: {
  done: boolean;
  title: string;
  detail: string;
  onBuild: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-background px-3 py-2">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {done ? (
        <span className="text-xs tracking-wide text-moss uppercase">Raised</span>
      ) : (
        <Button type="button" variant="outline" className="h-10" onClick={onBuild}>
          Raise
        </Button>
      )}
    </div>
  );
}

export function OathRow({
  state,
  memberId,
  act,
}: {
  state: GameState;
  memberId: string;
  act: (result: Result) => void;
}) {
  const member = state.compact.members.find((item) => item.id === memberId);
  if (!member?.inCompact) return null;
  const kept = state.oathsKept.includes(memberId);
  const need = holdById(member.holdId).needs[0];
  return (
    <div className="mt-3 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground">{kept ? "Oath kept" : `Asks for 3 ${need}`}</p>
      </div>
      {!kept && (
        <Button type="button" variant="outline" className="h-10" onClick={() => act(fulfillOath(state, memberId))}>
          Keep oath
        </Button>
      )}
    </div>
  );
}

export function OmenDialog({ state, act }: { state: GameState; act: (result: Result) => void }) {
  const frame = useFrame();
  const omen = state.omen;
  return (
    <Dialog
      open={Boolean(omen)}
      onOpenChange={(open) => {
        if (!open && state.omen) act(dismissOmen(state));
      }}
    >
      <DialogContent container={frame} className="max-h-[88%] overflow-y-auto p-0" showCloseButton={false}>
        {omen && (
          <>
            <div className="h-40 overflow-hidden">
              <img src={OMEN_ART[omen.art] ?? "/art/caravan.jpg"} alt="" className="wm-drift wm-drift-omen h-full w-full object-cover" />
            </div>
            <div className="wm-rise px-4 pt-4">
              <DialogHeader>
                <DialogTitle className="font-display text-2xl">{omen.title}</DialogTitle>
                <DialogDescription>{omen.creature}</DialogDescription>
              </DialogHeader>
              <p className="mt-3 text-sm leading-relaxed">{omen.body}</p>
              {omen.choices.some((choice) => choice.gamble) && (
                <p className="mt-3 text-xs tracking-wide text-[#8d6b2e] uppercase">One path is safe. The other rolls twelve bones. You watch them land.</p>
              )}
              <div className="mt-4 flex flex-col gap-2 pb-4">
                {omen.choices.map((choice) => (
                  <Button
                    key={choice.id}
                    type="button"
                    variant={choice.gamble ? "default" : "secondary"}
                    className="h-auto min-h-11 flex-col items-start gap-0.5 py-2 text-left whitespace-normal"
                    onClick={() => act(chooseOmen(state, choice.id))}
                  >
                    <span>{choice.gamble ? `Roll · ${choice.label}` : choice.label}</span>
                    <span className="text-xs font-normal opacity-80">{choice.detail}</span>
                  </Button>
                ))}
                <Button type="button" variant="ghost" className="h-11" onClick={() => act(dismissOmen(state))}>
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

export function FateRoll({ face, won, line }: { face: number; won: boolean; line: string }) {
  const [shown, setShown] = useState<number | null>(null);
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const id = window.setTimeout(() => setShown(face), reduce ? 0 : 880);
    return () => window.clearTimeout(id);
  }, [face]);

  return (
    <div className="absolute inset-0 z-[70] flex flex-col items-center justify-center bg-[#14110e]/88 px-8 text-center text-[#f4ead7]">
      <p className="text-xs tracking-[0.28em] text-[#e6c56e] uppercase">The bones</p>
      <div
        className={`mt-4 grid size-24 place-items-center rounded-2xl bg-[#f4ead7] font-display text-5xl text-[#7c2a24] shadow-[0_18px_40px_rgba(0,0,0,0.45)] ${shown === null ? "wm-tumble" : ""}`}
      >
        {shown ?? "·"}
      </div>
      <p className="mt-5 font-display text-3xl">{shown === null ? "Rolling" : won ? "The road pays" : "The road turns"}</p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-[#f4ead7]/85">{shown === null ? "Twelve faces. Six of them are kind." : line}</p>
    </div>
  );
}
