# Marvel Multiverse Narrator AI

An immersive AI-powered tabletop roleplaying companion and digital game table for the **Marvel Multiverse Role-Playing Game**, featuring interactive character sheets, real-time campaign chat, d616 dice rolling, tactical combat tracking, expandable Karma Point management, and rulebook references.

## Features

- **Character Roster & Active Hero Card**: Manage pre-configured Marvel heroes (Spider-Man, Wolverine, Captain Marvel, etc.) and custom characters with editable attributes, health, focus, ranks, and conditions.
- **Dedicated Karma Tracker & Spending**: Expandable/collapsible Karma Point system with interactive star ratings, quick adjusters, and tactical spend options (dice rerolls, outcome adjustments, and tactical edge).
- **d616 Dice Roller**: Deterministic Marvel dice engine (two standard 6s + one special Marvel 6) with Edges, Troubles, Target Numbers, and automated success/failure determination (Fantastic vs Marvel 1).
- **Tactical Combat Tracker**: Initiative tracking, turn ordering, health/focus management, and villain encounter management.
- **AI Game Master Narrator**: Interactive chat assistant for roleplay, campaign generation, rules rulings, and dynamic storytelling.
- **Rulebook Reference Index**: Quick lookup for core mechanics, combat actions, conditions, and character creation guidelines.
- **Discord Embedded Activity Support**: Run campaigns directly inside Discord voice/video channels using `@discord/embedded-app-sdk`.

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

4. **Create an administrator account:**
   ```bash
   npx tsx manage-users.ts add <username> <email> <password> admin
   ```
   Use a unique password of at least 12 characters. There are no default accounts; create the initial administrator before signing in. Passwords are stored as scrypt hashes in the local, git-ignored `users.json` file.

5. **Start the development server:**
   ```bash
   npm run dev
   ```

6. **Open in your browser:**
   Navigate to `http://localhost:3000` (or the local URL provided in your terminal).

All API endpoints require an authenticated account, and user administration requires the administrator role. Sessions use HttpOnly cookies and expire after 12 hours. Self-service password reset is disabled because the app has no email delivery service; administrators can reset accounts with `npx tsx manage-users.ts reset <username-or-email> <new-password>`.

## Homebrew and Official Rules Management

Administrators can assign the **narrator** account role in user management or with
`npx tsx manage-users.ts add <username> <email> <password> narrator`.
Narrators and administrators can open **Rules → Manage homebrew rules** to add,
edit, or remove mechanics, powers, origins, occupations, traits, and tags.
Add or update each draft rule, then select **Save homebrew** to publish the draft.
The advanced JSON editor supports power sets and additional fields such as
formulas, examples, prerequisites, and rank requirements. Players have read-only
access to the effective rules through the existing catalog and lookup APIs.

Homebrew is shared across the entire application, not isolated per campaign.
Mechanics override official entries by exact key; named entries override by
case-insensitive, trimmed name within their section. Power sets merge their powers
by name within the matching set. Keep power overrides in the same section/set as
the official entry. Other optional fields are retained when omitted from an override.
Removing an override restores the official entry; saving `{}` clears all homebrew.
Changes immediately refresh the catalog, search, and narrator rule references
without a server restart. Previously generated chat messages are unchanged.

### Backend official-rules updates

The server provides authenticated JSON endpoints:

| Endpoint | Permission | Purpose |
| --- | --- | --- |
| `GET /api/rules/homebrew` | Narrator/admin | Export the homebrew document |
| `PUT /api/rules/homebrew` | Narrator/admin | Replace homebrew with a partial rules document |
| `GET /api/rules/official` | Admin | Export/back up the current official document |
| `PUT /api/rules/official` | Admin | Replace the official document without changing homebrew |

To update official rules, export a backup first, then PUT an updated JSON document
using an administrator session cookie. For example, with an authenticated curl
cookie jar:

```bash
curl --fail --cookie cookies.txt \
  http://localhost:3000/api/rules/official --output official-backup.json
curl --fail --cookie cookies.txt --request PUT \
  --header 'Content-Type: application/json' \
  --data-binary @updated-rules.json http://localhost:3000/api/rules/official
```

The official document must include `mechanics` (an object keyed by rule ID) and
the arrays `powers`, `power_sets`, `origins`, `occupations`, `traits`, and `tags`;
`occupation_rules` is an optional object. Use the exported document or
`src/data/rules.json` as the format reference. Mechanics require a non-empty title
and description; array entries require a non-empty name. Optional text fields
must be strings, and examples/prerequisites must be string arrays. Invalid documents
return HTTP 400, unauthorized roles return 403, and requests over 1 MB return 413.
Both PUT operations replace their entire layer, so retain any entries you want
to keep. Coordinate simultaneous edits to avoid overwriting another narrator's draft.

On first startup, official rules come from the bundled `src/data/rules.json`.
After the first rules save, both layers persist atomically in the git-ignored
`rules-state.json` in the server's working directory. Back up this file and keep
that directory writable and on persistent storage. Later official updates must
use the API; replacing the bundled file alone does not replace a saved official
snapshot. A failed validation or disk write leaves the active rules unchanged.

---

## Environment Configuration

The application uses environment variables for server configuration, server-side API proxying, AI model selection, and Discord Activity integration.

### Environment Variables
- `PORT`: The port number on which the Express server listens (default: `3000`).
- `GEMINI_API_KEY`: Your Google Gemini API key used by the backend AI Narrator engine.
- `NARRATOR_MODEL`: The Gemini model identifier to use for AI narration (default: `gemini-2.5-flash`).
- `VITE_DISCORD_CLIENT_ID`: Your Discord Application Client ID (exposed to the frontend SDK).
- `DISCORD_CLIENT_ID`: Your Discord Application Client ID (server-side).
- `DISCORD_CLIENT_SECRET`: Your Discord Application Client Secret (server-side for OAuth token exchange).

### Development Setup
For local development, create a `.env` file in the root directory:
```env
PORT=3000
GEMINI_API_KEY=your_gemini_api_key_here
NARRATOR_MODEL=gemini-2.5-flash
VITE_DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_ID=your_discord_client_id_here
DISCORD_CLIENT_SECRET=your_discord_client_secret_here
```
When running `npm run dev`, Vite and the Express server automatically load these variables.

### Production Setup
For production deployments (e.g., Node.js servers, Docker, or cloud platforms like Cloud Run):
1. Set the environment variables directly in your hosting platform's environment settings or secrets manager:
   - `PORT=3000` (or your hosting provider's assigned port)
   - `GEMINI_API_KEY=your_production_gemini_api_key`
   - `NARRATOR_MODEL=gemini-2.5-flash`
   - `VITE_DISCORD_CLIENT_ID=your_discord_client_id_here`
   - `DISCORD_CLIENT_ID=your_discord_client_id_here`
   - `DISCORD_CLIENT_SECRET=your_discord_client_secret_here`
2. Build the application:
   ```bash
   npm run build
   ```
3. Start the production server:
   ```bash
   npm start
   ```

---

## Discord Embedded Activity Setup

To run this application as a Discord Activity:
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications) and create a new Application.
2. Navigate to the **Activity** tab in your application settings and configure the URL mapping (pointing to your deployed web app URL).
3. Set your `VITE_DISCORD_CLIENT_ID`, `DISCORD_CLIENT_ID`, and `DISCORD_CLIENT_SECRET` in your environment variables.
4. Launch the activity in a Discord voice channel to enjoy real-time Marvel Multiverse RPG campaigns with friends!

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
