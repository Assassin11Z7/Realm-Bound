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
  claimQuest,
  chooseCrossing,
  choosePetition,
  dismissCrossing,
  dismissOutcome,
  equipGear,
  equipOnHero,
  releaseExpedition,
  restHeroAtHold,
  sellGear,
  sendHeroOut,
  setEdict,
  stockSettlement,
  stowGear,
  withdraw,
} from "./engine";
import { parseSave } from "./storage";
import type { FactionId, GameState, GoodId, HoldId, NewGameSetup } from "./types";
import { GOODS, LEVY_GOODS } from "./types";
import { chooseSkill, setCaptainOrder, startProject } from "./progress";
import { craft, drinkPotion, storeGear } from "./craft";
import { availableCreatureIds, creatureCount, forceCrossing, forcePetition } from "./realm";
import { allianceBoard } from "./expedition";
import {
  RELIC_EXPEDITION_CHANCE,
  RELIC_WALK_CHANCE,
  carryCap,
  gearCompare,
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
  assert.equal(board.goals.length, 3);
  assert.equal(board.conflict.rivalName, null);
  const later = pledgeFromHall(state, "iron", 1);
  assert.ok(later.error);
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
