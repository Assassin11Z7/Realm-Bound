import type { GameState, Gear, HeroId, HeroRarity, HeroRecord, HeroTask, HeroTaskKind, RelicId, Result, WornSlot } from "./types";
import { HERO_IDS } from "./types";
import { WORN_SLOTS, gainRenown, isHuntGear, isSmithGear, relicSpec, worldRng } from "./world";

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

/** What a worn piece must be before a hero's synergy wakes. Relics still keep their own trait. */
export type GearAffinity = "hand" | "charm" | "ward" | "lore" | "purse" | "hunt" | "smith" | "lore-or-charm" | "hunt-or-ward" | "relic";

export interface HeroAbility {
  name: string;
  text: string;
}

export interface HeroSynergy {
  affinity: GearAffinity;
  relic?: RelicId;
  name: string;
  text: string;
  /** A choice, law, or road event this pairing opens. Numeric text stays on `text`. */
  unlock?: string;
}

const ABILITIES: Record<HeroId, HeroAbility[]> = {
  sela: [
    {
      name: "Gate watch",
      text: "While she is out and wearing gear, loyalty at home recovers by 1 each dawn.",
    },
  ],
  tam: [
    {
      name: "Ford price",
      text: "While he is out and wearing gear, a creature bargain that costs gold costs 1 less.",
    },
  ],
  bran: [
    {
      name: "Wool bell",
      text: "While he is out and wearing gear, the next call of the wagons comes 1 dawn sooner.",
    },
  ],
  dorrie: [
    {
      name: "Hearth cousin",
      text: "While she is out and wearing gear, firewood at home lasts one dawn longer.",
    },
  ],
  moth: [
    {
      name: "Uncanny trail",
      text: "While she is out and wearing gear, a walk is more likely to meet a hero who was not on a mission.",
    },
  ],
  ivy: [
    {
      name: "Salt price",
      text: "While she is out and wearing gear, goods sell for 1 more gold.",
    },
  ],
  heracles: [
    {
      name: "Laborer's price",
      text: "While he is out and wearing gear, a creature bargain that costs gold costs 2 less.",
    },
  ],
  odysseus: [
    {
      name: "Long memory",
      text: "While he is out and wearing gear, a walk is more likely to leave a unique relic.",
    },
  ],
  beowulf: [
    {
      name: "Hall-cleaner",
      text: "While he is out and wearing gear, an answered creature grants 2 more renown.",
    },
  ],
  theseus: [
    {
      name: "Stone hall",
      text: "While he is out and wearing gear, a hall or a border path advances an extra dawn. A cleared border path warms that bond by 2 more each dawn.",
    },
  ],
  athena: [
    {
      name: "Counted works",
      text: "While she is out and wearing gear, every realm project advances an extra dawn.",
    },
    {
      name: "Olive peace",
      text: "While she is out and wearing gear, loyalty at home recovers by 2 each dawn.",
    },
  ],
  odin: [
    {
      name: "One eye on the ditch",
      text: "While he is out and wearing gear, walks and crossings are more likely to leave a unique relic.",
    },
    {
      name: "The road names them",
      text: "While he is out and wearing gear, the road is more likely to meet a hero outside a mission.",
    },
  ],
  zeus: [
    {
      name: "Sky over the holds",
      text: "While he is out and wearing gear, every hold's loyalty recovers by 1 each dawn, and Vell's anger climbs more slowly.",
    },
    {
      name: "Wagon weather",
      text: "While he is out and wearing gear, a successful call pays 3 more gold.",
    },
  ],
};

const SYNERGIES: Record<HeroId, HeroSynergy[]> = {
  sela: [
    {
      affinity: "ward",
      name: "Ward at the gate",
      text: "A ward piece on Sela. Home loyalty recovers by 1 more.",
    },
  ],
  tam: [
    {
      affinity: "ward",
      name: "Watchman's ward",
      text: "A ward piece on Tam. The bargain costs 1 less again, and the crossing grants 1 more renown.",
    },
  ],
  bran: [
    {
      affinity: "purse",
      name: "Wool purse",
      text: "A coin piece on Bran. The call comes 1 dawn sooner again, and a successful call pays 2 more gold.",
    },
    {
      affinity: "relic",
      relic: "carter-knot",
      name: "Knot on the wool road",
      text: "Carter's Knot on Bran. The wool road remembers the drivers.",
      unlock: "Once, while he is out and wearing it, two grain arrive on an open call, or the next call comes one dawn sooner.",
    },
  ],
  dorrie: [
    {
      affinity: "lore",
      name: "Hearth learning",
      text: "A learning piece on Dorrie. Home loyalty recovers by 1.",
    },
  ],
  moth: [
    {
      affinity: "smith",
      name: "Smith on the timber road",
      text: "A smith piece on Moth. The forge project advances an extra dawn, and a forge craft comes out one grade finer.",
    },
    {
      affinity: "hunt",
      name: "Moth on the hunt",
      text: "A hunt piece on Moth. A walk is more likely still to meet a hero.",
    },
  ],
  ivy: [
    {
      affinity: "purse",
      name: "Salt purse",
      text: "A coin piece on Ivy. Goods sell for 1 more gold again.",
    },
    {
      affinity: "relic",
      relic: "salt-charter",
      name: "Charter runner",
      text: "The Salt Charter on Ivy. While she wears it, the law Salt the road does not raise Vell's anger.",
      unlock: "She opens Brine the fords, a stronger salt law, and the Salt Widow will teach it.",
    },
  ],
  heracles: [
    {
      affinity: "hand",
      name: "The laborer's hand",
      text: "A weapon in Heracles' hand. The bargain costs 2 less again, and the crossing grants 2 more renown.",
    },
    {
      affinity: "relic",
      relic: "unspoken-hem",
      name: "Hem of the labor",
      text: "The Unspoken Hem on Heracles. The bargain costs 2 less again.",
      unlock: "The old woman at the ford offers a labor that takes no gold.",
    },
  ],
  odysseus: [
    {
      affinity: "lore-or-charm",
      name: "Lore or a charm",
      text: "A learning piece or any charm on Odysseus. The walk is more likely still to leave a relic, and it teaches 2 more.",
    },
    {
      affinity: "relic",
      relic: "ford-bell",
      name: "Bell on the long road",
      text: "The Ford Bell in Odysseus' hand. Walks teach 2 more, and a unique relic is more likely again.",
      unlock: "The bell can call a rare hero to the road. Legendary and divine names answer it first.",
    },
  ],
  beowulf: [
    {
      affinity: "hunt-or-ward",
      name: "Hunt or ward",
      text: "A hunt piece or a ward piece on Beowulf. The creature grants 2 more renown, and Vell's anger climbs more slowly.",
    },
    {
      affinity: "relic",
      relic: "barrow-band",
      name: "Band in the barrow",
      text: "The Barrow Band on Beowulf. The creature grants 1 more renown, and the band cools a sworn bond by 2 instead of 4.",
      unlock: "A border quarrel can be named into the barrow watch, a decree that stops the band from cooling a sworn bond.",
    },
  ],
  theseus: [
    {
      affinity: "lore",
      name: "Founder's learning",
      text: "A learning piece on Theseus. Walks teach 1 more.",
    },
  ],
  athena: [
    {
      affinity: "lore",
      name: "Olive and the tally",
      text: "A learning piece on Athena. The project advances one more dawn, and home loyalty recovers by 1 more.",
    },
  ],
  odin: [
    {
      affinity: "lore",
      name: "Raven learning",
      text: "A learning piece on Odin. Walks are more likely still to leave a relic, and they teach 2 more.",
    },
    {
      affinity: "ward",
      name: "Wanderer's ward",
      text: "A ward piece on Odin. Vell's anger climbs more slowly.",
    },
  ],
  zeus: [
    {
      affinity: "purse",
      name: "Sky purse",
      text: "A coin piece on Zeus. A successful call pays 2 more gold.",
    },
    {
      affinity: "ward",
      name: "Weather ward",
      text: "A ward piece on Zeus. Vell's anger climbs more slowly again.",
    },
    {
      affinity: "relic",
      relic: "carter-knot",
      name: "Knot under the sky",
      text: "Carter's Knot on Zeus. A successful call pays 4 more gold, and the next call comes 1 dawn sooner.",
      unlock: "Once, while he is out and wearing it, four grain, two iron, and two salt arrive on an open call, or the next call comes two dawns sooner.",
    },
  ],
};

export function heroAbilities(id: HeroId): HeroAbility[] {
  return ABILITIES[id] ?? [];
}

export function heroSynergies(id: HeroId): HeroSynergy[] {
  return SYNERGIES[id] ?? [];
}

export function gearMatches(gear: Gear, synergy: HeroSynergy): boolean {
  if (synergy.affinity === "relic") return Boolean(synergy.relic && gear.relic === synergy.relic);
  if (synergy.affinity === "hand") return gear.slot === "hand";
  if (synergy.affinity === "charm") return gear.slot === "charm";
  if (synergy.affinity === "smith") return isSmithGear(gear);
  if (synergy.affinity === "hunt") return isHuntGear(gear);
  if (synergy.affinity === "lore-or-charm") return gear.trait === "lore" || gear.slot === "charm";
  if (synergy.affinity === "hunt-or-ward") return isHuntGear(gear) || gear.trait === "ward";
  return gear.trait === synergy.affinity;
}

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
  const levels = buildings
    ? Object.values(buildings).map((level) => (typeof level === "number" && level > 0 ? level : 0))
    : [];
  return levels.concat((state.campaign?.realmWorks ?? []).map(() => 1));
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

interface FieldKit {
  id: HeroId;
  gear: Gear[];
}

export interface HeroGate {
  /** Any one of these, fielded and wearing gear, opens the ready outcome. */
  ids: HeroId[];
  /** Any one of these, fielded and wearing gear, opens the strongest outcome. */
  best?: HeroId[];
  /** At the hold and wearing gear. Opens the ready outcome, short of the strongest. */
  stationed?: HeroId[];
  /** Any fielded hero who is wearing gear opens the ready outcome. */
  company?: boolean;
}

export type HeroPosture = "best" | "ready" | "stationed" | "none";

/** Where a hero stands for a political ask. Gear is required for out and hold. */
export function heroWhere(state: GameState, id: HeroId): "out" | "hold" | "bare" | "away" {
  const hero = (state.heroes ?? []).find((item) => item.id === id);
  if (!hero?.unlocked) return "away";
  const geared = wearsAnyGear(state, hero);
  if (hero.fielded && geared) return "out";
  if (!hero.fielded && geared) return "hold";
  return "bare";
}

export function heroPosture(state: GameState, gate: HeroGate): HeroPosture {
  const out = new Set(fieldKits(state).map((kit) => kit.id));
  if (gate.best?.some((id) => out.has(id))) return "best";
  if (gate.ids.some((id) => out.has(id))) return "ready";
  if (gate.company && out.size > 0) return "ready";
  if (gate.stationed?.some((id) => heroWhere(state, id) === "hold")) return "stationed";
  return "none";
}

export function heroPostureWho(state: GameState, gate: HeroGate): string | null {
  const out = fieldKits(state).map((kit) => kit.id);
  const posture = heroPosture(state, gate);
  let id: HeroId | undefined;
  if (posture === "best") id = gate.best?.find((hero) => out.includes(hero));
  else if (posture === "ready") id = gate.ids.find((hero) => out.includes(hero)) ?? (gate.company ? out[0] : undefined);
  else if (posture === "stationed") id = gate.stationed?.find((hero) => heroWhere(state, hero) === "hold");
  return id ? heroSpec(id).name : null;
}

/** Extra bond when a border path clears and Theseus is out and wearing gear. */
export function heroBorderSeal(state: GameState): number {
  return fieldKits(state).some((kit) => kit.id === "theseus") ? 6 : 0;
}

export function borderPathRead(state: GameState): { met: boolean; line: string } {
  const met = heroBorderSeal(state) > 0;
  if (met) {
    return {
      met,
      line: "Now. Theseus is out and wearing gear, so that bond gains 6 more on the dawn the path clears. If he is at the hold that dawn, the warmth stays ordinary.",
    };
  }
  return {
    met,
    line: "Wants Theseus fielded and wearing gear on the dawn the path clears. Now the bond gains only the ordinary warmth. With him out and geared that dawn, it gains 6 more.",
  };
}

export interface PoliticalRead {
  met: boolean;
  who: string | null;
  line: string;
  wait: string;
}

function nameList(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "No one";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

function martialRead(state: GameState): PoliticalRead {
  const gate: HeroGate = { ids: ["beowulf", "heracles", "theseus"] };
  const posture = heroPosture(state, gate);
  const who = heroPostureWho(state, gate);
  const wait = "The joint watch is ready to close, and it waits. Beowulf, Heracles, or Theseus must be fielded and wearing gear.";
  if ((posture === "ready" || posture === "best") && who) {
    return {
      met: true,
      who,
      wait,
      line: `Ready. ${who} is out and wearing gear, so the joint watch can close on its last dawn.`,
    };
  }
  const held = gate.ids.find((id) => heroWhere(state, id) === "hold");
  if (held) {
    return {
      met: false,
      who: null,
      wait,
      line: `${heroSpec(held).name} is at the hold and wearing gear. Field them before the last dawn, or the joint watch waits.`,
    };
  }
  const bare = gate.ids.find((id) => heroWhere(state, id) === "bare");
  if (bare) {
    return {
      met: false,
      who: null,
      wait,
      line: `${heroSpec(bare).name} wears nothing. Gear them and send them out before the last dawn, or the joint watch waits.`,
    };
  }
  return {
    met: false,
    who: null,
    wait,
    line: "Needs Beowulf, Heracles, or Theseus fielded and wearing gear on the last dawn. None of them is out and geared now.",
  };
}

function counselRead(state: GameState): PoliticalRead {
  const gate: HeroGate = { ids: ["athena", "odin"] };
  const posture = heroPosture(state, gate);
  const who = heroPostureWho(state, gate);
  const wait = "The hall of counsel is ready to close, and it waits. Athena or Odin must be fielded and wearing gear.";
  if ((posture === "ready" || posture === "best") && who) {
    return {
      met: true,
      who,
      wait,
      line: `Ready. ${who} is out and wearing gear, so the rite can close on its last dawn.`,
    };
  }
  const held = gate.ids.find((id) => heroWhere(state, id) === "hold");
  if (held) {
    return {
      met: false,
      who: null,
      wait,
      line: `${heroSpec(held).name} is at the hold and wearing gear. Field them before the last dawn, or the rite waits.`,
    };
  }
  const bare = gate.ids.find((id) => heroWhere(state, id) === "bare");
  if (bare) {
    return {
      met: false,
      who: null,
      wait,
      line: `${heroSpec(bare).name} wears nothing. Gear them and send them out before the last dawn, or the rite waits.`,
    };
  }
  return {
    met: false,
    who: null,
    wait,
    line: "Needs Athena or Odin fielded and wearing gear on the last dawn. Neither is out and geared now.",
  };
}

function charterRead(state: GameState): PoliticalRead {
  const gate: HeroGate = { ids: [], best: ["bran", "zeus"], company: true };
  const posture = heroPosture(state, gate);
  const who = heroPostureWho(state, gate);
  const wait = "The drivers' charter is ready to close, and it waits. Bran, Zeus, or any geared company must be on the road.";
  if ((posture === "best" || posture === "ready") && who) {
    return {
      met: true,
      who,
      wait,
      line:
        posture === "best"
          ? `Ready. ${who} is out and wearing gear, so the charter can close on its last dawn.`
          : `Ready. ${who} is out and wearing gear. Any geared company can close the charter. Bran or Zeus would be named on it.`,
    };
  }
  const held = (["bran", "zeus"] as const).find((id) => heroWhere(state, id) === "hold");
  if (held) {
    return {
      met: false,
      who: null,
      wait,
      line: `${heroSpec(held).name} is at the hold and wearing gear. Field them, or send any geared hero, before the last dawn.`,
    };
  }
  const bare = (state.heroes ?? []).find((hero) => hero.unlocked && hero.fielded && heroWhere(state, hero.id) === "bare");
  if (bare) {
    return {
      met: false,
      who: null,
      wait,
      line: `${heroSpec(bare.id).name} is on the road and wears nothing. Gear them before the last dawn, or the charter waits.`,
    };
  }
  return {
    met: false,
    who: null,
    wait,
    line: "Needs Bran, Zeus, or any hero fielded and wearing gear on the last dawn. No geared company is on the road.",
  };
}

function oathstoneRead(state: GameState): PoliticalRead {
  const names = fieldedNames(state);
  const met = names.length >= 2;
  const wait = "The oath stone is already begun. It does not ask for the company again.";
  if (met) {
    return {
      met,
      who: nameList(names),
      wait,
      line: `Ready to begin. ${nameList(names)} are on the road. The stone does not ask for them again after it starts.`,
    };
  }
  if (names.length === 1) {
    return {
      met,
      who: null,
      wait,
      line: `Needs two heroes fielded before it can begin. ${names[0]} is on the road. One more must take it.`,
    };
  }
  return {
    met,
    who: null,
    wait,
    line: "Needs two heroes fielded before it can begin. No one is on the road.",
  };
}

/** Hero requirement for a political realm project. Null for the older works. */
export function politicalRead(state: GameState, id: string): PoliticalRead | null {
  if (id === "compact") return martialRead(state);
  if (id === "counsel") return counselRead(state);
  if (id === "charter") return charterRead(state);
  if (id === "oathstone") return oathstoneRead(state);
  return null;
}

function fieldKits(state: GameState): FieldKit[] {
  const kits: FieldKit[] = [];
  for (const hero of state.heroes ?? []) {
    if (!hero.fielded || !hero.unlocked || !wearsAnyGear(state, hero)) continue;
    const gear: Gear[] = [];
    for (const slot of WORN_SLOTS) {
      const gearId = hero.worn?.[slot];
      const piece = gearId ? gearInPack(state, gearId, slot) : undefined;
      if (piece) gear.push(piece);
    }
    kits.push({ id: hero.id, gear });
  }
  return kits;
}

function kitHas(kit: FieldKit, affinity: GearAffinity, relic?: RelicId): boolean {
  return kit.gear.some((gear) => gearMatches(gear, { affinity, relic, name: "", text: "" }));
}

/** A fielded, geared hero is wearing this unique relic. */
export function heroWearsRelic(state: GameState, heroId: HeroId, relic: RelicId): boolean {
  return fieldKits(state).some((kit) => kit.id === heroId && kitHas(kit, "relic", relic));
}

function wornBy(state: GameState, hero: HeroRecord | undefined): Gear[] {
  if (!hero) return [];
  const gear: Gear[] = [];
  for (const slot of WORN_SLOTS) {
    const gearId = hero.worn?.[slot];
    const piece = gearId ? gearInPack(state, gearId, slot) : undefined;
    if (piece) gear.push(piece);
  }
  return gear;
}

const PROJECT_EXTRA_CAP = 2;
const RELIEF_CAP = 6;
const CREATURE_RENOWN_CAP = 6;
const STRENGTH_RENOWN_CAP = 4;
const TEACH_CAP = 4;
const SALE_CAP = 2;
const SOONER_CAP = 3;
const WAGON_EXTRA_CAP = 8;
const IRE_EASE_CAP = 2;
const HOME_LOYALTY_CAP = 4;

export function heroHomeLoyalty(state: GameState): number {
  let sum = 0;
  for (const kit of fieldKits(state)) {
    if (kit.id === "sela") sum += 1 + (kitHas(kit, "ward") ? 1 : 0);
    if (kit.id === "dorrie" && kitHas(kit, "lore")) sum += 1;
    if (kit.id === "athena") sum += 2 + (kitHas(kit, "lore") ? 1 : 0);
  }
  return Math.min(HOME_LOYALTY_CAP, sum);
}

export function heroAllLoyalty(state: GameState): number {
  return fieldKits(state).some((kit) => kit.id === "zeus") ? 1 : 0;
}

export function heroHearthSave(state: GameState): number {
  return fieldKits(state).some((kit) => kit.id === "dorrie") ? 1 : 0;
}

export function heroProjectExtra(state: GameState, labor: { id: string; bench?: string }): number {
  let extra = 0;
  for (const kit of fieldKits(state)) {
    if (kit.id === "athena") extra += 1 + (kitHas(kit, "lore") ? 1 : 0);
    if (kit.id === "theseus" && (labor.id === "hall" || labor.id === "border")) extra += 1;
    if (kit.id === "moth" && labor.id === "bench" && labor.bench === "forge" && kitHas(kit, "smith")) extra += 1;
  }
  return Math.min(PROJECT_EXTRA_CAP, extra);
}

export function heroProjectLine(state: GameState, labor: { id: string; bench?: string }): string | null {
  const extra = heroProjectExtra(state, labor);
  if (extra <= 0) return null;
  const names: string[] = [];
  for (const kit of fieldKits(state)) {
    if (kit.id === "athena") names.push(heroSpec(kit.id).name);
    if (kit.id === "theseus" && (labor.id === "hall" || labor.id === "border")) names.push(heroSpec(kit.id).name);
    if (kit.id === "moth" && labor.id === "bench" && labor.bench === "forge" && kitHas(kit, "smith")) names.push(heroSpec(kit.id).name);
  }
  if (names.length === 0) return null;
  return `${names.join(" and ")} ${names.length === 1 ? "hurries" : "hurry"} the work by ${extra}.`;
}

export function heroBorderWarmth(state: GameState): number {
  return fieldKits(state).some((kit) => kit.id === "theseus") ? 2 : 0;
}

export function heroBargainRelief(state: GameState): number {
  let sum = 0;
  for (const kit of fieldKits(state)) {
    if (kit.id === "tam") sum += 1 + (kitHas(kit, "ward") ? 1 : 0);
    if (kit.id === "heracles") {
      sum += 2;
      if (kitHas(kit, "hand")) sum += 2;
      if (kitHas(kit, "relic", "unspoken-hem")) sum += 2;
    }
  }
  return Math.min(RELIEF_CAP, sum);
}

export function heroBargainLine(state: GameState, saved: number): string {
  const names = fieldKits(state)
    .filter((kit) => kit.id === "tam" || kit.id === "heracles")
    .map((kit) => heroSpec(kit.id).name);
  const who = names.length > 0 ? names.join(" and ") : "A hero";
  return `${who} cheapens the bargain by ${saved} gold.`;
}

export function heroCreatureRenown(state: GameState): number {
  let sum = 0;
  for (const kit of fieldKits(state)) {
    if (kit.id !== "beowulf") continue;
    sum += 2;
    if (kitHas(kit, "hunt-or-ward")) sum += 2;
    if (kitHas(kit, "relic", "barrow-band")) sum += 1;
  }
  return Math.min(CREATURE_RENOWN_CAP, sum);
}

export function heroStrengthRenown(state: GameState): number {
  let sum = 0;
  for (const kit of fieldKits(state)) {
    if (kit.id === "heracles" && kitHas(kit, "hand")) sum += 2;
    if (kit.id === "tam" && kitHas(kit, "ward")) sum += 1;
  }
  return Math.min(STRENGTH_RENOWN_CAP, sum);
}

export function heroExtraTeach(state: GameState): number {
  let sum = 0;
  for (const kit of fieldKits(state)) {
    if (kit.id === "odysseus") {
      if (kitHas(kit, "lore-or-charm")) sum += 2;
      if (kitHas(kit, "relic", "ford-bell")) sum += 2;
    }
    if (kit.id === "odin" && kitHas(kit, "lore")) sum += 2;
    if (kit.id === "theseus" && kitHas(kit, "lore")) sum += 1;
  }
  return Math.min(TEACH_CAP, sum);
}

export function heroRelicBonus(state: GameState, source: "walk" | "crossing" | "expedition"): number {
  let sum = 0;
  for (const kit of fieldKits(state)) {
    if (kit.id === "odysseus" && source === "walk") {
      sum += 0.1;
      if (kitHas(kit, "lore-or-charm")) sum += 0.08;
      if (kitHas(kit, "relic", "ford-bell")) sum += 0.06;
    }
    if (kit.id === "odin") {
      if (source === "walk") sum += 0.14 + (kitHas(kit, "lore") ? 0.08 : 0);
      if (source === "crossing") sum += 0.1;
    }
  }
  return Math.min(0.4, sum);
}

export function heroMeetingBonus(state: GameState, source: "walk" | "crossing" | "expedition"): number {
  let sum = 0;
  for (const kit of fieldKits(state)) {
    if (kit.id === "moth" && source === "walk") sum += 0.03 + (kitHas(kit, "hunt") ? 0.04 : 0);
    if (kit.id === "odin") sum += 0.04;
  }
  return Math.min(0.12, sum);
}

export function heroSaleBonus(state: GameState): number {
  let sum = 0;
  for (const kit of fieldKits(state)) {
    if (kit.id !== "ivy") continue;
    sum += 1;
    if (kitHas(kit, "purse")) sum += 1;
  }
  return Math.min(SALE_CAP, sum);
}

export function heroCallSooner(state: GameState): number {
  let sum = 0;
  for (const kit of fieldKits(state)) {
    if (kit.id === "bran") sum += 1 + (kitHas(kit, "purse") ? 1 : 0);
    if (kit.id === "zeus" && kitHas(kit, "relic", "carter-knot")) sum += 1;
  }
  return Math.min(SOONER_CAP, sum);
}

export function heroWagonExtra(state: GameState): number {
  let sum = 0;
  for (const kit of fieldKits(state)) {
    if (kit.id === "bran" && kitHas(kit, "purse")) sum += 2;
    if (kit.id === "zeus") {
      sum += 3;
      if (kitHas(kit, "purse")) sum += 2;
      if (kitHas(kit, "relic", "carter-knot")) sum += 4;
    }
  }
  return Math.min(WAGON_EXTRA_CAP, sum);
}

export function heroIreEase(state: GameState): number {
  let sum = 0;
  for (const kit of fieldKits(state)) {
    if (kit.id === "beowulf" && kitHas(kit, "hunt-or-ward")) sum += 1;
    if (kit.id === "odin" && kitHas(kit, "ward")) sum += 1;
    if (kit.id === "zeus") sum += 1 + (kitHas(kit, "ward") ? 1 : 0);
  }
  return Math.min(IRE_EASE_CAP, sum);
}

/** How far the Barrow Band cools the warmest sworn bond. Beowulf softens it. The barrow watch stops it. */
export function heroBandCool(state: GameState): number {
  const home = (state.settlements ?? []).find((item) => item.holdId === state.player.holdId);
  if (home?.edict === "barrow-watch") return 0;
  const beowulf = fieldKits(state).find((kit) => kit.id === "beowulf");
  return beowulf && kitHas(beowulf, "relic", "barrow-band") ? 2 : 4;
}

export function heroSaltQuiet(state: GameState): boolean {
  return fieldKits(state).some((kit) => kit.id === "ivy" && kitHas(kit, "relic", "salt-charter"));
}

export function heroForgeFiner(state: GameState): boolean {
  return fieldKits(state).some((kit) => kit.id === "moth" && kitHas(kit, "smith"));
}

export type SynergyState = "active" | "ready" | "open";

export interface SynergyRead {
  name: string;
  text: string;
  state: SynergyState;
  unlock?: string;
}

export function heroSynergyRead(state: GameState, heroId: HeroId): SynergyRead[] {
  const record = (state.heroes ?? []).find((hero) => hero.id === heroId);
  const worn = wornBy(state, record);
  const fielded = Boolean(record?.unlocked && record.fielded && worn.length > 0);
  return heroSynergies(heroId).map((synergy) => {
    const matched = worn.some((gear) => gearMatches(gear, synergy));
    const status: SynergyState = matched && fielded ? "active" : matched ? "ready" : "open";
    return { name: synergy.name, text: synergy.text, state: status, unlock: synergy.unlock };
  });
}

export interface RelicPairRead {
  id: string;
  hero: string;
  relic: string;
  opens: string;
}

/** Relic and hero pairs that are out on the road and opening a choice. */
export function activeRelicPairs(state: GameState): RelicPairRead[] {
  const rows: RelicPairRead[] = [];
  for (const hero of state.heroes ?? []) {
    if (!hero.unlocked) continue;
    for (const synergy of heroSynergies(hero.id)) {
      if (!synergy.unlock || !synergy.relic || !heroWearsRelic(state, hero.id, synergy.relic)) continue;
      rows.push({
        id: `${hero.id}:${synergy.relic}`,
        hero: heroSpec(hero.id).name,
        relic: relicSpec(synergy.relic)?.name ?? synergy.relic,
        opens: synergy.unlock,
      });
    }
  }
  return rows;
}

export const KNOT_ACT = "carter-knot";

export interface KnotCallRead {
  who: "zeus" | "bran";
  spent: boolean;
  title: string;
  detail: string;
  because: string;
}

/** The one-time wagon choice Carter's Knot opens on Zeus, or the smaller one on Bran. */
export function knotCallRead(state: GameState): KnotCallRead | null {
  const zeus = heroWearsRelic(state, "zeus", "carter-knot");
  const bran = !zeus && heroWearsRelic(state, "bran", "carter-knot");
  if (!zeus && !bran) return null;
  const called = (state.expedition?.phase ?? "called") === "called";
  const spent = (state.relicActs ?? []).includes(KNOT_ACT);
  if (zeus) {
    return {
      who: "zeus",
      spent,
      title: called ? "Knot the sky call" : "Bring the next call sooner",
      detail: called
        ? "Once. Four grain, two iron, and two salt arrive on the wagons."
        : "Once. The next call of the wagons comes two dawns sooner.",
      because: "Open because Zeus wears Carter's Knot.",
    };
  }
  return {
    who: "bran",
    spent,
    title: called ? "Knot the wool wagons" : "Bring the next call sooner",
    detail: called ? "Once. Two grain arrive on the wagons." : "Once. The next call of the wagons comes one dawn sooner.",
    because: "Open because Bran wears Carter's Knot.",
  };
}

export interface BellRoadRead {
  open: boolean;
  heard: boolean;
  because: string;
  detail: string;
}

/** The Ford Bell road event, while Odysseus is out and wearing it. */
export function bellRoadRead(state: GameState): BellRoadRead | null {
  if (!heroWearsRelic(state, "odysseus", "ford-bell")) return null;
  const heard = (state.creaturesSeen ?? []).includes("bell-road");
  return {
    open: !heard,
    heard,
    because: "Open because Odysseus wears the Ford Bell.",
    detail: heard
      ? "The bell has already called someone to this road."
      : "A traveler who was not coming will meet you. Legendary and divine names answer it first.",
  };
}

/** The Ford Bell calls the rarest hero still off the banner. */
export function meetByBell(state: GameState): string {
  const locked = (state.heroes ?? []).filter((hero) => !hero.unlocked);
  if (locked.length === 0) {
    gainRenown(state, 3);
    return "The Ford Bell rang, and no one unanswered was left on the road. Renown rises by 3. This was open because Odysseus wears the Ford Bell.";
  }
  const roll = worldRng(((state.seed ?? 0) ^ Math.imul((state.day ?? 1) + 211, 0x9e3779b1)) >>> 0);
  const weights = locked.map((hero) => {
    const rarity = heroSpec(hero.id).rarity;
    if (rarity === "divine") return 5;
    if (rarity === "legendary") return 8;
    if (rarity === "uncanny") return 2;
    return 1;
  });
  let total = 0;
  for (const weight of weights) total += weight;
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
  const rare = spec.rarity === "legendary" || spec.rarity === "divine";
  return `${spec.name} answers the Ford Bell.${rare ? " Such a meeting is rare." : ""} This road was open because Odysseus wears the Ford Bell.`;
}

export function heroPieceNote(state: GameState, heroId: HeroId, gear: Gear): string | null {
  const hits = heroSynergies(heroId).filter((synergy) => gearMatches(gear, synergy));
  if (hits.length === 0) return null;
  const record = (state.heroes ?? []).find((hero) => hero.id === heroId);
  const wearing = Boolean(record && Object.values(record.worn ?? {}).includes(gear.id));
  const fielded = Boolean(record?.unlocked && record.fielded && wearsAnyGear(state, record));
  const lead = wearing && fielded ? "Synergy active" : wearing ? "Synergy ready when they take the road" : "Wakes if they wear this on the road";
  return `${lead}. ${hits.map((hit) => `${hit.name}: ${hit.text}`).join(" ")}`;
}

/** Notes for the armory. Only unlocked heroes, and only pieces they can wear. */
export function gearHeroNotes(state: GameState, gear: Gear): string[] {
  if (gear.slot === "hoard") return [];
  const notes: string[] = [];
  for (const spec of HEROES) {
    const record = (state.heroes ?? []).find((hero) => hero.id === spec.id);
    if (!record?.unlocked) continue;
    const hits = heroSynergies(spec.id).filter((synergy) => gearMatches(gear, synergy));
    for (const hit of hits) {
      const where = record.fielded ? "out" : "at the hold";
      const opens = hit.unlock ? ` ${hit.unlock}` : "";
      notes.push(`${spec.name} (${where}) — ${hit.name}. ${hit.text}${opens}`);
    }
  }
  return notes;
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

export function maybeRecruit(state: GameState, source: "walk" | "crossing" | "expedition", meetingBonus = 0): string | null {
  const locked = (state.heroes ?? []).filter((hero) => !hero.unlocked);
  if (locked.length === 0) return null;
  const roll = worldRng(
    ((state.seed ?? 0) ^ Math.imul((state.day ?? 1) + 91, 0x9e3779b1) ^ Math.imul((state.miles ?? 0) + FIND_SALT[source], 0x85ebca6b)) >>> 0,
  );
  const extra = Math.max(0, meetingBonus);
  const chance = Math.min(
    0.22 + extra,
    (source === "walk" ? 0.05 : source === "crossing" ? 0.04 : 0.06) + heroMeetingBonus(state, source) + extra,
  );
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
