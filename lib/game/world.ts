import { HOLDS, WYRM_NAME, holdById } from "./content";
import type { Cutscene, GameState, Gear, GearSlot, HoldId, Quest, QuestKind, Rarity, RelicId, WornSlot } from "./types";

export function worldRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const CARRY_BASE = 120;
export const VAULT_BASE = 240;

export const WORN_SLOTS: WornSlot[] = ["hand", "cloak", "charm", "ring"];

type Piece = { name: string; slot: GearSlot; trait: Gear["trait"]; line: string };

const TREASURES: Piece[] = [
  { name: "Road knife", slot: "hand", trait: "luck", line: "Short, chipped, and honest about both." },
  { name: "Salt hook", slot: "hand", trait: "purse", line: "Salt workers use it to drag salt ashore." },
  { name: "Ash staff", slot: "hand", trait: "lore", line: "It has walked more timber roads than you have." },
  { name: "Mine pick", slot: "hand", trait: "luck", line: "Highbarrow iron still smells on the head." },
  { name: "Ford spear", slot: "hand", trait: "ward", line: "A watchman's spear, notched where a shield met it." },
  { name: "Bell hammer", slot: "hand", trait: "lore", line: "Small enough for a shrine bell, heavy enough for a nail." },
  { name: "Deer spear", slot: "hand", trait: "luck", line: "The point is pale, as if it had been left in snow." },
  { name: "Dragon needle", slot: "hand", trait: "ward", line: "A sliver of pale horn longer than a hand. It hums in frost." },
  { name: "Wool cloak", slot: "cloak", trait: "luck", line: "Woolford weight. It keeps the mist on the outside." },
  { name: "Ford cloak", slot: "cloak", trait: "ward", line: "Oiled against the river. The hem is darker than the rest." },
  { name: "Snow cloak", slot: "cloak", trait: "ward", line: "Pale wool lined with something that used to be warmer." },
  { name: "Salt cloak", slot: "cloak", trait: "purse", line: "Stiff with salt. Traders know the cut." },
  { name: "Greenmere weave", slot: "cloak", trait: "lore", line: "Grain-colored, and it still smells of the mill." },
  { name: "Vesper veil", slot: "cloak", trait: "lore", line: "Thin as candle smoke. The saints are stitched in the hem." },
  { name: "Ash cloak", slot: "cloak", trait: "luck", line: "Timber-soot in the folds. It does not show the road." },
  { name: "Dragon hide", slot: "cloak", trait: "ward", line: "A scale-cloak. Vell would know the beast it came from." },
  { name: "Crow bead", slot: "charm", trait: "lore", line: "Black glass. It clicks when a lie is close." },
  { name: "Bell shard", slot: "charm", trait: "ward", line: "A cracked piece of a tide-bell. It still wants salt." },
  { name: "Saint nail", slot: "charm", trait: "lore", line: "Bent, blessed, and too warm for the weather." },
  { name: "Deer tooth", slot: "charm", trait: "luck", line: "The white deer leaves these when it is not caught." },
  { name: "Salt pearl", slot: "charm", trait: "purse", line: "Not a pearl. A grain of salt that forgot how to dissolve." },
  { name: "Mine whistle", slot: "charm", trait: "luck", line: "Highbarrow miners hear it before the mine shifts." },
  { name: "Candle stub", slot: "charm", trait: "lore", line: "It has been lit in more shrines than one hold owns." },
  { name: "Dragon scale", slot: "charm", trait: "ward", line: "Pale as river ice. The gold crack is real." },
  { name: "Copper band", slot: "ring", trait: "purse", line: "Guild-marked. The weight is slightly kind." },
  { name: "Salt ring", slot: "ring", trait: "purse", line: "A hoop of pale metal that crusts in wet air." },
  { name: "Iron thumb", slot: "ring", trait: "luck", line: "Too big for a gentle hand. The mine likes it." },
  { name: "Saint loop", slot: "ring", trait: "lore", line: "A ring of braided wire from a Vesper candle stand." },
  { name: "Dragon ring", slot: "ring", trait: "ward", line: "Cold even in a fist. Frost does not stick to it." },
  { name: "Deer ring", slot: "ring", trait: "luck", line: "Antler polished down to a circle. It points at fords." },
  { name: "Bone ring", slot: "ring", trait: "lore", line: "Someone was buried with the rest of the set." },
  { name: "Ford ring", slot: "ring", trait: "purse", line: "Toll-keepers wear these so the coin knows them." },
  { name: "Painted cup", slot: "hoard", trait: "purse", line: "A feast cup. The hunt on it is older than the compact." },
  { name: "Ivory tooth", slot: "hoard", trait: "ward", line: "Too large for a wolf. The root is still gold at the edge." },
  { name: "Frozen tear", slot: "hoard", trait: "ward", line: "A drop of melt that refused the thaw. It chills the pack." },
  { name: "Map scrap", slot: "hoard", trait: "lore", line: "Half a road, and a hold that is not on your map." },
  { name: "Bell coin", slot: "hoard", trait: "purse", line: "Struck for a shrine, spent on a ferry, lost in a ditch." },
  { name: "Guild weight", slot: "hoard", trait: "purse", line: "Copper Road bronze. It makes other coins look light." },
  { name: "Antler chip", slot: "hoard", trait: "luck", line: "The white deer passed close enough to leave this." },
  { name: "Saint's thumb", slot: "hoard", trait: "lore", line: "A holy box no bigger than a walnut. The hinge still works." },
  { name: "Old crown bit", slot: "hoard", trait: "purse", line: "Not a crown. A hinge from one, set with a dull red stone." },
  { name: "Dragon pearl", slot: "hoard", trait: "ward", line: "Pale glass from a frost belly. Vell watches anyone who holds it." },
  { name: "Mine nugget", slot: "hoard", trait: "luck", line: "Iron that grew in a fist. The mine dragon would want it back." },
  { name: "Tide glass", slot: "hoard", trait: "lore", line: "Saltmere green, full of a tiny trapped wave." },
];

export function treasureCount(): number {
  return TREASURES.length;
}

/** Deer kit. Hunt is not a stored trait: these pieces keep luck, purse, ward, or lore, and heroes read the family beside the trait. */
const HUNT_NAMES = new Set(["Deer spear", "Deer tooth", "Deer ring"]);

export function isHuntGear(gear: Gear): boolean {
  return gear.slot !== "hoard" && HUNT_NAMES.has(gear.name);
}

/** A hand piece is a smith piece. The forge project is what makes a worn one add luck. */
export function isSmithGear(gear: Gear): boolean {
  return gear.slot === "hand";
}

export const RELIC_WALK_CHANCE = 0.18;
export const RELIC_CROSSING_CHANCE = 0.24;
export const RELIC_EXPEDITION_CHANCE = 0.72;
export const RELIC_EXPEDITION_BELL_CHANCE = 0.9;

type RelicSpec = {
  id: RelicId;
  name: string;
  slot: GearSlot;
  trait: Gear["trait"];
  line: string;
  blurb: string;
  effect: string;
};

export const RELICS: RelicSpec[] = [
  {
    id: "unspoken-hem",
    name: "Unspoken Hem",
    slot: "cloak",
    trait: "ward",
    line: "A hem stitched with a vow the wagons already heard.",
    blurb: "forgives one failed bargain or sour petition each call of the wagons",
    effect:
      "Once each call of the wagons, the first failed bargain or sour petition does not land. The stake is still paid. The harm is not. It is ready again when the wagons are called next.",
  },
  {
    id: "barrow-band",
    name: "Barrow Band",
    slot: "ring",
    trait: "luck",
    line: "Iron grown in a grave, still warm when the grain is counted.",
    blurb: "doubles one hold's grain or iron, cools a bond, and wakes Vell faster",
    effect:
      "While worn, your hold's grain or iron yield is doubled at dawn. If your hold grows neither, one sworn hold's grain or iron is doubled instead. Each dawn a sworn bond cools by four, and Vell's anger climbs one faster.",
  },
  {
    id: "salt-charter",
    name: "Salt Charter",
    slot: "charm",
    trait: "lore",
    line: "A salt-stained writ that names a law the hall has not spoken.",
    blurb: "unlocks the law Salt the road, and the Salt Widow may cross",
    effect:
      "While it is in the bag or the strongroom, you may set the law Salt the road: firewood lasts longer, and Vell's anger climbs one faster each dawn. The Salt Widow can meet you on the road. She was not there before the charter.",
  },
  {
    id: "carter-knot",
    name: "Carter's Knot",
    slot: "charm",
    trait: "purse",
    line: "A wagon-knot that remembers every bell between holds.",
    blurb: "a successful call pays more, and the next call comes sooner",
    effect:
      "While worn, a successful call of the wagons pays 6 more gold. When the wagons leave with it worn, the next call comes three dawns sooner.",
  },
  {
    id: "ford-bell",
    name: "Ford Bell",
    slot: "hand",
    trait: "lore",
    line: "A fist-sized bell that rings only when a wagon comes home.",
    blurb: "walks teach three more, and a successful call more often leaves a relic",
    effect: "While worn, each walk teaches three more. A successful call of the wagons is more likely to leave a unique relic in the pack.",
  },
];

const RELIC_IDS = new Set<string>(RELICS.map((item) => item.id));

export function relicSpec(id: RelicId): RelicSpec | undefined {
  return RELICS.find((item) => item.id === id);
}

export function isRelicName(name: string): boolean {
  return RELICS.some((item) => item.name === name);
}

export function makeRelic(id: RelicId, gearId: string): Gear {
  const spec = relicSpec(id);
  if (!spec) {
    return {
      id: gearId,
      name: "Lost relic",
      slot: "charm",
      rarity: "relic",
      luck: 1,
      trait: "lore",
      worth: 28,
      line: "The name wore off.",
    };
  }
  return {
    id: gearId,
    name: spec.name,
    slot: spec.slot,
    rarity: "relic",
    luck: 1,
    trait: spec.trait,
    worth: 28,
    line: spec.line,
    relic: spec.id,
  };
}

export function ownedRelicIds(state: GameState): RelicId[] {
  const ids: RelicId[] = [];
  for (const gear of [...(state.pack ?? []), ...(state.vault ?? [])]) {
    if (gear.relic && !ids.includes(gear.relic)) ids.push(gear.relic);
  }
  return ids;
}

export function wornRelic(state: GameState, id: RelicId): boolean {
  return companyGear(state).some((gear) => gear.relic === id);
}

export function ownsRelic(state: GameState, id: RelicId): boolean {
  return ownedRelicIds(state).includes(id);
}

export function pardonReady(state: GameState): boolean {
  if (!wornRelic(state, "unspoken-hem")) return false;
  const cycle = state.expedition?.cycle ?? 1;
  return state.pardonCall !== cycle;
}

export function spendPardon(state: GameState) {
  state.pardonCall = state.expedition?.cycle ?? 1;
}

export function bandYieldNote(state: GameState): string | null {
  if (!wornRelic(state, "barrow-band")) return null;
  const good = holdById(state.player.holdId).produces;
  if (good === "grain" || good === "iron") {
    return "The Barrow Band doubles that yield. A sworn bond cools, and Vell's anger climbs faster.";
  }
  return "The Barrow Band doubles one sworn hold's grain or iron instead. A bond cools, and Vell's anger climbs faster.";
}

export function gearCompare(gear: Gear, worn: Gear | null, isWorn = false): string {
  const spec = gear.relic ? relicSpec(gear.relic) : undefined;
  if (!spec) {
    if (!worn || worn.id === gear.id) return "";
    return `Worn now: ${worn.name}. ${traitText(worn)}`;
  }
  if (isWorn || worn?.id === gear.id) return `Worn. This changes the season: ${spec.effect}`;
  if (!worn) return `Nothing is worn in the ${gear.slot}. Wearing this changes the season: ${spec.effect}`;
  return `Worn now: ${worn.name}. ${traitText(worn)} This relic changes the season: ${spec.effect}`;
}

export function rollUniqueRelic(
  seed: number,
  day: number,
  miles: number,
  salt: number,
  chance: number,
  owned: RelicId[],
): Gear | null {
  if (chance <= 0) return null;
  const roll = worldRng((seed ^ Math.imul(day + 19, 0x9e3779b1) ^ Math.imul(miles + salt, 0x85ebca6b)) >>> 0);
  if (roll() >= chance) return null;
  const pool = RELICS.filter((item) => !owned.includes(item.id));
  if (pool.length === 0) return null;
  const piece = pool[Math.floor(roll() * pool.length) % pool.length];
  const stamp = Math.floor(roll() * 10000);
  return makeRelic(piece.id, `relic-${day}-${miles}-${salt}-${stamp}`);
}

/** Chance a walk, crossing, or wagon call drops a unique relic. `bonus` is hero kit, already capped by the caller. */
export function relicFindChance(
  state: GameState,
  source: "walk" | "crossing" | "expedition",
  bonus = 0,
): number {
  const watch = (state.campaign?.realmWorks ?? []).some((work) => work.id === "watchtower");
  const base =
    source === "expedition"
      ? wornRelic(state, "ford-bell")
        ? RELIC_EXPEDITION_BELL_CHANCE
        : RELIC_EXPEDITION_CHANCE
      : source === "crossing"
        ? RELIC_CROSSING_CHANCE
        : RELIC_WALK_CHANCE + (watch ? 0.06 : 0);
  return Math.min(0.95, base + Math.max(0, bonus));
}

export function awardUniqueRelic(
  state: GameState,
  source: "walk" | "crossing" | "expedition",
  bonus = 0,
): { gear: Gear; packed: boolean } | null {
  const chance = relicFindChance(state, source, bonus);
  const salt = source === "walk" ? 11 : source === "crossing" ? 41 : 90 + (state.expedition?.cycle ?? 1);
  const gear = rollUniqueRelic(state.seed ?? 0, state.day, state.miles ?? 0, salt, chance, ownedRelicIds(state));
  if (!gear) return null;
  if (carriedWeight(state) + gearWeight(gear) > carryCap(state)) return { gear, packed: false };
  state.pack = [...(state.pack ?? []), gear];
  bumpQuest(state, "loot", "any", 1);
  return { gear, packed: true };
}

function worthFor(rarity: Rarity, luck: number): number {
  if (rarity === "relic") return 12 + luck * 4;
  if (rarity === "uncanny") return 6 + luck * 2;
  return 3 + luck;
}

function pickSlot(roll: number): GearSlot {
  if (roll < 0.2) return "hand";
  if (roll < 0.38) return "cloak";
  if (roll < 0.58) return "charm";
  if (roll < 0.76) return "ring";
  return "hoard";
}

/** Extra luck added to a walk once a watchtower stands. Finds shift kinder. */
export const WATCH_FIND_LUCK = 1;
/** How far the relic line drops on a walk once a watchtower stands. */
export const WATCH_RELIC_BIAS = 0.03;
export const INFLUENCE_CAP = 40;
export const INFLUENCE_HALL = 64;
export const INFLUENCE_COUNSEL = 80;
export const HALL_LOYALTY = 2;

export function hallFunded(state: GameState): boolean {
  return (state.campaign?.realmWorks ?? []).some((work) => work.id === "hall");
}

export function counselStanding(state: GameState): boolean {
  return (state.campaign?.realmWorks ?? []).some((work) => work.id === "counsel");
}

export function influenceCap(state: GameState): number {
  if (counselStanding(state)) return INFLUENCE_COUNSEL;
  return hallFunded(state) ? INFLUENCE_HALL : INFLUENCE_CAP;
}

/** Adds renown without passing the influence cap, and never strips renown already earned. */
export function gainRenown(state: GameState, amount: number) {
  if (!amount) return;
  if (amount < 0) {
    state.player.renown = Math.max(0, state.player.renown + amount);
    return;
  }
  const ceiling = Math.max(state.player.renown, influenceCap(state));
  state.player.renown = Math.min(ceiling, state.player.renown + amount);
}

/** A worn hand piece counts as a smith piece once the forge project stands. */
export function smithLuck(state: GameState): number {
  const forged = (state.campaign?.realmWorks ?? []).some((work) => work.id === "bench" && work.bench === "forge");
  if (!forged) return 0;
  const handId = state.worn?.hand;
  if (!handId) return 0;
  return (state.pack ?? []).some((gear) => gear.id === handId && gear.slot === "hand") ? 1 : 0;
}

export function rollGear(seed: number, day: number, miles: number, relicBias = 0): Gear {
  const roll = worldRng((seed ^ Math.imul(day + 3, 0x9e3779b1) ^ Math.imul(miles + 5, 0x85ebca6b)) >>> 0);
  const rarityRoll = roll();
  const relicAt = 0.93 - Math.max(0, relicBias);
  const rarity: Rarity = rarityRoll > relicAt ? "relic" : rarityRoll > 0.66 ? "uncanny" : "common";
  const slot = pickSlot(roll());
  const pool = TREASURES.filter((piece) => piece.slot === slot);
  const piece = pool[Math.floor(roll() * pool.length)];
  const luck = rarity === "relic" ? 3 : rarity === "uncanny" ? 2 : 1;
  const stamp = Math.floor(roll() * 10000);
  return {
    id: `gear-${day}-${miles}-${slot}-${stamp}`,
    name: piece.name,
    slot,
    rarity,
    luck,
    trait: piece.trait,
    worth: worthFor(rarity, luck),
    line: piece.line,
  };
}

export function starterCloak(): Gear {
  return {
    id: "gear-start-cloak",
    name: "Travel cloak",
    slot: "cloak",
    rarity: "common",
    luck: 1,
    trait: "luck",
    worth: 3,
    line: "The cloak you walked in with. It keeps the first rain off.",
  };
}

export function traitText(gear: Gear): string {
  const spec = gear.relic ? relicSpec(gear.relic) : undefined;
  if (spec) return `Unique relic · ${spec.blurb} · sell ${gear.worth}g`;
  const hunt = isHuntGear(gear) ? "Hunt · " : "";
  if (gear.slot === "hoard") return `Treasure · sell for ${gear.worth}g`;
  if (gear.slot === "hand") {
    if (gear.trait === "purse") return `${hunt}Smith · coin · worn, the caravan pays 1 more · sell ${gear.worth}g`;
    if (gear.trait === "ward") return `${hunt}Smith · guard · worn, Vell's anger climbs more slowly · sell ${gear.worth}g`;
    if (gear.trait === "lore") return `${hunt}Smith · learning · worn, the road teaches more · sell ${gear.worth}g`;
    return `${hunt}Smith · luck ${gear.luck} · sell ${gear.worth}g`;
  }
  if (gear.trait === "purse") return `${hunt}Coin · worn, the caravan pays 1 more · sell ${gear.worth}g`;
  if (gear.trait === "ward") return `${hunt}Guard · worn, Vell's anger climbs more slowly · sell ${gear.worth}g`;
  if (gear.trait === "lore") return `${hunt}Learning · worn, the road teaches more · sell ${gear.worth}g`;
  return `${hunt}Luck ${gear.luck} · sell ${gear.worth}g`;
}

/** Gear that is actually on the road: the legacy worn map, plus every piece on a fielded hero. */
export function companyGear(state: GameState): Gear[] {
  const seen = new Set<string>();
  const found: Gear[] = [];
  const add = (id: string | undefined) => {
    if (!id || seen.has(id)) return;
    const gear = (state.pack ?? []).find((item) => item.id === id);
    if (!gear) return;
    seen.add(id);
    found.push(gear);
  };
  for (const id of Object.values(state.worn ?? {})) add(id);
  for (const hero of state.heroes ?? []) {
    if (!hero.fielded) continue;
    for (const id of Object.values(hero.worn ?? {})) add(id);
  }
  return found;
}

function wornGear(state: GameState): Gear[] {
  return companyGear(state);
}

function ordinaryTrait(state: GameState, trait: Gear["trait"]): number {
  return wornGear(state).filter((gear) => gear.trait === trait && !gear.relic).length;
}

export function purseBonus(state: GameState): number {
  return Math.min(2, ordinaryTrait(state, "purse"));
}

export function wardBonus(state: GameState): number {
  return ordinaryTrait(state, "ward") > 0 ? 1 : 0;
}

export function loreBonus(state: GameState): number {
  return Math.min(2, ordinaryTrait(state, "lore"));
}

export function fillGear(gear: Gear): Gear {
  const trait = gear.trait === "purse" || gear.trait === "ward" || gear.trait === "lore" || gear.trait === "luck" ? gear.trait : "luck";
  const worth = typeof gear.worth === "number" && gear.worth > 0 ? gear.worth : worthFor(gear.rarity, gear.luck);
  const relic = gear.relic && RELIC_IDS.has(gear.relic) ? gear.relic : undefined;
  const next: Gear = { ...gear, trait, worth };
  if (relic) next.relic = relic;
  else delete next.relic;
  return next;
}

export function luckOf(state: GameState): number {
  let luck = 0;
  for (const gear of companyGear(state)) luck += gear.luck;
  if (state.campaign?.skills.includes("step")) luck += 1;
  if ((state.tonics?.luck ?? 0) > 0) luck += 2;
  luck += smithLuck(state);
  return luck;
}

export function gearWeight(gear: Gear): number {
  if (gear.slot === "cloak") return 3;
  if (gear.slot === "hand" || gear.slot === "hoard") return 2;
  return 1;
}

export function carryCap(state: GameState): number {
  return CARRY_BASE + (state.campaign?.buildings.watch ?? 0) * 15;
}

export function vaultCap(state: GameState): number {
  return VAULT_BASE + (state.campaign?.buildings.strongroom ?? 0) * 160;
}

export function stackWeight(stacks: Partial<Record<string, number>> | undefined): number {
  let sum = 0;
  for (const count of Object.values(stacks ?? {})) sum += count || 0;
  return sum;
}

export function carriedWeight(state: GameState): number {
  return (state.pack ?? []).reduce((sum, gear) => sum + gearWeight(gear), 0) + stackWeight(state.brew);
}

export function storedWeight(state: GameState): number {
  return (state.vault ?? []).reduce((sum, gear) => sum + gearWeight(gear), 0) + stackWeight(state.cellar);
}

export function makePiece(name: string, rarity: Rarity, id: string): Gear | null {
  const piece = TREASURES.find((item) => item.name === name);
  if (!piece) return null;
  const luck = rarity === "relic" ? 3 : rarity === "uncanny" ? 2 : 1;
  return {
    id,
    name: piece.name,
    slot: piece.slot,
    rarity,
    luck,
    trait: piece.trait,
    worth: worthFor(rarity, luck),
    line: piece.line,
  };
}

export function openingQuests(seed: number, home: HoldId): Quest[] {
  const others = HOLDS.map((hold) => hold.id).filter((id) => id !== home);
  const roll = worldRng(seed ^ 0x51ed);
  const visit = others[Math.floor(roll() * others.length)];
  const goods = ["grain", "iron", "salt"] as const;
  const good = goods[Math.floor(roll() * goods.length)];
  const pay = (base: number) => base + Math.floor(roll() * 6);
  const place = holdById(visit);
  return [
    {
      id: "visit",
      title: `Walk to ${place.name}`,
      giver: "The road",
      detail: `Set your boots in ${place.name}. The map is not the walk.`,
      kind: "visit",
      target: visit,
      need: 1,
      progress: 0,
      status: "open",
      reward: pay(8),
    },
    {
      id: "pledge",
      title: `Send ${good} to the wagons`,
      giver: "The wagons",
      detail: `Four ${good}, from your own stores, onto the wagons.`,
      kind: "pledge",
      target: good,
      need: 4,
      progress: 0,
      status: "open",
      reward: pay(6),
    },
    {
      id: "loot",
      title: "Bring something back",
      giver: "The ditch",
      detail: "Walk until the road leaves a found thing in your pack.",
      kind: "loot",
      target: "any",
      need: 1,
      progress: 0,
      status: "open",
      reward: pay(5),
    },
    {
      id: "tribute",
      title: "Quiet Vell",
      giver: WYRM_NAME,
      detail: "Lay any tribute. Iron, salt, or a relic.",
      kind: "tribute",
      target: "any",
      need: 1,
      progress: 0,
      status: "open",
      reward: pay(7),
    },
  ];
}

export function bumpQuest(state: GameState, kind: QuestKind, target: string, amount: number) {
  for (const quest of state.quests ?? []) {
    if (quest.status !== "open" || quest.kind !== kind) continue;
    if (quest.target !== "any" && quest.target !== target) continue;
    quest.progress = Math.min(quest.need, quest.progress + amount);
    if (quest.progress >= quest.need) quest.status = "ready";
  }
}

export function openingScene(name: string, holdName: string): Cutscene {
  return {
    id: "opening",
    index: 0,
    beats: [
      {
        speaker: "The Westmark",
        line: `${name} raises a banner at ${holdName}. The road north is a debt, not a story.`,
        art: "/art/title-valley.jpg",
      },
      {
        speaker: WYRM_NAME,
        line: "Twelve dawns. The wagons are called. Feed them, or I come down that road myself. Then the valley is yours again, until I call.",
        art: "/art/wyrm-vell.jpg",
      },
      {
        speaker: name,
        line: "Then we walk. Sela of the Gate carries the cloak. The holds are uneven, and the pack is still light.",
        art: "/art/hall.jpg",
      },
    ],
  };
}

export type RoadFind = {
  kind: "cache" | "merchant" | "shadow" | "kin";
  gold: number;
  ire: number;
  gear: Gear | null;
  line: string;
  scene: Cutscene;
};

export function roadFind(seed: number, day: number, miles: number, dest: HoldId, luck: number, relicBias = 0): RoadFind {
  const roll = worldRng((seed ^ Math.imul(day + 11, 0xc2b2ae35) ^ Math.imul(miles + 2, 0x27d4eb2d)) >>> 0);
  const tilted = Math.min(0.99, Math.max(0, roll() - luck * 0.04));
  const kind: RoadFind["kind"] = tilted < 0.3 ? "cache" : tilted < 0.56 ? "merchant" : tilted < 0.8 ? "shadow" : "kin";
  const place = holdById(dest).name;
  const goldRoll = 2 + Math.floor(roll() * (4 + luck));
  if (kind === "cache") {
    const gear = rollGear(seed, day, miles, relicBias);
    return {
      kind,
      gold: 0,
      ire: 0,
      gear,
      line: `The ditch outside ${place} kept ${gear.name}.`,
      scene: {
        id: `road-${miles}`,
        index: 0,
        beats: [
          { speaker: "The road", line: `Between gates, the mud gives something up.`, art: "/art/caravan.jpg" },
          { speaker: gear.name, line: gear.line, art: rarityArt(gear.rarity) },
        ],
      },
    };
  }
  if (kind === "merchant") {
    const gear = roll() < 0.5 ? rollGear(seed, day, miles + 40, relicBias) : null;
    return {
      kind,
      gold: goldRoll,
      ire: 0,
      gear,
      line: gear
        ? `A walker pays ${goldRoll} gold for news of ${place}, and leaves ${gear.name}.`
        : `A walker pays ${goldRoll} gold for news of ${place}.`,
      scene: {
        id: `road-${miles}`,
        index: 0,
        beats: [
          { speaker: "A walker", line: `I will pay for a true word about ${place}.`, art: "/art/caravan.jpg" },
          {
            speaker: gear ? gear.name : "The road",
            line: gear ? gear.line : `${goldRoll} gold changes hands. The walker does not give a name.`,
            art: gear ? rarityArt(gear.rarity) : "/art/good-relics.jpg",
          },
        ],
      },
    };
  }
  if (kind === "shadow") {
    const ire = luck >= 3 ? -4 : 3;
    return {
      kind,
      gold: 0,
      ire,
      gear: null,
      line: ire < 0 ? `A wing passes over and does not dive. ${WYRM_NAME} looks away.` : `A wing shadow crosses the track. ${WYRM_NAME} notices.`,
      scene: {
        id: `road-${miles}`,
        index: 0,
        beats: [
          { speaker: WYRM_NAME, line: ire < 0 ? "Not today." : "I see the track you took.", art: "/art/wyrm-wing.jpg" },
          { speaker: "The road", line: ire < 0 ? "The snow goes quiet." : "The gold eye stays open a little longer.", art: "/art/wyrm-vell.jpg" },
        ],
      },
    };
  }
  const kinGold = 1 + Math.floor(roll() * 3);
  const gear = roll() < 0.45 ? rollGear(seed, day, miles + 70, relicBias) : null;
  return {
    kind,
    gold: kinGold,
    ire: -1,
    gear,
    line: gear
      ? `Someone bound for ${place} shares a fire, a coin, and ${gear.name}.`
      : `Someone bound for ${place} shares a fire and a little coin.`,
    scene: {
      id: `road-${miles}`,
      index: 0,
      beats: [
        { speaker: "A traveler", line: `The compact's banner is known on this stretch.`, art: "/art/portrait-torin.jpg" },
        {
          speaker: gear ? gear.name : "The road",
          line: gear ? gear.line : "You leave the fire with warmer hands and a coin you did not earn.",
          art: gear ? rarityArt(gear.rarity) : "/art/hall.jpg",
        },
      ],
    },
  };
}

function rarityArt(rarity: Rarity): string {
  if (rarity === "relic") return "/art/good-relics.jpg";
  if (rarity === "uncanny") return "/art/wyrm-speaks.jpg";
  return "/art/good-wool.jpg";
}

export function rewardScene(title: string, gold: number): Cutscene {
  return {
    id: `reward-${title}`,
    index: 0,
    beats: [
      { speaker: "A finished task", line: `${title}. The road pays ${gold} gold, and not all of it was promised.`, art: "/art/good-relics.jpg" },
    ],
  };
}
