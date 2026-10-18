"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { HOLDS, holdById } from "@/lib/game/content";
import {
  BUILDINGS,
  CHAPTERS,
  REALM_PROJECTS,
  SKILLS,
  buildingCost,
  chapterName,
  chooseSkill,
  claimMission,
  dismissRealmNotice,
  endureThreat,
  hasRealmWork,
  payThreat,
  realmLaborTitle,
  realmProjectArt,
  realmProjectCost,
  realmProjectDawns,
  realmStanding,
  rideThreat,
  setCaptainOrder,
  startProject,
  startRealmProject,
} from "@/lib/game/progress";
import { borderPathRead, politicalRead } from "@/lib/game/heroes";
import type { CaptainOrder, GameState, HoldId, RealmBench, RealmLabor, RealmProjectId, Result, SkillId } from "@/lib/game/types";
import { Stat } from "./stat";

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
        {chapterName(camp.chapter)}. {chapter?.aim} One work rises at a time and finishes when you seal the day.
        {camp.realmLabor
          ? ` ${realmLaborTitle(camp.realmLabor)} is a longer project: dawn ${camp.realmLabor.spent} of ${realmProjectDawns(camp.realmLabor.id)}. It is under Projects.`
          : ""}
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
                <Button type="button" className="mt-2 h-11" onClick={() => act(startProject(state, spec.id))}>
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

function laborNote(state: GameState, labor: RealmLabor): string {
  const dawns = realmProjectDawns(labor.id);
  const ask = politicalRead(state, labor.id);
  const last = labor.spent >= dawns - 1 && labor.spent > 0;
  const gated = labor.id === "compact" || labor.id === "counsel" || labor.id === "charter";
  if (last && gated && ask && !ask.met) {
    return "The last dawn is here, and the work is waiting on its hero. The cost is already paid. Seal the day again once they are ready. It keeps going while the wagons are away.";
  }
  if (last && gated && ask?.met) {
    return "The last dawn is here, and the hero is ready. Seal the day to close it. It keeps going while the wagons are away.";
  }
  if (labor.spent === 0) return "Seal the day to sink the first dawn of labor. The cost is already paid.";
  const left = dawns - labor.spent;
  return `${left === 1 ? "1 dawn of labor remains." : `${left} dawns of labor remain.`} It keeps going while the wagons are away.`;
}

export function RealmProjects({ state, act }: { state: GameState; act: (result: Result) => void }) {
  const camp = state.campaign;
  const [picking, setPicking] = useState(false);
  if (!camp) return null;
  const labor = camp.realmLabor;
  const works = camp.realmWorks ?? [];
  const notice = camp.realmNotice;
  const noticeWork = notice ? works[works.length - 1] : undefined;
  const sworn = state.compact.members.filter((member) => member.inCompact && !hasRealmWork(state, "border", undefined, member.holdId));
  const waiting = !labor;

  function begin(id: RealmProjectId, target?: HoldId | RealmBench) {
    setPicking(false);
    act(startRealmProject(state, id, target));
  }

  return (
    <div className="flex flex-col gap-6">
      {notice && (
        <div className="wm-event overflow-hidden rounded-2xl ring-2 ring-[#e6c56e]">
          <img src={realmProjectArt(noticeWork ?? { id: "hall" })} alt="" className="h-36 w-full object-cover" />
          <div className="p-5">
            <p className="wm-kicker">The work stands</p>
            <p className="mt-1 font-display text-2xl leading-tight">{noticeWork ? realmLaborTitle(noticeWork) : "A project"}</p>
            <p className="mt-2 text-sm leading-relaxed">{notice}</p>
            <Button type="button" className="mt-3 h-11 w-full" onClick={() => act(dismissRealmNotice(state))}>
              The hold has seen it
            </Button>
          </div>
        </div>
      )}
      {labor && (
        <div className="wm-event overflow-hidden rounded-2xl ring-1 ring-[#8d6b2e]/45">
          <div className="relative h-32">
            <img src={realmProjectArt(labor)} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1c1612]/80 to-transparent" />
            <p className="wm-kicker absolute bottom-3 left-4">Rising</p>
          </div>
          <div className="p-5">
            <p className="font-display text-2xl leading-tight">{realmLaborTitle(labor)}</p>
            <p className="mt-3 font-display text-5xl leading-none text-[#6a4a12]">
              <Stat value={realmProjectDawns(labor.id) - labor.spent} />
              <span className="ml-2 align-middle font-sans text-sm font-medium tracking-normal text-muted-foreground">
                {realmProjectDawns(labor.id) - labor.spent === 1 ? "dawn left" : "dawns left"}
              </span>
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Dawn <Stat value={labor.spent} className="text-base text-foreground" /> of {realmProjectDawns(labor.id)}
            </p>
            <Progress value={(labor.spent / realmProjectDawns(labor.id)) * 100} className="mt-3 h-2" />
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{laborNote(state, labor)}</p>
            {labor.id === "border" && <BorderAsk state={state} />}
            {labor.id === "oathstone" ? (
              <p className="mt-2 text-xs leading-relaxed text-moss" data-political-ask="oathstone" data-ask="met">
                Two heroes were on the road when this began. The stone does not ask for them again.
              </p>
            ) : (
              <PoliticalAsk state={state} id={labor.id} />
            )}
          </div>
        </div>
      )}
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="font-display text-xl">Raise a project</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Each one takes more than a dawn. What it changes stays after the wagons leave.
          {labor ? " One project rises at a time." : ""}
        </p>
        {REALM_PROJECTS.some((spec) => !spec.politics && !realmCardDone(state, spec.id, sworn.length, works)) ? (
        <ul className="mt-3 flex flex-col gap-3">
          {REALM_PROJECTS.filter((spec) => !spec.politics).map((spec) => {
            if (realmCardDone(state, spec.id, sworn.length, works)) return null;
            const rising = labor?.id === spec.id;
            if (rising) return null;
            return (
              <li key={spec.id} className="rounded-xl bg-background px-3 py-3">
                <p className="text-sm font-medium">{spec.name}</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {spec.dawns} dawns. {spec.blurb}
                </p>
                {spec.id === "border" && <BorderAsk state={state} />}
                {waiting && spec.id === "watchtower" && (
                  <StartButton state={state} id="watchtower" onStart={() => begin("watchtower")} />
                )}
                {waiting && spec.id === "hall" && <StartButton state={state} id="hall" onStart={() => begin("hall")} />}
                {waiting && spec.id === "bench" && (
                  <div className="mt-2 flex flex-col gap-2">
                    {!hasRealmWork(state, "bench", "forge") && (
                      <StartButton state={state} id="bench" bench="forge" label="Expand the forge" onStart={() => begin("bench", "forge")} />
                    )}
                    {!hasRealmWork(state, "bench", "loom") && (
                      <StartButton state={state} id="bench" bench="loom" label="Expand the loom" onStart={() => begin("bench", "loom")} />
                    )}
                  </div>
                )}
                {waiting && spec.id === "border" && sworn.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">No sworn hold can take a path.</p>
                )}
                {waiting && spec.id === "border" && sworn.length > 0 && (
                  <>
                    <Button type="button" variant="outline" className="mt-2 h-10" onClick={() => setPicking((open) => !open)}>
                      Choose a sworn hold
                    </Button>
                    {picking && (
                      <div className="mt-2 flex flex-col gap-2">
                        {sworn.map((member) => (
                          <Button key={member.id} type="button" className="h-11" onClick={() => begin("border", member.holdId)}>
                            {holdById(member.holdId).name} · {realmProjectCost(state, "border").gold}g, {realmProjectCost(state, "border").qty} timber
                          </Button>
                        ))}
                      </div>
                    )}
                  </>
                )}
                {!waiting && <p className="mt-2 text-xs tracking-wide text-muted-foreground uppercase">Waits</p>}
              </li>
            );
          })}
        </ul>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Every project you can raise is already standing.</p>
        )}
      </div>
      <PoliticsProjects state={state} waiting={waiting} laborId={labor?.id} onBegin={begin} />
      {works.length > 0 && (
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-display text-xl">Standing</p>
          <ul className="mt-3 flex flex-col gap-3">
            {works.map((work) => (
              <li key={`${work.id}-${work.holdId ?? ""}-${work.bench ?? ""}`}>
                <p className="text-sm font-medium">{realmLaborTitle(work)}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{realmStanding(work)}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function realmCardDone(state: GameState, id: RealmProjectId, openPaths: number, works: { id: RealmProjectId }[]): boolean {
  if (id === "bench") return hasRealmWork(state, "bench", "forge") && hasRealmWork(state, "bench", "loom");
  if (id === "border") return openPaths === 0 && works.some((work) => work.id === "border");
  return hasRealmWork(state, id);
}

function PoliticalAsk({ state, id }: { state: GameState; id: RealmProjectId }) {
  const read = politicalRead(state, id);
  if (!read) return null;
  return (
    <p
      className={`mt-2 text-xs leading-relaxed ${read.met ? "text-moss" : "text-[#3d4a62]"}`}
      data-political-ask={id}
      data-ask={read.met ? "met" : "open"}
    >
      {read.line}
    </p>
  );
}

function PoliticsProjects({
  state,
  waiting,
  laborId,
  onBegin,
}: {
  state: GameState;
  waiting: boolean;
  laborId?: RealmProjectId;
  onBegin: (id: RealmProjectId, target?: HoldId | RealmBench) => void;
}) {
  const [picking, setPicking] = useState(false);
  const works = state.campaign?.realmWorks ?? [];
  const sworn = state.compact.members.filter((member) => member.inCompact && !hasRealmWork(state, "compact", undefined, member.holdId));
  const visible = REALM_PROJECTS.filter((spec) => {
    if (!spec.politics || laborId === spec.id) return false;
    if (spec.id === "compact") return !(sworn.length === 0 && works.some((work) => work.id === "compact"));
    return !hasRealmWork(state, spec.id);
  });
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-section="politics">
      <p className="font-display text-xl">Politics</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        Bonds, laws, the wagons, and a shared goal. Each one asks for a hero before it starts or on the last dawn. The change stays after the wagons leave.
      </p>
      {visible.length === 0 ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Every political project you can raise is already standing.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {visible.map((spec) => (
            <li key={spec.id} className="rounded-xl bg-background px-3 py-3" data-project={spec.id}>
              <p className="text-sm font-medium">{spec.name}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                {spec.dawns} dawns. {spec.blurb}
              </p>
              <PoliticalAsk state={state} id={spec.id} />
              {waiting && spec.id === "counsel" && <StartButton state={state} id="counsel" onStart={() => onBegin("counsel")} />}
              {waiting && spec.id === "charter" && <StartButton state={state} id="charter" onStart={() => onBegin("charter")} />}
              {waiting && spec.id === "oathstone" && <StartButton state={state} id="oathstone" onStart={() => onBegin("oathstone")} />}
              {waiting && spec.id === "compact" && sworn.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">No sworn hold can share a watch.</p>
              )}
              {waiting && spec.id === "compact" && sworn.length > 0 && (
                <>
                  <Button type="button" variant="outline" className="mt-2 h-10" onClick={() => setPicking((open) => !open)}>
                    Choose a sworn hold
                  </Button>
                  {picking && (
                    <div className="mt-2 flex flex-col gap-2">
                      {sworn.map((member) => (
                        <Button
                          key={member.id}
                          type="button"
                          variant="secondary"
                          className="h-10"
                          onClick={() => {
                            setPicking(false);
                            onBegin("compact", member.holdId);
                          }}
                        >
                          {holdById(member.holdId).name} · {realmProjectCost(state, "compact").gold}g, {realmProjectCost(state, "compact").qty} iron
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}
              {!waiting && <p className="mt-2 text-xs tracking-wide text-muted-foreground uppercase">Waits</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BorderAsk({ state }: { state: GameState }) {
  const read = borderPathRead(state);
  return (
    <p className={`mt-2 text-xs leading-relaxed ${read.met ? "text-moss" : "text-[#3d4a62]"}`} data-border-ask={read.met ? "met" : "open"}>
      {read.line}
    </p>
  );
}

function StartButton({
  state,
  id,
  bench,
  label,
  onStart,
}: {
  state: GameState;
  id: RealmProjectId;
  bench?: RealmBench;
  label?: string;
  onStart: () => void;
}) {
  const spec = REALM_PROJECTS.find((item) => item.id === id);
  const cost = realmProjectCost(state, id, bench);
  return (
    <Button type="button" className="mt-2 h-11" onClick={onStart}>
      {label ?? spec?.name ?? "Begin"} · {cost.gold}g, {cost.qty} {cost.good}
    </Button>
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
