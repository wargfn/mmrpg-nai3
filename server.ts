try {
  process.loadEnvFile?.();
} catch {}

import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

// Resolve real Gemini API key if process.env contains a placeholder
export function resolveGeminiKey(): string {
  let key = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  if (!key || key.startsWith('MY_')) {
    try {
      if (fs.existsSync('.env')) {
        const content = fs.readFileSync('.env', 'utf-8');
        for (const line of content.split('\n')) {
          const [k, ...rest] = line.split('=');
          if (k.trim() === 'GEMINI_API_KEY' && rest.length > 0) {
            const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
            if (val && !val.startsWith('MY_')) {
              key = val;
              process.env.GEMINI_API_KEY = val;
              break;
            }
          }
        }
      }
    } catch {}
  }
  return key;
}

resolveGeminiKey();
import { resolveD616Roll, buildD616Result } from './src/core/d616.ts';
import { rulesDatabase } from './src/core/rules.ts';
import { characterRoster, Character } from './src/core/character.ts';
import { combatTracker } from './src/core/combat.ts';
import { campaignManager } from './src/core/campaign.ts';
import { narratorEngine, AVAILABLE_MODELS, NARRATOR_ROLES } from './src/core/narrator.ts';
import { loadUsers, findUser, createUser, deleteUser, updatePassword, generateResetToken, resetPasswordWithToken } from './src/core/users.ts';

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

app.get('/api/rules/index', (_req: Request, res: Response) => {
  const index = rulesDatabase.getRulesIndex();
  res.json(index);
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
    const { health_damage = 0, focus_damage = 0, source = 'Manual Adjustment' } = req.body;
    let result;
    try {
      result = combatTracker.applyDamage(name, Number(health_damage), Number(focus_damage), source);
    } catch {
      result = characterRoster.applyDamage(name, Number(health_damage), Number(focus_damage));
    }
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/characters/:name/karma', (req: Request, res: Response) => {
  try {
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const { delta, value } = req.body;
    const char = characterRoster.getCharacter(name);
    if (!char) return res.status(404).json({ error: `Character '${name}' not found` });

    if (value !== undefined) {
      char.setKarma(Number(value));
    } else if (delta !== undefined) {
      char.adjustKarma(Number(delta));
    }

    res.json({ character: char.toSheet() });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/characters/:name/karma/spend', (req: Request, res: Response) => {
  try {
    const name = Array.isArray(req.params.name) ? req.params.name[0] : req.params.name;
    const char = characterRoster.getCharacter(name);
    if (!char) return res.status(404).json({ error: `Character '${name}' not found` });

    const { actionType, amount = 1, currentRoll, bonus } = req.body;
    if (char.karma < amount) {
      return res.status(400).json({
        error: `Insufficient Karma points. ${char.name} has ${char.karma} Karma, needs ${amount}.`,
      });
    }

    // Deduct karma
    char.spendKarma(amount);

    let rollResult: any = null;
    let description = '';

    // Extract existing dice values if present
    const existingS1 = currentRoll?.raw_dice?.standard_1 ?? (Array.isArray(currentRoll?.dice_values) ? currentRoll.dice_values[0] : (Math.floor(Math.random() * 6) + 1));
    const existingM = currentRoll?.raw_dice?.marvel_die ?? (Array.isArray(currentRoll?.dice_values) ? currentRoll.dice_values[1] : (Math.floor(Math.random() * 6) + 1));
    const existingS2 = currentRoll?.raw_dice?.standard_2 ?? (Array.isArray(currentRoll?.dice_values) ? currentRoll.dice_values[2] : (Math.floor(Math.random() * 6) + 1));
    const mod = currentRoll?.ability_modifier ?? char.melee;
    const tn = currentRoll?.target_number ?? null;

    if (actionType === 'reroll_marvel') {
      const s1 = existingS1;
      const s2 = existingS2;
      const newMarvel = Math.floor(Math.random() * 6) + 1;

      rollResult = buildD616Result({
        standard_1: s1,
        marvel_die: newMarvel,
        standard_2: s2,
        ability_modifier: mod,
        target_number: tn,
      });

      description = `${char.name} spent 1 Karma to reroll the Marvel Die! New dice: [${s1}, ${newMarvel === 1 ? 'M (counts as 6)' : newMarvel}, ${s2}] + ${mod} = ${rollResult.total_score}${rollResult.is_fantastic ? ' ⭐ (Fantastic Outcome!)' : ''}${tn ? ` vs TN ${tn} (${rollResult.success ? 'Success' : 'Failed'})` : ''}.`;
    } else if (actionType === 'reroll_lowest') {
      let s1 = existingS1;
      const m = existingM;
      let s2 = existingS2;
      const newD6 = Math.floor(Math.random() * 6) + 1;

      if (s1 <= s2) {
        s1 = newD6;
      } else {
        s2 = newD6;
      }

      rollResult = buildD616Result({
        standard_1: s1,
        marvel_die: m,
        standard_2: s2,
        ability_modifier: mod,
        target_number: tn,
      });

      description = `${char.name} spent 1 Karma to reroll the lowest standard die! New pool: [${s1}, ${m === 1 ? 'M (counts as 6)' : m}, ${s2}] + ${mod} = ${rollResult.total_score}${tn ? ` vs TN ${tn} (${rollResult.success ? 'Success' : 'Failed'})` : ''}.`;
    } else if (actionType === 'reroll_die_1') {
      const s1 = Math.floor(Math.random() * 6) + 1;
      const m = existingM;
      const s2 = existingS2;

      rollResult = buildD616Result({
        standard_1: s1,
        marvel_die: m,
        standard_2: s2,
        ability_modifier: mod,
        target_number: tn,
      });

      description = `${char.name} spent 1 Karma to reroll Standard Die 1! New pool: [${s1}, ${m === 1 ? 'M (counts as 6)' : m}, ${s2}] + ${mod} = ${rollResult.total_score}${tn ? ` vs TN ${tn} (${rollResult.success ? 'Success' : 'Failed'})` : ''}.`;
    } else if (actionType === 'reroll_die_2') {
      const s1 = existingS1;
      const m = existingM;
      const s2 = Math.floor(Math.random() * 6) + 1;

      rollResult = buildD616Result({
        standard_1: s1,
        marvel_die: m,
        standard_2: s2,
        ability_modifier: mod,
        target_number: tn,
      });

      description = `${char.name} spent 1 Karma to reroll Standard Die 2! New pool: [${s1}, ${m === 1 ? 'M (counts as 6)' : m}, ${s2}] + ${mod} = ${rollResult.total_score}${tn ? ` vs TN ${tn} (${rollResult.success ? 'Success' : 'Failed'})` : ''}.`;
    } else if (actionType === 'reroll_all') {
      rollResult = resolveD616Roll({
        ability_modifier: mod,
        target_number: tn,
      });
      description = `${char.name} spent 1 Karma for a full d616 pool reroll! Total: ${rollResult.total_score}${rollResult.is_fantastic ? ' ⭐ (Fantastic Outcome!)' : ''}${tn ? ` vs TN ${tn} (${rollResult.success ? 'Success' : 'Failed'})` : ''}.`;
    } else if (actionType === 'adjust_score') {
      const adjustment = bonus !== undefined ? Number(bonus) : char.rank;
      const s1 = existingS1;
      const m = existingM;
      const s2 = existingS2;
      const baseMod = mod;
      const effectiveTn = tn ?? 15;
      const newMod = baseMod + adjustment;

      rollResult = buildD616Result({
        standard_1: s1,
        marvel_die: m,
        standard_2: s2,
        ability_modifier: newMod,
        target_number: effectiveTn,
      });

      description = `${char.name} spent 1 Karma for an Outcome Adjustment (+${adjustment} Karma Bonus to Total Score)! Score increased to ${rollResult.total_score}${effectiveTn ? ` vs TN ${effectiveTn} (${rollResult.success ? 'SUCCESS!' : 'FAILED'})` : ''}.`;
    } else if (actionType === 'gain_edge') {
      description = `${char.name} spent 1 Karma to gain a tactical Edge (+1 Edge on next action check)!`;
    } else {
      description = `${char.name} spent ${amount} Karma.`;
    }

    // Add comic event message to narrator chat
    try {
      narratorEngine.addMessage({
        role: 'system',
        content: `⭐ **KARMA SPENT by ${char.name}** (${char.karma} Karma remaining)\n${description}`,
        metadata: {
          type: 'dice_roll',
          diceResult: rollResult,
          karmaAction: actionType,
        },
      });
    } catch (e) {
      console.error('Could not log karma message to narrator:', e);
    }

    res.json({
      character: char.toSheet(),
      rollResult,
      actionDescription: description,
      remainingKarma: char.karma,
      messages: narratorEngine.getMessages(),
    });
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

app.get('/api/combat/history', (_req: Request, res: Response) => {
  res.json({ history: combatTracker.getDamageHistory() });
});

app.post('/api/combat/history/clear', (_req: Request, res: Response) => {
  combatTracker.clearDamageHistory();
  res.json({ history: [] });
});

// Initiative & Turn Tracker endpoints
app.post('/api/combat/initiative/roll', (req: Request, res: Response) => {
  try {
    const { name, edges = 0, troubles = 0 } = req.body || {};
    if (name) {
      combatTracker.rollInitiative(name, Number(edges), Number(troubles));
    } else {
      combatTracker.rollAllInitiatives(true);
    }
    res.json(combatTracker.getCombatState());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/initiative/set', (req: Request, res: Response) => {
  try {
    const { name, initiative } = req.body;
    if (!name) return res.status(400).json({ error: 'Combatant name is required' });
    combatTracker.setInitiative(name, initiative != null ? Number(initiative) : null);
    res.json(combatTracker.getCombatState());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/initiative/sort', (_req: Request, res: Response) => {
  try {
    combatTracker.sortByInitiative();
    res.json(combatTracker.getCombatState());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/initiative/move', (req: Request, res: Response) => {
  try {
    const { name, direction } = req.body;
    if (!name || (direction !== 'up' && direction !== 'down')) {
      return res.status(400).json({ error: 'Valid name and direction (up/down) required' });
    }
    combatTracker.moveCombatant(name, direction);
    res.json(combatTracker.getCombatState());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/initiative/reorder', (req: Request, res: Response) => {
  try {
    const { ordered_names } = req.body;
    if (!Array.isArray(ordered_names)) {
      return res.status(400).json({ error: 'ordered_names array required' });
    }
    combatTracker.reorderCombatants(ordered_names);
    res.json(combatTracker.getCombatState());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/turn/next', (_req: Request, res: Response) => {
  try {
    res.json(combatTracker.nextTurn());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/turn/prev', (_req: Request, res: Response) => {
  try {
    res.json(combatTracker.prevTurn());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/turn/set', (req: Request, res: Response) => {
  try {
    const { index, name } = req.body;
    if (index !== undefined) {
      res.json(combatTracker.setTurn(Number(index)));
    } else if (name) {
      res.json(combatTracker.setTurn(String(name)));
    } else {
      res.status(400).json({ error: 'index or name is required' });
    }
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/initiative/reset', (_req: Request, res: Response) => {
  try {
    res.json(combatTracker.resetInitiative());
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Combatant Condition Endpoints
app.post('/api/combat/condition/add', (req: Request, res: Response) => {
  try {
    const { name, condition } = req.body;
    if (!name || !condition) return res.status(400).json({ error: 'Combatant name and condition are required' });
    const state = combatTracker.addCondition(name, condition);
    res.json(state);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/condition/remove', (req: Request, res: Response) => {
  try {
    const { name, condition } = req.body;
    if (!name || !condition) return res.status(400).json({ error: 'Combatant name and condition are required' });
    const state = combatTracker.removeCondition(name, condition);
    res.json(state);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/condition/toggle', (req: Request, res: Response) => {
  try {
    const { name, condition } = req.body;
    if (!name || !condition) return res.status(400).json({ error: 'Combatant name and condition are required' });
    const state = combatTracker.toggleCondition(name, condition);
    res.json(state);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/combat/condition/clear', (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Combatant name is required' });
    const state = combatTracker.clearConditions(name);
    res.json(state);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
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

app.get('/api/campaign/event-log/download', (_req: Request, res: Response) => {
  try {
    const plan = campaignManager.getPlan();
    const eventLog = campaignManager.getEventLog();
    const memories = campaignManager.searchMemories('');

    const lines: string[] = [
      '================================================================================',
      'MARVEL MULTIVERSE ROLE-PLAYING GAME - CAMPAIGN EVENT LOG & PLOT CHRONOLOGY',
      '================================================================================',
      `Campaign Title:   ${plan?.theme || 'Marvel Campaign'}`,
      `Supervillain:     ${plan?.villain || 'Unknown Villain'}`,
      `Hero Team:        ${plan?.hero_team?.join(', ') || 'Avengers & Allies'}`,
      `Current Session:  Episode ${plan?.current_session || 1} of ${plan?.sessions?.length || 1}`,
      `Generated On:     ${new Date().toLocaleString()}`,
      `Total Events:     ${eventLog.length} recorded event(s)`,
      '================================================================================',
      '',
      '--- SESSIONS ROADMAP ---',
    ];

    if (plan?.sessions && plan.sessions.length > 0) {
      plan.sessions.forEach((s) => {
        lines.push(`[Session ${s.session_number}] ${s.title} (${s.status.toUpperCase()})`);
        lines.push(`  Act:           ${s.act}`);
        lines.push(`  Objective:     ${s.primary_objective}`);
        lines.push(`  Briefing:      ${s.briefing}`);
        if (s.complications?.length) {
          lines.push(`  Complications: ${s.complications.join('; ')}`);
        }
        if (s.key_encounters?.length) {
          lines.push(`  Encounters:    ${s.key_encounters.join('; ')}`);
        }
        lines.push('');
      });
    } else {
      lines.push('No sessions planned yet.\n');
    }

    if (memories.length > 0) {
      lines.push('--- CAMPAIGN LORE & MEMORIES ---');
      memories.forEach((m) => {
        lines.push(`• [${m.category.toUpperCase()}] ${m.title}: ${m.details}`);
      });
      lines.push('');
    }

    lines.push('--- CHRONOLOGICAL EVENT LOG ---');
    if (eventLog.length > 0) {
      eventLog.forEach((event, idx) => {
        lines.push(`[${idx + 1}] ${event}`);
      });
    } else {
      lines.push('No events recorded yet.');
    }

    lines.push('');
    lines.push('================================================================================');
    lines.push('END OF CAMPAIGN RECORD');
    lines.push('================================================================================');

    const fileContent = lines.join('\n');
    const safeTitle = (plan?.theme || 'marvel-campaign')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const filename = `${safeTitle}-event-log-${new Date().toISOString().slice(0, 10)}.txt`;

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(fileContent);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
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
app.get('/api/narrator/config', (_req: Request, res: Response) => {
  res.json({
    activeModel: narratorEngine.getModel(),
    availableModels: AVAILABLE_MODELS,
    activeRole: narratorEngine.getRole(),
    availableRoles: Object.values(NARRATOR_ROLES),
    activeCharacter: narratorEngine.getActiveCharacter(),
  });
});

app.post('/api/narrator/config', (req: Request, res: Response) => {
  try {
    const { model, role } = req.body;
    if (model) narratorEngine.setModel(model);
    if (role) narratorEngine.setRole(role);
    res.json({
      activeModel: narratorEngine.getModel(),
      activeRole: narratorEngine.getRole(),
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.get('/api/narrator/messages', (_req: Request, res: Response) => {
  res.json({
    messages: narratorEngine.getMessages(),
    activeCharacter: narratorEngine.getActiveCharacter(),
    activeModel: narratorEngine.getModel(),
    activeRole: narratorEngine.getRole(),
  });
});

app.post('/api/narrate', async (req: Request, res: Response) => {
  try {
    const { message, model, role } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message text is required' });
    }
    const reply = await narratorEngine.handleInput(message, { model, role });
    res.json({
      reply,
      messages: narratorEngine.getMessages(),
      activeCharacter: narratorEngine.getActiveCharacter(),
      activeModel: narratorEngine.getModel(),
      activeRole: narratorEngine.getRole(),
      combatState: combatTracker.getCombatState(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/narrator/report-roll', async (req: Request, res: Response) => {
  try {
    const result = await narratorEngine.rollAndReport(req.body);
    res.json({
      ...result,
      activeCharacter: narratorEngine.getActiveCharacter(),
      activeModel: narratorEngine.getModel(),
      activeRole: narratorEngine.getRole(),
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
// Discord Activity Token Exchange Endpoint
// ----------------------------------------------------
app.post('/api/discord/token', async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    if (!code) {
      return res.status(400).json({ error: 'Missing code' });
    }

    const clientId = process.env.DISCORD_CLIENT_ID || process.env.VITE_DISCORD_CLIENT_ID;
    const clientSecret = process.env.DISCORD_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      // Development fallback or mock token response
      return res.json({ access_token: 'mock_discord_access_token' });
    }

    const response = await fetch(`https://discord.com/api/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code: code,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// Authentication & User Management APIs
// ----------------------------------------------------
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username/Email and password are required' });
  }
  const user = findUser(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid username/email or password' });
  }
  res.json({ success: true, user: { username: user.username, email: user.email, role: user.role } });
});

app.post('/api/auth/signup', (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }
  const userEmail = email && email.trim() ? email.trim() : `${username.trim()}@marvel.com`;
  if (findUser(username) || findUser(userEmail)) {
    return res.status(400).json({ error: 'Username or email already exists' });
  }
  const newUser = createUser(username, userEmail, password, 'player');
  res.json({ success: true, user: { username: newUser.username, email: newUser.email, role: newUser.role } });
});

app.post('/api/auth/request-reset', (req: Request, res: Response) => {
  const { usernameOrEmail } = req.body;
  if (!usernameOrEmail) {
    return res.status(400).json({ error: 'Username or email is required' });
  }
  const result = generateResetToken(usernameOrEmail);
  if (!result) {
    return res.status(404).json({ error: 'User account not found with that username or email' });
  }
  res.json({
    success: true,
    message: `Password reset instructions sent to ${result.email}`,
    email: result.email,
    temporaryToken: result.token,
  });
});

app.post('/api/auth/verify-reset', (req: Request, res: Response) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: 'Temporary token and new password are required' });
  }
  const success = resetPasswordWithToken(token, newPassword);
  if (!success) {
    return res.status(400).json({ error: 'Invalid or expired temporary reset token/password' });
  }
  res.json({ success: true, message: 'Password has been reset successfully' });
});

app.get('/api/users', (_req: Request, res: Response) => {
  const users = loadUsers().map(u => ({ username: u.username, email: u.email, role: u.role, createdAt: u.createdAt }));
  res.json({ users });
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
