# Marvel Multiverse Narrator AI

An immersive AI-powered tabletop roleplaying companion and digital game table for the **Marvel Multiverse Role-Playing Game**, featuring interactive character sheets, real-time campaign chat, d616 dice rolling, tactical combat tracking, expandable Karma Point management, and rulebook references.

## Features

- **Character Roster & Active Hero Card**: Manage pre-configured Marvel heroes (Spider-Man, Wolverine, Captain Marvel, etc.) and custom characters with editable attributes, health, focus, ranks, and conditions.
- **Dedicated Karma Tracker & Spending**: Expandable/collapsible Karma Point system with interactive star ratings, quick adjusters, and tactical spend options (dice rerolls, outcome adjustments, and tactical edge).
- **d616 Dice Roller**: Deterministic Marvel dice engine (two standard 6s + one special Marvel 6) with Edges, Troubles, Target Numbers, and automated success/failure determination (Fantastic vs Marvel 1).
- **Tactical Combat Tracker**: Initiative tracking, turn ordering, health/focus management, and villain encounter management.
- **AI Game Master Narrator**: Interactive chat assistant for roleplay, campaign generation, rules rulings, and dynamic storytelling.
- **Rulebook Reference Index**: Quick lookup for core mechanics, combat actions, conditions, and character creation guidelines.

---

## Local Installation & Quickstart

To run Marvel Multiverse Narrator AI locally on your machine, follow these steps:

### Prerequisites
- **Node.js** (v18+ recommended)
- **npm** (comes with Node.js)

### Steps

1. **Clone or download the repository:**
   ```bash
   git clone <repository-url>
   cd mmrpg-nai2
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm run dev
   ```

4. **Open in your browser:**
   Navigate to `http://localhost:3000` (or the local URL provided in your terminal).

---

## Building for Production

To build the application for production:
```bash
npm run build
```

To run the production server:
```bash
npm start
```

## License
MIT License.
