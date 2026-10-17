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

export const TITLES = ["Lord", "Lady", "Ranger", "Trader", "Keeper", "Captain"] as const;
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

export type GearSlot = "hand" | "cloak" | "charm" | "ring" | "hoard";
export type WornSlot = Exclude<GearSlot, "hoard">;
export type Rarity = "common" | "uncanny" | "relic";

export const HERO_IDS = [
  "sela",
  "tam",
  "bran",
  "dorrie",
  "moth",
  "ivy",
  "heracles",
  "odysseus",
  "beowulf",
  "theseus",
  "athena",
  "odin",
  "zeus",
] as const;
export type HeroId = (typeof HERO_IDS)[number];
export type HeroRarity = "common" | "uncanny" | "legendary" | "divine";
export type HeroTaskKind =
  | "miles"
  | "triumphs"
  | "build-max"
  | "build-sum"
  | "build-count"
  | "build-high"
  | "renown"
  | "mood"
  | "mood-all"
  | "marks"
  | "bonds";

export interface HeroRecord {
  id: HeroId;
  unlocked: boolean;
  fielded: boolean;
  worn: Partial<Record<WornSlot, string>>;
}

export interface HeroTask {
  id: string;
  heroId: HeroId;
  chain: number;
  title: string;
  detail: string;
  kind: HeroTaskKind;
  need: number;
  /** Threshold inside a kind, such as mood or building level. */
  mark: number;
  progress: number;
  status: QuestStatus;
}
export type GearTrait = "luck" | "purse" | "ward" | "lore";
export type RelicId = "unspoken-hem" | "barrow-band" | "salt-charter" | "carter-knot" | "ford-bell";

export interface Gear {
  id: string;
  name: string;
  slot: GearSlot;
  rarity: Rarity;
  luck: number;
  trait: GearTrait;
  worth: number;
  line: string;
  /** Set only on unique relics. Ordinary relic-rarity crafts and wagon prizes leave this empty. */
  relic?: RelicId;
}

export type QuestKind = "visit" | "pledge" | "loot" | "tribute";
export type QuestStatus = "open" | "ready" | "claimed";

export interface Quest {
  id: string;
  title: string;
  giver: string;
  detail: string;
  kind: QuestKind;
  target: string;
  need: number;
  progress: number;
  status: QuestStatus;
  reward: number;
}

export interface SceneBeat {
  speaker: string;
  line: string;
  art: string;
}

export interface Cutscene {
  id: string;
  index: number;
  beats: SceneBeat[];
}

export type Outcome = "held" | "held-late" | "lost";

export type ExpeditionPhase = "called" | "idle";

/** A periodic wagon call. The realm continues between calls. */
export interface Expedition {
  cycle: number;
  phase: ExpeditionPhase;
  /** Dawn on which this call is judged. Meaningful while phase is "called". */
  dueDay: number;
  /** Dawn the next call begins. Meaningful while phase is "idle". */
  nextCallDay: number | null;
  lastVerdict: Outcome | null;
  /** Prize ids already granted, so a call cannot pay twice. */
  rewards: string[];
}

/** A chair reserved for another player. Empty in single player. */
export interface AwaitingSeat {
  id: string;
  title: string;
}

/**
 * Alliance politics without a network layer.
 * Seats and heat are the hooks a later war can occupy.
 */
export interface Politics {
  conflictHeat: number;
  rivalName: string | null;
  awaitingSeats: AwaitingSeat[];
}

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

export type SkillId = "stores" | "step" | "coin" | "truce" | "bargain" | "eye" | "wright" | "scholar";
export type BuildingId = "hall" | "yard" | "shrine" | "market" | "watch" | "forge" | "still" | "loom" | "strongroom";
export type PotionId = "luck" | "calm" | "haste" | "purse" | "vigor";

export const REALM_PROJECT_IDS = ["watchtower", "hall", "bench", "border"] as const;
export type RealmProjectId = (typeof REALM_PROJECT_IDS)[number];
export type RealmBench = "forge" | "loom";

/** Labor already paid for, still counting dawns. */
export interface RealmLabor {
  id: RealmProjectId;
  spent: number;
  holdId?: HoldId;
  bench?: RealmBench;
}

/** A finished realm project. The benefit lasts. */
export interface RealmWork {
  id: RealmProjectId;
  holdId?: HoldId;
  bench?: RealmBench;
}

export interface Tonics {
  luck: number;
  purse: boolean;
}
export type CaptainOrder = "oath" | "garrison" | "march" | "hunt" | "trade";

export interface SkillOffer {
  level: number;
  choices: SkillId[];
}

export interface Captain {
  rank: number;
  xp: number;
  order: CaptainOrder;
  target: HoldId | null;
}

export interface Mission {
  id: string;
  chapter: number;
  title: string;
  detail: string;
  need: number;
  progress: number;
  status: QuestStatus;
  rewardGold: number;
  rewardXp: number;
}

export interface Threat {
  id: string;
  title: string;
  detail: string;
  art: string;
}

export type EdictId = "custom" | "dole" | "tithe" | "close-rolls" | "open-rolls" | "hearth-rite" | "salt-road";

export interface Lasting {
  yield?: number;
  goldDawn?: number;
  moodDawn?: number;
  breadDecay?: number;
  hearthDecay?: number;
  soulDawn?: number;
  ireDawn?: number;
  blockGrowth?: boolean;
}

export interface Settlement {
  holdId: HoldId;
  souls: number;
  mood: number;
  bread: number;
  hearth: number;
  edict: EdictId;
}

export interface CrossingChoice {
  id: string;
  label: string;
  detail: string;
  branch: "base" | "alt";
  gamble?: boolean;
}

export interface Crossing {
  id: string;
  creature: string;
  title: string;
  body: string;
  art: string;
  disposition: "kind" | "grim";
  choices: CrossingChoice[];
}

export interface Mark {
  id: string;
  creature: string;
  choice: string;
  day: number;
  summary: string;
  lasting: Lasting;
}

export interface Petition {
  id: string;
  holdId: HoldId;
  title: string;
  body: string;
  choices: CrossingChoice[];
}

export interface Campaign {
  level: number;
  xp: number;
  skills: SkillId[];
  offer: SkillOffer | null;
  buildings: Record<BuildingId, number>;
  project: BuildingId | null;
  /** The multi-dawn work currently rising, if any. */
  realmLabor: RealmLabor | null;
  /** Finished multi-dawn projects. Each one keeps its benefit. */
  realmWorks: RealmWork[];
  /** Set when a project finishes, until the player reads it. */
  realmNotice: string | null;
  chapter: number;
  captains: Record<string, Captain>;
  missions: Mission[];
  threat: Threat | null;
  marches: number;
  hunts: number;
  threatsFaced: number;
}

export const TUTORIAL_STEPS = [
  "wagons",
  "seal",
  "neighbors",
  "wagons-take",
  "caravan",
  "anger",
  "creatures",
  "people",
] as const;
export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

/** `step: null` means the first-session lesson is finished. */
export interface Tutorial {
  step: TutorialStep | null;
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
  crossing: Crossing | null;
  marks: Mark[];
  creaturesSeen: string[];
  settlements: Settlement[];
  petition: Petition | null;
  petitionsSeen: string[];
  seed: number;
  rumor: Rumor | null;
  surprisesSeen: string[];
  where: HoldId;
  miles: number;
  pack: Gear[];
  vault: Gear[];
  brew: Record<PotionId, number>;
  cellar: Record<PotionId, number>;
  tonics: Tonics;
  worn: Partial<Record<GearSlot, string>>;
  quests: Quest[];
  /** Heroes who carry gear and walk the road. The lord does not. */
  heroes: HeroRecord[];
  heroTasks: HeroTask[];
  /** Successful wagon calls (held or held late). */
  triumphs: number;
  scene: Cutscene | null;
  campaign: Campaign;
  tutorial: Tutorial;
  expedition: Expedition;
  politics: Politics;
  /** Expedition cycle in which the Unspoken Hem already swallowed a failure. */
  pardonCall: number | null;
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
