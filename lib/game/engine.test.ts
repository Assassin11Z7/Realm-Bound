import assert from "node:assert/strict";
import test from "node:test";
import { LEVY_TARGET } from "./content";
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
  raiseUndercroft,
  sealDay,
  sell,
  setReserve,
  withdraw,
} from "./engine";
import { parseSave } from "./storage";
import type { FactionId, GameState, GoodId, HoldId, NewGameSetup } from "./types";
import { GOODS, LEVY_GOODS } from "./types";

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
});
