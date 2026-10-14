"use client";

import { BookOpen, CircleHelp, Ellipsis, House, Map, Route, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  BASE_CAP,
  FOUNDER_WITHDRAW_CAP,
  GOOD_LABEL,
  LEVY_TARGET,
  PERSONALITY_LABEL,
  RULES,
  UNDERCROFT_CAP,
  UNDERCROFT_COST,
  WYRM_NAME,
  contentWord,
  factionById,
  holdById,
  renownTitle,
  seasonLabel,
  seasonNote,
  stashCount,
} from "@/lib/game/content";
import {
  acceptOffer,
  buy,
  buyPrice,
  cancelOffer,
  dawnYield,
  deposit,
  dismissOutcome,
  gift,
  offerRelic,
  pledgeFromHall,
  pledgePersonal,
  pledgeRoadShare,
  postOffer,
  raiseUndercroft,
  replayTutorial,
  sealDay,
  sell,
  sellPrice,
  setReserve,
  advanceScene,
  advanceTutorial,
  visitKey,
  withdraw,
} from "@/lib/game/engine";
import { COACH, dawnsLeftLabel, whatNow } from "@/lib/game/coach";
import type { GameState, GoodId, HoldId, LevyGood, Result } from "@/lib/game/types";
import { GOODS, LEVY_GOODS } from "@/lib/game/types";
import { GoodThumb, Portrait } from "./art";
import { useFrame } from "./frame";
import { BannerMark } from "./marks";
import { chapterName, powerOf, xpNeed } from "@/lib/game/progress";
import { CaptainOrders, HoldWorks, MissionList, SkillDialog, ThreatCard } from "./Campaign";
import { CraftBench } from "./Craft";
import { CutsceneView, ExplorePanel } from "./Explore";
import { FateRoll, OathRow, OmenDialog, WorksCard, WyrmCard } from "./Myth";
import { CrossingDialog, DecreeCard, MarksCard, PeoplePanel, PeopleStrip } from "./Rule";
import { peopleTrouble } from "@/lib/game/realm";
import { HoldBrief, RealmMap } from "./RealmMap";

type Tab = "realm" | "hold" | "compact" | "road";
type Amount = 1 | 5 | "all";

const TABS: { id: Tab; label: string; icon: typeof Map }[] = [
  { id: "realm", label: "Realm", icon: Map },
  { id: "hold", label: "Hold", icon: House },
  { id: "compact", label: "Neighbors", icon: Users },
  { id: "road", label: "Road", icon: Route },
];

export function PlaySeason({
  state,
  onPlayed,
  onStepAway,
  onAbandon,
}: {
  state: GameState;
  onPlayed: (state: GameState) => void;
  onStepAway: () => void;
  onAbandon: () => void;
}) {
  const frame = useFrame();
  const mainRef = useRef<HTMLDivElement>(null);
  const sealing = useRef(false);
  const leaving = useRef(false);
  const [tab, setTab] = useState<Tab>("realm");
  const [amount, setAmount] = useState<Amount>(1);
  const [holdId, setHoldId] = useState<HoldId>(state.player.holdId);
  const [good, setGood] = useState<GoodId>(holdById(state.player.holdId).produces);
  const [toast, setToast] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [help, setHelp] = useState(false);
  const [chronicle, setChronicle] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [giftFor, setGiftFor] = useState<string | null>(null);
  const [dawn, setDawn] = useState<{ day: number; title: string } | null>(null);
  const [fate, setFate] = useState<{ face: number; won: boolean; line: string } | null>(null);
  const [voice, setVoice] = useState(true);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const lesson = state.tutorial?.step ?? null;
  const coach = lesson && !state.scene ? COACH[lesson] : null;
  const coachReady = Boolean(coach && (!coach.needsTab || tab === coach.tab));
  const coachTarget = coach ? (coachReady ? coach.target : `tab-${coach.tab}`) : null;

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  useEffect(() => {
    const root = mainRef.current?.parentElement ?? document.body;
    root.querySelectorAll(".wm-coach-hot").forEach((node) => node.classList.remove("wm-coach-hot"));
    if (!coachTarget || state.scene) return;
    const el = root.querySelector(`[data-coach="${coachTarget}"]`);
    if (!(el instanceof HTMLElement)) return;
    el.classList.add("wm-coach-hot");
    if (mainRef.current?.contains(el)) el.scrollIntoView({ block: "center", inline: "nearest" });
    return () => el.classList.remove("wm-coach-hot");
  }, [coachTarget, tab, state.scene, state.day]);

  function onCoach() {
    if (!coach) return;
    if (!coachReady) {
      setTab(coach.tab);
      return;
    }
    act(advanceTutorial(state));
  }

  function act(result: Result) {
    if (result.error) {
      setToast({ tone: "bad", text: result.error });
      return;
    }
    if (result.fate) {
      const roll = result.fate;
      const line = result.message ?? "";
      setFate({ ...roll, line });
      window.setTimeout(() => {
        onPlayed(result.state);
        setToast({ tone: roll.won ? "good" : "bad", text: line });
        setFate(null);
      }, 2100);
      return;
    }
    onPlayed(result.state);
    if (result.message) setToast({ tone: "good", text: result.message });
  }

  function resolveQty(available: number): number {
    if (amount === "all") return available;
    return Math.min(amount, available);
  }

  function move(qty: number, run: (qty: number) => void) {
    if (qty < 1) {
      setToast({ tone: "bad", text: "Nothing to move." });
      return;
    }
    run(qty);
  }

  function leave(next: () => void) {
    leaving.current = true;
    next();
  }

  function onSeal() {
    if (sealing.current) return;
    const result = sealDay(state);
    if (result.error) {
      setToast({ tone: "bad", text: result.error });
      return;
    }
    sealing.current = true;
    navigator.vibrate?.(12);
    setDawn({
      day: result.state.day,
      title: result.state.omen?.creature ?? result.state.crossing?.creature ?? result.state.decree?.title ?? result.state.petition?.title ?? `Day ${result.state.day}`,
    });
    onPlayed(result.state);
    if (result.message) setToast({ tone: "good", text: result.message });
    window.setTimeout(() => {
      setDawn(null);
      sealing.current = false;
    }, 700);
  }

  const trouble = state.compact.members.some((member) => !member.inCompact || member.contentment < 25);
  const faction = factionById(state.player.factionId);
  const hold = holdById(state.player.holdId);
  const homePeople = state.settlements?.find((item) => item.holdId === state.player.holdId);
  const cap = state.player.undercroft ? UNDERCROFT_CAP : BASE_CAP;
  const verdictOpen = Boolean(state.outcome && !state.outcomeDismissed);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <header className="relative text-[#f4ead7]">
        <img src={`/art/hold-${hold.id}.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c1612]/50 via-[#1c1612]/45 to-[#1c1612]" />
        <div className="relative px-4 pt-3 pb-3">
          <div className="flex items-center gap-3">
            <BannerMark banner={state.player.banner} className="h-12 w-10 shrink-0" title={`${state.player.title} ${state.player.name}'s banner`} />
            <div className="min-w-0 flex-1">
              <h1 className="truncate font-display text-xl leading-none">{state.compact.name}</h1>
              <p className="mt-1 text-xs text-[#f4ead7]/75">
                Day {state.day} · {seasonLabel(state.day)} · {chapterName(state.campaign?.chapter ?? 1)}
              </p>
              {homePeople && (
                <p className="text-[11px] text-[#f4ead7]/75">
                  {homePeople.souls} people · mood {homePeople.mood} · loyalty {homePeople.loyalty}
                </p>
              )}
              <span className="mt-1 flex items-center gap-2 text-[11px] text-[#f4ead7]/80">
                <span>Lv {state.campaign?.level ?? 1}</span>
                <Progress
                  value={Math.min(100, ((state.campaign?.xp ?? 0) / xpNeed(state.campaign?.level ?? 1)) * 100)}
                  className="h-1.5 flex-1 bg-white/20"
                />
                <span>{powerOf(state)} power</span>
              </span>
            </div>
            <div className="text-right">
              <p className="font-display text-xl leading-none text-[#e6c56e]">{state.player.gold}g</p>
              <p className="mt-1 text-[11px] text-[#f4ead7]/70">
                {renownTitle(state.player.renown)} · fame {state.player.renown}
              </p>
            </div>
          </div>
          <div className="mt-2 flex gap-2">
            <IconButton label="Chronicle" onClick={() => setChronicle(true)} tone="night">
              <BookOpen className="size-4" />
            </IconButton>
            <IconButton label="How a season works" onClick={() => setHelp(true)} tone="night">
              <CircleHelp className="size-4" />
            </IconButton>
            <IconButton label="Season menu" onClick={() => setMenu(true)} tone="night">
              <Ellipsis className="size-4" />
            </IconButton>
            <p className="ml-auto self-center truncate text-xs text-[#f4ead7]/75">
              {state.player.title} {state.player.name}
            </p>
          </div>
          <button
            type="button"
            data-coach="wagons"
            className="mt-3 flex w-full flex-col gap-1.5 text-left"
            onClick={() => setTab("compact")}
          >
            <span className="flex justify-between text-[11px] tracking-wide text-[#e6c56e] uppercase">
              <span>Wagons</span>
              <span>{dawnsLeftLabel(state.day)}</span>
            </span>
            <span className="grid grid-cols-3 gap-2">
              {LEVY_GOODS.map((item) => {
                const have = state.compact.levy[item];
                const target = LEVY_TARGET[item];
                return (
                  <span key={item} className="min-w-0">
                    <span className="flex justify-between text-[11px]">
                      <span>{GOOD_LABEL[item]}</span>
                      <span>
                        {have}/{target}
                      </span>
                    </span>
                    <Progress value={Math.min(100, (have / target) * 100)} className="mt-1 h-1.5 bg-white/20" />
                  </span>
                );
              })}
            </span>
          </button>
          <button type="button" data-coach="anger" className="mt-2 flex w-full items-center gap-2 text-left" onClick={() => setTab("realm")}>
            <img src="/art/wyrm-vell.jpg" alt="" className={`size-8 rounded-full object-cover ring-1 ring-[#e6c56e] wm-ire${state.wyrm.ire >= 60 ? " wm-ire-hot" : ""}`} />
            <span className="min-w-0 flex-1">
              <span className="flex justify-between text-[11px]">
                <span>{WYRM_NAME}</span>
                <span>anger {state.wyrm.ire}</span>
              </span>
              <Progress value={state.wyrm.ire} className="mt-1 h-1.5 bg-white/20" />
            </span>
          </button>
        </div>
      </header>

      <div aria-live="polite" className="px-4">
        {toast && (
          <p key={toast.text} className={`wm-toast mt-2 rounded-xl px-3 py-2 text-sm leading-snug ${toast.tone === "bad" ? "bg-primary text-primary-foreground" : "bg-moss text-[#f3eadb]"}`}>
            {toast.text}
          </p>
        )}
        {coach && (
          <div className="wm-rise mt-2 rounded-2xl bg-[#1c1612] p-3 text-[#f4ead7] ring-2 ring-[#e6c56e]" data-coach="lesson">
            <p className="text-sm leading-snug">{coach.text}</p>
            <Button type="button" className="mt-2 h-11 w-full" onClick={onCoach}>
              {coachReady ? "Got it" : "Show me"}
            </Button>
          </div>
        )}
      </div>

      <div ref={mainRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {tab === "realm" && (
          <div className="wm-tab flex flex-col gap-3">
            <RealmMap state={state} selected={holdId} onSelect={setHoldId} />
            <DecreeCard state={state} act={act} />
            <PeopleStrip state={state} onOpen={() => setTab("hold")} />
            <MarksCard state={state} />
            <ThreatCard state={state} act={act} />
            <ExplorePanel state={state} holdId={holdId} act={act} />
            <MissionList state={state} act={act} />
            <HoldBrief state={state} holdId={holdId} />
            <WyrmCard state={state} act={act} />
            <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">This morning</p>
              <ul className="mt-2 flex flex-col gap-2 text-sm leading-relaxed">
                {[...state.chronicle].slice(-3).reverse().map((entry) => (
                  <li key={entry.id}>{entry.text}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "hold" && (
          <div className="wm-tab flex flex-col gap-3">
            <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
              <div className="relative h-32">
                <img src={`/art/hold-${hold.id}.jpg`} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
                <p className="absolute right-4 bottom-3 left-4 font-display text-2xl text-[#f4ead7]">{hold.name}</p>
              </div>
              <div className="p-4">
                <p className="text-sm leading-relaxed">
                  Sealing the day brings {dawnYield(state)} {GOOD_LABEL[hold.produces].toLowerCase()}.
                  {state.works.mill ? " The mill is in that count." : ""} {faction.bonus}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-[#3d4a62]">{hold.myth}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Cellar {stashCount(state.player.stash)}/{cap}
                  {state.day > 12 ? " · Deep winter has thinned the yield." : ""}
                </p>
                {!state.player.undercroft && (
                  <Button type="button" variant="outline" className="mt-3 h-11" onClick={() => act(raiseUndercroft(state))}>
                    Raise the cellar · {UNDERCROFT_COST}g
                  </Button>
                )}
              </div>
            </div>
            <DecreeCard state={state} act={act} />
            <PeoplePanel state={state} act={act} />
            <WorksCard state={state} act={act} />
            <HoldWorks state={state} act={act} />
            <CraftBench state={state} act={act} />
            <AmountPicker amount={amount} onChange={setAmount} />
            <div className="flex flex-col gap-2">
              {GOODS.map((item) => (
                <div key={item} className={`rounded-2xl ring-1 ${good === item ? "bg-accent ring-gold" : "bg-card ring-foreground/10"}`}>
                  <button type="button" className="flex min-h-12 w-full items-center gap-3 px-3 text-left" onClick={() => setGood(item)} aria-pressed={good === item}>
                    <GoodThumb good={item} />
                    <span className="flex-1 text-sm">{GOOD_LABEL[item]}</span>
                    <span className="font-display text-xl">{state.player.stash[item]}</span>
                  </button>
                  {good === item && (
                    <div className="flex flex-wrap gap-2 px-3 pb-3">
                      <Button type="button" variant="secondary" className="h-11" onClick={() => move(resolveQty(state.player.stash[item]), (qty) => act(deposit(state, item, qty)))}>
                        To the shared stores
                      </Button>
                      {isLevy(item) ? (
                        <Button type="button" className="h-11" onClick={() => move(resolveQty(state.player.stash[item]), (qty) => act(pledgePersonal(state, item, qty)))}>
                          To the wagons
                        </Button>
                      ) : (
                        <p className="self-center text-xs text-muted-foreground">The wagons do not take {GOOD_LABEL[item].toLowerCase()}. Sell it, or give it away.</p>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {state.player.factionId === "canticle" && (
              <Button type="button" variant="outline" className="h-11" onClick={() => act(offerRelic(state))}>
                Offer a relic to the saints
              </Button>
            )}
          </div>
        )}

        {tab === "compact" && (
          <CompactPanel
            state={state}
            amount={amount}
            onAmount={setAmount}
            act={act}
            onGift={setGiftFor}
            resolveQty={resolveQty}
          />
        )}

        {tab === "road" && <RoadPanel state={state} act={act} />}
      </div>

      {!coach && !state.scene && (
        <p className="mx-4 mt-2 rounded-xl bg-card px-3 py-2 text-sm leading-snug ring-1 ring-foreground/10" data-coach="what-now">
          <span className="font-medium">What now. </span>
          {whatNow(state)}
        </p>
      )}
      <div className="px-4 pt-1">
        <Button type="button" data-coach="seal" className="h-12 w-full text-base" onClick={onSeal}>
          {state.day === 12 ? "Seal the twelfth day" : "Seal the day"}
        </Button>
      </div>
      <nav className="mt-2 grid grid-cols-4 border-t border-border pb-[max(0.25rem,env(safe-area-inset-bottom))]">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              data-coach={`tab-${item.id}`}
              aria-current={active ? "page" : undefined}
              onClick={() => setTab(item.id)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="size-5" />
              {item.label}
              {item.id === "compact" && trouble && <span className="absolute top-2 right-[30%] size-2 rounded-full bg-primary" />}
              {item.id === "hold" && peopleTrouble(state) && <span className="absolute top-2 right-[30%] size-2 rounded-full bg-primary" />}
              {item.id === "road" && state.caravan && <span className="absolute top-2 right-[30%] size-2 rounded-full bg-gold" />}
            </button>
          );
        })}
      </nav>

      <OmenDialog state={state} act={act} />
      <CrossingDialog state={state} act={act} />

      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent container={frame} className="max-h-[80%] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">How a season works</DialogTitle>
            <DialogDescription>The season, the road, and the people.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {RULES.map((rule) => (
              <div key={rule.title}>
                <p className="font-medium">{rule.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{rule.body}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={chronicle} onOpenChange={setChronicle}>
        <DialogContent container={frame} className="max-h-[80%] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Chronicle</DialogTitle>
            <DialogDescription>What the season has already done.</DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-3 text-sm leading-relaxed">
            {[...state.chronicle].reverse().map((entry) => (
              <li key={entry.id}>
                <span className="text-xs text-muted-foreground">Day {entry.day}</span>
                <span className="mt-0.5 block">{entry.text}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={menu} onOpenChange={setMenu}>
        <DialogContent container={frame}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">This season</DialogTitle>
            <DialogDescription>
              {faction.name}. {hold.name} grows {hold.produces}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="h-11"
              onClick={() => {
                setMenu(false);
                setTab("realm");
                act(replayTutorial(state));
              }}
            >
              How to play
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => {
                setVoice((on) => {
                  const next = !on;
                  if (!next) window.speechSynthesis?.cancel();
                  return next;
                });
              }}
            >
              {voice ? "Silence the voices" : "Speak the scenes"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => {
                setMenu(false);
                onStepAway();
              }}
            >
              Step away, keep this save
            </Button>
            <Button
              type="button"
              variant="destructive"
              className="h-11"
              onClick={() => {
                setMenu(false);
                setConfirmAbandon(true);
              }}
            >
              Abandon the season
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAbandon} onOpenChange={setConfirmAbandon}>
        <DialogContent container={frame}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Abandon the season?</DialogTitle>
            <DialogDescription>The save on this device will be erased.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => setConfirmAbandon(false)}>
              Stay
            </Button>
            <Button type="button" variant="destructive" className="h-11" onClick={() => leave(onAbandon)}>
              Abandon
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={giftFor !== null} onOpenChange={(open) => !open && setGiftFor(null)}>
        <DialogContent container={frame}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Send a gift</DialogTitle>
            <DialogDescription>One unit, from your own stores, straight to their chest.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            {GOODS.filter((item) => state.player.stash[item] > 0).map((item) => (
              <Button
                key={item}
                type="button"
                variant="outline"
                className="h-11 justify-between"
                onClick={() => {
                  if (!giftFor) return;
                  act(gift(state, giftFor, item, 1));
                  setGiftFor(null);
                }}
              >
                <span className="flex items-center gap-2">
                  <GoodThumb good={item} className="size-6" />
                  {GOOD_LABEL[item]}
                </span>
                <span>{state.player.stash[item]}</span>
              </Button>
            ))}
            {GOODS.every((item) => state.player.stash[item] === 0) && (
              <p className="text-sm text-muted-foreground">Your stores are empty.</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={verdictOpen}
        onOpenChange={(open) => {
          if (!open && !leaving.current && state.outcome && !state.outcomeDismissed) act(dismissOutcome(state));
        }}
      >
        <DialogContent container={frame} className="max-h-[85%] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {state.outcome === "held" && "Wagons moved"}
              {state.outcome === "held-late" && "Late, but the wing turned"}
              {state.outcome === "lost" && `${WYRM_NAME} came down the road`}
            </DialogTitle>
            <DialogDescription>
              {state.outcome === "held" &&
                `The wagons moved, and ${WYRM_NAME} turned back. That was the first chapter. Your level, the hold, and the captains stay with you.`}
              {state.outcome === "held-late" && `The wagon drivers will remember the delay. The realm does not end here. Keep sealing dawns.`}
              {state.outcome === "lost" && `${WYRM_NAME} came down the road. The wagons were short. Winter on, raise the hold, and order the captains. The banner is still yours.`}
            </DialogDescription>
          </DialogHeader>
          {state.outcome === "lost" && (
            <p className="text-sm">
              Still short{" "}
              {LEVY_GOODS.filter((item) => state.compact.levy[item] < LEVY_TARGET[item])
                .map((item) => `${LEVY_TARGET[item] - state.compact.levy[item]} ${item}`)
                .join(", ")}
              .
            </p>
          )}
          <ul className="text-sm leading-relaxed">
            {state.compact.members.map((member) => (
              <li key={member.id}>
                {member.name} {member.inCompact ? "stayed" : "left"}.
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">
            Pledged {state.stats.pledged} · gifted {state.stats.gifted} · bought {state.stats.bought} · sold {state.stats.sold}
          </p>
          <DialogFooter>
            <Button type="button" className="h-11" onClick={() => act(dismissOutcome(state))}>
              {state.outcome === "lost" ? "Winter on" : "Keep the realm"}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => leave(onAbandon)}>
              New season
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {dawn && (
        <>
          <div className="wm-dawn" aria-hidden="true" />
          <p className="wm-stamp" aria-hidden="true">
            {dawn.title}
          </p>
        </>
      )}
      {fate && <FateRoll face={fate.face} won={fate.won} line={fate.line} />}
      <SkillDialog state={state} act={act} />
      {state.scene && <CutsceneView scene={state.scene} voice={voice} onAdvance={() => act(advanceScene(state))} />}
    </div>
  );
}

function CompactPanel({
  state,
  amount,
  onAmount,
  act,
  onGift,
  resolveQty,
}: {
  state: GameState;
  amount: Amount;
  onAmount: (amount: Amount) => void;
  act: (result: Result) => void;
  onGift: (id: string) => void;
  resolveQty: (available: number) => number;
}) {
  const [hallGood, setHallGood] = useState<GoodId>("grain");
  const drawRoom = FOUNDER_WITHDRAW_CAP - state.player.withdrawnToday;

  return (
    <div className="wm-tab flex flex-col gap-3">
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-coach="wagons-take">
        <p className="text-sm leading-relaxed">
          Leave enough in the shared stores for your sworn neighbors. Send the rest to the wagons. What the wagons take is gone.
        </p>
        <Button type="button" className="mt-3 h-11 w-full" onClick={() => act(pledgeRoadShare(state))}>
          Keep a share, send the rest
        </Button>
      </div>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">Reserve</p>
        <div className="mt-2 flex flex-col gap-2">
          {LEVY_GOODS.map((item) => (
            <div key={item} className="flex items-center justify-between gap-2">
              <span className="text-sm">{GOOD_LABEL[item]}</span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  className="size-11 rounded-full bg-secondary text-lg"
                  onClick={() => {
                    const next = Math.max(0, state.compact.reserve[item] - 1);
                    if (next !== state.compact.reserve[item]) act(setReserve(state, item, next));
                  }}
                  aria-label={`Lower ${item} reserve`}
                >
                  −
                </button>
                <span className="w-6 text-center font-display text-lg">{state.compact.reserve[item]}</span>
                <button
                  type="button"
                  className="size-11 rounded-full bg-secondary text-lg"
                  onClick={() => {
                    const next = Math.min(40, state.compact.reserve[item] + 1);
                    if (next !== state.compact.reserve[item]) act(setReserve(state, item, next));
                  }}
                  aria-label={`Raise ${item} reserve`}
                >
                  +
                </button>
              </span>
            </div>
          ))}
        </div>
      </div>
      <AmountPicker amount={amount} onChange={onAmount} />
      <p className="text-xs text-muted-foreground">
        Taken from the shared stores today: {state.player.withdrawnToday}/{FOUNDER_WITHDRAW_CAP}
      </p>
      <div className="flex flex-col gap-2" data-coach="stores">
        {GOODS.map((item) => (
          <div key={item} className={`rounded-2xl ring-1 ${hallGood === item ? "bg-accent ring-gold" : "bg-card ring-foreground/10"}`}>
            <button type="button" className="flex min-h-12 w-full items-center gap-3 px-3 text-left" aria-pressed={hallGood === item} onClick={() => setHallGood(item)}>
              <GoodThumb good={item} />
              <span className="flex-1 text-sm">Shared {GOOD_LABEL[item].toLowerCase()}</span>
              <span className="font-display text-xl">{state.compact.hall[item]}</span>
            </button>
            {hallGood === item && (
              <div className="flex flex-wrap gap-2 px-3 pb-3">
                {isLevy(item) && (
                  <Button
                    type="button"
                    className="h-11"
                    onClick={() => {
                      const qty = resolveQty(state.compact.hall[item]);
                      if (qty < 1) return;
                      act(pledgeFromHall(state, item, qty));
                    }}
                  >
                    To the wagons
                  </Button>
                )}
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11"
                  onClick={() => {
                    const qty = Math.min(resolveQty(state.compact.hall[item]), drawRoom);
                    if (qty < 1) {
                      act(withdraw(state, item, 1));
                      return;
                    }
                    act(withdraw(state, item, qty));
                  }}
                >
                  Take back
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        {state.compact.members.map((member) => {
          const home = holdById(member.holdId);
          return (
            <div key={member.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <div className="flex items-start gap-3">
                <Portrait holdId={member.holdId} className="size-12" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg leading-tight">{member.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {home.name} · {PERSONALITY_LABEL[member.personality]} · {contentWord(member.contentment, member.inCompact)}
                  </p>
                </div>
                {member.inCompact && (
                  <Button type="button" variant="outline" className="h-11" onClick={() => onGift(member.id)}>
                    Gift
                  </Button>
                )}
              </div>
              <OathRow state={state} memberId={member.id} act={act} />
              <CaptainOrders state={state} memberId={member.id} act={act} />
              <Progress value={member.contentment} className="mt-3 h-1.5" />
              <p className="mt-2 text-sm text-muted-foreground">{member.lastNote}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RoadPanel({ state, act }: { state: GameState; act: (result: Result) => void }) {
  const [giveGood, setGiveGood] = useState<GoodId>(holdById(state.player.holdId).produces);
  const [wantGood, setWantGood] = useState<GoodId>("iron");
  const [giveQty, setGiveQty] = useState(2);
  const [wantQty, setWantQty] = useState(2);
  const market = nextMarketDay(state.day);

  return (
    <div className="wm-tab flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{seasonNote(state.day)}</p>
      {state.caravan ? (
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10" data-coach="caravan">
          <div className="relative h-28">
            <img src="/art/caravan.jpg" alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
            <p className="absolute right-4 bottom-3 left-4 font-display text-2xl text-[#f4ead7]">The caravan</p>
          </div>
          <div className="p-4">
          <p className="text-sm text-muted-foreground">
            {visitKey(state.day + 1) !== null ? "It stays through tomorrow, then the road goes quiet." : "It leaves when you seal the day."}
          </p>
          {state.rumor && state.rumor.day === state.day && <p className="mt-2 text-sm leading-relaxed">{state.rumor.text}</p>}
          <ul className="mt-3 flex flex-col gap-3">
            {GOODS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <GoodThumb good={item} className="size-8" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{GOOD_LABEL[item]}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {state.caravan?.stock[item]} in the wagon · buy {buyPrice(state, item)}g · sell {sellPrice(state, item)}g
                    {state.rumor?.day === state.day && state.rumor.good === item ? " · rumor" : ""}
                  </span>
                </span>
                <Button type="button" variant="outline" className="h-11 px-3" onClick={() => act(buy(state, item, 1))}>
                  Buy
                </Button>
                <Button type="button" variant="secondary" className="h-11 px-3" onClick={() => act(sell(state, item, 1))}>
                  Sell
                </Button>
              </li>
            ))}
          </ul>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10" data-coach="caravan">
          <div className="relative h-28">
            <img src="/art/caravan.jpg" alt="" className="h-full w-full object-cover brightness-75" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 to-transparent" />
            <p className="absolute right-4 bottom-3 left-4 font-display text-2xl text-[#f4ead7]">The road is empty</p>
          </div>
          <div className="p-4">
          <p className="text-sm leading-relaxed">
            No caravan today.{market ? ` It returns on day ${market}.` : ""} Until then, trade with your neighbors.
          </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="font-display text-xl">Neighbor barter</p>
        {state.npcOffers.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No neighbor offered a trade this morning.</p>}
        <ul className="mt-3 flex flex-col gap-3">
          {state.npcOffers.map((offer) => (
            <li key={offer.id} className="rounded-xl bg-background p-3">
              <p className="text-sm leading-relaxed">
                {offer.fromName} offers {offer.give.qty} {offer.give.good} for {offer.want.qty} {offer.want.good}.
              </p>
              <Button type="button" className="mt-2 h-11" onClick={() => act(acceptOffer(state, offer.id))}>
                Make the trade
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="font-display text-xl">Your offer</p>
        {state.playerOffer ? (
          <>
            <p className="mt-2 text-sm">
              {state.playerOffer.give.qty} {state.playerOffer.give.good} for {state.playerOffer.want.qty} {state.playerOffer.want.good}. Neighbors look it over when you seal the day.
            </p>
            <Button type="button" variant="outline" className="mt-3 h-11" onClick={() => act(cancelOffer(state))}>
              Take it down
            </Button>
          </>
        ) : (
          <form
            className="mt-3 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              act(postOffer(state, { good: giveGood, qty: giveQty }, { good: wantGood, qty: wantQty }));
            }}
          >
            <div className="grid grid-cols-2 gap-2">
              <label className="flex flex-col gap-1 text-xs">
                You give
                <select className="h-11 rounded-lg border bg-background px-2 text-sm" value={giveGood} onChange={(event) => setGiveGood(event.target.value as GoodId)}>
                  {GOODS.map((item) => (
                    <option key={item} value={item}>
                      {GOOD_LABEL[item]}
                    </option>
                  ))}
                </select>
                <Input type="number" min={1} max={12} value={giveQty} onChange={(event) => setGiveQty(Number(event.target.value))} className="h-11 bg-background text-base" />
              </label>
              <label className="flex flex-col gap-1 text-xs">
                You want
                <select className="h-11 rounded-lg border bg-background px-2 text-sm" value={wantGood} onChange={(event) => setWantGood(event.target.value as GoodId)}>
                  {GOODS.map((item) => (
                    <option key={item} value={item}>
                      {GOOD_LABEL[item]}
                    </option>
                  ))}
                </select>
                <Input type="number" min={1} max={12} value={wantQty} onChange={(event) => setWantQty(Number(event.target.value))} className="h-11 bg-background text-base" />
              </label>
            </div>
            <Button type="submit" className="h-11">
              Post the offer
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

function AmountPicker({ amount, onChange }: { amount: Amount; onChange: (amount: Amount) => void }) {
  const options: Amount[] = [1, 5, "all"];
  return (
    <div className="flex gap-2">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={amount === option}
          onClick={() => onChange(option)}
          className={`min-h-11 flex-1 rounded-full text-sm ring-1 ${amount === option ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border"}`}
        >
          {option === "all" ? "All" : option}
        </button>
      ))}
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
  tone = "day",
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  tone?: "day" | "night";
}) {
  const face = tone === "night" ? "bg-black/40 text-[#f4ead7] ring-white/30" : "bg-card ring-border";
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`flex size-10 items-center justify-center rounded-full ring-1 ${face}`}>
      {children}
    </button>
  );
}

function isLevy(good: GoodId): good is LevyGood {
  return good === "grain" || good === "iron" || good === "salt";
}

function nextMarketDay(day: number): number | null {
  for (let offset = 1; offset <= 4; offset += 1) {
    if (visitKey(day + offset) !== null) return day + offset;
  }
  return null;
}
