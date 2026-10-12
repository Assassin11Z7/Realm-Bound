import { WYRM_NAME, holdById } from "./content";
import type {
  BuildingId,
  Campaign,
  Captain,
  CaptainOrder,
  GameState,
  HoldId,
  Mission,
  Result,
  SkillId,
  SkillOffer,
  Threat,
} from "./types";
import { HOLD_IDS } from "./types";
import { PACK_LIMIT, bumpQuest, rewardScene, rollGear, worldRng } from "./world";

export const SKILLS: Record<SkillId, { name: string; blurb: string }> = {
  stores: { name: "Deep stores", blurb: "The hold yields one more at every dawn." },
  step: { name: "Quiet step", blurb: "Luck on the road rises by one." },
  coin: { name: "Oath coin", blurb: "Each pledge you make yourself pays 1 extra gold." },
  truce: { name: "Wyrm-truce", blurb: "Vell's ire climbs more slowly each dusk." },
  bargain: { name: "Keen bargain", blurb: "You buy for less and sell for more." },
  eye: { name: "Captain's eye", blurb: "Marches and hunts come home more often." },
  wright: { name: "Hallwright", blurb: "Raising a work costs 3 gold less." },
  scholar: { name: "Road scholar", blurb: "Walking a hold teaches more." },
};

export const BUILDINGS: { id: BuildingId; name: string; good: "timber" | "grain" | "salt" | "wool" | "iron"; blurb: string }[] = [
  { id: "hall", name: "Hall range", good: "timber", blurb: "Each level holds 4 more in your own store." },
  { id: "yard", name: "Yard", good: "grain", blurb: "Each level adds one to the dawn yield." },
  { id: "shrine", name: "Shrine walk", good: "salt", blurb: "Each level steadies every captain at dawn." },
  { id: "market", name: "Market row", good: "wool", blurb: "At levels 2 and 4 the caravan treats you better." },
  { id: "watch", name: "Watch", good: "iron", blurb: "Each level makes a march more likely to return with coin." },
];

export const CHAPTERS = [
  { id: 1, name: "The Northern Levy", aim: "Feed the wagons before the twelfth dusk." },
  { id: 2, name: "The Open Marches", aim: "Raise the hold and give your captains orders." },
  { id: 3, name: "The Wyrm's Attention", aim: "Build high enough that a second winter cannot surprise you." },
  { id: 4, name: "The Realm Compact", aim: "Last long enough that the holds answer the banner." },
];

const SKILL_IDS: SkillId[] = ["stores", "step", "coin", "truce", "bargain", "eye", "wright", "scholar"];
const BUILDING_IDS: BuildingId[] = ["hall", "yard", "shrine", "market", "watch"];
const ORDERS = new Set<CaptainOrder>(["oath", "garrison", "march", "hunt", "trade"]);
const MAX_LEVEL = 20;
const MAX_BUILDING = 5;

const THREATS: Omit<Threat, "id">[] = [
  {
    title: "Bands on the wool road",
    detail: "They are taking wool and leaving the fords nervous. Pay them, send a march, or let the hold take the quarrel.",
    art: "/art/caravan.jpg",
  },
  {
    title: "A second wake in the snow",
    detail: "Not Vell. A younger frost is hunting the high road. It can be bought off, ridden against, or endured.",
    art: "/art/wyrm-wing.jpg",
  },
  {
    title: "The ford is down",
    detail: "Water took the crossing. Coin hires a crew. A captain can force the span. Waiting feeds the wyrm's patience.",
    art: "/art/hold-greenmere.jpg",
  },
  {
    title: "A saint's tax",
    detail: "Riders from Vesper want a gift for the shrine road. Pay, answer with a march, or refuse.",
    art: "/art/hold-vesper.jpg",
  },
  {
    title: "Copper weights",
    detail: "The guild is retaring every sack on the coast. A fee, a captain, or a quarrel.",
    art: "/art/hold-saltmere.jpg",
  },
  {
    title: "A deepwood claim",
    detail: "Riders out of Ashfold say the timber east of the road is theirs. Settle it.",
    art: "/art/hold-ashfold.jpg",
  },
];

export function xpNeed(level: number): number {
  return 8 + level * 5;
}

export function chapterName(chapter: number): string {
  return CHAPTERS.find((item) => item.id === chapter)?.name ?? "The Realm";
}

export function powerOf(state: GameState): number {
  const camp = state.campaign;
  if (!camp) return 0;
  const build = BUILDING_IDS.reduce((sum, id) => sum + (camp.buildings[id] ?? 0), 0);
  const ranks = Object.values(camp.captains).reduce((sum, captain) => sum + captain.rank, 0);
  return camp.level * 10 + camp.skills.length * 6 + build * 4 + ranks * 3 + Math.floor(state.player.renown / 2);
}

export function buildingCost(state: GameState, id: BuildingId): { gold: number; good: (typeof BUILDINGS)[number]["good"]; qty: number } {
  const spec = BUILDINGS.find((item) => item.id === id) ?? BUILDINGS[0];
  const level = state.campaign?.buildings[id] ?? 0;
  let gold = 6 + level * 4;
  const qty = 1 + Math.floor(level / 2);
  if (state.campaign?.skills.includes("wright")) gold = Math.max(2, gold - 3);
  return { gold, good: spec.good, qty };
}

function blankCaptain(): Captain {
  return { rank: 1, xp: 0, order: "oath", target: null };
}

function missionList(): Mission[] {
  return [
    { id: "miles", chapter: 1, title: "Walk three holds", detail: "Miles on the road, not days on the seal.", need: 3, progress: 0, status: "open", rewardGold: 8, rewardXp: 6 },
    { id: "pledge", chapter: 1, title: "Feed the wagons", detail: "Pledge 8 goods to the levy with your own hand.", need: 8, progress: 0, status: "open", rewardGold: 6, rewardXp: 4 },
    { id: "level2", chapter: 1, title: "Learn a discipline", detail: "Reach level 2 and choose how you grow.", need: 2, progress: 1, status: "open", rewardGold: 10, rewardXp: 0 },
    { id: "worn", chapter: 1, title: "Dress for the road", detail: "Wear two pieces at once.", need: 2, progress: 0, status: "open", rewardGold: 5, rewardXp: 4 },
    { id: "build", chapter: 2, title: "Raise the hold", detail: "Finish one work. It completes at the next dawn.", need: 1, progress: 0, status: "open", rewardGold: 12, rewardXp: 6 },
    { id: "march", chapter: 2, title: "Send a captain", detail: "A march that returns counts. Set the order, then seal the day.", need: 1, progress: 0, status: "open", rewardGold: 8, rewardXp: 6 },
    { id: "day20", chapter: 2, title: "See the second thaw", detail: "Still be sealing dawns on day 20.", need: 20, progress: 1, status: "open", rewardGold: 14, rewardXp: 8 },
    { id: "hunt", chapter: 2, title: "Hunt the frost", detail: "A captain's hunt that finds its mark.", need: 1, progress: 0, status: "open", rewardGold: 10, rewardXp: 6 },
    { id: "level6", chapter: 3, title: "A name on the road", detail: "Reach level 6.", need: 6, progress: 1, status: "open", rewardGold: 16, rewardXp: 0 },
    { id: "high", chapter: 3, title: "Build to the ridge", detail: "Any work at level 3.", need: 3, progress: 0, status: "open", rewardGold: 18, rewardXp: 8 },
    { id: "skills", chapter: 3, title: "Three disciplines", detail: "Keep three skills.", need: 3, progress: 0, status: "open", rewardGold: 12, rewardXp: 6 },
    { id: "kept", chapter: 3, title: "Hold the oaths", detail: "All three captains still sworn on day 24.", need: 1, progress: 0, status: "open", rewardGold: 20, rewardXp: 8 },
    { id: "level10", chapter: 4, title: "Warden's level", detail: "Reach level 10.", need: 10, progress: 1, status: "open", rewardGold: 24, rewardXp: 0 },
    { id: "day40", chapter: 4, title: "A long banner", detail: "Seal through day 40.", need: 40, progress: 1, status: "open", rewardGold: 24, rewardXp: 10 },
    { id: "relic", chapter: 4, title: "Something old", detail: "Carry a relic in the pack.", need: 1, progress: 0, status: "open", rewardGold: 15, rewardXp: 8 },
    { id: "two-high", chapter: 4, title: "Two works above the town", detail: "Two buildings at level 3 or higher.", need: 2, progress: 0, status: "open", rewardGold: 22, rewardXp: 10 },
  ];
}

export function blankCampaign(memberIds: string[]): Campaign {
  const captains: Record<string, Captain> = {};
  for (const id of memberIds) captains[id] = blankCaptain();
  return {
    level: 1,
    xp: 0,
    skills: [],
    offer: null,
    buildings: { hall: 0, yard: 0, shrine: 0, market: 0, watch: 0 },
    project: null,
    chapter: 1,
    captains,
    missions: missionList(),
    threat: null,
    marches: 0,
    hunts: 0,
    threatsFaced: 0,
  };
}

function legalMission(value: Mission): value is Mission {
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.chapter === "number" &&
      typeof value.title === "string" &&
      typeof value.need === "number" &&
      typeof value.progress === "number" &&
      (value.status === "open" || value.status === "ready" || value.status === "claimed") &&
      typeof value.rewardGold === "number",
  );
}

export function normalizeCampaign(value: Campaign | undefined, memberIds: string[]): Campaign {
  const blank = blankCampaign(memberIds);
  if (!value || typeof value !== "object") return blank;
  const skills = Array.isArray(value.skills) ? value.skills.filter((id): id is SkillId => SKILL_IDS.includes(id as SkillId)) : [];
  const buildings = { ...blank.buildings };
  for (const id of BUILDING_IDS) {
    const level = value.buildings?.[id];
    if (typeof level === "number" && level >= 0 && level <= MAX_BUILDING) buildings[id] = Math.floor(level);
  }
  const captains = { ...blank.captains };
  for (const id of memberIds) {
    const captain = value.captains?.[id];
    if (!captain) continue;
    captains[id] = {
      rank: typeof captain.rank === "number" && captain.rank >= 1 && captain.rank <= 10 ? Math.floor(captain.rank) : 1,
      xp: typeof captain.xp === "number" && captain.xp >= 0 ? Math.floor(captain.xp) : 0,
      order: ORDERS.has(captain.order) ? captain.order : "oath",
      target: captain.target && (HOLD_IDS as readonly string[]).includes(captain.target) ? captain.target : null,
    };
  }
  const known = new Map(blank.missions.map((mission) => [mission.id, mission]));
  const missions = blank.missions.map((mission) => {
    const saved = Array.isArray(value.missions) ? value.missions.find((item) => item?.id === mission.id) : undefined;
    if (!saved || !legalMission(saved)) return mission;
    return {
      ...known.get(mission.id)!,
      progress: Math.max(0, Math.floor(saved.progress)),
      status: saved.status,
    };
  });
  let offer: SkillOffer | null = null;
  if (value.offer && typeof value.offer.level === "number" && Array.isArray(value.offer.choices)) {
    const choices = value.offer.choices.filter((id): id is SkillId => SKILL_IDS.includes(id as SkillId) && !skills.includes(id));
    if (choices.length > 0) offer = { level: value.offer.level, choices: choices.slice(0, 3) };
  }
  const project = value.project && BUILDING_IDS.includes(value.project) ? value.project : null;
  const threat =
    value.threat && typeof value.threat.title === "string" && typeof value.threat.detail === "string" && typeof value.threat.art === "string"
      ? { id: typeof value.threat.id === "string" ? value.threat.id : "threat", title: value.threat.title, detail: value.threat.detail, art: value.threat.art }
      : null;
  return {
    level: typeof value.level === "number" && value.level >= 1 && value.level <= MAX_LEVEL ? Math.floor(value.level) : 1,
    xp: typeof value.xp === "number" && value.xp >= 0 ? Math.floor(value.xp) : 0,
    skills,
    offer,
    buildings,
    project,
    chapter: typeof value.chapter === "number" && value.chapter >= 1 && value.chapter <= 4 ? Math.floor(value.chapter) : 1,
    captains,
    missions,
    threat,
    marches: typeof value.marches === "number" && value.marches >= 0 ? Math.floor(value.marches) : 0,
    hunts: typeof value.hunts === "number" && value.hunts >= 0 ? Math.floor(value.hunts) : 0,
    threatsFaced: typeof value.threatsFaced === "number" && value.threatsFaced >= 0 ? Math.floor(value.threatsFaced) : 0,
  };
}

function note(state: GameState, text: string) {
  state.chronicle.push({ id: state.nextId++, day: state.day, text });
  if (state.chronicle.length > 80) state.chronicle.splice(0, state.chronicle.length - 80);
}

function fail(state: GameState, error: string): Result {
  return { state, error };
}

function ok(state: GameState, message?: string): Result {
  return { state, message };
}

function offerSkills(seed: number, level: number, owned: SkillId[]): SkillId[] {
  const pool = SKILL_IDS.filter((id) => !owned.includes(id));
  const roll = worldRng((seed ^ Math.imul(level, 0x9e3779b1)) >>> 0);
  for (let index = pool.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(roll() * (index + 1));
    const current = pool[index];
    pool[index] = pool[swap];
    pool[swap] = current;
  }
  return pool.slice(0, 3);
}

export function grantXp(state: GameState, amount: number): string[] {
  if (!state.campaign) return [];
  const camp = state.campaign;
  if (amount > 0) camp.xp += amount;
  if (camp.offer || camp.level >= MAX_LEVEL) return [];
  const need = xpNeed(camp.level);
  if (camp.xp < need) return [];
  camp.xp -= need;
  camp.level += 1;
  const choices = offerSkills(state.seed ?? 0, camp.level, camp.skills);
  if (choices.length === 0) return [`Level ${camp.level}. Every discipline is already yours.`];
  camp.offer = { level: camp.level, choices };
  return [`Level ${camp.level}. Three disciplines are open. Choose one.`];
}

function measured(state: GameState, id: string): number {
  const camp = state.campaign;
  const levels = BUILDING_IDS.map((building) => camp.buildings[building] ?? 0);
  const maxBuild = Math.max(0, ...levels);
  const atThree = levels.filter((level) => level >= 3).length;
  switch (id) {
    case "miles":
      return state.miles ?? 0;
    case "pledge":
      return state.stats.pledged;
    case "level2":
    case "level6":
    case "level10":
      return camp.level;
    case "worn":
      return Object.values(state.worn ?? {}).filter(Boolean).length;
    case "build":
    case "high":
      return maxBuild;
    case "march":
      return camp.marches;
    case "day20":
    case "day40":
      return state.day;
    case "hunt":
      return camp.hunts;
    case "skills":
      return camp.skills.length;
    case "kept":
      return state.day >= 24 && state.compact.members.every((member) => member.inCompact) ? 1 : 0;
    case "relic":
      return (state.pack ?? []).some((gear) => gear.rarity === "relic") ? 1 : 0;
    case "two-high":
      return atThree;
    default:
      return 0;
  }
}

export function syncCampaign(state: GameState) {
  const camp = state.campaign;
  if (!camp) return;
  const built = BUILDING_IDS.some((id) => camp.buildings[id] >= 1);
  const high = BUILDING_IDS.some((id) => camp.buildings[id] >= 3);
  if (camp.chapter < 2 && (state.day > 12 || state.outcome === "held" || state.outcome === "held-late")) camp.chapter = 2;
  if (camp.chapter < 3 && camp.level >= 4 && built) camp.chapter = 3;
  if (camp.chapter < 4 && camp.level >= 8 && high) camp.chapter = 4;
  for (const mission of camp.missions) {
    if (mission.status === "claimed") continue;
    mission.progress = Math.min(mission.need, measured(state, mission.id));
    if (mission.progress >= mission.need) mission.status = "ready";
  }
}

export function finishProject(state: GameState): string[] {
  const camp = state.campaign;
  if (!camp?.project) return [];
  const id = camp.project;
  camp.buildings[id] = Math.min(MAX_BUILDING, (camp.buildings[id] ?? 0) + 1);
  camp.project = null;
  const name = BUILDINGS.find((item) => item.id === id)?.name ?? "The work";
  return [`${name} is raised to level ${camp.buildings[id]}.`, ...grantXp(state, 6)];
}

function steadyShrine(state: GameState) {
  const levels = state.campaign?.buildings.shrine ?? 0;
  if (levels <= 0) return;
  for (const member of state.compact.members) {
    if (!member.inCompact) continue;
    member.contentment = Math.min(100, member.contentment + levels);
  }
}

function bringTrophy(state: GameState, roll: () => number): string | null {
  if ((state.pack ?? []).length >= PACK_LIMIT || roll() >= 0.55) return null;
  const gear = rollGear(state.seed ?? 0, state.day, (state.miles ?? 0) + (state.pack?.length ?? 0) + 11);
  state.pack = [...(state.pack ?? []), gear];
  bumpQuest(state, "loot", "any", 1);
  return gear.name;
}

function growCaptain(captain: Captain, amount: number, name: string): string[] {
  captain.xp += amount;
  const lines: string[] = [];
  while (captain.rank < 10 && captain.xp >= 4 + captain.rank * 3) {
    captain.xp -= 4 + captain.rank * 3;
    captain.rank += 1;
    lines.push(`${name} reaches captain rank ${captain.rank}.`);
  }
  return lines;
}

export function resolveCaptains(state: GameState): string[] {
  const camp = state.campaign;
  if (!camp) return [];
  const lines: string[] = [];
  const eye = camp.skills.includes("eye") ? 1 : 0;
  const watch = camp.buildings.watch ?? 0;
  for (const member of state.compact.members) {
    if (!member.inCompact) continue;
    const captain = camp.captains[member.id];
    if (!captain || captain.order === "oath") continue;
    const roll = worldRng((state.seed ^ Math.imul(state.day + captain.rank, 0x85ebca6b) ^ member.id.length) >>> 0);
    if (captain.order === "garrison") {
      member.contentment = Math.min(100, member.contentment + 3);
      lines.push(`${member.name} held the gate.`, ...growCaptain(captain, 2, member.name));
    } else if (captain.order === "march") {
      const place = holdById(captain.target ?? member.holdId).name;
      const success = roll() < Math.min(0.92, 0.5 + captain.rank * 0.05 + watch * 0.04 + eye * 0.08);
      if (success) {
        const gold = 1 + Math.floor(roll() * (2 + captain.rank));
        state.player.gold += gold;
        camp.marches += 1;
        const trophy = bringTrophy(state, roll);
        lines.push(
          trophy
            ? `${member.name} marched to ${place} and returned with ${gold} gold and ${trophy}.`
            : `${member.name} marched to ${place} and returned with ${gold} gold.`,
        );
      } else {
        member.contentment = Math.max(0, member.contentment - 4);
        lines.push(`${member.name} marched toward ${place} and came back empty.`);
      }
      lines.push(...growCaptain(captain, 3, member.name));
    } else if (captain.order === "hunt") {
      const success = roll() < Math.min(0.9, 0.42 + captain.rank * 0.06 + eye * 0.1);
      if (success) {
        state.wyrm.ire = Math.max(0, state.wyrm.ire - 3);
        camp.hunts += 1;
        const trophy = bringTrophy(state, roll);
        lines.push(
          trophy
            ? `${member.name} turned a hunt aside and brought back ${trophy}. ${WYRM_NAME}'s ire eases.`
            : `${member.name} turned a hunt aside. ${WYRM_NAME}'s ire eases.`,
        );
      } else {
        state.wyrm.ire = Math.min(100, state.wyrm.ire + 2);
        lines.push(`${member.name}'s hunt found only tracks. ${WYRM_NAME} noticed.`);
      }
      lines.push(...growCaptain(captain, 3, member.name));
    } else if (captain.order === "trade") {
      const gold = 1 + captain.rank;
      state.player.gold += gold;
      lines.push(`${member.name} sold news of the compact for ${gold} gold.`, ...growCaptain(captain, 2, member.name));
    }
  }
  return lines;
}

export function maybeThreat(state: GameState): string | null {
  const camp = state.campaign;
  if (!camp || state.day <= 12 || camp.threat || camp.threatsFaced >= 8) return null;
  if (state.day % 6 !== 4) return null;
  const roll = worldRng((state.seed ^ Math.imul(state.day, 0xc2b2ae35)) >>> 0);
  const picked = THREATS[Math.floor(roll() * THREATS.length)];
  camp.threat = { ...picked, id: `threat-${state.day}` };
  return `${picked.title} stands on the road.`;
}

export function applyDawnProgress(state: GameState): string[] {
  if (!state.campaign) return [];
  const lines = [...finishProject(state), ...resolveCaptains(state), ...grantXp(state, 2)];
  steadyShrine(state);
  const threat = maybeThreat(state);
  if (threat) lines.push(threat);
  syncCampaign(state);
  return lines;
}

export function chooseSkill(state: GameState, skillId: SkillId): Result {
  const camp = state.campaign;
  if (!camp?.offer) return fail(state, "No discipline is waiting.");
  if (!camp.offer.choices.includes(skillId) || camp.skills.includes(skillId)) return fail(state, "That discipline is not open.");
  const next = structuredClone(state);
  next.campaign.skills = [...next.campaign.skills, skillId];
  next.campaign.offer = null;
  const learned = SKILLS[skillId].name;
  note(next, `You take up ${learned}. ${SKILLS[skillId].blurb}`);
  for (const line of grantXp(next, 0)) note(next, line);
  syncCampaign(next);
  return ok(next, `${learned}. ${SKILLS[skillId].blurb}`);
}

export function startProject(state: GameState, id: BuildingId): Result {
  const camp = state.campaign;
  if (!camp) return fail(state, "The hold has no works yet.");
  if (!BUILDING_IDS.includes(id)) return fail(state, "That is not a work you can raise.");
  if (camp.project) return fail(state, "A work is already rising. It finishes at dawn.");
  if ((camp.buildings[id] ?? 0) >= MAX_BUILDING) return fail(state, "That work is as high as the ridge allows.");
  const cost = buildingCost(state, id);
  if (state.player.gold < cost.gold) return fail(state, `That work costs ${cost.gold} gold.`);
  if (state.player.stash[cost.good] < cost.qty) return fail(state, `That work needs ${cost.qty} ${cost.good}.`);
  const next = structuredClone(state);
  next.player.gold -= cost.gold;
  next.player.stash[cost.good] -= cost.qty;
  next.campaign.project = id;
  const name = BUILDINGS.find((item) => item.id === id)?.name ?? "The work";
  note(next, `${name} will be raised at the next dawn.`);
  return ok(next, `${name} rises at dawn.`);
}

export function setCaptainOrder(state: GameState, memberId: string, order: CaptainOrder, target?: HoldId | null): Result {
  const member = state.compact.members.find((item) => item.id === memberId);
  if (!member?.inCompact) return fail(state, "That captain has left the compact.");
  const camp = state.campaign;
  if (!camp?.captains[memberId]) return fail(state, "That captain is not sworn.");
  if (!ORDERS.has(order)) return fail(state, "That is not an order.");
  if (order === "march" && !target) return fail(state, "A march needs a hold.");
  if (order === "march" && target && !(HOLD_IDS as readonly string[]).includes(target)) return fail(state, "That hold is not on the map.");
  const next = structuredClone(state);
  const captain = next.campaign.captains[memberId];
  captain.order = order;
  captain.target = order === "march" ? target ?? null : null;
  const place = captain.target ? ` toward ${holdById(captain.target).name}` : "";
  const word = order === "oath" ? "released to their own oath" : `ordered to ${order}${place}`;
  note(next, `${member.name} is ${word}. The order resolves when you seal the day.`);
  return ok(next, `${member.name} will ${order === "oath" ? "follow the oath" : order} at dusk.`);
}

function clearThreat(state: GameState, line: string): Result {
  const next = structuredClone(state);
  next.campaign.threat = null;
  next.campaign.threatsFaced += 1;
  note(next, line);
  for (const extra of grantXp(next, 4)) note(next, extra);
  syncCampaign(next);
  return ok(next, line);
}

export function payThreat(state: GameState): Result {
  if (!state.campaign?.threat) return fail(state, "Nothing is pressing on the road.");
  if (state.player.gold < 6) return fail(state, "Sending them off costs 6 gold.");
  const title = state.campaign.threat.title;
  const next = structuredClone(state);
  next.player.gold -= 6;
  next.campaign.threat = null;
  next.campaign.threatsFaced += 1;
  const line = `You paid 6 gold and ${title.toLowerCase()} moved on.`;
  note(next, line);
  for (const extra of grantXp(next, 3)) note(next, extra);
  syncCampaign(next);
  return ok(next, line);
}

export function rideThreat(state: GameState): Result {
  const threat = state.campaign?.threat;
  if (!threat) return fail(state, "Nothing is pressing on the road.");
  const rider = state.compact.members.find((member) => member.inCompact && state.campaign.captains[member.id]?.order === "march");
  if (!rider) return fail(state, "Set a captain to march, then send them.");
  const captain = state.campaign.captains[rider.id];
  const roll = worldRng((state.seed ^ Math.imul(state.day + captain.rank, 0x27d4eb2d)) >>> 0);
  const eye = state.campaign.skills.includes("eye") ? 0.1 : 0;
  const watch = (state.campaign.buildings.watch ?? 0) * 0.04;
  const success = roll() < Math.min(0.9, 0.45 + captain.rank * 0.07 + eye + watch);
  if (!success) {
    return clearThreat(state, `${rider.name} rode at ${threat.title.toLowerCase()} and was turned aside. The trouble leaves, and so does a little pride.`);
  }
  const next = structuredClone(state);
  const gold = 2 + next.campaign.captains[rider.id].rank;
  next.player.gold += gold;
  next.campaign.threat = null;
  next.campaign.threatsFaced += 1;
  next.campaign.marches += 1;
  const line = `${rider.name} broke ${threat.title.toLowerCase()} and brought back ${gold} gold.`;
  note(next, line);
  for (const extra of grantXp(next, 5)) note(next, extra);
  syncCampaign(next);
  return ok(next, line);
}

export function endureThreat(state: GameState): Result {
  if (!state.campaign?.threat) return fail(state, "Nothing is pressing on the road.");
  const title = state.campaign.threat.title;
  const next = structuredClone(state);
  next.wyrm.ire = Math.min(100, next.wyrm.ire + 6);
  for (const member of next.compact.members) {
    if (!member.inCompact) continue;
    member.contentment = Math.max(0, member.contentment - 4);
  }
  next.campaign.threat = null;
  next.campaign.threatsFaced += 1;
  const line = `You let ${title.toLowerCase()} pass. ${WYRM_NAME} felt the quarrel.`;
  note(next, line);
  syncCampaign(next);
  return ok(next, line);
}

export function claimMission(state: GameState, missionId: string): Result {
  const mission = state.campaign?.missions.find((item) => item.id === missionId);
  if (!mission) return fail(state, "No such work.");
  if (mission.status === "claimed") return fail(state, "That reward is already taken.");
  if (mission.status !== "ready") return fail(state, "That work is not finished.");
  if (state.scene) return fail(state, "The scene is not finished.");
  const next = structuredClone(state);
  const target = next.campaign.missions.find((item) => item.id === missionId);
  if (!target) return fail(state, "No such work.");
  target.status = "claimed";
  next.player.gold += target.rewardGold;
  const lines = grantXp(next, target.rewardXp);
  next.scene = rewardScene(target.title, target.rewardGold);
  note(next, `You claim ${target.title}. ${target.rewardGold} gold.`);
  for (const line of lines) note(next, line);
  syncCampaign(next);
  return ok(next, `${target.rewardGold} gold for ${target.title}.`);
}
