# Daily Caritas Card Deck

A one-card-a-day companion to Jean Watson's Mandala Teachings deck. Pull a card, receive its teaching and Sacred Ritual, and come back in 24 hours for the next one.

## Try it

Open `index.html` in a browser. No install or build step is needed.

## How it works

- **One pull every 24 hours.** The timer starts at the moment of the pull. The current card and the countdown are saved in the browser, so reopening the page shows the same card until the time is up.
- **No repeats.** A card isn't drawn again until all 54 have come up, then the deck starts over.
- **Per device.** Pulls are remembered in that browser only.
- **Testing link.** The footer has a "Testing only: reset the 24-hour timer" link. Remove it (the `resetBtn` button and its listener in `index.html`) before launch.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | The whole app: layout, styles and logic |
| `cards-data.js` | Name, theme, brief description, teaching and ritual for each of the 54 cards |
| `cards/` | Web-sized card images, numbered to match `cards-data.js` |

The card text comes from the guidebook *Jean Watson's Mandala Teachings: Practice Rituals & Caritas Guidebook*. The "Presence" card shares the "Compassionate Presence" entry, and the guidebook's "Caritas Field" entry has no card.

## Copyright

Teachings and mandala art © Jean Watson. All rights reserved. They are not licensed for reuse.
