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
  deposit,
  dismissOutcome,
  gift,
  offerRelic,
  playerYieldQty,
  pledgeFromHall,
  pledgePersonal,
  pledgeRoadShare,
  postOffer,
  raiseUndercroft,
  sealDay,
  sell,
  sellPrice,
  setReserve,
  visitKey,
  withdraw,
} from "@/lib/game/engine";
import type { GameState, GoodId, HoldId, LevyGood, Result } from "@/lib/game/types";
import { GOODS, LEVY_GOODS } from "@/lib/game/types";
import { useFrame } from "./frame";
import { BannerMark, GoodIcon } from "./marks";
import { HoldBrief, RealmMap } from "./RealmMap";

type Tab = "realm" | "hold" | "compact" | "road";
type Amount = 1 | 5 | "all";

const TABS: { id: Tab; label: string; icon: typeof Map }[] = [
  { id: "realm", label: "Realm", icon: Map },
  { id: "hold", label: "Hold", icon: House },
  { id: "compact", label: "Compact", icon: Users },
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

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [tab]);

  function act(result: Result) {
    if (result.error) {
      setToast({ tone: "bad", text: result.error });
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
    sealing.current = true;
    navigator.vibrate?.(12);
    act(sealDay(state));
    window.setTimeout(() => {
      sealing.current = false;
    }, 450);
  }

  const trouble = state.compact.members.some((member) => !member.inCompact || member.contentment < 25);
  const faction = factionById(state.player.factionId);
  const hold = holdById(state.player.holdId);
  const cap = state.player.undercroft ? UNDERCROFT_CAP : BASE_CAP;
  const verdictOpen = Boolean(state.outcome && !state.outcomeDismissed);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="px-4 pt-3">
        <div className="flex items-center gap-3">
          <BannerMark banner={state.player.banner} className="h-12 w-10 shrink-0" title={`${state.player.title} ${state.player.name}'s banner`} />
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-xl leading-none">{state.compact.name}</h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Day {state.day} · {seasonLabel(state.day)} · {renownTitle(state.player.renown)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-xl leading-none text-gold">{state.player.gold}g</p>
            <p className="mt-1 text-[11px] text-muted-foreground">{state.player.renown} renown</p>
          </div>
        </div>
        <div className="mt-2 flex gap-2">
          <IconButton label="Chronicle" onClick={() => setChronicle(true)}>
            <BookOpen className="size-4" />
          </IconButton>
          <IconButton label="How a season works" onClick={() => setHelp(true)}>
            <CircleHelp className="size-4" />
          </IconButton>
          <IconButton label="Season menu" onClick={() => setMenu(true)}>
            <Ellipsis className="size-4" />
          </IconButton>
          <p className="ml-auto self-center truncate text-xs text-muted-foreground">
            {state.player.title} {state.player.name}
          </p>
        </div>
        <button type="button" className="mt-3 grid w-full grid-cols-3 gap-2 text-left" onClick={() => setTab("compact")}>
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
                <Progress value={Math.min(100, (have / target) * 100)} className="mt-1 h-1.5" />
              </span>
            );
          })}
        </button>
      </header>

      <div aria-live="polite" className="px-4">
        {toast && (
          <p className={`mt-2 rounded-xl px-3 py-2 text-sm leading-snug ${toast.tone === "bad" ? "bg-primary text-primary-foreground" : "bg-moss text-[#f3eadb]"}`}>
            {toast.text}
          </p>
        )}
      </div>

      <div ref={mainRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
        {tab === "realm" && (
          <div className="flex flex-col gap-3">
            <RealmMap state={state} selected={holdId} onSelect={setHoldId} />
            <HoldBrief state={state} holdId={holdId} />
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
          <div className="flex flex-col gap-3">
            <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="font-display text-2xl">{hold.name}</p>
              <p className="mt-1 text-sm leading-relaxed">
                Sealing the day brings {playerYieldQty(state.player.factionId, state.player.holdId, state.day)} {hold.produces}. {faction.bonus}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Undercroft {stashCount(state.player.stash)}/{cap}
                {state.day > 12 ? " · Deep winter has thinned the yield." : ""}
              </p>
              {!state.player.undercroft && (
                <Button type="button" variant="outline" className="mt-3 h-11" onClick={() => act(raiseUndercroft(state))}>
                  Raise the undercroft · {UNDERCROFT_COST}g
                </Button>
              )}
            </div>
            <AmountPicker amount={amount} onChange={setAmount} />
            <div className="flex flex-col gap-2">
              {GOODS.map((item) => (
                <div key={item} className={`rounded-2xl ring-1 ${good === item ? "bg-accent ring-gold" : "bg-card ring-foreground/10"}`}>
                  <button type="button" className="flex min-h-12 w-full items-center gap-3 px-3 text-left" onClick={() => setGood(item)} aria-pressed={good === item}>
                    <GoodIcon good={item} />
                    <span className="flex-1 text-sm">{GOOD_LABEL[item]}</span>
                    <span className="font-display text-xl">{state.player.stash[item]}</span>
                  </button>
                  {good === item && (
                    <div className="flex flex-wrap gap-2 px-3 pb-3">
                      <Button type="button" variant="secondary" className="h-11" onClick={() => move(resolveQty(state.player.stash[item]), (qty) => act(deposit(state, item, qty)))}>
                        To the hall
                      </Button>
                      {isLevy(item) ? (
                        <Button type="button" className="h-11" onClick={() => move(resolveQty(state.player.stash[item]), (qty) => act(pledgePersonal(state, item, qty)))}>
                          To the levy
                        </Button>
                      ) : (
                        <p className="self-center text-xs text-muted-foreground">The road does not take {item}. Sell it, or gift it.</p>
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

      <div className="px-4 pt-1">
        <Button type="button" className="h-12 w-full text-base" onClick={onSeal}>
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
              aria-current={active ? "page" : undefined}
              onClick={() => setTab(item.id)}
              className={`relative flex min-h-14 flex-col items-center justify-center gap-1 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="size-5" />
              {item.label}
              {item.id === "compact" && trouble && <span className="absolute top-2 right-[30%] size-2 rounded-full bg-primary" />}
              {item.id === "road" && state.caravan && <span className="absolute top-2 right-[30%] size-2 rounded-full bg-gold" />}
            </button>
          );
        })}
      </nav>

      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent container={frame} className="max-h-[80%] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">How a season works</DialogTitle>
            <DialogDescription>Four rules. The rest is judgment.</DialogDescription>
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
              variant="outline"
              className="h-11"
              onClick={() => {
                setMenu(false);
                onStepAway();
              }}
            >
              Step away, keep the charter
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
            <DialogDescription>The charter on this device will be erased.</DialogDescription>
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
                  <GoodIcon good={item} className="size-5" />
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
              {state.outcome === "held" && "The road will hold"}
              {state.outcome === "held-late" && "Late, but open"}
              {state.outcome === "lost" && "The frost took the road"}
            </DialogTitle>
            <DialogDescription>
              {state.outcome === "held" && "The northern road is provisioned. Wagons can move before the frost."}
              {state.outcome === "held-late" && "The marchers will remember the delay. The road is open all the same."}
              {state.outcome === "lost" && "The twelfth dusk came in short. You can winter on. Yields thin, and the caravan grows dear."}
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
              {state.outcome === "lost" ? "Winter on" : "Stay with the hold"}
            </Button>
            <Button type="button" variant="outline" className="h-11" onClick={() => leave(onAbandon)}>
              New season
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
    <div className="flex flex-col gap-3">
      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="text-sm leading-relaxed">
          Leave what your kin are likely to draw tonight. Send the rest to the road. The reserve binds them, not you.
        </p>
        <Button type="button" className="mt-3 h-11 w-full" onClick={() => act(pledgeRoadShare(state))}>
          Leave a share, send the rest
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
        Drawn from the hall today: {state.player.withdrawnToday}/{FOUNDER_WITHDRAW_CAP}
      </p>
      <div className="flex flex-col gap-2">
        {GOODS.map((item) => (
          <div key={item} className={`rounded-2xl ring-1 ${hallGood === item ? "bg-accent ring-gold" : "bg-card ring-foreground/10"}`}>
            <button type="button" className="flex min-h-12 w-full items-center gap-3 px-3 text-left" aria-pressed={hallGood === item} onClick={() => setHallGood(item)}>
              <GoodIcon good={item} />
              <span className="flex-1 text-sm">Hall {GOOD_LABEL[item].toLowerCase()}</span>
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
                    Pledge
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
                  Draw
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
              <div className="flex items-start justify-between gap-3">
                <div>
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
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">{seasonNote(state.day)}</p>
      {state.caravan ? (
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-display text-2xl">The caravan</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {visitKey(state.day + 1) !== null ? "It stays through tomorrow, then the road goes quiet." : "It leaves at dusk."}
          </p>
          <ul className="mt-3 flex flex-col gap-3">
            {GOODS.map((item) => (
              <li key={item} className="flex items-center gap-2">
                <GoodIcon good={item} className="size-6" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm">{GOOD_LABEL[item]}</span>
                  <span className="block text-[11px] text-muted-foreground">
                    {state.caravan?.stock[item]} in the wagon · buy {buyPrice(state, item)}g · sell {sellPrice(state, item)}g
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
      ) : (
        <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="font-display text-2xl">The road is empty</p>
          <p className="mt-2 text-sm leading-relaxed">
            No wheels today.{market ? ` The caravan returns on day ${market}.` : ""} Until then the compact is your market.
          </p>
        </div>
      )}

      <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
        <p className="font-display text-xl">Neighbor barter</p>
        {state.npcOffers.length === 0 && <p className="mt-2 text-sm text-muted-foreground">No kin posted a trade this morning.</p>}
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
              {state.playerOffer.give.qty} {state.playerOffer.give.good} for {state.playerOffer.want.qty} {state.playerOffer.want.good}. Kin look it over at dusk.
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
              Post at dusk
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

function IconButton({ children, label, onClick }: { children: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="flex size-10 items-center justify-center rounded-full bg-card ring-1 ring-border">
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
