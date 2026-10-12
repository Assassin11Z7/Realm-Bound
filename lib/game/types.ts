export const GOODS = ["grain", "timber", "iron", "salt", "wool", "relics"] as const;
export type GoodId = (typeof GOODS)[number];

export const LEVY_GOODS = ["grain", "iron", "salt"] as const;
export type LevyGood = (typeof LEVY_GOODS)[number];

export const FACTION_IDS = ["crown", "canticle", "copper", "deepwood"] as const;
export type FactionId = (typeof FACTION_IDS)[number];

export const HOLD_IDS = [
  "highbarrow",
  "saltmere",
  "greenmere",
  "ashfold",
  "woolford",
  "vesper",
] as const;
export type HoldId = (typeof HOLD_IDS)[number];

export const PERSONALITIES = ["generous", "steady", "lean"] as const;
export type Personality = (typeof PERSONALITIES)[number];

export const SIGILS = [
  "crown",
  "sun",
  "scales",
  "antler",
  "wolf",
  "tower",
  "wave",
  "wheat",
] as const;
export type SigilId = (typeof SIGILS)[number];

export const DIVISIONS = ["plain", "pale", "fess", "chevron"] as const;
export type Division = (typeof DIVISIONS)[number];

export const TITLES = ["Lord", "Lady", "Warden", "Factor", "Keeper", "Captain"] as const;
export type Title = (typeof TITLES)[number];

export type Stash = Record<GoodId, number>;

export interface Banner {
  field: string;
  charge: string;
  sigil: SigilId;
  division: Division;
}

export interface Stack {
  good: GoodId;
  qty: number;
}

export interface Member {
  id: string;
  name: string;
  epithet: string;
  holdId: HoldId;
  personality: Personality;
  stash: Stash;
  contentment: number;
  inCompact: boolean;
  lastNote: string;
}

export interface BarterOffer {
  id: string;
  fromId: string;
  fromName: string;
  give: Stack;
  want: Stack;
}

export interface PlayerOffer {
  give: Stack;
  want: Stack;
}

export interface Caravan {
  visit: number;
  stock: Stash;
}

export interface ChronicleEntry {
  id: number;
  day: number;
  text: string;
}

export interface WyrmState {
  ire: number;
  tribute: number;
}

export interface Works {
  mill: boolean;
  shrine: boolean;
  stake: boolean;
}

export interface OmenChoice {
  id: string;
  label: string;
  detail: string;
  gamble?: boolean;
}

export type OmenArt = "drake" | "nix" | "wing" | "antler" | "serpent" | "speaks" | "road" | "weather" | "saint" | "kin";

export interface Omen {
  id: string;
  creature: string;
  title: string;
  body: string;
  art: OmenArt;
  choices: OmenChoice[];
  passText?: string;
}

export interface Rumor {
  good: GoodId;
  side: "buy" | "sell";
  delta: 1 | -1;
  day: number;
  text: string;
}

export type Outcome = "held" | "held-late" | "lost";

export interface Player {
  name: string;
  title: Title;
  factionId: FactionId;
  holdId: HoldId;
  banner: Banner;
  gold: number;
  stash: Stash;
  renown: number;
  undercroft: boolean;
  withdrawnToday: number;
}

export interface Compact {
  name: string;
  hall: Stash;
  levy: Record<LevyGood, number>;
  reserve: Record<LevyGood, number>;
  members: Member[];
}

export interface GameState {
  version: 1;
  day: number;
  nextId: number;
  player: Player;
  compact: Compact;
  caravan: Caravan | null;
  npcOffers: BarterOffer[];
  playerOffer: PlayerOffer | null;
  chronicle: ChronicleEntry[];
  compactActed: boolean;
  outcome: Outcome | null;
  outcomeDismissed: boolean;
  outcomeRewarded: boolean;
  stats: {
    pledged: number;
    gifted: number;
    deposited: number;
    bought: number;
    sold: number;
  };
  wyrm: WyrmState;
  works: Works;
  omen: Omen | null;
  omensSeen: string[];
  oathsKept: string[];
  seed: number;
  rumor: Rumor | null;
  surprisesSeen: string[];
}

export interface NewGameSetup {
  name: string;
  title: Title;
  factionId: FactionId;
  holdId: HoldId;
  banner: Banner;
  compactName: string;
}

export interface FateRoll {
  face: number;
  won: boolean;
}

export interface Result {
  state: GameState;
  error?: string;
  message?: string;
  fate?: FateRoll;
}
