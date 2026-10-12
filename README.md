# Westmark

A pocket medieval strategy game. You are a banner-lord for one season: twelve dawns to provision the northern road with grain, iron, and salt. Your neighbors share a hall, eat from it, and leave if it stays bare. A caravan buys and sells when the road is open.

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

Factions bend that loop instead of adding a combat kit:

- **Crown of the Westmark** — pledging pays gold.
- **The Stone Canticle** — a relic counts as one unit of whatever the levy lacks most.
- **The Copper Road** — the caravan buys dearer and sells cheaper.
- **The Deepwood Host** — your hold yields one extra unit each dawn.

Greenmere is the clearest first hold. Woolford and Vesper have to trade for almost every sack the road eats.

## What this slice leaves out

No accounts, no second human, no real-time combat, and no hero gacha. The season has to be interesting alone before any of that is worth building. A later multiplayer version would keep this same hall, reserve, and levy, and let other players sit in the oathbound seats.
