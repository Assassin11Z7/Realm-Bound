"use client";

import { BookOpen, CircleHelp, Ellipsis, House, Map, Route, Users } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
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
  releaseExpedition,
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
import { allianceBoard, expeditionDue, wagonsOpen } from "@/lib/game/expedition";
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
import { CrossingDialog, MarksCard, PeoplePanel, PetitionCard } from "./Rule";
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

const SECTIONS: Record<Tab, { id: string; label: string }[]> = {
  realm: [
    { id: "map", label: "Map" },
    { id: "bonds", label: "Bonds" },
    { id: "decrees", label: "Decrees" },
    { id: "status", label: "Status" },
  ],
  hold: [
    { id: "people", label: "People" },
    { id: "loyalty", label: "Loyalty" },
    { id: "laws", label: "Laws" },
    { id: "works", label: "Works" },
    { id: "craft", label: "Craft" },
  ],
  compact: [
    { id: "oaths", label: "Oaths" },
    { id: "trade", label: "Trade" },
    { id: "orders", label: "Orders" },
    { id: "alliance", label: "Seats" },
  ],
  road: [
    { id: "explore", label: "Explore" },
    { id: "bag", label: "Bag" },
    { id: "gear", label: "Gear" },
    { id: "loot", label: "Loot" },
  ],
};

const INTRO: Record<string, { eyebrow: string; title: string; lede: string }> = {
  map: {
    eyebrow: "Realm",
    title: "The valley",
    lede: "Tap a hold to read it. Walking there is on the Road tab.",
  },
  bonds: {
    eyebrow: "Realm",
    title: "Bonds",
    lede: "Choices you already made. They keep working after the visitor leaves.",
  },
  decrees: {
    eyebrow: "Realm",
    title: "Decrees",
    lede: "Work that belongs to the realm. A law for one hold is sworn under Hold.",
  },
  status: {
    eyebrow: "Realm",
    title: "This morning",
    lede: "The wagons, the dragon, and the strength of your banner.",
  },
  people: {
    eyebrow: "Hold",
    title: "Your people",
    lede: "Grain feeds them. Timber feeds the fires. Leave them be, and nothing leaves your own stores.",
  },
  loyalty: {
    eyebrow: "Hold",
    title: "Loyalty and influence",
    lede: "Mood is how your people stand with you. Renown is how far your name travels.",
  },
  laws: {
    eyebrow: "Hold",
    title: "Laws",
    lede: "A law stands until you replace it.",
  },
  works: {
    eyebrow: "Hold",
    title: "Works",
    lede: "Mills, shrines, and the buildings that finish when you seal the day.",
  },
  craft: {
    eyebrow: "Hold",
    title: "Benches",
    lede: "Forge, brew house, and loom. A bench works only after you have raised it.",
  },
  oaths: {
    eyebrow: "Neighbors",
    title: "Oathbound",
    lede: "Sworn neighbors. A gift and a kept oath hold them to the compact.",
  },
  trade: {
    eyebrow: "Neighbors",
    title: "Trade",
    lede: "The shared stores feed the compact. What the wagons take is gone.",
  },
  orders: {
    eyebrow: "Neighbors",
    title: "Captain orders",
    lede: "Each order resolves when you seal the day.",
  },
  alliance: {
    eyebrow: "Neighbors",
    title: "Seats",
    lede: "Your chair, the oathbound, and two marches waiting for other players. No one else is on this road yet.",
  },
  explore: {
    eyebrow: "Road",
    title: "The road",
    lede: "Walk the valley. The caravan, when it comes, trades here.",
  },
  bag: {
    eyebrow: "Road",
    title: "Your bag",
    lede: "What you carry. Send it to the shared stores, or, if the wagons take it, to the road.",
  },
  gear: {
    eyebrow: "Road",
    title: "Gear",
    lede: "What you wear, set beside the best piece still in the pack.",
  },
  loot: {
    eyebrow: "Road",
    title: "Found loot",
    lede: "Treasures from the road, the strongroom, and drinks you have not used.",
  },
};

const COACH_PLACE: Partial<Record<string, { tab: Tab; section: string }>> = {
  wagons: { tab: "realm", section: "status" },
  anger: { tab: "realm", section: "status" },
  creatures: { tab: "realm", section: "bonds" },
  people: { tab: "hold", section: "people" },
  stores: { tab: "compact", section: "trade" },
  "wagons-take": { tab: "compact", section: "trade" },
  caravan: { tab: "road", section: "explore" },
};

function initialSections(step: string | null | undefined): Record<Tab, string> {
  return {
    realm: step === "wagons" || step === "anger" ? "status" : step === "creatures" ? "bonds" : "map",
    hold: "people",
    compact: step === "neighbors" || step === "wagons-take" ? "trade" : "oaths",
    road: "explore",
  };
}

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
  const screenRef = useRef<HTMLDivElement>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const sealing = useRef(false);
  const leaving = useRef(false);
  const [tab, setTab] = useState<Tab>("realm");
  const [sections, setSections] = useState<Record<Tab, string>>(() => initialSections(state.tutorial?.step));
  const [amount, setAmount] = useState<Amount>(1);
  const [holdId, setHoldId] = useState<HoldId>(state.player.holdId);
  const [toast, setToast] = useState<{ tone: "good" | "bad"; text: string } | null>(null);
  const [help, setHelp] = useState(false);
  const [chronicle, setChronicle] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const [giftFor, setGiftFor] = useState<string | null>(null);
  const [dawn, setDawn] = useState<{ day: number; title: string } | null>(null);
  const [fate, setFate] = useState<{ face: number; won: boolean; line: string } | null>(null);
  const [voice, setVoice] = useState(true);
  const section = sections[tab];

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  const lesson = state.tutorial?.step ?? null;
  const coach = lesson && !state.scene ? COACH[lesson] : null;
  const place = coach ? COACH_PLACE[coach.target] : null;
  const placeReady = !place || (tab === place.tab && section === place.section);
  const coachReady = Boolean(coach && placeReady && (!coach.needsTab || tab === coach.tab));
  const coachTarget = coach ? (coachReady ? coach.target : `tab-${place?.tab ?? coach.tab}`) : null;

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [tab, section]);

  useEffect(() => {
    const root = screenRef.current ?? document.body;
    root.querySelectorAll(".wm-coach-hot").forEach((node) => node.classList.remove("wm-coach-hot"));
    if (!coachTarget || state.scene) return;
    const el = root.querySelector(`[data-coach="${coachTarget}"]`);
    if (!(el instanceof HTMLElement)) return;
    el.classList.add("wm-coach-hot");
    if (mainRef.current?.contains(el)) el.scrollIntoView({ block: "center", inline: "nearest" });
    return () => el.classList.remove("wm-coach-hot");
  }, [coachTarget, tab, section, state.scene, state.day]);

  function go(nextTab: Tab, nextSection?: string) {
    setTab(nextTab);
    if (nextSection) setSections((prev) => ({ ...prev, [nextTab]: nextSection }));
  }

  function onCoach() {
    if (!coach) return;
    if (!coachReady) {
      go(place?.tab ?? coach.tab, place?.section);
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
      title: result.state.omen?.creature ?? result.state.crossing?.creature ?? result.state.petition?.title ?? `Day ${result.state.day}`,
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
  const intro = INTRO[section] ?? INTRO.map;
  const verdictOpen = Boolean(state.outcome && !state.outcomeDismissed);

  return (
    <div ref={screenRef} className="relative flex min-h-0 flex-1 flex-col">
      <header className="relative shrink-0 text-[#f4ead7]">
        <img src={`/art/hold-${hold.id}.jpg`} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#1c1612]/55 via-[#1c1612]/62 to-[#1c1612]" />
        <div className="relative flex items-center gap-3 px-4 py-3">
          <BannerMark banner={state.player.banner} className="h-11 w-9 shrink-0" title={`${state.player.title} ${state.player.name}'s banner`} />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg leading-tight">{state.compact.name}</h1>
            <p className="mt-1 truncate text-xs text-[#f4ead7]/75">
              Day {state.day} · {seasonLabel(state.day)} · {chapterName(state.campaign?.chapter ?? 1)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1.5">
            <p className="font-display text-xl leading-none text-[#e6c56e]">{state.player.gold}g</p>
            <div className="flex gap-1.5">
              <IconButton label="Chronicle" onClick={() => setChronicle(true)} tone="night">
                <BookOpen className="size-4" />
              </IconButton>
              <IconButton label="How a season works" onClick={() => setHelp(true)} tone="night">
                <CircleHelp className="size-4" />
              </IconButton>
              <IconButton label="Season menu" onClick={() => setMenu(true)} tone="night">
                <Ellipsis className="size-4" />
              </IconButton>
            </div>
          </div>
        </div>
      </header>

      <div role="tablist" aria-label={`${TABS.find((item) => item.id === tab)?.label} sections`} className="flex shrink-0 gap-1.5 overflow-x-auto border-b border-border/80 bg-[#fbf6ec] px-4 py-2.5 [scrollbar-width:thin]">
        {SECTIONS[tab].map((item) => {
          const active = section === item.id;
          const alert = sectionAlert(state, tab, item.id);
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSections((prev) => ({ ...prev, [tab]: item.id }))}
              className={`relative shrink-0 rounded-full px-3 py-1.5 text-xs tracking-wide ${active ? "bg-[#1c1612] text-[#f4ead7]" : "text-muted-foreground ring-1 ring-border"}`}
            >
              {item.label}
              {alert && !active && <span className="absolute -top-0.5 -right-0.5 size-2 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>

      <div className="relative min-h-0 flex-1">
        <div ref={mainRef} role="tabpanel" aria-label={intro.title} className="wm-scroll h-full overflow-y-auto overscroll-y-contain px-4 py-4">
          <div key={`${tab}-${section}`} className="wm-tab flex flex-col gap-4 pb-8">
            <header>
              <p className="text-[11px] tracking-[0.18em] text-[#8d6b2e] uppercase">{intro.eyebrow}</p>
              <h2 className="mt-1 font-display text-[1.7rem] leading-none">{intro.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{section === "explore" ? seasonNote(state.day) : intro.lede}</p>
            </header>
            {tab === "realm" && section === "map" && (
              <>
                <RealmMap state={state} selected={holdId} onSelect={setHoldId} />
                <HoldBrief state={state} holdId={holdId} />
              </>
            )}
            {tab === "realm" && section === "bonds" && <MarksCard state={state} />}
            {tab === "realm" && section === "decrees" && (
              <>
                <PetitionCard state={state} act={act} />
                <ThreatCard state={state} act={act} />
                <MissionList state={state} act={act} />
                {!state.petition && !state.campaign?.threat && !openDecree(state) && (
                  <p className="rounded-2xl bg-card p-4 text-sm leading-relaxed text-muted-foreground ring-1 ring-foreground/10">
                    No decree is waiting. The long work appears as the realm grows. Laws for a single hold are under Hold.
                  </p>
                )}
              </>
            )}
            {tab === "realm" && section === "status" && (
              <StatusPanel state={state} onChronicle={() => setChronicle(true)} act={act} />
            )}
            {tab === "hold" && section === "people" && (
              <>
                <HoldYield state={state} act={act} />
                <PeoplePanel state={state} act={act} focus="people" />
              </>
            )}
            {tab === "hold" && section === "loyalty" && <LoyaltyPanel state={state} />}
            {tab === "hold" && section === "laws" && <PeoplePanel state={state} act={act} focus="laws" />}
            {tab === "hold" && section === "works" && (
              <>
                <WorksCard state={state} act={act} />
                <HoldWorks state={state} act={act} />
              </>
            )}
            {tab === "hold" && section === "craft" && <CraftBench state={state} act={act} />}
            {tab === "compact" && section === "oaths" && <OathPanel state={state} act={act} onGift={setGiftFor} />}
            {tab === "compact" && section === "trade" && (
              <TradePanel state={state} amount={amount} onAmount={setAmount} act={act} resolveQty={resolveQty} />
            )}
            {tab === "compact" && section === "orders" && <OrdersPanel state={state} act={act} />}
            {tab === "compact" && section === "alliance" && <AlliancePanel state={state} />}
            {tab === "road" && section === "explore" && (
              <>
                <RoadMarket state={state} act={act} />
                <ExplorePanel state={state} holdId={holdId} act={act} part="explore" />
              </>
            )}
            {tab === "road" && section === "bag" && (
              <BagPanel state={state} amount={amount} onAmount={setAmount} act={act} resolveQty={resolveQty} move={move} />
            )}
            {tab === "road" && section === "gear" && <ExplorePanel state={state} holdId={holdId} act={act} part="gear" />}
            {tab === "road" && section === "loot" && <ExplorePanel state={state} holdId={holdId} act={act} part="loot" />}
          </div>
        </div>
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#f3eadb] to-transparent" />
      </div>

      <div aria-live="polite" className="pointer-events-none absolute inset-x-4 top-16 z-30">
        {toast && (
          <p key={toast.text} className={`wm-toast pointer-events-auto rounded-xl px-3 py-2 text-sm leading-snug shadow-lg ${toast.tone === "bad" ? "bg-primary text-primary-foreground" : "bg-moss text-[#f3eadb]"}`}>
            {toast.text}
          </p>
        )}
      </div>

      {coach && (
        <div className="wm-rise shrink-0 px-4 pt-2" data-coach="lesson">
          <div className="rounded-2xl bg-[#1c1612] p-3 text-[#f4ead7] ring-2 ring-[#e6c56e]">
            <p className="text-sm leading-snug">{coach.text}</p>
            <Button type="button" className="mt-2 h-11 w-full" onClick={onCoach}>
              {coachReady ? "Got it" : "Show me"}
            </Button>
          </div>
        </div>
      )}
      {!coach && !state.scene && (
        <p className="line-clamp-2 shrink-0 px-4 pt-2 text-xs leading-snug text-muted-foreground" data-coach="what-now">
          <span className="font-medium text-foreground">What now. </span>
          {whatNow(state)}
        </p>
      )}
      <div className="shrink-0 px-4 pt-2">
        <Button type="button" data-coach="seal" className="h-12 w-full text-base" onClick={onSeal}>
          {wagonsOpen(state) && state.day === expeditionDue(state) ? "Seal the expedition's last dawn" : "Seal the day"}
        </Button>
      </div>
      <nav className="mt-2 grid shrink-0 grid-cols-4 border-t border-border pb-[max(0.25rem,env(safe-area-inset-bottom))]">
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
            <DialogTitle className="font-display text-2xl">How the realm works</DialogTitle>
            <DialogDescription>The wagons come and go. The valley stays.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
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
            <DialogDescription>What the realm has already done.</DialogDescription>
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
            <DialogTitle className="font-display text-2xl">This realm</DialogTitle>
            <DialogDescription>
              {faction.name}. {hold.name} grows {hold.produces}. {state.player.title} {state.player.name}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              className="h-11"
              onClick={() => {
                setMenu(false);
                go("realm", "status");
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
              Abandon the realm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={confirmAbandon} onOpenChange={setConfirmAbandon}>
        <DialogContent container={frame}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Abandon the realm?</DialogTitle>
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
              {state.outcome === "held" && "The expedition is home"}
              {state.outcome === "held-late" && "Late, but the wagons turned"}
              {state.outcome === "lost" && `${WYRM_NAME} came down the road`}
            </DialogTitle>
            <DialogDescription>
              {state.outcome === "held" &&
                `The wagons are full, and a relic from the call is in your pack. They leave when you keep the realm. The hold, the oaths, and the seats stay.`}
              {state.outcome === "held-late" &&
                `The drivers will remember the delay. The spoil is still yours. The wagons leave, and the realm continues.`}
              {state.outcome === "lost" &&
                `${WYRM_NAME} came down the road. Let this call go and take a lesser spoil, or keep filling for a few dawns. Either way the banner is still yours.`}
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
            <Button type="button" className="h-11" onClick={() => act(state.outcome === "lost" ? releaseExpedition(state) : dismissOutcome(state))}>
              {state.outcome === "lost" ? "Let the wagons go" : "Keep the realm"}
            </Button>
            {state.outcome === "lost" && (
              <Button type="button" variant="outline" className="h-11" onClick={() => act(dismissOutcome(state))}>
                Fill them late
              </Button>
            )}
            <Button type="button" variant="outline" className="h-11" onClick={() => leave(onAbandon)}>
              New realm
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

function sectionAlert(state: GameState, tab: Tab, id: string): boolean {
  if (tab === "realm" && id === "decrees") return Boolean(state.petition || state.campaign?.threat || openDecree(state));
  if (tab === "realm" && id === "status") {
    const called = wagonsOpen(state);
    const full = LEVY_GOODS.every((good) => state.compact.levy[good] >= LEVY_TARGET[good]);
    return (called && !full) || (state.wyrm?.ire ?? 0) >= 60;
  }
  if (tab === "compact" && id === "alliance") {
    return state.compact.members.some((member) => !member.inCompact) || (state.politics?.conflictHeat ?? 0) >= 40;
  }
  if (tab === "hold" && id === "people") return peopleTrouble(state);
  if (tab === "compact" && id === "oaths") return state.compact.members.some((member) => !member.inCompact || member.contentment < 25);
  if (tab === "compact" && id === "trade") return state.npcOffers.length > 0;
  if (tab === "road" && id === "explore") return Boolean(state.caravan);
  if (tab === "road" && id === "loot") return (state.quests ?? []).some((quest) => quest.status === "ready");
  return false;
}

function openDecree(state: GameState): boolean {
  const camp = state.campaign;
  if (!camp) return false;
  return camp.missions.some((mission) => mission.chapter <= camp.chapter && mission.status === "ready");
}

function StatusPanel({
  state,
  act,
  onChronicle,
}: {
  state: GameState;
  act: (result: Result) => void;
  onChronicle: () => void;
}) {
  const home = state.settlements?.find((item) => item.holdId === state.player.holdId);
  const level = state.campaign?.level ?? 1;
  const called = wagonsOpen(state);
  const due = expeditionDue(state);
  const verdict = state.expedition?.lastVerdict;
  return (
    <>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-coach="wagons">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-xl">{called ? "Wagon expedition" : "Wagons off the road"}</p>
          <p className="text-xs tracking-wide text-[#8d6b2e] uppercase">
            {called ? dawnsLeftLabel(state.day, due) : `Day ${state.expedition?.nextCallDay ?? "—"}`}
          </p>
        </div>
        {called ? (
          <>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Call {state.expedition?.cycle ?? 1}. Grain, iron, and salt by day {due}. Then the wagons leave and the realm stays.
            </p>
            <div className="mt-3 flex flex-col gap-3">
              {LEVY_GOODS.map((item) => {
                const have = state.compact.levy[item];
                const target = LEVY_TARGET[item];
                return (
                  <div key={item}>
                    <div className="flex justify-between text-sm">
                      <span>{GOOD_LABEL[item]}</span>
                      <span>
                        {have}/{target}
                      </span>
                    </div>
                    <Progress value={Math.min(100, (have / target) * 100)} className="mt-1 h-1.5" />
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            The last call {verdict === "held" || verdict === "held-late" ? "was met" : verdict === "lost" ? "was lost" : "has gone"}. The wagons return on day{" "}
            {state.expedition?.nextCallDay ?? "—"}. Until then, grow the hold and keep the oaths.
          </p>
        )}
      </div>
      <div data-coach="anger">
        <WyrmCard state={state} act={act} />
      </div>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-[11px] tracking-[0.16em] text-[#8d6b2e] uppercase">Banner</p>
        <p className="mt-1 font-display text-2xl leading-none">
          Level {level} · {powerOf(state)} power
        </p>
        <Progress value={Math.min(100, ((state.campaign?.xp ?? 0) / xpNeed(level)) * 100)} className="mt-3 h-1.5" />
        <p className="mt-3 text-sm text-muted-foreground">
          {renownTitle(state.player.renown)} · fame {state.player.renown}
          {home ? ` · ${home.souls} people, mood ${home.mood}` : ""}
        </p>
      </div>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex items-baseline justify-between gap-2">
          <p className="font-display text-xl">Chronicle</p>
          <button type="button" className="text-xs text-[#8d6b2e] underline-offset-2 hover:underline" onClick={onChronicle}>
            Open all
          </button>
        </div>
        <ul className="mt-3 flex flex-col gap-3 text-sm leading-relaxed">
          {[...state.chronicle].slice(-2).reverse().map((entry) => (
            <li key={entry.id}>{entry.text}</li>
          ))}
        </ul>
      </div>
    </>
  );
}

function HoldYield({ state, act }: { state: GameState; act: (result: Result) => void }) {
  const hold = holdById(state.player.holdId);
  const faction = factionById(state.player.factionId);
  const cap = state.player.undercroft ? UNDERCROFT_CAP : BASE_CAP;
  return (
    <div className="overflow-hidden rounded-2xl bg-card ring-1 ring-foreground/10">
      <div className="relative h-28">
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
          Cellar {stashCount(state.player.stash)}/{cap}. The bag itself is on the Road tab.
          {state.day > 12 ? " Deep winter has thinned the yield." : ""}
        </p>
        {!state.player.undercroft && (
          <Button type="button" variant="outline" className="mt-3 h-11" onClick={() => act(raiseUndercroft(state))}>
            Raise the cellar · {UNDERCROFT_COST}g
          </Button>
        )}
      </div>
    </div>
  );
}

function LoyaltyPanel({ state }: { state: GameState }) {
  const home = state.settlements?.find((item) => item.holdId === state.player.holdId);
  return (
    <>
      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-[11px] tracking-[0.16em] text-[#8d6b2e] uppercase">Loyalty</p>
        <p className="mt-1 font-display text-4xl leading-none">{home?.mood ?? "—"}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Your hold&apos;s mood. It thins when food or firewood runs out. Feed them under People.
        </p>
        <Progress value={home?.mood ?? 0} className="mt-3 h-2" />
      </section>
      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-[11px] tracking-[0.16em] text-[#8d6b2e] uppercase">Influence</p>
        <p className="mt-1 font-display text-4xl leading-none">{state.player.renown}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {renownTitle(state.player.renown)}. Pledges, gifts, and answered roads raise your name.
        </p>
      </section>
      <section className="flex flex-col gap-3">
        <p className="text-[11px] tracking-[0.16em] text-[#8d6b2e] uppercase">How the oathbound stand</p>
        {state.compact.members.map((member) => (
          <div key={member.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-display text-lg leading-tight">{member.name}</p>
              <p className="text-sm">{contentWord(member.contentment, member.inCompact)}</p>
            </div>
            <Progress value={member.contentment} className="mt-2 h-1.5" />
          </div>
        ))}
      </section>
    </>
  );
}

function AlliancePanel({ state }: { state: GameState }) {
  const board = allianceBoard(state);
  const roleLabel = {
    founder: "Founder",
    oathbound: "Oathbound",
    "awaiting-player": "Waiting for a player",
  } as const;
  return (
    <>
      <section className="flex flex-col gap-3">
        {board.seats.map((seat) => (
          <article key={seat.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <p className="text-[11px] tracking-[0.16em] text-[#8d6b2e] uppercase">{roleLabel[seat.role]}</p>
            <p className="mt-1 font-display text-xl leading-tight">{seat.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{seat.note}</p>
          </article>
        ))}
      </section>
      <section className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="font-display text-xl">Shared goals</p>
        <ul className="mt-3 flex flex-col gap-4">
          {board.goals.map((goal) => (
            <li key={goal.id}>
              <div className="flex items-baseline justify-between gap-2 text-sm">
                <span className="font-medium">{goal.title}</span>
                <span>
                  {goal.progress}/{goal.need}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{goal.detail}</p>
              <Progress value={Math.min(100, (goal.progress / goal.need) * 100)} className="mt-2 h-1.5" />
            </li>
          ))}
        </ul>
      </section>
      <section className="rounded-2xl bg-[#1c1612] p-4 text-[#f4ead7] ring-1 ring-[#e6c56e]/30">
        <p className="text-[11px] tracking-[0.16em] text-[#e6c56e] uppercase">Conflict</p>
        <p className="mt-1 font-display text-2xl leading-tight">{board.conflict.title}</p>
        <p className="mt-2 text-sm leading-relaxed text-[#f4ead7]/80">{board.conflict.detail}</p>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span>Heat</span>
          <span>{board.conflict.heat}</span>
        </div>
        <Progress value={board.conflict.heat} className="mt-1 h-1.5 bg-white/15" />
      </section>
    </>
  );
}

function OathPanel({
  state,
  act,
  onGift,
}: {
  state: GameState;
  act: (result: Result) => void;
  onGift: (id: string) => void;
}) {
  return (
    <>
      {state.compact.members.map((member) => {
        const home = holdById(member.holdId);
        return (
          <div key={member.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
            <div className="flex items-start gap-3">
              <Portrait holdId={member.holdId} className="size-12" />
              <div className="min-w-0 flex-1">
                <p className="font-display text-xl leading-tight">{member.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
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
            <Progress value={member.contentment} className="mt-3 h-1.5" />
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{member.lastNote}</p>
          </div>
        );
      })}
    </>
  );
}

function OrdersPanel({ state, act }: { state: GameState; act: (result: Result) => void }) {
  const sworn = state.compact.members.filter((member) => member.inCompact);
  if (sworn.length === 0) {
    return <p className="text-sm leading-relaxed text-muted-foreground">No captain still answers. The oaths have gone quiet.</p>;
  }
  return (
    <>
      {sworn.map((member) => (
        <div key={member.id} className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-display text-xl leading-tight">{member.name}</p>
          <p className="mt-1 text-xs text-muted-foreground">{holdById(member.holdId).name}</p>
          <CaptainOrders state={state} memberId={member.id} act={act} />
        </div>
      ))}
    </>
  );
}

function TradePanel({
  state,
  amount,
  onAmount,
  act,
  resolveQty,
}: {
  state: GameState;
  amount: Amount;
  onAmount: (amount: Amount) => void;
  act: (result: Result) => void;
  resolveQty: (available: number) => number;
}) {
  const [hallGood, setHallGood] = useState<GoodId>("grain");
  const [giveGood, setGiveGood] = useState<GoodId>(holdById(state.player.holdId).produces);
  const [wantGood, setWantGood] = useState<GoodId>("iron");
  const [giveQty, setGiveQty] = useState(2);
  const [wantQty, setWantQty] = useState(2);
  const drawRoom = FOUNDER_WITHDRAW_CAP - state.player.withdrawnToday;

  return (
    <>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10" data-coach="wagons-take">
        <p className="text-sm leading-relaxed">Leave enough in the shared stores for your sworn neighbors. Send the rest to the wagons.</p>
        <Button type="button" className="mt-3 h-11 w-full" onClick={() => act(pledgeRoadShare(state))}>
          Keep a share, send the rest
        </Button>
        {state.player.factionId === "canticle" && (
          <Button type="button" variant="outline" className="mt-2 h-11 w-full" onClick={() => act(offerRelic(state))}>
            Offer a relic to the saints
          </Button>
        )}
      </div>
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-[11px] tracking-[0.16em] text-muted-foreground uppercase">Reserve</p>
        <div className="mt-3 flex flex-col gap-3">
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
            <p className="mt-2 text-sm leading-relaxed">
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
    </>
  );
}

function BagPanel({
  state,
  amount,
  onAmount,
  act,
  resolveQty,
  move,
}: {
  state: GameState;
  amount: Amount;
  onAmount: (amount: Amount) => void;
  act: (result: Result) => void;
  resolveQty: (available: number) => number;
  move: (qty: number, run: (qty: number) => void) => void;
}) {
  const [good, setGood] = useState<GoodId>(holdById(state.player.holdId).produces);
  const cap = state.player.undercroft ? UNDERCROFT_CAP : BASE_CAP;
  return (
    <>
      <p className="text-xs text-muted-foreground">
        Cellar {stashCount(state.player.stash)}/{cap}
      </p>
      <AmountPicker amount={amount} onChange={onAmount} />
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
                  <p className="self-center text-xs text-muted-foreground">The wagons do not take {GOOD_LABEL[item].toLowerCase()}.</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function RoadMarket({ state, act }: { state: GameState; act: (result: Result) => void }) {
  const market = nextMarketDay(state.day);
  if (state.caravan) {
    return (
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
    );
  }
  return (
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
  children: ReactNode;
  label: string;
  onClick: () => void;
  tone?: "day" | "night";
}) {
  const face = tone === "night" ? "bg-black/40 text-[#f4ead7] ring-white/30" : "bg-card ring-border";
  return (
    <button type="button" aria-label={label} onClick={onClick} className={`flex size-9 items-center justify-center rounded-full ring-1 ${face}`}>
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
