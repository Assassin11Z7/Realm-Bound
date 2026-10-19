import { holdById, seasonOf, type SeasonName } from "./content";
import { heroBargainLine, heroBargainRelief, heroSpec, heroWearsRelic } from "./heroes";
import type { GameState, Gear, GearSlot, HeroId, HoldId, RoadBeat, RoadChoice, RoadJourney, RoadMark, RoadOutcome, RoadTone } from "./types";
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

export interface RoadLedgerInput {
  title: string;
  gold: number;
  ire: number;
  taught: number;
  bond: number;
  loyalty: number;
  goods: { label: string; delta: number }[];
  gearName?: string;
  gearKept?: boolean;
  gearSlot?: GearSlot;
  relicName?: string;
  relicKept?: boolean;
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

function gearedName(state: GameState, id: HeroId): string | null {
  const hero = (state.heroes ?? []).find((item) => item.id === id);
  if (!hero?.unlocked || !hero.fielded) return null;
  const wearing = Object.values(hero.worn ?? {}).some((gearId) => gearId && (state.pack ?? []).some((item) => item.id === gearId));
  return wearing ? heroSpec(id).name : null;
}

const RIVER: HoldId[] = ["greenmere", "saltmere", "woolford"];

const OPEN_NAME: Record<HoldId, string> = {
  highbarrow: "Mine stair",
  ashfold: "Timber fork",
  greenmere: "River dike",
  saltmere: "Salt causeway",
  vesper: "Chapel stair",
  woolford: "Fold path",
};

const HOLD_LINE: Record<HoldId, string> = {
  highbarrow: "climbs toward the mine stair.",
  ashfold: "enters the regrown wood.",
  greenmere: "follows the river fields.",
  saltmere: "runs the salt pans.",
  vesper: "climbs the chapel stair.",
  woolford: "crosses the wind hills.",
};

const RIDGE: Record<HoldId, string> = {
  highbarrow: "Keep the mine stair",
  ashfold: "Keep the timber ridge",
  greenmere: "Keep the dike",
  saltmere: "Keep the causeway",
  vesper: "Keep the chapel stair",
  woolford: "Keep the fold path",
};

const DITCH: Record<HoldId, string> = {
  highbarrow: "Drop into the rust cut",
  ashfold: "Take the burned ditch",
  greenmere: "Wade the field ditch",
  saltmere: "Cut through the pans",
  vesper: "Take the bone path",
  woolford: "Drop among the folds",
};

const MEET: Record<HoldId, { title: string; who: string; ask: string }> = {
  highbarrow: { title: "A miner", who: "A miner", ask: "Hear the mine rumor" },
  ashfold: { title: "A wood-cutter", who: "A wood-cutter", ask: "Trade news of the tall deer" },
  greenmere: { title: "The river woman", who: "The river woman", ask: "Ask the river's price" },
  saltmere: { title: "A salt-carter", who: "A salt-carter", ask: "Buy word of the morning salt" },
  vesper: { title: "A novice", who: "A novice", ask: "Ask which saint walks" },
  woolford: { title: "A shepherd", who: "A shepherd", ask: "Ask why the flocks went still" },
};

const PATHS: Record<HoldId, { label: string; hero: HeroId; also?: HeroId }> = {
  highbarrow: { label: "Use the ore path", hero: "beowulf", also: "wynn" },
  ashfold: { label: "Follow the axe marks", hero: "moth" },
  greenmere: { label: "Take the dike path", hero: "pell" },
  saltmere: { label: "Walk the drying racks", hero: "ivy" },
  vesper: { label: "Take the saint's path", hero: "theseus", also: "athena" },
  woolford: { label: "Follow the flock line", hero: "bran" },
};

function seasonBite(season: SeasonName): string {
  switch (season) {
    case "thaw":
      return "The thaw has the track soft.";
    case "green":
      return "The road is ordinary.";
    case "harvest":
      return "The fields are cut.";
    case "frost":
      return "Frost is on the track.";
    case "deepwinter":
      return "Deep winter has the track white.";
  }
}

function seasonWord(season: SeasonName): string {
  switch (season) {
    case "thaw":
      return "Thaw";
    case "green":
      return "Green";
    case "harvest":
      return "Harvest";
    case "frost":
      return "Frost";
    case "deepwinter":
      return "Winter";
  }
}

function closeTitle(season: SeasonName): string {
  if (season === "frost" || season === "deepwinter") return "The weather";
  if (season === "harvest") return "The stubble mile";
  if (season === "thaw") return "The soft mile";
  return "The last mile";
}

function closeBody(place: string, season: SeasonName): string {
  if (season === "frost" || season === "deepwinter") return `Weather sits on the last mile into ${place}.`;
  if (season === "harvest") return `Stubble covers the last mile into ${place}.`;
  if (season === "thaw") return `The last mile into ${place} is soft.`;
  return `The last stretch into ${place} is open.`;
}

function pressLabel(season: SeasonName): string {
  if (season === "thaw") return "Press through the mud";
  if (season === "harvest") return "Cross the stubble";
  if (season === "frost") return "Press through the frost";
  if (season === "deepwinter") return "Press through the white";
  return "Press on";
}

/** Three short beats. The third choice changes with the hold, the season, and who is out. */
export function roadBeats(state: GameState, dest: HoldId): RoadBeat[] {
  const place = holdById(dest).name;
  const season = seasonOf(state.day);
  const winter = season === "frost" || season === "deepwinter";
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
      label: RIDGE[dest],
      detail: "Open ground. The company takes what the road leaves in plain sight.",
      tone: "clean",
    },
    {
      id: "ditch",
      label: DITCH[dest],
      detail: "Old camps and wet mud. A find is likelier, and so is trouble.",
      tone: "mixed",
    },
  ];
  fork.push(openingChoice(state, dest, hunt));

  const traveler = MEET[dest];
  const meeting: RoadChoice[] = [
    {
      id: "fire",
      label: "Share the fire",
      detail: `${traveler.who} offers a coin and whatever they can spare.`,
      tone: "mixed",
    },
    {
      id: "pass",
      label: "Pass them by",
      detail: "No bargain and no gift. The company stays light.",
      tone: "clean",
    },
  ];
  meeting.push(meetingChoice(state, dest, { bell, lore, ward, sky, traveler }));

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
          label: pressLabel(season),
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
    closingChoice(state, winter, Boolean(sky)),
  ];

  return [
    {
      id: "fork",
      title: `${seasonWord(season)} · ${OPEN_NAME[dest]}`,
      body: `${seasonBite(season)} The track to ${place} ${HOLD_LINE[dest]}`,
      choices: fork,
    },
    {
      id: "meeting",
      title: traveler.title,
      body: `${traveler.who} is already bound for ${place}.`,
      choices: meeting,
    },
    {
      id: "last",
      title: closeTitle(season),
      body: closeBody(place, season),
      choices: last,
    },
  ];
}

function openingChoice(state: GameState, dest: HoldId, hunt: { hero: string; gear: Gear } | null): RoadChoice {
  if (hunt) {
    return {
      id: "deer",
      label: "Follow the deer track",
      detail: "A quieter line, and a better chance the ditch still pays.",
      tone: "clean",
      boon: "hunt",
      because: `${hunt.hero} wears ${hunt.gear.name}. A hunt-geared hero opens a safer path.`,
    };
  }
  const ness = gearedName(state, "ness");
  const tam = gearedName(state, "tam");
  const river = RIVER.includes(dest);
  if (river || ness || tam) return fordChoice(state, dest, ness, tam);
  return pathChoice(state, dest);
}

function fordChoice(state: GameState, dest: HoldId, ness: string | null, tam: string | null): RoadChoice {
  const local =
    dest === "saltmere" ? gearedName(state, "ivy") : dest === "greenmere" ? gearedName(state, "pell") : dest === "woolford" ? gearedName(state, "bran") : null;
  const guide = ness ?? tam ?? local;
  const knot =
    dest === "woolford" && heroWearsRelic(state, "bran", "carter-knot")
      ? "Bran wears Carter's Knot. The wool road remembers the drivers."
      : dest === "greenmere" && heroWearsRelic(state, "pell", "carter-knot")
        ? "Pell wears Carter's Knot. The mill race stays kind."
        : dest === "saltmere" && heroWearsRelic(state, "ivy", "salt-charter")
          ? "Ivy wears the Salt Charter. The pans stay kind."
          : null;
  const label = dest === "saltmere" ? "Cross the salt pans" : dest === "greenmere" ? "Cross at the mill race" : dest === "woolford" ? "Cross the hill ford" : "Take the river crossing";
  return {
    id: "ford",
    label,
    detail: guide ? "A known crossing. The company keeps its feet and the find." : "Wet ground. A find is possible, and so is a soaking.",
    tone: guide ? "clean" : "mixed",
    boon: guide ? "ford" : undefined,
    because: knot ?? (guide ? `${guide} is out and geared. The crossing is readable.` : undefined),
  };
}

function pathChoice(state: GameState, dest: HoldId): RoadChoice {
  const spec = PATHS[dest];
  const guide = gearedName(state, spec.hero) ?? (spec.also ? gearedName(state, spec.also) : null);
  const band = dest === "highbarrow" && (heroWearsRelic(state, "beowulf", "barrow-band") || heroWearsRelic(state, "wynn", "barrow-band"));
  return {
    id: "path",
    label: spec.label,
    detail: guide ? "A hold path. Someone out knows which fork still pays." : "A local line. It can pay, and it can wander.",
    tone: guide ? "clean" : "mixed",
    boon: guide ? "path" : undefined,
    because: band && guide ? `${guide} wears the Barrow Band. The ore path stays readable.` : guide ? `${guide} is out and geared. This path is open.` : undefined,
  };
}

function meetingChoice(
  state: GameState,
  dest: HoldId,
  gate: { bell: boolean; lore: { hero: string; gear: Gear } | null; ward: { hero: string; gear: Gear } | null; sky: { hero: string; gear: Gear } | null; traveler: { ask: string; who: string } },
): RoadChoice {
  if (gate.bell) {
    return {
      id: "bell",
      label: "Ring the Ford Bell",
      detail: "The bell asks for a traveler who was not coming. The find is kinder.",
      tone: "clean",
      boon: "bell",
      because: "Odysseus wears the Ford Bell. Ringing it improves the chance of a meeting.",
    };
  }
  if (gate.lore) {
    return {
      id: "stone",
      label: "Read the mile-stone",
      detail: "The stone names the safer fork. The company keeps the find and learns the road.",
      tone: "clean",
      boon: "lore",
      because: `${gate.lore.hero} wears ${gate.lore.gear.name}. Learning on the road opens this reading.`,
    };
  }
  if (gate.ward && !gate.sky) {
    return {
      id: "watch",
      label: "Set the watch",
      detail: "They meet the traveler armed and careful. Trouble is less likely to stick.",
      tone: "clean",
      boon: "ward",
      because: `${gate.ward.hero} wears ${gate.ward.gear.name}. A ward on the road makes the meeting safer.`,
    };
  }
  const rumor = gearedName(state, "odysseus") ?? gearedName(state, "odin") ?? gearedName(state, "athena");
  if (rumor) {
    return {
      id: "rumor",
      label: "Keep the rumor",
      detail: `A local word about ${holdById(dest).name}. It improves the chance of a rare find.`,
      tone: "clean",
      boon: "rumor",
      because: `${rumor} is out and geared. They know which rumor to keep.`,
    };
  }
  const moth = gearedName(state, "moth");
  return {
    id: "ask",
    label: gate.traveler.ask,
    detail: `${gate.traveler.who} has a specific ask. Answering can bring a meeting.`,
    tone: moth ? "clean" : "mixed",
    boon: moth ? "ask" : undefined,
    because: moth ? `${moth} is out and geared. Travelers answer her.` : undefined,
  };
}

function closingChoice(state: GameState, winter: boolean, sky: boolean): RoadChoice {
  const tracker = gearedName(state, "beowulf") ?? gearedName(state, "wynn");
  if (tracker) {
    const band = heroWearsRelic(state, "beowulf", "barrow-band") || heroWearsRelic(state, "wynn", "barrow-band");
    return {
      id: "spoor",
      label: "Follow the creature track",
      detail: "The print is fresh. A hero who knows it can keep the find.",
      tone: "clean",
      boon: "spoor",
      because: band ? `${tracker} wears the Barrow Band. The track is readable.` : `${tracker} is out and geared. The track is readable.`,
    };
  }
  const zeus = gearedName(state, "zeus");
  if (winter && !sky) {
    return {
      id: "white",
      label: winter && seasonOf(state.day) === "deepwinter" ? "Walk the white" : "Cross the rime",
      detail: zeus ? "The rime is readable. The last mile stays with the company." : "Winter weather. It can cost the clean road, and it is kinder than a squall.",
      tone: zeus ? "clean" : "mixed",
      boon: zeus ? "shelter" : undefined,
      because: zeus ? `${zeus} is out and geared. The weather stays readable.` : undefined,
    };
  }
  return {
    id: "squall",
    label: "Cut into the weather",
    detail: "A shorter line through the squall. The company may arrive without the find.",
    tone: "setback",
  };
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
  const hunt = boons.has("hunt") || boons.has("spoor") ? 1 : 0;
  const local = boons.has("ford") || boons.has("path") ? 1 : 0;
  const bellRelic = boons.has("bell") ? 0.1 : boons.has("lore") || boons.has("rumor") ? 0.05 : 0;
  const bellMeet = boons.has("bell") ? 0.1 : boons.has("ask") ? 0.05 : 0;
  const calm = boons.has("ward") || boons.has("weather") || boons.has("shelter") ? -1 : 0;
  const skyLuck = boons.has("weather") ? 1 : 0;
  if (tone === "setback") {
    return { ...PLAIN_TUNE, luck: -1, goldDelta: -2, ireDelta: 4, keepGear: false };
  }
  if (tone === "bargain") {
    return {
      ...PLAIN_TUNE,
      luck: 2 + hunt + local,
      relicBias: 0.04 + (boons.has("bell") ? 0.04 : boons.has("rumor") ? 0.02 : 0),
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
      luck: 2 + hunt + local + skyLuck,
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
    luck: hunt + local,
    relicBonus: boons.has("bell") ? 0.08 : boons.has("rumor") ? 0.04 : 0,
    meetingBonus: bellMeet,
    ireDelta: calm,
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
  return { tone: judged.tone, title: TITLES[judged.tone], line, gearName, gearSlot, relicName };
}

function signed(value: number): string {
  if (value > 0) return `+${value}`;
  return String(value);
}

/** Structured rows for the result card. The chronicle keeps the one-line caption. */
export function roadLedger(input: RoadLedgerInput): RoadMark[] {
  const marks: RoadMark[] = [
    { label: "Outcome", value: input.title },
    { label: "Gold", value: signed(input.gold) },
  ];
  for (const good of input.goods) {
    if (good.delta !== 0) marks.push({ label: good.label, value: signed(good.delta) });
  }
  if (input.relicName) {
    marks.push({
      label: "Unique relic",
      value: input.relicKept === false ? `Left behind · ${input.relicName}` : input.relicName,
    });
  }
  if (input.gearName) {
    const kind = input.gearSlot === "hoard" ? "Treasure" : "Gear";
    marks.push({
      label: kind,
      value: input.gearKept === false ? `Left behind · ${input.gearName}` : input.gearName,
    });
  } else if (!input.relicName) {
    marks.push({ label: "Gear", value: "Nothing carried" });
  }
  marks.push({
    label: "Vell",
    value: input.ire === 0 ? "Unchanged" : input.ire > 0 ? `Anger +${input.ire}` : `Anger ${input.ire}`,
  });
  if (input.taught) marks.push({ label: "Teaching", value: signed(input.taught) });
  if (input.bond) marks.push({ label: "Bond", value: signed(input.bond) });
  if (input.loyalty) marks.push({ label: "Loyalty", value: signed(input.loyalty) });
  return marks;
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
    const marks = Array.isArray(road.outcome.marks)
      ? road.outcome.marks
          .filter((mark) => mark && typeof mark.label === "string" && typeof mark.value === "string")
          .slice(0, 8)
          .map((mark) => ({ label: mark.label, value: mark.value }))
      : undefined;
    outcome = {
      tone: road.outcome.tone,
      title: road.outcome.title,
      line: road.outcome.line,
      gearName: typeof road.outcome.gearName === "string" ? road.outcome.gearName : undefined,
      gearSlot: typeof road.outcome.gearSlot === "string" && SLOTS.has(road.outcome.gearSlot) ? road.outcome.gearSlot : undefined,
      relicName: typeof road.outcome.relicName === "string" ? road.outcome.relicName : undefined,
      gearKept: typeof road.outcome.gearKept === "boolean" ? road.outcome.gearKept : undefined,
      relicKept: typeof road.outcome.relicKept === "boolean" ? road.outcome.relicKept : undefined,
      marks,
    };
  }
  return { dest: road.dest, index, picks, beats, outcome };
}
