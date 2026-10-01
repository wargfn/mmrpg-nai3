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

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   Open `.env` and set your configuration variables (see [Environment Configuration](#environment-configuration) below).

4. **Start the development server:**
   ```bash
   npm run dev
   ```

5. **Open in your browser:**
   Navigate to `http://localhost:3000` (or the local URL provided in your terminal).

---

## Environment Configuration

The application uses environment variables for server configuration, server-side API proxying, and AI model selection.

### Environment Variables
- `PORT`: The port number on which the Express server listens (default: `3000`).
- `GEMINI_API_KEY`: Your Google Gemini API key used by the backend AI Narrator engine.
- `NARRATOR_MODEL`: The Gemini model identifier to use for AI narration (default: `gemini-2.5-flash`).

### Development Setup
For local development, create a `.env` file in the root directory:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
NARRATOR_MODEL=gemini-2.5-flash
```
When running `npm run dev`, Vite and the Express server automatically load these variables.

### Production Setup
For production deployments (e.g., Node.js servers, Docker, or cloud platforms like Cloud Run):
1. Set the environment variables directly in your hosting platform's environment settings or secrets manager:
   - `PORT=3000` (or your hosting provider's assigned port)
   - `GEMINI_API_KEY=your_production_gemini_api_key`
   - `NARRATOR_MODEL=gemini-2.5-flash`
2. Build the application:
   ```bash
   npm run build
   ```
3. Start the production server:
   ```bash
   npm start
   ```

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
