import type { GameState } from "./types";
import { GOODS, LEVY_GOODS } from "./types";

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
