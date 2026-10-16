import { LEVY_TARGET, SEASON_DAYS } from "./content";
import { wagonsOpen } from "./expedition";
import { realmLaborTitle, realmProjectOpen } from "./progress";
import { peopleTrouble } from "./realm";
import type { GameState, Tutorial, TutorialStep } from "./types";
import { LEVY_GOODS, TUTORIAL_STEPS } from "./types";

export type CoachTab = "realm" | "hold" | "compact" | "road";

export const COACH: Record<
  TutorialStep,
  { text: string; tab: CoachTab; target: string; needsTab: boolean }
> = {
  wagons: {
    text: "The wagons are an expedition. Twelve dawns to fill them with grain, iron, and salt. Then they leave, and the realm goes on.",
    tab: "realm",
    target: "wagons",
    needsTab: false,
  },
  seal: {
    text: "Sealing the day is how time moves. The hold grows its good at dawn.",
    tab: "realm",
    target: "seal",
    needsTab: false,
  },
  neighbors: {
    text: "The shared stores feed your sworn neighbors. They are on the Neighbors tab.",
    tab: "compact",
    target: "stores",
    needsTab: true,
  },
  "wagons-take": {
    text: "What you send to the wagons is gone. You cannot take it back.",
    tab: "compact",
    target: "wagons-take",
    needsTab: true,
  },
  caravan: {
    text: "The caravan is how you trade. It lives on the Road tab.",
    tab: "road",
    target: "caravan",
    needsTab: true,
  },
  anger: {
    text: "Vell's anger is one danger. He is a frost dragon.",
    tab: "realm",
    target: "anger",
    needsTab: false,
  },
  creatures: {
    text: "Other creatures on the road offer choices that last.",
    tab: "realm",
    target: "creatures",
    needsTab: true,
  },
  people: {
    text: "Your people need food and firewood, and a law. Those controls are on the Hold tab.",
    tab: "hold",
    target: "people",
    needsTab: true,
  },
};

const STEP_SET = new Set<string>(TUTORIAL_STEPS);

export function legalTutorial(value: unknown): Tutorial {
  if (!value || typeof value !== "object") return { step: null };
  const step = (value as { step?: unknown }).step;
  if (step === null) return { step: null };
  if (typeof step === "string" && STEP_SET.has(step)) return { step: step as TutorialStep };
  return { step: null };
}

export function nextTutorialStep(step: TutorialStep | null): TutorialStep | null {
  if (!step) return null;
  const index = TUTORIAL_STEPS.indexOf(step);
  if (index < 0 || index >= TUTORIAL_STEPS.length - 1) return null;
  return TUTORIAL_STEPS[index + 1];
}

export function dawnsLeft(day: number, due = SEASON_DAYS): number {
  return Math.max(0, due + 1 - day);
}

export function dawnsLeftLabel(day: number, due = SEASON_DAYS): string {
  if (day > due) return "Late on the road";
  const left = dawnsLeft(day, due);
  if (left === 1) return "1 dawn left";
  return `${left} dawns left`;
}

/** One plain next action. Updates as visitors, the caravan, and the people change. */
export function whatNow(state: GameState): string {
  if (state.omen || state.crossing) return "Answer the visitor.";
  if (state.petition) return "Answer the people.";
  const traded = state.chronicle.some(
    (entry) => entry.day === state.day && (entry.text.includes("bought") || entry.text.includes("sold")),
  );
  const called = wagonsOpen(state);
  const wagonsFull = LEVY_GOODS.every((good) => state.compact.levy[good] >= LEVY_TARGET[good]);
  if (called && state.caravan && !traded && !wagonsFull) return "The expedition is out. Trade on the Road tab, then feed the wagons.";
  if (called && !wagonsFull) return "Feed the wagons. They are under Realm, then Status.";
  if (peopleTrouble(state)) return "See to your people on the Hold tab.";
  if (!called && state.expedition?.nextCallDay) {
    const day = state.expedition.nextCallDay;
    const labor = state.campaign?.realmLabor;
    if (labor) return `The wagons return on day ${day}. ${realmLaborTitle(labor)} is still rising. Seal the day.`;
    if (realmProjectOpen(state)) return `The wagons return on day ${day}. Raise a project under Hold. It keeps working after the wagons leave.`;
    return `The wagons return on day ${day}. Seal the day and grow the hold.`;
  }
  return "Seal the day. The realm keeps growing.";
}
