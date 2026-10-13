"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { HOLDS } from "@/lib/game/content";
import {
  BUILDINGS,
  CHAPTERS,
  SKILLS,
  buildingCost,
  chapterName,
  chooseSkill,
  claimMission,
  endureThreat,
  payThreat,
  rideThreat,
  setCaptainOrder,
  startProject,
} from "@/lib/game/progress";
import type { CaptainOrder, GameState, HoldId, Result, SkillId } from "@/lib/game/types";

const ORDERS: { id: CaptainOrder; label: string }[] = [
  { id: "oath", label: "Stay" },
  { id: "garrison", label: "Gate" },
  { id: "march", label: "March" },
  { id: "hunt", label: "Hunt" },
  { id: "trade", label: "Trade" },
];

export function SkillDialog({
  state,
  act,
}: {
  state: GameState;
  act: (result: Result) => void;
}) {
  const offer = state.campaign?.offer;
  if (!offer) return null;
  return (
    <div className="absolute inset-0 z-[70] flex flex-col justify-end bg-[#14110e]/80 p-4 pb-8">
      <div className="rounded-2xl bg-popover p-4 text-popover-foreground shadow-xl">
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">Level {offer.level}</p>
        <h2 className="mt-1 font-display text-2xl">Choose a discipline</h2>
        <p className="mt-1 text-sm text-muted-foreground">It stays with you. The other two can return at a later level.</p>
        <div className="mt-3 flex flex-col gap-2">
          {offer.choices.map((id) => (
            <button
              key={id}
              type="button"
              className="rounded-xl bg-card px-3 py-3 text-left ring-1 ring-foreground/10"
              onClick={() => act(chooseSkill(state, id as SkillId))}
            >
              <span className="font-display text-lg">{SKILLS[id].name}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{SKILLS[id].blurb}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HoldWorks({ state, act }: { state: GameState; act: (result: Result) => void }) {
  const camp = state.campaign;
  if (!camp) return null;
  const chapter = CHAPTERS.find((item) => item.id === camp.chapter);
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="font-display text-xl">Raise the hold</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {chapterName(camp.chapter)}. {chapter?.aim} The realm above is these works. One plot rises at a time and finishes when you seal the day.
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {BUILDINGS.map((spec) => {
          const level = camp.buildings[spec.id] ?? 0;
          const cost = buildingCost(state, spec.id);
          const rising = camp.project === spec.id;
          return (
            <li key={spec.id} className="rounded-xl bg-background px-3 py-3">
              <p className="text-sm font-medium">
                {spec.name}
                <span className="ml-2 text-xs text-muted-foreground">level {level}/5</span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{spec.blurb}</p>
              {rising ? (
                <p className="mt-2 text-xs tracking-wide text-moss uppercase">Rises at dawn</p>
              ) : level >= 5 ? (
                <p className="mt-2 text-xs tracking-wide text-muted-foreground uppercase">As high as the ridge</p>
              ) : (
                <Button type="button" variant="outline" className="mt-2 h-10" onClick={() => act(startProject(state, spec.id))}>
                  Raise · {cost.gold}g, {cost.qty} {cost.good}
                </Button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function CaptainOrders({
  state,
  memberId,
  act,
}: {
  state: GameState;
  memberId: string;
  act: (result: Result) => void;
}) {
  const captain = state.campaign?.captains[memberId];
  const member = state.compact.members.find((item) => item.id === memberId);
  const [aiming, setAiming] = useState(false);
  if (!captain || !member?.inCompact) return null;
  return (
    <div className="mt-3">
      <p className="text-xs tracking-wide text-muted-foreground uppercase">
        Captain rank {captain.rank}
        {captain.order === "march" && captain.target ? ` · marching to ${captain.target}` : ` · ${captain.order}`}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ORDERS.map((order) => (
          <Button
            key={order.id}
            type="button"
            variant={captain.order === order.id ? "default" : "outline"}
            className="h-10"
            onClick={() => {
              if (order.id === "march") {
                setAiming(true);
                return;
              }
              setAiming(false);
              act(setCaptainOrder(state, memberId, order.id));
            }}
          >
            {order.label}
          </Button>
        ))}
      </div>
      {aiming && (
        <div className="mt-2 flex flex-wrap gap-2">
          {HOLDS.filter((hold) => hold.id !== state.player.holdId).map((hold) => (
            <Button
              key={hold.id}
              type="button"
              variant="secondary"
              className="h-10"
              onClick={() => {
                setAiming(false);
                act(setCaptainOrder(state, memberId, "march", hold.id as HoldId));
              }}
            >
              {hold.name}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ThreatCard({ state, act }: { state: GameState; act: (result: Result) => void }) {
  const threat = state.campaign?.threat;
  if (!threat) return null;
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <img src={threat.art} alt="" className="h-28 w-full object-cover" />
      <div className="p-4">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">On the road</p>
        <p className="mt-1 font-display text-2xl">{threat.title}</p>
        <p className="mt-2 text-sm leading-relaxed">{threat.detail}</p>
        <div className="mt-3 flex flex-col gap-2">
          <Button type="button" className="h-11" onClick={() => act(payThreat(state))}>
            Pay 6 gold
          </Button>
          <Button type="button" variant="secondary" className="h-11" onClick={() => act(rideThreat(state))}>
            Send a marching captain
          </Button>
          <Button type="button" variant="outline" className="h-11" onClick={() => act(endureThreat(state))}>
            Let it pass
          </Button>
        </div>
      </div>
    </div>
  );
}

export function MissionList({ state, act }: { state: GameState; act: (result: Result) => void }) {
  const camp = state.campaign;
  if (!camp) return null;
  const visible = camp.missions.filter((mission) => mission.chapter <= camp.chapter && mission.status !== "claimed");
  if (visible.length === 0) return null;
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="font-display text-xl">The long work</p>
      <p className="mt-1 text-sm text-muted-foreground">{chapterName(camp.chapter)}. These do not end when the wagons are full.</p>
      <ul className="mt-3 flex flex-col gap-3">
        {visible.map((mission) => (
          <li key={mission.id}>
            <p className="text-sm font-medium">{mission.title}</p>
            <p className="text-xs text-muted-foreground">
              Chapter {mission.chapter} · {mission.progress}/{mission.need}
              {mission.status === "ready" ? " · reward waiting" : ""}
            </p>
            <p className="mt-1 text-sm leading-relaxed">{mission.detail}</p>
            {mission.status === "ready" && (
              <Button type="button" className="mt-2 h-10" onClick={() => act(claimMission(state, mission.id))}>
                Claim {mission.rewardGold}g
              </Button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
