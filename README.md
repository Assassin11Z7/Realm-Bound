# Westmark

A pocket medieval strategy game with a frost-wyrm in it. You are a banner-lord for one season: twelve dawns to provision the northern road with grain, iron, and salt before Vell comes down out of the pale mountains. Your neighbors share a hall, eat from it, and leave if it stays bare. A caravan buys and sells when the road is open. Mine-drakes, a river nix, an antlered wood-spirit, and a slate sea-serpent come to the gate between dawns.

Westmark is the first playable slice of a larger idea: Skyrim’s uneven holds and factions, and the alliance layer of a mobile 4X like Avatar: Realms Collide, with the part those games usually skip made into the whole game — goods that move between people on purpose.

## Play

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43123](http://127.0.0.1:43123). The season is saved in this browser.

```bash
npm test
npm run lint
```

## How a season works

1. **Land is unequal.** Every hold grows one good and hungers for others. Woolford cannot feed a levy of grain, iron, and salt from its own flocks. That is why anyone trades.
2. **The hall is not the levy.** Goods in the hall can be drawn by your oathbound. Goods pledged to the levy are spent on the road.
3. **Kin stay while they eat.** Each dusk they draw, then eat. Leave a share, or send a gift. If the chests are bare night after night, they take their banners — and their yields — home.
4. **Twelve dawns.** The levy is counted when you seal the twelfth day. The caravan is in town on days 1–2, 5–6, and 9–10. Your compact is always there.
5. **Vell wakes.** The wyrm's ire climbs each dusk. Offer iron, salt, or a relic, or raise a wyrm-stake so it climbs more slowly. Leave the ire high and a shadow scorches one good in the hall. Creatures at the gate can be answered or allowed to pass. A mill adds one unit to each dawn's yield. A shrine steadies your oathbound. Keeping an oath spends three of what a neighbor hungers for.

Paintings for the valley, the map, the six holds, the kin, the goods, and the creatures live in `public/art`.

Factions bend that loop instead of adding a combat kit:

- **Crown of the Westmark** — pledging pays gold.
- **The Stone Canticle** — a relic counts as one unit of whatever the levy lacks most.
- **The Copper Road** — the caravan buys dearer and sells cheaper.
- **The Deepwood Host** — your hold yields one extra unit each dawn.

Greenmere is the clearest first hold. Woolford and Vesper have to trade for almost every sack the road eats.

## What this slice leaves out

No accounts, no second human, no real-time combat, and no hero gacha. The season has to be interesting alone before any of that is worth building. A later multiplayer version would keep this same hall, reserve, and levy, and let other players sit in the oathbound seats.
