import type { BuildingId, GameState, GoodId, PotionId, RealmBench, Result } from "./types";
import { finishProject, grantXp, syncCampaign } from "./progress";
import { carryCap, carriedWeight, gearWeight, makePiece, storedWeight, vaultCap } from "./world";

export function emptyBrew(): Record<PotionId, number> {
  return { luck: 0, calm: 0, haste: 0, purse: 0, vigor: 0 };
}

export const POTIONS: Record<PotionId, { name: string; line: string }> = {
  luck: { name: "Luck drink", line: "The next three walks roll kinder." },
  calm: { name: "Calm drink", line: "Vell's anger falls by eight." },
  haste: { name: "Haste drink", line: "The work rising in the hold finishes now." },
  purse: { name: "Coin drink", line: "Until the next dawn, goods sell for 2 more." },
  vigor: { name: "Vigor drink", line: "A rush of experience." },
};

export const RECIPES: {
  id: string;
  building: BuildingId;
  level: number;
  gold: number;
  good: GoodId;
  qty: number;
  gear?: string;
  potion?: PotionId;
  project?: RealmBench;
  detail: string;
}[] = [
  { id: "knife", building: "forge", level: 1, gold: 2, good: "iron", qty: 1, gear: "Road knife", detail: "A short blade from one iron." },
  { id: "pick", building: "forge", level: 1, gold: 4, good: "iron", qty: 2, gear: "Mine pick", detail: "Two iron, and a head that remembers the mine." },
  { id: "thumb", building: "forge", level: 1, gold: 3, good: "iron", qty: 1, gear: "Iron thumb", detail: "A ring beaten from a nail." },
  { id: "bill", building: "forge", level: 2, gold: 6, good: "iron", qty: 2, gear: "Ford spear", detail: "A watchman's spear. The forge must be level 2." },
  { id: "hammer", building: "forge", level: 2, gold: 5, good: "iron", qty: 1, gear: "Bell hammer", detail: "Iron enough for a shrine bell." },
  { id: "needle", building: "forge", level: 3, gold: 12, good: "relics", qty: 1, gear: "Dragon needle", detail: "A relic drawn through the fire. Forge level 3." },
  { id: "staff", building: "forge", level: 1, gold: 5, good: "iron", qty: 1, gear: "Ash staff", project: "forge", detail: "The expanded forge. A staff that teaches. Uncanny, even from the first level." },
  { id: "luck", building: "still", level: 1, gold: 2, good: "salt", qty: 1, potion: "luck", detail: "Salt boiled down to a kinder road." },
  { id: "calm", building: "still", level: 1, gold: 3, good: "salt", qty: 2, potion: "calm", detail: "Two salt. Vell drinks the quiet." },
  { id: "purse", building: "still", level: 2, gold: 4, good: "salt", qty: 2, potion: "purse", detail: "A drink that sweetens a sale until dawn." },
  { id: "vigor", building: "still", level: 2, gold: 4, good: "grain", qty: 1, potion: "vigor", detail: "Grain in the brew house. It wakes the blood." },
  { id: "haste", building: "still", level: 3, gold: 8, good: "relics", qty: 1, potion: "haste", detail: "A relic in the brew house. The rising work finishes at once." },
  { id: "wool", building: "loom", level: 1, gold: 3, good: "wool", qty: 2, gear: "Wool cloak", detail: "Two wool on the loom." },
  { id: "bead", building: "loom", level: 1, gold: 2, good: "wool", qty: 1, gear: "Crow bead", detail: "A bead wound from a single wool." },
  { id: "weave", building: "loom", level: 2, gold: 5, good: "wool", qty: 2, gear: "Greenmere weave", detail: "A grain-colored cloak. Loom level 2." },
  { id: "hide", building: "loom", level: 3, gold: 14, good: "relics", qty: 1, gear: "Dragon hide", detail: "The loom takes a relic and gives back a scale-cloak." },
  { id: "ashcloak", building: "loom", level: 1, gold: 5, good: "wool", qty: 2, gear: "Ash cloak", project: "loom", detail: "The expanded loom. A cloak that hides the road. Uncanny, even from the first level." },
];

const BENCH: Partial<Record<BuildingId, string>> = {
  forge: "forge",
  still: "brew house",
  loom: "loom",
};

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

export function craft(state: GameState, recipeId: string): Result {
  const recipe = RECIPES.find((item) => item.id === recipeId);
  if (!recipe) return fail(state, "That is not a recipe.");
  const level = state.campaign?.buildings[recipe.building] ?? 0;
  const bench = BENCH[recipe.building] ?? recipe.building;
  if (recipe.project) {
    const open = (state.campaign?.realmWorks ?? []).some((work) => work.id === "bench" && work.bench === recipe.project);
    if (!open) return fail(state, recipe.project === "loom" ? "Expand the loom first. It is a project under Hold." : "Expand the forge first. It is a project under Hold.");
  }
  if (level < recipe.level) return fail(state, `The ${bench} must be level ${recipe.level}.`);
  if (state.player.gold < recipe.gold) return fail(state, `That costs ${recipe.gold} gold.`);
  if (state.player.stash[recipe.good] < recipe.qty) return fail(state, `You need ${recipe.qty} ${recipe.good}.`);
  let rarity: "common" | "uncanny" | "relic" = level >= 3 ? "relic" : level >= 2 ? "uncanny" : "common";
  if (recipe.project && rarity === "common") rarity = "uncanny";
  const preview = recipe.gear ? makePiece(recipe.gear, rarity, "preview") : null;
  if (recipe.gear && !preview) return fail(state, "That pattern is lost.");
  const adding = preview ? gearWeight(preview) : 1;
  if (carriedWeight(state) + adding > carryCap(state)) {
    return fail(state, "The bag cannot take the weight. Move something to the strongroom.");
  }
  const next = structuredClone(state);
  next.player.gold -= recipe.gold;
  next.player.stash[recipe.good] -= recipe.qty;
  if (recipe.potion) {
    next.brew[recipe.potion] += 1;
    const name = POTIONS[recipe.potion].name;
    note(next, `You brew ${name}.`);
    syncCampaign(next);
    return ok(next, `${name} is in the bag.`);
  }
  const gear = makePiece(recipe.gear ?? "", rarity, `craft-${next.day}-${next.nextId++}`);
  if (!gear) return fail(state, "That pattern is lost.");
  next.pack = [...(next.pack ?? []), gear];
  note(next, `You craft ${gear.name}. ${gear.line}`);
  syncCampaign(next);
  return ok(next, `${gear.name} is in the bag.`);
}

export function drinkPotion(state: GameState, potionId: PotionId): Result {
  if ((state.brew?.[potionId] ?? 0) < 1) return fail(state, "That drink is not in the bag.");
  if (potionId === "haste" && !state.campaign?.project) return fail(state, "Nothing is rising. Start a work, then drink.");
  const next = structuredClone(state);
  next.brew[potionId] -= 1;
  if (potionId === "luck") {
    next.tonics.luck += 3;
    note(next, "You drink a luck drink. The next three walks roll kinder.");
    return ok(next, "Luck rises for three walks.");
  }
  if (potionId === "calm") {
    next.wyrm.ire = Math.max(0, next.wyrm.ire - 8);
    note(next, "You drink a calm drink. Vell's anger falls.");
    return ok(next, "Vell's anger falls by 8.");
  }
  if (potionId === "purse") {
    next.tonics.purse = true;
    note(next, "You drink a coin drink. Sales pay more until dawn.");
    return ok(next, "Sales pay 2 more until you seal the day.");
  }
  if (potionId === "vigor") {
    const lines = grantXp(next, 4);
    note(next, "You drink a vigor drink.");
    for (const line of lines) note(next, line);
    syncCampaign(next);
    return ok(next, "Vigor. Experience rises.");
  }
  const lines = finishProject(next);
  for (const line of lines) note(next, line);
  syncCampaign(next);
  return ok(next, lines[0] ?? "The work finishes.");
}

export function storeGear(state: GameState, gearId: string): Result {
  const gear = (state.pack ?? []).find((item) => item.id === gearId);
  if (!gear) return fail(state, "That is not in the bag.");
  if (storedWeight(state) + gearWeight(gear) > vaultCap(state)) return fail(state, "The strongroom cannot take the weight.");
  const next = structuredClone(state);
  next.pack = (next.pack ?? []).filter((item) => item.id !== gearId);
  if ((next.worn ?? {})[gear.slot] === gearId) {
    const worn = { ...(next.worn ?? {}) };
    delete worn[gear.slot];
    next.worn = worn;
  }
  next.vault = [...(next.vault ?? []), gear];
  note(next, `You lock ${gear.name} in the strongroom.`);
  return ok(next, `${gear.name} is stored.`);
}

export function takeGear(state: GameState, gearId: string): Result {
  const gear = (state.vault ?? []).find((item) => item.id === gearId);
  if (!gear) return fail(state, "That is not in the strongroom.");
  if (carriedWeight(state) + gearWeight(gear) > carryCap(state)) return fail(state, "The bag cannot take the weight.");
  const next = structuredClone(state);
  next.vault = (next.vault ?? []).filter((item) => item.id !== gearId);
  next.pack = [...(next.pack ?? []), gear];
  note(next, `You take ${gear.name} from the strongroom.`);
  return ok(next, `${gear.name} is in the bag.`);
}

export function storePotion(state: GameState, potionId: PotionId): Result {
  if ((state.brew?.[potionId] ?? 0) < 1) return fail(state, "That drink is not in the bag.");
  if (storedWeight(state) + 1 > vaultCap(state)) return fail(state, "The strongroom cannot take the weight.");
  const next = structuredClone(state);
  next.brew[potionId] -= 1;
  next.cellar[potionId] += 1;
  const name = POTIONS[potionId].name;
  note(next, `You store ${name}.`);
  return ok(next, `${name} is in the strongroom.`);
}

export function takePotion(state: GameState, potionId: PotionId): Result {
  if ((state.cellar?.[potionId] ?? 0) < 1) return fail(state, "That drink is not stored.");
  if (carriedWeight(state) + 1 > carryCap(state)) return fail(state, "The bag cannot take the weight.");
  const next = structuredClone(state);
  next.cellar[potionId] -= 1;
  next.brew[potionId] += 1;
  const name = POTIONS[potionId].name;
  note(next, `You take ${name} from the strongroom.`);
  return ok(next, `${name} is in the bag.`);
}
