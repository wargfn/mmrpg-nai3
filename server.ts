import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { resolveD616Roll } from './src/core/d616.ts';
import { rulesDatabase } from './src/core/rules.ts';
import { characterRoster, Character } from './src/core/character.ts';
import { combatTracker } from './src/core/combat.ts';
import { campaignManager } from './src/core/campaign.ts';
import { narratorEngine } from './src/core/narrator.ts';

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';

app.use(cors());
app.use(express.json());

// ----------------------------------------------------
// 1. d616 Dice Engine APIs
// ----------------------------------------------------
app.post('/api/roll', (req: Request, res: Response) => {
  try {
    const { ability_modifier = 0, target_number = null, edges = 0, troubles = 0 } = req.body;
    const result = resolveD616Roll({
      ability_modifier: Number(ability_modifier),
      target_number: target_number ? Number(target_number) : null,
      edges: Number(edges),
      troubles: Number(troubles),
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. Rules Database APIs
// ----------------------------------------------------
app.get('/api/rules/lookup', (req: Request, res: Response) => {
  const key = req.query.key as string;
  if (!key) return res.status(400).json({ error: 'Missing key parameter' });
  const result = rulesDatabase.lookupRule(key);
  if (!result) return res.status(404).json({ error: `Rule '${key}' not found` });
  res.json(result);
});

app.get('/api/rules/search', (req: Request, res: Response) => {
  const query = (req.query.query as string) || '';
  const results = rulesDatabase.queryRules(query);
  res.json(results);
});

// ----------------------------------------------------
// 3. Character Roster & Creation APIs
// ----------------------------------------------------
app.get('/api/characters', (_req: Request, res: Response) => {
  res.json({ characters: characterRoster.getAllSheets() });
});

app.get('/api/characters/:name', (req: Request, res: Response) => {
  const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
  const sheet = characterRoster.getSheet(name);
  if (!sheet) return res.status(404).json({ error: 'Character not found' });
  res.json(sheet);
});

app.post('/api/characters', (req: Request, res: Response) => {
  try {
    const char = new Character(req.body);
    const sheet = characterRoster.registerCharacter(char);
    res.status(201).json(sheet);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/characters/assisted', (req: Request, res: Response) => {
  try {
    const sheet = characterRoster.createAssisted(req.body);
    res.status(201).json(sheet);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/characters/:name/damage', (req: Request, res: Response) => {
  try {
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const { health_damage = 0, focus_damage = 0 } = req.body;
    const result = characterRoster.applyDamage(name, Number(health_damage), Number(focus_damage));
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. Combat Tracker APIs
// ----------------------------------------------------
app.get('/api/combat', (_req: Request, res: Response) => {
  res.json(combatTracker.getCombatState());
});

app.post('/api/combat/track', (req: Request, res: Response) => {
  try {
    const { name, side = 'player' } = req.body;
    const snapshot = combatTracker.trackCombatant(name, side);
    res.json(snapshot);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/attack', (req: Request, res: Response) => {
  try {
    const result = combatTracker.resolvePlayerAttack(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/npc-attack', (req: Request, res: Response) => {
  try {
    const result = combatTracker.resolveNpcAction(req.body);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/clear', (_req: Request, res: Response) => {
  combatTracker.clear();
  res.json({ message: 'Combat state cleared' });
});

// ----------------------------------------------------
// 5. Campaign & Memory APIs
// ----------------------------------------------------
app.get('/api/campaign', (_req: Request, res: Response) => {
  res.json({
    plan: campaignManager.getPlan(),
    context: campaignManager.getCurrentSessionContext(),
    memories: campaignManager.searchMemories(''),
    eventLog: campaignManager.getEventLog(),
  });
});

app.post('/api/campaign/plan', (req: Request, res: Response) => {
  try {
    const plan = campaignManager.createPlan(req.body);
    res.status(201).json(plan);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/campaign/event', (req: Request, res: Response) => {
  try {
    const { event } = req.body;
    campaignManager.logEvent(event);
    res.json({ message: 'Event logged', eventLog: campaignManager.getEventLog() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/campaign/conclude', (req: Request, res: Response) => {
  try {
    const { session_number, log_summary } = req.body;
    const result = campaignManager.concludeSession(Number(session_number), log_summary);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. Interactive Narrator AI APIs
// ----------------------------------------------------
app.get('/api/narrator/messages', (_req: Request, res: Response) => {
  res.json({
    messages: narratorEngine.getMessages(),
    activeCharacter: narratorEngine.getActiveCharacter(),
  });
});

app.post('/api/narrate', async (req: Request, res: Response) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }
    const reply = await narratorEngine.handleInput(message);
    res.json({
      reply,
      messages: narratorEngine.getMessages(),
      activeCharacter: narratorEngine.getActiveCharacter(),
      combatState: combatTracker.getCombatState(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/narrator/active-character', (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: 'Character name required' });
  narratorEngine.setActiveCharacter(name);
  res.json({ activeCharacter: narratorEngine.getActiveCharacter() });
});

app.post('/api/narrator/clear', (_req: Request, res: Response) => {
  narratorEngine.clearMessages();
  res.json({ messages: narratorEngine.getMessages() });
});

// ----------------------------------------------------
// 7. FastMCP Tools Registry & Invocation (matching narrator_tools.py)
// ----------------------------------------------------
const MCP_TOOLS = [
  { name: 'roll_d616', description: 'Resolve a d616 check with optional edge, trouble, and target number.' },
  { name: 'lookup_rule', description: 'Look up an exact mechanics or power reference from the rule database.' },
  { name: 'create_character', description: 'Create or load a tracked character sheet with explicit stats.' },
  { name: 'get_character', description: 'Fetch a tracked character sheet and mutable combat state.' },
  { name: 'apply_damage_to_character', description: 'Apply health and/or focus damage to a tracked character.' },
  { name: 'calculate_attack', description: 'Calculate rank-based attack damage from a Marvel die result.' },
  { name: 'track_combatant', description: 'Add an existing character to the active combat roster.' },
  { name: 'get_combat_state', description: 'Show all combatants currently tracked in combat.' },
  { name: 'resolve_manual_d616_roll', description: 'Normalize a manually reported d616 roll payload.' },
  { name: 'resolve_player_attack', description: 'Resolve a player attack, optionally from a manual roll.' },
  { name: 'resolve_npc_action', description: 'Auto-resolve an NPC or enemy combat action.' },
  { name: 'create_character_assisted', description: 'Create a character from an archetype template.' },
  { name: 'list_available_archetypes', description: 'List supported archetypes and playstyle summaries.' },
  { name: 'save_campaign_memory', description: 'Persist a named campaign memory entry.' },
  { name: 'load_campaign_memory', description: 'Load a named campaign memory entry.' },
  { name: 'create_campaign_plan', description: 'Generate and persist a structured campaign plan.' },
  { name: 'get_next_session_briefing', description: 'Return the active campaign session briefing.' },
  { name: 'wrap_up_current_session', description: 'Conclude the active campaign session and advance progress.' },
  { name: 'log_campaign_event', description: 'Persist a campaign event in the plot log.' },
];

app.get('/api/mcp/tools', (_req: Request, res: Response) => {
  res.json({ tools: MCP_TOOLS });
});

app.post('/api/mcp/call', (req: Request, res: Response) => {
  const { tool, arguments: args = {} } = req.body;
  try {
    switch (tool) {
      case 'roll_d616':
        return res.json(resolveD616Roll(args));
      case 'lookup_rule':
        return res.json(rulesDatabase.lookupRule(args.rule_key || args.query));
      case 'get_character':
        return res.json(characterRoster.getSheet(args.name) || { error: 'Not found' });
      case 'track_combatant':
        return res.json(combatTracker.trackCombatant(args.name, args.side));
      case 'get_combat_state':
        return res.json(combatTracker.getCombatState());
      case 'create_character_assisted':
        return res.json(characterRoster.createAssisted(args));
      case 'get_next_session_briefing':
        return res.json(campaignManager.getCurrentSessionContext());
      case 'log_campaign_event':
        campaignManager.logEvent(args.event);
        return res.json({ success: true });
      default:
        return res.status(501).json({ error: `Tool '${tool}' not yet migrated or unrecognized` });
    }
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. Vite Middleware or Static Assets
// ----------------------------------------------------
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve('dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req: Request, res: Response) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, HOST, () => {
    console.log(`🦸 Marvel Multiverse Narrator AI server running on http://${HOST}:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
