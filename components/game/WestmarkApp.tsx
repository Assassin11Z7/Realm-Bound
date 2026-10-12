"use client";

import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RULES } from "@/lib/game/content";
import { createGame } from "@/lib/game/engine";
import { getGameSnapshot, getServerGameSnapshot, saveGame, subscribeGame } from "@/lib/game/storage";
import type { GameState, NewGameSetup } from "@/lib/game/types";
import { CreateSeason } from "./CreateSeason";
import { PhoneFrame, useFrame } from "./frame";
import { PlaySeason } from "./PlaySeason";

export function WestmarkApp() {
  return (
    <PhoneFrame>
      <SeasonShell />
    </PhoneFrame>
  );
}

function SeasonShell() {
  const frame = useFrame();
  const loaded = useSyncExternalStore(subscribeGame, getGameSnapshot, getServerGameSnapshot);
  const [screen, setScreen] = useState<"auto" | "title" | "create" | "play">("auto");
  const [help, setHelp] = useState(false);
  const [confirmNew, setConfirmNew] = useState(false);
  const game = loaded.state;
  const resolved = screen === "auto" ? (game ? "play" : "title") : screen;

  function begin() {
    if (game) {
      setConfirmNew(true);
      return;
    }
    setScreen("create");
  }

  function plant(setup: NewGameSetup) {
    saveGame(createGame(setup));
    setScreen("play");
  }

  function played(next: GameState) {
    saveGame(next);
  }

  function abandon() {
    saveGame(null);
    setScreen("title");
  }

  if (resolved === "create") {
    return <CreateSeason onBegin={plant} onBack={() => setScreen("title")} />;
  }

  if (resolved === "play" && game) {
    return (
      <PlaySeason
        state={game}
        onPlayed={played}
        onStepAway={() => setScreen("title")}
        onAbandon={abandon}
      />
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <img src="/art/title-valley.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-b from-[#14110e]/40 via-[#14110e]/20 to-[#14110e]/92" />
      <div className="relative flex min-h-0 flex-1 flex-col px-5 pt-8 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-end pb-6 text-center text-[#f4ead7]">
        <img src="/art/wyrm-vell.jpg" alt="" className="size-24 rounded-full object-cover ring-2 ring-[#e6c56e] shadow-[0_12px_40px_rgba(0,0,0,0.45)]" />
        <p className="mt-5 text-xs tracking-[0.28em] text-[#e6c56e] uppercase">A pocket realm</p>
        <h1 className="mt-2 font-display text-5xl leading-none">Westmark</h1>
        <p className="mt-3 max-w-xs text-base leading-relaxed text-[#f4ead7]/90">
          A frost-wyrm named Vell watches the northern road. Twelve dawns to feed the wagons, keep your kin, and turn that gold eye away.
        </p>
      </div>
      {loaded.corrupt && (
        <p className="mb-3 rounded-xl bg-primary px-3 py-2 text-sm text-primary-foreground">
          The old charter could not be read. Begin a new season.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {game && (
          <Button type="button" className="h-12 text-base" onClick={() => setScreen("play")}>
            Continue the season
          </Button>
        )}
        <Button type="button" variant={game ? "outline" : "default"} className={`h-12 text-base ${game ? "border-white/30 bg-black/30 text-[#f4ead7] hover:bg-black/50" : ""}`} onClick={begin}>
          Begin a season
        </Button>
        <Button type="button" variant="ghost" className="h-11 text-[#f4ead7] hover:bg-white/10 hover:text-[#f4ead7]" onClick={() => setHelp(true)}>
          How a season works
        </Button>
      </div>
      </div>
      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent container={frame} className="max-h-[80%] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">How a season works</DialogTitle>
            <DialogDescription>Start here, before armies, maps the size of a kingdom, or other players.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {RULES.map((rule) => (
              <div key={rule.title}>
                <p className="font-medium">{rule.title}</p>
                <p className="text-sm leading-relaxed text-muted-foreground">{rule.body}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmNew} onOpenChange={setConfirmNew}>
        <DialogContent container={frame}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">Begin again?</DialogTitle>
            <DialogDescription>Planting a new banner erases the season saved on this device.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => setConfirmNew(false)}>
              Keep it
            </Button>
            <Button
              type="button"
              className="h-11"
              onClick={() => {
                setConfirmNew(false);
                setScreen("create");
              }}
            >
              New season
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
