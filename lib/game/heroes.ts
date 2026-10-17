import type { GameState, Gear, HeroId, HeroRarity, HeroRecord, HeroTask, HeroTaskKind, Result, WornSlot } from "./types";
import { HERO_IDS } from "./types";
import { WORN_SLOTS, worldRng } from "./world";

export const FIELD_CAP = 3;

export interface HeroSpec {
  id: HeroId;
  name: string;
  epithet: string;
  rarity: HeroRarity;
  blurb: string;
  /** Extra teaching on a walk, while fielded and wearing gear. */
  road: number;
  /** Renown after an answered crossing, while fielded and wearing gear. */
  ford: number;
  /** Gold when a wagon call succeeds, while fielded and wearing gear. */
  wagon: number;
  /** Silhouette treatment. */
  mark: "gate" | "pike" | "wool" | "hearth" | "moth" | "salt" | "lion" | "ship" | "barrow" | "maze" | "owl" | "raven" | "bolt";
}

export const HEROES: HeroSpec[] = [
  {
    id: "sela",
    name: "Sela of the Gate",
    epithet: "gate-warden",
    rarity: "common",
    blurb: "She kept the home gate before the banner went up. The travel cloak was already hers. Walks teach a little more while she wears gear.",
    road: 1,
    ford: 0,
    wagon: 0,
    mark: "gate",
  },
  {
    id: "tam",
    name: "Tam Pike",
    epithet: "ford watch",
    rarity: "common",
    blurb: "A spearman from the river watch. He counts the fords, and an answered creature leaves a little more renown when he is geared and out.",
    road: 1,
    ford: 1,
    wagon: 0,
    mark: "pike",
  },
  {
    id: "bran",
    name: "Bran Heddle",
    epithet: "wool-road spear",
    rarity: "common",
    blurb: "He walked wool to market until the wagons needed a guard. A successful call pays 1 more gold while he wears gear.",
    road: 0,
    ford: 0,
    wagon: 1,
    mark: "wool",
  },
  {
    id: "dorrie",
    name: "Dorrie Fen",
    epithet: "hearth cousin",
    rarity: "common",
    blurb: "A cousin of the hall who stays when the bread is fair. Geared and out, she makes a walk teach one more.",
    road: 1,
    ford: 0,
    wagon: 0,
    mark: "hearth",
  },
  {
    id: "moth",
    name: "Moth Quill",
    epithet: "uncanny tracker",
    rarity: "uncanny",
    blurb: "People say the moths on the timber road follow her hood. Geared, she teaches two more on a walk and adds renown at a crossing.",
    road: 2,
    ford: 1,
    wagon: 0,
    mark: "moth",
  },
  {
    id: "ivy",
    name: "Ivy Salt",
    epithet: "salt runner",
    rarity: "uncanny",
    blurb: "She ran salt by night before any charter named her. Geared, a walk teaches more, a crossing adds renown, and a successful call pays 1 more gold.",
    road: 1,
    ford: 1,
    wagon: 1,
    mark: "salt",
  },
  {
    id: "heracles",
    name: "Heracles",
    epithet: "the laborer",
    rarity: "legendary",
    blurb: "The old laborer, come down the wagon road. Geared, crossings grant 2 renown and a successful call pays 2 more gold.",
    road: 1,
    ford: 2,
    wagon: 2,
    mark: "lion",
  },
  {
    id: "odysseus",
    name: "Odysseus",
    epithet: "the long way home",
    rarity: "legendary",
    blurb: "He has already walked a longer road than this valley. Geared, each walk teaches 3 more.",
    road: 3,
    ford: 1,
    wagon: 1,
    mark: "ship",
  },
  {
    id: "beowulf",
    name: "Beowulf",
    epithet: "hall-cleaner",
    rarity: "legendary",
    blurb: "He came for the things under the holds, not for a chair. Geared, an answered creature grants 3 renown.",
    road: 1,
    ford: 3,
    wagon: 1,
    mark: "barrow",
  },
  {
    id: "theseus",
    name: "Theseus",
    epithet: "of the stone hall",
    rarity: "legendary",
    blurb: "A founder who still walks his own roads. Geared, walks teach 2 more and crossings grant 2 renown.",
    road: 2,
    ford: 2,
    wagon: 1,
    mark: "maze",
  },
  {
    id: "athena",
    name: "Athena",
    epithet: "of the olive and the spear",
    rarity: "divine",
    blurb: "A goddess who counts works and well-led roads. Geared, a successful call pays 3 more gold, and walks and crossings both gain.",
    road: 2,
    ford: 2,
    wagon: 3,
    mark: "owl",
  },
  {
    id: "odin",
    name: "Odin",
    epithet: "the wanderer",
    rarity: "divine",
    blurb: "The one-eyed wanderer. He is almost never found by chance. Geared, walks teach 3 more and crossings grant 3 renown.",
    road: 3,
    ford: 3,
    wagon: 2,
    mark: "raven",
  },
  {
    id: "zeus",
    name: "Zeus",
    epithet: "who keeps the high weather",
    rarity: "divine",
    blurb: "The sky-father does not answer a short reign. Geared, a successful call pays 4 more gold.",
    road: 2,
    ford: 2,
    wagon: 4,
    mark: "bolt",
  },
];

export const COMING_SOON: { id: string; line: string }[] = [
  { id: "soon-east", line: "A hero from another tale. The road has not agreed to the crossing." },
  { id: "soon-west", line: "A second chair, still draped. No name is spoken yet." },
];

const RARITY_RANK: Record<HeroRarity, number> = { common: 0, uncanny: 1, legendary: 2, divine: 3 };

export function heroSpec(id: HeroId): HeroSpec {
  return HEROES.find((hero) => hero.id === id) ?? HEROES[0];
}

export function heroEffectLine(spec: HeroSpec): string {
  const parts: string[] = [];
  if (spec.road > 0) parts.push(`walks teach +${spec.road}`);
  if (spec.ford > 0) parts.push(`answered crossings grant +${spec.ford} renown`);
  if (spec.wagon > 0) parts.push(`a successful call pays +${spec.wagon} gold`);
  if (parts.length === 0) return "Gear on this hero does not change the road yet.";
  return `While this hero is out and wearing gear: ${parts.join(", ")}.`;
}

export function blankHeroTasks(): HeroTask[] {
  const task = (
    id: string,
    heroId: HeroId,
    chain: number,
    title: string,
    detail: string,
    kind: HeroTaskKind,
    need: number,
    mark = 0,
  ): HeroTask => ({ id, heroId, chain, title, detail, kind, need, mark, progress: 0, status: "open" });
  return [
    task("sela-sworn", "sela", 1, "At the raising of the banner", "Sela was already at the gate. She walks with the cloak.", "miles", 1),
    task("tam-walk", "tam", 1, "Four roads", "Walk four times. Miles on the road, not days on the seal.", "miles", 4),
    task("bran-work", "bran", 1, "One raised work", "Finish any realm project. It completes when you seal the day.", "build-max", 1),
    task("dorrie-name", "dorrie", 1, "A name in the valley", "Reach 8 renown. Pledges, gifts, and answered roads all count.", "renown", 8),
    task("moth-walk", "moth", 1, "Two quiet miles", "Walk twice, so the timber road knows the banner.", "miles", 2),
    task("moth-mark", "moth", 2, "Answer what walks", "Strike a bargain with a creature. Letting them pass does not count.", "marks", 1),
    task("ivy-call", "ivy", 1, "One wagon home", "Finish one successful call of the wagons.", "triumphs", 1),
    task("heracles-calls", "heracles", 1, "Two labors of the wagons", "Finish two successful calls of the wagons.", "triumphs", 2),
    task("odysseus-miles", "odysseus", 1, "The long walk", "Walk six roads.", "miles", 6),
    task("odysseus-call", "odysseus", 2, "A call survived", "Finish one successful call of the wagons.", "triumphs", 1),
    task("odysseus-ridge", "odysseus", 3, "A work on the ridge", "Raise any realm project to level 3.", "build-max", 3),
    task("beowulf-marks", "beowulf", 1, "Two things answered", "Strike two bargains with creatures. Passing by does not count.", "marks", 2),
    task("beowulf-calls", "beowulf", 2, "The hall still standing", "Finish two successful calls of the wagons.", "triumphs", 2),
    task("theseus-works", "theseus", 1, "Two halls begun", "Finish two different realm projects.", "build-count", 2),
    task("theseus-name", "theseus", 2, "A founder's name", "Reach 16 renown.", "renown", 16),
    task("athena-calls", "athena", 1, "Three calls answered", "Finish three successful calls of the wagons.", "triumphs", 3),
    task("athena-works", "athena", 2, "Works worth counting", "Raise six levels of realm projects, in any mix.", "build-sum", 6),
    task("athena-name", "athena", 3, "A name she will hear", "Reach 24 renown.", "renown", 24),
    task("odin-miles", "odin", 1, "Twelve roads", "Walk twelve times.", "miles", 12),
    task("odin-marks", "odin", 2, "Three bargains", "Strike three bargains with creatures.", "marks", 3),
    task("odin-ridge", "odin", 3, "Two works on the ridge", "Raise two realm projects to level 3 or higher.", "build-high", 2, 3),
    task("odin-calls", "odin", 4, "Two calls, after the walking", "Finish two successful calls of the wagons.", "triumphs", 2),
    task("zeus-calls", "zeus", 1, "Three calls under the sky", "Finish three successful calls of the wagons.", "triumphs", 3),
    task("zeus-mood", "zeus", 2, "Loyalty across the holds", "Every settlement stands at loyalty 70 or better.", "mood-all", 1, 70),
    task("zeus-work", "zeus", 3, "A work near the weather", "Raise any realm project to level 4.", "build-max", 4),
    task("zeus-name", "zeus", 4, "Renown enough for thunder", "Reach 30 renown.", "renown", 30),
  ];
}

export function blankHeroRoster(cloakId?: string): HeroRecord[] {
  return HERO_IDS.map((id) => ({
    id,
    unlocked: id === "sela",
    fielded: id === "sela",
    worn: id === "sela" && cloakId ? { cloak: cloakId } : {},
  }));
}

function chronicle(state: GameState, text: string) {
  if (typeof state.nextId !== "number" || !Number.isFinite(state.nextId)) state.nextId = (state.chronicle?.length ?? 0) + 1;
  state.chronicle = state.chronicle ?? [];
  state.chronicle.push({ id: state.nextId++, day: state.day || 1, text });
  if (state.chronicle.length > 60) state.chronicle.splice(0, state.chronicle.length - 60);
}

function buildingLevels(state: GameState): number[] {
  const buildings = state.campaign?.buildings;
  if (!buildings) return [];
  return Object.values(buildings).map((level) => (typeof level === "number" && level > 0 ? level : 0));
}

function creatureMarks(state: GameState): number {
  return (state.marks ?? []).filter(
    (mark) => !mark.id.endsWith(":pass") && !mark.id.startsWith("petition:") && !mark.id.startsWith("road:"),
  ).length;
}

export function taskValue(state: GameState, task: HeroTask): number {
  switch (task.kind) {
    case "miles":
      return state.miles ?? 0;
    case "triumphs":
      return state.triumphs ?? 0;
    case "build-max":
      return Math.max(0, ...buildingLevels(state));
    case "build-sum":
      return buildingLevels(state).reduce((sum, level) => sum + level, 0);
    case "build-count":
      return buildingLevels(state).filter((level) => level >= 1).length;
    case "build-high":
      return buildingLevels(state).filter((level) => level >= (task.mark || 3)).length;
    case "renown":
      return state.player?.renown ?? 0;
    case "mood": {
      const home = (state.settlements ?? []).find((item) => item.holdId === state.player?.holdId);
      return home?.mood ?? 0;
    }
    case "mood-all": {
      const rows = state.settlements ?? [];
      if (rows.length === 0) return 0;
      const mark = task.mark || 70;
      return rows.every((item) => item.mood >= mark) ? 1 : 0;
    }
    case "marks":
      return creatureMarks(state);
    case "bonds": {
      const sworn = (state.compact?.members ?? []).filter((member) => member.inCompact);
      if (sworn.length === 0) return 0;
      return Math.min(...sworn.map((member) => member.contentment));
    }
    default:
      return 0;
  }
}

export function taskPhase(tasks: HeroTask[], task: HeroTask): "done" | "now" | "later" {
  if (task.status === "claimed") return "done";
  const earlier = tasks.filter((item) => item.heroId === task.heroId && item.chain < task.chain);
  return earlier.every((item) => item.status === "claimed") ? "now" : "later";
}

export function syncHeroTasks(state: GameState, announce: boolean) {
  if (!state.heroTasks) state.heroTasks = blankHeroTasks();
  if (!state.heroes) state.heroes = blankHeroRoster();
  const selaTask = state.heroTasks.find((task) => task.id === "sela-sworn");
  if (selaTask && selaTask.status !== "claimed") {
    selaTask.progress = 1;
    selaTask.status = "claimed";
  }
  for (const spec of HEROES) {
    const steps = state.heroTasks.filter((task) => task.heroId === spec.id).sort((a, b) => a.chain - b.chain);
    const hero = state.heroes.find((item) => item.id === spec.id);
    if (!hero) continue;
    if (hero.unlocked) {
      for (const step of steps) {
        step.progress = step.need;
        step.status = "claimed";
      }
      continue;
    }
    let gateOpen = true;
    for (const step of steps) {
      if (step.status === "claimed") continue;
      const value = taskValue(state, step);
      step.progress = Math.min(step.need, Math.max(0, value));
      if (!gateOpen) {
        step.status = "open";
        continue;
      }
      if (step.progress >= step.need) step.status = "claimed";
      else {
        step.status = "open";
        gateOpen = false;
      }
    }
    if (steps.length > 0 && steps.every((step) => step.status === "claimed")) {
      hero.unlocked = true;
      if (announce) {
        chronicle(state, `${spec.name} answers the banner. The mission is finished, and the road can take them.`);
      }
    }
  }
}

function isWornSlot(slot: string): slot is WornSlot {
  return slot === "hand" || slot === "cloak" || slot === "charm" || slot === "ring";
}

function gearInPack(state: GameState, id: string, slot?: WornSlot): Gear | undefined {
  return (state.pack ?? []).find((gear) => gear.id === id && gear.slot !== "hoard" && (!slot || gear.slot === slot));
}

export function normalizeHeroState(state: GameState) {
  const savedHeroes = Array.isArray(state.heroes) ? state.heroes : [];
  const hadRoster = savedHeroes.length > 0;
  const heroes: HeroRecord[] = HERO_IDS.map((id) => {
    const saved = savedHeroes.find((item) => item?.id === id);
    const worn: HeroRecord["worn"] = {};
    if (saved?.worn && typeof saved.worn === "object") {
      for (const slot of WORN_SLOTS) {
        const gearId = saved.worn[slot];
        if (typeof gearId === "string" && gearInPack(state, gearId, slot)) worn[slot] = gearId;
      }
    }
    return {
      id,
      unlocked: id === "sela" ? true : Boolean(saved?.unlocked),
      fielded: Boolean(saved?.fielded),
      worn,
    };
  });
  const seenGear = new Set<string>();
  for (const hero of heroes) {
    for (const slot of WORN_SLOTS) {
      const gearId = hero.worn[slot];
      if (!gearId) continue;
      if (seenGear.has(gearId)) delete hero.worn[slot];
      else seenGear.add(gearId);
    }
  }
  let fielded = 0;
  for (const hero of heroes) {
    if (!hero.unlocked) hero.fielded = false;
    if (!hero.fielded) continue;
    fielded += 1;
    if (fielded > FIELD_CAP) hero.fielded = false;
  }
  if (!hadRoster) {
    const sela = heroes.find((hero) => hero.id === "sela");
    if (sela) sela.fielded = true;
  }
  const wearer = (gearId: string) => heroes.some((hero) => Object.values(hero.worn).includes(gearId));
  const host = heroes.find((hero) => hero.fielded) ?? heroes.find((hero) => hero.id === "sela");
  if (host && !hadRoster) {
    for (const slot of WORN_SLOTS) {
      const gearId = state.worn?.[slot];
      if (typeof gearId === "string" && gearInPack(state, gearId, slot) && !wearer(gearId) && !host.worn[slot]) {
        host.worn[slot] = gearId;
      }
    }
  }
  state.heroes = heroes;
  const blank = blankHeroTasks();
  const savedTasks = Array.isArray(state.heroTasks) ? state.heroTasks : [];
  state.heroTasks = blank.map((task) => {
    const saved = savedTasks.find((item) => item?.id === task.id);
    if (!saved || (saved.status !== "open" && saved.status !== "ready" && saved.status !== "claimed")) return task;
    return {
      ...task,
      progress: typeof saved.progress === "number" && saved.progress > 0 ? Math.floor(saved.progress) : 0,
      status: saved.status,
    };
  });
  if (typeof state.triumphs !== "number" || !Number.isFinite(state.triumphs) || state.triumphs < 0) state.triumphs = 0;
  else state.triumphs = Math.floor(state.triumphs);
  syncHeroTasks(state, false);
}

export function clearGearFromHeroes(state: GameState, gearId: string) {
  for (const hero of state.heroes ?? []) {
    for (const slot of WORN_SLOTS) {
      if (hero.worn?.[slot] === gearId) delete hero.worn[slot];
    }
  }
  const worn = { ...(state.worn ?? {}) };
  for (const slot of WORN_SLOTS) {
    if (worn[slot] === gearId) delete worn[slot];
  }
  state.worn = worn;
}

export function heroWears(state: GameState, gearId: string): boolean {
  return (state.heroes ?? []).some((hero) => Object.values(hero.worn ?? {}).includes(gearId));
}

function leadHero(state: GameState): HeroRecord | undefined {
  return (state.heroes ?? []).find((hero) => hero.fielded && hero.unlocked);
}

export function giveGearToLead(state: GameState, gear: Gear) {
  if (gear.slot === "hoard" || !isWornSlot(gear.slot)) return;
  clearGearFromHeroes(state, gear.id);
  const lead = leadHero(state);
  if (!lead) return;
  lead.worn = { ...(lead.worn ?? {}), [gear.slot]: gear.id };
}

export function wearsAnyGear(state: GameState, hero: HeroRecord): boolean {
  return WORN_SLOTS.some((slot) => {
    const gearId = hero.worn?.[slot];
    return Boolean(gearId && gearInPack(state, gearId, slot));
  });
}

function gearedEdge(state: GameState, key: "road" | "ford" | "wagon", cap: number): number {
  let sum = 0;
  for (const hero of state.heroes ?? []) {
    if (!hero.fielded || !hero.unlocked || !wearsAnyGear(state, hero)) continue;
    sum += heroSpec(hero.id)[key];
  }
  return Math.min(cap, sum);
}

export function heroRoadTeach(state: GameState): number {
  return gearedEdge(state, "road", 6);
}

export function heroFordRenown(state: GameState): number {
  return gearedEdge(state, "ford", 4);
}

export function heroWagonGold(state: GameState): number {
  return gearedEdge(state, "wagon", 8);
}

export function fieldedNames(state: GameState): string[] {
  return (state.heroes ?? []).filter((hero) => hero.fielded && hero.unlocked).map((hero) => heroSpec(hero.id).name);
}

export function gearBearer(state: GameState, gearId: string): HeroSpec | null {
  const hero = (state.heroes ?? []).find((item) => Object.values(item.worn ?? {}).includes(gearId));
  return hero ? heroSpec(hero.id) : null;
}

function fail(state: GameState, error: string): Result {
  return { state, error };
}

function ok(state: GameState, message?: string): Result {
  return { state, message };
}

export function equipHero(state: GameState, heroId: HeroId, gearId: string): Result {
  const gear = (state.pack ?? []).find((item) => item.id === gearId);
  if (!gear) return fail(state, "That is not in the armory.");
  if (gear.slot === "hoard" || !isWornSlot(gear.slot)) return fail(state, "Treasures stay in the pack. They are not worn.");
  const hero = (state.heroes ?? []).find((item) => item.id === heroId);
  if (!hero?.unlocked) return fail(state, "That hero has not come to the banner.");
  const next = structuredClone(state);
  const target = next.heroes.find((item) => item.id === heroId);
  if (!target) return fail(state, "That hero has not come to the banner.");
  clearGearFromHeroes(next, gear.id);
  target.worn = { ...(target.worn ?? {}), [gear.slot]: gear.id };
  if (target.fielded) next.worn = { ...(next.worn ?? {}), [gear.slot]: gear.id };
  const name = heroSpec(heroId).name;
  chronicle(next, `${name} wears ${gear.name}.`);
  return ok(next, `${name} wears ${gear.name}.`);
}

export function unequipHero(state: GameState, heroId: HeroId, slot: WornSlot): Result {
  const hero = (state.heroes ?? []).find((item) => item.id === heroId);
  const gearId = hero?.worn?.[slot];
  if (!hero || !gearId) return fail(state, "Nothing is worn there.");
  const next = structuredClone(state);
  const target = next.heroes.find((item) => item.id === heroId);
  if (!target?.worn) return fail(state, "Nothing is worn there.");
  delete target.worn[slot];
  if ((next.worn ?? {})[slot] === gearId) {
    const worn = { ...(next.worn ?? {}) };
    delete worn[slot];
    const other = next.heroes.find((item) => item.fielded && item.id !== heroId && item.worn?.[slot]);
    if (other?.worn?.[slot]) worn[slot] = other.worn[slot];
    next.worn = worn;
  }
  const gear = (next.pack ?? []).find((item) => item.id === gearId);
  const name = heroSpec(heroId).name;
  chronicle(next, `${name} returns ${gear?.name ?? "a piece"} to the armory.`);
  return ok(next, `${gear?.name ?? "The piece"} is back in the armory.`);
}

export function fieldHero(state: GameState, heroId: HeroId): Result {
  const hero = (state.heroes ?? []).find((item) => item.id === heroId);
  if (!hero?.unlocked) return fail(state, "That hero has not come to the banner.");
  if (hero.fielded) return fail(state, "They are already on the road.");
  const out = (state.heroes ?? []).filter((item) => item.fielded).length;
  if (out >= FIELD_CAP) return fail(state, "Three heroes already walk. Rest one at the hold first.");
  const next = structuredClone(state);
  const target = next.heroes.find((item) => item.id === heroId);
  if (!target) return fail(state, "That hero has not come to the banner.");
  target.fielded = true;
  const worn = { ...(next.worn ?? {}) };
  for (const slot of WORN_SLOTS) {
    const gearId = target.worn?.[slot];
    if (gearId) worn[slot] = gearId;
  }
  next.worn = worn;
  const name = heroSpec(heroId).name;
  chronicle(next, `${name} takes the road.`);
  return ok(next, `${name} takes the road.`);
}

export function restHero(state: GameState, heroId: HeroId): Result {
  const hero = (state.heroes ?? []).find((item) => item.id === heroId);
  if (!hero?.unlocked) return fail(state, "That hero has not come to the banner.");
  if (!hero.fielded) return fail(state, "They are already at the hold.");
  const next = structuredClone(state);
  const target = next.heroes.find((item) => item.id === heroId);
  if (!target) return fail(state, "That hero has not come to the banner.");
  target.fielded = false;
  const worn = { ...(next.worn ?? {}) };
  for (const slot of WORN_SLOTS) {
    const gearId = target.worn?.[slot];
    if (gearId && worn[slot] === gearId) {
      delete worn[slot];
      const other = next.heroes.find((item) => item.fielded && item.worn?.[slot]);
      if (other?.worn?.[slot]) worn[slot] = other.worn[slot];
    }
  }
  next.worn = worn;
  const name = heroSpec(heroId).name;
  chronicle(next, `${name} rests at the hold. Their gear waits with them.`);
  return ok(next, `${name} rests at the hold.`);
}

const FIND_SALT = { walk: 17, crossing: 29, expedition: 43 };

export function maybeRecruit(state: GameState, source: "walk" | "crossing" | "expedition"): string | null {
  const locked = (state.heroes ?? []).filter((hero) => !hero.unlocked);
  if (locked.length === 0) return null;
  const roll = worldRng(
    ((state.seed ?? 0) ^ Math.imul((state.day ?? 1) + 91, 0x9e3779b1) ^ Math.imul((state.miles ?? 0) + FIND_SALT[source], 0x85ebca6b)) >>> 0,
  );
  const chance = source === "walk" ? 0.05 : source === "crossing" ? 0.04 : 0.06;
  if (roll() >= chance) return null;
  const weights = locked.map((hero) => {
    const rarity = heroSpec(hero.id).rarity;
    if (source === "walk") return rarity === "common" ? 8 : rarity === "uncanny" ? 2 : 0;
    if (source === "crossing") return rarity === "uncanny" ? 8 : rarity === "legendary" ? 2 : 0;
    return rarity === "legendary" ? 9 : rarity === "divine" ? 1 : 0;
  });
  let total = 0;
  for (const weight of weights) total += weight;
  if (total <= 0) return null;
  let pick = Math.floor(roll() * total);
  let chosen = locked[0];
  for (let index = 0; index < locked.length; index += 1) {
    pick -= weights[index];
    if (pick < 0) {
      chosen = locked[index];
      break;
    }
  }
  const spec = heroSpec(chosen.id);
  chosen.unlocked = true;
  for (const task of state.heroTasks ?? []) {
    if (task.heroId !== chosen.id) continue;
    task.progress = task.need;
    task.status = "claimed";
  }
  return `${spec.name} is met on the road, outside any mission. ${RARITY_RANK[spec.rarity] >= 2 ? "Such a meeting is rare. The mission would still have brought them." : "The mission would have brought them too."}`;
}
