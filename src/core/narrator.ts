/**
 * Unified Marvel Multiverse RPG Narrator Controller with Multi-Turn Gemini LLM Chat.
 * Ported and enhanced from marvel_mcp_narrator/core/session_controller.py & cli.py & discord_bot.py
 */

try {
  process.loadEnvFile?.();
} catch {}

import fs from 'fs';
import { GoogleGenAI } from '@google/genai';
import { characterRoster, CharacterSheet } from './character.ts';
import { combatTracker } from './combat.ts';
import { rulesDatabase } from './rules.ts';
import { campaignManager } from './campaign.ts';
import { resolveD616Roll } from './d616.ts';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelUsed?: string;
  metadata?: {
    type?:
      | 'command'
      | 'narration'
      | 'dice_roll'
      | 'combat'
      | 'rule_citation'
      | 'reported_roll'
      | 'reported_roll_response';
    diceResult?: any;
    rollResult?: any;
    combatResult?: any;
    ruleCitation?: any;
    roleUsed?: string;
    ability?: string;
    actionDescription?: string;
    reportCode?: string;
    karmaAction?: string;
    [key: string]: any;
  };
}

export interface NarratorRole {
  id: string;
  name: string;
  tagline: string;
  icon: string;
  instruction: string;
}

export const NARRATOR_ROLES: Record<string, NarratorRole> = {
  stan_lee: {
    id: 'stan_lee',
    name: 'Stan Lee (The True Believer GM)',
    tagline: 'Classic high-octane comic style with flair, excitement, and witty banter!',
    icon: '🎙️',
    instruction: `You are Stan Lee, legendary Marvel creator and energetic Game Master for the Marvel Multiverse RPG!
- Address the player with classic comic enthusiasm ('True Believer!', 'Greetings, Hero!').
- Narrate in dramatic, colorful, cinematic comic-book prose with bold sound effects (THWIP! BAM! KRAKKOOM!).
- Keep the momentum roaring, weave in witty hero banter and dramatic stakes, and end with 'Excelsior!' or a thrilling cliffhanger question.`,
  },
  the_watcher: {
    id: 'the_watcher',
    name: 'The Watcher (Cosmic Observer)',
    tagline: 'All-seeing observer documenting pivotal nexus events across the multiverse.',
    icon: '👁️',
    instruction: `You are Uatu the Watcher, cosmic observer of the Marvel Multiverse.
- Speak with solemn cosmic authority and vast perspective ('I observe all realities... and in this timeline...').
- Describe how the hero's actions ripple across the multiverse and alter fate.
- Maintain a grand, mysterious, and awe-inspiring tone while arbitrating consequences with cosmic impartiality.`,
  },
  tactical_gm: {
    id: 'tactical_gm',
    name: 'Tactical Combat Arbiter',
    tagline: 'Focused on precise MMRPG mechanics, positioning, cover, and target numbers.',
    icon: '⚔️',
    instruction: `You are the Tactical Combat Arbiter for Marvel Multiverse RPG.
- Emphasize tactical battlefield geometry, distances, cover, action economy (Standard, Movement, Reaction), and MMRPG mechanics.
- Clearly call out Target Numbers (TN), Defense values, Damage Multipliers (Rank × Marvel Die), and status conditions (Prone, Pin, Stun).
- Keep descriptions crisp, visceral, and mechanically grounded.`,
  },
  gritty_street: {
    id: 'gritty_street',
    name: 'Gritty Street-Level Narrator',
    tagline: 'Tense, shadows-and-rain, Daredevil & Spider-Man street crime realism.',
    icon: '🏙️',
    instruction: `You are a gritty, street-level Marvel Game Master (in the tone of Daredevil, Moon Knight, or classic Spider-Man).
- Describe the gritty sensory details: flickering neon signs, rain-slicked Manhattan asphalt, sirens echoing between skyscrapers, concrete rubble.
- Stakes feel personal, visceral, and immediate. Civilians are in jeopardy and collateral damage matters.`,
  },
};

export const AVAILABLE_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', badge: 'General / Recommended', desc: 'Fast, responsive storytelling and roleplay' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite', badge: 'Fastest', desc: 'Ultra-low latency for quick action resolutions' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', badge: 'Complex Reasoning', desc: 'Deep campaign lore, intricate mysteries, and tactical depth' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', badge: 'Stable Alternative', desc: 'High reliability multi-turn generation' },
];

export class NarratorEngine {
  private messages: ChatMessage[] = [];
  private activeCharacterName: string = 'Spider-Man';
  private activeRoleId: string = 'stan_lee';
  private modelName: string = 'gemini-2.5-flash';
  private aiClient: GoogleGenAI | null = null;

  constructor() {
    this.initAIClient();
    this.seedInitialMessages();
  }

  private initAIClient() {
    let apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (!apiKey || apiKey.startsWith('MY_')) {
      try {
        if (fs.existsSync('.env')) {
          const content = fs.readFileSync('.env', 'utf-8');
          for (const line of content.split('\n')) {
            const [k, ...rest] = line.split('=');
            if (k.trim() === 'GEMINI_API_KEY' && rest.length > 0) {
              const val = rest.join('=').trim().replace(/^["']|["']$/g, '');
              if (val && !val.startsWith('MY_')) {
                apiKey = val;
                process.env.GEMINI_API_KEY = val;
                break;
              }
            }
          }
        }
      } catch {}
    }

    if (apiKey) {
      try {
        this.aiClient = new GoogleGenAI({
          apiKey,
          httpOptions: {
            headers: {
              'User-Agent': 'aistudio-build',
            },
          },
        });
      } catch (e) {
        console.warn('Could not initialize GoogleGenAI client:', e);
      }
    }
  }

  public setActiveCharacter(name: string): void {
    if (characterRoster.getSheet(name)) {
      this.activeCharacterName = name;
    }
  }

  public getActiveCharacter(): CharacterSheet | undefined {
    return characterRoster.getSheet(this.activeCharacterName);
  }

  public setModel(model: string) {
    if (AVAILABLE_MODELS.some(m => m.id === model)) {
      this.modelName = model;
    }
  }

  public getModel(): string {
    return this.modelName;
  }

  public setRole(roleId: string) {
    if (NARRATOR_ROLES[roleId]) {
      this.activeRoleId = roleId;
    }
  }

  public getRole(): NarratorRole {
    return NARRATOR_ROLES[this.activeRoleId] || NARRATOR_ROLES.stan_lee;
  }

  private seedInitialMessages() {
    const role = this.getRole();
    this.messages.push({
      id: 'msg_welcome',
      role: 'assistant',
      content: `💥 **Welcome to the Marvel Multiverse RPG Narrator AI!** 💥\n\nI am your automated Narrator and Game Master, powered by **Gemini AI** with live **d616 mechanics**!\n\nYou are currently playing as **Spider-Man (Rank 4 Striker)**.\n\n* **Freeform Roleplay**: Tell me what your hero attempts to do!\n* **Slash Commands**: \`/roll\`, \`/attack <target>\`, \`/rules <topic>\`, \`/combat\`, \`/memories\`.\n* **Manual Dice**: Enter physical rolls like \`[4, 1 (Marvel), 5]\` to have the engine calculate the outcome.\n\n*Sirens wail through the Midtown canyons. A plume of green smoke rises above the Roosevelt Hotel as Green Goblin's glider shrieks through the evening sky. What do you do, hero?*`,
      timestamp: new Date().toLocaleTimeString(),
      modelUsed: this.modelName,
      metadata: { type: 'narration', roleUsed: role.id },
    });
  }

  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  public addMessage(msg: Partial<ChatMessage> & { content: string; role?: 'system' | 'assistant' | 'user' }): ChatMessage {
    const chatMsg: ChatMessage = {
      id: msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      role: msg.role || 'system',
      content: msg.content,
      timestamp: msg.timestamp || new Date().toLocaleTimeString(),
      modelUsed: msg.modelUsed || this.modelName,
      metadata: msg.metadata || {},
    };
    this.messages.push(chatMsg);
    return chatMsg;
  }

  public clearMessages(): void {
    this.messages = [];
    this.seedInitialMessages();
  }

  public buildContextInjection(userPrompt: string): string {
    const sections: string[] = [];

    // 1. Active Character Sheet
    const sheet = this.getActiveCharacter();
    if (sheet) {
      sections.push(`[ACTIVE CHARACTER: ${sheet.name} (Rank ${sheet.rank} ${sheet.archetype})]
- Health: ${sheet.current_health}/${sheet.max_health} | Focus: ${sheet.current_focus}/${sheet.max_focus} | Karma: ${sheet.karma}
- Abilities: Melee ${sheet.melee}, Agility ${sheet.agility}, Resilience ${sheet.resilience}, Vigilance ${sheet.vigilance}, Ego ${sheet.ego}, Logic ${sheet.logic}
- Defenses: Melee ${sheet.defenses.melee_defense}, Agility ${sheet.defenses.agility_defense}, Resilience ${sheet.defenses.resilience_defense}, Vigilance ${sheet.defenses.vigilance_defense}, Ego ${sheet.defenses.ego_defense}, Logic ${sheet.defenses.logic_defense}
- Traits: ${sheet.traits.join(', ')}
- Power Sets: ${sheet.power_sets.map(p => (typeof p === 'string' ? p : p.name)).join(', ')}`);
    }

    // 2. Active Combat State
    const combatState = combatTracker.getCombatState();
    if (combatState.combatants.length > 0) {
      const combatSummary = combatState.combatants
        .map(
          c =>
            `${c.is_active_turn ? '[ACTIVE TURN] ' : ''}${c.name} (${c.side.toUpperCase()}${c.initiative != null ? `, Init ${c.initiative}` : ''}): HP ${c.current_health}/${c.max_health}, Focus ${c.current_focus}/${c.max_focus}`
        )
        .join(' | ');
      sections.push(
        `[ACTIVE COMBAT ENCOUNTER (Round ${combatState.round}, Current Turn: ${combatState.active_combatant || 'None'})]\n${combatSummary}`
      );
    }

    // 3. Campaign Briefing & Storyline Directives
    const campaignCtx = campaignManager.getCurrentSessionContext();
    if (campaignCtx) {
      const plan = campaignCtx.plan;
      const s = campaignCtx.session;
      const otherSessions = plan.sessions
        .map(sess => `  • Episode ${sess.session_number} [${sess.status.toUpperCase()}]: "${sess.title}" (${sess.act}) - Target: ${sess.primary_objective}`)
        .join('\n');

      sections.push(`[ACTIVE CAMPAIGN STORYLINE & DIRECTIVES - STRICTLY ADHERE TO THIS PLAN]
- Campaign Arc Title: "${plan.theme}"
- Primary Arch-Villain: ${plan.villain}
- Allied Hero Team: ${plan.hero_team.join(', ')}
- Current Active Episode: Episode ${s.session_number} of ${plan.sessions.length}: "${s.title}" (${s.act})
- Episode Briefing / Setup: ${s.briefing}
- PRIMARY MISSION OBJECTIVE: ${s.primary_objective}
${s.complications?.length ? `- Active Complications To Feature: ${s.complications.join('; ')}` : ''}
${s.key_encounters?.length ? `- Planned Key Encounters: ${s.key_encounters.join('; ')}` : ''}
${plan.notes ? `- GM Campaign Directives & Lore Notes: ${plan.notes}` : ''}
- Full Campaign Episodes Roadmap:
${otherSessions}

*** MANDATORY STORYLINE INSTRUCTION ***
You MUST align your narration with this active campaign plan. Frame challenges, NPC dialogue, enemy maneuvers, and environmental obstacles around advancing toward the current objective: "${s.primary_objective}". Highlight the threat of ${plan.villain} and incorporate the planned complications.`);
    }

    // 4. Keyword Rule Hit Citations
    const tokens = userPrompt.toLowerCase().split(/\W+/).filter(t => t.length > 3);
    const ruleHits: string[] = [];
    for (const token of tokens) {
      const match = rulesDatabase.lookupRule(token);
      if (match) {
        if (match.entry_type === 'power') {
          ruleHits.push(
            `- Power [${match.name}]: Category ${match.category}, Rank ${match.rank_required}. ${match.description}`
          );
        } else {
          ruleHits.push(
            `- Mechanic [${match.title}]: ${match.description} ${match.formula ? `(Formula: ${match.formula})` : ''}`
          );
        }
      }
    }
    if (ruleHits.length > 0) {
      sections.push(`[RELEVANT RULE CITATIONS]\n${ruleHits.slice(0, 3).join('\n')}`);
    }

    return sections.join('\n\n');
  }

  public async handleInput(
    userText: string,
    options?: { model?: string; role?: string }
  ): Promise<ChatMessage> {
    if (options?.model) this.setModel(options.model);
    if (options?.role) this.setRole(options.role);

    const trimmed = userText.trim();
    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.messages.push(userMsg);

    // 1. Check for manual dice roll pattern: e.g. [4, 5, 1 (Marvel)] or [3, 1, 4]
    const manualMatch = trimmed.match(
      /\[\s*(\d)\s*,\s*(\d)\s*,\s*(\d)(?:\s*\((?:marvel|m)\))?\s*\]/i
    );
    if (manualMatch) {
      const d1 = parseInt(manualMatch[1], 10);
      const d2 = parseInt(manualMatch[2], 10);
      const d3 = parseInt(manualMatch[3], 10);
      const manualRoll = combatTracker.resolveManualRoll({
        dice_values: [d1, d2, d3],
        marvel_index: 1,
      });

      const responseContent =
        `🎲 **Manual d616 Roll Recorded:** [${manualRoll.dice_values.join(', ')}]\n` +
        `- Total Score: **${manualRoll.total_score}**\n` +
        `- Marvel Die: **${manualRoll.raw_dice.marvel_die}** ${
          manualRoll.is_fantastic ? '⭐ **FANTASTIC ROLL!**' : ''
        }\n` +
        `${manualRoll.is_ultimate ? '🌟 **ULTIMATE 616 SUCCESS!**\n' : ''}` +
        `${manualRoll.is_botch ? '💀 **BOTCH (Critical Failure)!**\n' : ''}`;

      const assistantMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toLocaleTimeString(),
        modelUsed: 'd616-engine',
        metadata: { type: 'dice_roll', diceResult: manualRoll },
      };
      this.messages.push(assistantMsg);
      return assistantMsg;
    }

    // 2. Check for slash commands
    if (trimmed.startsWith('/') || trimmed.startsWith('!')) {
      const cleanCmd = trimmed.substring(1).trim();
      const parts = cleanCmd.split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      let responseContent = '';
      let metadata: any = { type: 'command' };

      switch (command) {
        case 'help': {
          responseContent = `### Marvel Multiverse RPG Narrator Commands
- \`/roll [edges] [troubles] [modifier] [tn]\` : Roll d616 action check
- \`/report [ability] [tn] [edges] [troubles]\` : Roll dice and report the action check directly into the chat
- \`/rules <keyword>\` : Search official rules database and superpowers
- \`/combat\` : Show combat roster & current health/focus
- \`/attack <target> [ability]\` : Resolve a player attack check and damage
- \`/npc-attack <attacker> <target>\` : Resolve an enemy strike against player
- \`/memories\` : View campaign plot log and recorded entities
- \`[d1, d2, d3 (Marvel)]\` : Report a manual physical dice roll`;
          break;
        }

        case 'report': {
          const edges = args.includes('--edge') || args.includes('edge') ? 1 : 0;
          const troubles = args.includes('--trouble') || args.includes('trouble') ? 1 : 0;
          const tnArg = args.find(a => a.startsWith('--tn=') || (!isNaN(Number(a)) && Number(a) >= 5));
          const tn = tnArg ? parseInt(tnArg.replace('--tn=', ''), 10) : null;
          const activeChar = this.getActiveCharacter();
          
          // Ability can be specified, e.g. /report agility
          const abilityOptions = ['melee', 'agility', 'resilience', 'vigilance', 'ego', 'logic'];
          const matchedAbility = args.find(a => abilityOptions.includes(a.toLowerCase())) || 'melee';
          const mod = activeChar && (activeChar as any)[matchedAbility] !== undefined
            ? (activeChar as any)[matchedAbility]
            : (activeChar ? activeChar.melee : 0);

          const roll = resolveD616Roll({
            ability_modifier: mod,
            target_number: tn,
            edges,
            troubles,
          });

          const s1 = roll.raw_dice.standard_1;
          const m = roll.raw_dice.marvel_die;
          const s2 = roll.raw_dice.standard_2;
          const mDisplay = m === 1 ? 'M (counts as 6)' : `${m}`;
          const reportCode = `[${s1}, ${s2}, ${m} (Marvel)]`;

          responseContent =
            `🎲 **Player Action Check Reported:** \`${reportCode}\`\n` +
            `- Dice: Standard [${s1}], Marvel [${mDisplay}], Standard [${s2}] + ${matchedAbility.toUpperCase()} (+${mod}) = **${roll.total_score}**\n` +
            `${
              roll.is_fantastic
                ? '⭐ **FANTASTIC CHECK!** (Marvel Die 1 counts as 6 and triggers fantastic outcome)\n'
                : ''
            }` +
            `${roll.is_ultimate ? '🌟 **ULTIMATE 616 CHECK!** Perfect roll!\n' : ''}` +
            `${roll.is_botch ? '💀 **BOTCH!** Critical failure!\n' : ''}` +
            `${
              tn !== null
                ? roll.success
                  ? `✅ **SUCCESS** vs TN ${tn}`
                  : `❌ **FAILURE** vs TN ${tn}`
                : ''
            }`;

          metadata = { type: 'reported_roll', diceResult: roll, reportCode, ability: matchedAbility };
          break;
        }

        case 'roll': {
          const edges = args.includes('--edge') || args.includes('edge') ? 1 : 0;
          const troubles = args.includes('--trouble') || args.includes('trouble') ? 1 : 0;
          const tnArg = args.find(a => a.startsWith('--tn=') || !isNaN(Number(a)));
          const tn = tnArg ? parseInt(tnArg.replace('--tn=', ''), 10) : null;
          const activeChar = this.getActiveCharacter();
          const mod = activeChar ? activeChar.melee : 0;

          const roll = resolveD616Roll({
            ability_modifier: mod,
            target_number: tn,
            edges,
            troubles,
          });

          responseContent =
            `🎲 **d616 Roll Result**: Standard [${roll.raw_dice.standard_1}], Marvel **[${roll.raw_dice.marvel_die}]**, Standard [${roll.raw_dice.standard_2}]\n` +
            `- Total: **${roll.total_score}** (Dice: ${
              roll.raw_dice.standard_1 +
              (roll.raw_dice.marvel_die === 1 ? 6 : roll.raw_dice.marvel_die) +
              roll.raw_dice.standard_2
            } + Mod: ${mod})\n` +
            `${
              roll.is_fantastic
                ? '⭐ **FANTASTIC CHECK!** (Marvel Die 1 counts as 6 and triggers fantastic outcome)\n'
                : ''
            }` +
            `${roll.is_ultimate ? '🌟 **ULTIMATE 616 CHECK!** Perfect roll!\n' : ''}` +
            `${roll.is_botch ? '💀 **BOTCH!** Critical failure!\n' : ''}` +
            `${
              tn !== null
                ? roll.success
                  ? `✅ **SUCCESS** vs TN ${tn}`
                  : `❌ **FAILURE** vs TN ${tn}`
                : ''
            }`;

          metadata = { type: 'dice_roll', diceResult: roll };
          break;
        }

        case 'rules':
        case 'rule': {
          const query = args.join(' ');
          if (!query || query.toLowerCase() === 'index' || query.toLowerCase() === 'list') {
            const index = rulesDatabase.getRulesIndex();
            const topSets = index.power_sets
              .filter((ps: any) => ps.power_count > 0)
              .slice(0, 6)
              .map((ps: any) => `\`${ps.name}\` (${ps.power_count})`)
              .join(', ');

            responseContent =
              `### 📖 Marvel Multiverse RPG Rules Index\n` +
              `The database contains **${index.stats.total_mechanics} Core Mechanics**, **${index.stats.total_powers} Powers** across **${index.stats.total_power_sets} Power Sets**, **${index.stats.total_origins} Origins**, and **${index.stats.total_occupations} Occupations**.\n\n` +
              `* **Core Mechanics**: \`d616_basics\`, \`fantastic_roll\`, \`botch_ultimate_616\`, \`edges_troubles\`, \`melee\`, \`agility\`, \`resilience\`, \`vigilance\`, \`ego\`, \`logic\`, \`damage_formula\`, \`running_speed\`\n` +
              `* **Key Power Sets**: ${topSets}, etc.\n` +
              `* **Origins**: Alien, High-Tech, Magic, Mutant, Special Training, Cybernetics, Inhuman, etc.\n` +
              `* **Occupations**: Adventurer, Assassin, Criminal, Law Enforcement, Scientist, Spy, etc.\n\n` +
              `💡 **Usage:** Query any rule with \`/rules <keyword>\` (e.g. \`/rules d616\`, \`/rules running_speed\`, \`/rules spider-powers\`), or switch to the **RULES** tab for the full interactive visual index!`;
          } else {
            const results = rulesDatabase.queryRules(query);
            if (results.exactMatch) {
              const em = results.exactMatch;
              responseContent =
                `### Rule Citation: ${em.title || em.name}\n` +
                `- Category: **${em.category || 'General'}**\n` +
                `- Description: ${em.description || em.summary}\n` +
                (em.formula ? `- Formula: \`${em.formula}\`\n` : '') +
                (em.examples ? `- Examples: ${em.examples.join('; ')}\n` : '');
            } else if (results.powerMatches.length > 0 || results.mechanicsMatches.length > 0) {
              const pItems = results.powerMatches
                .slice(0, 3)
                .map(p => `* **${p.name}** (Rank ${p.rank_required}): ${p.description}`)
                .join('\n');
              const mItems = results.mechanicsMatches
                .slice(0, 3)
                .map(m => `* **${m.title}**: ${m.description}`)
                .join('\n');
              responseContent = `### Search Results for "${query}"\n${
                pItems ? `**Powers:**\n${pItems}\n` : ''
              }${mItems ? `**Mechanics:**\n${mItems}\n` : ''}`;
            } else {
              responseContent = `No matching rules or powers found for "${query}". Try searching for \`d616\`, \`attack\`, \`claws\`, or \`armor\`.`;
            }
          }
          metadata = { type: 'rule_citation' };
          break;
        }

        case 'combat': {
          const state = combatTracker.getCombatState();
          const lines = state.combatants.map(
            c =>
              `* ${c.is_active_turn ? '👉 ' : ''}**${c.name}** [${c.side.toUpperCase()}] ${
                c.initiative != null ? `*(Init: ${c.initiative})* ` : ''
              }— Health: **${c.current_health}/${c.max_health}** | Focus: **${c.current_focus}/${c.max_focus}** ${
                c.is_active_turn ? '⭐ **CURRENT TURN**' : ''
              }${c.conditions.length > 0 ? ` (${c.conditions.join(', ')})` : ''}`
          );
          responseContent = `### Active Combat Encounter (Round ${state.round}, Current Turn: ${state.active_combatant || 'None'})\n${
            lines.length > 0 ? lines.join('\n') : 'No active combatants in combat.'
          }`;
          metadata = { type: 'combat', combatResult: state };
          break;
        }

        case 'attack': {
          const target = args[0] || 'Green Goblin';
          const ability = (args[1] || 'melee').toLowerCase();
          const activeChar = this.getActiveCharacter();
          const attacker = activeChar ? activeChar.name : 'Spider-Man';

          try {
            const attackResult = combatTracker.resolvePlayerAttack({
              attacker_name: attacker,
              target_name: target,
              ability: ability as any,
            });

            responseContent =
              `⚔️ **${attacker}** attacks **${target}** using **${ability.toUpperCase()}**!\n` +
              `- Roll: Standard [${attackResult.roll.raw_dice.standard_1}], Marvel **[${attackResult.roll.raw_dice.marvel_die}]**, Standard [${attackResult.roll.raw_dice.standard_2}] + Mod: **${attackResult.roll.ability_modifier}**\n` +
              `- Total Check: **${attackResult.roll.total_score}** vs Defense TN **${attackResult.target_number}**\n` +
              (attackResult.roll.is_fantastic ? `⭐ **FANTASTIC ATTACK!**\n` : '') +
              (attackResult.roll.success
                ? `💥 **HIT!** Dealt **${attackResult.damage.total_damage}** damage (${attackResult.attacker.rank} Rank × ${attackResult.damage.effective_marvel_die} Marvel Die) to ${target}'s health!\n- ${target} Health: **${attackResult.target.current_health}/${attackResult.target.max_health}**`
                : `🛡️ **MISS!** ${target} evaded the strike.`);

            metadata = { type: 'combat', combatResult: attackResult };
          } catch (err: any) {
            responseContent = `Error resolving attack: ${err.message}`;
          }
          break;
        }

        case 'npc-attack': {
          const attacker = args[0] || 'Green Goblin';
          const target = args[1] || (this.getActiveCharacter()?.name || 'Spider-Man');

          try {
            const attackResult = combatTracker.resolveNpcAction({
              attacker_name: attacker,
              target_name: target,
              ability: 'agility',
            });

            responseContent =
              `💥 **${attacker}** strikes at **${target}** with high-velocity munitions!\n` +
              `- Roll Check: **${attackResult.roll.total_score}** vs Defense TN **${attackResult.target_number}**\n` +
              (attackResult.roll.success
                ? `🔥 **HIT!** ${attacker} inflicts **${attackResult.damage.total_damage}** damage on ${target}!\n- ${target} Health: **${attackResult.target.current_health}/${attackResult.target.max_health}**`
                : `💨 **DODGED!** ${target} vaults out of the way!`);

            metadata = { type: 'combat', combatResult: attackResult };
          } catch (err: any) {
            responseContent = `Error resolving NPC action: ${err.message}`;
          }
          break;
        }

        case 'memories': {
          const log = campaignManager.getEventLog();
          const mems = campaignManager.searchMemories('');
          responseContent =
            `### Campaign Memories & Chronology\n` +
            `**Key Entities:**\n` +
            mems.map(m => `* **${m.title}** (${m.category}): ${m.details}`).join('\n') +
            `\n\n**Recent Events Log:**\n` +
            log
              .slice(-5)
              .map(l => `* ${l}`)
              .join('\n');
          break;
        }

        case 'campaign':
        case 'plan': {
          const sub = (args[0] || '').toLowerCase();
          const rest = args.slice(1).join(' ').trim();

          if (sub === 'set-villain' && rest) {
            campaignManager.updatePlan({ villain: rest });
            const plan = campaignManager.getPlan()!;
            responseContent = `🦹 **Campaign Villain Updated**: Primary nemesis is now **${plan.villain}**! The Narrator AI will adapt all future narrative arcs and encounters accordingly.`;
          } else if ((sub === 'set-objective' || sub === 'objective') && rest) {
            const ctx = campaignManager.getCurrentSessionContext();
            if (ctx) {
              campaignManager.updateSession(ctx.session.session_number, { primary_objective: rest });
              responseContent = `🎯 **Mission Objective Updated**: Episode ${ctx.session.session_number}'s primary objective is now: **"${rest}"**. The Narrator AI will steer the scene toward this goal.`;
            } else {
              responseContent = `No active campaign session found.`;
            }
          } else if ((sub === 'set-theme' || sub === 'theme') && rest) {
            campaignManager.updatePlan({ theme: rest });
            responseContent = `🗺️ **Campaign Theme Updated**: Campaign arc title is now **"${rest}"**.`;
          } else if ((sub === 'set-session' || sub === 'session') && rest) {
            const num = parseInt(rest, 10);
            if (!isNaN(num)) {
              campaignManager.updatePlan({ current_session: num });
              const ctx = campaignManager.getCurrentSessionContext()!;
              responseContent = `⏩ **Active Episode Changed**: Now playing **Episode ${ctx.session.session_number}: ${ctx.session.title}** (${ctx.session.act})!\n- **Objective**: ${ctx.session.primary_objective}`;
            } else {
              responseContent = `Please provide a valid session number. Example: \`/campaign set-session 2\``;
            }
          } else if (sub === 'edit') {
            responseContent = `📝 **Campaign Editing**: Click the **"Edit Campaign Plan"** button in the top action bar or status sidebar, or use quick commands:\n- \`/campaign set-villain <name>\`\n- \`/campaign set-objective <text>\`\n- \`/campaign set-session <number>\`\n- \`/campaign set-theme <theme>\``;
          } else {
            // Display summary
            const ctx = campaignManager.getCurrentSessionContext();
            if (ctx) {
              const p = ctx.plan;
              const s = ctx.session;
              responseContent =
                `### 🗺️ Active Campaign: ${p.theme}\n` +
                `- **Arch-Villain**: ${p.villain}\n` +
                `- **Hero Team**: ${p.hero_team.join(', ')}\n` +
                `- **Active Episode**: Episode ${s.session_number} of ${p.sessions.length}: **${s.title}** (${s.act})\n` +
                `- **Current Objective**: ${s.primary_objective}\n` +
                `- **Briefing**: ${s.briefing}\n` +
                (s.complications?.length ? `- **Complications**: ${s.complications.join(', ')}\n` : '') +
                (s.key_encounters?.length ? `- **Key Encounters**: ${s.key_encounters.join(', ')}\n` : '') +
                (p.notes ? `- **GM Directives / Notes**: ${p.notes}\n` : '') +
                `\n*Tip: Click the "Edit Campaign" button or type \`/campaign set-objective <text>\` to change the plan at any time!*`;
            } else {
              responseContent = `No active campaign plan found.`;
            }
          }
          break;
        }

        default:
          responseContent = `Unknown command \`/${command}\`. Type \`/help\` for available actions.`;
      }

      const assistantMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toLocaleTimeString(),
        modelUsed: 'command-router',
        metadata,
      };
      this.messages.push(assistantMsg);
      return assistantMsg;
    }

    // 3. Multi-turn Gemini Narrative Generation!
    // Re-verify client in case env vars were loaded
    if (!this.aiClient) {
      this.initAIClient();
    }

    const contextPrompt = this.buildContextInjection(trimmed);
    const activeRole = this.getRole();

    const fullSystemInstruction = `${activeRole.instruction}

GAME SYSTEM RULES (Marvel Multiverse Role-Playing Game):
1. Action checks are rolled as d616: Standard Die 1, Marvel Die, Standard Die 2.
2. A 1 on the Marvel Die is the Marvel Logo (Fantastic Roll) and counts as 6.
3. Damage calculation: Attacker Rank multiplied by the effective Marvel Die result.
4. Target Numbers (TN) typically equal the defender's ability defense score (10 + ability score).
5. Always acknowledge the hero's chosen actions, incorporate active status changes, and advance the scene dynamically.
6. Keep narration concise, evocative, and punchy (1 to 3 paragraphs). Always prompt what the hero or team does next.

LIVE GAME STATE & ACTIVE SCENE CONTEXT:
${contextPrompt}`;

    let reply = '';
    let modelUsed = this.modelName;

    if (this.aiClient) {
      try {
        // Build multi-turn history contents for @google/genai
        // The first content in Gemini API must always have role 'user'
        const recentMessages = this.messages.slice(-16);
        const rawTurns: Array<{ role: 'user' | 'model'; text: string }> = [];

        for (const m of recentMessages) {
          if (m.role === 'user' && m.content.trim()) {
            rawTurns.push({ role: 'user', text: m.content });
          } else if (m.role === 'assistant' && m.content.trim()) {
            rawTurns.push({ role: 'model', text: m.content });
          }
        }

        // Find the index of the first 'user' message
        const firstUserIndex = rawTurns.findIndex(t => t.role === 'user');
        const validTurns = firstUserIndex >= 0 ? rawTurns.slice(firstUserIndex) : [{ role: 'user' as const, text: trimmed }];

        // Consolidate consecutive turns with the same role
        const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
        for (const turn of validTurns) {
          if (contents.length > 0 && contents[contents.length - 1].role === turn.role) {
            contents[contents.length - 1].parts[0].text += `\n\n${turn.text}`;
          } else {
            contents.push({
              role: turn.role,
              parts: [{ text: turn.text }],
            });
          }
        }

        // Final sanity check: ensure contents starts with user
        while (contents.length > 0 && contents[0].role !== 'user') {
          contents.shift();
        }

        if (contents.length === 0) {
          contents.push({ role: 'user', parts: [{ text: trimmed }] });
        }

        const candidateModels = [this.modelName, 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'].filter(
          (m, i, arr) => arr.indexOf(m) === i
        );

        for (const candidate of candidateModels) {
          try {
            console.log(`[Narrator Gemini] Calling ${candidate} with ${contents.length} turns...`);
            const response = await this.aiClient.models.generateContent({
              model: candidate,
              contents,
              config: {
                systemInstruction: fullSystemInstruction,
              },
            });

            if (response.text) {
              reply = response.text;
              modelUsed = candidate === this.modelName ? candidate : `${candidate} (active)`;
              console.log(`[Narrator Gemini] Successfully generated with ${candidate}!`);
              break;
            }
          } catch (modelErr: any) {
            console.warn(`[Narrator Gemini] Model ${candidate} failed:`, modelErr?.message || modelErr);
          }
        }
      } catch (err: any) {
        console.warn('[Narrator Gemini] Generation loop error:', err?.message || err);
      }
    }

    if (!reply) {
      // Deterministic simulation fallback ensuring application always works smoothly
      reply = this.generateSimulatedNarration(trimmed, activeRole);
      modelUsed = 'Narrator Engine (Offline Mode)';
    }

    const assistantMsg: ChatMessage = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date().toLocaleTimeString(),
      modelUsed,
      metadata: { type: 'narration', roleUsed: activeRole.id },
    };
    this.messages.push(assistantMsg);
    return assistantMsg;
  }

  private generateSimulatedNarration(playerAction: string, role: NarratorRole): string {
    const char = this.getActiveCharacter() || characterRoster.getSheet('Spider-Man')!;
    const lower = playerAction.toLowerCase();
    const campaignCtx = campaignManager.getCurrentSessionContext();
    const villain = campaignCtx?.plan.villain || 'the villain';
    const theme = campaignCtx?.plan.theme || 'the saga';
    const session = campaignCtx?.session;
    const episodeTitle = session?.title || 'the current battle';
    const objective = session?.primary_objective || 'stop the mastermind and protect the city';
    const complication = session?.complications?.length ? session.complications[0] : 'civilian safety in jeopardy';

    if (
      lower.includes('attack') ||
      lower.includes('punch') ||
      lower.includes('web') ||
      lower.includes('shoot') ||
      lower.includes('strike')
    ) {
      const roll = resolveD616Roll({ ability_modifier: char.melee, target_number: 14 });
      const hit = roll.success;
      return (
        `💥 **Action Resolution:**\n` +
        `You lunge forward with ${char.name}'s signature agility! *(Roll: ${roll.total_score} vs TN 14 ${
          roll.is_fantastic ? '⭐ FANTASTIC!' : ''
        })*\n\n` +
        (hit
          ? `Your strike lands with bone-jarring impact! The force knocks the enforcers of **${villain}** sprawling across the field. Ahead, you press closer toward your objective: *"${objective}"*. Debris crashes down as enemy reinforcements scramble to safeguard ${villain}'s operation.\n\n*"Is that the best ${villain}'s crew can do?"* you quip, regrouping in the midst of ${theme}.`
          : `You fire off a rapid sequence, but ${villain}'s lieutenants duck behind reinforced blast shields just in time! Shrapnel ricochets across the perimeter, triggering a complication: *${complication}*!`) +
        `\n\n*What is your next move to advance on ${villain}?*`
      );
    }

    if (
      lower.includes('look') ||
      lower.includes('scan') ||
      lower.includes('investigate') ||
      lower.includes('search')
    ) {
      return (
        `🔍 **Sensory Scan & Tactical Recon:**\n` +
        `Your heightened senses survey the active conflict zone in **${theme}** (*${episodeTitle}*).\n\n` +
        `You lock eyes on the immediate threat perimeter orchestrated by **${villain}**. Tactical markers indicate: *"${objective}"*.\n` +
        `Environmental warning: *${complication}*. You spot a tactical datapad left by ${villain}'s vanguard detailing their fallback vectors!`
      );
    }

    return (
      `🕸️ **The Multiverse Reacts:**\n` +
      `${char.name} executes your maneuver with precision. The crowd below rallies with hope as your heroic intervention thwarts ${villain}'s initial gambit in **${theme}**.\n\n` +
      `Your current mission directive remains clear: *"${objective}"*.\n` +
      `From the swirling smoke, a comm-link crackles with ${villain}'s taunting broadcast: *"You cannot stop what is coming!"*\n\n` +
      `What is your next move, hero?`
    );
  }

  public async rollAndReport(options: {
    ability?: string;
    ability_modifier?: number;
    target_number?: number | null;
    edges?: number;
    troubles?: number;
    actionDescription?: string;
    narrate_outcome?: boolean;
    preRolledResult?: any;
    model?: string;
    role?: string;
  }): Promise<{
    rollResult: any;
    userMessage: ChatMessage;
    assistantMessage: ChatMessage;
    messages: ChatMessage[];
  }> {
    if (options.model) this.setModel(options.model);
    if (options.role) this.setRole(options.role);

    const activeChar = this.getActiveCharacter() || characterRoster.getSheet('Spider-Man')!;
    const abilityName = (options.ability || 'melee').toLowerCase();

    let roll: any;
    if (options.preRolledResult) {
      roll = options.preRolledResult;
    } else {
      let abilityMod = options.ability_modifier;
      if (abilityMod === undefined) {
        if (activeChar && (activeChar as any)[abilityName] !== undefined) {
          abilityMod = (activeChar as any)[abilityName];
        } else {
          abilityMod = 0;
        }
      }

      roll = resolveD616Roll({
        ability_modifier: abilityMod,
        target_number: options.target_number ?? null,
        edges: options.edges ?? 0,
        troubles: options.troubles ?? 0,
      });
    }

    const s1 = roll.raw_dice.standard_1;
    const m = roll.raw_dice.marvel_die;
    const s2 = roll.raw_dice.standard_2;
    const mDisplay = m === 1 ? 'M (counts as 6)' : `${m}`;
    const reportCode = `[${s1}, ${s2}, ${m} (Marvel)]`;

    let checkOutcome = '';
    if (roll.is_ultimate) checkOutcome = '🌟 ULTIMATE 616 CHECK!';
    else if (roll.is_botch) checkOutcome = '💀 BOTCH (Critical Failure)!';
    else if (roll.is_fantastic) checkOutcome = '⭐ FANTASTIC ROLL!';
    else if (roll.target_number !== null && roll.target_number !== undefined) {
      checkOutcome = roll.success
        ? `✅ SUCCESS vs TN ${roll.target_number}`
        : `❌ FAILED vs TN ${roll.target_number}`;
    }

    const desc = options.actionDescription?.trim()
      ? `**Action Attempted:** "${options.actionDescription.trim()}"\n\n`
      : '';

    const userMessageContent =
      `${desc}🎲 **Reported d616 Roll:** \`${reportCode}\`\n` +
      `- Dice Breakdown: Standard **[${s1}]**, Marvel **[${mDisplay}]**, Standard **[${s2}]** + ${abilityName.toUpperCase()} (+${roll.ability_modifier}) = **${roll.total_score}**` +
      (roll.target_number ? ` (Target Number TN: **${roll.target_number}**)` : '') +
      (checkOutcome ? `\n- Outcome: **${checkOutcome}**` : '');

    const userMessage: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: userMessageContent,
      timestamp: new Date().toLocaleTimeString(),
      metadata: {
        type: 'reported_roll',
        rollResult: roll,
        ability: abilityName,
        actionDescription: options.actionDescription,
        reportCode,
      },
    };
    this.messages.push(userMessage);

    const activeRole = this.getRole();
    let reply = '';
    let modelUsed = this.modelName;

    if (options.narrate_outcome !== false) {
      if (!this.aiClient) {
        this.initAIClient();
      }

      if (this.aiClient) {
        try {
          const contextPrompt = this.buildContextInjection(userMessageContent);
          const fullSystemInstruction = `${activeRole.instruction}

GAME SYSTEM RULES (Marvel Multiverse Role-Playing Game):
1. Action checks are rolled as d616: Standard Die 1, Marvel Die, Standard Die 2.
2. A 1 on the Marvel Die is the Marvel Logo (Fantastic Roll) and counts as 6.
3. Damage calculation: Attacker Rank multiplied by the effective Marvel Die result.
4. Target Numbers (TN) typically equal the defender's ability defense score (10 + ability score).
5. The player just executed a live d616 action check and reported the dice roll outcome into the scene.
6. Acknowledge this roll directly! Incorporate whether it succeeded, failed, or was a Fantastic roll into the immediate dramatic scene action. Keep the pace cinematic and vivid (1-3 punchy paragraphs), concluding with what happens next.

LIVE GAME STATE & ACTIVE SCENE CONTEXT:
${contextPrompt}`;

          const recentMessages = this.messages.slice(-16);
          const rawTurns: Array<{ role: 'user' | 'model'; text: string }> = [];

          for (const m of recentMessages) {
            if (m.role === 'user' && m.content.trim()) {
              rawTurns.push({ role: 'user', text: m.content });
            } else if (m.role === 'assistant' && m.content.trim()) {
              rawTurns.push({ role: 'model', text: m.content });
            }
          }

          const firstUserIndex = rawTurns.findIndex(t => t.role === 'user');
          const validTurns =
            firstUserIndex >= 0
              ? rawTurns.slice(firstUserIndex)
              : [{ role: 'user' as const, text: userMessageContent }];

          const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
          for (const turn of validTurns) {
            if (contents.length > 0 && contents[contents.length - 1].role === turn.role) {
              contents[contents.length - 1].parts[0].text += `\n\n${turn.text}`;
            } else {
              contents.push({ role: turn.role, parts: [{ text: turn.text }] });
            }
          }

          while (contents.length > 0 && contents[0].role !== 'user') {
            contents.shift();
          }
          if (contents.length === 0) {
            contents.push({ role: 'user', parts: [{ text: userMessageContent }] });
          }

          const candidateModels = [
            this.modelName,
            'gemini-2.5-flash',
            'gemini-2.0-flash',
            'gemini-2.5-flash-lite',
            'gemini-2.5-pro',
          ].filter((m, i, arr) => arr.indexOf(m) === i);

          for (const candidate of candidateModels) {
            try {
              const response = await this.aiClient.models.generateContent({
                model: candidate,
                contents,
                config: {
                  systemInstruction: fullSystemInstruction,
                },
              });

              if (response.text) {
                reply = response.text;
                modelUsed = candidate === this.modelName ? candidate : `${candidate} (active)`;
                break;
              }
            } catch (err: any) {
              console.warn(`[Narrator Gemini Roll Report] ${candidate} failed:`, err?.message || err);
            }
          }
        } catch (genErr) {
          console.warn('[Narrator Gemini Roll Report] generation error:', genErr);
        }
      }

      if (!reply) {
        reply = this.generateSimulatedRollNarration(
          roll,
          abilityName,
          options.actionDescription,
          activeRole,
          activeChar
        );
        modelUsed = 'Narrator Engine (Offline Mode)';
      }
    } else {
      reply =
        `🎲 **Roll Recorded into Session:** \`${reportCode}\` with total score **${roll.total_score}**.` +
        (checkOutcome ? ` Outcome: **${checkOutcome}**.` : '');
      modelUsed = 'd616-engine';
    }

    const assistantMessage: ChatMessage = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date().toLocaleTimeString(),
      modelUsed,
      metadata: {
        type: 'reported_roll_response',
        rollResult: roll,
        roleUsed: activeRole.id,
      },
    };
    this.messages.push(assistantMessage);

    return {
      rollResult: roll,
      userMessage,
      assistantMessage,
      messages: this.getMessages(),
    };
  }

  private generateSimulatedRollNarration(
    roll: any,
    ability: string,
    actionDesc: string | undefined,
    role: NarratorRole,
    char: any
  ): string {
    const isSuccess = roll.success ?? roll.total_score >= 15;
    const isFantastic = roll.is_fantastic;
    const isBotch = roll.is_botch;
    const isUltimate = roll.is_ultimate;

    const campaignCtx = campaignManager.getCurrentSessionContext();
    const villain = campaignCtx?.plan.villain || 'the villain';
    const objective = campaignCtx?.session.primary_objective || 'the mission objective';

    if (isUltimate) {
      return (
        `🌟 **ULTIMATE 616 TRIUMPH!**\n\n` +
        `The dice align in cosmic harmony—a pure 616! With breathtaking, unassailable mastery, ${char.name} executes the maneuver! ` +
        (actionDesc ? `("${actionDesc}") ` : '') +
        `The enforcers of **${villain}** are utterly overwhelmed as shockwaves tear across the pavement, thrusting you directly toward: *"${objective}"*!\n\n` +
        `*True Believer, that's what legends are made of! What do you follow up with?*`
      );
    }

    if (isBotch) {
      return (
        `💀 **DISASTROUS BOTCH! (1-1-1)**\n\n` +
        `Fate takes a cruel, jagged turn! The footing gives way beneath ${char.name}'s boots just as you commit to the action. ` +
        (actionDesc ? `Instead of executing "${actionDesc}", ` : '') +
        `your momentum betrays you, sending you skidding across loose debris right into **${villain}**'s crosshairs!\n\n` +
        `*A sinister chuckle echoes as ${villain}'s forces prepare to capitalize on this critical blunder. How do you recover?!*`
      );
    }

    if (isFantastic && isSuccess) {
      return (
        `⭐ **FANTASTIC SUCCESS! (Marvel Logo 6!)**\n\n` +
        `The Marvel die blazes with heroic resonance! ${char.name} surges forward with sudden, electrifying inspiration. ` +
        (actionDesc ? `Executing: "${actionDesc}". ` : '') +
        `Not only do you smash through the target's threshold with a total score of **${roll.total_score}**, but the Fantastic surge triggers an extraordinary breakthrough toward *"${objective}"*! **${villain}**'s equipment sparks violently, exposing their weak point to your next strike!\n\n` +
        `*"Excelsior!"* The momentum is completely in your hands. How do you press your advantage?`
      );
    }

    if (isSuccess) {
      return (
        `💥 **CHECK SUCCESSFUL! (Total Score: ${roll.total_score})**\n\n` +
        `Solid execution! ${char.name} locks in, applying ${ability.toUpperCase()} prowess with battle-tested precision. ` +
        (actionDesc ? `You carry out: "${actionDesc}". ` : '') +
        `The check clears the challenge, pushing ${villain}'s perimeter back and advancing on: *"${objective}"*!\n\n` +
        `*The dust clears and ${villain}'s squad re-evaluates you with newfound caution. What is your next move, hero?*`
      );
    }

    return (
      `🛡️ **CHECK FAILED (Total Score: ${roll.total_score})**\n\n` +
      `Close, but ${villain}'s opposition anticipates your vector! ` +
      (actionDesc ? `Attempting "${actionDesc}", ` : '') +
      `${char.name}'s action misses the critical threshold. The enemy parries or sidesteps in the nick of time, forcing you onto the defensive as counter-fire peppers the surrounding area.\n\n` +
      `*You reset your stance amidst the smoke. What is your reaction?*`
    );
  }

  public isOnline(): boolean {
    return this.aiClient !== null;
  }

  public getApiKeyStatus(): { configured: boolean; message: string } {
    const key = process.env.GEMINI_API_KEY || process.env.API_KEY || '';
    if (!key || key.startsWith('MY_')) {
      return {
        configured: false,
        message: 'No GEMINI_API_KEY environment variable detected on the server. The application is operating in local Simulation Fallback (Offline) mode.',
      };
    }
    return {
      configured: true,
      message: 'GEMINI_API_KEY is configured on the server. AI Narrator online.',
    };
  }
}

export const narratorEngine = new NarratorEngine();
