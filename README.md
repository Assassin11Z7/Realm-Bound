# Westmark

A pocket medieval strategy game. You are a banner-lord building a realm that does not end: holds, loyalty, laws, oaths, and seats. Every so often the wagons are called — twelve dawns to provision the northern road with grain, iron, and salt while Vell the frost dragon watches that pass. Meet the call or survive it, take the spoil, and the wagons leave. The valley stays. Deer, old women, saints, hounds, choirs, and smaller dragons come to the road as well, and the bargain you strike with each of them stays in force. Your settlements have people. Feed them, warm them, and set a law, or the mood breaks.

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
4. **The wagons are an expedition.** The first call is judged when you seal the twelfth day. Meet it and a relic comes off the wagons. Miss it and you can still fill them late for a few dawns, or let them go. Then they leave. Another call comes later. The caravan is in town on days 1–2, 5–6, and 9–10 of the calendar, and again as the days turn. Your compact is always there.
5. **Vell is one power.** The dragon's anger climbs each dusk. Offer iron, salt, or a relic, or raise an iron stake so it climbs more slowly. Leave the anger high and a shadow scorches one good in the hall. Fixed visitors still come on their days. On a quiet dawn a stranger may offer a safe bargain or a roll of twelve bones: faces 1–6 pay, 7–12 turn.
6. **The road remembers.** Other creatures, kind and grim, meet you between those days and after the levy. Follow, feed, hunt, house, bribe, or let them pass. The mark stays: yields, moods, firewood, growth, and later visitors all change because of it.
7. **The people are the hold.** Your hold and your oathbound settlements have people, a food store, and firewood. Leave them be, and nothing extra is spent. Free bread, a grain tax, shut gates, open gates, or feeding the fires lasts until you change it. Send grain and timber, or answer the hall when the people petition. A mill adds one unit to each dawn's yield. A shrine steadies your oathbound. Keeping an oath spends three of what a neighbor hungers for. Each season's seed is the name, hold, and faction, so two banners do not meet the same road.

Paintings for the valley, the map, the six holds, the kin, the goods, and the creatures live in `public/art`. The phone speaks scene lines through its own voice. Tap a line to hear it. Silence them from the season menu.

Walking the map is a separate action from sealing the day. The road rolls what you meet: a found thing, a paid rumor, a wing, or a fire. The bag is weighed, not capped at a dozen slots: 120 to start, more from the watch. The strongroom at the hold starts at 240 and grows when you raise it. Wear four slots, sell the rest, or store it. Coin gear raises what the caravan pays, a guard piece slows Vell's anger, learning teaches more from the walk, and luck still shifts the road. The forge, brew house, and loom craft arms, drinks, and cloaks once you have raised them. Luck, calm, coin, vigor, and haste are drunk from the bag. Tasks pay gold with a little extra that is not fixed.

The levy is a recurring pressure, not the whole game. Between calls you level up and choose a discipline, raise the hold one work at a time, and order each captain to hold the gate, march, hunt, or trade. Those orders resolve when you seal the day. The people still have to be ruled, and the creatures you already answered do not forget. The long work under Realm, then Decrees, keeps paying out as the days add up. Neighbors, then Seats, shows the founder, the oathbound, two march seats reserved for other players, shared goals, and a conflict heat that a later alliance war can use. There is no network layer yet.

Factions bend that loop instead of adding a combat kit:

- **Crown of the Westmark** — pledging pays gold.
- **The Stone Canticle** — a relic counts as one unit of whatever the levy lacks most.
- **The Copper Road** — the caravan buys dearer and sells cheaper.
- **The Deepwood Host** — your hold yields one extra unit each dawn.

Greenmere is the clearest first hold. Woolford and Vesper have to trade for almost every sack the road eats.

## What this slice leaves out

No accounts, no second human, no real-time combat, and no hero gacha. The realm has to be interesting alone before any of that is worth building. A later multiplayer version would keep this same hall, reserve, and levy, and let other players occupy the oathbound chairs and the two march seats already on the board.
