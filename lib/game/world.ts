import { HOLDS, WYRM_NAME, holdById } from "./content";
import type { Cutscene, GameState, Gear, GearSlot, HoldId, Quest, QuestKind, Rarity } from "./types";

export function worldRng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NAMES: Record<GearSlot, string[]> = {
  hand: ["Road knife", "Salt hook", "Ash staff", "Relic pry"],
  cloak: ["Wool cloak", "Ford cloak", "Snow mantle"],
  charm: ["Crow bead", "Bell shard", "Saint nail", "Hart tooth"],
};

export function rollGear(seed: number, day: number, miles: number): Gear {
  const roll = worldRng((seed ^ Math.imul(day + 3, 0x9e3779b1) ^ Math.imul(miles + 5, 0x85ebca6b)) >>> 0);
  const rarityRoll = roll();
  const rarity: Rarity = rarityRoll > 0.93 ? "relic" : rarityRoll > 0.66 ? "uncanny" : "common";
  const slots: GearSlot[] = ["hand", "cloak", "charm"];
  const slot = slots[Math.floor(roll() * slots.length)];
  const names = NAMES[slot];
  const name = names[Math.floor(roll() * names.length)];
  const luck = rarity === "relic" ? 3 : rarity === "uncanny" ? 2 : 1;
  const line =
    rarity === "relic"
      ? "Old enough that Vell might know its name."
      : rarity === "uncanny"
        ? "It remembers a road you have not walked."
        : "Ordinary, and still warm from someone else's hand.";
  return {
    id: `gear-${day}-${miles}-${slot}`,
    name,
    slot,
    rarity,
    luck,
    line,
  };
}

export function starterCloak(): Gear {
  return {
    id: "gear-start-cloak",
    name: "Travel cloak",
    slot: "cloak",
    rarity: "common",
    luck: 1,
    line: "The cloak you walked in with. It keeps the first rain off.",
  };
}

export function luckOf(state: GameState): number {
  let luck = 0;
  const worn = state.worn ?? {};
  for (const id of Object.values(worn)) {
    if (!id) continue;
    const gear = (state.pack ?? []).find((item) => item.id === id);
    if (gear) luck += gear.luck;
  }
  return luck;
}

export function openingQuests(seed: number, home: HoldId): Quest[] {
  const others = HOLDS.map((hold) => hold.id).filter((id) => id !== home);
  const roll = worldRng(seed ^ 0x51ed);
  const visit = others[Math.floor(roll() * others.length)];
  const goods = ["grain", "iron", "salt"] as const;
  const good = goods[Math.floor(roll() * goods.length)];
  const pay = (base: number) => base + Math.floor(roll() * 6);
  const place = holdById(visit);
  return [
    {
      id: "visit",
      title: `Walk to ${place.name}`,
      giver: "The road",
      detail: `Set your boots in ${place.name}. The map is not the walk.`,
      kind: "visit",
      target: visit,
      need: 1,
      progress: 0,
      status: "open",
      reward: pay(8),
    },
    {
      id: "pledge",
      title: `Pledge ${good}`,
      giver: "The levy",
      detail: `Four ${good}, from your own stores, onto the road.`,
      kind: "pledge",
      target: good,
      need: 4,
      progress: 0,
      status: "open",
      reward: pay(6),
    },
    {
      id: "loot",
      title: "Bring something back",
      giver: "The ditch",
      detail: "Walk until the road leaves a found thing in your pack.",
      kind: "loot",
      target: "any",
      need: 1,
      progress: 0,
      status: "open",
      reward: pay(5),
    },
    {
      id: "tribute",
      title: "Quiet Vell",
      giver: WYRM_NAME,
      detail: "Lay any tribute. Iron, salt, or a relic.",
      kind: "tribute",
      target: "any",
      need: 1,
      progress: 0,
      status: "open",
      reward: pay(7),
    },
  ];
}

export function bumpQuest(state: GameState, kind: QuestKind, target: string, amount: number) {
  for (const quest of state.quests ?? []) {
    if (quest.status !== "open" || quest.kind !== kind) continue;
    if (quest.target !== "any" && quest.target !== target) continue;
    quest.progress = Math.min(quest.need, quest.progress + amount);
    if (quest.progress >= quest.need) quest.status = "ready";
  }
}

export function openingScene(name: string, holdName: string): Cutscene {
  return {
    id: "opening",
    index: 0,
    beats: [
      {
        speaker: "The Westmark",
        line: `${name} raises a banner at ${holdName}. The road north is a debt, not a story.`,
        art: "/art/title-valley.jpg",
      },
      {
        speaker: WYRM_NAME,
        line: "Twelve dawns. Feed the wagons, or I come down that road myself.",
        art: "/art/wyrm-vell.jpg",
      },
      {
        speaker: name,
        line: "Then we walk. The holds are uneven, and the pack is still light.",
        art: "/art/hall.jpg",
      },
    ],
  };
}

export type RoadFind = {
  kind: "cache" | "merchant" | "shadow" | "kin";
  gold: number;
  ire: number;
  gear: Gear | null;
  line: string;
  scene: Cutscene;
};

export function roadFind(seed: number, day: number, miles: number, dest: HoldId, luck: number): RoadFind {
  const roll = worldRng((seed ^ Math.imul(day + 11, 0xc2b2ae35) ^ Math.imul(miles + 2, 0x27d4eb2d)) >>> 0);
  const tilted = Math.min(0.99, Math.max(0, roll() - luck * 0.04));
  const kind: RoadFind["kind"] = tilted < 0.3 ? "cache" : tilted < 0.56 ? "merchant" : tilted < 0.8 ? "shadow" : "kin";
  const place = holdById(dest).name;
  const goldRoll = 2 + Math.floor(roll() * (4 + luck));
  if (kind === "cache") {
    const gear = rollGear(seed, day, miles);
    return {
      kind,
      gold: 0,
      ire: 0,
      gear,
      line: `The ditch outside ${place} kept ${gear.name}.`,
      scene: {
        id: `road-${miles}`,
        index: 0,
        beats: [
          { speaker: "The road", line: `Between gates, the mud gives something up.`, art: "/art/caravan.jpg" },
          { speaker: gear.name, line: gear.line, art: rarityArt(gear.rarity) },
        ],
      },
    };
  }
  if (kind === "merchant") {
    return {
      kind,
      gold: goldRoll,
      ire: 0,
      gear: null,
      line: `A walker pays ${goldRoll} gold for news of ${place}.`,
      scene: {
        id: `road-${miles}`,
        index: 0,
        beats: [
          { speaker: "A walker", line: `I will pay for a true word about ${place}.`, art: "/art/caravan.jpg" },
          { speaker: "The road", line: `${goldRoll} gold changes hands. The walker does not give a name.`, art: "/art/good-relics.jpg" },
        ],
      },
    };
  }
  if (kind === "shadow") {
    const ire = luck >= 3 ? -4 : 3;
    return {
      kind,
      gold: 0,
      ire,
      gear: null,
      line: ire < 0 ? `A wing passes over and does not stoop. ${WYRM_NAME} looks away.` : `A wing shadow crosses the track. ${WYRM_NAME} notices.`,
      scene: {
        id: `road-${miles}`,
        index: 0,
        beats: [
          { speaker: WYRM_NAME, line: ire < 0 ? "Not today." : "I see the track you took.", art: "/art/wyrm-wing.jpg" },
          { speaker: "The road", line: ire < 0 ? "The snow goes quiet." : "The gold eye stays open a little longer.", art: "/art/wyrm-vell.jpg" },
        ],
      },
    };
  }
  return {
    kind,
    gold: 1 + Math.floor(roll() * 3),
    ire: -1,
    gear: null,
    line: `Someone bound for ${place} shares a fire and a little coin.`,
    scene: {
      id: `road-${miles}`,
      index: 0,
      beats: [
        { speaker: "A traveler", line: `The compact's banner is known on this stretch.`, art: "/art/portrait-torin.jpg" },
        { speaker: "The road", line: "You leave the fire with warmer hands and a coin you did not earn.", art: "/art/hall.jpg" },
      ],
    },
  };
}

function rarityArt(rarity: Rarity): string {
  if (rarity === "relic") return "/art/good-relics.jpg";
  if (rarity === "uncanny") return "/art/wyrm-speaks.jpg";
  return "/art/good-wool.jpg";
}

export function rewardScene(title: string, gold: number): Cutscene {
  return {
    id: `reward-${title}`,
    index: 0,
    beats: [
      { speaker: "A finished task", line: `${title}. The road pays ${gold} gold, and not all of it was promised.`, art: "/art/good-relics.jpg" },
    ],
  };
}
