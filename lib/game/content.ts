import type {
  Banner,
  FactionId,
  GoodId,
  HoldId,
  LevyGood,
  Omen,
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
  pale: "Split down the middle",
  fess: "Band across",
  chevron: "Upward point",
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
  { id: "verdigris", hex: "#8fd0c6", name: "Pale green" },
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
    bonus: "Sending goods to the wagons pays gold. Two units become a coin.",
    summary:
      "You keep the northern road, and the tolls keep you. Best when you mean to fill the wagons yourself.",
    banner: { field: "#6e1e22", charge: "#e6c56e", sigil: "crown", division: "fess" },
  },
  {
    id: "canticle",
    name: "The Stone Canticle",
    motto: "What is given is kept.",
    bonus: "Offer a relic and it counts as one unit of whatever the wagons lack most.",
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
      "Traders and weighing scales. Strongest when your hold grows wool, timber, or relics and the wagons must be bought.",
    banner: { field: "#1c1612", charge: "#e08a45", sigil: "scales", division: "pale" },
  },
  {
    id: "deepwood",
    name: "The Deepwood Host",
    motto: "Root before crown.",
    bonus: "Your hold yields one extra unit each dawn.",
    summary:
      "Wood clans who measure a good year in full stores. The extra unit matters most on a rich hold.",
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
  myth: string;
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
    myth: "A dragon nests under the mine terraces. The snow has older things in it than Vell alone.",
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
    myth: "The tall deer of the wood walks the regrown wood and keeps count of every careless axe.",
    lord: "Torin Ash",
    epithet: "wood-keeper",
    personality: "generous",
    x: 258,
    y: 164,
  },
  {
    id: "greenmere",
    name: "Greenmere",
    region: "The river fields",
    produces: "grain",
    needs: ["iron", "salt"],
    text: "The best bread-land in the Westmark, and the first to go short of iron when a plow breaks.",
    myth: "A river woman stands in the shallows and will trade grain for stranger gifts.",
    lord: "Alda Fenn",
    epithet: "river-keeper",
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
    text: "Salt pools, drying racks, and a wind that pickles the air. The salt workers trade salt for timber and bread.",
    myth: "A grey serpent patrols the salt pools. The salt workers leave it the first salt of the day.",
    lord: "Mira Calder",
    epithet: "salt-keeper",
    personality: "generous",
    x: 92,
    y: 278,
  },
  {
    id: "vesper",
    name: "Vesper",
    region: "The cliff chapel",
    produces: "relics",
    needs: ["grain", "timber"],
    text: "A monastery that sells the past to pay for bread. One relic a dawn, when the keeper is honest.",
    myth: "The chapel keeps a dragon-skull older than its saints, and the skull still dreams.",
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
    myth: "The flocks go still when a great wing crosses the hills. Saints, hounds, and worse use the same folds.",
    lord: "Nell Weaver",
    epithet: "flock-keeper",
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
  if (day <= 15) return "deepwinter";
  const span = (day - 16) % 15;
  if (span < 3) return "thaw";
  if (span < 6) return "green";
  if (span < 9) return "harvest";
  if (span < 12) return "frost";
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
      return "The fields are cut. Grain is cheap.";
    case "frost":
      return "Frost on the road. Bread and iron cost more, and Vell is listening.";
    case "deepwinter":
      return "Deep winter. Yields thin, and Vell has already come down once.";
  }
}

export function renownTitle(renown: number): string {
  if (renown >= 24) return "Warden of the Road";
  if (renown >= 14) return "Border lord";
  if (renown >= 6) return "Steward";
  return "New lord";
}

export function contentWord(contentment: number, inCompact: boolean): string {
  if (!inCompact) return "Left you";
  if (contentment >= 80) return "Steadfast";
  if (contentment >= 50) return "Sworn";
  if (contentment >= 25) return "Restless";
  return "Near leaving";
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
      return "Trader";
    case "deepwood":
      return "Ranger";
  }
}

export const WYRM_NAME = "Vell";

export const RULES: { title: string; body: string }[] = [
  {
    title: "The realm is the game",
    body: "Holds, loyalty, laws, oaths, and seats continue after any one call of the wagons. Seal the day, and the valley keeps growing.",
  },
  {
    title: "The wagon expedition",
    body: "Every so often the wagons are called. You have twelve dawns to fill them with grain, iron, and salt. Meet the call and a relic comes off the wagons, and often a unique one with it. Miss it and you can fill them late for a few dawns, or let them go and take a lesser spoil. Then they leave, and the call comes again.",
  },
  {
    title: "Heroes carry the gear",
    body: "You are the lord. Heroes wear the kit and walk the road. The armory on the Road tab is shared. Missions under Heroes are the sure way to recruit. A rare meeting can still name someone early. Divine figures are the hardest of all. A decree or a border path may ask for a named hero, fielded and wearing gear. Miss that, and the choice fails or pays less.",
  },
  {
    title: "Unique relics",
    body: "A walk or a creature crossing may leave a unique relic. Ordinary finds in the ditch stay ordinary. Wear the unique piece, or keep the Salt Charter, and the season itself changes. Worn by the right hero, a unique relic can open a choice that was not there before.",
  },
  {
    title: "Where things live",
    body: "Realm holds the map, bonds, decrees, and the morning status. Hold holds people, loyalty, laws, works, projects, and benches. Projects include politics: a joint watch, a hall of counsel, a drivers' charter, and an oath stone. Heroes holds the roster, the company you send out, and the missions that unlock them. Neighbors holds oaths, trade, captain orders, and the seats kept for a later war. Road holds the walk, your bag, the armory, and loot.",
  },
  {
    title: "Seal the day",
    body: "Sealing the day is how time moves. At dawn, your hold grows the good it makes. Do this when the day's choices are done.",
  },
  {
    title: "Neighbors and wagons",
    body: "Shared stores feed your sworn neighbors. What you send to the wagons is gone. When the wagons are off the road, the hall is still there.",
  },
  {
    title: "Vell, the people, and the seats",
    body: "Vell is a frost dragon. His anger is one danger, under Realm then Status. Your people need food, firewood, and a law. Two march seats stay empty until other players can sit them. Heat there is the hook a later alliance war will pull.",
  },
];

export const MILL_COST = { gold: 10, timber: 4 };
export const SHRINE_COST = { gold: 12 };
export const STAKE_COST = { gold: 8, iron: 2 };
export const IRE_START = 18;
export const IRE_STEP = 5;
export const IRE_STEP_STAKED = 2;
export const SCORCH_AT = 88;

export const OMEN_ON_DAY: Record<number, string> = {
  2: "drake",
  4: "nix",
  6: "wing",
  8: "antler",
  10: "serpent",
  12: "speaks",
};

export const OMENS: Omen[] = [
  {
    id: "drake",
    creature: "The mine dragon",
    title: "Something coughs in the mine",
    body: "A rust-scaled dragon has pushed into the Highbarrow mines. It wants iron the way a fire wants coal. Feed it, and it may show you a richer vein. Turn your back, and it will carry your name up to Vell.",
    art: "drake",
    choices: [
      { id: "feed", label: "Feed it 2 iron", detail: "It pays the iron back, and a little more. Vell hears less of you." },
      { id: "watch", label: "Let it crawl back", detail: "No goods spent. Vell's anger rises." },
    ],
  },
  {
    id: "nix",
    creature: "The river woman",
    title: "A woman in the river",
    body: "She stands where the river slows, weeds in her hair, and asks for grain. What she gives back is never the thing you offered.",
    art: "nix",
    choices: [
      { id: "give", label: "Give 3 grain", detail: "She leaves salt on the bank." },
      { id: "watch", label: "Tell it to go", detail: "It goes. One of your sworn neighbors sleeps badly." },
    ],
  },
  {
    id: "wing",
    creature: "Vell",
    title: "A wing over the wagons",
    body: "The frost dragon does not land. One wing covers the road, and the wagon drivers will not move until someone deals with the shadow or hides the herds.",
    art: "wing",
    choices: [
      { id: "tribute", label: "Offer 2 iron", detail: "Vell's anger falls. The wagons pay you a little gold for the courage." },
      { id: "hide", label: "Spend 6 gold to hide the herds", detail: "The wing passes. The dragon is not calmed, only unfed." },
    ],
  },
  {
    id: "antler",
    creature: "The antlered deer",
    title: "The wood keeps count",
    body: "It stands at the tree-line, tall as a chapel door, and looks at your timber. Leave a gift and your kin sleep easier. Take more, and someone in the compact will not forgive the noise.",
    art: "antler",
    choices: [
      { id: "offer", label: "Leave 3 timber", detail: "Every sworn neighbor steadies." },
      { id: "cut", label: "Cut anyway", detail: "You gain timber. One sworn neighbor sours." },
    ],
  },
  {
    id: "serpent",
    creature: "The slate serpent",
    title: "The first salt of the day",
    body: "Off Saltmere the serpent has lifted its head above the salt pools. The old bargain is salt. Break it, and the coast remembers.",
    art: "serpent",
    choices: [
      { id: "salt", label: "Give 3 salt", detail: "The serpent sinks. Traders on the road pay you for a quiet sea." },
      { id: "watch", label: "Keep the salt", detail: "Vell feels the insult. The dragon and the serpent are old allies." },
    ],
  },
  {
    id: "speaks",
    creature: "Vell",
    title: "The dragon speaks your name",
    body: "On the twelfth morning Vell lowers that pale head until one gold eye fills the weather. It will take a relic and sleep. Or you can tell it the road will answer.",
    art: "speaks",
    choices: [
      { id: "relic", label: "Give a relic", detail: "Vell's anger collapses. The snow goes quiet." },
      { id: "road", label: "The road will answer", detail: "You refuse the bargain. Your fame rises, and the dragon stays cold." },
    ],
  },
];

export const ROAD_SURPRISES: Omen[] = [
  {
    id: "ford-fog",
    creature: "The ford fog",
    title: "The fords close their eyes",
    body: "A white fog sits on the river fords and will not name itself. Carts that enter it come out short a sack, or they come out somewhere they did not mean to be.",
    art: "weather",
    passText: "You waited on the bank until the ford fog thinned, and let it pass.",
    choices: [
      { id: "mark", label: "Stake the ford", detail: "Spend 1 timber. Your sworn neighbors cross without losing the path." },
      { id: "cross", label: "Drive through", detail: "Stake 3 grain. The bones decide: 1–6 pays in salt and coin, 7–12 turns you around.", gamble: true },
    ],
  },
  {
    id: "candle-saint",
    creature: "A candle-saint",
    title: "A saint asks the road",
    body: "A barefoot saint stands in the ditch with a candle that does not lean in the wind. The saint will bless a storehouse for a relic, or you can blow the candle out and take what the wax remembers.",
    art: "saint",
    passText: "You bowed to the candle-saint and let the light go on down the road.",
    choices: [
      { id: "bless", label: "Give a relic", detail: "The storehouse is blessed. Vell looks elsewhere." },
      { id: "snuff", label: "Snuff the candle", detail: "Stake 6 gold. Bones 1–6 hide a relic and a purse. 7–12 leave the dark.", gamble: true },
    ],
  },
  {
    id: "cousin-banner",
    creature: "A cousin with a banner",
    title: "Kin at the gate",
    body: "A cousin you did not swear into the compact sits the saddle at your gate, banner furled. They will trade bread for iron like family, or you can send them into the hills with a purse and a lie.",
    art: "kin",
    passText: "Your cousin furled the banner and rode on. You let the visit pass.",
    choices: [
      { id: "trade", label: "Trade as kin", detail: "Give 2 grain. They leave 2 iron." },
      { id: "purse", label: "Send them with a purse", detail: "Stake 8 gold. Bones 1–6 bring iron and salt. 7–12 bring a story about you.", gamble: true },
    ],
  },
  {
    id: "bell-carter",
    creature: "The bell-carter",
    title: "A bell on the north road",
    body: "A carter walks ahead of the wagons with a bell the size of a fist. For a fee the bell will run a night load past Vell's shadow, or you can pay the honest toll in wool.",
    art: "road",
    passText: "The bell-carter rang once and went north without you. You let the bell pass.",
    choices: [
      { id: "toll", label: "Pay the wool toll", detail: "Spend 2 wool. Four gold comes back, and the road stays marked." },
      { id: "night", label: "Pay for the night load", detail: "Stake 4 gold. Bones 1–6 return with iron. 7–12 vanish into the frost.", gamble: true },
    ],
  },
  {
    id: "snow-bells",
    creature: "The snow-bells",
    title: "Bells under the frost",
    body: "Where the pass narrows, bells ring under the snow with nobody holding the rope. They are an old warning from Vell's country, and they are not Vell.",
    art: "wing",
    passText: "You stood still until the snow-bells stopped, and let them pass.",
    choices: [
      { id: "quiet", label: "Salt the bells", detail: "Spend 2 salt. The bells go quiet and the dragon's anger eases." },
      { id: "dig", label: "Dig under the bell", detail: "Stake 2 timber. Bones 1–6 hide a relic. 7–12 give way under you.", gamble: true },
    ],
  },
  {
    id: "seam-knock",
    creature: "A knocking in the mine",
    title: "Three knocks from below",
    body: "Something knocks three times in a mine shaft, not the mine dragon and not a man. It wants iron left on the ladder, or a light and a greedy hand.",
    art: "drake",
    passText: "You let the knocking finish its three beats and pass back into the rock.",
    choices: [
      { id: "rung", label: "Leave iron on the ladder", detail: "Spend 2 iron. A carter leaves gold, and the knocking stops." },
      { id: "descend", label: "Go down at the third knock", detail: "Stake 1 iron. Bones 1–6 climb out richer. 7–12 climb out afraid.", gamble: true },
    ],
  },
  {
    id: "tide-bell",
    creature: "The tide-bell",
    title: "A bell under the salt pools",
    body: "Off the grey coast a bell rings under the salt pools, answered by the grey water. A gift of grain keeps the tide in its bed. Hauling the bell up means owning whatever the sea was hiding.",
    art: "serpent",
    passText: "You left the tide-bell under the salt pools and let the ringing pass.",
    choices: [
      { id: "bed", label: "Keep the tide in its bed", detail: "Give 3 grain. The pools stay level and leave you salt." },
      { id: "haul", label: "Haul the bell", detail: "Stake 5 gold. Bones 1–6 spill salt and coin. 7–12 sink the bell.", gamble: true },
    ],
  },
  {
    id: "white-hart",
    creature: "The white deer",
    title: "A deer at the tree-line",
    body: "A white deer stands where the grown-back wood meets the road, antlers strung with moss. It is not the tall deer of the wood. Wool will lead a lost flock home. A chase lets the wood decide.",
    art: "antler",
    passText: "The white deer stepped into the trees. You let it pass.",
    choices: [
      { id: "wool", label: "Leave wool", detail: "Spend 2 wool. A lost flock finds the fold." },
      { id: "chase", label: "Chase it", detail: "Stake 1 timber. Bones 1–6 come back with wool and coin. 7–12 come back empty.", gamble: true },
    ],
  },
];

export function omenById(id: string): Omen {
  const omen = OMENS.find((item) => item.id === id);
  if (!omen) throw new Error(`Unknown omen ${id}`);
  return omen;
}
