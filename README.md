# Cambio – Web Card Game

A fully playable multiplayer implementation of the card game Cambio, built with Node.js/Socket.IO (server) and React/Vite (client).

## Quick Start

### 1. Install & run the server
```bash
cd server
npm install
npm run dev
# Runs on http://localhost:3001
```

### 2. Install & run the client (in a separate terminal)
```bash
cd client
npm install
npm run dev
# Runs on http://localhost:5173
```

Open multiple browser tabs/windows at `http://localhost:5173` to play with yourself for testing, or share the URL with friends on the same network.

---

## Game Rules

- **2–6 players**, each dealt **4 face-down cards**
- At the start everyone **peeks at exactly 2** of their own cards
- **Goal**: lowest total card value when Cambio is called

### Card Values
| Card | Value |
|------|-------|
| A | 1 |
| 2–10 | face value |
| J | 11 |
| Q | 12 |
| K | 13 |

### On Your Turn
Draw from the **deck** or **discard pile**, then either:
- **A) Replace** one of your 4 cards (old card → discard pile)
- **B) Discard** the drawn card (activates ability if applicable)

### Card Abilities (triggered only when drawn card is discarded)
| Card | Ability |
|------|---------|
| 7 or 8 | Peek one of your own cards |
| 9 or 10 | Peek one opponent's card |
| Jack | Peek your own card, then optionally swap with an opponent |
| Queen | Peek an opponent's card, then swap any two cards on the table |
| King | Peek one of your own + one opponent's card, then swap them |

### Snapping
When any card is discarded, a **3-second snap window** opens:
- **Snap your own card**: if your card matches the discarded value → discard it (hand shrinks). Wrong snap → draw a penalty card.
- **Snap an opponent's card**: if their card matches → swap it for one of yours. Wrong snap → draw a penalty card.

### Calling Cambio
At the **start of your turn** (before drawing), call **Cambio** instead. Everyone else gets one final turn, then all cards are revealed and scored.

**Lowest total wins!**

---

## Project Structure

```
cambio/
├── server/          Node.js + TypeScript + Socket.IO
│   └── src/
│       ├── index.ts         Entry point
│       ├── types.ts         Shared types
│       ├── rooms.ts         In-memory room store
│       ├── game/
│       │   ├── deck.ts      Deck creation & shuffle
│       │   └── engine.ts    Pure game logic
│       └── socket/
│           └── handlers.ts  Socket event handlers
└── client/          React + TypeScript + Vite
    └── src/
        ├── App.tsx
        ├── socket.ts
        └── components/
            ├── Lobby.tsx
            ├── GameBoard.tsx
            ├── CardComponent.tsx
            ├── PlayerArea.tsx
            ├── ActionPanel.tsx
            ├── AbilityModal.tsx
            ├── SnapOverlay.tsx
            └── GameOver.tsx
```
