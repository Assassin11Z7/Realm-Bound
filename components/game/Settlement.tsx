"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { holdById } from "@/lib/game/content";
import { BUILDINGS, buildingCost, startProject } from "@/lib/game/progress";
import type { BuildingId, GameState, HoldId, Result } from "@/lib/game/types";
import { TownScene } from "./town";

export function SettlementScene({
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
  const hearth = settlement?.hearth ?? 8;
  const snow = holdId === "highbarrow" || state.day > 12;
  const cold = hearth < 8;
  const weary = mood < 40 || bread === 0;
  const merry = mood >= 70 && bread > 0;
  const member = state.compact.members.find((item) => item.holdId === holdId);
  const [picked, setPicked] = useState<BuildingId | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  const spec = picked ? BUILDINGS.find((item) => item.id === picked) : null;
  const pickedLevel = picked && camp ? (camp.buildings[picked] ?? 0) : 0;
  const cost = picked ? buildingCost(state, picked) : null;
  const projectName = BUILDINGS.find((item) => item.id === camp?.project)?.name;

  useEffect(() => {
    if (!picked) return;
    detailRef.current?.scrollIntoView({ block: "nearest" });
  }, [picked]);

  return (
    <section className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10" aria-label={`Living view of ${hold.name}`}>
      <TownScene
        holdId={holdId}
        snow={snow}
        cold={cold}
        buildings={camp?.buildings ?? null}
        project={camp?.project ?? null}
        souls={souls}
        weary={weary}
        merry={merry}
        sworn={Boolean(member?.inCompact)}
        departed={Boolean(member && !member.inCompact)}
        field={mine ? state.player.banner.field : "#6e1e22"}
        charge={mine ? state.player.banner.charge : "#f4ead7"}
        youField={state.player.banner.field}
        youCharge={state.player.banner.charge}
        showYou={(state.where ?? state.player.holdId) === holdId}
        mill={Boolean(mine && state.works.mill)}
        shrineLit={Boolean(mine && state.works.shrine)}
        stake={Boolean(mine && state.works.stake)}
        ire={state.wyrm.ire}
        picked={picked}
        onPick={buildable ? setPicked : undefined}
      />
      <div className="px-4 py-3">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="font-display text-2xl leading-none">{hold.name}</h3>
          <p className="text-xs text-muted-foreground">
            {souls} people · mood {mood}
          </p>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {cold ? "The hearths are low. " : "Smoke is up. "}
          {bread === 0 ? "No bread is moving." : "Baskets move along the road."}
          {projectName ? ` ${projectName} rises at dawn.` : ""}
        </p>
        {buildable && spec && cost && (
          <div ref={detailRef} className="mt-3 rounded-xl bg-background px-3 py-3">
            <p className="text-sm font-medium">
              {spec.name}
              <span className="ml-2 text-xs text-muted-foreground">level {pickedLevel}/5</span>
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{spec.blurb}</p>
            {camp?.project === spec.id ? (
              <p className="mt-2 text-xs tracking-wide text-moss uppercase">Rises at dawn</p>
            ) : camp?.project ? (
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Another work is already rising. It finishes when you seal the day.</p>
            ) : pickedLevel >= 5 ? (
              <p className="mt-2 text-xs tracking-wide text-muted-foreground uppercase">As high as the ridge</p>
            ) : (
              <Button type="button" variant="outline" className="mt-2 h-10" onClick={() => act?.(startProject(state, spec.id))}>
                Raise · {cost.gold}g, {cost.qty} {cost.good}
              </Button>
            )}
          </div>
        )}
        {buildable && !spec && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {projectName ? `${projectName} is already rising. It finishes when you seal the day.` : "Tap a roof to raise it. The work finishes when you seal the day."}
          </p>
        )}
        {!buildable && mine && <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Open the Hold tab to raise a roof. It finishes at the next dawn.</p>}
        {!mine && (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {member?.inCompact
              ? `${member.name} keeps this ground for you.`
              : member
                ? `${member.name} has taken the people home.`
                : `${hold.lord} keeps ${hold.name}.`}
          </p>
        )}
      </div>
    </section>
  );
}
