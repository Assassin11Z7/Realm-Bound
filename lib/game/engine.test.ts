import assert from "node:assert/strict";
import test from "node:test";
import { LEVY_TARGET, seasonOf } from "./content";
import {
  acceptOffer,
  buy,
  buyPrice,
  createGame,
  deposit,
  gift,
  isLevyMet,
  offerRelic,
  playerYieldQty,
  pledgeFromHall,
  pledgePersonal,
  pledgeRoadShare,
  postOffer,
  chooseOmen,
  dawnYield,
  dismissOmen,
  offerTribute,
  raiseMill,
  raiseUndercroft,
  sealDay,
  sell,
  sellPrice,
  setReserve,
  travel,
  advanceScene,
  beginRoad,
  chooseRoad,
  claimQuest,
  dismissRoad,
  chooseCrossing,
  choosePetition,
  dismissCrossing,
  dismissOutcome,
  equipGear,
  equipOnHero,
  knotTheCall,
  openBellRoad,
  releaseExpedition,
  restHeroAtHold,
  sellGear,
  sendHeroOut,
  setEdict,
  stockSettlement,
  stowGear,
  withdraw,
} from "./engine";
import {
  gearHeroNotes,
  heroAllLoyalty,
  heroBandCool,
  borderPathRead,
  heroBargainRelief,
  heroBorderSeal,
  heroCallSooner,
  heroCharterQuiet,
  heroDawnYield,
  heroCreatureRenown,
  heroExtraTeach,
  heroFordRenown,
  heroHearthSave,
  heroHomeLoyalty,
  heroIreEase,
  heroMeetingBonus,
  heroProjectExtra,
  politicalRead,
  heroRelicBonus,
  heroRoadTeach,
  heroSaleBonus,
  heroSaltQuiet,
  heroStrengthRenown,
  heroSynergyRead,
  heroWagonExtra,
  heroWagonGold,
  heroWearsRelic,
  knotCallRead,
} from "./heroes";
import { parseSave } from "./storage";
import type { FactionId, GameState, GoodId, HeroId, HoldId, NewGameSetup } from "./types";
import { GOODS, LEVY_GOODS } from "./types";
import { chooseSkill, dismissRealmNotice, realmProjectCost, setCaptainOrder, startProject, startRealmProject } from "./progress";
import { craft, drinkPotion, storeGear } from "./craft";
import { availableCreatureIds, creatureCount, edictAvailable, forceCrossing, forcePetition, offerPetition, shownCrossing, shownPetition } from "./realm";
import { CHARTER_PAY, CHARTER_SOONER, EXPEDITION_GAP, allianceBoard, expeditionGap } from "./expedition";
import {
  RELIC_EXPEDITION_CHANCE,
  RELIC_WALK_CHANCE,
  WATCH_FIND_LUCK,
  WATCH_RELIC_BIAS,
  carryCap,
  gainRenown,
  gearCompare,
  influenceCap,
  luckOf,
  makePiece,
  makeRelic,
  pardonReady,
  roadFind,
  rollGear,
  rollUniqueRelic,
  starterCloak,
  treasureCount,
  vaultCap,
} from "./world";

function setup(partial: Partial<NewGameSetup> = {}): NewGameSetup {
  return {
    name: "Iseult",
    title: "Lady",
    factionId: "crown",
    holdId: "greenmere",
    banner: { field: "#6e1e22", charge: "#e6c56e", sigil: "crown", division: "fess" },
    compactName: "The Greenmere Compact",
    ...partial,
  };
}

function apply(state: GameState, result: { state: GameState; error?: string }): GameState {
  return result.error ? state : result.state;
}

function stripHall(state: GameState): GameState {
  let next = state;
  for (const good of GOODS) {
    let guard = 0;
    while (next.compact.hall[good] > 0 && guard < 20) {
      guard += 1;
      const qty = Math.min(8, next.compact.hall[good]);
      if (good === "grain" || good === "iron" || good === "salt") {
        const pledged = pledgeFromHall(next, good, qty);
        if (pledged.error) {
          const drawn = withdraw(next, good, qty);
          if (drawn.error) break;
          next = drawn.state;
        } else {
          next = pledged.state;
        }
      } else {
        const drawn = withdraw(next, good, qty);
        if (drawn.error) break;
        next = drawn.state;
      }
    }
  }
  return next;
}

function smartDay(state: GameState): GameState {
  let next = state;
  if (next.player.factionId === "canticle" && next.player.stash.relics > 0 && !isLevyMet(next)) {
    next = apply(next, offerRelic(next));
  }

  for (const member of next.compact.members) {
    if (!member.inCompact || member.contentment >= 58) continue;
    const needs = ["grain", "iron", "salt", "timber", "wool", "relics"] as GoodId[];
    const need = needs.find((good) => member.stash[good] <= 1 && next.player.stash[good] > 3);
    if (need) next = apply(next, gift(next, member.id, need, 1));
  }

  next = apply(next, pledgeRoadShare(next));

  for (const good of LEVY_GOODS) {
    const keep = 3;
    const spare = next.player.stash[good] - keep;
    if (spare > 0) next = apply(next, pledgePersonal(next, good, spare));
  }

  if (next.caravan) {
    for (const good of GOODS) {
      const levyMet = good === "grain" || good === "iron" || good === "salt"
        ? next.compact.levy[good] >= LEVY_TARGET[good]
        : false;
      const keep = levyMet ? 1 : good === "wool" || good === "timber" || good === "relics" ? 1 : 99;
      const spare = next.player.stash[good] - keep;
      if (spare > 0 && (good === "wool" || good === "timber" || good === "relics" || levyMet)) {
        next = apply(next, sell(next, good, spare));
      }
    }

    const deficits = LEVY_GOODS.map((good) => ({
      good,
      gap: Math.max(0, LEVY_TARGET[good] - next.compact.levy[good]),
    }))
      .filter((item) => item.gap > 0)
      .sort((a, b) => b.gap / LEVY_TARGET[b.good] - a.gap / LEVY_TARGET[a.good]);

    for (const item of deficits) {
      let guard = 0;
      while (guard < 12) {
        guard += 1;
        const price = buyPrice(next, item.good);
        if (!next.caravan || next.caravan.stock[item.good] < 1) break;
        if (next.player.gold < price + 2) break;
        const bought = buy(next, item.good, 1);
        if (bought.error) break;
        next = bought.state;
        const pledged = pledgePersonal(next, item.good, 1);
        if (!pledged.error) next = pledged.state;
      }
    }
  }

  for (const offer of [...next.npcOffers]) {
    const wantIsUseful =
      offer.give.good === "grain" || offer.give.good === "iron" || offer.give.good === "salt" || offer.give.good === "relics";
    if (!wantIsUseful) continue;
    if (next.player.stash[offer.want.good] < offer.want.qty + 1) continue;
    next = apply(next, acceptOffer(next, offer.id));
  }

  return apply(next, sealDay(next));
}

test("a new season stocks the hall, the caravan, and the player's yield", () => {
  const state = createGame(setup());
  assert.equal(state.day, 1);
  assert.equal(state.player.stash.grain, 5);
  assert.ok(state.caravan);
  assert.equal(state.compact.members.length, 3);
  assert.ok(state.compact.members.every((member) => member.holdId !== "greenmere"));
  assert.ok(state.compact.hall.iron + state.compact.hall.salt > 0);
  assert.equal(state.compact.levy.grain, 0);
});

test("deepwood yields an extra unit and the canticle can spend a relic", () => {
  const deep = createGame(setup({ factionId: "deepwood" }));
  assert.equal(deep.player.stash.grain, 6);
  assert.equal(playerYieldQty("deepwood", "vesper", 13), 1);

  const canticle = createGame(setup({ factionId: "canticle", holdId: "vesper" }));
  assert.equal(canticle.player.stash.relics, 1);
  const offered = offerRelic(canticle);
  assert.equal(offered.error, undefined);
  assert.equal(offered.state.player.stash.relics, 0);
  assert.equal(offered.state.compact.levy.grain, 1);
  const denied = offerRelic(createGame(setup()));
  assert.ok(denied.error);
});

test("the crown pays for pledges and copper shifts caravan prices", () => {
  const crown = createGame(setup());
  const pledged = pledgePersonal(crown, "grain", 4);
  assert.equal(pledged.error, undefined);
  assert.equal(pledged.state.compact.levy.grain, 4);
  assert.equal(pledged.state.player.gold, crown.player.gold + 2);

  const copper = createGame(setup({ factionId: "copper", holdId: "woolford" }));
  const plain = createGame(setup({ holdId: "woolford" }));
  assert.equal(buyPrice(copper, "iron"), buyPrice(plain, "iron") - 1);
  assert.ok(buyPrice(copper, "salt") < buyPrice(plain, "salt") + 1);
});

test("reserve stops kin from drawing, and the founder can still pledge it", () => {
  let state = createGame(setup({ holdId: "woolford" }));
  const before = state.compact.hall.iron;
  assert.ok(before > 0);
  state = setReserve(state, "iron", 40).state;
  state = sealDay(state).state;
  assert.ok(state.compact.hall.iron >= before);
  const pledged = pledgeFromHall(state, "iron", 1);
  assert.equal(pledged.error, undefined);
  assert.equal(pledged.state.compact.levy.iron, 1);
});

test("the caravan stays two days and then leaves", () => {
  let state = createGame(setup());
  assert.ok(state.caravan);
  const stock = state.caravan.stock.iron;
  state = buy(state, "iron", 1).state;
  assert.equal(state.caravan?.stock.iron, stock - 1);
  state = sealDay(state).state;
  assert.equal(state.day, 2);
  assert.equal(state.caravan?.stock.iron, stock - 1);
  state = sealDay(state).state;
  assert.equal(state.day, 3);
  assert.equal(state.caravan, null);
  state = sealDay(state).state;
  state = sealDay(state).state;
  assert.equal(state.day, 5);
  assert.ok(state.caravan);
  assert.notEqual(state.caravan.visit, 0);
});

test("sealing without pledging loses the road", () => {
  let state = createGame(setup({ holdId: "woolford", factionId: "copper" }));
  for (let day = 0; day < 12; day += 1) state = sealDay(state).state;
  assert.equal(state.outcome, "lost");
  assert.equal(state.day, 13);
  assert.equal(state.compact.levy.iron, 0);
});

test("stripping the hall drives an oathbound banner away", () => {
  let state = createGame(setup());
  for (let day = 0; day < 12; day += 1) {
    state = stripHall(state);
    state = sealDay(state).state;
  }
  assert.ok(state.compact.members.some((member) => !member.inCompact));
});

test("a careful season holds the road from every hold", () => {
  const pairings: { holdId: HoldId; factionId: FactionId }[] = [
    { holdId: "greenmere", factionId: "crown" },
    { holdId: "highbarrow", factionId: "deepwood" },
    { holdId: "saltmere", factionId: "copper" },
    { holdId: "ashfold", factionId: "deepwood" },
    { holdId: "woolford", factionId: "copper" },
    { holdId: "vesper", factionId: "canticle" },
  ];

  const report: string[] = [];
  for (const holdId of ["greenmere", "highbarrow", "saltmere", "ashfold", "woolford", "vesper"] as HoldId[]) {
    for (const factionId of ["crown", "canticle", "copper", "deepwood"] as FactionId[]) {
      let state = createGame(setup({ holdId, factionId, name: "Iseult" }));
      for (let day = 0; day < 16 && state.outcome !== "held" && state.outcome !== "held-late"; day += 1) {
        state = smartDay(state);
      }
      const stayed = state.compact.members.filter((member) => member.inCompact).length;
      report.push(
        `${holdId}/${factionId} outcome=${state.outcome} day=${state.day} levy=${state.compact.levy.grain}/${state.compact.levy.iron}/${state.compact.levy.salt} kin=${stayed} gold=${state.player.gold}`,
      );
    }
  }
  console.log(report.join("\n"));

  for (const pairing of pairings) {
    let state = createGame(setup(pairing));
    for (let day = 0; day < 16 && state.outcome !== "held" && state.outcome !== "held-late"; day += 1) {
      state = smartDay(state);
    }
    assert.ok(
      state.outcome === "held" || state.outcome === "held-late",
      `${pairing.holdId}/${pairing.factionId} should hold the road`,
    );
  }
});

test("barter, undercroft, and save parsing", () => {
  let state = createGame(setup({ holdId: "ashfold", factionId: "copper" }));
  const offer = state.npcOffers[0];
  if (offer) {
    state.player.stash[offer.want.good] += offer.want.qty;
    const traded = acceptOffer(state, offer.id);
    assert.equal(traded.error, undefined);
    state = traded.state;
  }
  const posted = postOffer(state, { good: "timber", qty: 2 }, { good: "grain", qty: 2 });
  assert.equal(posted.error, undefined);
  state = posted.state;
  assert.ok(state.playerOffer);

  state.player.gold = 40;
  const raisedResult = raiseUndercroft(state);
  assert.equal(raisedResult.error, undefined);
  const raised = raisedResult.state;
  assert.equal(raised.player.undercroft, true);
  assert.equal(raised.player.gold, 12);

  const raw = JSON.stringify(raised);
  assert.equal(parseSave(raw)?.day, raised.day);
  assert.equal(parseSave("{"), null);
  assert.equal(parseSave("null"), null);

  const deposited = deposit(createGame(setup()), "grain", 1);
  assert.equal(deposited.error, undefined);
  assert.equal(deposited.state.compact.hall.grain, createGame(setup()).compact.hall.grain + 1);

  const bare = parseSave(
    JSON.stringify({
      version: 1,
      day: 3,
      player: { stash: { grain: 1, timber: 0, iron: 0, salt: 0, wool: 0, relics: 0 } },
      compact: {
        members: [],
        hall: { grain: 0, timber: 0, iron: 0, salt: 0, wool: 0, relics: 0 },
        levy: { grain: 0, iron: 0, salt: 0 },
        reserve: { grain: 0, iron: 0, salt: 0 },
      },
      chronicle: [],
    }),
  );
  assert.equal(bare?.wyrm.ire, 18);
  assert.equal(bare?.tutorial.step, null);
  assert.equal(bare?.works.mill, false);
  assert.equal(bare?.omen, null);
  assert.deepEqual(bare?.omensSeen, []);
  assert.deepEqual(bare?.oathsKept, []);
});

test("Vell and the mine-drake stay optional until you answer", () => {
  const start = createGame(setup());
  assert.equal(start.wyrm.ire, 18);
  assert.equal(start.omen, null);
  const iron = start.player.stash.iron;
  const sealed = sealDay(start).state;
  assert.equal(sealed.day, 2);
  assert.equal(sealed.omen?.id, "drake");
  assert.equal(sealed.player.stash.iron, iron);

  assert.ok(chooseOmen(sealed, "feed").error);
  assert.ok(offerTribute(sealed, "iron").error);
  assert.ok(raiseMill(sealed).error);

  const passed = dismissOmen(sealed);
  assert.equal(passed.error, undefined);
  assert.equal(passed.state.omen, null);
  assert.equal(passed.state.player.stash.iron, iron);
  assert.equal(passed.state.wyrm.ire, sealed.wyrm.ire);

  const ignored = sealDay(sealed).state;
  assert.equal(ignored.day, 3);
  assert.equal(ignored.omen, null);
  assert.equal(ignored.player.stash.iron, iron);
  assert.ok(ignored.chronicle.some((entry) => entry.text.includes("went unanswered")));

  const hungry = structuredClone(sealed);
  hungry.player.stash.iron = 2;
  const fed = chooseOmen(hungry, "feed");
  assert.equal(fed.error, undefined);
  assert.equal(fed.state.omen, null);
  assert.equal(fed.state.player.stash.iron, 3);
  assert.ok(fed.state.wyrm.ire < hungry.wyrm.ire);

  const rich = structuredClone(sealed);
  rich.player.gold = 40;
  rich.player.stash.timber = 8;
  const milled = raiseMill(rich);
  assert.equal(milled.error, undefined);
  assert.equal(milled.state.works.mill, true);
  assert.equal(milled.state.player.gold, 30);
  assert.equal(dawnYield(milled.state), dawnYield(sealed) + 1);

  rich.player.stash.iron = 2;
  const tribute = offerTribute(rich, "iron");
  assert.equal(tribute.error, undefined);
  assert.equal(tribute.state.player.stash.iron, 0);
  assert.ok(tribute.state.wyrm.ire < rich.wyrm.ire);
  assert.equal(tribute.state.player.gold, rich.player.gold + 2);
});

function sealed(times: number, state = createGame(setup())) {
  let next = state;
  for (let step = 0; step < times; step += 1) next = sealDay(next).state;
  return next;
}

test("quiet dawns can send a stranger, and letting them pass spends nothing", () => {
  const start = createGame(setup());
  assert.equal(start.seed, 208279680);
  assert.equal(createGame(setup({ name: "  Iseult  " })).seed, start.seed);
  assert.notEqual(createGame(setup({ holdId: "woolford" })).seed, start.seed);
  assert.equal(start.rumor, null);

  const day2 = sealed(1);
  assert.equal(day2.day, 2);
  assert.equal(day2.omen?.id, "drake");
  assert.equal(day2.player.gold, 22);

  const day3 = sealed(2);
  assert.equal(day3.day, 3);
  assert.equal(day3.omen, null);

  const day5 = sealed(4);
  assert.equal(day5.day, 5);
  assert.equal(day5.omen?.id, "bell-carter");
  assert.deepEqual(day5.surprisesSeen, ["bell-carter"]);
  assert.equal(day5.player.gold, 22);
  assert.equal(day5.compact.levy.iron, 0);
  assert.equal(day5.wyrm.ire, 38);

  const passed = dismissOmen(day5);
  assert.equal(passed.error, undefined);
  assert.equal(passed.state.omen, null);
  assert.equal(passed.state.player.gold, 22);
  assert.equal(passed.state.wyrm.ire, 38);
  assert.ok(passed.state.chronicle.some((entry) => entry.text.includes("let the bell pass")));

  const ignored = sealDay(day5).state;
  const quiet = structuredClone(day5);
  quiet.omen = null;
  const without = sealDay(quiet).state;
  assert.equal(ignored.player.gold, without.player.gold);
  assert.deepEqual(ignored.player.stash, without.player.stash);
  assert.deepEqual(ignored.compact.hall, without.compact.hall);
  assert.deepEqual(ignored.compact.levy, without.compact.levy);
  assert.ok(ignored.chronicle.some((entry) => entry.text.includes("The bell-carter went unanswered.")));
  assert.equal(ignored.day, 6);
  assert.equal(ignored.omen?.id, "wing");
});

test("the bell-carter's night load can pay, and a short purse cannot", () => {
  const day5 = sealed(4);
  const night = chooseOmen(day5, "night");
  assert.equal(night.error, undefined);
  assert.equal(night.fate?.won, true);
  assert.ok((night.fate?.face ?? 0) >= 1 && (night.fate?.face ?? 0) <= 6);
  assert.equal(night.state.player.gold, 24);
  assert.equal(night.state.player.stash.iron, 2);
  assert.equal(night.state.player.renown, 2);
  assert.equal(night.state.wyrm.ire, 38);
  assert.equal(night.state.omen, null);
  assert.ok(night.state.chronicle.some((entry) => entry.text.includes("ran the night load")));

  const poor = structuredClone(day5);
  poor.player.gold = 3;
  const refused = chooseOmen(poor, "night");
  assert.equal(refused.error, "You need 4 gold.");
  assert.equal(refused.state.player.gold, 3);
  assert.equal(refused.state.omen?.id, "bell-carter");

  const wool = structuredClone(day5);
  wool.player.stash.wool = 2;
  const toll = chooseOmen(wool, "toll");
  assert.equal(toll.error, undefined);
  assert.equal(toll.state.player.stash.wool, 0);
  assert.equal(toll.state.player.gold, 26);
  assert.equal(toll.state.player.renown, 1);
  assert.equal(toll.state.omen, null);
});

test("a road rumor moves one price beside the fixed omens", () => {
  const day9 = sealed(8);
  assert.equal(day9.day, 9);
  assert.equal(day9.omen?.id, "seam-knock");
  assert.equal(day9.rumor?.good, "wool");
  assert.equal(day9.rumor?.side, "buy");
  assert.equal(day9.rumor?.delta, 1);
  const bare = structuredClone(day9);
  bare.rumor = null;
  assert.equal(buyPrice(day9, "wool"), buyPrice(bare, "wool") + 1);
  assert.equal(buyPrice(day9, "grain"), buyPrice(bare, "grain"));
  assert.equal(sellPrice(day9, "wool"), sellPrice(bare, "wool"));

  const day10 = sealed(9);
  assert.equal(day10.omen?.id, "serpent");
  assert.equal(day10.rumor?.good, "iron");
  assert.equal(day10.rumor?.side, "sell");
  assert.equal(day10.rumor?.delta, -1);
  const bareWool = structuredClone(day10);
  bareWool.rumor = null;
  assert.equal(sellPrice(day10, "iron"), sellPrice(bareWool, "iron") - 1);
  assert.equal(buyPrice(day10, "iron"), buyPrice(bareWool, "iron"));

  const day12 = sealed(11);
  assert.equal(day12.day, 12);
  assert.equal(day12.omen?.id, "speaks");
  assert.equal(day12.rumor, null);

  const fresh = createGame(setup());
  const other = createGame(setup({ holdId: "woolford" }));
  assert.equal(fresh.rumor, null);
  assert.equal(buyPrice(fresh, "iron"), buyPrice(other, "iron"));
});

test("old charters grow a seed and an empty rumor", () => {
  const bare = parseSave(
    JSON.stringify({
      version: 1,
      day: 3,
      player: { stash: { grain: 1, timber: 0, iron: 0, salt: 0, wool: 0, relics: 0 } },
      compact: {
        members: [],
        hall: { grain: 0, timber: 0, iron: 0, salt: 0, wool: 0, relics: 0 },
        levy: { grain: 0, iron: 0, salt: 0 },
        reserve: { grain: 0, iron: 0, salt: 0 },
      },
      chronicle: [],
      rumor: { good: "nope" },
      seed: Number.NaN,
    }),
  );
  assert.equal(bare?.seed, 0);
  assert.equal(bare?.rumor, null);
  assert.deepEqual(bare?.surprisesSeen, []);

  const day9 = sealed(8);
  const round = parseSave(JSON.stringify(day9));
  assert.equal(round?.seed, day9.seed);
  assert.deepEqual(round?.rumor, day9.rumor);
  assert.deepEqual(round?.surprisesSeen, day9.surprisesSeen);
});

test("the road rolls a find, a scene, and a claimable walk", () => {
  const start = createGame(setup());
  assert.ok(start.scene);
  assert.equal(start.scene?.beats.length, 3);
  assert.equal(start.where, "greenmere");
  assert.equal(luckOf(start), 1);
  let state = start;
  while (state.scene) state = advanceScene(state).state;
  assert.equal(state.scene, null);
  const stowed = stowGear(state, "gear-start-cloak");
  assert.equal(stowed.error, undefined);
  assert.equal(luckOf(stowed.state), 0);
  state = equipGear(stowed.state, "gear-start-cloak").state;
  assert.equal(luckOf(state), 1);

  const visit = state.quests.find((quest) => quest.kind === "visit");
  assert.ok(visit);
  const walked = travel(state, visit.target as HoldId);
  assert.equal(walked.error, undefined);
  assert.equal(walked.state.where, visit.target);
  assert.ok(walked.state.scene);
  assert.equal(walked.state.compact.levy.grain, 0);
  const again = travel(walked.state, "woolford");
  assert.ok(again.error);

  let clear = walked.state;
  while (clear.scene) clear = advanceScene(clear).state;
  const ready = clear.quests.find((quest) => quest.id === "visit");
  assert.equal(ready?.status, "ready");
  const claimed = claimQuest(clear, "visit");
  assert.equal(claimed.error, undefined);
  assert.ok(claimed.state.player.gold > clear.player.gold);
  assert.ok(claimed.state.scene);

  const found = walked.state.pack.find((gear) => gear.id !== "gear-start-cloak");
  if (found) {
    const worn = equipGear(clear, found.id);
    if (!worn.error) assert.ok(luckOf(worn.state) >= luckOf(clear));
  }

  const grown = createGame(setup());
  assert.equal(grown.campaign.level, 1);
  assert.equal(grown.campaign.chapter, 1);
  assert.equal(grown.campaign.captains[grown.compact.members[0].id].order, "oath");
  assert.equal(seasonOf(12), "frost");
  assert.equal(seasonOf(13), "deepwinter");
  assert.equal(seasonOf(16), "thaw");
  grown.player.gold = 0;
  grown.player.stash.grain = 0;
  const broke = startProject(grown, "yard");
  assert.ok(broke.error);
  grown.player.gold += 20;
  grown.player.stash.grain += 2;
  const rising = startProject(grown, "yard");
  assert.equal(rising.error, undefined);
  assert.equal(rising.state.campaign.project, "yard");
  const dawn = sealDay(rising.state).state;
  assert.equal(dawn.campaign.buildings.yard, 1);
  assert.equal(dawnYield(dawn), dawnYield(grown) + 1);
  const captain = grown.compact.members[0];
  const ordered = setCaptainOrder(grown, captain.id, "trade");
  const traded = sealDay(ordered.state).state;
  assert.ok(traded.player.gold > ordered.state.player.gold);
  const skilled = chooseSkill(
    { ...dawn, campaign: { ...dawn.campaign, offer: { level: 2, choices: ["stores", "step", "coin"] } } },
    "stores",
  );
  assert.equal(skilled.error, undefined);
  assert.ok(skilled.state.campaign.skills.includes("stores"));
  assert.equal(dawnYield(skilled.state), dawnYield(dawn) + 1);

  const same = travel(createGame(setup({ holdId: "ashfold" })), "vesper");
  const repeat = travel(createGame(setup({ holdId: "ashfold" })), "vesper");
  assert.equal(same.state.scene?.beats[0]?.line, repeat.state.scene?.beats[0]?.line);
});

test("setting out asks three beats, then pays the pack", () => {
  let state = createGame(setup());
  const blocked = beginRoad(state, "ashfold");
  assert.ok(blocked.error);
  while (state.scene) state = advanceScene(state).state;
  const begun = beginRoad(state, "ashfold");
  assert.equal(begun.error, undefined);
  assert.equal(begun.state.where, "greenmere");
  assert.equal(begun.state.road?.beats.length, 3);
  assert.equal(begun.state.scene, null);
  for (const beat of begun.state.road?.beats ?? []) {
    assert.ok(beat.choices.length >= 2 && beat.choices.length <= 3);
  }
  assert.equal(begun.state.road?.beats[0]?.choices.some((choice) => choice.id === "deer"), false);
  const busy = travel(begun.state, "woolford");
  assert.ok(busy.error);

  let clean = begun.state;
  for (const id of ["ridge", "pass", "press"]) {
    const step = chooseRoad(clean, id);
    assert.equal(step.error, undefined);
    clean = step.state;
  }
  assert.equal(clean.where, "ashfold");
  assert.equal(clean.miles, state.miles + 1);
  assert.equal(clean.scene, null);
  assert.equal(clean.road?.outcome?.tone, "clean");
  assert.match(clean.road?.outcome?.line ?? "", /clean road/);
  const home = dismissRoad(clean);
  assert.equal(home.error, undefined);
  assert.equal(home.state.road, null);

  const broke = beginRoad({ ...home.state, player: { ...home.state.player, gold: 0 } }, "vesper");
  assert.equal(broke.error, undefined);
  let poor = broke.state;
  for (const id of ["ridge", "pass", "pay"]) {
    poor = chooseRoad(poor, id).state;
  }
  assert.equal(poor.road?.outcome?.tone, "setback");
  assert.match(poor.road?.outcome?.line ?? "", /purse is short/);
  assert.equal(poor.where, "vesper");

  const hunter = gearOut(dismissRoad(poor).state, "moth", "Deer spear", "moth-spear");
  const deerRoad = beginRoad(hunter, "woolford");
  const deer = deerRoad.state.road?.beats[0]?.choices.find((choice) => choice.id === "deer");
  assert.ok(deer);
  assert.match(deer?.because ?? "", /Moth Quill/);
  assert.match(deer?.because ?? "", /Deer spear/);

  const belled = wake(createGame(setup()), "odysseus");
  while (belled.scene) belled.scene = advanceScene(belled).state.scene;
  belled.pack.push(makeRelic("ford-bell", "ody-bell"));
  const ringing = sendHeroOut(equipOnHero(belled, "odysseus", "ody-bell").state, "odysseus");
  assert.equal(ringing.error, undefined);
  const bellRoad = beginRoad(ringing.state, "ashfold");
  const bell = bellRoad.state.road?.beats[1]?.choices.find((choice) => choice.id === "bell");
  assert.ok(bell);
  assert.match(bell?.because ?? "", /Ford Bell/);
  assert.match(bell?.because ?? "", /Odysseus/);

  let paid = beginRoad(home.state, "saltmere").state;
  const before = paid.player.gold;
  for (const id of ["ditch", "fire", "pay"]) paid = chooseRoad(paid, id).state;
  assert.equal(paid.road?.outcome?.tone, "bargain");
  assert.match(paid.road?.outcome?.line ?? "", /pays 6 gold/);
  assert.ok(paid.player.gold <= before - 6 + 12);
  assert.equal(paid.scene, null);
});

test("treasures have their own names, and a hoard piece can be sold", () => {
  assert.ok(treasureCount() >= 40);
  const one = rollGear(9, 4, 2);
  const again = rollGear(9, 4, 2);
  assert.equal(one.name, again.name);
  assert.equal(one.line, again.line);
  const names = new Set(Array.from({ length: 12 }, (_, index) => rollGear(index + 1, index + 2, index + 3).name));
  assert.ok(names.size >= 6);
  const state = createGame(setup());
  const hoard = rollGear(state.seed, 6, 3);
  hoard.slot = "hoard";
  state.pack.push(hoard);
  const gold = state.player.gold;
  assert.ok(equipGear(state, hoard.id).error);
  const sold = sellGear(state, hoard.id);
  assert.equal(sold.error, undefined);
  assert.equal(sold.state.player.gold, gold + hoard.worth);
  assert.equal(sold.state.pack.some((gear) => gear.id === hoard.id), false);
});

test("the bag is weighed, the strongroom stores, and the benches craft", () => {
  const state = createGame(setup());
  assert.ok(carryCap(state) >= 120);
  assert.ok(vaultCap(state) >= 240);
  assert.ok(craft(state, "knife").error);
  state.campaign.buildings.forge = 1;
  state.player.stash.iron += 2;
  const made = craft(state, "knife");
  assert.equal(made.error, undefined);
  const knife = made.state.pack.find((gear) => gear.name === "Road knife");
  assert.ok(knife);
  const stored = storeGear(made.state, knife.id);
  assert.equal(stored.error, undefined);
  assert.equal(stored.state.vault.length, 1);
  assert.equal(
    stored.state.pack.some((gear) => gear.name === "Road knife"),
    false,
  );
  state.campaign.buildings.still = 1;
  state.player.stash.salt += 2;
  const brewed = craft(state, "luck");
  assert.equal(brewed.error, undefined);
  assert.equal(brewed.state.brew.luck, 1);
  const drunk = drinkPotion(brewed.state, "luck");
  assert.equal(drunk.state.tonics.luck, 3);
  assert.ok(luckOf(drunk.state) >= luckOf(state) + 2);
  state.campaign.project = "yard";
  state.campaign.buildings.still = 3;
  state.player.stash.relics += 1;
  state.player.gold += 20;
  const haste = craft(state, "haste");
  assert.equal(haste.error, undefined);
  const finished = drinkPotion(haste.state, "haste");
  assert.equal(finished.error, undefined);
  assert.equal(finished.state.campaign.buildings.yard, 1);
  assert.equal(finished.state.campaign.project, null);
});

test("quiet roads meet other creatures, and ignoring them spends nothing", () => {
  assert.ok(creatureCount() >= 12);
  const start = createGame(setup());
  assert.equal(start.settlements.length, 4);
  assert.ok(start.settlements.every((item) => item.edict === "custom"));
  assert.equal(start.crossing, null);
  assert.equal(start.marks.length, 0);
  assert.equal(start.settlements[0].souls, 86);

  const day3 = sealed(2);
  assert.equal(day3.day, 3);
  assert.equal(day3.omen, null);
  assert.ok(day3.crossing);
  assert.equal(day3.marks.length, 0);
  assert.equal(day3.player.gold, 22);
  assert.equal(day3.wyrm.ire, 28);

  const passed = dismissCrossing(day3);
  assert.equal(passed.error, undefined);
  assert.equal(passed.state.player.gold, 22);
  assert.equal(passed.state.wyrm.ire, day3.wyrm.ire);
  assert.equal(passed.state.crossing, null);
  assert.ok(passed.state.marks.some((mark) => mark.id.endsWith(":pass")));
  assert.equal(dawnYield(passed.state), dawnYield(day3));

  const ignored = sealDay(day3).state;
  assert.equal(ignored.day, 4);
  assert.equal(ignored.omen?.id, "nix");
  assert.equal(ignored.crossing, null);
  assert.equal(ignored.player.gold, 22);
  assert.equal(ignored.wyrm.ire, 33);
  assert.ok(ignored.marks.some((mark) => mark.id.endsWith(":pass")));
  assert.equal(ignored.compact.levy.iron, 0);
});

test("a creature's bargain and a settlement's law stay in force", () => {
  const start = createGame(setup());
  start.player.stash.grain = 6;
  const fed = chooseCrossing(forceCrossing(start, "millwife"), "loaf");
  assert.equal(fed.error, undefined);
  assert.equal(fed.state.player.stash.grain, 4);
  assert.equal(fed.state.player.gold, 22);
  assert.equal(dawnYield(fed.state), dawnYield(start) + 1);
  assert.ok(fed.state.marks.some((mark) => mark.id === "millwife:loaf"));
  const later = sealDay(fed.state).state;
  assert.equal(dawnYield(later), dawnYield(start) + 1);
  assert.equal(later.player.gold, 22);
  assert.ok(later.marks.some((mark) => mark.id === "millwife:loaf"));

  const hunted = chooseCrossing(forceCrossing(createGame(setup()), "lantern-hart"), "hunt");
  assert.equal(hunted.error, undefined);
  const trusted = forceCrossing(createGame(setup()), "ash-shepherd");
  const welcome = trusted.crossing?.choices.find((choice) => choice.id === "welcome");
  assert.equal(welcome?.branch, "base");
  const open = chooseCrossing(trusted, "welcome");
  assert.equal(open.state.settlements.find((item) => item.holdId === "greenmere")?.souls, 98);

  const marked = forceCrossing(hunted.state, "ash-shepherd");
  const cold = marked.crossing?.choices.find((choice) => choice.id === "welcome");
  assert.equal(cold?.branch, "alt");
  const thin = chooseCrossing(marked, "welcome");
  assert.equal(thin.error, undefined);
  const beforeSouls = hunted.state.settlements.find((item) => item.holdId === "greenmere")?.souls ?? 0;
  const home = thin.state.settlements.find((item) => item.holdId === "greenmere");
  assert.equal(home?.souls, beforeSouls + 6);

  const ruled = setEdict(createGame(setup()), "greenmere", "tithe");
  assert.equal(ruled.error, undefined);
  const grain = ruled.state.player.stash.grain;
  const gold = ruled.state.player.gold;
  const y = dawnYield(ruled.state, 2);
  const tithed = sealDay(ruled.state).state;
  assert.equal(tithed.player.gold, gold);
  assert.equal(tithed.player.stash.grain, grain + y + 1);
  assert.equal(tithed.settlements.find((item) => item.holdId === "greenmere")?.edict, "tithe");
  assert.equal(tithed.wyrm.ire, 23);

  const stocked = stockSettlement(createGame(setup()), "greenmere", "bread", 1);
  assert.equal(stocked.error, undefined);
  assert.equal(stocked.state.player.stash.grain, createGame(setup()).player.stash.grain - 1);
  assert.equal(stocked.state.settlements[0].bread, 28);

  const voices = choosePetition(forcePetition(createGame(setup()), "three-voices"), "bakers");
  assert.equal(voices.error, undefined);
  assert.equal(voices.state.petition, null);
  assert.equal(voices.state.settlements[0].edict, "dole");
  assert.ok(voices.state.marks.some((mark) => mark.id === "petition:three-voices:bakers"));

  const hag = chooseCrossing(forceCrossing(createGame(setup()), "toll-hag"), "trick");
  const again = chooseCrossing(forceCrossing(createGame(setup()), "toll-hag"), "trick");
  assert.equal(hag.error, undefined);
  assert.equal(hag.fate?.won, again.fate?.won);
  assert.equal(hag.state.player.gold, 20);
  assert.ok((hag.fate?.face ?? 0) >= 1 && (hag.fate?.face ?? 0) <= 12);

  const bare = parseSave(
    JSON.stringify({
      version: 1,
      day: 4,
      player: { holdId: "greenmere", stash: { grain: 1, timber: 0, iron: 0, salt: 0, wool: 0, relics: 0 } },
      compact: {
        members: [],
        hall: { grain: 0, timber: 0, iron: 0, salt: 0, wool: 0, relics: 0 },
        levy: { grain: 0, iron: 0, salt: 0 },
        reserve: { grain: 0, iron: 0, salt: 0 },
      },
      chronicle: [],
    }),
  );
  assert.ok((bare?.settlements.length ?? 0) >= 1);
  assert.deepEqual(bare?.marks, []);
  assert.equal(bare?.crossing, null);
  assert.equal(bare?.petition, null);
  assert.equal(bare?.settlements[0].edict, "custom");
  assert.equal(bare?.tutorial.step, null);
  assert.equal(bare?.campaign.realmLabor, null);
  assert.deepEqual(bare?.campaign.realmWorks, []);
  assert.equal(bare?.campaign.realmNotice, null);
  assert.equal(bare?.expedition.phase, "called");
  assert.equal(bare?.expedition.dueDay, 12);
  assert.equal(bare?.politics.awaitingSeats.length, 2);
  assert.equal(createGame(setup()).tutorial.step, "wagons");
});

test("a finished expedition leaves and the next call resets the wagons", () => {
  let state = createGame(setup());
  state.player.stash.grain += 30;
  state.player.stash.iron += 20;
  state.player.stash.salt += 20;
  state = pledgePersonal(state, "grain", 20).state;
  state = pledgePersonal(state, "iron", 12).state;
  state = pledgePersonal(state, "salt", 10).state;
  assert.equal(state.outcome, "held");
  assert.equal(state.expedition.phase, "called");
  assert.ok(state.expedition.rewards.includes("triumph-1"));
  assert.ok(state.pack.some((gear) => gear.id === "expedition-triumph-1"));
  state = dismissOutcome(state).state;
  assert.equal(state.expedition.phase, "idle");
  assert.equal(state.outcomeDismissed, true);
  const refused = pledgePersonal(state, "grain", 1);
  assert.ok(refused.error);
  const back = state.expedition.nextCallDay ?? 0;
  assert.ok(back > state.day);
  while (state.day < back) state = sealDay(state).state;
  assert.equal(state.day, back);
  assert.equal(state.expedition.phase, "called");
  assert.equal(state.expedition.cycle, 2);
  assert.equal(state.outcome, null);
  assert.equal(state.compact.levy.grain, 0);
  assert.equal(state.compact.levy.iron, 0);
  assert.equal(state.compact.levy.salt, 0);
});

test("letting a failed expedition go pays survival loot and keeps the seats", () => {
  let state = createGame(setup({ holdId: "woolford", factionId: "copper" }));
  for (let day = 0; day < 12; day += 1) state = sealDay(state).state;
  assert.equal(state.outcome, "lost");
  assert.equal(state.day, 13);
  assert.equal(state.expedition.phase, "called");
  state = releaseExpedition(state).state;
  assert.equal(state.expedition.phase, "idle");
  assert.equal(state.outcome, "lost");
  assert.ok(state.expedition.rewards.includes("survival-1"));
  assert.ok(state.pack.some((gear) => gear.id === "expedition-survival-1"));
  assert.ok(state.politics.conflictHeat > 0);
  const board = allianceBoard(state);
  assert.equal(board.seats[0].holder, "you");
  assert.ok(board.seats.some((seat) => seat.holder === "awaiting-player"));
  assert.equal(board.goals.length, 4);
  assert.equal(board.goals.find((goal) => goal.id === "oath-stone")?.progress, 0);
  assert.equal(board.conflict.rivalName, null);
  const later = pledgeFromHall(state, "iron", 1);
  assert.ok(later.error);
});

test("realm projects take several dawns and leave a lasting benefit", () => {
  const fresh = createGame(setup());
  assert.equal(fresh.campaign.realmLabor, null);
  assert.deepEqual(fresh.campaign.realmWorks, []);
  assert.ok(startRealmProject(fresh, "watchtower").error);
  assert.equal(realmProjectCost(fresh, "hall").gold, 14);
  fresh.campaign.skills = ["wright"];
  assert.equal(realmProjectCost(fresh, "hall").gold, 11);
  fresh.campaign.skills = [];

  const started = startRealmProject(fresh, "hall");
  assert.equal(started.error, undefined);
  assert.equal(started.state.player.gold, fresh.player.gold - 14);
  assert.equal(started.state.player.stash.grain, fresh.player.stash.grain - 3);
  assert.equal(started.state.campaign.realmLabor?.id, "hall");
  assert.equal(started.state.campaign.realmLabor?.spent, 0);
  assert.ok(startRealmProject(started.state, "watchtower").error);

  const saved = parseSave(JSON.stringify(started.state));
  assert.equal(saved?.campaign.realmLabor?.id, "hall");
  assert.equal(saved?.campaign.realmLabor?.spent, 0);

  let rising = started.state;
  rising.expedition.phase = "idle";
  rising.expedition.nextCallDay = rising.day + 30;
  rising.outcome = "held";
  rising.outcomeDismissed = true;
  rising = sealDay(rising).state;
  assert.equal(rising.campaign.realmLabor?.spent, 1);
  assert.equal(rising.expedition.phase, "idle");
  rising = sealDay(rising).state;
  assert.equal(rising.campaign.realmLabor?.spent, 2);
  rising = sealDay(rising).state;
  assert.equal(rising.campaign.realmLabor, null);
  assert.ok(rising.campaign.realmWorks.some((work) => work.id === "hall"));
  assert.ok(rising.campaign.realmNotice?.includes("Loyalty"));
  assert.ok(rising.chronicle.some((entry) => entry.text.includes("Loyalty at home recovers")));
  assert.equal(influenceCap(rising), 64);
  assert.equal(dismissRealmNotice(rising).state.campaign.realmNotice, null);

  const funded = createGame(setup());
  funded.campaign.realmWorks = [{ id: "hall" }];
  const plain = createGame(setup());
  const home = (state: GameState) => state.settlements.find((item) => item.holdId === "greenmere")?.mood ?? 0;
  assert.equal(home(sealDay(funded).state), home(sealDay(plain).state) + 2);

  const capped = createGame(setup());
  capped.player.renown = 40;
  gainRenown(capped, 5);
  assert.equal(capped.player.renown, 40);
  rising.player.renown = 40;
  gainRenown(rising, 5);
  assert.equal(rising.player.renown, 45);

  const borderHold = fresh.compact.members[0].holdId;
  const open = createGame(setup());
  open.outcome = "held";
  const departed = releaseExpedition(open).state;
  assert.equal(departed.expedition.nextCallDay, open.day + EXPEDITION_GAP);
  const marked = createGame(setup());
  marked.outcome = "held";
  marked.campaign.realmWorks = [{ id: "border", holdId: borderHold }];
  assert.equal(expeditionGap(marked), EXPEDITION_GAP - 2);
  const sooner = releaseExpedition(marked).state;
  assert.equal(sooner.expedition.nextCallDay, marked.day + EXPEDITION_GAP - 2);

  const bonded = createGame(setup());
  const member = bonded.compact.members[0];
  bonded.campaign.realmWorks = [{ id: "border", holdId: member.holdId }];
  const alone = createGame(setup());
  const withPath = sealDay(bonded).state.compact.members[0].contentment;
  const withoutPath = sealDay(alone).state.compact.members[0].contentment;
  assert.equal(withPath, withoutPath + 2);

  const smith = createGame(setup());
  const cloakLuck = luckOf(smith);
  smith.campaign.realmWorks = [{ id: "bench", bench: "forge" }];
  assert.equal(luckOf(smith), cloakLuck);
  const knife = makePiece("Road knife", "common", "smith-knife");
  assert.ok(knife);
  smith.pack.push(knife);
  smith.worn = { ...smith.worn, hand: knife.id };
  assert.equal(luckOf(smith), cloakLuck + knife.luck + 1);
  assert.ok(craft(smith, "staff").error);
  smith.campaign.buildings.forge = 1;
  smith.player.stash.iron += 2;
  smith.player.gold += 10;
  const made = craft(smith, "staff");
  assert.equal(made.error, undefined);
  assert.equal(made.state.pack.find((gear) => gear.name === "Ash staff")?.rarity, "uncanny");

  const same = roadFind(3, 2, 1, "saltmere", 1);
  const again = roadFind(3, 2, 1, "saltmere", 1, 0);
  assert.equal(same.line, again.line);
  assert.equal(same.gold, again.gold);
  assert.equal(same.gear?.rarity, again.gear?.rarity);
  let relicLift = false;
  let kinderFind = false;
  for (let day = 1; day <= 40 && (!relicLift || !kinderFind); day += 1) {
    for (let miles = 0; miles < 12 && (!relicLift || !kinderFind); miles += 1) {
      const plainGear = rollGear(4, day, miles);
      const watchedGear = rollGear(4, day, miles, WATCH_RELIC_BIAS);
      if (plainGear.rarity !== "relic" && watchedGear.rarity === "relic") relicLift = true;
      const plainFind = roadFind(3, day, miles, "saltmere", 1, 0);
      const watchedFind = roadFind(3, day, miles, "saltmere", 1 + WATCH_FIND_LUCK, WATCH_RELIC_BIAS);
      const plainScore = plainFind.gold + (plainFind.gear ? 2 : 0) + (plainFind.gear?.rarity === "relic" ? 3 : 0);
      const watchedScore = watchedFind.gold + (watchedFind.gear ? 2 : 0) + (watchedFind.gear?.rarity === "relic" ? 3 : 0);
      if (watchedScore > plainScore) kinderFind = true;
    }
  }
  assert.equal(relicLift, true);
  assert.equal(kinderFind, true);
});

test("unique relics stay out of ordinary finds and change the season when kept", () => {
  assert.equal(makePiece("Unspoken Hem", "relic", "nope"), null);
  const ordinary = new Set(["Unspoken Hem", "Barrow Band", "Salt Charter", "Carter's Knot", "Ford Bell"]);
  for (let index = 0; index < 40; index += 1) {
    const gear = rollGear(index + 3, index + 1, index + 2);
    assert.equal(gear.relic, undefined);
    assert.equal(ordinary.has(gear.name), false);
    const found = roadFind(index + 9, index + 2, index + 4, "ashfold", 1);
    if (found.gear) {
      assert.equal(found.gear.relic, undefined);
      assert.equal(ordinary.has(found.gear.name), false);
    }
  }

  let walkDrops = 0;
  for (let salt = 0; salt < 80; salt += 1) {
    if (rollUniqueRelic(4, 2, salt, 11, RELIC_WALK_CHANCE, [])) walkDrops += 1;
  }
  assert.ok(walkDrops >= 6 && walkDrops <= 28);

  let walked = createGame(setup());
  while (walked.scene) walked = advanceScene(walked).state;
  let sawWalkRelic = false;
  for (let step = 0; step < 50 && !sawWalkRelic; step += 1) {
    const dest = step % 2 === 0 ? "ashfold" : "greenmere";
    const moved = travel(walked, dest as HoldId);
    assert.equal(moved.error, undefined);
    walked = moved.state;
    while (walked.scene) walked = advanceScene(walked).state;
    sawWalkRelic = walked.pack.some((gear) => Boolean(gear.relic));
  }
  assert.equal(sawWalkRelic, true);

  let crossingDrops = 0;
  for (let day = 1; day <= 40; day += 1) {
    const state = createGame(setup({ name: `Cross${day}` }));
    state.day = day;
    state.player.stash.grain = 6;
    const fed = chooseCrossing(forceCrossing(state, "millwife"), "loaf");
    assert.equal(fed.state.player.stash.grain, 4);
    if (fed.state.pack.some((gear) => gear.relic)) crossingDrops += 1;
  }
  assert.ok(crossingDrops >= 1 && crossingDrops <= 20);

  let expeditionRelics = 0;
  for (let name = 0; name < 24; name += 1) {
    let state = createGame(setup({ name: `Wagon${name}` }));
    state.player.stash.grain += 30;
    state.player.stash.iron += 20;
    state.player.stash.salt += 20;
    state = pledgePersonal(state, "grain", 20).state;
    state = pledgePersonal(state, "iron", 12).state;
    state = pledgePersonal(state, "salt", 10).state;
    assert.equal(state.outcome, "held");
    assert.ok(state.pack.some((gear) => gear.id === "expedition-triumph-1"));
    if (state.pack.some((gear) => gear.relic)) expeditionRelics += 1;
  }
  assert.ok(expeditionRelics >= Math.floor(24 * RELIC_EXPEDITION_CHANCE * 0.45));

  const hem = makeRelic("unspoken-hem", "hem");
  const compared = gearCompare(hem, starterCloak(), false);
  assert.match(compared, /Travel cloak/);
  assert.match(compared, /failed bargain/);
  assert.match(compared, /call of the wagons/);

  const pardoned = createGame(setup());
  pardoned.pack.push(hem);
  pardoned.worn = { ...pardoned.worn, cloak: hem.id };
  const beforeMood = pardoned.settlements[0].mood;
  const spared = chooseCrossing(forceCrossing(pardoned, "toll-hag"), "trick");
  assert.equal(spared.fate?.won, false);
  assert.equal(spared.state.player.gold, pardoned.player.gold - 2);
  assert.equal(spared.state.settlements[0].mood, beforeMood);
  assert.equal(pardonReady(spared.state), false);
  const sour = choosePetition(forcePetition(spared.state, "oven-line"), "promise");
  assert.equal(sour.error, undefined);
  assert.ok((sour.state.settlements[0].mood ?? 0) < beforeMood);

  const plain = createGame(setup());
  const banded = createGame(setup());
  const band = makeRelic("barrow-band", "band");
  banded.pack.push(band);
  banded.worn = { ...banded.worn, ring: band.id };
  assert.equal(dawnYield(banded), dawnYield(plain) * 2);
  const plainSealed = sealDay(plain).state;
  const bandSealed = sealDay(banded).state;
  assert.equal(bandSealed.player.stash.grain, plainSealed.player.stash.grain + dawnYield(plain));
  assert.equal(bandSealed.wyrm.ire, plainSealed.wyrm.ire + 1);
  assert.ok(
    bandSealed.compact.members.some(
      (member, index) => member.contentment === plainSealed.compact.members[index].contentment - 4,
    ),
  );

  const wool = createGame(setup({ holdId: "woolford", factionId: "copper" }));
  const woolBand = createGame(setup({ holdId: "woolford", factionId: "copper" }));
  woolBand.pack.push(makeRelic("barrow-band", "band-wool"));
  woolBand.worn = { ...woolBand.worn, ring: "band-wool" };
  const woolSealed = sealDay(wool).state;
  const woolDoubled = sealDay(woolBand).state;
  assert.match(woolDoubled.chronicle.map((entry) => entry.text).join(" "), /Barrow Band/);
  assert.ok(woolDoubled.player.stash.wool >= woolSealed.player.stash.wool);

  const closed = setEdict(createGame(setup()), "greenmere", "salt-road");
  assert.ok(closed.error);
  const chartered = createGame(setup());
  chartered.pack.push(makeRelic("salt-charter", "charter"));
  assert.equal(availableCreatureIds(createGame(setup())).includes("salt-widow"), false);
  assert.equal(availableCreatureIds(chartered).includes("salt-widow"), true);
  const law = setEdict(chartered, "greenmere", "salt-road");
  assert.equal(law.error, undefined);
  const hearth = law.state.settlements[0].hearth;
  const salted = sealDay(law.state).state;
  assert.equal(salted.settlements[0].hearth, hearth);
  assert.equal(salted.settlements[0].edict, "salt-road");

  const early = createGame(setup());
  early.player.stash.grain += 30;
  early.player.stash.iron += 20;
  early.player.stash.salt += 20;
  early.pack.push(makeRelic("carter-knot", "knot"));
  early.worn = { ...early.worn, charm: "knot" };
  let sent = pledgePersonal(early, "grain", 20).state;
  sent = pledgePersonal(sent, "iron", 12).state;
  sent = pledgePersonal(sent, "salt", 10).state;
  const left = dismissOutcome(sent).state;
  assert.equal(left.expedition.nextCallDay, left.day + 5);
  assert.ok(left.player.gold >= sent.player.gold);

  const bell = createGame(setup());
  const beforeXp = bell.campaign.xp;
  while (bell.scene) {
    const advanced = advanceScene(bell);
    bell.scene = advanced.state.scene;
    bell.campaign = advanced.state.campaign;
  }
  bell.pack.push(makeRelic("ford-bell", "bell"));
  bell.worn = { ...bell.worn, hand: "bell" };
  const taught = travel(bell, "ashfold");
  assert.equal(taught.error, undefined);
  assert.ok(taught.state.campaign.xp >= beforeXp + 3);

  const round = parseSave(JSON.stringify(chartered));
  assert.equal(round?.pack.find((gear) => gear.id === "charter")?.relic, "salt-charter");
});

test("heroes wear the gear, and missions unlock the roster", () => {
  const start = createGame(setup());
  const sela = start.heroes.find((hero) => hero.id === "sela");
  assert.equal(sela?.unlocked, true);
  assert.equal(sela?.fielded, true);
  assert.equal(sela?.worn.cloak, "gear-start-cloak");
  assert.equal(start.heroes.filter((hero) => hero.unlocked).length, 1);
  assert.equal(start.heroes.find((hero) => hero.id === "zeus")?.unlocked, false);
  assert.equal(start.heroes.find((hero) => hero.id === "athena")?.unlocked, false);
  assert.equal(start.heroes.find((hero) => hero.id === "odin")?.unlocked, false);
  assert.equal(luckOf(start), 1);
  assert.equal(start.heroTasks.find((task) => task.id === "sela-sworn")?.status, "claimed");
  assert.equal(start.heroTasks.find((task) => task.id === "tam-walk")?.status, "open");

  const denied = equipOnHero(start, "zeus", "gear-start-cloak");
  assert.ok(denied.error);
  assert.equal(start.heroes.find((hero) => hero.id === "sela")?.worn.cloak, "gear-start-cloak");

  let state = start;
  state.miles = 6;
  state.player.renown = 8;
  state.campaign.buildings.yard = 1;
  state = sealDay(state).state;
  assert.equal(state.heroes.find((hero) => hero.id === "tam")?.unlocked, true);
  assert.equal(state.heroes.find((hero) => hero.id === "dorrie")?.unlocked, true);
  assert.equal(state.heroes.find((hero) => hero.id === "bran")?.unlocked, true);
  assert.equal(state.heroes.find((hero) => hero.id === "odysseus")?.unlocked, false);
  assert.equal(state.heroTasks.find((task) => task.id === "odysseus-miles")?.status, "claimed");
  assert.equal(state.heroTasks.find((task) => task.id === "odysseus-call")?.status, "open");
  assert.equal(state.heroes.find((hero) => hero.id === "heracles")?.unlocked, false);
  assert.equal(state.heroes.find((hero) => hero.id === "moth")?.unlocked, false);

  state.campaign.buildings.forge = 1;
  state.player.stash.iron += 2;
  const made = craft(state, "knife");
  assert.equal(made.error, undefined);
  const knife = made.state.pack.find((gear) => gear.name === "Road knife");
  assert.ok(knife);
  const armed = equipOnHero(made.state, "tam", knife.id);
  assert.equal(armed.error, undefined);
  assert.equal(armed.state.heroes.find((hero) => hero.id === "tam")?.worn.hand, knife.id);
  assert.equal(luckOf(armed.state), 1);
  const sent = sendHeroOut(armed.state, "tam");
  assert.equal(sent.error, undefined);
  assert.ok(luckOf(sent.state) >= 2);
  const crowded = sendHeroOut(sendHeroOut(sent.state, "dorrie").state, "bran");
  assert.ok(crowded.error);

  const rested = restHeroAtHold(sent.state, "sela");
  assert.equal(rested.error, undefined);
  assert.equal(luckOf(rested.state), knife.luck);
  const back = sendHeroOut(rested.state, "sela");
  assert.equal(back.error, undefined);
  assert.ok(luckOf(back.state) >= knife.luck + 1);

  const parsed = parseSave(JSON.stringify(back.state));
  assert.equal(parsed?.heroes.find((hero) => hero.id === "tam")?.unlocked, true);
  assert.equal(parsed?.heroes.find((hero) => hero.id === "tam")?.worn.hand, knife.id);
  assert.equal(parsed?.heroes.find((hero) => hero.id === "sela")?.fielded, true);
  assert.equal(parsed?.triumphs, 0);

  const called = createGame(setup());
  called.player.stash.grain += 30;
  called.player.stash.iron += 20;
  called.player.stash.salt += 20;
  let held = pledgePersonal(called, "grain", 20).state;
  held = pledgePersonal(held, "iron", 12).state;
  held = pledgePersonal(held, "salt", 10).state;
  assert.equal(held.outcome, "held");
  assert.equal(held.triumphs, 1);
  assert.equal(held.heroes.find((hero) => hero.id === "ivy")?.unlocked, true);
  assert.equal(held.heroes.find((hero) => hero.id === "heracles")?.unlocked, false);
});

function wake(state: GameState, id: HeroId) {
  const hero = state.heroes.find((item) => item.id === id);
  if (!hero) throw new Error(id);
  hero.unlocked = true;
  return state;
}

function homeOf(state: GameState) {
  return state.settlements.find((item) => item.holdId === state.player.holdId);
}

test("hero abilities and gear synergies sit on top of the flat bonuses", () => {
  const quiet = createGame(setup());
  assert.equal(heroRoadTeach(quiet), 1);
  assert.equal(heroFordRenown(quiet), 0);
  assert.equal(heroWagonGold(quiet), 0);
  assert.equal(heroBargainRelief(quiet), 0);
  assert.equal(heroProjectExtra(quiet, { id: "hall" }), 0);
  assert.equal(heroCallSooner(quiet), 0);
  assert.equal(heroSaleBonus(quiet), 0);
  assert.equal(heroWagonExtra(quiet), 0);
  assert.equal(heroHomeLoyalty(quiet), 1);
  assert.equal(expeditionGap(quiet), EXPEDITION_GAP);
  const spear = makePiece("Deer spear", "common", "asleep-spear");
  assert.ok(spear);
  quiet.pack.push(spear);
  assert.equal(gearHeroNotes(quiet, spear).some((line) => line.includes("Beowulf")), false);

  const fielded = sealDay(createGame(setup())).state;
  const rested = sealDay(restHeroAtHold(createGame(setup()), "sela").state).state;
  assert.equal(homeOf(fielded)?.mood, (homeOf(rested)?.mood ?? 0) + 1);

  const gate = createGame(setup());
  const ward = makePiece("Ford cloak", "uncanny", "gate-ward");
  assert.ok(ward);
  gate.pack.push(ward);
  assert.ok(gearHeroNotes(gate, ward).some((line) => line.includes("Sela") && line.includes("out")));
  const warded = equipOnHero(gate, "sela", ward.id).state;
  assert.equal(heroHomeLoyalty(warded), 2);
  assert.equal(heroSynergyRead(warded, "sela").find((row) => row.name === "Ward at the gate")?.state, "active");

  const labor = wake(createGame(setup()), "heracles");
  const knife = makePiece("Road knife", "common", "labor-knife");
  assert.ok(knife);
  labor.pack.push(knife);
  const armed = sendHeroOut(equipOnHero(labor, "heracles", knife.id).state, "heracles");
  assert.equal(armed.error, undefined);
  assert.equal(heroFordRenown(armed.state), 2);
  assert.equal(heroWagonGold(armed.state), 2);
  assert.equal(heroBargainRelief(armed.state), 4);
  assert.equal(heroStrengthRenown(armed.state), 2);
  const beforeGold = armed.state.player.gold;
  const beforeRenown = armed.state.player.renown;
  const paid = chooseCrossing(forceCrossing(armed.state, "toll-hag"), "pay");
  assert.equal(paid.error, undefined);
  assert.equal(paid.state.player.gold, beforeGold - 2);
  assert.equal(paid.state.player.renown, beforeRenown + 5);
  assert.ok(paid.state.chronicle.some((entry) => entry.text.includes("cheapens the bargain by 4")));

  const wolf = wake(createGame(setup()), "beowulf");
  const deer = makePiece("Deer spear", "common", "deer-spear");
  assert.ok(deer);
  wolf.pack.push(deer);
  assert.ok(gearHeroNotes(wolf, deer).some((line) => line.includes("Beowulf") && line.includes("at the hold")));
  const hunting = sendHeroOut(equipOnHero(wolf, "beowulf", deer.id).state, "beowulf");
  assert.equal(heroCreatureRenown(hunting.state), 4);
  assert.equal(heroIreEase(hunting.state), 1);
  assert.equal(heroSynergyRead(hunting.state, "beowulf").find((row) => row.name === "Hunt or ward")?.state, "active");
  assert.ok(gearHeroNotes(hunting.state, deer).some((line) => line.includes("Beowulf") && line.includes("out")));

  const bandPlain = createGame(setup());
  bandPlain.pack.push(makeRelic("barrow-band", "band-plain"));
  bandPlain.worn = { ...bandPlain.worn, ring: "band-plain" };
  const bandWolf = wake(createGame(setup()), "beowulf");
  bandWolf.pack.push(makeRelic("barrow-band", "band-wolf"));
  const banded = sendHeroOut(equipOnHero(bandWolf, "beowulf", "band-wolf").state, "beowulf");
  assert.equal(banded.error, undefined);
  const plainSealed = sealDay(bandPlain).state;
  const wolfSealed = sealDay(banded.state).state;
  assert.ok(
    wolfSealed.compact.members.some(
      (member, index) => member.contentment === plainSealed.compact.members[index].contentment + 2,
    ),
  );

  const hearth = wake(createGame(setup()), "dorrie");
  const wool = makePiece("Wool cloak", "common", "dorrie-wool");
  assert.ok(wool);
  hearth.pack.push(wool);
  const cousin = sendHeroOut(equipOnHero(hearth, "dorrie", wool.id).state, "dorrie");
  assert.equal(heroHearthSave(cousin.state), 1);
  const cold = sealDay(createGame(setup())).state;
  const warm = sealDay(cousin.state).state;
  assert.equal(homeOf(warm)?.hearth, (homeOf(cold)?.hearth ?? 0) + 1);

  const owl = wake(createGame(setup()), "athena");
  const bead = makePiece("Crow bead", "common", "athena-bead");
  assert.ok(bead);
  owl.pack.push(bead);
  const wise = sendHeroOut(equipOnHero(owl, "athena", bead.id).state, "athena");
  assert.equal(heroProjectExtra(wise.state, { id: "hall" }), 2);
  assert.equal(heroHomeLoyalty(wise.state), 4);
  const rising = startRealmProject(wise.state, "hall");
  assert.equal(rising.error, undefined);
  const done = sealDay(rising.state).state;
  assert.equal(done.campaign.realmLabor, null);
  assert.ok(done.campaign.realmWorks.some((work) => work.id === "hall"));
  assert.ok(done.chronicle.some((entry) => entry.text.includes("Athena")));

  const founder = wake(createGame(setup()), "theseus");
  const maze = makePiece("Wool cloak", "common", "theseus-wool");
  assert.ok(maze);
  founder.pack.push(maze);
  const stones = sendHeroOut(equipOnHero(founder, "theseus", maze.id).state, "theseus");
  assert.equal(heroProjectExtra(stones.state, { id: "border" }), 1);
  assert.equal(heroProjectExtra(stones.state, { id: "bench", bench: "forge" }), 0);
  assert.equal(heroExtraTeach(stones.state), 0);

  const plainCraft = createGame(setup());
  plainCraft.campaign.buildings.forge = 1;
  plainCraft.player.stash.iron += 2;
  plainCraft.player.gold += 10;
  const plainKnife = craft(plainCraft, "knife");
  assert.equal(plainKnife.state.pack.find((gear) => gear.name === "Road knife")?.rarity, "common");

  const smithHero = wake(createGame(setup()), "moth");
  const pick = makePiece("Mine pick", "common", "moth-pick");
  assert.ok(pick);
  smithHero.pack.push(pick);
  smithHero.campaign.buildings.forge = 1;
  smithHero.player.stash.iron += 4;
  smithHero.player.gold += 30;
  const tooled = sendHeroOut(equipOnHero(smithHero, "moth", pick.id).state, "moth");
  assert.equal(heroMeetingBonus(tooled.state, "walk"), 0.03);
  const finer = craft(tooled.state, "knife");
  assert.equal(finer.error, undefined);
  assert.equal(finer.state.pack.find((gear) => gear.name === "Road knife")?.rarity, "uncanny");
  const bench = startRealmProject(finer.state, "bench", "forge");
  assert.equal(bench.error, undefined);
  const stepped = sealDay(bench.state).state;
  assert.equal(stepped.campaign.realmLabor?.spent, 2);

  const lucky = wake(createGame(setup()), "odysseus");
  const plainCloak = makePiece("Wool cloak", "common", "ody-wool");
  assert.ok(plainCloak);
  lucky.pack.push(plainCloak);
  const sailed = sendHeroOut(equipOnHero(lucky, "odysseus", plainCloak.id).state, "odysseus");
  assert.equal(heroRelicBonus(sailed.state, "walk"), 0.1);
  assert.equal(heroExtraTeach(sailed.state), 0);
  const learned = wake(createGame(setup()), "odysseus");
  const veil = makePiece("Vesper veil", "uncanny", "ody-veil");
  assert.ok(veil);
  learned.pack.push(veil);
  const veiled = sendHeroOut(equipOnHero(learned, "odysseus", veil.id).state, "odysseus");
  assert.ok(Math.abs(heroRelicBonus(veiled.state, "walk") - 0.18) < 1e-9);
  assert.equal(heroExtraTeach(veiled.state), 2);
  const belled = wake(createGame(setup()), "odysseus");
  belled.pack.push(makeRelic("ford-bell", "ody-bell"));
  const ringing = sendHeroOut(equipOnHero(belled, "odysseus", "ody-bell").state, "odysseus");
  assert.equal(heroExtraTeach(ringing.state), 4);
  assert.ok(Math.abs(heroRelicBonus(ringing.state, "walk") - 0.24) < 1e-9);
  assert.equal(heroSynergyRead(ringing.state, "odysseus").find((row) => row.name === "Bell on the long road")?.state, "active");

  const trader = wake(createGame(setup()), "bran");
  const purse = makePiece("Salt cloak", "common", "bran-salt");
  assert.ok(purse);
  trader.pack.push(purse);
  const guarded = sendHeroOut(equipOnHero(trader, "bran", purse.id).state, "bran");
  assert.equal(heroCallSooner(guarded.state), 2);
  assert.equal(heroWagonExtra(guarded.state), 2);
  assert.equal(expeditionGap(guarded.state), EXPEDITION_GAP - 2);

  const market = createGame(setup());
  const listed = sellPrice(market, "wool");
  const runner = wake(createGame(setup()), "ivy");
  const salt = makePiece("Salt cloak", "common", "ivy-salt");
  assert.ok(salt);
  runner.pack.push(salt);
  const priced = sendHeroOut(equipOnHero(runner, "ivy", salt.id).state, "ivy");
  assert.equal(heroSaleBonus(priced.state), 2);
  assert.equal(sellPrice(priced.state, "wool"), listed + 3);

  const charter = wake(createGame(setup()), "ivy");
  charter.pack.push(makeRelic("salt-charter", "ivy-charter"));
  const quietSalt = setEdict(charter, "greenmere", "salt-road");
  assert.equal(quietSalt.error, undefined);
  const loud = sealDay(quietSalt.state).state;
  const wornCharter = sendHeroOut(equipOnHero(quietSalt.state, "ivy", "ivy-charter").state, "ivy");
  assert.equal(heroSaltQuiet(wornCharter.state), true);
  const hushed = sealDay(wornCharter.state).state;
  assert.equal(hushed.wyrm.ire, loud.wyrm.ire - 1);

  const sky = wake(createGame(setup()), "zeus");
  sky.pack.push(makeRelic("carter-knot", "zeus-knot"));
  const thunder = sendHeroOut(equipOnHero(sky, "zeus", "zeus-knot").state, "zeus");
  assert.equal(heroAllLoyalty(thunder.state), 1);
  assert.equal(heroIreEase(thunder.state), 1);
  assert.equal(heroWagonExtra(thunder.state), 8);
  assert.equal(heroCallSooner(thunder.state), 1);
  assert.equal(expeditionGap(thunder.state), EXPEDITION_GAP - 4);
  assert.equal(heroSynergyRead(thunder.state, "zeus").find((row) => row.name === "Knot under the sky")?.state, "active");
  assert.ok(gearHeroNotes(thunder.state, thunder.state.pack.find((gear) => gear.id === "zeus-knot")!).some((line) => line.includes("Zeus")));
});

function gearOut(state: GameState, id: HeroId, pieceName = "Wool cloak", pieceId = `${id}-cloak`) {
  const woke = wake(state, id);
  const piece = makePiece(pieceName, "common", pieceId);
  assert.ok(piece);
  woke.pack.push(piece);
  const worn = equipOnHero(woke, id, piece.id);
  assert.equal(worn.error, undefined);
  const sent = sendHeroOut(worn.state, id);
  assert.equal(sent.error, undefined);
  return sent.state;
}

function bondShift(before: GameState, after: GameState) {
  return after.compact.members
    .map((member, index) => ({ id: member.id, delta: member.contentment - before.compact.members[index].contentment }))
    .filter((row) => row.delta !== 0);
}

test("hero decrees and the border path change bonds and loyalty", () => {
  const bare = forcePetition(createGame(setup()), "border-quarrel");
  const open = shownPetition(bare);
  assert.equal(open?.ask?.includes("Beowulf"), true);
  assert.match(open?.standing ?? "", /fails/);
  const stand = open?.choices.find((choice) => choice.id === "stand");
  assert.equal(stand?.branch, "base");
  assert.match(stand?.detail ?? "", /cools by 8/);
  assert.match(stand?.aside ?? "", /Beowulf/);
  assert.equal(open?.choices.find((choice) => choice.id === "purse")?.aside, undefined);
  const failed = choosePetition(bare, "stand");
  assert.equal(failed.error, undefined);
  const cooled = bondShift(bare, failed.state);
  assert.equal(cooled.length, 1);
  assert.equal(cooled[0].delta, -8);
  assert.equal(homeOf(failed.state)?.mood, (homeOf(bare)?.mood ?? 0) - 4);
  assert.equal(failed.state.marks.find((mark) => mark.id === "petition:border-quarrel:stand")?.lasting.moodDawn, -1);

  const bought = choosePetition(forcePetition(createGame(setup()), "border-quarrel"), "purse");
  assert.equal(bought.state.player.gold, createGame(setup()).player.gold - 4);
  assert.deepEqual(
    bondShift(createGame(setup()), bought.state).map((row) => row.delta),
    [3],
  );

  const pike = gearOut(createGame(setup()), "tam", "Deer spear", "quarrel-pike");
  const held = shownPetition(forcePetition(pike, "border-quarrel"));
  assert.equal(held?.choices.find((choice) => choice.id === "stand")?.branch, "alt");
  assert.match(held?.standing ?? "", /Tam Pike/);
  const yard = choosePetition(forcePetition(pike, "border-quarrel"), "stand");
  assert.deepEqual(
    bondShift(pike, yard.state).map((row) => row.delta),
    [5],
  );
  assert.equal(yard.state.marks.find((mark) => mark.id === "petition:border-quarrel:stand")?.lasting.moodDawn, undefined);

  const wolf = gearOut(createGame(setup()), "beowulf", "Deer spear", "quarrel-spear");
  let late = forcePetition(createGame(setup()), "border-quarrel");
  assert.equal(late.petition?.choices.find((choice) => choice.id === "stand")?.branch, "base");
  late = gearOut(late, "beowulf", "Deer spear", "late-spear");
  assert.equal(late.petition?.choices.find((choice) => choice.id === "stand")?.branch, "base");
  assert.equal(shownPetition(late)?.choices.find((choice) => choice.id === "stand")?.branch, "best");
  const settled = choosePetition(late, "stand");
  assert.deepEqual(
    bondShift(late, settled.state).map((row) => row.delta),
    [10],
  );
  assert.equal(homeOf(settled.state)?.mood, (homeOf(late)?.mood ?? 0) + 4);
  assert.equal(settled.state.player.renown, late.player.renown + 1);
  assert.equal(settled.state.marks.find((mark) => mark.id === "petition:border-quarrel:stand")?.lasting.moodDawn, 1);
  assert.equal(shownPetition(forcePetition(wolf, "border-quarrel"))?.choices.find((choice) => choice.id === "stand")?.branch, "best");

  const court = shownPetition(forcePetition(createGame(setup()), "olive-court"));
  assert.match(court?.ask ?? "", /Athena/);
  assert.equal(court?.choices.find((choice) => choice.id === "court")?.branch, "base");
  const missed = choosePetition(forcePetition(createGame(setup()), "olive-court"), "court");
  assert.equal(homeOf(missed.state)?.mood, (homeOf(createGame(setup()))?.mood ?? 0) - 6);
  assert.equal(missed.state.marks.find((mark) => mark.id === "petition:olive-court:court")?.lasting.moodDawn, -1);

  const owl = wake(createGame(setup()), "athena");
  const cloak = makePiece("Wool cloak", "common", "athena-court");
  assert.ok(cloak);
  owl.pack.push(cloak);
  const stationed = equipOnHero(owl, "athena", cloak.id).state;
  assert.equal(shownPetition(forcePetition(stationed, "olive-court"))?.choices.find((choice) => choice.id === "court")?.branch, "alt");
  const improved = choosePetition(forcePetition(stationed, "olive-court"), "court");
  assert.equal(homeOf(improved.state)?.mood, (homeOf(stationed)?.mood ?? 0) + 5);
  assert.equal(improved.state.player.renown, stationed.player.renown + 1);
  assert.equal(improved.state.marks.find((mark) => mark.id === "petition:olive-court:court")?.lasting.moodDawn, undefined);

  const counted = sendHeroOut(stationed, "athena").state;
  assert.equal(shownPetition(forcePetition(counted, "olive-court"))?.choices.find((choice) => choice.id === "court")?.branch, "best");
  const wise = choosePetition(forcePetition(counted, "olive-court"), "court");
  assert.equal(homeOf(wise.state)?.mood, (homeOf(counted)?.mood ?? 0) + 8);
  assert.equal(wise.state.player.renown, counted.player.renown + 2);
  assert.equal(wise.state.marks.find((mark) => mark.id === "petition:olive-court:court")?.lasting.moodDawn, 1);

  const founderCourt = gearOut(createGame(setup()), "theseus");
  assert.equal(shownPetition(forcePetition(founderCourt, "olive-court"))?.choices.find((choice) => choice.id === "court")?.branch, "alt");

  let parley = forcePetition(createGame(setup()), "long-parley");
  assert.equal(shownPetition(parley)?.choices.find((choice) => choice.id === "speak")?.branch, "base");
  const collapsed = choosePetition(parley, "speak");
  assert.deepEqual(
    bondShift(parley, collapsed.state).map((row) => row.delta),
    [-6],
  );
  parley = gearOut(parley, "odysseus");
  assert.equal(parley.petition?.choices.find((choice) => choice.id === "speak")?.branch, "base");
  assert.equal(shownPetition(parley)?.choices.find((choice) => choice.id === "speak")?.branch, "alt");
  const talked = choosePetition(parley, "speak");
  assert.equal(talked.state.player.gold, parley.player.gold + 3);
  assert.equal(talked.state.player.renown, parley.player.renown + 2);
  assert.deepEqual(
    bondShift(parley, talked.state).map((row) => row.delta),
    [8],
  );

  const drivers = shownPetition(forcePetition(createGame(setup()), "wagon-oath"));
  assert.equal(drivers?.choices.find((choice) => choice.id === "send")?.branch, "alt");
  assert.match(drivers?.standing ?? "", /Sela/);
  assert.match(drivers?.choices.find((choice) => choice.id === "send")?.aside ?? "", /fails to appear/);
  const rested = restHeroAtHold(createGame(setup()), "sela").state;
  const empty = shownPetition(forcePetition(rested, "wagon-oath"));
  assert.equal(empty?.choices.find((choice) => choice.id === "send")?.branch, "base");
  const snubbed = choosePetition(forcePetition(rested, "wagon-oath"), "send");
  assert.equal(snubbed.state.politics.conflictHeat, rested.politics.conflictHeat + 6);
  assert.equal(homeOf(snubbed.state)?.mood, (homeOf(rested)?.mood ?? 0) - 3);
  assert.deepEqual(
    bondShift(rested, snubbed.state).map((row) => row.delta),
    [-6],
  );

  const captain = gearOut(createGame(setup()), "bran", "Salt cloak", "bran-oath");
  captain.politics.conflictHeat = 10;
  assert.equal(shownPetition(forcePetition(captain, "wagon-oath"))?.choices.find((choice) => choice.id === "send")?.branch, "best");
  const sworn = choosePetition(forcePetition(captain, "wagon-oath"), "send");
  assert.equal(sworn.error, undefined);
  assert.equal(sworn.state.player.gold, captain.player.gold + 4);
  assert.equal(sworn.state.politics.conflictHeat, 6);
  assert.deepEqual(
    bondShift(captain, sworn.state).map((row) => row.delta),
    [6],
  );

  assert.equal(borderPathRead(createGame(setup())).met, false);
  assert.match(borderPathRead(createGame(setup())).line, /Theseus/);
  const stones = gearOut(createGame(setup()), "theseus", "Wool cloak", "theseus-path");
  assert.equal(heroBorderSeal(stones), 6);
  assert.equal(borderPathRead(stones).met, true);

  function clearBorder(state: GameState) {
    state.player.stash.timber += 4;
    state.player.gold += 20;
    const hold = state.compact.members[0].holdId;
    state.compact.members[0].contentment = 40;
    const started = startRealmProject(state, "border", hold);
    assert.equal(started.error, undefined);
    const labor = started.state.campaign.realmLabor;
    assert.ok(labor);
    labor.spent = 2;
    return sealDay(started.state).state;
  }

  const plainPath = clearBorder(createGame(setup()));
  const laid = clearBorder(stones);
  assert.equal(laid.campaign.realmLabor, null);
  assert.equal(plainPath.campaign.realmLabor, null);
  assert.equal(laid.compact.members[0].contentment, plainPath.compact.members[0].contentment + 6);
  assert.match(laid.campaign.realmNotice ?? "", /Theseus/);
  assert.match(laid.compact.members[0].lastNote, /Theseus/);
  assert.equal(shownPetition(forcePetition(createGame(setup()), "three-voices"))?.ask, undefined);
});

test("political projects ask for heroes and leave a lasting mark", () => {
  const fresh = createGame(setup());
  assert.equal(fresh.politics.sharedGoals.length, 0);
  assert.equal(politicalRead(fresh, "compact")?.met, false);
  assert.match(politicalRead(fresh, "compact")?.line ?? "", /Beowulf/);
  assert.equal(politicalRead(fresh, "counsel")?.met, false);
  assert.match(politicalRead(fresh, "counsel")?.line ?? "", /Athena/);
  assert.equal(politicalRead(fresh, "charter")?.met, true);
  assert.match(politicalRead(fresh, "charter")?.line ?? "", /Sela/);
  assert.match(politicalRead(fresh, "charter")?.line ?? "", /Bran/);
  assert.equal(politicalRead(fresh, "oathstone")?.met, false);
  assert.match(startRealmProject(fresh, "oathstone").error ?? "", /two heroes/i);
  assert.equal(politicalRead(gearOut(createGame(setup()), "theseus"), "compact")?.met, true);
  assert.equal(politicalRead(gearOut(createGame(setup()), "heracles", "Road knife", "labor-watch"), "compact")?.met, true);
  assert.equal(politicalRead(gearOut(createGame(setup()), "odin", "Crow bead", "odin-counsel"), "counsel")?.met, true);
  assert.equal(politicalRead(restHeroAtHold(createGame(setup()), "sela").state, "charter")?.met, false);
  assert.match(politicalRead(gearOut(createGame(setup()), "tam"), "charter")?.line ?? "", /Tam|Sela|geared/);

  const rested = restHeroAtHold(createGame(setup()), "sela").state;
  rested.player.gold += 40;
  rested.player.stash.salt += 4;
  const charterStarted = startRealmProject(rested, "charter");
  assert.equal(charterStarted.error, undefined);
  assert.equal(charterStarted.state.player.gold, rested.player.gold - 12);
  assert.equal(charterStarted.state.player.stash.salt, rested.player.stash.salt - 2);
  const charterLabor = charterStarted.state.campaign.realmLabor;
  assert.ok(charterLabor);
  charterLabor.spent = 2;
  const charterWait = sealDay(charterStarted.state).state;
  assert.equal(charterWait.campaign.realmLabor?.id, "charter");
  assert.equal(charterWait.campaign.realmLabor?.spent, 2);
  assert.ok(charterWait.chronicle.some((entry) => /Bran, Corin, Zeus, or any geared company/.test(entry.text)));
  const chartered = gearOut(charterWait, "bran", "Salt cloak", "charter-bran");
  chartered.politics.conflictHeat = 20;
  chartered.expedition.phase = "idle";
  chartered.outcome = "held";
  chartered.outcomeDismissed = true;
  chartered.expedition.nextCallDay = chartered.day + 20;
  const charterDone = sealDay(chartered).state;
  assert.equal(charterDone.campaign.realmLabor, null);
  assert.ok(charterDone.campaign.realmWorks.some((work) => work.id === "charter"));
  assert.equal(charterDone.politics.conflictHeat, 12);
  assert.equal(charterDone.expedition.phase, "idle");
  assert.equal(charterDone.expedition.nextCallDay, chartered.day + 20 - CHARTER_SOONER);
  const withoutCharter = structuredClone(charterDone);
  withoutCharter.campaign.realmWorks = withoutCharter.campaign.realmWorks.filter((work) => work.id !== "charter");
  assert.equal(expeditionGap(charterDone), expeditionGap(withoutCharter) - CHARTER_SOONER);
  assert.ok(charterDone.politics.sharedGoals.includes("charter"));
  const cooled = sealDay(charterDone).state;
  assert.equal(cooled.politics.conflictHeat, charterDone.politics.conflictHeat - 1);

  const paidPlain = createGame(setup());
  paidPlain.player.stash.grain += 30;
  paidPlain.player.stash.iron += 20;
  paidPlain.player.stash.salt += 20;
  let plainHeld = pledgePersonal(paidPlain, "grain", 20).state;
  plainHeld = pledgePersonal(plainHeld, "iron", 12).state;
  plainHeld = pledgePersonal(plainHeld, "salt", 10).state;
  const paidCharter = createGame(setup());
  paidCharter.campaign.realmWorks = [{ id: "charter" }];
  paidCharter.player.stash.grain += 30;
  paidCharter.player.stash.iron += 20;
  paidCharter.player.stash.salt += 20;
  let charterHeld = pledgePersonal(paidCharter, "grain", 20).state;
  charterHeld = pledgePersonal(charterHeld, "iron", 12).state;
  charterHeld = pledgePersonal(charterHeld, "salt", 10).state;
  assert.equal(charterHeld.outcome, "held");
  assert.equal(charterHeld.player.gold, plainHeld.player.gold + CHARTER_PAY);

  let counsel = createGame(setup());
  counsel.player.gold += 40;
  counsel.player.stash.wool += 4;
  const counselStarted = startRealmProject(counsel, "counsel");
  assert.equal(counselStarted.error, undefined);
  assert.equal(counselStarted.state.player.stash.wool, counsel.player.stash.wool - 2);
  const counselLabor = counselStarted.state.campaign.realmLabor;
  assert.ok(counselLabor);
  counselLabor.spent = 2;
  const counselWait = sealDay(counselStarted.state).state;
  assert.equal(counselWait.campaign.realmLabor?.spent, 2);
  assert.ok(counselWait.chronicle.some((entry) => /Athena or Odin/.test(entry.text)));
  assert.ok(setEdict(counselWait, counselWait.player.holdId, "counsel").error);
  const wise = gearOut(counselWait, "athena");
  assert.equal(politicalRead(wise, "counsel")?.met, true);
  const counselDone = sealDay(wise).state;
  assert.equal(counselDone.campaign.realmLabor, null);
  assert.equal(influenceCap(counselDone), 80);
  counselDone.campaign.realmWorks.push({ id: "hall" });
  assert.equal(influenceCap(counselDone), 80);
  assert.ok(counselDone.politics.sharedGoals.includes("counsel"));
  const law = setEdict(counselDone, counselDone.player.holdId, "counsel");
  assert.equal(law.error, undefined);
  const stripped = structuredClone(law.state);
  const strippedHome = stripped.settlements.find((item) => item.holdId === stripped.player.holdId);
  assert.ok(strippedHome);
  strippedHome.edict = "custom";
  const moodOf = (state: GameState) => state.settlements.find((item) => item.holdId === state.player.holdId)?.mood ?? 0;
  assert.equal(moodOf(sealDay(law.state).state), moodOf(sealDay(stripped).state) + 2);

  function prepCompact(state: GameState, hero: boolean) {
    const next = hero ? gearOut(state, "beowulf", "Deer spear", "watch-spear") : state;
    next.player.gold += 40;
    next.player.stash.iron += 4;
    next.compact.members[0].contentment = 40;
    const started = startRealmProject(next, "compact", next.compact.members[0].holdId);
    assert.equal(started.error, undefined);
    const labor = started.state.campaign.realmLabor;
    assert.ok(labor);
    labor.spent = 3;
    started.state.expedition.phase = "idle";
    started.state.outcome = "held";
    started.state.outcomeDismissed = true;
    started.state.expedition.nextCallDay = started.state.day + 30;
    return started.state;
  }
  const compactWait = sealDay(prepCompact(createGame(setup()), false)).state;
  const compactDone = sealDay(prepCompact(createGame(setup()), true)).state;
  assert.equal(compactWait.campaign.realmLabor?.id, "compact");
  assert.equal(compactWait.expedition.phase, "idle");
  assert.equal(compactDone.campaign.realmLabor, null);
  assert.equal(compactDone.expedition.phase, "idle");
  assert.equal(compactDone.compact.members[0].contentment, compactWait.compact.members[0].contentment + 10);
  assert.match(compactDone.campaign.realmNotice ?? "", /Beowulf/);
  assert.ok(compactDone.politics.sharedGoals.some((goal) => goal.startsWith("compact:")));
  const savedCompact = parseSave(JSON.stringify(prepCompact(createGame(setup()), true)));
  assert.equal(savedCompact?.campaign.realmLabor?.id, "compact");
  assert.equal(savedCompact?.campaign.realmLabor?.holdId, compactDone.compact.members[0].holdId);
  const watched = createGame(setup());
  watched.campaign.realmWorks = [{ id: "compact", holdId: watched.compact.members[0].holdId }];
  const alone = createGame(setup());
  assert.equal(
    sealDay(watched).state.compact.members[0].contentment,
    sealDay(alone).state.compact.members[0].contentment + 3,
  );
  const petitionIds = ["oven-line", "firewood", "column", "three-voices", "watch-law", "border-quarrel", "olive-court", "long-parley", "wagon-oath"];
  const quiet = createGame(setup());
  quiet.day = 15;
  quiet.petitionsSeen = petitionIds;
  quiet.omen = null;
  quiet.crossing = null;
  quiet.petition = null;
  const quietHome = quiet.settlements.find((item) => item.holdId === quiet.player.holdId);
  assert.ok(quietHome);
  quietHome.bread = 1;
  quiet.expedition.phase = "idle";
  quiet.outcome = "held";
  quiet.outcomeDismissed = true;
  assert.equal(offerPetition(quiet), null);
  quiet.campaign.realmWorks = [{ id: "compact", holdId: quiet.compact.members[0].holdId }];
  assert.match(offerPetition(quiet) ?? "", /joint watch/i);
  const asked = forcePetition(quiet, "joint-watch");
  asked.politics.conflictHeat = 10;
  const beforeBond = asked.compact.members.map((member) => member.contentment);
  const kept = choosePetition(asked, "keep");
  assert.equal(kept.error, undefined);
  assert.equal(kept.state.politics.conflictHeat, 7);
  assert.ok(kept.state.compact.members.some((member, index) => member.contentment === beforeBond[index] + 6));

  const company = gearOut(createGame(setup()), "tam");
  assert.equal(politicalRead(company, "oathstone")?.met, true);
  company.player.gold += 40;
  company.player.stash.relics += 2;
  const stoneStarted = startRealmProject(company, "oathstone");
  assert.equal(stoneStarted.error, undefined);
  assert.equal(stoneStarted.state.player.stash.relics, company.player.stash.relics - 1);
  const stoneLabor = stoneStarted.state.campaign.realmLabor;
  assert.ok(stoneLabor);
  stoneLabor.spent = 4;
  const stoneDone = sealDay(stoneStarted.state).state;
  assert.equal(stoneDone.campaign.realmLabor, null);
  assert.ok(stoneDone.politics.sharedGoals.includes("oathstone"));
  assert.equal(allianceBoard(stoneDone).goals.find((goal) => goal.id === "oath-stone")?.progress, 1);
  assert.match(allianceBoard(stoneDone).seats[0].note, /oath stone/i);
  assert.ok(stoneDone.marks.some((mark) => mark.id.startsWith("politics:oathstone")));
  const twin = structuredClone(stoneDone);
  twin.campaign.realmWorks = twin.campaign.realmWorks.filter((work) => work.id !== "oathstone");
  assert.equal(
    sealDay(stoneDone).state.compact.members[0].contentment,
    sealDay(twin).state.compact.members[0].contentment + 1,
  );
  const savedStone = parseSave(JSON.stringify(stoneDone));
  assert.ok(savedStone?.politics.sharedGoals.includes("oathstone"));
  assert.ok(savedStone?.campaign.realmWorks.some((work) => work.id === "oathstone"));
});

function wearRelic(id: HeroId, relic: Parameters<typeof makeRelic>[0], gearId: string) {
  const woke = wake(createGame(setup()), id);
  woke.pack.push(makeRelic(relic, gearId));
  const worn = equipOnHero(woke, id, gearId);
  assert.equal(worn.error, undefined);
  return worn.state;
}

test("relic and hero pairs open choices the season did not have", () => {
  const plainFord = forceCrossing(createGame(setup()), "toll-hag");
  assert.equal(plainFord.crossing?.choices.some((choice) => choice.id === "labor"), false);

  const cloaked = wearRelic("heracles", "unspoken-hem", "hem-labor");
  assert.equal(heroWearsRelic(cloaked, "heracles", "unspoken-hem"), false);
  const waiting = forceCrossing(cloaked, "toll-hag");
  assert.equal(shownCrossing(waiting)?.choices.some((choice) => choice.id === "labor"), false);
  const laborer = sendHeroOut(waiting, "heracles");
  assert.equal(laborer.error, undefined);
  assert.equal(laborer.state.crossing?.choices.some((choice) => choice.id === "labor"), false);
  const liveLabor = shownCrossing(laborer.state)?.choices.find((choice) => choice.id === "labor");
  assert.match(liveLabor?.because ?? "", /Heracles wears the Unspoken Hem/);
  assert.equal(heroSynergyRead(laborer.state, "heracles").find((row) => row.name === "Hem of the labor")?.state, "active");
  const beforeGold = laborer.state.player.gold;
  const beforeIron = laborer.state.player.stash.iron;
  const worked = chooseCrossing(laborer.state, "labor");
  assert.equal(worked.error, undefined);
  assert.equal(worked.state.player.gold, beforeGold);
  assert.equal(worked.state.player.stash.iron, beforeIron + 2);
  assert.ok(worked.state.player.renown > laborer.state.player.renown);
  assert.match(worked.state.chronicle.map((entry) => entry.text).join(" "), /Unspoken Hem/);

  const charter = wearRelic("ivy", "salt-charter", "ivy-brine");
  assert.equal(edictAvailable(charter, "brine-fords"), false);
  assert.ok(setEdict(charter, "greenmere", "brine-fords").error);
  const runner = sendHeroOut(charter, "ivy").state;
  assert.equal(edictAvailable(runner, "brine-fords"), true);
  assert.equal(edictAvailable(runner, "salt-road"), true);
  const widow = shownCrossing(forceCrossing(charter, "salt-widow"));
  assert.equal(widow?.choices.some((choice) => choice.id === "brine"), false);
  const taught = shownCrossing(forceCrossing(runner, "salt-widow"));
  assert.match(taught?.choices.find((choice) => choice.id === "brine")?.because ?? "", /Ivy wears the Salt Charter/);
  const brinedByWidow = chooseCrossing(forceCrossing(runner, "salt-widow"), "brine");
  assert.equal(brinedByWidow.error, undefined);
  assert.equal(brinedByWidow.state.settlements[0].edict, "brine-fords");

  const frost = sendHeroOut(wearRelic("ivy", "salt-charter", "ivy-frost"), "ivy").state;
  frost.day = 10;
  const salted = sealDay(setEdict(structuredClone(frost), "greenmere", "salt-road").state).state;
  const brined = sealDay(setEdict(structuredClone(frost), "greenmere", "brine-fords").state).state;
  assert.equal(homeOf(brined)?.hearth, (homeOf(salted)?.hearth ?? 0) + 1);
  assert.equal(homeOf(brined)?.mood, (homeOf(salted)?.mood ?? 0) + 1);
  assert.equal(brined.wyrm.ire, salted.wyrm.ire);

  const sky = sendHeroOut(wearRelic("zeus", "carter-knot", "zeus-sky"), "zeus").state;
  assert.equal(knotCallRead(sky)?.who, "zeus");
  assert.match(knotCallRead(sky)?.because ?? "", /Zeus wears Carter's Knot/);
  const knotted = knotTheCall(sky);
  assert.equal(knotted.error, undefined);
  assert.equal(knotted.state.compact.levy.grain, 4);
  assert.equal(knotted.state.compact.levy.iron, 2);
  assert.equal(knotted.state.compact.levy.salt, 2);
  assert.ok(knotTheCall(knotted.state).error);
  const kept = parseSave(JSON.stringify(knotted.state));
  assert.ok(kept?.relicActs.includes("carter-knot"));
  assert.ok(knotTheCall(kept!).error);

  const idle = sendHeroOut(wearRelic("zeus", "carter-knot", "zeus-idle"), "zeus").state;
  idle.expedition.phase = "idle";
  idle.expedition.nextCallDay = idle.day + 6;
  const sooner = knotTheCall(idle);
  assert.equal(sooner.error, undefined);
  assert.equal(sooner.state.expedition.nextCallDay, idle.day + 4);
  assert.equal(sooner.state.compact.levy.grain, idle.compact.levy.grain);

  const wool = sendHeroOut(wearRelic("bran", "carter-knot", "bran-wool-knot"), "bran").state;
  const woolKnot = knotTheCall(wool);
  assert.equal(woolKnot.error, undefined);
  assert.equal(woolKnot.state.compact.levy.grain, 2);
  assert.equal(woolKnot.state.compact.levy.iron, 0);
  assert.equal(woolKnot.state.compact.levy.salt, 0);
  assert.match(woolKnot.state.chronicle.map((entry) => entry.text).join(" "), /Bran/);

  const bareQuarrel = shownPetition(forcePetition(createGame(setup()), "border-quarrel"));
  assert.equal(bareQuarrel?.choices.some((choice) => choice.id === "barrow"), false);
  assert.equal(edictAvailable(createGame(setup()), "barrow-watch"), false);
  const bandedHold = wearRelic("beowulf", "barrow-band", "wolf-band");
  const banded = sendHeroOut(bandedHold, "beowulf").state;
  assert.equal(edictAvailable(banded, "barrow-watch"), true);
  const named = shownPetition(forcePetition(banded, "border-quarrel"))?.choices.find((choice) => choice.id === "barrow");
  assert.match(named?.because ?? "", /Beowulf wears the Barrow Band/);
  const before = banded.compact.members.map((member) => member.contentment);
  const settled = choosePetition(forcePetition(banded, "border-quarrel"), "barrow");
  assert.equal(settled.error, undefined);
  assert.equal(homeOf(settled.state)?.edict, "barrow-watch");
  assert.equal(homeOf(settled.state)?.mood, (homeOf(banded)?.mood ?? 0) + 6);
  assert.ok(settled.state.compact.members.some((member, index) => member.contentment === before[index] + 12));
  const cooled = sealDay(structuredClone(banded)).state;
  const watched = structuredClone(banded);
  watched.settlements.find((item) => item.holdId === watched.player.holdId)!.edict = "barrow-watch";
  const held = sealDay(watched).state;
  const cooledBond = cooled.compact.members.map((member) => member.contentment);
  const heldBond = held.compact.members.map((member) => member.contentment);
  assert.ok(heldBond.some((value, index) => value === cooledBond[index] + 2));
  assert.match(held.chronicle.map((entry) => entry.text).join(" "), /barrow watch/);

  assert.equal(availableCreatureIds(createGame(setup())).includes("bell-road"), false);
  const sailor = sendHeroOut(wearRelic("odysseus", "ford-bell", "ody-road"), "odysseus").state;
  assert.equal(availableCreatureIds(sailor).includes("bell-road"), true);
  assert.equal(bellRoadReady(sailor), true);
  for (const hero of sailor.heroes) {
    if (hero.id !== "zeus") hero.unlocked = true;
  }
  const ringing = openBellRoad(sailor);
  assert.equal(ringing.error, undefined);
  assert.equal(ringing.state.crossing?.id, "bell-road");
  assert.match(ringing.state.crossing?.body ?? "", /Odysseus wears the Ford Bell/);
  assert.match(ringing.state.crossing?.choices.find((choice) => choice.id === "answer")?.because ?? "", /Ford Bell/);
  const met = chooseCrossing(ringing.state, "answer");
  assert.equal(met.error, undefined);
  assert.equal(met.state.heroes.find((hero) => hero.id === "zeus")?.unlocked, true);
  assert.match(met.message ?? "", /Zeus answers the Ford Bell/);
  assert.match(met.message ?? "", /Odysseus wears the Ford Bell/);
  assert.ok(openBellRoad(met.state).error);
});

function bellRoadReady(state: GameState) {
  return availableCreatureIds(state).includes("bell-road") && !(state.creaturesSeen ?? []).includes("bell-road");
}

test("valley heroes unlock on short chains and wake their gear", () => {
  const fresh = createGame(setup());
  assert.equal(fresh.heroes.find((hero) => hero.id === "pell")?.unlocked, false);
  assert.equal(fresh.heroes.find((hero) => hero.id === "ness")?.unlocked, false);
  assert.equal(fresh.heroes.find((hero) => hero.id === "wynn")?.unlocked, false);
  assert.equal(fresh.heroes.find((hero) => hero.id === "corin")?.unlocked, false);
  assert.equal(fresh.heroTasks.find((task) => task.id === "ness-ford")?.status, "open");
  assert.equal(fresh.heroTasks.find((task) => task.id === "pell-work")?.status, "open");
  assert.equal(fresh.heroTasks.find((task) => task.id === "wynn-work")?.status, "open");
  assert.equal(fresh.heroTasks.find((task) => task.id === "corin-work")?.status, "open");

  let mill = createGame(setup());
  mill.miles = 3;
  mill = sealDay(mill).state;
  assert.equal(mill.heroes.find((hero) => hero.id === "pell")?.unlocked, false);
  assert.equal(mill.heroTasks.find((task) => task.id === "pell-walk")?.status, "claimed");
  mill.campaign.buildings.yard = 1;
  mill = sealDay(mill).state;
  assert.equal(mill.heroes.find((hero) => hero.id === "pell")?.unlocked, true);
  assert.equal(mill.heroes.find((hero) => hero.id === "athena")?.unlocked, false);

  let river = createGame(setup());
  river.marks.push({
    id: "toll-hag:pay",
    creature: "The old woman at the ford",
    choice: "pay",
    day: 1,
    summary: "Paid the ford.",
    lasting: {},
  });
  river = sealDay(river).state;
  assert.equal(river.heroes.find((hero) => hero.id === "ness")?.unlocked, true);
  assert.equal(river.heroes.find((hero) => hero.id === "wynn")?.unlocked, false);

  let mound = createGame(setup());
  mound.marks.push({
    id: "barrow-hound:feed",
    creature: "The grave hound",
    choice: "feed",
    day: 1,
    summary: "Fed the hound.",
    lasting: {},
  });
  mound.campaign.buildings.yard = 1;
  mound = sealDay(mound).state;
  assert.equal(mound.heroes.find((hero) => hero.id === "wynn")?.unlocked, true);
  assert.equal(mound.heroes.find((hero) => hero.id === "odin")?.unlocked, false);

  let trader = createGame(setup());
  trader.triumphs = 1;
  trader = sealDay(trader).state;
  assert.equal(trader.heroes.find((hero) => hero.id === "corin")?.unlocked, false);
  assert.equal(trader.heroTasks.find((task) => task.id === "corin-call")?.status, "claimed");
  assert.equal(trader.heroes.find((hero) => hero.id === "ivy")?.unlocked, true);
  trader.campaign.buildings.yard = 1;
  trader = sealDay(trader).state;
  assert.equal(trader.heroes.find((hero) => hero.id === "corin")?.unlocked, true);
  assert.equal(trader.heroes.find((hero) => hero.id === "zeus")?.unlocked, false);

  const baseYield = dawnYield(createGame(setup()));
  const miller = wake(createGame(setup()), "pell");
  const peg = makePiece("Road knife", "common", "pell-peg");
  assert.ok(peg);
  miller.pack.push(peg);
  const turning = sendHeroOut(equipOnHero(miller, "pell", peg.id).state, "pell");
  assert.equal(heroDawnYield(turning.state), 2);
  assert.equal(dawnYield(turning.state), baseYield + 2);
  assert.equal(heroProjectExtra(turning.state, { id: "hall" }), 1);
  assert.equal(heroProjectExtra(turning.state, { id: "watchtower" }), 1);
  assert.equal(heroProjectExtra(turning.state, { id: "bench", bench: "forge" }), 1);
  assert.equal(heroSynergyRead(turning.state, "pell").find((row) => row.name === "Smith on the wheel")?.state, "active");

  const knotted = sendHeroOut(wearRelic("pell", "carter-knot", "pell-knot"), "pell").state;
  assert.equal(knotCallRead(knotted)?.who, "pell");
  assert.match(knotCallRead(knotted)?.because ?? "", /Pell wears Carter's Knot/);
  const milled = knotTheCall(knotted);
  assert.equal(milled.error, undefined);
  assert.equal(milled.state.compact.levy.grain, knotted.compact.levy.grain + 1);
  assert.match(milled.state.chronicle.map((entry) => entry.text).join(" "), /Pell knots the mill road/);

  const captain = wake(createGame(setup()), "ness");
  const ward = makePiece("Ford cloak", "uncanny", "ness-ward");
  assert.ok(ward);
  captain.pack.push(ward);
  const keeled = sendHeroOut(equipOnHero(captain, "ness", ward.id).state, "ness");
  assert.equal(heroBargainRelief(keeled.state), 2);
  assert.equal(heroStrengthRenown(keeled.state), 1);
  assert.ok(Math.abs(heroMeetingBonus(keeled.state, "walk") - 0.02) < 1e-9);

  const chartered = sendHeroOut(wearRelic("ness", "salt-charter", "ness-salt"), "ness").state;
  assert.equal(heroCharterQuiet(chartered), true);
  assert.equal(edictAvailable(chartered, "brine-fords"), false);
  const named = setEdict(chartered, "greenmere", "salt-road").state;
  const hushed = sealDay(named).state;
  const shouted = sealDay(restHeroAtHold(named, "ness").state).state;
  assert.equal(hushed.wyrm.ire, shouted.wyrm.ire - 1);

  const warden = wake(createGame(setup()), "wynn");
  const wool = makePiece("Wool cloak", "common", "wynn-wool");
  assert.ok(wool);
  warden.pack.push(wool);
  const watching = sendHeroOut(equipOnHero(warden, "wynn", wool.id).state, "wynn");
  assert.equal(heroCreatureRenown(watching.state), 1);
  assert.equal(heroIreEase(watching.state), 1);
  assert.equal(politicalRead(watching.state, "compact")?.met, true);
  assert.match(politicalRead(watching.state, "compact")?.line ?? "", /Wynn/);

  const banded = sendHeroOut(wearRelic("wynn", "barrow-band", "wynn-band"), "wynn").state;
  assert.equal(heroBandCool(banded), 3);
  const quarrel = shownPetition(forcePetition(banded, "border-quarrel"));
  assert.equal(quarrel?.choices.some((choice) => choice.id === "barrow"), false);
  assert.match(quarrel?.choices.find((choice) => choice.id === "warden")?.because ?? "", /Wynn wears the Barrow Band/);
  const before = banded.compact.members.map((member) => member.contentment);
  const settled = choosePetition(forcePetition(banded, "border-quarrel"), "warden");
  assert.equal(settled.error, undefined);
  assert.ok(settled.state.compact.members.some((member, index) => member.contentment === before[index] + 8));

  const ledger = wake(createGame(setup()), "corin");
  const ring = makePiece("Salt ring", "common", "corin-ring");
  assert.ok(ring);
  ledger.pack.push(ring);
  const trading = sendHeroOut(equipOnHero(ledger, "corin", ring.id).state, "corin");
  assert.equal(heroSaleBonus(trading.state), 2);
  assert.equal(heroCallSooner(trading.state), 1);
  assert.equal(heroWagonExtra(trading.state), 2);
  assert.equal(heroWagonGold(trading.state), 2);
  assert.equal(politicalRead(trading.state, "charter")?.met, true);
  assert.match(politicalRead(trading.state, "charter")?.who ?? "", /Corin/);
  assert.equal(shownPetition(forcePetition(trading.state, "wagon-oath"))?.choices.find((choice) => choice.id === "send")?.branch, "best");
});
