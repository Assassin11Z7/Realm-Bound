import { holdById, seasonOf } from "./content";
import type {
  Crossing,
  CrossingChoice,
  EdictId,
  GameState,
  HoldId,
  Lasting,
  Mark,
  Petition,
  Result,
  Settlement,
} from "./types";
import { GOODS, HOLD_IDS } from "./types";
import { worldRng } from "./world";

const HOLDS_OK = new Set<string>(HOLD_IDS);
const EDICT_SET = new Set<EdictId>(["custom", "dole", "tithe", "close-rolls", "open-rolls", "hearth-rite"]);

export const EDICTS: { id: EdictId; name: string; detail: string }[] = [
  { id: "custom", name: "Old custom", detail: "Stores fall by one each dawn. While bread and hearth last, the people stay as they are." },
  { id: "dole", name: "Bread dole", detail: "The larder empties faster. Mood rises while bread remains, and falls hard when it does not." },
  { id: "tithe", name: "Granary tithe", detail: "While the larder is above 10, one grain comes to your stash each dawn and the people like you less." },
  { id: "close-rolls", name: "Closed rolls", detail: "Mood rises. New souls do not arrive from this law." },
  { id: "open-rolls", name: "Open rolls", detail: "Souls arrive while the larder holds. Bread falls faster, and an empty larder drives people out." },
  { id: "hearth-rite", name: "Hearth rite", detail: "The hearth burns faster. Mood rises, and more so in frost." },
];

interface Effect {
  gold?: number;
  goods?: Partial<Record<(typeof GOODS)[number], number>>;
  ire?: number;
  renown?: number;
  contentment?: number;
  souls?: number;
  mood?: number;
  bread?: number;
  hearth?: number;
  allMood?: number;
  edict?: EdictId;
  target?: "home" | "weakest" | "all";
  lasting?: Lasting;
  summary: string;
}

interface ChoiceDef {
  id: string;
  label: string;
  detail: string;
  altDetail?: string;
  altIf?: string[];
  altIfPasses?: number;
  altIfHomeMoodBelow?: number;
  effect: Effect;
  alt?: Effect;
  gamble?: { stake: Effect; win: Effect; lose: Effect };
}

interface CreatureDef {
  id: string;
  creature: string;
  title: string;
  body: string;
  art: string;
  disposition: "kind" | "grim";
  requires?: (ctx: { markIds: string[]; day: number }) => boolean;
  choices: ChoiceDef[];
}

const CREATURES: CreatureDef[] = [
  {
    id: "lantern-hart",
    creature: "The lantern hart",
    title: "A light at the tree-line",
    body: "A white hart stands where the road meets the wood, a lantern caught in its antlers. It is not the antlered one, and it is not Vell. Follow it, hunt it, or let the light go on.",
    art: "/art/antler.jpg",
    disposition: "kind",
    choices: [
      {
        id: "follow",
        label: "Follow the light",
        detail: "The field paths stay lit. Your larder swells, and bread lasts longer for the rest of the game.",
        effect: {
          bread: 8,
          mood: 6,
          lasting: { breadDecay: -1, moodDawn: 1 },
          summary: "You followed the lantern hart. The larders last longer, and the people sleep easier.",
        },
      },
      {
        id: "hunt",
        label: "Hunt it",
        detail: "Three grain now. The hold thins afterward, and other creatures will smell the blood.",
        effect: {
          goods: { grain: 3 },
          mood: -8,
          lasting: { moodDawn: -1, soulDawn: -1 },
          summary: "You brought the lantern hart down. Grain came home, and souls keep slipping away.",
        },
      },
      {
        id: "spare",
        label: "Let the light go",
        detail: "No goods spent. The hart leaves a blessing, and kinder things on the road will know it.",
        effect: {
          mood: 5,
          renown: 1,
          contentment: 2,
          lasting: { moodDawn: 1 },
          summary: "You spared the lantern hart. The people rest easier, and the wood remembers the mercy.",
        },
      },
    ],
  },
  {
    id: "millwife",
    creature: "The millwife",
    title: "A woman in the race",
    body: "Someone stands in the millrace up to her knees, flour on her sleeves, and asks to be housed or fed. She is older than the mill.",
    art: "/art/nix.jpg",
    disposition: "kind",
    choices: [
      {
        id: "loaf",
        label: "Leave 2 grain",
        detail: "She blesses the yard. The hold yields one more at every dawn from now on.",
        effect: {
          goods: { grain: -2 },
          mood: 3,
          contentment: 3,
          lasting: { yield: 1 },
          summary: "The millwife took the loaf. The hold yields one more at every dawn.",
        },
      },
      {
        id: "house",
        label: "House her in the mill",
        detail: "She eats from the larder, and the yard is glad. Bread falls a little faster. Mood rises each dawn.",
        effect: {
          bread: -2,
          mood: 4,
          lasting: { breadDecay: 1, moodDawn: 2 },
          summary: "The millwife lives in the mill. She eats, and the people are glad of her.",
        },
      },
      {
        id: "send",
        label: "Send her downstream",
        detail: "She goes. A little renown, a sourer yard, and no blessing.",
        effect: {
          renown: 1,
          mood: -4,
          summary: "You sent the millwife downstream. The yard is quieter, and less kind.",
        },
      },
    ],
  },
  {
    id: "salt-saint",
    creature: "The salt saint",
    title: "Bare feet on the pans",
    body: "A saint walks the salt pans without flinching. She will bless every hearth, take a purse and leave a grudge, or hear a vow that closes your rolls.",
    art: "/art/hold-vesper.jpg",
    disposition: "kind",
    choices: [
      {
        id: "bless",
        label: "Give 2 salt",
        detail: "Every hearth is stacked higher, and winter burns slower for the rest of the game.",
        effect: {
          goods: { salt: -2 },
          target: "all",
          hearth: 6,
          mood: 3,
          lasting: { hearthDecay: -1 },
          summary: "The salt saint blessed the hearths. Cold weather eats less timber.",
        },
      },
      {
        id: "coin",
        label: "Take her coin",
        detail: "Six gold now. The people sour a little every dawn after.",
        effect: {
          gold: 6,
          mood: -5,
          lasting: { moodDawn: -1 },
          summary: "You took the salt saint's coin. The purse is heavier, and the people are not.",
        },
      },
      {
        id: "vow",
        label: "Swear the coast",
        detail: "Closed rolls become the law at your hold. Renown, and a quieter gate.",
        effect: {
          renown: 2,
          mood: 2,
          edict: "close-rolls",
          summary: "You swore to the salt saint. The rolls at your hold are closed.",
        },
      },
    ],
  },
  {
    id: "kindling-child",
    creature: "The kindling child",
    title: "A child with a coal",
    body: "A child waits at the gate with a live coal in a clay cup. The coal does not smoke. Welcome, a trade of wool, or a shut door.",
    art: "/art/hall.jpg",
    disposition: "kind",
    choices: [
      {
        id: "welcome",
        label: "Bring the coal in",
        detail: "Hearths surge, a few souls follow the warmth, and fires last longer.",
        effect: {
          hearth: 10,
          souls: 4,
          mood: 3,
          lasting: { hearthDecay: -1 },
          summary: "The kindling child came in. Hearths last longer, and a few souls with them.",
        },
      },
      {
        id: "wool",
        label: "Trade 2 wool",
        detail: "The child leaves the coal and takes the wool. Gold and a warmer mood.",
        effect: {
          goods: { wool: -2 },
          gold: 4,
          mood: 2,
          hearth: 4,
          summary: "You traded wool for the kindling child's coal. The gate is warmer.",
        },
      },
      {
        id: "shut",
        label: "Shut the door",
        detail: "The coal goes out on your step. Mood falls, and the cold remembers.",
        effect: {
          mood: -6,
          ire: 2,
          lasting: { moodDawn: -1 },
          summary: "You shut the door on the kindling child. The cold comes back a little each dawn.",
        },
      },
    ],
  },
  {
    id: "orchard-wight",
    creature: "The orchard wight",
    title: "Branches over the wall",
    body: "A wight of twigs and old blossom leans over the orchard wall. It can be grafted, robbed, or asked. It already knows what you did to the things that glow.",
    art: "/art/hold-greenmere.jpg",
    disposition: "kind",
    choices: [
      {
        id: "graft",
        label: "Graft with 1 timber",
        detail: "The hold yields one more each dawn. The wall keeps the graft.",
        effect: {
          goods: { timber: -1, grain: 1 },
          lasting: { yield: 1 },
          summary: "You grafted for the orchard wight. The hold yields one more at dawn.",
        },
      },
      {
        id: "pick",
        label: "Pick the trees bare",
        detail: "Four grain now. The people sour every dawn after.",
        effect: {
          goods: { grain: 4 },
          mood: -5,
          lasting: { moodDawn: -1 },
          summary: "You stripped the orchard wight's trees. Grain now, and a sourer hold after.",
        },
      },
      {
        id: "ask",
        label: "Ask, and take nothing",
        detail: "A modest blessing on the larder. Mercy shown earlier makes it larger.",
        altDetail: "The wight saw you spare the hart. It leans in with grain and a fuller larder.",
        altIf: ["lantern-hart:spare"],
        effect: {
          bread: 4,
          mood: 3,
          summary: "You asked the orchard wight for nothing. The larder still gained.",
        },
        alt: {
          goods: { grain: 2 },
          bread: 6,
          mood: 6,
          lasting: { moodDawn: 1 },
          summary: "The orchard wight remembered the spared hart and filled your hands.",
        },
      },
    ],
  },
  {
    id: "drowned-choir",
    creature: "The drowned choir",
    title: "Voices under the pans",
    body: "A choir sings under the salt water, mouths full of tide. Sing with them, silence them, or ask them to teach the hall a rite.",
    art: "/art/serpent.jpg",
    disposition: "kind",
    requires: ({ day }) => day >= 8,
    choices: [
      {
        id: "sing",
        label: "Sing with them",
        detail: "Every settlement's mood rises, and keeps a little of that lift.",
        altDetail: "The saint's salt is on the wind. The choir sings cleaner, and the mood lifts higher.",
        altIf: ["salt-saint:bless", "salt-saint:vow"],
        effect: {
          allMood: 6,
          renown: 1,
          lasting: { moodDawn: 1 },
          summary: "You sang with the drowned choir. The settlements are easier in themselves.",
        },
        alt: {
          allMood: 8,
          renown: 2,
          lasting: { moodDawn: 1 },
          summary: "You sang with the drowned choir under the saint's salt. The whole realm lifted.",
        },
      },
      {
        id: "silence",
        label: "Silence the water",
        detail: "Salt comes up. Mood falls, and keeps falling a little.",
        effect: {
          goods: { salt: 2 },
          mood: -6,
          renown: 2,
          lasting: { moodDawn: -1 },
          summary: "You silenced the drowned choir. Salt came up, and the people miss the song.",
        },
      },
      {
        id: "learn",
        label: "Ask for the rite",
        detail: "If the hall is in good temper, they set the hearth rite and the fires last.",
        altDetail: "The choir will not teach a sour hall. Mood slips, and no rite is given.",
        altIfHomeMoodBelow: 50,
        effect: {
          edict: "hearth-rite",
          mood: 3,
          lasting: { hearthDecay: -1 },
          summary: "The drowned choir taught the hearth rite. Fires last longer at your hold.",
        },
        alt: {
          mood: -3,
          summary: "The drowned choir refused a sour hall. No rite, and a colder mood.",
        },
      },
    ],
  },
  {
    id: "ash-shepherd",
    creature: "The ash shepherd",
    title: "A flock that is not sheep",
    body: "A shepherd comes up the ash road with people instead of sheep. They will join you, settle on a weaker hold, or be turned. The shepherd has already heard how you treat the road.",
    art: "/art/hold-ashfold.jpg",
    disposition: "kind",
    choices: [
      {
        id: "welcome",
        label: "Take them in",
        detail: "Twelve souls join your hold and the larder drops. More follow on later dawns.",
        altDetail: "The shepherd does not trust you. Only six will cross, and they come uneasy.",
        altIf: ["lantern-hart:hunt"],
        altIfPasses: 2,
        effect: {
          souls: 12,
          bread: -6,
          mood: 2,
          lasting: { soulDawn: 1 },
          summary: "The ash shepherd's people joined you. More souls arrive while you can feed them.",
        },
        alt: {
          souls: 6,
          bread: -4,
          mood: -2,
          summary: "The ash shepherd brought only six. The road has already decided what you are.",
        },
      },
      {
        id: "settle",
        label: "Settle them outward",
        detail: "The smallest sworn hold gains the people. Your own gate stays as it is.",
        effect: {
          target: "weakest",
          souls: 10,
          bread: -3,
          mood: 1,
          summary: "You settled the ash shepherd's people on a sworn hold, not your own gate.",
        },
      },
      {
        id: "turn",
        label: "Turn the flock",
        detail: "They go. Open rolls will not bring souls for the rest of the game.",
        effect: {
          mood: -5,
          renown: 1,
          lasting: { blockGrowth: true },
          summary: "You turned the ash shepherd away. The rolls will not open again.",
        },
      },
    ],
  },
  {
    id: "mirror-stag",
    creature: "The mirror stag",
    title: "A stag in still water",
    body: "Where a ditch holds still water, a stag looks out of it wearing your face. It will show a feast, a winter, or nothing, if you look away.",
    art: "/art/title-valley.jpg",
    disposition: "kind",
    requires: ({ day, markIds }) => day >= 12 || markIds.length > 0,
    choices: [
      {
        id: "feast",
        label: "Look at the feast",
        detail: "The larder jumps, and the people keep a share of that ease.",
        effect: {
          bread: 6,
          mood: 4,
          lasting: { moodDawn: 1 },
          summary: "The mirror stag showed a feast. The larder and the mood both kept it.",
        },
      },
      {
        id: "winter",
        label: "Look at the winter",
        detail: "Hearths are stacked, and they burn slower afterward. The vision is cold.",
        effect: {
          hearth: 8,
          mood: -2,
          lasting: { hearthDecay: -1 },
          summary: "The mirror stag showed the winter. Hearths last longer, and the mood knows why.",
        },
      },
      {
        id: "away",
        label: "Look away",
        detail: "Renown for the nerve. The stag keeps the rest of the vision.",
        effect: {
          renown: 1,
          summary: "You looked away from the mirror stag. The vision stayed in the ditch.",
        },
      },
    ],
  },
  {
    id: "toll-hag",
    creature: "The toll hag",
    title: "A hand on the ford",
    body: "A hag sits the ford and counts the living who cross. She will take gold, take a curse for a refusal, or be tricked if the bones favor you. She is not Vell. She writes to things that are.",
    art: "/art/portrait-nell.jpg",
    disposition: "grim",
    choices: [
      {
        id: "pay",
        label: "Pay 6 gold",
        detail: "She lets the ford go. Mood steadies, and stays a little steadier.",
        effect: {
          gold: -6,
          mood: 4,
          renown: 1,
          lasting: { moodDawn: 1 },
          summary: "You paid the toll hag. The ford is quiet, and the people unclench.",
        },
      },
      {
        id: "refuse",
        label: "Refuse the toll",
        detail: "Souls leave, mood drops, and the curse ticks on every dawn after.",
        effect: {
          souls: -4,
          mood: -8,
          contentment: -4,
          lasting: { moodDawn: -2 },
          summary: "You refused the toll hag. People left, and the hold keeps souring.",
        },
      },
      {
        id: "trick",
        label: "Trick her",
        detail: "Stake 2 gold. Bones 1–6 leave iron. 7–12 leave a curse that stays.",
        effect: { summary: "The toll hag waits on the bones." },
        gamble: {
          stake: { gold: -2, summary: "You staked 2 gold on the toll hag." },
          win: {
            goods: { iron: 2 },
            renown: 1,
            summary: "You tricked the toll hag. She left iron in the mud and went.",
          },
          lose: {
            mood: -6,
            lasting: { moodDawn: -1 },
            summary: "The toll hag saw the trick. The gold is gone, and the mood keeps falling.",
          },
        },
      },
    ],
  },
  {
    id: "barrow-hound",
    creature: "The barrow hound",
    title: "Something at the mounds",
    body: "A hound the size of a pony scratches at the barrow door. Feed it, kennel it at the gate, or hunt it and let the bones decide. It does not answer to the frost-wyrm.",
    art: "/art/drake-mine.jpg",
    disposition: "grim",
    choices: [
      {
        id: "feed",
        label: "Feed it 2 grain",
        detail: "It goes back into the mound. Vell's ire eases once. The people exhale.",
        effect: {
          goods: { grain: -2 },
          ire: -4,
          mood: 2,
          summary: "You fed the barrow hound. It slept, and the wyrm's ire eased.",
        },
      },
      {
        id: "kennel",
        label: "Kennel it",
        detail: "The gate is safer and a little ashamed. Mood and the wyrm both ease over time.",
        effect: {
          mood: -2,
          lasting: { moodDawn: 1, ireDawn: -1 },
          summary: "The barrow hound sleeps at your gate. Nights are safer, and the ire climbs slower.",
        },
      },
      {
        id: "hunt",
        label: "Hunt the hound",
        detail: "No stake but pride. Bones 1–6 bring it down. 7–12 bloody the yard for good.",
        effect: { summary: "The barrow hound is already running." },
        gamble: {
          stake: { summary: "You loosed the hunt." },
          win: {
            renown: 2,
            mood: 2,
            ire: -3,
            summary: "You brought the barrow hound down. The mounds are quiet.",
          },
          lose: {
            mood: -8,
            ire: 4,
            lasting: { moodDawn: -1 },
            summary: "The barrow hound bloodied the yard. The hurt stays in the mood.",
          },
        },
      },
    ],
  },
  {
    id: "frost-nun",
    creature: "The frost nun",
    title: "A nun collecting names",
    body: "A woman in frost-white walks the rolls and asks for one name. She is not Vell. Give her someone, buy her off with salt, or bar the cloister door and live with a faster winter.",
    art: "/art/wyrm-wing.jpg",
    disposition: "grim",
    choices: [
      {
        id: "name",
        label: "Give a name",
        detail: "Two souls leave the rolls. Vell's ire falls now, and climbs slower afterward.",
        effect: {
          souls: -2,
          ire: -8,
          renown: 1,
          lasting: { ireDawn: -1 },
          summary: "You gave the frost nun a name. Two souls are gone, and the wyrm wakes slower.",
        },
      },
      {
        id: "salt",
        label: "Offer 3 salt",
        detail: "She leaves the rolls alone. Ire eases once. The people prefer this.",
        effect: {
          goods: { salt: -3 },
          mood: 4,
          ire: -4,
          summary: "You salted the frost nun's cup. The rolls stayed whole.",
        },
      },
      {
        id: "bar",
        label: "Bar the door",
        detail: "Renown for the refusal. Ire climbs faster forever, and the coin wyrm will hear of it.",
        effect: {
          ire: 4,
          mood: -3,
          renown: 2,
          lasting: { ireDawn: 1 },
          summary: "You barred the frost nun. The cold climbs faster, and worse things know your name.",
        },
      },
    ],
  },
  {
    id: "root-colossus",
    creature: "The root colossus",
    title: "The road has grown shut",
    body: "A body of roots stands where the timber road should be. It wants a gift of wood, a parley, or a fire. It will still be in the ground tomorrow either way.",
    art: "/art/hold-ashfold.jpg",
    disposition: "grim",
    choices: [
      {
        id: "timber",
        label: "Give 3 timber",
        detail: "The road opens. Mood and the larder both rise.",
        effect: {
          goods: { timber: -3 },
          mood: 6,
          bread: 4,
          summary: "You fed the root colossus. The road opened, and the larder with it.",
        },
      },
      {
        id: "parley",
        label: "Parley",
        detail: "No goods spent. It lets carts through, and larders last longer afterward.",
        effect: {
          mood: 5,
          lasting: { breadDecay: -1 },
          summary: "You parleyed with the root colossus. Larders last longer from this day.",
        },
      },
      {
        id: "burn",
        label: "Burn a way through",
        detail: "Timber comes out of the fire. Souls and mood pay, and the fear stays.",
        effect: {
          goods: { timber: 3 },
          mood: -10,
          ire: 5,
          souls: -2,
          lasting: { moodDawn: -1, hearthDecay: -1 },
          summary: "You burned the root colossus. Timber and a lasting fear, and hearths that eat less.",
        },
      },
    ],
  },
  {
    id: "coin-wyrm",
    creature: "The coin wyrm",
    title: "A wyrm the size of a dog",
    body: "A small wyrm has nested in the toll chest. It is not Vell. It wants a bribe, a driving-off, or a job counting coin. If you barred the frost nun, it already knows.",
    art: "/art/wyrm-speaks.jpg",
    disposition: "grim",
    choices: [
      {
        id: "bribe",
        label: "Bribe it",
        detail: "Spend 8 gold. Two iron comes back, and it leaves the chest.",
        altDetail: "The nun made the price 12 gold. Two iron still comes back.",
        altIf: ["frost-nun:bar"],
        effect: {
          gold: -8,
          goods: { iron: 2 },
          mood: 1,
          summary: "You bribed the coin wyrm out of the chest. Iron was under the coins.",
        },
        alt: {
          gold: -12,
          goods: { iron: 2 },
          mood: -2,
          summary: "You paid the coin wyrm the nun's price. The iron was not worth the talk.",
        },
      },
      {
        id: "drive",
        label: "Drive it off",
        detail: "Renown. A little ire. It is a thief, not the mountain.",
        effect: {
          renown: 2,
          ire: 2,
          mood: 1,
          summary: "You drove the coin wyrm off. The chest is yours, and the mountain noticed the noise.",
        },
      },
      {
        id: "employ",
        label: "Employ it",
        detail: "Spend 4 gold. One gold finds you every dawn after. The people dislike the claws.",
        effect: {
          gold: -4,
          mood: -2,
          lasting: { goldDawn: 1 },
          summary: "The coin wyrm counts your toll. One gold finds you each dawn.",
        },
      },
    ],
  },
  {
    id: "banner-widow",
    creature: "The banner widow",
    title: "A seat she says is hers",
    body: "A widow in campaign black asks for a seat in the hall. Give it and the rolls close. Pension her. Or refuse, and live with the story she tells.",
    art: "/art/caravan.jpg",
    disposition: "grim",
    requires: ({ day }) => day >= 10,
    choices: [
      {
        id: "seat",
        label: "Give her the seat",
        detail: "Closed rolls at your hold. Mood rises. A few restless souls are sent off.",
        effect: {
          edict: "close-rolls",
          mood: 6,
          souls: -2,
          lasting: { moodDawn: 1 },
          summary: "The banner widow sits the hall. The rolls are closed, and the mood holds.",
        },
      },
      {
        id: "pension",
        label: "Pension her, 5 gold",
        detail: "She goes home paid. Mood jumps, and stays a little higher.",
        effect: {
          gold: -5,
          mood: 8,
          lasting: { moodDawn: 1 },
          summary: "You pensioned the banner widow. The hall is lighter without her seat.",
        },
      },
      {
        id: "refuse",
        label: "Refuse the seat",
        detail: "Renown. The mood falls and keeps a grudge.",
        effect: {
          mood: -8,
          renown: 2,
          lasting: { moodDawn: -1 },
          summary: "You refused the banner widow. She is telling it in every yard.",
        },
      },
    ],
  },
  {
    id: "pit-cricket",
    creature: "The pit cricket",
    title: "A cricket in the granary",
    body: "A cricket the size of a fist sings in the granary wall. Listen, and it names the weak store. Feed it. Or crush it and close the rolls on the noise.",
    art: "/art/hold-highbarrow.jpg",
    disposition: "grim",
    choices: [
      {
        id: "listen",
        label: "Listen",
        detail: "It names a leaking store. Bread and mood both recover a little, and the ease stays.",
        effect: {
          bread: 4,
          mood: 4,
          lasting: { moodDawn: 1 },
          summary: "You listened to the pit cricket. A leaking store was mended, and the mood kept it.",
        },
      },
      {
        id: "feed",
        label: "Feed it 1 grain",
        detail: "Larders last longer afterward. A small, strange friendship.",
        effect: {
          goods: { grain: -1 },
          renown: 1,
          lasting: { breadDecay: -1 },
          summary: "You fed the pit cricket. Larders last longer, and it still sings.",
        },
      },
      {
        id: "crush",
        label: "Crush it",
        detail: "Closed rolls, fewer souls, a worse mood. The granary goes quiet forever.",
        effect: {
          edict: "close-rolls",
          souls: -4,
          mood: -4,
          lasting: { blockGrowth: true },
          summary: "You crushed the pit cricket and closed the rolls. Growth is done.",
        },
      },
    ],
  },
  {
    id: "starveling",
    creature: "The starveling saint",
    title: "A saint with an empty bowl",
    body: "A saint sits the oven line with a bowl that shows the bottom. Share the grain, preach over the hunger, or drive the line off and take what they hid.",
    art: "/art/hold-woolford.jpg",
    disposition: "grim",
    choices: [
      {
        id: "share",
        label: "Share 3 grain",
        detail: "Every settlement eases. Two souls join you. Larders last longer after.",
        effect: {
          goods: { grain: -3 },
          souls: 2,
          allMood: 5,
          lasting: { breadDecay: -1 },
          summary: "You shared with the starveling saint. The realm eats slower, and two souls stayed.",
        },
      },
      {
        id: "sermon",
        label: "Preach over the bowl",
        detail: "Renown for the voice. The line does not eat, and the mood knows it.",
        effect: {
          renown: 2,
          mood: -3,
          summary: "You preached to the starveling saint's line. They left hungry, and you are talked about.",
        },
      },
      {
        id: "drive",
        label: "Drive them off",
        detail: "Three gold they had hidden. Souls leave. Open rolls will not refill them.",
        effect: {
          gold: 3,
          souls: -6,
          mood: -8,
          lasting: { moodDawn: -1, blockGrowth: true },
          summary: "You drove the starveling saint's line off. The coin stayed. The growth did not.",
        },
      },
    ],
  },
];

const PETITIONS: {
  id: string;
  title: string;
  body: (place: string) => string;
  choices: ChoiceDef[];
}[] = [
  {
    id: "oven-line",
    title: "The oven line",
    body: (place) => `The ovens at ${place} have a line before dawn. They want the stores opened, a promise, or the road.`,
    choices: [
      {
        id: "open",
        label: "Open 2 grain",
        detail: "Mood jumps and keeps a little of the kindness each dawn.",
        effect: {
          goods: { grain: -2 },
          mood: 10,
          lasting: { moodDawn: 1 },
          summary: "You opened the stores for the oven line. They will remember the bread.",
        },
      },
      {
        id: "promise",
        label: "Promise the morrow",
        detail: "No grain spent. Mood falls, and falls again each dawn until you live it down.",
        effect: {
          mood: -4,
          lasting: { moodDawn: -1 },
          summary: "You promised the oven line tomorrow. The promise is already sour.",
        },
      },
      {
        id: "walk",
        label: "Let them walk",
        detail: "Eight souls leave. Those who stay are calmer. The rolls will not open again.",
        effect: {
          souls: -8,
          mood: 4,
          lasting: { blockGrowth: true },
          summary: "You let the oven line walk. The hold is thinner, and it will not grow back.",
        },
      },
    ],
  },
  {
    id: "firewood",
    title: "Who keeps the fire",
    body: (place) => `${place} is arguing over the woodpile. Take it, buy it, or share the axes.`,
    choices: [
      {
        id: "take",
        label: "Take the pile",
        detail: "Two timber come to you. The hearth drops. The mood drops harder.",
        effect: {
          goods: { timber: 2 },
          hearth: -4,
          mood: -6,
          summary: "You took the woodpile. Timber in the stash, and a colder, angrier yard.",
        },
      },
      {
        id: "buy",
        label: "Buy the wood, 4 gold",
        detail: "The hearth is stacked and the argument ends.",
        effect: {
          gold: -4,
          hearth: 6,
          mood: 4,
          summary: "You bought the woodpile back for the people. The hearth is stacked.",
        },
      },
      {
        id: "axes",
        label: "Share the axes",
        detail: "No coin. Hearths last longer from this day, and the yard agrees.",
        effect: {
          mood: 3,
          lasting: { hearthDecay: -1 },
          summary: "You shared the axes. Hearths last longer, and the argument is over.",
        },
      },
    ],
  },
  {
    id: "column",
    title: "A column at the gate",
    body: (place) => `Unsworn people are sitting outside ${place}. Take them in, send them to a weaker hold, or bar the gate for good.`,
    choices: [
      {
        id: "take",
        label: "Take them in",
        detail: "Eight souls, a thinner larder, and more arrivals on later dawns.",
        effect: {
          souls: 8,
          bread: -4,
          mood: -1,
          lasting: { soulDawn: 1 },
          summary: "You took the column in. Souls keep arriving while the larder holds.",
        },
      },
      {
        id: "out",
        label: "Settle them outward",
        detail: "The smallest sworn hold receives them.",
        effect: {
          target: "weakest",
          souls: 10,
          bread: -3,
          mood: 1,
          summary: "You sent the column to a sworn hold. Your own gate did not swell.",
        },
      },
      {
        id: "bar",
        label: "Bar the gate",
        detail: "Mood rises once. Open rolls will bring no one for the rest of the game.",
        effect: {
          mood: 4,
          renown: 1,
          lasting: { blockGrowth: true },
          summary: "You barred the column. The rolls will not open for the rest of the game.",
        },
      },
    ],
  },
  {
    id: "three-voices",
    title: "Three voices in the hall",
    body: (place) => `Bakers, the reeve, and the hearth-wardens each want the law at ${place}. One of them will still be the law tomorrow.`,
    choices: [
      {
        id: "bakers",
        label: "The bakers",
        detail: "Bread dole becomes the law. Mood rises with the announcement.",
        effect: {
          edict: "dole",
          mood: 5,
          summary: "The bakers have the law. The bread dole stands until you change it.",
        },
      },
      {
        id: "reeve",
        label: "The reeve",
        detail: "Granary tithe becomes the law. Grain will come in, and the people will feel it.",
        effect: {
          edict: "tithe",
          mood: -3,
          summary: "The reeve has the law. The granary tithe will pay grain while the larder is deep.",
        },
      },
      {
        id: "hearth",
        label: "The hearth-wardens",
        detail: "Hearth rite becomes the law.",
        effect: {
          edict: "hearth-rite",
          mood: 3,
          summary: "The hearth-wardens have the law. Fires will be fed first.",
        },
      },
    ],
  },
  {
    id: "watch-law",
    title: "The watch's law",
    body: (place) => `The watch at ${place} wants the rolls settled before the next frost. Close them, open them, or leave the old custom and say so out loud.`,
    choices: [
      {
        id: "close",
        label: "Close the rolls",
        detail: "Closed rolls, and a calmer yard.",
        effect: {
          edict: "close-rolls",
          mood: 5,
          summary: "You closed the rolls for the watch. The yard is orderly.",
        },
      },
      {
        id: "open",
        label: "Open the rolls",
        detail: "Open rolls. Souls come now, and more will follow while you can feed them.",
        effect: {
          edict: "open-rolls",
          souls: 4,
          mood: -2,
          summary: "You opened the rolls. Souls will come while the larder holds.",
        },
      },
      {
        id: "custom",
        label: "Keep the old custom",
        detail: "The law stays as it is. A little renown for refusing the watch's script.",
        effect: {
          renown: 1,
          mood: 1,
          summary: "You kept the old custom in front of the watch. They will not ask in these words again.",
        },
      },
    ],
  },
];

interface RealmMods {
  yield: number;
  goldDawn: number;
  moodDawn: number;
  breadDecay: number;
  hearthDecay: number;
  soulDawn: number;
  ireDawn: number;
  blockGrowth: boolean;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function note(state: GameState, text: string) {
  state.chronicle.push({ id: state.nextId++, day: state.day, text });
  if (state.chronicle.length > 60) state.chronicle.splice(0, state.chronicle.length - 60);
}

function fail(state: GameState, error: string): Result {
  return { state, error };
}

function ok(state: GameState, message?: string, fate?: Result["fate"]): Result {
  return { state, message, fate };
}

function creatureById(id: string): CreatureDef | undefined {
  return CREATURES.find((item) => item.id === id);
}

function petitionById(id: string) {
  return PETITIONS.find((item) => item.id === id);
}

export function creatureCount(): number {
  return CREATURES.length;
}

export function blankSettlements(home: HoldId, sworn: HoldId[], day: number): Settlement[] {
  const spent = Math.max(0, Math.min(18, day - 1));
  const make = (holdId: HoldId, index: number, isHome: boolean): Settlement => ({
    holdId,
    souls: isHome ? 86 : 44 + index * 7,
    mood: isHome ? 72 : 64,
    bread: Math.max(6, (isHome ? 24 : 20) - spent),
    hearth: Math.max(6, (isHome ? 24 : 20) - spent),
    edict: "custom",
  });
  const seen = new Set<HoldId>();
  const list: Settlement[] = [];
  if (HOLDS_OK.has(home)) {
    list.push(make(home, 0, true));
    seen.add(home);
  }
  sworn.forEach((holdId, index) => {
    if (!HOLDS_OK.has(holdId) || seen.has(holdId)) return;
    seen.add(holdId);
    list.push(make(holdId, index, false));
  });
  return list;
}

function markIdsOf(marks: Mark[]): string[] {
  return marks.map((mark) => mark.id);
}

function passCount(marks: Mark[]): number {
  return marks.filter((mark) => mark.id.endsWith(":pass")).length;
}

function bodyFor(def: CreatureDef, ids: string[], passes: number): string {
  let body = def.body;
  if (def.id === "ash-shepherd" && ids.includes("lantern-hart:hunt")) body += " It has already smelled the hart's blood.";
  else if (def.id === "ash-shepherd" && passes >= 2) body += " It has heard that you let the road go by.";
  if (def.id === "coin-wyrm" && ids.includes("frost-nun:bar")) body += " The nun told it you bar the cold, so the price is worse.";
  if (def.id === "orchard-wight" && ids.includes("lantern-hart:spare")) body += " The branches lean in. It saw you spare the hart.";
  return body;
}

function useAlt(choice: ChoiceDef, ids: string[], passes: number, homeMood: number): boolean {
  if (!choice.alt) return false;
  if (choice.altIf?.some((id) => ids.includes(id))) return true;
  if (choice.altIfPasses != null && passes >= choice.altIfPasses) return true;
  if (choice.altIfHomeMoodBelow != null && homeMood < choice.altIfHomeMoodBelow) return true;
  return false;
}

function buildCrossing(def: CreatureDef, marks: Mark[], homeMood: number): Crossing {
  const ids = markIdsOf(marks);
  const passes = passCount(marks);
  return {
    id: def.id,
    creature: def.creature,
    title: def.title,
    body: bodyFor(def, ids, passes),
    art: def.art,
    disposition: def.disposition,
    choices: def.choices.map((choice) => {
      const alt = useAlt(choice, ids, passes, homeMood);
      return {
        id: choice.id,
        label: choice.label,
        detail: alt && choice.altDetail ? choice.altDetail : choice.detail,
        branch: alt ? "alt" : "base",
        gamble: Boolean(choice.gamble),
      } satisfies CrossingChoice;
    }),
  };
}

function buildPetition(id: string, place: HoldId, marks: Mark[], homeMood: number): Petition | null {
  const spec = petitionById(id);
  if (!spec) return null;
  const name = holdById(place).name;
  const ids = markIdsOf(marks);
  const passes = passCount(marks);
  return {
    id: spec.id,
    holdId: place,
    title: spec.title,
    body: spec.body(name),
    choices: spec.choices.map((choice) => {
      const alt = useAlt(choice, ids, passes, homeMood);
      return {
        id: choice.id,
        label: choice.label,
        detail: alt && choice.altDetail ? choice.altDetail : choice.detail,
        branch: alt ? "alt" : "base",
        gamble: Boolean(choice.gamble),
      };
    }),
  };
}

function homeMoodOf(state: GameState): number {
  return state.settlements?.find((item) => item.holdId === state.player.holdId)?.mood ?? 70;
}

function targetsOf(state: GameState, target: Effect["target"]): Settlement[] {
  const all = state.settlements ?? [];
  if (target === "all") return all;
  if (target === "weakest") {
    const others = all.filter((item) => item.holdId !== state.player.holdId);
    const pool = others.length > 0 ? others : all;
    const weakest = [...pool].sort((a, b) => a.souls - b.souls)[0];
    return weakest ? [weakest] : [];
  }
  const home = all.find((item) => item.holdId === state.player.holdId);
  return home ? [home] : [];
}

function afford(state: GameState, effect: Effect): string | null {
  if ((effect.gold ?? 0) < 0 && state.player.gold < -(effect.gold ?? 0)) return `You need ${-(effect.gold ?? 0)} gold.`;
  if (effect.goods) {
    for (const good of GOODS) {
      const qty = effect.goods[good] ?? 0;
      if (qty < 0 && state.player.stash[good] < -qty) return `You don't have ${-qty} ${good}.`;
    }
  }
  return null;
}

function applyEffect(state: GameState, effect: Effect) {
  if (effect.gold) state.player.gold = Math.max(0, state.player.gold + effect.gold);
  if (effect.goods) {
    for (const good of GOODS) {
      const qty = effect.goods[good] ?? 0;
      if (qty) state.player.stash[good] = Math.max(0, state.player.stash[good] + qty);
    }
  }
  if (effect.ire) state.wyrm.ire = clamp(state.wyrm.ire + effect.ire, 0, 100);
  if (effect.renown) state.player.renown = Math.max(0, state.player.renown + effect.renown);
  if (effect.contentment) {
    for (const member of state.compact.members) {
      if (!member.inCompact) continue;
      member.contentment = clamp(member.contentment + (effect.contentment ?? 0), 0, 100);
    }
  }
  if (effect.allMood) {
    for (const settlement of state.settlements ?? []) settlement.mood = clamp(settlement.mood + effect.allMood, 0, 100);
  }
  for (const settlement of targetsOf(state, effect.target)) {
    if (effect.souls) settlement.souls = clamp(settlement.souls + effect.souls, 8, 400);
    if (effect.mood) settlement.mood = clamp(settlement.mood + effect.mood, 0, 100);
    if (effect.bread) settlement.bread = clamp(settlement.bread + effect.bread, 0, 40);
    if (effect.hearth) settlement.hearth = clamp(settlement.hearth + effect.hearth, 0, 40);
    if (effect.edict && EDICT_SET.has(effect.edict)) settlement.edict = effect.edict;
  }
}

function pushMark(state: GameState, id: string, creature: string, choice: string, effect: Effect) {
  if (!Array.isArray(state.marks)) state.marks = [];
  if (state.marks.some((mark) => mark.id === id)) return;
  state.marks.push({
    id,
    creature,
    choice,
    day: state.day,
    summary: effect.summary,
    lasting: legalLasting(effect.lasting),
  });
  if (state.marks.length > 40) state.marks.splice(0, state.marks.length - 40);
}

function rememberPass(state: GameState, crossing: Crossing) {
  pushMark(state, `${crossing.id}:pass`, crossing.creature, "pass", {
    summary: `${crossing.creature} went by with no bargain. The road will remember the refusal.`,
  });
}

export function rememberStance(state: GameState, id: string, creature: string, summary: string) {
  pushMark(state, id, creature, "road", { summary });
}

function sumMods(marks: Mark[] | undefined): RealmMods {
  const totals: RealmMods = {
    yield: 0,
    goldDawn: 0,
    moodDawn: 0,
    breadDecay: 0,
    hearthDecay: 0,
    soulDawn: 0,
    ireDawn: 0,
    blockGrowth: false,
  };
  for (const mark of marks ?? []) {
    const lasting = mark.lasting ?? {};
    totals.yield += lasting.yield ?? 0;
    totals.goldDawn += lasting.goldDawn ?? 0;
    totals.moodDawn += lasting.moodDawn ?? 0;
    totals.breadDecay += lasting.breadDecay ?? 0;
    totals.hearthDecay += lasting.hearthDecay ?? 0;
    totals.soulDawn += lasting.soulDawn ?? 0;
    totals.ireDawn += lasting.ireDawn ?? 0;
    if (lasting.blockGrowth) totals.blockGrowth = true;
  }
  return {
    yield: clamp(totals.yield, -1, 3),
    goldDawn: clamp(totals.goldDawn, -2, 3),
    moodDawn: clamp(totals.moodDawn, -4, 4),
    breadDecay: clamp(totals.breadDecay, -1, 3),
    hearthDecay: clamp(totals.hearthDecay, -1, 3),
    soulDawn: clamp(totals.soulDawn, -3, 3),
    ireDawn: clamp(totals.ireDawn, -2, 2),
    blockGrowth: totals.blockGrowth,
  };
}

export function realmYieldBonus(state: GameState): number {
  return sumMods(state.marks).yield;
}

export function realmIreDelta(state: GameState): number {
  return sumMods(state.marks).ireDawn;
}

export function modsBlurb(state: GameState): string | null {
  const mods = sumMods(state.marks);
  const bits: string[] = [];
  if (mods.yield > 0) bits.push("the hold yields more");
  if (mods.yield < 0) bits.push("the hold yields less");
  if (mods.goldDawn > 0) bits.push("coin finds you at dawn");
  if (mods.goldDawn < 0) bits.push("coin leaves at dawn");
  if (mods.moodDawn > 0) bits.push("the people rest easier");
  if (mods.moodDawn < 0) bits.push("the people sour a little each dawn");
  if (mods.breadDecay < 0) bits.push("larders last longer");
  if (mods.breadDecay > 0) bits.push("larders empty faster");
  if (mods.hearthDecay < 0) bits.push("hearths last longer");
  if (mods.hearthDecay > 0) bits.push("hearths burn faster");
  if (mods.soulDawn > 0) bits.push("souls still arrive");
  if (mods.soulDawn < 0) bits.push("souls slip away");
  if (mods.ireDawn < 0) bits.push("the wyrm stirs more slowly");
  if (mods.ireDawn > 0) bits.push("the wyrm stirs faster");
  if (mods.blockGrowth) bits.push("the rolls will not open");
  if (bits.length === 0) return null;
  return `Still in force: ${bits.join(", ")}.`;
}

export function peopleTrouble(state: GameState): boolean {
  if (state.petition) return true;
  return (state.settlements ?? []).some((item) => item.mood < 40 || item.bread <= 3 || item.hearth <= 3);
}

export function offerCrossing(state: GameState): string | null {
  if (state.omen || state.crossing || state.day < 3) return null;
  const seen = state.creaturesSeen ?? [];
  const rng = worldRng((state.seed ^ Math.imul(state.day, 0x6c078965)) >>> 0);
  if (seen.length > 0) {
    const gate = state.day <= 12 ? 0.72 : 0.86;
    if (rng() >= gate) return null;
  }
  const ids = markIdsOf(state.marks ?? []);
  const pool = CREATURES.filter((def) => !seen.includes(def.id) && (!def.requires || def.requires({ markIds: ids, day: state.day })));
  if (pool.length === 0) return null;
  const picked = pool[Math.floor(rng() * pool.length) % pool.length];
  state.crossing = buildCrossing(picked, state.marks ?? [], homeMoodOf(state));
  state.creaturesSeen = [...seen, picked.id];
  return `${picked.creature} is on the road.`;
}

export function clearUnansweredCrossing(state: GameState): string | null {
  if (!state.crossing) return null;
  const crossing = state.crossing;
  state.crossing = null;
  rememberPass(state, crossing);
  return `${crossing.creature} left when the day was sealed. No bargain was struck, and that will be remembered.`;
}

export function dismissCrossing(state: GameState): Result {
  if (!state.crossing) return fail(state, "Nothing is on the road.");
  const next = structuredClone(state);
  const crossing = next.crossing;
  if (!crossing) return fail(state, "Nothing is on the road.");
  next.crossing = null;
  if (!next.creaturesSeen.includes(crossing.id)) next.creaturesSeen.push(crossing.id);
  rememberPass(next, crossing);
  const line = `${crossing.creature} went by. You made no bargain, and the realm will remember it.`;
  note(next, line);
  return ok(next, line);
}

function finishChoice(state: GameState, id: string, creature: string, choiceId: string, effect: Effect, fate?: Result["fate"]): Result {
  const next = structuredClone(state);
  applyEffect(next, effect);
  pushMark(next, id, creature, choiceId, effect);
  if (next.campaign) next.campaign.xp += 2;
  next.crossing = null;
  note(next, effect.summary);
  return ok(next, effect.summary, fate);
}

export function chooseCrossing(state: GameState, choiceId: string): Result {
  const crossing = state.crossing;
  if (!crossing) return fail(state, "Nothing is on the road.");
  const shown = crossing.choices.find((choice) => choice.id === choiceId);
  const def = creatureById(crossing.id);
  const spec = def?.choices.find((choice) => choice.id === choiceId);
  if (!shown || !def || !spec) return fail(state, "That is not a choice they offer.");
  if (spec.gamble) {
    const price = afford(state, spec.gamble.stake);
    if (price) return fail(state, price);
    const roll = worldRng((state.seed ^ Math.imul(state.day + 17, 0x45d9f3b) ^ choiceId.length) >>> 0)();
    const won = roll < 0.5;
    const face = 1 + Math.floor(roll * 12);
    const outcome = won ? spec.gamble.win : spec.gamble.lose;
    const next = structuredClone(state);
    applyEffect(next, spec.gamble.stake);
    applyEffect(next, outcome);
    pushMark(next, `${crossing.id}:${choiceId}`, crossing.creature, choiceId, outcome);
    if (next.campaign) next.campaign.xp += 2;
    next.crossing = null;
    note(next, outcome.summary);
    return ok(next, outcome.summary, { face, won });
  }
  const effect = shown.branch === "alt" && spec.alt ? spec.alt : spec.effect;
  const price = afford(state, effect);
  if (price) return fail(state, price);
  return finishChoice(state, `${crossing.id}:${choiceId}`, crossing.creature, choiceId, effect);
}

export function offerPetition(state: GameState): string | null {
  if (state.petition || state.omen || state.crossing || state.day < 9) return null;
  const low = (state.settlements ?? []).some((item) => item.bread <= 6 || item.hearth <= 4 || item.mood <= 35);
  const first = (state.petitionsSeen ?? []).length === 0;
  const scheduled = state.day >= 14 && state.day % 5 === 0;
  if (!low && !first && !scheduled) return null;
  const pool = PETITIONS.filter((item) => !(state.petitionsSeen ?? []).includes(item.id));
  if (pool.length === 0) return null;
  const rng = worldRng((state.seed ^ Math.imul(state.day, 0x27d4eb2d)) >>> 0);
  if (!low && !first && rng() >= 0.8) return null;
  const picked = pool[Math.floor(rng() * pool.length) % pool.length];
  const petition = buildPetition(picked.id, state.player.holdId, state.marks ?? [], homeMoodOf(state));
  if (!petition) return null;
  state.petition = petition;
  state.petitionsSeen = [...(state.petitionsSeen ?? []), picked.id];
  return `${petition.title} is before the hall.`;
}

export function choosePetition(state: GameState, choiceId: string): Result {
  const petition = state.petition;
  if (!petition) return fail(state, "The hall is not waiting on you.");
  const shown = petition.choices.find((choice) => choice.id === choiceId);
  const spec = petitionById(petition.id)?.choices.find((choice) => choice.id === choiceId);
  if (!shown || !spec) return fail(state, "That is not a choice the hall will hear.");
  const effect = shown.branch === "alt" && spec.alt ? spec.alt : spec.effect;
  const price = afford(state, effect);
  if (price) return fail(state, price);
  const next = structuredClone(state);
  applyEffect(next, effect);
  pushMark(next, `petition:${petition.id}:${choiceId}`, petition.title, choiceId, effect);
  if (next.campaign) next.campaign.xp += 2;
  next.petition = null;
  note(next, effect.summary);
  return ok(next, effect.summary);
}

export function tickSettlements(state: GameState): string[] {
  if (!state.settlements || state.settlements.length === 0) return [];
  const mods = sumMods(state.marks);
  const season = seasonOf(state.day);
  const winter = season === "frost" || season === "deepwinter";
  const lines: string[] = [];
  for (const settlement of state.settlements) {
    let breadDecay = Math.max(0, 1 + mods.breadDecay);
    let hearthDecay = Math.max(0, 1 + mods.hearthDecay + (winter ? 1 : 0));
    if (settlement.edict === "dole" || settlement.edict === "open-rolls") breadDecay += 1;
    if (settlement.edict === "hearth-rite") hearthDecay += 1;
    const beforeBread = settlement.bread;
    const beforeHearth = settlement.hearth;
    const beforeMood = settlement.mood;
    settlement.bread = Math.max(0, settlement.bread - breadDecay);
    settlement.hearth = Math.max(0, settlement.hearth - hearthDecay);
    if (settlement.edict === "tithe" && settlement.bread > 10) {
      settlement.bread -= 1;
      state.player.stash.grain += 1;
      lines.push(`${holdById(settlement.holdId).name} pays the tithe: 1 grain comes to your stash.`);
    }
    let mood = 0;
    let souls = 0;
    if (settlement.holdId === state.player.holdId) {
      mood += mods.moodDawn;
      souls += mods.soulDawn;
    }
    if (settlement.edict === "dole") mood += settlement.bread > 0 ? 2 : -4;
    if (settlement.edict === "close-rolls") mood += 1;
    if (settlement.edict === "tithe") mood -= 1;
    if (settlement.edict === "hearth-rite" && settlement.hearth > 0) mood += winter ? 3 : 2;
    if (settlement.edict === "open-rolls") {
      mood -= 1;
      if (settlement.bread > 0 && !mods.blockGrowth) souls += 3;
      if (settlement.bread === 0) souls -= 4;
    } else if (settlement.bread === 0) souls -= 2;
    if (settlement.hearth === 0) mood -= 2;
    settlement.mood = clamp(settlement.mood + mood, 0, 100);
    settlement.souls = clamp(settlement.souls + souls, 8, 400);
    const name = holdById(settlement.holdId).name;
    if (beforeBread > 0 && settlement.bread === 0) lines.push(`${name} has no bread in the larder.`);
    if (beforeHearth > 0 && settlement.hearth === 0) lines.push(`${name}'s hearths are cold.`);
    if (beforeMood >= 30 && settlement.mood < 30) lines.push(`${name} is close to breaking.`);
  }
  if (mods.goldDawn) {
    state.player.gold = Math.max(0, state.player.gold + mods.goldDawn);
    lines.push(mods.goldDawn > 0 ? `${mods.goldDawn} gold finds you at dawn.` : `${-mods.goldDawn} gold leaves at dawn.`);
  }
  return lines;
}

export function setEdict(state: GameState, holdId: HoldId, edict: EdictId): Result {
  if (!EDICT_SET.has(edict)) return fail(state, "That is not a law.");
  const found = state.settlements?.find((item) => item.holdId === holdId);
  if (!found) return fail(state, "That settlement is not under your banner.");
  if (found.edict === edict) return fail(state, "That law already stands.");
  const next = structuredClone(state);
  const settlement = next.settlements.find((item) => item.holdId === holdId);
  if (!settlement) return fail(state, "That settlement is not under your banner.");
  settlement.edict = edict;
  const name = EDICTS.find((item) => item.id === edict)?.name ?? "The law";
  const line = `${name} is the law at ${holdById(holdId).name}. It holds until you change it.`;
  note(next, line);
  return ok(next, line);
}

export function stockSettlement(state: GameState, holdId: HoldId, kind: "bread" | "hearth", qty: number): Result {
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) return fail(state, "Send between 1 and 20.");
  const found = state.settlements?.find((item) => item.holdId === holdId);
  if (!found) return fail(state, "That settlement is not under your banner.");
  if (kind === "bread" && found.bread >= 40) return fail(state, "The larder is full.");
  if (kind === "hearth" && found.hearth >= 40) return fail(state, "The hearth is stacked to the roof.");
  const good = kind === "bread" ? "grain" : "timber";
  if (state.player.stash[good] < qty) return fail(state, `You don't have ${qty} ${good}.`);
  const next = structuredClone(state);
  next.player.stash[good] -= qty;
  const settlement = next.settlements.find((item) => item.holdId === holdId);
  if (!settlement) return fail(state, "That settlement is not under your banner.");
  const gain = qty * 4;
  if (kind === "bread") settlement.bread = Math.min(40, settlement.bread + gain);
  else settlement.hearth = Math.min(40, settlement.hearth + gain);
  const place = holdById(holdId).name;
  const line = kind === "bread" ? `You sent ${qty} grain to ${place}. The larder can last longer.` : `You sent ${qty} timber to ${place}. The hearths are fed.`;
  note(next, line);
  return ok(next, line);
}

export function forceCrossing(state: GameState, id: string): GameState {
  const def = creatureById(id);
  if (!def) return state;
  const next = structuredClone(state);
  next.omen = null;
  next.crossing = buildCrossing(def, next.marks ?? [], homeMoodOf(next));
  if (!next.creaturesSeen.includes(id)) next.creaturesSeen.push(id);
  return next;
}

export function forcePetition(state: GameState, id: string): GameState {
  const next = structuredClone(state);
  const petition = buildPetition(id, next.player.holdId, next.marks ?? [], homeMoodOf(next));
  if (!petition) return state;
  next.petition = petition;
  if (!next.petitionsSeen.includes(id)) next.petitionsSeen.push(id);
  return next;
}

function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return clamp(Math.trunc(value), min, max);
}

function legalLasting(value: Lasting | undefined): Lasting {
  if (!value || typeof value !== "object") return {};
  const num = (n: number | undefined) => (typeof n === "number" && Number.isFinite(n) ? clamp(Math.trunc(n), -3, 3) : undefined);
  const lasting: Lasting = {};
  const yieldN = num(value.yield);
  const gold = num(value.goldDawn);
  const mood = num(value.moodDawn);
  const bread = num(value.breadDecay);
  const hearth = num(value.hearthDecay);
  const souls = num(value.soulDawn);
  const ire = num(value.ireDawn);
  if (yieldN) lasting.yield = yieldN;
  if (gold) lasting.goldDawn = gold;
  if (mood) lasting.moodDawn = mood;
  if (bread) lasting.breadDecay = bread;
  if (hearth) lasting.hearthDecay = hearth;
  if (souls) lasting.soulDawn = souls;
  if (ire) lasting.ireDawn = ire;
  if (value.blockGrowth) lasting.blockGrowth = true;
  return lasting;
}

function legalMark(value: Mark): Mark | null {
  if (!value || typeof value.id !== "string" || typeof value.summary !== "string") return null;
  return {
    id: value.id.slice(0, 80),
    creature: typeof value.creature === "string" ? value.creature.slice(0, 80) : "The road",
    choice: typeof value.choice === "string" ? value.choice.slice(0, 40) : "choice",
    day: clampInt(value.day, 1, 999, 1),
    summary: value.summary.slice(0, 280),
    lasting: legalLasting(value.lasting),
  };
}

function legalChoiceList(raw: CrossingChoice[] | undefined, specs: ChoiceDef[]): CrossingChoice[] {
  if (!Array.isArray(raw)) return [];
  const choices: CrossingChoice[] = [];
  for (const choice of raw) {
    const spec = specs.find((item) => item.id === choice?.id);
    if (!spec) continue;
    const branch = choice.branch === "alt" && spec.alt ? "alt" : "base";
    choices.push({
      id: spec.id,
      label: spec.label,
      detail: branch === "alt" && spec.altDetail ? spec.altDetail : spec.detail,
      branch,
      gamble: Boolean(spec.gamble),
    });
  }
  return choices;
}

function legalCrossing(value: Crossing | null | undefined): Crossing | null {
  if (!value || typeof value !== "object" || typeof value.id !== "string") return null;
  const def = creatureById(value.id);
  if (!def) return null;
  const choices = legalChoiceList(value.choices, def.choices);
  if (choices.length === 0) return null;
  return {
    id: def.id,
    creature: def.creature,
    title: def.title,
    body: typeof value.body === "string" ? value.body.slice(0, 600) : def.body,
    art: def.art,
    disposition: def.disposition,
    choices,
  };
}

function legalPetition(value: Petition | null | undefined, home: HoldId): Petition | null {
  if (!value || typeof value !== "object" || typeof value.id !== "string") return null;
  const spec = petitionById(value.id);
  if (!spec) return null;
  const choices = legalChoiceList(value.choices, spec.choices);
  if (choices.length === 0) return null;
  const holdId = value.holdId && HOLDS_OK.has(value.holdId) ? value.holdId : home;
  return {
    id: spec.id,
    holdId,
    title: spec.title,
    body: typeof value.body === "string" ? value.body.slice(0, 400) : spec.body(holdById(holdId).name),
    choices,
  };
}

export function normalizeRealm(state: GameState) {
  const home = state.player?.holdId && HOLDS_OK.has(state.player.holdId) ? state.player.holdId : "greenmere";
  const sworn = (state.compact?.members ?? []).map((member) => member.holdId).filter((id): id is HoldId => HOLDS_OK.has(id));
  const saved = Array.isArray(state.settlements) ? state.settlements.filter((item) => item && HOLDS_OK.has(item.holdId)) : [];
  if (saved.length === 0) state.settlements = blankSettlements(home, sworn, state.day || 1);
  else {
    state.settlements = saved.map((item) => ({
      holdId: item.holdId,
      souls: clampInt(item.souls, 8, 400, 40),
      mood: clampInt(item.mood, 0, 100, 60),
      bread: clampInt(item.bread, 0, 40, 12),
      hearth: clampInt(item.hearth, 0, 40, 12),
      edict: EDICT_SET.has(item.edict) ? item.edict : "custom",
    }));
    if (!state.settlements.some((item) => item.holdId === home)) {
      state.settlements.unshift(blankSettlements(home, [], state.day || 1)[0]);
    }
  }
  state.marks = Array.isArray(state.marks) ? state.marks.map((item) => legalMark(item)).filter((item): item is Mark => Boolean(item)) : [];
  state.creaturesSeen = Array.isArray(state.creaturesSeen) ? state.creaturesSeen.filter((item) => typeof item === "string").slice(0, 40) : [];
  state.petitionsSeen = Array.isArray(state.petitionsSeen) ? state.petitionsSeen.filter((item) => typeof item === "string").slice(0, 20) : [];
  state.crossing = legalCrossing(state.crossing);
  state.petition = legalPetition(state.petition, home);
}
