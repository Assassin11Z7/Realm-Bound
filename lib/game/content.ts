import type {
  Banner,
  FactionId,
  GoodId,
  HoldId,
  LevyGood,
  Personality,
  SigilId,
  Stash,
  Title,
} from "./types";
import { GOODS, LEVY_GOODS } from "./types";

export const SEASON_DAYS = 12;
export const STARTING_GOLD = 22;
export const BASE_CAP = 40;
export const UNDERCROFT_CAP = 96;
export const UNDERCROFT_COST = 28;
export const FOUNDER_WITHDRAW_CAP = 8;
export const KEEP = 2;
export const NEED_TARGET = 3;
export const NEED_START = 2;
export const CONTENT_START = 68;
export const LEAVE_AT = 10;

export const LEVY_TARGET: Record<LevyGood, number> = {
  grain: 20,
  iron: 12,
  salt: 10,
};

export const PLAYER_YIELD: Record<GoodId, number> = {
  grain: 5,
  timber: 4,
  wool: 4,
  salt: 3,
  iron: 3,
  relics: 1,
};

export const NPC_YIELD: Record<GoodId, number> = {
  grain: 4,
  timber: 3,
  wool: 3,
  salt: 3,
  iron: 3,
  relics: 1,
};

export const BUY_PRICE: Record<GoodId, number> = {
  grain: 3,
  timber: 3,
  wool: 4,
  salt: 4,
  iron: 5,
  relics: 12,
};

export const SELL_PRICE: Record<GoodId, number> = {
  grain: 1,
  timber: 2,
  wool: 3,
  salt: 2,
  iron: 3,
  relics: 7,
};

export const DEPOSIT_CAP: Record<Personality, number> = {
  generous: 4,
  steady: 3,
  lean: 2,
};

export const DRAW_CAP: Record<Personality, number> = {
  generous: 1,
  steady: 2,
  lean: 3,
};

export const MOOD_DECAY: Record<Personality, number> = {
  generous: 6,
  steady: 8,
  lean: 9,
};

export const GOOD_LABEL: Record<GoodId, string> = {
  grain: "Grain",
  timber: "Timber",
  iron: "Iron",
  salt: "Salt",
  wool: "Wool",
  relics: "Relics",
};

export const PERSONALITY_LABEL: Record<Personality, string> = {
  generous: "Open hand",
  steady: "Even measure",
  lean: "Tight fist",
};

export const SIGIL_LABEL: Record<SigilId, string> = {
  crown: "Crown",
  sun: "Sun",
  scales: "Scales",
  antler: "Antler",
  wolf: "Wolf",
  tower: "Tower",
  wave: "Wave",
  wheat: "Wheat",
};

export const DIVISION_LABEL: Record<Banner["division"], string> = {
  plain: "Plain field",
  pale: "Split pale",
  fess: "Fess band",
  chevron: "Chevron",
};

export const FIELD_COLORS = [
  { id: "wax", hex: "#6e1e22", name: "Wax red" },
  { id: "sea", hex: "#1e3a40", name: "Sea green" },
  { id: "moss", hex: "#2c4a38", name: "Moss" },
  { id: "ink", hex: "#1c1612", name: "Ink" },
  { id: "leather", hex: "#6b4428", name: "Leather" },
  { id: "dusk", hex: "#3a3154", name: "Dusk" },
] as const;

export const CHARGE_COLORS = [
  { id: "parchment", hex: "#f4ead7", name: "Parchment" },
  { id: "gold", hex: "#e6c56e", name: "Gold" },
  { id: "bone", hex: "#e7e0d4", name: "Bone" },
  { id: "verdigris", hex: "#8fd0c6", name: "Verdigris" },
  { id: "copper", hex: "#e08a45", name: "Copper" },
  { id: "white", hex: "#f7f7f5", name: "White" },
] as const;

export interface Faction {
  id: FactionId;
  name: string;
  motto: string;
  bonus: string;
  summary: string;
  banner: Banner;
}

export const FACTIONS: Faction[] = [
  {
    id: "crown",
    name: "Crown of the Westmark",
    motto: "The road is the realm.",
    bonus: "Pledging to the levy pays gold. Two units become a coin.",
    summary:
      "You keep the northern road, and the tolls keep you. Best when you mean to fill the levy yourself.",
    banner: { field: "#6e1e22", charge: "#e6c56e", sigil: "crown", division: "fess" },
  },
  {
    id: "canticle",
    name: "The Stone Canticle",
    motto: "What is given is kept.",
    bonus: "Offer a relic and it counts as one unit of whatever the levy lacks most.",
    summary:
      "Cloisters and candle smoke. Relics are a second purse, if the saints are the ones counting.",
    banner: { field: "#3a3154", charge: "#e7e0d4", sigil: "sun", division: "plain" },
  },
  {
    id: "copper",
    name: "The Copper Road",
    motto: "Coin has no homeland.",
    bonus: "The caravan buys for one more gold and sells for one less.",
    summary:
      "Factors and scales. Strongest when your hold grows wool, timber, or relics and the levy must be bought.",
    banner: { field: "#1c1612", charge: "#e08a45", sigil: "scales", division: "pale" },
  },
  {
    id: "deepwood",
    name: "The Deepwood Host",
    motto: "Root before crown.",
    bonus: "Your hold yields one extra unit each dawn.",
    summary:
      "Warden-clans who measure a good year in full stores. The extra unit matters most on a rich hold.",
    banner: { field: "#2c4a38", charge: "#e6c56e", sigil: "antler", division: "chevron" },
  },
];

export interface Hold {
  id: HoldId;
  name: string;
  region: string;
  produces: GoodId;
  needs: GoodId[];
  text: string;
  lord: string;
  epithet: string;
  personality: Personality;
  x: number;
  y: number;
}

export const HOLDS: Hold[] = [
  {
    id: "highbarrow",
    name: "Highbarrow",
    region: "The pale mountains",
    produces: "iron",
    needs: ["grain", "salt"],
    text: "The mines sweat rust-water. Bread and salt come from lower country, or they do not come.",
    lord: "Osric Venn",
    epithet: "mine-lord",
    personality: "lean",
    x: 214,
    y: 78,
  },
  {
    id: "ashfold",
    name: "Ashfold",
    region: "The regrown wood",
    produces: "timber",
    needs: ["grain", "iron"],
    text: "A forest that burned in a grandfather's war and came back meaner. The axes go quiet without iron.",
    lord: "Torin Ash",
    epithet: "wood-warden",
    personality: "generous",
    x: 258,
    y: 164,
  },
  {
    id: "greenmere",
    name: "Greenmere",
    region: "The river meads",
    produces: "grain",
    needs: ["iron", "salt"],
    text: "The best bread-land in the Westmark, and the first to go short of iron when a plow breaks.",
    lord: "Alda Fenn",
    epithet: "river-reeve",
    personality: "steady",
    x: 156,
    y: 198,
  },
  {
    id: "saltmere",
    name: "Saltmere",
    region: "The grey coast",
    produces: "salt",
    needs: ["timber", "grain"],
    text: "Pans, racks, and a wind that pickles the air. The salters trade salt for timber and bread.",
    lord: "Mira Calder",
    epithet: "salter",
    personality: "generous",
    x: 92,
    y: 278,
  },
  {
    id: "vesper",
    name: "Vesper",
    region: "The cliff cloister",
    produces: "relics",
    needs: ["grain", "timber"],
    text: "A monastery that sells the past to pay for bread. One relic a dawn, when the keeper is honest.",
    lord: "Caldus Ree",
    epithet: "relic-keeper",
    personality: "lean",
    x: 240,
    y: 300,
  },
  {
    id: "woolford",
    name: "Woolford",
    region: "The wind hills",
    produces: "wool",
    needs: ["grain", "salt"],
    text: "Flocks the color of dirty snow. Wool buys what the hills refuse to grow.",
    lord: "Nell Weaver",
    epithet: "flock-keep",
    personality: "steady",
    x: 146,
    y: 378,
  },
];

const FILL_ORDER: HoldId[] = ["ashfold", "woolford", "vesper", "greenmere", "highbarrow", "saltmere"];

export function holdById(id: HoldId): Hold {
  const hold = HOLDS.find((item) => item.id === id);
  if (!hold) throw new Error(`Unknown hold ${id}`);
  return hold;
}

export function factionById(id: FactionId): Faction {
  const faction = FACTIONS.find((item) => item.id === id);
  if (!faction) throw new Error(`Unknown faction ${id}`);
  return faction;
}

export function emptyStash(): Stash {
  return { grain: 0, timber: 0, iron: 0, salt: 0, wool: 0, relics: 0 };
}

export function isLevyGood(good: GoodId): good is LevyGood {
  return (LEVY_GOODS as readonly string[]).includes(good);
}

export function stashCount(stash: Stash): number {
  return GOODS.reduce((sum, good) => sum + stash[good], 0);
}

export function pickOathbound(playerHold: HoldId): HoldId[] {
  const levyHolds: HoldId[] = ["greenmere", "highbarrow", "saltmere"];
  const needed = levyHolds.filter((id) => id !== playerHold);
  const rest = FILL_ORDER.filter((id) => id !== playerHold && !needed.includes(id));
  return [...needed, ...rest].slice(0, 3);
}

export type SeasonName = "thaw" | "green" | "harvest" | "frost" | "deepwinter";

export function seasonOf(day: number): SeasonName {
  if (day <= 3) return "thaw";
  if (day <= 6) return "green";
  if (day <= 9) return "harvest";
  if (day <= 12) return "frost";
  return "deepwinter";
}

export function seasonLabel(day: number): string {
  switch (seasonOf(day)) {
    case "thaw":
      return "Thaw";
    case "green":
      return "Green";
    case "harvest":
      return "Harvest";
    case "frost":
      return "Frost";
    case "deepwinter":
      return "Deep winter";
  }
}

export function seasonNote(day: number): string {
  switch (seasonOf(day)) {
    case "thaw":
      return "Mud on the coast. Salt is dear.";
    case "green":
      return "The road is ordinary. Prices sit where they usually sit.";
    case "harvest":
      return "The meads are in. Grain is cheap.";
    case "frost":
      return "Frost on the road. Bread and iron cost more.";
    case "deepwinter":
      return "Deep winter. Yields thin, and the caravan knows it.";
  }
}

export function renownTitle(renown: number): string {
  if (renown >= 24) return "Warden of the Road";
  if (renown >= 14) return "Marcher";
  if (renown >= 6) return "Reeve";
  return "Bannered";
}

export function contentWord(contentment: number, inCompact: boolean): string {
  if (!inCompact) return "Oathbroken";
  if (contentment >= 80) return "Steadfast";
  if (contentment >= 50) return "Sworn";
  if (contentment >= 25) return "Restless";
  return "Fraying";
}

export function defaultCompactName(name: string, holdId: HoldId): string {
  const hold = holdById(holdId).name;
  const trimmed = name.trim();
  if (!trimmed) return `The ${hold} Compact`;
  return `${trimmed}'s Compact`;
}

export function suggestedTitle(factionId: FactionId): Title {
  switch (factionId) {
    case "crown":
      return "Lord";
    case "canticle":
      return "Keeper";
    case "copper":
      return "Factor";
    case "deepwood":
      return "Warden";
  }
}

export const RULES: { title: string; body: string }[] = [
  {
    title: "Land is unequal",
    body: "Every hold grows one good and hungers for others. Trade is geography. If your hills grow wool, someone else's mine must feed you iron.",
  },
  {
    title: "The hall is not the levy",
    body: "Goods in the hall can be drawn by your oathbound. Goods pledged to the levy are gone: they provision the northern road and cannot be taken back.",
  },
  {
    title: "Kin stay while they eat",
    body: "Each dusk they draw from the hall, then eat. Leave a share, or send a gift. If the chests are bare night after night, they take their banners home and their yields with them.",
  },
  {
    title: "Twelve dawns",
    body: "The levy is counted when you seal the twelfth day. The caravan is not always on the road. Your compact is.",
  },
];
