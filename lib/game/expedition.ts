import { SEASON_DAYS } from "./content";
import type { AwaitingSeat, Expedition, GameState, Gear, Outcome, Politics } from "./types";
import { heroCallSooner } from "./heroes";
import { carryCap, carriedWeight, gearWeight, wornRelic } from "./world";

/** Dawns between the end of one wagon call and the next. */
export const EXPEDITION_GAP = 8;
/** A cleared border path shortens that wait. */
export const BORDER_SOONER = 2;
/** The drivers' charter shortens that wait again. */
export const CHARTER_SOONER = 2;
/** Extra gold on every successful call once the drivers' charter stands. */
export const CHARTER_PAY = 4;

export function expeditionGap(state: GameState): number {
  let gap = EXPEDITION_GAP;
  if ((state.campaign?.realmWorks ?? []).some((work) => work.id === "border")) gap -= BORDER_SOONER;
  if ((state.campaign?.realmWorks ?? []).some((work) => work.id === "charter")) gap -= CHARTER_SOONER;
  if (wornRelic(state, "carter-knot")) gap -= 3;
  gap -= heroCallSooner(state);
  return Math.max(4, gap);
}
/** Dawns after a missed due day when a late fill can still turn the call. */
export const EXPEDITION_GRACE = 4;

export const AWAITING_SEATS: AwaitingSeat[] = [
  { id: "seat-west", title: "Western march" },
  { id: "seat-east", title: "Eastern march" },
];

const TRIUMPHS: Omit<Gear, "id">[] = [
  {
    name: "Wagon bell",
    slot: "charm",
    rarity: "relic",
    luck: 3,
    trait: "ward",
    worth: 18,
    line: "Lead from the first wagon. Worn, Vell's anger climbs more slowly.",
  },
  {
    name: "Salt-route nail",
    slot: "ring",
    rarity: "relic",
    luck: 3,
    trait: "purse",
    worth: 18,
    line: "A nail from a wagon that made the salt road. Worn, the caravan pays more.",
  },
  {
    name: "Frost standard",
    slot: "cloak",
    rarity: "relic",
    luck: 3,
    trait: "lore",
    worth: 18,
    line: "The cloth the drivers tied above the grain. Worn, the road teaches more.",
  },
];

const SURVIVALS: Omit<Gear, "id">[] = [
  {
    name: "Broken axle pin",
    slot: "hoard",
    rarity: "uncanny",
    luck: 1,
    trait: "luck",
    worth: 6,
    line: "All the frost left of a wagon that did not arrive.",
  },
  {
    name: "Scorched tally",
    slot: "hoard",
    rarity: "uncanny",
    luck: 1,
    trait: "lore",
    worth: 6,
    line: "A driver's count, burned at the edge. The shortage is still written on it.",
  },
];

export function blankExpedition(): Expedition {
  return {
    cycle: 1,
    phase: "called",
    dueDay: SEASON_DAYS,
    nextCallDay: null,
    lastVerdict: null,
    rewards: [],
  };
}

export function blankPolitics(): Politics {
  return {
    conflictHeat: 0,
    rivalName: null,
    awaitingSeats: AWAITING_SEATS.map((seat) => ({ ...seat })),
    sharedGoals: [],
  };
}

function legalVerdict(value: unknown): Outcome | null {
  if (value === "held" || value === "held-late" || value === "lost") return value;
  return null;
}

export function normalizeExpedition(state: GameState): Expedition {
  const raw = state.expedition;
  if (
    raw &&
    (raw.phase === "called" || raw.phase === "idle") &&
    typeof raw.cycle === "number" &&
    Number.isFinite(raw.cycle) &&
    typeof raw.dueDay === "number" &&
    Number.isFinite(raw.dueDay)
  ) {
    return {
      cycle: Math.max(1, Math.floor(raw.cycle)),
      phase: raw.phase,
      dueDay: Math.max(0, Math.floor(raw.dueDay)),
      nextCallDay: typeof raw.nextCallDay === "number" && Number.isFinite(raw.nextCallDay) ? Math.floor(raw.nextCallDay) : null,
      lastVerdict: legalVerdict(raw.lastVerdict),
      rewards: Array.isArray(raw.rewards) ? raw.rewards.filter((id) => typeof id === "string") : [],
    };
  }
  return inferExpedition(state);
}

function inferExpedition(state: GameState): Expedition {
  const due = SEASON_DAYS;
  if (!state.outcome) {
    if ((state.day ?? 1) <= due) return blankExpedition();
    return {
      cycle: 1,
      phase: "idle",
      dueDay: due,
      nextCallDay: (state.day ?? 1) + EXPEDITION_GAP,
      lastVerdict: null,
      rewards: [],
    };
  }
  const withinGrace = state.outcome === "lost" && state.day <= due + EXPEDITION_GRACE;
  if (!state.outcomeDismissed || withinGrace) {
    return {
      cycle: 1,
      phase: "called",
      dueDay: due,
      nextCallDay: null,
      lastVerdict: state.outcome,
      rewards: [],
    };
  }
  return {
    cycle: 1,
    phase: "idle",
    dueDay: due,
    nextCallDay: state.day + EXPEDITION_GAP,
    lastVerdict: state.outcome,
    rewards: [],
  };
}

export function normalizePolitics(value: Politics | undefined): Politics {
  const blank = blankPolitics();
  if (!value || typeof value !== "object") return blank;
  const heat =
    typeof value.conflictHeat === "number" && Number.isFinite(value.conflictHeat)
      ? Math.max(0, Math.min(100, Math.floor(value.conflictHeat)))
      : 0;
  const rivalName = typeof value.rivalName === "string" && value.rivalName.trim() ? value.rivalName.trim().slice(0, 40) : null;
  const seats = Array.isArray(value.awaitingSeats)
    ? value.awaitingSeats
        .filter((seat) => seat && typeof seat.id === "string" && typeof seat.title === "string")
        .map((seat) => ({ id: seat.id.slice(0, 40), title: seat.title.slice(0, 40) }))
    : blank.awaitingSeats;
  const sharedGoals = Array.isArray(value.sharedGoals)
    ? [...new Set(value.sharedGoals.filter((id) => typeof id === "string" && id.trim()).map((id) => id.trim().slice(0, 40)))].slice(0, 12)
    : [];
  return {
    conflictHeat: heat,
    rivalName,
    awaitingSeats: seats.length > 0 ? seats : blank.awaitingSeats,
    sharedGoals,
  };
}

export function wagonsOpen(state: GameState): boolean {
  return (state.expedition?.phase ?? "called") === "called";
}

export function expeditionDue(state: GameState): number {
  const due = state.expedition?.dueDay;
  return typeof due === "number" && due > 0 ? due : SEASON_DAYS;
}

export function prizeGear(kind: "triumph" | "survival", cycle: number): Gear {
  const table = kind === "triumph" ? TRIUMPHS : SURVIVALS;
  const piece = table[(Math.max(1, cycle) - 1) % table.length];
  return { ...piece, id: `expedition-${kind}-${cycle}` };
}

/** Puts unique expedition loot in the pack once per call. Returns the chronicle line. */
export function takeExpeditionPrize(state: GameState, kind: "triumph" | "survival"): string | null {
  const exp = state.expedition;
  if (!exp) return null;
  const key = `${kind}-${exp.cycle}`;
  if (exp.rewards.includes(key)) return null;
  exp.rewards = [...exp.rewards, key];
  const gear = prizeGear(kind, exp.cycle);
  if (carriedWeight(state) + gearWeight(gear) > carryCap(state)) {
    const coins = kind === "triumph" ? 8 : 3;
    state.player.gold += coins;
    return `The bag could not hold the ${gear.name.toLowerCase()}. You take ${coins} gold from the drivers instead.`;
  }
  state.pack = [...(state.pack ?? []), gear];
  return kind === "triumph"
    ? `${gear.name} comes off the wagons. It is in your pack.`
    : `${gear.name} is all the wagons left you. It is in your pack.`;
}

/** Ends the current call. Returns null if the wagons were already gone. */
export function markDeparted(state: GameState): "survival" | "left" | null {
  const exp = state.expedition;
  if (!exp || exp.phase !== "called") return null;
  exp.lastVerdict = state.outcome;
  exp.phase = "idle";
  exp.nextCallDay = state.day + expeditionGap(state);
  if (state.outcome === "lost") {
    if (state.politics) state.politics.conflictHeat = Math.min(100, state.politics.conflictHeat + 12);
    return "survival";
  }
  if (state.politics) state.politics.conflictHeat = Math.max(0, state.politics.conflictHeat - 4);
  return "left";
}

export function markCalled(state: GameState) {
  const exp = state.expedition ?? blankExpedition();
  state.expedition = exp;
  exp.cycle += 1;
  exp.phase = "called";
  exp.dueDay = state.day + SEASON_DAYS - 1;
  exp.nextCallDay = null;
  state.compact.levy = { grain: 0, iron: 0, salt: 0 };
  state.outcome = null;
  state.outcomeDismissed = false;
  state.outcomeRewarded = false;
}

export interface AllianceSeatView {
  id: string;
  name: string;
  role: "founder" | "oathbound" | "awaiting-player";
  holder: "you" | "oathbound" | "vacant" | "awaiting-player";
  note: string;
}

export interface SharedGoalView {
  id: string;
  title: string;
  detail: string;
  progress: number;
  need: number;
}

export interface ConflictView {
  title: string;
  detail: string;
  heat: number;
  rivalName: string | null;
}

/** Derived alliance board. Occupier names stay empty until another player can sit. */
export function allianceBoard(state: GameState): {
  seats: AllianceSeatView[];
  goals: SharedGoalView[];
  conflict: ConflictView;
} {
  const politics = state.politics ?? blankPolitics();
  const seats: AllianceSeatView[] = [
    {
      id: "founder",
      name: `${state.player.title} ${state.player.name}`,
      role: "founder",
      holder: "you",
      note: "Your seat. It stays with the banner.",
    },
    ...state.compact.members.map((member) => ({
      id: member.id,
      name: member.name,
      role: "oathbound" as const,
      holder: member.inCompact ? ("oathbound" as const) : ("vacant" as const),
      note: member.inCompact
        ? "Sworn for now. A later war could set another player in this chair."
        : "The oath broke. This seat is empty, and a rival could take it.",
    })),
    ...politics.awaitingSeats.map((seat) => ({
      id: seat.id,
      name: seat.title,
      role: "awaiting-player" as const,
      holder: "awaiting-player" as const,
      note: "Reserved for another player's compact. No one sits here yet.",
    })),
  ];
  const sworn = state.compact.members.filter((member) => member.inCompact).length;
  const settlements = state.settlements ?? [];
  const raised =
    state.works.mill ||
    state.works.shrine ||
    state.works.stake ||
    Object.values(state.campaign?.buildings ?? {}).some((level) => level > 0);
  const stone =
    (state.campaign?.realmWorks ?? []).some((work) => work.id === "oathstone") || (politics.sharedGoals ?? []).includes("oathstone");
  const goals: SharedGoalView[] = [
    {
      id: "oaths",
      title: "Hold the oaths",
      detail: "Every sworn neighbor still answers. A broken oath is a seat a rival could claim.",
      progress: sworn,
      need: Math.max(1, state.compact.members.length),
    },
    {
      id: "hearths",
      title: "Steady the hearths",
      detail: "Settlements at mood 50 or better. This work does not end when the wagons leave.",
      progress: settlements.filter((item) => item.mood >= 50).length,
      need: Math.max(1, settlements.length),
    },
    {
      id: "works",
      title: "Raise the hold",
      detail: "One finished work stands for the whole compact.",
      progress: raised ? 1 : 0,
      need: 1,
    },
    {
      id: "oath-stone",
      title: "The oath stone",
      detail: stone
        ? "The stone is cut. Later alliance seats can read this shared goal."
        : "A rare project under Hold. Two heroes must be fielded before it starts. When it stands, later seats can read it.",
      progress: stone ? 1 : 0,
      need: 1,
    },
  ];
  return {
    seats: seats.map((seat) =>
      seat.id === "founder" && stone
        ? { ...seat, note: "Your seat. The oath stone is cut, and a later player can read that shared goal." }
        : seat,
    ),
    goals,
    conflict: {
      title: politics.rivalName ? `${politics.rivalName} watches the marches` : "No rival compact yet",
      detail: politics.rivalName
        ? "Another banner has been named. When alliance wars open, this heat is the war."
        : "Two march seats wait for other players. Heat rises when a call fails or an oath breaks. It is the hook a later war will pull.",
      heat: politics.conflictHeat,
      rivalName: politics.rivalName,
    },
  };
}
