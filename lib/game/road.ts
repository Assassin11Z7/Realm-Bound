import { holdById } from "./content";
import { heroBargainLine, heroBargainRelief, heroSpec, heroWearsRelic } from "./heroes";
import type { GameState, Gear, HeroId, HoldId, RoadBeat, RoadChoice, RoadJourney, RoadOutcome, RoadTone } from "./types";
import { HOLD_IDS } from "./types";
import { isHuntGear } from "./world";

/** Adjustments layered on the ordinary road find. Zeroes leave travel unchanged. */
export interface RoadTune {
  luck: number;
  relicBias: number;
  relicBonus: number;
  meetingBonus: number;
  goldDelta: number;
  ireDelta: number;
  pay: number;
  keepGear: boolean;
  forceGear: boolean;
}

export const PLAIN_TUNE: RoadTune = {
  luck: 0,
  relicBias: 0,
  relicBonus: 0,
  meetingBonus: 0,
  goldDelta: 0,
  ireDelta: 0,
  pay: 0,
  keepGear: true,
  forceGear: false,
};

const TONES = new Set<RoadTone>(["clean", "mixed", "bargain", "setback"]);
const SLOTS = new Set(["hand", "cloak", "charm", "ring", "hoard"]);

export interface JudgedRoad {
  tone: RoadTone;
  tune: RoadTune;
  pay: number;
  broke: boolean;
}

function wornMatch(state: GameState, match: (id: HeroId, gear: Gear) => boolean): { hero: string; gear: Gear } | null {
  for (const hero of state.heroes ?? []) {
    if (!hero.unlocked || !hero.fielded) continue;
    for (const gearId of Object.values(hero.worn ?? {})) {
      if (!gearId) continue;
      const gear = (state.pack ?? []).find((item) => item.id === gearId);
      if (gear && match(hero.id, gear)) return { hero: heroSpec(hero.id).name, gear };
    }
  }
  return null;
}

/** Three beats. A third choice appears when the company is geared for it. */
export function roadBeats(state: GameState, dest: HoldId): RoadBeat[] {
  const place = holdById(dest).name;
  const hunt = wornMatch(state, (_id, gear) => isHuntGear(gear));
  const bell = heroWearsRelic(state, "odysseus", "ford-bell");
  const ward = wornMatch(state, (_id, gear) => gear.trait === "ward");
  const lore = wornMatch(state, (id, gear) => gear.trait === "lore" || (id === "odysseus" && gear.slot === "charm"));
  const sky = wornMatch(state, (id, gear) => id === "zeus" && gear.trait === "ward");
  const relief = heroBargainRelief(state);
  const pay = Math.max(2, 6 - relief);
  const hem = heroWearsRelic(state, "heracles", "unspoken-hem");
  let bargainBecause = relief > 0 ? heroBargainLine(state, relief) : undefined;
  if (hem) bargainBecause = bargainBecause ? `${bargainBecause} Heracles wears the Unspoken Hem.` : "Heracles wears the Unspoken Hem.";

  const fork: RoadChoice[] = [
    {
      id: "ridge",
      label: "Keep the ridge",
      detail: "Open ground. The company takes what the road leaves in plain sight.",
      tone: "clean",
    },
    {
      id: "ditch",
      label: "Take the ditch",
      detail: "Old camps and wet mud. A find is likelier, and so is trouble.",
      tone: "mixed",
    },
  ];
  if (hunt) {
    fork.push({
      id: "deer",
      label: "Follow the deer track",
      detail: "A quieter line, and a better chance the ditch still pays.",
      tone: "clean",
      boon: "hunt",
      because: `${hunt.hero} wears ${hunt.gear.name}. A hunt-geared hero opens a safer path.`,
    });
  }

  const meeting: RoadChoice[] = [
    {
      id: "fire",
      label: "Share the fire",
      detail: "A coin, a story, and whatever they can spare.",
      tone: "mixed",
    },
    {
      id: "pass",
      label: "Pass them by",
      detail: "No bargain and no gift. The company stays light.",
      tone: "clean",
    },
  ];
  if (bell) {
    meeting.push({
      id: "bell",
      label: "Ring the Ford Bell",
      detail: "The bell asks for a traveler who was not coming. The find is kinder.",
      tone: "clean",
      boon: "bell",
      because: "Odysseus wears the Ford Bell. Ringing it improves the chance of a meeting.",
    });
  } else if (lore) {
    meeting.push({
      id: "stone",
      label: "Read the mile-stone",
      detail: "The stone names the safer fork. The company keeps the find and learns the road.",
      tone: "clean",
      boon: "lore",
      because: `${lore.hero} wears ${lore.gear.name}. Learning on the road opens this reading.`,
    });
  } else if (ward && !sky) {
    meeting.push({
      id: "watch",
      label: "Set the watch",
      detail: "They meet the traveler armed and careful. Trouble is less likely to stick.",
      tone: "clean",
      boon: "ward",
      because: `${ward.hero} wears ${ward.gear.name}. A ward on the road makes the meeting safer.`,
    });
  }

  const last: RoadChoice[] = [
    sky
      ? {
          id: "sky",
          label: "Wait on the sky",
          detail: "Let the squall pass. The last mile stays clear.",
          tone: "clean",
          boon: "weather",
          because: `Zeus wears ${sky.gear.name}. The weather ward keeps this mile.`,
        }
      : {
          id: "press",
          label: "Press on",
          detail: "Take what the road has already offered and come in.",
          tone: "clean",
        },
    {
      id: "pay",
      label: "Strike a bargain",
      detail:
        state.player.gold < pay
          ? `This asks ${pay} gold. The company has ${state.player.gold}. A short purse turns the road against them.`
          : `Pay ${pay} gold for a richer find.`,
      tone: "bargain",
      pay,
      because: bargainBecause,
    },
    {
      id: "squall",
      label: "Cut into the weather",
      detail: "A shorter line through the squall. The company may arrive without the find.",
      tone: "setback",
    },
  ];

  return [
    {
      id: "fork",
      title: "The fork",
      body: `The track to ${place} splits before the first mile.`,
      choices: fork,
    },
    {
      id: "meeting",
      title: "Someone on the road",
      body: `A traveler is already bound for ${place}.`,
      choices: meeting,
    },
    {
      id: "last",
      title: "The last mile",
      body: `The last stretch into ${place} turns.`,
      choices: last,
    },
  ];
}

function chosen(journey: RoadJourney): RoadChoice[] {
  return journey.picks.map((id, index) => {
    const beat = journey.beats[index];
    const choice = beat?.choices.find((item) => item.id === id);
    if (!choice) throw new Error(`Missing road choice ${id}`);
    return choice;
  });
}

function judgeTone(choices: RoadChoice[]): RoadTone {
  if (choices.some((choice) => choice.tone === "setback")) return "setback";
  if (choices.some((choice) => choice.tone === "bargain")) return "bargain";
  const clean = choices.filter((choice) => choice.tone === "clean").length;
  if (clean >= 2) return "clean";
  return "mixed";
}

export function judgeRoad(journey: RoadJourney, gold: number): JudgedRoad {
  const picks = chosen(journey);
  let tone = judgeTone(picks);
  const bargain = picks.find((choice) => choice.tone === "bargain");
  const asked = bargain?.pay ?? 0;
  const broke = tone === "bargain" && gold < asked;
  if (broke) tone = "setback";
  const boons = new Set(picks.map((choice) => choice.boon).filter((boon): boon is NonNullable<RoadChoice["boon"]> => Boolean(boon)));
  const pay = tone === "bargain" ? asked : 0;
  return { tone, tune: tuneFor(tone, boons, pay), pay, broke };
}

function tuneFor(tone: RoadTone, boons: Set<NonNullable<RoadChoice["boon"]>>, pay: number): RoadTune {
  const hunt = boons.has("hunt") ? 1 : 0;
  const bellRelic = boons.has("bell") ? 0.1 : boons.has("lore") ? 0.05 : 0;
  const bellMeet = boons.has("bell") ? 0.1 : 0;
  const calm = boons.has("ward") || boons.has("weather") ? -1 : 0;
  if (tone === "setback") {
    return { ...PLAIN_TUNE, luck: -1, goldDelta: -2, ireDelta: 4, keepGear: false };
  }
  if (tone === "bargain") {
    return {
      ...PLAIN_TUNE,
      luck: 2 + hunt,
      relicBias: 0.04 + (boons.has("bell") ? 0.04 : 0),
      relicBonus: bellRelic,
      meetingBonus: bellMeet,
      ireDelta: calm,
      pay,
      forceGear: true,
    };
  }
  if (tone === "clean") {
    return {
      ...PLAIN_TUNE,
      luck: 2 + hunt + (boons.has("weather") ? 1 : 0),
      relicBias: 0.02,
      relicBonus: bellRelic,
      meetingBonus: bellMeet,
      goldDelta: 1,
      ireDelta: -1 + calm,
      forceGear: true,
    };
  }
  return {
    ...PLAIN_TUNE,
    luck: hunt,
    relicBonus: boons.has("bell") ? 0.08 : 0,
    meetingBonus: bellMeet,
  };
}

const TITLES: Record<RoadTone, string> = {
  clean: "A clean road",
  mixed: "A mixed return",
  bargain: "A costly bargain",
  setback: "A setback",
};

export function describeRoad(
  judged: JudgedRoad,
  place: string,
  gearName?: string,
  relicName?: string,
  gearSlot?: RoadOutcome["gearSlot"],
): RoadOutcome {
  let line: string;
  if (judged.tone === "clean") line = `The company comes into ${place} with a clean road.`;
  else if (judged.tone === "mixed") line = `The company comes into ${place} with a mixed return.`;
  else if (judged.tone === "bargain") line = `The company pays ${judged.pay} gold on the way to ${place}. The richer find is theirs.`;
  else if (judged.broke) line = `The bargain on the way to ${place} fails. The purse is short, and the road takes its due.`;
  else line = `The company reaches ${place} poorer. The weather took the hour and the find.`;
  if (gearName) line += ` ${gearName} is in the pack.`;
  else if (judged.tone !== "setback") line += " Nothing loose was worth carrying.";
  if (relicName) line += ` ${relicName} came with them.`;
  return { tone: judged.tone, title: TITLES[judged.tone], line, gearName, gearSlot, relicName };
}

export function normalizeRoad(value: unknown): RoadJourney | null {
  if (!value || typeof value !== "object") return null;
  const road = value as RoadJourney;
  if (typeof road.dest !== "string" || !HOLD_IDS.includes(road.dest)) return null;
  if (!Array.isArray(road.beats) || road.beats.length < 2 || road.beats.length > 3) return null;
  const beats = road.beats.filter((beat) => {
    if (!beat || typeof beat.id !== "string" || typeof beat.title !== "string" || typeof beat.body !== "string") return false;
    if (!Array.isArray(beat.choices) || beat.choices.length < 2 || beat.choices.length > 3) return false;
    return beat.choices.every((choice) => choice && typeof choice.id === "string" && typeof choice.label === "string" && TONES.has(choice.tone));
  });
  if (beats.length !== road.beats.length) return null;
  const index = typeof road.index === "number" && road.index >= 0 && road.index < beats.length ? Math.floor(road.index) : 0;
  const picks = Array.isArray(road.picks) ? road.picks.filter((id): id is string => typeof id === "string").slice(0, beats.length) : [];
  let outcome: RoadOutcome | null = null;
  if (road.outcome && typeof road.outcome === "object" && TONES.has(road.outcome.tone) && typeof road.outcome.title === "string" && typeof road.outcome.line === "string") {
    outcome = {
      tone: road.outcome.tone,
      title: road.outcome.title,
      line: road.outcome.line,
      gearName: typeof road.outcome.gearName === "string" ? road.outcome.gearName : undefined,
      gearSlot: typeof road.outcome.gearSlot === "string" && SLOTS.has(road.outcome.gearSlot) ? road.outcome.gearSlot : undefined,
      relicName: typeof road.outcome.relicName === "string" ? road.outcome.relicName : undefined,
    };
  }
  return { dest: road.dest, index, picks, beats, outcome };
}
