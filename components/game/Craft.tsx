"use client";

import { Button } from "@/components/ui/button";
import { POTIONS, RECIPES, craft } from "@/lib/game/craft";
import type { GameState, Result } from "@/lib/game/types";

const BENCH_NAME: Record<string, string> = {
  forge: "Forge",
  still: "Still",
  loom: "Loom",
};

export function CraftBench({ state, act }: { state: GameState; act: (result: Result) => void }) {
  return (
    <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
      <p className="font-display text-xl">Benches</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        The forge smiths, the still brews, and the loom weaves. A bench only works once you have raised it.
      </p>
      <ul className="mt-3 flex flex-col gap-3">
        {RECIPES.map((recipe) => {
          const have = state.campaign?.buildings[recipe.building] ?? 0;
          const ready = have >= recipe.level;
          const title = recipe.potion ? POTIONS[recipe.potion].name : recipe.gear;
          return (
            <li key={recipe.id} className="rounded-xl bg-background px-3 py-3">
              <p className="text-sm font-medium">
                {title}
                <span className="ml-2 text-[10px] tracking-wide text-muted-foreground uppercase">
                  {BENCH_NAME[recipe.building]} {recipe.level}
                </span>
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{recipe.detail}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {recipe.qty} {recipe.good} · {recipe.gold}g
                {ready ? "" : ` · your ${BENCH_NAME[recipe.building].toLowerCase()} is level ${have}`}
              </p>
              <Button type="button" variant="outline" className="mt-2 h-10" disabled={!ready} onClick={() => act(craft(state, recipe.id))}>
                {ready ? "Craft" : "Raise the bench"}
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
