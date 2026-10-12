"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CHARGE_COLORS,
  DIVISION_LABEL,
  FACTIONS,
  FIELD_COLORS,
  HOLDS,
  LEVY_TARGET,
  SIGIL_LABEL,
  defaultCompactName,
  factionById,
  holdById,
  pickOathbound,
  suggestedTitle,
} from "@/lib/game/content";
import type { Banner, Division, FactionId, HoldId, NewGameSetup, SigilId, Title } from "@/lib/game/types";
import { DIVISIONS, SIGILS, TITLES } from "@/lib/game/types";
import { BannerMark } from "./marks";

const STEPS = ["Name", "Faction", "Hold", "Banner"] as const;

function validPersonName(value: string) {
  return /^[A-Za-z][A-Za-z' -]{1,17}$/.test(value.trim());
}

export function CreateSeason({
  onBegin,
  onBack,
}: {
  onBegin: (setup: NewGameSetup) => void;
  onBack: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [title, setTitle] = useState<Title>("Lady");
  const [factionId, setFactionId] = useState<FactionId>("crown");
  const [holdId, setHoldId] = useState<HoldId>("greenmere");
  const [banner, setBanner] = useState<Banner>(factionById("crown").banner);
  const [bannerTouched, setBannerTouched] = useState(false);
  const [compactName, setCompactName] = useState("The Greenmere Compact");
  const [compactTouched, setCompactTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oathbound = useMemo(() => pickOathbound(holdId).map((id) => holdById(id)), [holdId]);

  function chooseFaction(id: FactionId) {
    setFactionId(id);
    setTitle(suggestedTitle(id));
    if (!bannerTouched) setBanner(factionById(id).banner);
  }

  function chooseHold(id: HoldId) {
    setHoldId(id);
    if (!compactTouched) setCompactName(defaultCompactName(name, id));
  }

  function paint(next: Banner) {
    setBannerTouched(true);
    setBanner(next);
  }

  function goNext() {
    if (step === 0 && !validPersonName(name)) {
      setError("Use 2–18 letters. Apostrophes and hyphens are welcome.");
      return;
    }
    if (step === 3 && compactName.trim().length < 3) {
      setError("Give the compact a name of at least 3 characters.");
      return;
    }
    setError(null);
    if (step < 3) setStep(step + 1);
    else {
      onBegin({
        name: name.trim(),
        title,
        factionId,
        holdId,
        banner,
        compactName: compactName.trim(),
      });
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center justify-between px-4 pt-4 pb-2">
        <button type="button" className="text-sm text-muted-foreground" onClick={step === 0 ? onBack : () => setStep(step - 1)}>
          {step === 0 ? "Back" : "Previous"}
        </button>
        <p className="text-xs tracking-[0.18em] text-muted-foreground uppercase">
          {STEPS[step]} · {step + 1}/4
        </p>
        <BannerMark banner={banner} className="h-10 w-8" title="Your banner" />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <h2 className="font-display text-3xl leading-tight">What are you called?</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                The Westmark will know you by this name and a title. The land you take can disagree with the faction you swear to.
              </p>
            </div>
            <label className="flex flex-col gap-2 text-sm">
              Name
              <Input
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  if (!compactTouched) setCompactName(defaultCompactName(event.target.value, holdId));
                }}
                placeholder="Iseult"
                maxLength={18}
                autoComplete="off"
                className="h-11 bg-card text-base"
              />
            </label>
            <div className="flex flex-wrap gap-2">
              {TITLES.map((item) => (
                <button
                  key={item}
                  type="button"
                  aria-pressed={title === item}
                  onClick={() => setTitle(item)}
                  className={`min-h-11 rounded-full px-4 text-sm ring-1 ${title === item ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl leading-tight">Whose oath?</h2>
            <p className="text-sm text-muted-foreground">Each faction bends the season in one direction. Pick the pressure you want.</p>
            {FACTIONS.map((faction) => {
              const selected = faction.id === factionId;
              return (
                <button
                  key={faction.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseFaction(faction.id)}
                  className={`rounded-2xl p-4 text-left ring-1 ${selected ? "bg-accent ring-gold" : "bg-card ring-foreground/10"}`}
                >
                  <span className="font-display text-xl">{faction.name}</span>
                  <span className="mt-1 block text-sm italic text-muted-foreground">{faction.motto}</span>
                  <span className="mt-2 block text-sm leading-relaxed">{faction.bonus}</span>
                </button>
              );
            })}
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-3xl leading-tight">Where do you plant it?</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Greenmere is the clearest first hold: you can feed the levy&apos;s grain yourself. Woolford and Vesper must trade for almost everything. Each land keeps a creature of its own.
            </p>
            {HOLDS.map((hold) => {
              const selected = hold.id === holdId;
              return (
                <button
                  key={hold.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => chooseHold(hold.id)}
                  className={`overflow-hidden rounded-2xl text-left ring-1 ${selected ? "bg-accent ring-gold" : "bg-card ring-foreground/10"}`}
                >
                  <img src={`/art/hold-${hold.id}.jpg`} alt="" className="h-24 w-full object-cover" />
                  <span className="block p-4">
                    <span className="flex items-baseline justify-between gap-3">
                      <span className="font-display text-xl">{hold.name}</span>
                      <span className="text-xs text-muted-foreground">{hold.region}</span>
                    </span>
                    <span className="mt-1 block text-sm">
                      Grows {hold.produces}. Hungers for {hold.needs.join(" and ")}.
                    </span>
                    <span className="mt-2 block text-sm leading-relaxed text-[#3d4a62]">{hold.myth}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <BannerMark banner={banner} className="h-28 w-24" title="Banner preview" />
              <div>
                <h2 className="font-display text-3xl leading-tight">Paint the banner</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  {title} {name.trim() || "of the Westmark"} of {holdById(holdId).name}
                </p>
              </div>
            </div>
            <Swatches
              label="Field"
              colors={FIELD_COLORS}
              selected={banner.field}
              onPick={(hex) => paint({ ...banner, field: hex })}
            />
            <Swatches
              label="Charge"
              colors={CHARGE_COLORS}
              selected={banner.charge}
              onPick={(hex) => paint({ ...banner, charge: hex })}
            />
            <div>
              <p className="mb-2 text-sm">Symbol</p>
              <div className="flex flex-wrap gap-2">
                {SIGILS.map((sigil) => (
                  <button
                    key={sigil}
                    type="button"
                    aria-pressed={banner.sigil === sigil}
                    onClick={() => paint({ ...banner, sigil: sigil as SigilId })}
                    className={`min-h-11 rounded-full px-3 text-sm ring-1 ${banner.sigil === sigil ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border"}`}
                  >
                    {SIGIL_LABEL[sigil]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm">Pattern</p>
              <div className="flex flex-wrap gap-2">
                {DIVISIONS.map((division) => (
                  <button
                    key={division}
                    type="button"
                    aria-pressed={banner.division === division}
                    onClick={() => paint({ ...banner, division: division as Division })}
                    className={`min-h-11 rounded-full px-3 text-sm ring-1 ${banner.division === division ? "bg-primary text-primary-foreground ring-primary" : "bg-card ring-border"}`}
                  >
                    {DIVISION_LABEL[division]}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex flex-col gap-2 text-sm">
              Compact name
              <Input
                value={compactName}
                maxLength={28}
                onChange={(event) => {
                  setCompactTouched(true);
                  setCompactName(event.target.value);
                }}
                className="h-11 bg-card text-base"
              />
            </label>
            <div className="rounded-2xl bg-card p-4 ring-1 ring-foreground/10">
              <p className="text-sm">
                These three will take the oath. The road wants {LEVY_TARGET.grain} grain, {LEVY_TARGET.iron} iron, and {LEVY_TARGET.salt} salt by the twelfth dusk. If the wagons have not moved, Vell comes down the road.
              </p>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {oathbound.map((hold) => (
                  <li key={hold.id}>
                    <span className="font-medium">{hold.lord}</span>
                    <span className="text-muted-foreground"> · {hold.name} · sends {hold.produces}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        {error && <p className="mt-3 text-sm text-wax">{error}</p>}
      </div>
      <div className="px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Button type="button" className="h-12 w-full text-base" onClick={goNext}>
          {step === 3 ? "Plant your banner" : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function Swatches({
  label,
  colors,
  selected,
  onPick,
}: {
  label: string;
  colors: readonly { id: string; hex: string; name: string }[];
  selected: string;
  onPick: (hex: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-sm">{label}</p>
      <div className="flex flex-wrap gap-2">
        {colors.map((color) => (
          <button
            key={color.id}
            type="button"
            aria-label={color.name}
            aria-pressed={selected === color.hex}
            onClick={() => onPick(color.hex)}
            className={`size-11 rounded-full ring-2 ring-offset-2 ring-offset-background ${selected === color.hex ? "ring-ink" : "ring-transparent"}`}
            style={{ background: color.hex }}
          />
        ))}
      </div>
    </div>
  );
}
