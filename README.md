# Daily Caritas Card Deck

A one-card-a-day companion to Jean Watson's Mandala Teachings deck. Pull a card, receive its teaching, and come back in 24 hours for the next one.

## Try it

Open `index.html` in a browser. No install or build step is needed. Sharing links and reminder links only work for other people once the app is online.

## Features

- **Daily pull.** One card every 24 hours, timed from the moment of the pull. A card isn't drawn again until all 54 have come up.
- **Breathing moment.** A 10-second guided breath (in, hold, out) before the card flips. It can be skipped.
- **Brief description for everyone, full text for deck owners.** Everyone sees the card's theme and opening teaching. Entering the code printed in the deck unlocks the full teaching and the Sacred Ritual.
- **Journal.** After each pull: "What does this card ask of you today?" Entries are saved with the date and listed in the Journal tab.
- **Ritual check.** Deck owners can mark "I did the ritual"; the card gets a ✓ in the collection.
- **Collection.** All 54 cards, greyed out until received, with "N of 54 cards received".
- **Practice count.** "Day N of your practice" counts pulls in a row. A pull within 48 hours of the previous one keeps the run going, so pulling a little later each day never breaks it.
- **Send a card.** Share a link with an optional name and note. It opens that card under "This card made me think of you" without using the recipient's daily pull.
- **Daily reminder.** Downloads a repeating calendar event at the time the person chooses.
- **From my own deck.** Deck owners can look up the card they drew by hand. If they haven't pulled today, it becomes today's card.

Everything is saved in the browser on that device only. There are no accounts and no server.

## Settings

At the top of `app.js`:

| Setting | What it does |
| --- | --- |
| `ownerCodes` | The code(s) printed in the deck. Currently `CARITAS54`. Not case-sensitive. |
| `shopUrl` | Link for the "Get the deck" button. Empty hides the button. |
| `appUrl` | The app's public address. Used in shared links and calendar reminders. |

The deck code and all card text are in the public files, so the lock keeps casual visitors to the brief description but won't stop someone who reads the source.

Before launch, remove the footer's "Testing only: reset the 24-hour timer" button in `index.html` and its listener in `app.js`.

## Files

| Path | What it is |
| --- | --- |
| `index.html` | Page layout and dialogs |
| `styles.css` | Styles |
| `app.js` | App logic and settings |
| `cards-data.js` | Name, theme, brief description, teaching and ritual for each of the 54 cards |
| `cards/` | Web-sized card images |
| `thumbs/` | Small card images for the collection, journal and deck lookup |

The card text comes from the guidebook *Jean Watson's Mandala Teachings: Practice Rituals & Caritas Guidebook*. The "Presence" card shares the "Compassionate Presence" entry, and the guidebook's "Caritas Field" entry has no card.

## Copyright

Teachings and mandala art © Jean Watson. All rights reserved. They are not licensed for reuse.
