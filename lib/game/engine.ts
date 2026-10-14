import {
  BASE_CAP,
  BUY_PRICE,
  CONTENT_START,
  DEPOSIT_CAP,
  DRAW_CAP,
  FOUNDER_WITHDRAW_CAP,
  IRE_START,
  IRE_STEP,
  IRE_STEP_STAKED,
  KEEP,
  LEAVE_AT,
  LEVY_TARGET,
  MILL_COST,
  MOOD_DECAY,
  NEED_START,
  NEED_TARGET,
  NPC_YIELD,
  GOOD_LABEL,
  OMEN_ON_DAY,
  PLAYER_YIELD,
  ROAD_SURPRISES,
  SCORCH_AT,
  SEASON_DAYS,
  SELL_PRICE,
  SHRINE_COST,
  STAKE_COST,
  STARTING_GOLD,
  UNDERCROFT_CAP,
  UNDERCROFT_COST,
  WYRM_NAME,
  emptyStash,
  factionById,
  holdById,
  isLevyGood,
  omenById,
  pickOathbound,
  seasonOf,
  stashCount,
} from "./content";
import { nextTutorialStep } from "./coach";
import { emptyBrew } from "./craft";
import { applyDawnProgress, blankCampaign, grantXp, syncCampaign } from "./progress";
import {
  blankSettlements,
  chooseCrossing as answerCrossing,
  choosePetition as answerPetition,
  clearUnansweredCrossing,
  dismissCrossing as passCrossing,
  offerCrossing,
  offerPetition,
  realmIreDelta,
  realmYieldBonus,
  setEdict as enactEdict,
  stockSettlement as sendStores,
  tickSettlements,
} from "./realm";
import { blankExpedition, blankPolitics, EXPEDITION_GRACE, expeditionDue, markCalled, markDeparted, takeExpeditionPrize, wagonsOpen } from "./expedition";
import { bumpQuest, carryCap, carriedWeight, gearWeight, loreBonus, luckOf, openingQuests, openingScene, purseBonus, rewardScene, roadFind, starterCloak, wardBonus } from "./world";
import { GOODS, LEVY_GOODS } from "./types";
import type {
  BarterOffer,
  Caravan,
  EdictId,
  FactionId,
  GameState,
  GoodId,
  HoldId,
  LevyGood,
  Member,
  NewGameSetup,
  PlayerOffer,
  Result,
  Stash,
} from "./types";

const LEVY_LIST = LEVY_GOODS;

function draft(state: GameState): GameState {
  return structuredClone(state);
}

function fail(state: GameState, error: string): Result {
  return { state, error };
}

function ok(state: GameState, message?: string): Result {
  return { state, message };
}

function note(state: GameState, text: string) {
  state.chronicle.push({ id: state.nextId++, day: state.day, text });
  if (state.chronicle.length > 60) {
    state.chronicle.splice(0, state.chronicle.length - 60);
  }
}

function qtyOf(qty: number): number | null {
  if (!Number.isInteger(qty) || qty < 1 || qty > 99) return null;
  return qty;
}

function capFor(state: GameState): number {
  const base = state.player.undercroft ? UNDERCROFT_CAP : BASE_CAP;
  return base + (state.campaign?.buildings.hall ?? 0) * 4;
}

function canFit(state: GameState, adding: number): boolean {
  return stashCount(state.player.stash) + adding <= capFor(state);
}

export function playerYieldQty(factionId: FactionId, holdId: HoldId, day: number): number {
  const good = holdById(holdId).produces;
  let qty = PLAYER_YIELD[good];
  if (factionId === "deepwood") qty += 1;
  if (seasonOf(day) === "deepwinter") qty = Math.max(1, qty - 1);
  return qty;
}

export function dawnYield(state: GameState, day = state.day): number {
  let qty = playerYieldQty(state.player.factionId, state.player.holdId, day);
  if (state.works.mill) qty += 1;
  qty += state.campaign?.buildings.yard ?? 0;
  if (state.campaign?.skills.includes("stores")) qty += 1;
  qty += realmYieldBonus(state);
  return qty;
}

export function buyPrice(state: GameState, good: GoodId): number {
  let price = BUY_PRICE[good];
  const season = seasonOf(state.day);
  if (season === "thaw" && good === "salt") price += 1;
  if (season === "harvest" && good === "grain") price -= 1;
  if (season === "frost" && (good === "grain" || good === "iron")) price += 1;
  if (season === "deepwinter") {
    if (good === "grain") price += 2;
    if (good === "iron" || good === "salt") price += 1;
  }
  if (state.player.factionId === "copper") price -= 1;
  if (state.rumor && state.rumor.day === state.day && state.rumor.good === good && state.rumor.side === "buy") {
    price += state.rumor.delta;
  }
  if (state.campaign?.skills.includes("bargain")) price -= 1;
  const market = state.campaign?.buildings.market ?? 0;
  if (market >= 2) price -= 1;
  if (market >= 4) price -= 1;
  return Math.max(1, price);
}

export function sellPrice(state: GameState, good: GoodId): number {
  let price = SELL_PRICE[good];
  if (state.player.factionId === "copper") price += 1;
  if (state.rumor && state.rumor.day === state.day && state.rumor.good === good && state.rumor.side === "sell") {
    price += state.rumor.delta;
  }
  if (state.campaign?.skills.includes("bargain")) price += 1;
  price += purseBonus(state);
  if (state.tonics?.purse) price += 2;
  const market = state.campaign?.buildings.market ?? 0;
  if (market >= 2) price += 1;
  if (market >= 4) price += 1;
  return Math.max(1, price);
}

export function levyRemaining(state: GameState, good: LevyGood): number {
  return Math.max(0, LEVY_TARGET[good] - state.compact.levy[good]);
}

export function isLevyMet(state: GameState): boolean {
  return LEVY_LIST.every((good) => state.compact.levy[good] >= LEVY_TARGET[good]);
}

function memberHold(member: Member) {
  return holdById(member.holdId);
}

function mostUrgent(member: Member): GoodId | null {
  const needs = memberHold(member).needs;
  let best: GoodId | null = null;
  let bestQty = NEED_TARGET;
  for (const need of needs) {
    const have = member.stash[need];
    if (have < NEED_TARGET && (best === null || have < bestQty)) {
      best = need;
      bestQty = have;
    }
  }
  return best;
}

function drawQty(member: Member, good: GoodId): number {
  const deficit = NEED_TARGET - member.stash[good];
  if (deficit <= 0) return 0;
  return Math.min(DRAW_CAP[member.personality], deficit);
}

export function expectedDraw(state: GameState): Record<LevyGood, number> {
  const draw: Record<LevyGood, number> = { grain: 0, iron: 0, salt: 0 };
  for (const member of state.compact.members) {
    if (!member.inCompact) continue;
    const urgent = mostUrgent(member);
    if (!urgent || !isLevyGood(urgent)) continue;
    draw[urgent] += drawQty(member, urgent);
  }
  return draw;
}

function availableToKin(state: GameState, good: GoodId): number {
  if (!isLevyGood(good)) return state.compact.hall[good];
  return Math.max(0, state.compact.hall[good] - state.compact.reserve[good]);
}

function grantCrownGold(state: GameState, qty: number) {
  if (state.player.factionId !== "crown" || qty <= 0) return 0;
  const coins = Math.floor(qty / 2);
  state.player.gold += coins;
  return coins;
}

function grantDeed(state: GameState, amount: number) {
  if (!state.campaign) return;
  for (const line of grantXp(state, amount)) note(state, line);
  syncCampaign(state);
}

function oathCoin(state: GameState): number {
  if (!state.campaign?.skills.includes("coin")) return 0;
  state.player.gold += 1;
  return 1;
}

function considerVictory(state: GameState) {
  if (!isLevyMet(state)) return;
  if (!wagonsOpen(state)) return;
  if (state.outcome === "held" || state.outcome === "held-late") return;
  const late = state.day > expeditionDue(state) || state.outcome === "lost";
  state.outcome = late ? "held-late" : "held";
  state.outcomeDismissed = false;
  if (!state.outcomeRewarded) {
    state.player.renown += late ? 4 : 10;
    const stayed = state.compact.members.filter((member) => member.inCompact).length;
    state.player.renown += stayed * 2;
    state.outcomeRewarded = true;
    const prize = takeExpeditionPrize(state, "triumph");
    if (prize) note(state, prize);
  }
}

function wagonsClosed(state: GameState): string | null {
  if (wagonsOpen(state)) return null;
  const day = state.expedition?.nextCallDay;
  return day ? `The wagons are off the road. They return on day ${day}.` : "The wagons are not on the road.";
}

function departExpedition(state: GameState, line: string) {
  const kind = markDeparted(state);
  if (!kind) return;
  if (kind === "survival") {
    const prize = takeExpeditionPrize(state, "survival");
    if (prize) note(state, prize);
  }
  note(state, line);
}

function applyLoss(state: GameState) {
  if (state.outcome !== null) return;
  state.outcome = "lost";
  state.outcomeDismissed = false;
}

function addToLevy(state: GameState, good: LevyGood, qty: number): number {
  const need = levyRemaining(state, good);
  const moved = Math.min(qty, need);
  if (moved <= 0) return 0;
  state.compact.levy[good] += moved;
  state.stats.pledged += moved;
  state.compactActed = true;
  state.player.renown += 1;
  return moved;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seasonSeed(name: string, holdId: string, factionId: string): number {
  const text = `${name}|${holdId}|${factionId}`;
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

type Shift = {
  goods?: Partial<Record<GoodId, number>>;
  gold?: number;
  ire?: number;
  renown?: number;
  contentment?: number;
  note: string;
};

type SurprisePlay = {
  cautious: Shift;
  bold: { salt: number; stake: Shift; win: Shift; lose: Shift };
};

const SURPRISE: Record<string, SurprisePlay> = {
  "ford-fog": {
    cautious: { goods: { timber: -1 }, contentment: 4, renown: 1, note: "You staked the ford with timber. Your sworn neighbors crossed without losing the path." },
    bold: {
      salt: 11,
      stake: { goods: { grain: -3 }, note: "" },
      win: { goods: { salt: 4 }, gold: 3, note: "You drove through the ford fog and came out with salt and a little coin." },
      lose: { ire: 5, contentment: -6, note: "The ford fog ate the grain and turned you around. Vell's weather took the insult." },
    },
  },
  "candle-saint": {
    cautious: { goods: { relics: -1 }, contentment: 8, renown: 2, ire: -6, note: "The candle-saint blessed the storehouse. Your sworn neighbors slept, and Vell looked elsewhere." },
    bold: {
      salt: 5,
      stake: { gold: -6, note: "" },
      win: { goods: { relics: 1 }, gold: 10, renown: 1, note: "You snuffed the candle. A relic lay in the wax, and the saint's purse was heavier than it looked." },
      lose: { ire: 8, note: "The candle went out and took your coin with it. The gold eye in the mountain opened a little." },
    },
  },
  "cousin-banner": {
    cautious: { goods: { grain: -2, iron: 2 }, renown: 1, note: "Your cousin took two grain and left two iron, and called it kinship." },
    bold: {
      salt: 7,
      stake: { gold: -8, note: "" },
      win: { goods: { iron: 3, salt: 2 }, renown: 2, note: "Your cousin came back from the hills with iron and salt, and nobody asked which road." },
      lose: { contentment: -8, note: "Your cousin took the purse and told the neighbors you had paid them to leave. The stores went quiet." },
    },
  },
  "bell-carter": {
    cautious: { goods: { wool: -2 }, gold: 4, renown: 1, note: "You paid the bell-carter in wool. Four gold came back, and the road stayed marked." },
    bold: {
      salt: 4,
      stake: { gold: -4, note: "" },
      win: { goods: { iron: 2 }, gold: 6, renown: 2, note: "The bell-carter ran the night load. Two iron and six gold came back with the bell." },
      lose: { ire: 6, note: "The bell-carter took your coin into the frost and did not return. Vell heard the bell." },
    },
  },
  "snow-bells": {
    cautious: { goods: { salt: -2 }, ire: -8, renown: 1, note: "You salted the snow-bells. They went quiet, and the dragon's anger eased." },
    bold: {
      salt: 13,
      stake: { goods: { timber: -2 }, note: "" },
      win: { goods: { relics: 1 }, renown: 3, note: "Under the snow-bell you found a relic still warm. The pass kept your secret." },
      lose: { ire: 7, contentment: -5, note: "The snow broke under the bell. Vell turned an ear toward the pass, and the compact heard it too." },
    },
  },
  "seam-knock": {
    cautious: { goods: { iron: -2 }, gold: 5, ire: -4, note: "You left iron on the ladder. In the morning a carter had left five gold and the knocking had stopped." },
    bold: {
      salt: 2,
      stake: { goods: { iron: -1 }, note: "" },
      win: { goods: { iron: 4 }, renown: 2, note: "You went down at the third knock and came up with a richer fist of iron." },
      lose: { ire: 5, note: "The mine answered the knock. You climbed out poorer in nerve, and Vell knows the shaft." },
    },
  },
  "tide-bell": {
    cautious: { goods: { grain: -3, salt: 2 }, contentment: 3, renown: 1, note: "You gave the tide-bell its grain. The salt pools stayed level, and the salt workers slept." },
    bold: {
      salt: 1,
      stake: { gold: -5, note: "" },
      win: { goods: { salt: 4 }, gold: 8, renown: 2, note: "You hauled the tide-bell. Salt and coin spilled out of it onto the salt pools." },
      lose: { ire: 6, contentment: -4, note: "The tide-bell sank and took your coin. The slate serpent will mention it to Vell." },
    },
  },
  "white-hart": {
    cautious: { goods: { wool: -2 }, contentment: 6, renown: 1, note: "You left wool for the white deer. By dusk a lost flock had found the fold." },
    bold: {
      salt: 3,
      stake: { goods: { timber: -1 }, note: "" },
      win: { goods: { wool: 4 }, gold: 4, renown: 2, note: "You chased the white deer and came back with wool, coin, and no witness." },
      lose: { contentment: -7, ire: 4, note: "The white deer vanished between trunks. The compact heard the chase, and so did the mountain." },
    },
  },
};

function rollStock(visit: number): Stash {
  const rng = mulberry32(visit * 997 + 13);
  const roll = (min: number, span: number) => min + Math.floor(rng() * span);
  return {
    grain: roll(8, 5),
    timber: roll(6, 4),
    wool: roll(6, 3),
    salt: roll(5, 3),
    iron: roll(5, 3),
    relics: 1,
  };
}

function pickSurprise(seed: number, day: number, seen: string[]) {
  if (OMEN_ON_DAY[day]) return null;
  if (day < 3 || day > 11) return null;
  const rng = mulberry32((seed ^ Math.imul(day, 0xa5a5a5a5)) >>> 0);
  if (rng() >= 0.5) return null;
  const start = Math.floor(rng() * ROAD_SURPRISES.length);
  for (let step = 0; step < ROAD_SURPRISES.length; step += 1) {
    const event = ROAD_SURPRISES[(start + step) % ROAD_SURPRISES.length];
    if (!seen.includes(event.id)) return event;
  }
  return null;
}

function kinWhisper(seed: number, day: number, names: string[]): string | null {
  if (names.length === 0 || day < 2) return null;
  const rng = mulberry32((seed ^ Math.imul(day, 0x27d4eb2d)) >>> 0);
  if (rng() > 0.55) return null;
  const name = names[Math.floor(rng() * names.length)];
  const lines = [
    `${name} wakes counting coin that is not there.`,
    `${name} dreams of ${WYRM_NAME}'s wing and will not say so.`,
    `A dog in ${name}'s yard will not cross the threshold.`,
    `${name} swears the salt tasted of snow this morning.`,
    `Someone left a burnt feather on ${name}'s step.`,
    `${name} hears a bell and cannot find the hand that rings it.`,
    `${name} says the road looked longer from the gate.`,
    `Crows walk the roof above ${name} and will not fly.`,
  ];
  return lines[Math.floor(rng() * lines.length)];
}

function rumorText(good: GoodId, side: "buy" | "sell", delta: 1 | -1): string {
  const name = GOOD_LABEL[good];
  if (side === "buy" && delta === 1) return `${name} is dear on the road today. Buying costs 1 more.`;
  if (side === "buy") return `${name} is plentiful on the road today. Buying costs 1 less.`;
  const lower = name.toLowerCase();
  if (delta === 1) return `Carters are hungry for ${lower}. Selling pays 1 more.`;
  return `The wagons are glutted with ${lower}. Selling pays 1 less.`;
}

function rumorFor(seed: number, day: number) {
  if (day < 2 || visitKey(day) === null) return null;
  const rng = mulberry32((seed ^ Math.imul(day, 0x85ebca6b)) >>> 0);
  if (rng() >= 0.45) return null;
  const good = GOODS[Math.floor(rng() * 6)];
  const side: "buy" | "sell" = rng() < 0.5 ? "buy" : "sell";
  const delta: 1 | -1 = rng() < 0.5 ? -1 : 1;
  if (side === "sell" && good === "grain" && delta === -1) return null;
  return { good, side, delta, day, text: rumorText(good, side, delta) };
}

function payError(state: GameState, shift: Shift): string | null {
  if (shift.goods) {
    for (const good of GOODS) {
      const qty = shift.goods[good] ?? 0;
      if (qty < 0 && state.player.stash[good] < -qty) return `You don't have ${-qty} ${good}.`;
    }
  }
  if ((shift.gold ?? 0) < 0 && state.player.gold < -(shift.gold ?? 0)) return `You need ${-(shift.gold ?? 0)} gold.`;
  return null;
}

function goodNet(shifts: Shift[]): number {
  let net = 0;
  for (const shift of shifts) {
    if (!shift.goods) continue;
    for (const qty of Object.values(shift.goods)) net += qty ?? 0;
  }
  return net;
}

function applyShift(state: GameState, shift: Shift) {
  if (shift.goods) {
    for (const good of GOODS) {
      const qty = shift.goods[good] ?? 0;
      if (qty) state.player.stash[good] += qty;
    }
  }
  if (shift.gold) state.player.gold += shift.gold;
  if (shift.ire) state.wyrm.ire = Math.max(0, Math.min(100, state.wyrm.ire + shift.ire));
  if (shift.renown) state.player.renown += shift.renown;
  if (shift.contentment) {
    for (const member of state.compact.members) {
      if (!member.inCompact) continue;
      member.contentment = Math.max(0, Math.min(100, member.contentment + (shift.contentment ?? 0)));
    }
  }
}

export function visitKey(day: number): number | null {
  if (day < 1) return null;
  const zero = day - 1;
  if (zero % 4 >= 2) return null;
  return Math.floor(zero / 4);
}

function makeMember(holdId: HoldId): Member {
  const hold = holdById(holdId);
  const stash = emptyStash();
  stash[hold.produces] = KEEP;
  for (const need of hold.needs) stash[need] = NEED_START;
  return {
    id: `lord-${holdId}`,
    name: hold.lord,
    epithet: hold.epithet,
    holdId,
    personality: hold.personality,
    stash,
    contentment: CONTENT_START,
    inCompact: true,
    lastNote: `${hold.lord} took the oath.`,
  };
}

function runDawn(state: GameState): string[] {
  const lines: string[] = [];
  for (const member of state.compact.members) {
    if (!member.inCompact) continue;
    const hold = memberHold(member);
    const good = hold.produces;
    member.stash[good] += NPC_YIELD[good];
    const surplus = member.stash[good] - KEEP;
    const deposit = Math.max(0, Math.min(surplus, DEPOSIT_CAP[member.personality]));
    if (deposit <= 0) continue;
    member.stash[good] -= deposit;
    state.compact.hall[good] += deposit;
    member.lastNote = `Left ${deposit} ${good} in the hall.`;
    lines.push(`${member.name} left ${deposit} ${good}.`);
  }
  return lines;
}

function runEvening(state: GameState): string[] {
  const lines: string[] = [];
  const order = [...state.compact.members].sort((a, b) => {
    const rank = { generous: 0, steady: 1, lean: 2 };
    return rank[a.personality] - rank[b.personality];
  });

  for (const member of order) {
    if (!member.inCompact) continue;
    const urgent = mostUrgent(member);
    if (urgent) {
      const want = drawQty(member, urgent);
      const take = Math.min(want, availableToKin(state, urgent));
      if (take > 0) {
        state.compact.hall[urgent] -= take;
        member.stash[urgent] += take;
        member.lastNote = `Drew ${take} ${urgent} from the hall.`;
        lines.push(`${member.name} drew ${take} ${urgent}.`);
      } else {
        member.lastNote = `Found no ${urgent} above the reserve.`;
        lines.push(`${member.name} found the hall short of ${urgent}.`);
      }
    }

    const needs = memberHold(member).needs;
    for (const need of needs) {
      if (member.stash[need] > 0) member.stash[need] -= 1;
    }
    const starving = needs.some((need) => member.stash[need] <= 0);
    if (starving) {
      member.contentment = Math.max(0, member.contentment - MOOD_DECAY[member.personality]);
      if (member.contentment <= LEAVE_AT) {
        member.inCompact = false;
        member.lastNote = "Folded their banner and left.";
        if (state.politics) state.politics.conflictHeat = Math.min(100, state.politics.conflictHeat + 8);
        lines.push(
          `${member.name} folded their banner and left the compact. ${memberHold(member).name} will not send ${memberHold(member).produces} again.`,
        );
      }
    } else {
      member.contentment = Math.min(100, member.contentment + 2);
    }
  }
  return lines;
}

function makeOffers(state: GameState): BarterOffer[] {
  const offers: BarterOffer[] = [];
  for (const member of state.compact.members) {
    if (!member.inCompact) continue;
    const produced = memberHold(member).produces;
    const urgent = mostUrgent(member);
    if (!urgent || urgent === produced) continue;
    const relics = produced === "relics";
    const giveQty = relics ? 1 : 2;
    const wantQty = relics ? 3 : 2;
    if (member.stash[produced] < giveQty + 1) continue;
    offers.push({
      id: `offer-${state.nextId++}`,
      fromId: member.id,
      fromName: member.name,
      give: { good: produced, qty: giveQty },
      want: { good: urgent, qty: wantQty },
    });
  }
  return offers;
}

function tradeValue(good: GoodId): number {
  return SELL_PRICE[good];
}

function resolvePlayerOffer(state: GameState): string | null {
  const offer = state.playerOffer;
  if (!offer) return null;
  if (state.player.stash[offer.give.good] < offer.give.qty) {
    state.playerOffer = null;
    return "Your offer failed. The goods were already gone.";
  }
  const fair =
    tradeValue(offer.give.good) * offer.give.qty >=
    tradeValue(offer.want.good) * offer.want.qty * 0.75;
  if (!fair) {
    return "No kin accepted your offer. The rate was too thin.";
  }
  const buyer = state.compact.members.find((member) => {
    if (!member.inCompact || member.stash[offer.want.good] < offer.want.qty) return false;
    const hold = memberHold(member);
    const wantsGive = hold.needs.includes(offer.give.good) || hold.produces === offer.give.good;
    const spare = member.stash[offer.want.good] - offer.want.qty;
    const keepsNeed = hold.needs.includes(offer.want.good) ? spare >= 1 : spare >= 0;
    return wantsGive && keepsNeed;
  });
  if (!buyer) return "No kin had the goods to take your offer.";
  if (!canFit(state, offer.want.qty - offer.give.qty)) {
    return "No room in the cellar to complete your offer.";
  }
  state.player.stash[offer.give.good] -= offer.give.qty;
  state.player.stash[offer.want.good] += offer.want.qty;
  buyer.stash[offer.want.good] -= offer.want.qty;
  buyer.stash[offer.give.good] += offer.give.qty;
  state.playerOffer = null;
  buyer.lastNote = `Traded ${offer.want.qty} ${offer.want.good} for your ${offer.give.qty} ${offer.give.good}.`;
  return `${buyer.name} took your offer: ${offer.give.qty} ${offer.give.good} for ${offer.want.qty} ${offer.want.good}.`;
}

function refreshCaravan(state: GameState, nextDay: number) {
  const arriving = visitKey(nextDay);
  const current = visitKey(state.day);
  if (arriving === null) {
    state.caravan = null;
    return;
  }
  if (arriving !== current || !state.caravan) {
    state.caravan = { visit: arriving, stock: rollStock(arriving) };
  }
}

function cleanName(value: string, max: number): string {
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

export function createGame(setup: NewGameSetup): GameState {
  const name = cleanName(setup.name, 18);
  const compactName = cleanName(setup.compactName, 28);
  const hold = holdById(setup.holdId);
  const faction = factionById(setup.factionId);
  const sworn = pickOathbound(setup.holdId);
  const state: GameState = {
    version: 1,
    day: 1,
    nextId: 1,
    player: {
      name: name || "Ash",
      title: setup.title,
      factionId: setup.factionId,
      holdId: setup.holdId,
      banner: { ...setup.banner },
      gold: STARTING_GOLD,
      stash: emptyStash(),
      renown: 0,
      undercroft: false,
      withdrawnToday: 0,
    },
    compact: {
      name: compactName || `The ${hold.name} Compact`,
      hall: emptyStash(),
      levy: { grain: 0, iron: 0, salt: 0 },
      reserve: { grain: 0, iron: 0, salt: 0 },
      members: sworn.map(makeMember),
    },
    caravan: null,
    npcOffers: [],
    playerOffer: null,
    chronicle: [],
    compactActed: false,
    outcome: null,
    outcomeDismissed: false,
    outcomeRewarded: false,
    stats: { pledged: 0, gifted: 0, deposited: 0, bought: 0, sold: 0 },
    wyrm: { ire: IRE_START, tribute: 0 },
    works: { mill: false, shrine: false, stake: false },
    omen: null,
    omensSeen: [],
    oathsKept: [],
    crossing: null,
    marks: [],
    creaturesSeen: [],
    settlements: blankSettlements(setup.holdId, sworn, 1),
    petition: null,
    petitionsSeen: [],
    seed: seasonSeed(name || "Ash", setup.holdId, setup.factionId),
    rumor: null,
    surprisesSeen: [],
    where: setup.holdId,
    miles: 0,
    pack: [],
    vault: [],
    brew: emptyBrew(),
    cellar: emptyBrew(),
    tonics: { luck: 0, purse: false },
    worn: {},
    quests: [],
    scene: null,
    campaign: blankCampaign([]),
    tutorial: { step: "wagons" },
    expedition: blankExpedition(),
    politics: blankPolitics(),
  };

  const cloak = starterCloak();
  state.pack = [cloak];
  state.worn = { cloak: cloak.id };
  state.quests = openingQuests(state.seed, setup.holdId);
  state.scene = openingScene(name || "Ash", hold.name);
  state.campaign = blankCampaign(state.compact.members.map((member) => member.id));
  syncCampaign(state);
  const yieldQty = playerYieldQty(setup.factionId, setup.holdId, 1);
  state.player.stash[hold.produces] = yieldQty;
  const dawn = runDawn(state);
  state.caravan = { visit: 0, stock: rollStock(0) };
  state.npcOffers = makeOffers(state);
  note(
    state,
    `You raised a banner at ${hold.name} and named the compact ${state.compact.name}. ${faction.motto}`,
  );
  if (dawn.length) note(state, dawn.join(" "));
  note(
    state,
    `The wagons are called. They need ${LEVY_TARGET.grain} grain, ${LEVY_TARGET.iron} iron, and ${LEVY_TARGET.salt} salt before day ${SEASON_DAYS}. ${WYRM_NAME} the frost dragon watches that road. The people of ${hold.name} need food, firewood, and a law. When the wagons leave, the realm stays open, and the call will come again.`,
  );
  return state;
}

export function pledgePersonal(state: GameState, good: GoodId, qty: number): Result {
  const closed = wagonsClosed(state);
  if (closed) return fail(state, closed);
  const amount = qtyOf(qty);
  if (!amount) return fail(state, "Choose how much to send to the wagons.");
  if (!isLevyGood(good)) return fail(state, `The wagons do not take ${good}.`);
  if (state.player.stash[good] < amount) return fail(state, `You don't have that much ${good}.`);
  const next = draft(state);
  const moved = addToLevy(next, good, amount);
  if (moved <= 0) return fail(state, `The ${good} wagons are already full.`);
  next.player.stash[good] -= moved;
  bumpQuest(next, "pledge", good, moved);
  const coins = grantCrownGold(next, moved) + oathCoin(next);
  considerVictory(next);
  grantDeed(next, 1);
  const coinNote = coins ? ` You gain ${coins} gold.` : "";
  const victory = next.outcome === "held" || next.outcome === "held-late" ? " The road will hold." : "";
  note(next, `You pledged ${moved} ${good} from your own stores.${coinNote}`);
  return ok(next, `Pledged ${moved} ${good}.${coinNote}${victory}`);
}

export function deposit(state: GameState, good: GoodId, qty: number): Result {
  const amount = qtyOf(qty);
  if (!amount) return fail(state, "Choose how much to put in the shared stores.");
  if (state.player.stash[good] < amount) return fail(state, `You don't have that much ${good}.`);
  const next = draft(state);
  next.player.stash[good] -= amount;
  next.compact.hall[good] += amount;
  next.stats.deposited += amount;
  next.compactActed = true;
  note(next, `You left ${amount} ${good} in the hall.`);
  return ok(next, `Left ${amount} ${good} in the shared stores.`);
}

export function withdraw(state: GameState, good: GoodId, qty: number): Result {
  const amount = qtyOf(qty);
  if (!amount) return fail(state, "Choose how much to take back.");
  if (state.compact.hall[good] < amount) return fail(state, `The shared stores don't have that much ${good}.`);
  if (state.player.withdrawnToday + amount > FOUNDER_WITHDRAW_CAP) {
    return fail(state, `You can take ${FOUNDER_WITHDRAW_CAP} units from the shared stores each day.`);
  }
  if (!canFit(state, amount)) {
    return fail(state, "The cellar is full. Spend something down, or raise it.");
  }
  const next = draft(state);
  next.compact.hall[good] -= amount;
  next.player.stash[good] += amount;
  next.player.withdrawnToday += amount;
  note(next, `You drew ${amount} ${good} from the hall.`);
  return ok(next, `Took ${amount} ${good} from the shared stores.`);
}

export function pledgeFromHall(state: GameState, good: GoodId, qty: number): Result {
  const closed = wagonsClosed(state);
  if (closed) return fail(state, closed);
  const amount = qtyOf(qty);
  if (!amount) return fail(state, "Choose how much to send to the wagons.");
  if (!isLevyGood(good)) return fail(state, `The wagons do not take ${good}.`);
  if (state.compact.hall[good] < amount) return fail(state, `The shared stores don't have that much ${good}.`);
  const next = draft(state);
  const moved = addToLevy(next, good, amount);
  if (moved <= 0) return fail(state, `The ${good} wagons are already full.`);
  next.compact.hall[good] -= moved;
  const coins = grantCrownGold(next, moved) + oathCoin(next);
  considerVictory(next);
  grantDeed(next, 1);
  const below =
    isLevyGood(good) && next.compact.hall[good] < next.compact.reserve[good]
      ? " That cut into the reserve."
      : "";
  const coinNote = coins ? ` You gain ${coins} gold.` : "";
  const victory = next.outcome === "held" || next.outcome === "held-late" ? " The road will hold." : "";
  note(next, `You pledged ${moved} ${good} from the hall.${coinNote}`);
  return ok(next, `Pledged ${moved} ${good} from the hall.${below}${coinNote}${victory}`);
}

export function pledgeRoadShare(state: GameState): Result {
  const closed = wagonsClosed(state);
  if (closed) return fail(state, closed);
  const appetite = expectedDraw(state);
  const next = draft(state);
  const parts: string[] = [];
  let moved = 0;
  let coins = 0;
  for (const good of LEVY_LIST) {
    const leave = appetite[good];
    const qty = Math.max(0, Math.min(levyRemaining(next, good), next.compact.hall[good] - leave));
    if (qty <= 0) continue;
    const pledged = addToLevy(next, good, qty);
    next.compact.hall[good] -= pledged;
    moved += pledged;
    coins += grantCrownGold(next, pledged);
    parts.push(`${pledged} ${good}`);
  }
  if (moved <= 0) return fail(state, "Nothing in the hall sits above your kin's likely draw.");
  considerVictory(next);
  grantDeed(next, 1);
  oathCoin(next);
  const coinNote = coins ? ` You gain ${coins} gold.` : "";
  const victory = next.outcome === "held" || next.outcome === "held-late" ? " The road will hold." : "";
  note(next, `You sent the road's share from the hall: ${parts.join(", ")}.${coinNote}`);
  return ok(next, `Sent ${parts.join(", ")} to the road, and left a share in the hall.${coinNote}${victory}`);
}

export function setReserve(state: GameState, good: LevyGood, qty: number): Result {
  if (!Number.isInteger(qty) || qty < 0 || qty > 40) return fail(state, "That reserve won't hold.");
  const next = draft(state);
  next.compact.reserve[good] = qty;
  return ok(next);
}

export function gift(state: GameState, memberId: string, good: GoodId, qty: number): Result {
  const amount = qtyOf(qty);
  if (!amount) return fail(state, "Choose a gift.");
  const member = state.compact.members.find((item) => item.id === memberId);
  if (!member || !member.inCompact) return fail(state, "That banner has left the compact.");
  if (state.player.stash[good] < amount) return fail(state, `You don't have that much ${good}.`);
  const next = draft(state);
  const target = next.compact.members.find((item) => item.id === memberId)!;
  next.player.stash[good] -= amount;
  target.stash[good] += amount;
  target.contentment = Math.min(100, target.contentment + 8 * amount);
  target.lastNote = `Accepted a gift of ${amount} ${good}.`;
  next.stats.gifted += amount;
  next.compactActed = true;
  next.player.renown += 1;
  note(next, `You sent ${target.name} ${amount} ${good}.`);
  return ok(next, `${target.name} took the ${good}. Their mood eased.`);
}

export function offerRelic(state: GameState): Result {
  if (state.player.factionId !== "canticle") {
    return fail(state, "Only the Stone Canticle can offer a relic to the wagons.");
  }
  const closed = wagonsClosed(state);
  if (closed) return fail(state, closed);
  if (state.player.stash.relics < 1) return fail(state, "You have no relic to offer.");
  if (isLevyMet(state)) return fail(state, "The wagons are already full.");
  let focus: LevyGood = "grain";
  let worst = -1;
  for (const good of LEVY_LIST) {
    const gap = levyRemaining(state, good);
    if (gap > worst) {
      worst = gap;
      focus = good;
    }
  }
  if (worst <= 0) return fail(state, "The wagons are already full.");
  const next = draft(state);
  next.player.stash.relics -= 1;
  const moved = addToLevy(next, focus, 1);
  const coins = grantCrownGold(next, moved);
  considerVictory(next);
  const victory = next.outcome === "held" || next.outcome === "held-late" ? " The road will hold." : "";
  note(next, `You offered a relic. The saints counted it as 1 ${focus}.`);
  return ok(
    next,
    `The relic counts as 1 ${focus}.${coins ? ` The crown pays ${coins} gold.` : ""}${victory}`,
  );
}

export function buy(state: GameState, good: GoodId, qty: number): Result {
  const amount = qtyOf(qty);
  if (!amount) return fail(state, "Choose how much to buy.");
  if (!state.caravan) return fail(state, "The road is empty. No caravan today.");
  if (state.caravan.stock[good] < amount) return fail(state, `The caravan doesn't have that much ${good}.`);
  const price = buyPrice(state, good) * amount;
  if (state.player.gold < price) return fail(state, `You need ${price} gold for that.`);
  if (!canFit(state, amount)) return fail(state, "The cellar is full. Spend something down, or raise it.");
  const next = draft(state);
  next.player.gold -= price;
  next.caravan!.stock[good] -= amount;
  next.player.stash[good] += amount;
  next.stats.bought += amount;
  note(next, `You bought ${amount} ${good} from the caravan for ${price} gold.`);
  return ok(next, `Bought ${amount} ${good} for ${price} gold.`);
}

export function sell(state: GameState, good: GoodId, qty: number): Result {
  const amount = qtyOf(qty);
  if (!amount) return fail(state, "Choose how much to sell.");
  if (!state.caravan) return fail(state, "The road is empty. No caravan today.");
  if (state.player.stash[good] < amount) return fail(state, `You don't have that much ${good}.`);
  const price = sellPrice(state, good) * amount;
  const next = draft(state);
  next.player.stash[good] -= amount;
  next.player.gold += price;
  next.caravan!.stock[good] += amount;
  next.stats.sold += amount;
  note(next, `You sold ${amount} ${good} to the caravan for ${price} gold.`);
  return ok(next, `Sold ${amount} ${good} for ${price} gold.`);
}

export function acceptOffer(state: GameState, offerId: string): Result {
  const offer = state.npcOffers.find((item) => item.id === offerId);
  if (!offer) return fail(state, "That offer has already left the board.");
  const member = state.compact.members.find((item) => item.id === offer.fromId);
  if (!member || !member.inCompact) return fail(state, "That banner has left the compact.");
  if (member.stash[offer.give.good] < offer.give.qty) {
    return fail(state, `${member.name} no longer has the goods.`);
  }
  if (state.player.stash[offer.want.good] < offer.want.qty) {
    return fail(state, `You don't have ${offer.want.qty} ${offer.want.good} to trade.`);
  }
  const net = offer.give.qty - offer.want.qty;
  if (!canFit(state, net)) return fail(state, "The cellar can't hold what you'd receive.");
  const next = draft(state);
  const trader = next.compact.members.find((item) => item.id === offer.fromId)!;
  next.player.stash[offer.want.good] -= offer.want.qty;
  next.player.stash[offer.give.good] += offer.give.qty;
  trader.stash[offer.give.good] -= offer.give.qty;
  trader.stash[offer.want.good] += offer.want.qty;
  trader.lastNote = `Bartered ${offer.give.qty} ${offer.give.good} for ${offer.want.qty} ${offer.want.good}.`;
  next.npcOffers = next.npcOffers.filter((item) => item.id !== offerId);
  note(
    next,
    `You traded ${offer.want.qty} ${offer.want.good} to ${trader.name} for ${offer.give.qty} ${offer.give.good}.`,
  );
  return ok(next, `${trader.name} made the trade.`);
}

export function postOffer(state: GameState, give: PlayerOffer["give"], want: PlayerOffer["want"]): Result {
  const giveQty = qtyOf(give.qty);
  const wantQty = qtyOf(want.qty);
  if (!giveQty || !wantQty) return fail(state, "Set both sides of the offer.");
  if (give.good === want.good) return fail(state, "Trade one good for a different good.");
  if (state.playerOffer) return fail(state, "You already have an offer posted. Cancel it first.");
  if (state.player.stash[give.good] < giveQty) return fail(state, `You don't have that much ${give.good}.`);
  const next = draft(state);
  next.playerOffer = { give: { good: give.good, qty: giveQty }, want: { good: want.good, qty: wantQty } };
  note(next, `You posted an offer: ${giveQty} ${give.good} for ${wantQty} ${want.good}.`);
  return ok(next, "Offer posted. Neighbors look it over when you seal the day.");
}

export function cancelOffer(state: GameState): Result {
  if (!state.playerOffer) return fail(state, "You have no offer posted.");
  const next = draft(state);
  next.playerOffer = null;
  note(next, "You took your offer off the board.");
  return ok(next, "Offer cancelled.");
}

export function raiseUndercroft(state: GameState): Result {
  if (state.player.undercroft) return fail(state, "The cellar is already raised.");
  if (state.player.gold < UNDERCROFT_COST) {
    return fail(state, `Raising the cellar costs ${UNDERCROFT_COST} gold.`);
  }
  const next = draft(state);
  next.player.gold -= UNDERCROFT_COST;
  next.player.undercroft = true;
  note(next, "You raised the cellar. The hold can keep a larger store.");
  return ok(next, "The cellar is raised.");
}

export function dismissOutcome(state: GameState): Result {
  if (!state.outcome) return fail(state, "The expedition has not been judged.");
  const next = draft(state);
  next.outcomeDismissed = true;
  if (next.outcome === "held" || next.outcome === "held-late") {
    departExpedition(next, "The wagons leave the road. The hold, the oaths, and the seats stay.");
  }
  return ok(next, next.outcome === "lost" ? "The wagons are still late. Fill them, or let this call go." : "The expedition is over. The realm continues.");
}

/** Closes the verdict and sends the wagons off, including a missed call. */
export function releaseExpedition(state: GameState): Result {
  if (!state.outcome) return fail(state, "The expedition has not been judged.");
  const next = draft(state);
  next.outcomeDismissed = true;
  const missed = next.outcome === "lost";
  departExpedition(
    next,
    missed
      ? "You let the wagons go. The frost keeps the shortage. The realm stays open."
      : "The wagons leave the road. The hold, the oaths, and the seats stay.",
  );
  return ok(next, missed ? "The expedition is over. The realm continues." : "The wagons have gone. Keep the realm.");
}

export function sealDay(state: GameState): Result {
  const next = draft(state);
  if (wagonsOpen(next) && next.day === expeditionDue(next) && !isLevyMet(next)) applyLoss(next);

  const lines: string[] = [];
  const trade = resolvePlayerOffer(next);
  if (trade) lines.push(trade);
  lines.push(...runEvening(next));
  lines.push(...runDawn(next));

  const produced = holdById(next.player.holdId).produces;
  const yieldQty = dawnYield(next, next.day + 1);
  const room = capFor(next) - stashCount(next.player.stash);
  const stored = Math.max(0, Math.min(yieldQty, room));
  const spoiled = yieldQty - stored;
  if (stored > 0) next.player.stash[produced] += stored;
  if (spoiled > 0) lines.push(`${spoiled} ${produced} spoiled. The cellar is full.`);
  else lines.push(`Your hold yielded ${stored} ${produced}.`);

  const nextDay = next.day + 1;
  refreshCaravan(next, nextDay);
  next.npcOffers = makeOffers(next);
  if (next.compactActed) next.player.renown += 1;
  next.compactActed = false;
  next.player.withdrawnToday = 0;

  if (next.omen) {
    lines.push(`${next.omen.creature} went unanswered.`);
    next.omen = null;
  }
  const leftBehind = clearUnansweredCrossing(next);
  if (leftBehind) lines.push(leftBehind);

  let ireStep = next.works.stake ? IRE_STEP_STAKED : IRE_STEP;
  if (next.campaign?.skills.includes("truce")) ireStep = Math.max(1, ireStep - 1);
  ireStep = Math.max(1, ireStep - wardBonus(next));
  next.wyrm.ire = Math.min(100, next.wyrm.ire + ireStep);
  if (next.works.shrine) {
    for (const member of next.compact.members) {
      if (!member.inCompact) continue;
      member.contentment = Math.min(100, member.contentment + 3);
    }
  }
  if (next.wyrm.ire >= SCORCH_AT) {
    const scorched = LEVY_LIST.find((good) => next.compact.hall[good] > 0);
    if (scorched) {
      next.compact.hall[scorched] -= 1;
      lines.push(`${WYRM_NAME}'s shadow scorched 1 ${scorched} in the hall.`);
    } else {
      lines.push(`${WYRM_NAME}'s shadow crossed the holds and found the hall already thin.`);
    }
    next.wyrm.ire = Math.max(0, next.wyrm.ire - 12);
  }

  next.day = nextDay;
  const ireDelta = realmIreDelta(next);
  if (ireDelta) next.wyrm.ire = Math.max(0, Math.min(100, next.wyrm.ire + ireDelta));
  next.rumor = rumorFor(next.seed ?? 0, next.day);
  const omenId = OMEN_ON_DAY[next.day];
  if (omenId && !next.omensSeen.includes(omenId)) {
    next.omen = structuredClone(omenById(omenId));
    next.omensSeen.push(omenId);
    lines.push(`${next.omen.creature} is at the gate.`);
  } else if (!omenId) {
    const surprise = pickSurprise(next.seed ?? 0, next.day, next.surprisesSeen ?? []);
    if (surprise) {
      next.omen = structuredClone(surprise);
      next.surprisesSeen.push(surprise.id);
      lines.push(`${surprise.creature} is at the gate.`);
    }
  }
  if (!next.omen) {
    const arrived = offerCrossing(next);
    if (arrived) lines.push(arrived);
  }
  lines.push(...tickSettlements(next));
  if (!next.omen && !next.crossing) {
    const asked = offerPetition(next);
    if (asked) lines.push(asked);
  }
  if (next.tonics?.purse) {
    next.tonics.purse = false;
    lines.push("The coin drink fades with the dusk.");
  }
  lines.push(...applyDawnProgress(next));

  if (!next.omen && !next.crossing && !next.petition) {
    const whisper = kinWhisper(
      next.seed ?? 0,
      next.day,
      next.compact.members.filter((member) => member.inCompact).map((member) => member.name),
    );
    if (whisper) lines.push(whisper);
  }

  for (const line of lines) note(next, line);

  let message = `Day ${next.day} begins. ${lines[lines.length - 1]}`;
  if (next.omen) message = `${next.omen.creature} is at the gate. ${message}`;
  else if (next.crossing) message = `${next.crossing.creature} is on the road. ${message}`;
  else if (next.petition) message = `${next.petition.title}. ${message}`;
  if (wagonsOpen(next) && next.outcome === "lost" && next.day > expeditionDue(next) + EXPEDITION_GRACE) {
    departExpedition(next, "The late wagons turn back. The frost keeps what it took, and the realm goes on.");
    message = "The late wagons turn back. The realm goes on.";
  }
  if (next.expedition?.phase === "idle" && next.expedition.nextCallDay !== null && next.day >= next.expedition.nextCallDay) {
    markCalled(next);
    note(next, `The wagons are called again. Grain, iron, and salt are due by day ${next.expedition.dueDay}. The realm does not pause.`);
    message = `The wagons are called again. They are due by day ${next.expedition.dueDay}. The realm does not pause.`;
  } else if (next.outcome === "lost" && !next.outcomeDismissed && next.day === expeditionDue(next) + 1 && wagonsOpen(next)) {
    message = `${WYRM_NAME} came down the road. The wagons were short. Fill them late, or let them go. The realm stays.`;
  }
  return ok(next, message);
}

function spendGood(state: GameState, good: GoodId, qty: number): string | null {
  if (state.player.stash[good] < qty) return `You don't have ${qty} ${good}.`;
  state.player.stash[good] -= qty;
  return null;
}

export function offerTribute(state: GameState, kind: "iron" | "relic" | "salt"): Result {
  const next = draft(state);
  if (kind === "iron") {
    const error = spendGood(next, "iron", 2);
    if (error) return fail(state, error);
    next.wyrm.ire = Math.max(0, next.wyrm.ire - 16);
    next.wyrm.tribute += 2;
    next.player.gold += 2;
    bumpQuest(next, "tribute", "any", 1);
    note(next, `You laid 2 iron in the snow for ${WYRM_NAME}. The dragon's anger eased, and a carter left 2 gold.`);
    return ok(next, `${WYRM_NAME} took the iron. Anger falls.`);
  }
  if (kind === "relic") {
    const error = spendGood(next, "relics", 1);
    if (error) return fail(state, error);
    next.wyrm.ire = Math.max(0, next.wyrm.ire - 28);
    next.wyrm.tribute += 1;
    next.player.renown += 2;
    bumpQuest(next, "tribute", "any", 1);
    note(next, `You gave ${WYRM_NAME} a relic. The gold eye dimmed, and the snow went quiet.`);
    return ok(next, `${WYRM_NAME} took the relic and looked almost gentle.`);
  }
  const error = spendGood(next, "salt", 3);
  if (error) return fail(state, error);
  next.wyrm.ire = Math.max(0, next.wyrm.ire - 12);
  next.wyrm.tribute += 3;
  next.player.gold += 3;
  bumpQuest(next, "tribute", "any", 1);
  note(next, `You salted the high road for ${WYRM_NAME}. The dragon licked the frost and left you 3 gold.`);
  return ok(next, `${WYRM_NAME} tasted the salt. Anger falls.`);
}

export function raiseMill(state: GameState): Result {
  if (state.works.mill) return fail(state, "The mill already turns.");
  if (state.player.gold < MILL_COST.gold) return fail(state, `The mill costs ${MILL_COST.gold} gold.`);
  if (state.player.stash.timber < MILL_COST.timber) return fail(state, `The mill needs ${MILL_COST.timber} timber.`);
  const next = draft(state);
  next.player.gold -= MILL_COST.gold;
  next.player.stash.timber -= MILL_COST.timber;
  next.works.mill = true;
  note(next, "You raised a mill. The hold will yield one more each dawn.");
  return ok(next, "The mill turns. Dawn yields one more.");
}

export function raiseShrine(state: GameState): Result {
  if (state.works.shrine) return fail(state, "The shrine already burns.");
  if (state.player.gold < SHRINE_COST.gold) return fail(state, `The shrine costs ${SHRINE_COST.gold} gold.`);
  const next = draft(state);
  next.player.gold -= SHRINE_COST.gold;
  next.works.shrine = true;
  note(next, "You raised a shrine to the things that walk the Westmark. Your sworn neighbors sleep a little easier.");
  return ok(next, "The shrine is lit. Kin rest easier each dawn.");
}

export function raiseStake(state: GameState): Result {
  if (state.works.stake) return fail(state, "The iron stake is already set.");
  if (state.player.gold < STAKE_COST.gold) return fail(state, `The stake costs ${STAKE_COST.gold} gold.`);
  if (state.player.stash.iron < STAKE_COST.iron) return fail(state, `The stake needs ${STAKE_COST.iron} iron.`);
  const next = draft(state);
  next.player.gold -= STAKE_COST.gold;
  next.player.stash.iron -= STAKE_COST.iron;
  next.works.stake = true;
  note(next, `You drove an iron stake at the gate and rang it once. ${WYRM_NAME} will wake more slowly.`);
  return ok(next, "The iron stake is set. Vell's anger climbs more slowly.");
}

export function fulfillOath(state: GameState, memberId: string): Result {
  const member = state.compact.members.find((item) => item.id === memberId);
  if (!member || !member.inCompact) return fail(state, "That banner has left the compact.");
  if (state.oathsKept.includes(memberId)) return fail(state, `${member.name} has already had their oath-gift.`);
  const need = memberHold(member).needs[0];
  if (!need) return fail(state, `${member.name} wants nothing you can carry.`);
  if (state.player.stash[need] < 3) return fail(state, `${member.name} asks for 3 ${need}.`);
  const next = draft(state);
  const target = next.compact.members.find((item) => item.id === memberId)!;
  next.player.stash[need] -= 3;
  target.stash[need] += 3;
  target.contentment = Math.min(100, target.contentment + 22);
  target.lastNote = `Kept an old oath with 3 ${need}.`;
  next.oathsKept.push(memberId);
  next.player.renown += 3;
  next.compactActed = true;
  note(next, `You kept an oath to ${target.name}: 3 ${need}, given from your own stores.`);
  return ok(next, `${target.name} will remember the oath.`);
}

export function dismissOmen(state: GameState): Result {
  if (!state.omen) return fail(state, "Nothing is at the gate.");
  const line = state.omen.passText ?? `${state.omen.creature} went unanswered.`;
  const next = draft(state);
  next.omen = null;
  note(next, line);
  return ok(next, line);
}

export function chooseOmen(state: GameState, choiceId: string): Result {
  if (!state.omen) return fail(state, "Nothing is at the gate.");
  const omen = state.omen;
  if (!omen.choices.some((choice) => choice.id === choiceId)) return fail(state, "That is not an answer they will hear.");
  const next = draft(state);
  const play = SURPRISE[omen.id];
  let fate: { face: number; won: boolean } | undefined;
  if (play) {
    const cautiousIds = new Set(["mark", "bless", "trade", "toll", "quiet", "rung", "bed", "wool"]);
    if (cautiousIds.has(choiceId)) {
      const error = payError(next, play.cautious);
      if (error) return fail(state, error);
      const net = goodNet([play.cautious]);
      if (net > 0 && !canFit(next, net)) return fail(state, "The cellar is full.");
      applyShift(next, play.cautious);
      note(next, play.cautious.note);
    } else {
      const error = payError(next, play.bold.stake);
      if (error) return fail(state, error);
      const roll = mulberry32((next.seed ^ Math.imul(next.day, 0xc2b2ae35) ^ play.bold.salt) >>> 0)();
      const face = 1 + Math.floor(roll * 12);
      const won = roll < 0.5;
      fate = { face, won };
      const outcome = won ? play.bold.win : play.bold.lose;
      const net = goodNet([play.bold.stake, outcome]);
      if (net > 0 && !canFit(next, net)) return fail(state, "The cellar is full.");
      applyShift(next, play.bold.stake);
      applyShift(next, outcome);
      note(next, outcome.note);
    }
    next.omen = null;
    next.compactActed = true;
    const answered = ok(next, next.chronicle[next.chronicle.length - 1]?.text ?? "The road is answered.");
    if (fate) answered.fate = fate;
    return answered;
  }
  const key = `${omen.id}:${choiceId}`;

  const lack = (good: GoodId, qty: number) => next.player.stash[good] < qty;

  if (key === "drake:feed") {
    if (lack("iron", 2)) return fail(state, "You don't have 2 iron to feed the dragon.");
    next.player.stash.iron -= 2;
    if (canFit(next, 3)) next.player.stash.iron += 3;
    else next.player.stash.iron += 2;
    next.wyrm.ire = Math.max(0, next.wyrm.ire - 10);
    note(next, "The mine dragon took your iron and coughed a richer vein back into your hands.");
  } else if (key === "drake:watch") {
    next.wyrm.ire = Math.min(100, next.wyrm.ire + 4);
    note(next, "You let the mine dragon crawl back into the dark. It will mention you to Vell.");
  } else if (key === "nix:give") {
    if (lack("grain", 3)) return fail(state, "You don't have 3 grain for the river woman.");
    next.player.stash.grain -= 3;
    const room = capFor(next) - stashCount(next.player.stash);
    const gained = Math.min(4, Math.max(0, room));
    if (gained === 0) return fail(state, "Your stores are full. The river woman will not leave salt on the floor.");
    next.player.stash.salt += gained;
    note(next, `The river woman took the grain and left ${gained} salt on the bank.`);
  } else if (key === "nix:watch") {
    const kin = next.compact.members.find((member) => member.inCompact);
    if (kin) {
      kin.contentment = Math.max(0, kin.contentment - 6);
      kin.lastNote = "Slept badly after the river woman was turned away.";
    }
    note(next, "You told the river woman to go. Someone in the compact dreamed of deep water.");
  } else if (key === "wing:tribute") {
    if (lack("iron", 2)) return fail(state, "You don't have 2 iron to offer the wing.");
    next.player.stash.iron -= 2;
    next.wyrm.ire = Math.max(0, next.wyrm.ire - 20);
    next.wyrm.tribute += 2;
    next.player.gold += 4;
    note(next, "You held iron up to the wing. Vell did not land, and the carters paid you 4 gold.");
  } else if (key === "wing:hide") {
    if (next.player.gold < 6) return fail(state, "Hiding the herds costs 6 gold.");
    next.player.gold -= 6;
    note(next, "You spent 6 gold driving the herds under the trees. The wing passed over empty pasture.");
  } else if (key === "antler:offer") {
    if (lack("timber", 3)) return fail(state, "You don't have 3 timber to leave at the tree-line.");
    next.player.stash.timber -= 3;
    for (const member of next.compact.members) {
      if (!member.inCompact) continue;
      member.contentment = Math.min(100, member.contentment + 10);
    }
    note(next, "You left timber for the antlered one. The compact slept without dreams.");
  } else if (key === "antler:cut") {
    if (canFit(next, 3)) next.player.stash.timber += 3;
    const kin = next.compact.members.find((member) => member.inCompact);
    if (kin) {
      kin.contentment = Math.max(0, kin.contentment - 10);
      kin.lastNote = "Heard the axes and did not like it.";
    }
    note(next, "You cut the timber anyway. The antlered one watched, and one sworn neighbor will not forget the sound.");
  } else if (key === "serpent:salt") {
    if (lack("salt", 3)) return fail(state, "You don't have 3 salt for the serpent.");
    next.player.stash.salt -= 3;
    next.player.gold += 8;
    note(next, "You gave the slate serpent its share of salt. Traders paid 8 gold for a quiet sea.");
  } else if (key === "serpent:watch") {
    next.wyrm.ire = Math.min(100, next.wyrm.ire + 6);
    note(next, "You kept the salt. The serpent sank, and Vell will hear of the broken bargain.");
  } else if (key === "speaks:relic") {
    if (lack("relics", 1)) return fail(state, "You have no relic to give Vell.");
    next.player.stash.relics -= 1;
    next.wyrm.ire = 10;
    next.wyrm.tribute += 1;
    next.player.renown += 4;
    note(next, `${WYRM_NAME} took the relic between two pale teeth. The snow went quiet.`);
  } else if (key === "speaks:road") {
    next.wyrm.ire = Math.min(100, next.wyrm.ire + 8);
    next.player.renown += 2;
    note(next, `You told ${WYRM_NAME} the road would answer. The gold eye did not blink.`);
  } else {
    return fail(state, "That answer has no weight here.");
  }

  next.omen = null;
  next.compactActed = true;
  grantDeed(next, 2);
  return ok(next, next.chronicle[next.chronicle.length - 1]?.text ?? "The omen is answered.");
}

export function travel(state: GameState, holdId: HoldId): Result {
  if (state.scene) return fail(state, "The scene is not finished.");
  const here = state.where ?? state.player.holdId;
  if (holdId === here) return fail(state, "You are already standing there.");
  const next = draft(state);
  const found = roadFind(next.seed ?? 0, next.day, next.miles ?? 0, holdId, luckOf(next));
  next.where = holdId;
  next.miles = (next.miles ?? 0) + 1;
  next.player.gold = Math.max(0, next.player.gold + found.gold);
  next.wyrm.ire = Math.max(0, Math.min(100, next.wyrm.ire + found.ire));
  if (found.gear) {
    if (carriedWeight(next) + gearWeight(found.gear) > carryCap(next)) {
      next.player.gold += 2;
      note(next, `The bag is too heavy. You leave ${found.gear.name} and take 2 gold instead.`);
    } else {
      next.pack = [...(next.pack ?? []), found.gear];
      bumpQuest(next, "loot", "any", 1);
    }
  }
  if ((next.tonics?.luck ?? 0) > 0) next.tonics.luck -= 1;
  bumpQuest(next, "visit", holdId, 1);
  next.scene = found.scene;
  note(next, found.line);
  grantDeed(next, 3 + (next.campaign?.skills.includes("scholar") ? 2 : 0) + loreBonus(next));
  return ok(next, found.line);
}

export function advanceTutorial(state: GameState): Result {
  const next = draft(state);
  next.tutorial = { step: nextTutorialStep(next.tutorial?.step ?? null) };
  return ok(next);
}

export function replayTutorial(state: GameState): Result {
  const next = draft(state);
  next.tutorial = { step: "wagons" };
  return ok(next);
}

export function advanceScene(state: GameState): Result {
  if (!state.scene) return fail(state, "Nothing is playing.");
  const next = draft(state);
  const scene = next.scene;
  if (!scene) return fail(state, "Nothing is playing.");
  if (scene.index + 1 >= scene.beats.length) next.scene = null;
  else scene.index += 1;
  return ok(next);
}

export function sellGear(state: GameState, gearId: string): Result {
  const gear = (state.pack ?? []).find((item) => item.id === gearId);
  if (!gear) return fail(state, "That is not in the pack.");
  const next = draft(state);
  next.pack = (next.pack ?? []).filter((item) => item.id !== gearId);
  if ((next.worn ?? {})[gear.slot] === gearId) {
    const worn = { ...(next.worn ?? {}) };
    delete worn[gear.slot];
    next.worn = worn;
  }
  next.player.gold += gear.worth;
  note(next, `You sell ${gear.name} for ${gear.worth} gold.`);
  syncCampaign(next);
  return ok(next, `${gear.worth} gold for ${gear.name}.`);
}

export function equipGear(state: GameState, gearId: string): Result {
  const gear = (state.pack ?? []).find((item) => item.id === gearId);
  if (!gear) return fail(state, "That is not in the pack.");
  if (gear.slot === "hoard") return fail(state, "Treasures stay in the pack. Sell them when you need the coin.");
  const next = draft(state);
  next.worn = { ...(next.worn ?? {}), [gear.slot]: gear.id };
  note(next, `You wear ${gear.name}. Luck on the road is ${luckOf(next)}.`);
  syncCampaign(next);
  return ok(next, `${gear.name} is worn.`);
}

export function stowGear(state: GameState, gearId: string): Result {
  const gear = (state.pack ?? []).find((item) => item.id === gearId);
  if (!gear) return fail(state, "That is not in the pack.");
  if ((state.worn ?? {})[gear.slot] !== gear.id) return fail(state, "That is already in the pack.");
  const next = draft(state);
  const worn = { ...(next.worn ?? {}) };
  delete worn[gear.slot];
  next.worn = worn;
  note(next, `You stow ${gear.name}. Luck on the road is ${luckOf(next)}.`);
  syncCampaign(next);
  return ok(next, `${gear.name} is stowed.`);
}

export function claimQuest(state: GameState, questId: string): Result {
  const quest = (state.quests ?? []).find((item) => item.id === questId);
  if (!quest) return fail(state, "No such task.");
  if (quest.status === "claimed") return fail(state, "That reward is already taken.");
  if (quest.status !== "ready") return fail(state, "That task is not finished.");
  if (state.scene) return fail(state, "The scene is not finished.");
  const next = draft(state);
  const target = next.quests.find((item) => item.id === questId);
  if (!target) return fail(state, "No such task.");
  const bonus = Math.floor(worldRoll(next.seed ?? 0, next.day, target.reward) * (2 + luckOf(next)));
  const paid = target.reward + bonus;
  target.status = "claimed";
  next.player.gold += paid;
  next.scene = rewardScene(target.title, paid);
  note(next, `You claim ${target.title}. The road pays ${paid} gold.`);
  grantDeed(next, 4);
  return ok(next, `${paid} gold for ${target.title}.`);
}

function worldRoll(seed: number, day: number, salt: number) {
  const roll = (seed ^ Math.imul(day + 1, 0x9e3779b1) ^ salt) >>> 0;
  return ((Math.imul(roll ^ (roll >>> 16), 0x7feb352d) >>> 0) % 1000) / 1000;
}

export function caravanPresent(caravan: Caravan | null): caravan is Caravan {
  return caravan !== null;
}

function remembered(result: Result): Result {
  if (!result.error) syncCampaign(result.state);
  return result;
}

export function chooseCrossing(state: GameState, choiceId: string): Result {
  return remembered(answerCrossing(state, choiceId));
}

export function dismissCrossing(state: GameState): Result {
  return remembered(passCrossing(state));
}

export function choosePetition(state: GameState, choiceId: string): Result {
  return remembered(answerPetition(state, choiceId));
}

export function setEdict(state: GameState, holdId: HoldId, edict: EdictId): Result {
  return remembered(enactEdict(state, holdId, edict));
}

export function stockSettlement(state: GameState, holdId: HoldId, kind: "bread" | "hearth", qty: number): Result {
  return remembered(sendStores(state, holdId, kind, qty));
}
