import { LEVY_TARGET, SEASON_DAYS } from "./content";
import type { GameState, Tutorial, TutorialStep } from "./types";
import { LEVY_GOODS, TUTORIAL_STEPS } from "./types";

export type CoachTab = "realm" | "hold" | "compact" | "road";

export const COACH: Record<
  TutorialStep,
  { text: string; tab: CoachTab; target: string; needsTab: boolean }
> = {
  wagons: {
    text: "You have twelve dawns to fill the wagons with grain, iron, and salt.",
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

export function dawnsLeft(day: number): number {
  return Math.max(0, SEASON_DAYS + 1 - day);
}

export function dawnsLeftLabel(day: number): string {
  const left = dawnsLeft(day);
  if (left === 1) return "1 dawn left";
  return `${left} dawns left`;
}

/** One plain next action. Updates as visitors, the caravan, and the people change. */
export function whatNow(state: GameState): string {
  if (state.omen || state.crossing) return "Answer the visitor.";
  if (state.decree) return "The hall is waiting on a realm decision.";
  if (state.petition) return "Answer the people.";
  if ((state.miles ?? 0) < 1) return "Walk a hold. The road is where the gear is found.";
  const traded = state.chronicle.some(
    (entry) => entry.day === state.day && (entry.text.includes("bought") || entry.text.includes("sold")),
  );
  const wagonsFull = LEVY_GOODS.every((good) => state.compact.levy[good] >= LEVY_TARGET[good]);
  if (state.caravan && !traded && !wagonsFull) return "Trade on the Road tab. The caravan is here.";
  return "Seal the day.";
}
