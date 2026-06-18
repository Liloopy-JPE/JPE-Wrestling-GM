# JPE Wrestling GM

**Retro 1992 fishtank-style wrestling management simulator.**  
Single-file HTML game. Built for desktop and mobile.

![JPE Wrestling GM](https://via.placeholder.com/800x300?text=JPE+Wrestling+GM+Screenshot)

## How to Play

1. Open `index.html` directly in any modern browser (Chrome, Firefox, Edge, etc.)
2. The game saves automatically to your browser's localStorage
3. Works great on desktop and can be installed as a PWA on Android

### Navigation
- **📅 HQ** — Main dashboard, daily income, forecasts, champions
- **👥 Roster** — Full roster with search + brand filters. Tap any wrestler for profile
- **📋 Segments** — Book your show (up to 5 matches). Choose brand, add matches, simulate
- **💰 Merch** — Set merch budget, focus stars, and collect revenue + interest
- **🏆 Legacy** — Progress tracking, training types, and hard reset

## Dev Console Commands

Open your browser console (`F12` → Console tab) and type `JPE` to access powerful tools:

```js
JPE.game()              // View full game state
JPE.advanceDays(7)      // Skip forward in time
JPE.giveTP("GoldenMan", 10)     // Give training points
JPE.signFreeAgent("BlazeVortex", "Meltdown")
JPE.addMoney(50000)     // Quick cash
JPE.exportSave()        // Download backup JSON
JPE.importSave(json)    // Load from JSON string
JPE.reset()             // Hard reset everything
