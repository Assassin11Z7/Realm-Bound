import type { GoodId, HoldId, OmenArt } from "@/lib/game/types";

export const HOLD_ART: Record<HoldId, string> = {
  highbarrow: "/art/hold-highbarrow.jpg",
  ashfold: "/art/hold-ashfold.jpg",
  greenmere: "/art/hold-greenmere.jpg",
  saltmere: "/art/hold-saltmere.jpg",
  vesper: "/art/hold-vesper.jpg",
  woolford: "/art/hold-woolford.jpg",
};

export const PORTRAIT: Record<HoldId, string> = {
  highbarrow: "/art/portrait-osric.jpg",
  saltmere: "/art/portrait-mira.jpg",
  greenmere: "/art/portrait-alda.jpg",
  ashfold: "/art/portrait-torin.jpg",
  woolford: "/art/portrait-nell.jpg",
  vesper: "/art/portrait-caldus.jpg",
};

export const GOOD_ART: Record<GoodId, string> = {
  grain: "/art/good-grain.jpg",
  timber: "/art/good-timber.jpg",
  iron: "/art/good-iron.jpg",
  salt: "/art/good-salt.jpg",
  wool: "/art/good-wool.jpg",
  relics: "/art/good-relics.jpg",
};

export const OMEN_ART: Record<OmenArt, string> = {
  drake: "/art/drake-mine.jpg",
  nix: "/art/nix.jpg",
  wing: "/art/wyrm-wing.jpg",
  antler: "/art/antler.jpg",
  serpent: "/art/serpent.jpg",
  speaks: "/art/wyrm-speaks.jpg",
  road: "/art/caravan.jpg",
  weather: "/art/title-valley.jpg",
  saint: "/art/hold-vesper.jpg",
  kin: "/art/portrait-nell.jpg",
};

export function GoodThumb({ good, className = "size-10" }: { good: GoodId; className?: string }) {
  return (
    <img
      src={GOOD_ART[good]}
      alt=""
      className={`${className} shrink-0 rounded-md object-cover ring-1 ring-black/20`}
    />
  );
}

export function Portrait({ holdId, className = "size-14" }: { holdId: HoldId; className?: string }) {
  return (
    <img
      src={PORTRAIT[holdId]}
      alt=""
      className={`${className} shrink-0 rounded-full object-cover ring-2 ring-[#e6c56e]/80`}
    />
  );
}
