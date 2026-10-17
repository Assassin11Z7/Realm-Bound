import { legalTutorial } from "./coach";
import { normalizeExpedition, normalizePolitics } from "./expedition";
import { normalizeHeroState } from "./heroes";
import { emptyBrew } from "./craft";
import { normalizeCampaign } from "./progress";
import { normalizeRealm } from "./realm";
import { WORN_SLOTS, fillGear } from "./world";
import type { Cutscene, GameState, Gear, GearSlot, GoodId, PotionId, Quest, Rumor } from "./types";
import { GOODS, HOLD_IDS, LEVY_GOODS } from "./types";

const HOLDS_OK = new Set<string>(HOLD_IDS);
const SLOTS = new Set<GearSlot>(["hand", "cloak", "charm", "ring", "hoard"]);
const RARITIES = new Set(["common", "uncanny", "relic"]);
const QUEST_KINDS = new Set(["visit", "pledge", "loot", "tribute"]);

function legalGear(value: Gear): value is Gear {
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.name === "string" &&
      SLOTS.has(value.slot) &&
      RARITIES.has(value.rarity) &&
      typeof value.luck === "number" &&
      typeof value.line === "string",
  );
}

function legalWorn(worn: GameState["worn"] | undefined, pack: Gear[]): GameState["worn"] {
  const next: GameState["worn"] = {};
  if (!worn || typeof worn !== "object") return next;
  for (const slot of WORN_SLOTS) {
    const id = worn[slot];
    if (typeof id === "string" && pack.some((item) => item.id === id && item.slot === slot)) next[slot] = id;
  }
  return next;
}

function legalQuest(value: Quest): value is Quest {
  return Boolean(
    value &&
      typeof value.id === "string" &&
      typeof value.title === "string" &&
      QUEST_KINDS.has(value.kind) &&
      typeof value.target === "string" &&
      typeof value.need === "number" &&
      typeof value.progress === "number" &&
      (value.status === "open" || value.status === "ready" || value.status === "claimed") &&
      typeof value.reward === "number",
  );
}

function legalScene(value: Cutscene | null | undefined): Cutscene | null {
  if (!value || typeof value !== "object" || !Array.isArray(value.beats) || value.beats.length === 0) return null;
  const beats = value.beats.filter(
    (beat) => beat && typeof beat.speaker === "string" && typeof beat.line === "string" && typeof beat.art === "string",
  );
  if (beats.length === 0) return null;
  const index = typeof value.index === "number" && value.index >= 0 && value.index < beats.length ? value.index : 0;
  return { id: typeof value.id === "string" ? value.id : "scene", index, beats };
}

const KEY = "westmark-save-v1";
const listeners = new Set<() => void>();

export const emptySnapshot = { state: null as GameState | null, corrupt: false };

let cachedRaw: string | null = null;
let cachedSnapshot = emptySnapshot;
let hasCache = false;

function readSnapshot() {
  if (typeof window === "undefined") return emptySnapshot;
  const raw = window.localStorage.getItem(KEY);
  if (hasCache && cachedRaw === raw) return cachedSnapshot;
  if (!raw) {
    cachedSnapshot = emptySnapshot;
  } else {
    const state = parseSave(raw);
    cachedSnapshot = state ? { state, corrupt: false } : { state: null, corrupt: true };
  }
  cachedRaw = raw;
  hasCache = true;
  return cachedSnapshot;
}

export function subscribeGame(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getGameSnapshot() {
  return readSnapshot();
}

export function getServerGameSnapshot() {
  return emptySnapshot;
}

const POTION_IDS: PotionId[] = ["luck", "calm", "haste", "purse", "vigor"];

function legalBrew(value: Partial<Record<PotionId, number>> | undefined): Record<PotionId, number> {
  const next = emptyBrew();
  if (!value || typeof value !== "object") return next;
  for (const id of POTION_IDS) {
    const count = value[id];
    if (typeof count === "number" && Number.isFinite(count) && count > 0) next[id] = Math.min(99, Math.floor(count));
  }
  return next;
}

function legalRumor(rumor: Rumor | null | undefined): Rumor | null {
  if (!rumor || typeof rumor !== "object") return null;
  const good = rumor.good as GoodId;
  if (!GOODS.includes(good)) return null;
  if (rumor.side !== "buy" && rumor.side !== "sell") return null;
  if (rumor.delta !== 1 && rumor.delta !== -1) return null;
  if (typeof rumor.day !== "number" || !Number.isFinite(rumor.day)) return null;
  return { good, side: rumor.side, delta: rumor.delta, day: rumor.day, text: typeof rumor.text === "string" ? rumor.text : "" };
}

export function parseSave(raw: string): GameState | null {
  try {
    const value = JSON.parse(raw) as GameState;
    if (!value || value.version !== 1) return null;
    if (typeof value.day !== "number" || !value.player || !value.compact) return null;
    if (!Array.isArray(value.compact.members) || !Array.isArray(value.chronicle)) return null;
    for (const good of GOODS) {
      if (typeof value.player.stash?.[good] !== "number") return null;
      if (typeof value.compact.hall?.[good] !== "number") return null;
    }
    for (const good of LEVY_GOODS) {
      if (typeof value.compact.levy?.[good] !== "number") return null;
      if (typeof value.compact.reserve?.[good] !== "number") return null;
    }
    if (!value.wyrm) value.wyrm = { ire: 18, tribute: 0 };
    if (!value.works) value.works = { mill: false, shrine: false, stake: false };
    if (!value.omen) value.omen = null;
    if (!Array.isArray(value.omensSeen)) value.omensSeen = [];
    if (!Array.isArray(value.oathsKept)) value.oathsKept = [];
    if (typeof value.seed !== "number" || !Number.isFinite(value.seed)) value.seed = 0;
    else value.seed = value.seed >>> 0;
    value.rumor = legalRumor(value.rumor);
    value.surprisesSeen = Array.isArray(value.surprisesSeen) ? value.surprisesSeen.filter((item) => typeof item === "string") : [];
    if (!value.where || !HOLDS_OK.has(value.where)) value.where = value.player.holdId;
    if (typeof value.miles !== "number" || !Number.isFinite(value.miles)) value.miles = 0;
    value.pack = (Array.isArray(value.pack) ? value.pack.filter(legalGear) : []).map(fillGear);
    value.vault = (Array.isArray(value.vault) ? value.vault.filter(legalGear) : []).map(fillGear);
    value.brew = legalBrew(value.brew);
    value.cellar = legalBrew(value.cellar);
    value.tonics = {
      luck: typeof value.tonics?.luck === "number" && value.tonics.luck > 0 ? Math.floor(value.tonics.luck) : 0,
      purse: Boolean(value.tonics?.purse),
    };
    value.worn = legalWorn(value.worn, value.pack);
    value.quests = Array.isArray(value.quests) ? value.quests.filter(legalQuest) : [];
    value.scene = legalScene(value.scene);
    value.tutorial = legalTutorial(value.tutorial);
    value.expedition = normalizeExpedition(value);
    value.politics = normalizePolitics(value.politics);
    value.pardonCall = typeof value.pardonCall === "number" && Number.isFinite(value.pardonCall) ? Math.floor(value.pardonCall) : null;
    value.campaign = normalizeCampaign(
      value.campaign,
      value.compact.members.map((member) => member.id).filter((id) => typeof id === "string"),
    );
    normalizeRealm(value);
    normalizeHeroState(value);
    return value;
  } catch {
    return null;
  }
}

export function loadGame(): { state: GameState | null; corrupt: boolean } {
  if (typeof window === "undefined") return { state: null, corrupt: false };
  const raw = window.localStorage.getItem(KEY);
  if (!raw) return { state: null, corrupt: false };
  const state = parseSave(raw);
  if (!state) return { state: null, corrupt: true };
  return { state, corrupt: false };
}

export function saveGame(state: GameState | null) {
  if (typeof window === "undefined") return;
  if (!state) window.localStorage.removeItem(KEY);
  else window.localStorage.setItem(KEY, JSON.stringify(state));
  listeners.forEach((listener) => listener());
}
