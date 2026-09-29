/**
 * Unified Marvel Multiverse RPG Narrator Controller with Context Injection.
 * Ported faithfully from marvel_mcp_narrator/core/session_controller.py & cli.py & discord_bot.py
 */

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
  metadata?: {
    type?: 'command' | 'narration' | 'dice_roll' | 'combat' | 'rule_citation';
    diceResult?: any;
    combatResult?: any;
    ruleCitation?: any;
  };
}

export class NarratorEngine {
  private messages: ChatMessage[] = [];
  private activeCharacterName: string = "Spider-Man";
  private aiClient: GoogleGenAI | null = null;
  private modelName: string = process.env.NARRATOR_MODEL || "gemini-2.5-flash";

  constructor() {
    this.initAIClient();
    this.seedInitialMessages();
  }

  private initAIClient() {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (apiKey) {
      try {
        this.aiClient = new GoogleGenAI({ apiKey });
      } catch (e) {
        console.warn("Could not initialize GoogleGenAI client:", e);
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

  private seedInitialMessages() {
    this.messages.push({
      id: 'msg_welcome',
      role: 'assistant',
      content: `💥 **Welcome to the Marvel Multiverse RPG Narrator AI!** 💥\n\nI am your automated Narrator and Game Master. You are currently playing as **Spider-Man (Rank 4 Striker)**.\n\n* **Actions & Roleplay**: Type what your character attempts to do.\n* **Slash Commands**: \`/roll\`, \`/rules <keyword>\`, \`/attack <target>\`, \`/combat\`, \`/memories\`.\n* **Manual Rolls**: Report physical dice like \`[4, 5, 1 (Marvel)]\`.\n\n*The sirens wail across Midtown Manhattan. Smoke billows from the roof of the Roosevelt Hotel. What do you do, hero?*`,
      timestamp: new Date().toLocaleTimeString(),
      metadata: { type: 'narration' },
    });
  }

  public getMessages(): ChatMessage[] {
    return [...this.messages];
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
- Power Sets: ${sheet.power_sets.map(p => typeof p === 'string' ? p : p.name).join(', ')}`);
    }

    // 2. Active Combat State
    const combatState = combatTracker.getCombatState();
    if (combatState.combatants.length > 0) {
      const combatSummary = combatState.combatants
        .map(c => `${c.name} (${c.side.toUpperCase()}): HP ${c.current_health}/${c.max_health}, Focus ${c.current_focus}/${c.max_focus}`)
        .join(' | ');
      sections.push(`[ACTIVE COMBATANTS]\n${combatSummary}`);
    }

    // 3. Campaign Briefing
    const campaignCtx = campaignManager.getCurrentSessionContext();
    if (campaignCtx) {
      sections.push(`[CAMPAIGN: ${campaignCtx.plan.theme}]
- Villain: ${campaignCtx.plan.villain}
- Current Session (${campaignCtx.session.act}): ${campaignCtx.session.briefing}`);
    }

    // 4. Keyword Rule Hit Citations
    const tokens = userPrompt.toLowerCase().split(/\W+/).filter(t => t.length > 3);
    const ruleHits: string[] = [];
    for (const token of tokens) {
      const match = rulesDatabase.lookupRule(token);
      if (match) {
        if (match.entry_type === 'power') {
          ruleHits.push(`- Power [${match.name}]: Category ${match.category}, Rank ${match.rank_required}. ${match.description}`);
        } else {
          ruleHits.push(`- Mechanic [${match.title}]: ${match.description} ${match.formula ? `(Formula: ${match.formula})` : ''}`);
        }
      }
    }
    if (ruleHits.length > 0) {
      sections.push(`[RELEVANT RULE CITATIONS]\n${ruleHits.slice(0, 3).join('\n')}`);
    }

    return sections.join('\n\n');
  }

  public async handleInput(userText: string): Promise<ChatMessage> {
    const trimmed = userText.trim();
    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString(),
    };
    this.messages.push(userMsg);

    // 1. Check for manual roll pattern: e.g. [4, 5, 1 (Marvel)] or [3, 1, 4]
    const manualMatch = trimmed.match(/\[\s*(\d)\s*,\s*(\d)\s*,\s*(\d)(?:\s*\((?:marvel|m)\))?\s*\]/i);
    if (manualMatch) {
      const d1 = parseInt(manualMatch[1], 10);
      const d2 = parseInt(manualMatch[2], 10);
      const d3 = parseInt(manualMatch[3], 10);
      const manualRoll = combatTracker.resolveManualRoll({
        dice_values: [d1, d2, d3],
        marvel_index: 1,
      });

      const responseContent = `🎲 **Manual d616 Roll Recorded:** [${manualRoll.dice_values.join(', ')}]\n` +
        `- Total Score: **${manualRoll.total_score}**\n` +
        `- Marvel Die: **${manualRoll.raw_dice.marvel_die}** ${manualRoll.is_fantastic ? '⭐ **FANTASTIC ROLL!**' : ''}\n` +
        `${manualRoll.is_ultimate ? '🌟 **ULTIMATE 616 SUCCESS!**\n' : ''}` +
        `${manualRoll.is_botch ? '💀 **BOTCH (Critical Failure)!**\n' : ''}`;

      const assistantMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        role: 'assistant',
        content: responseContent,
        timestamp: new Date().toLocaleTimeString(),
        metadata: { type: 'dice_roll', diceResult: manualRoll },
      };
      this.messages.push(assistantMsg);
      return assistantMsg;
    }

    // 2. Check for slash command
    if (trimmed.startsWith('/') || trimmed.startsWith('!')) {
      const cleanCmd = trimmed.substring(1).trim();
      const parts = cleanCmd.split(/\s+/);
      const command = parts[0].toLowerCase();
      const args = parts.slice(1);

      let responseContent = "";
      let metadata: any = { type: 'command' };

      switch (command) {
        case 'help': {
          responseContent = `### Marvel Multiverse RPG Narrator Commands
- \`/roll [edges] [troubles] [modifier] [tn]\` : Roll d616 check
- \`/rules <keyword>\` : Search Marvel rulebook and power database
- \`/combat\` : Show combat status & health/focus pools
- \`/attack <target> [ability]\` : Resolve a player attack (defaults to Melee or Agility)
- \`/npc-attack <attacker> <target>\` : Resolve an enemy strike against player
- \`/memories\` : View campaign plot log and recorded entities
- \`[d1, d2, d3 (Marvel)]\` : Report a manual physical dice roll`;
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

          responseContent = `🎲 **d616 Roll Result**: Standard [${roll.raw_dice.standard_1}], Marvel **[${roll.raw_dice.marvel_die}]**, Standard [${roll.raw_dice.standard_2}]\n` +
            `- Total: **${roll.total_score}** (Dice: ${roll.raw_dice.standard_1 + (roll.raw_dice.marvel_die === 1 ? 6 : roll.raw_dice.marvel_die) + roll.raw_dice.standard_2} + Mod: ${mod})\n` +
            `${roll.is_fantastic ? '⭐ **FANTASTIC CHECK!** (Marvel Die 1 counts as 6 and triggers fantastic outcome)\n' : ''}` +
            `${roll.is_ultimate ? '🌟 **ULTIMATE 616 CHECK!** Perfect roll!\n' : ''}` +
            `${roll.is_botch ? '💀 **BOTCH!** Critical failure!\n' : ''}` +
            `${tn !== null ? (roll.success ? `✅ **SUCCESS** vs TN ${tn}` : `❌ **FAILURE** vs TN ${tn}`) : ''}`;

          metadata = { type: 'dice_roll', diceResult: roll };
          break;
        }

        case 'rules':
        case 'rule': {
          const query = args.join(' ');
          if (!query) {
            responseContent = "Please provide a rule keyword, e.g. `/rules healing` or `/rules fantastic_roll`";
          } else {
            const results = rulesDatabase.queryRules(query);
            if (results.exactMatch) {
              const em = results.exactMatch;
              responseContent = `### Rule Citation: ${em.title || em.name}\n` +
                `- Category: **${em.category || 'General'}**\n` +
                `- Description: ${em.description || em.summary}\n` +
                (em.formula ? `- Formula: \`${em.formula}\`\n` : '') +
                (em.examples ? `- Examples: ${em.examples.join('; ')}\n` : '');
            } else if (results.powerMatches.length > 0 || results.mechanicsMatches.length > 0) {
              const pItems = results.powerMatches.slice(0, 3).map(p => `* **${p.name}** (Rank ${p.rank_required}): ${p.description}`).join('\n');
              const mItems = results.mechanicsMatches.slice(0, 3).map(m => `* **${m.title}**: ${m.description}`).join('\n');
              responseContent = `### Search Results for "${query}"\n${pItems ? `**Powers:**\n${pItems}\n` : ''}${mItems ? `**Mechanics:**\n${mItems}\n` : ''}`;
            } else {
              responseContent = `No matching rules or powers found for "${query}". Try searching for \`d616\`, \`attack\`, \`claws\`, or \`armor\`.`;
            }
          }
          metadata = { type: 'rule_citation' };
          break;
        }

        case 'combat': {
          const state = combatTracker.getCombatState();
          const lines = state.combatants.map(c =>
            `* **${c.name}** [${c.side.toUpperCase()}] — Health: **${c.current_health}/${c.max_health}** | Focus: **${c.current_focus}/${c.max_focus}** ${c.conditions.length > 0 ? `(${c.conditions.join(', ')})` : ''}`
          );
          responseContent = `### Active Combat Roster\n${lines.length > 0 ? lines.join('\n') : 'No active combatants in combat.'}`;
          metadata = { type: 'combat', combatResult: state };
          break;
        }

        case 'attack': {
          const target = args[0] || "Green Goblin";
          const ability = (args[1] || "melee").toLowerCase();
          const activeChar = this.getActiveCharacter();
          const attacker = activeChar ? activeChar.name : "Spider-Man";

          try {
            const attackResult = combatTracker.resolvePlayerAttack({
              attacker_name: attacker,
              target_name: target,
              ability: ability as any,
            });

            responseContent = `⚔️ **${attacker}** attacks **${target}** using **${ability.toUpperCase()}**!\n` +
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
          const attacker = args[0] || "Green Goblin";
          const target = args[1] || (this.getActiveCharacter()?.name || "Spider-Man");

          try {
            const attackResult = combatTracker.resolveNpcAction({
              attacker_name: attacker,
              target_name: target,
              ability: 'agility',
            });

            responseContent = `💥 **${attacker}** strikes at **${target}** with high-velocity munitions!\n` +
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
          const mems = campaignManager.searchMemories("");
          responseContent = `### Campaign Memories & Chronology\n` +
            `**Key Entities:**\n` +
            mems.map(m => `* **${m.title}** (${m.category}): ${m.details}`).join('\n') +
            `\n\n**Recent Events Log:**\n` +
            log.slice(-5).map(l => `* ${l}`).join('\n');
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
        metadata,
      };
      this.messages.push(assistantMsg);
      return assistantMsg;
    }

    // 3. Freeform narrative roleplay prompt!
    const contextPrompt = this.buildContextInjection(trimmed);
    const systemPrompt = `You are the AI Narrator and Game Master for the Marvel Multiverse Role-Playing Game (MMRPG).
Your role is to run an exciting, comic-book paced superhero adventure following the official Marvel Multiverse RPG rules:
1. Mechanics: Action checks are d616 (Standard, Marvel, Standard). A 1 on the Marvel die is Fantastic and counts as 6. Damage is Rank × effective Marvel die.
2. Tone: Cinematic Marvel Comics style, dynamic action, witty hero banter, menacing villains, clear stakes.
3. Be proactive: Narrate the immediate outcome of the hero's action, describe the environmental reactions, and present the next challenge or enemy counter-move.
4. Keep answers punchy and evocative (2-3 paragraphs max).

CURRENT GAME STATE & CONTEXT:
${contextPrompt}`;

    let reply = "";
    if (this.aiClient) {
      try {
        const response = await this.aiClient.models.generateContent({
          model: this.modelName,
          contents: [
            { role: 'user', parts: [{ text: `${systemPrompt}\n\nPLAYER ACTION:\n${trimmed}` }] },
          ],
        });
        reply = response.text || "";
      } catch (err) {
        console.warn("AI generation failed, falling back to simulator:", err);
      }
    }

    if (!reply) {
      // Deterministic simulation fallback
      reply = this.generateSimulatedNarration(trimmed);
    }

    const assistantMsg: ChatMessage = {
      id: `msg_a_${Date.now()}`,
      role: 'assistant',
      content: reply,
      timestamp: new Date().toLocaleTimeString(),
      metadata: { type: 'narration' },
    };
    this.messages.push(assistantMsg);
    return assistantMsg;
  }

  private generateSimulatedNarration(playerAction: string): string {
    const char = this.getActiveCharacter() || characterRoster.getSheet("Spider-Man")!;
    const lower = playerAction.toLowerCase();

    if (lower.includes('attack') || lower.includes('punch') || lower.includes('web') || lower.includes('shoot') || lower.includes('strike')) {
      const roll = resolveD616Roll({ ability_modifier: char.melee, target_number: 14 });
      const hit = roll.success;
      return `💥 **Action Resolution:**\nYou lunge forward with ${char.name}'s signature agility! *(Roll: ${roll.total_score} vs TN 14 ${roll.is_fantastic ? '⭐ FANTASTIC!' : ''})*\n\n` +
        (hit
          ? `Your strike lands with bone-jarring impact! The force knocks the mercenaries sprawling against the concrete pillars. Debris crashes down as the villain snarls and prepares a counter-salvo from his glider.\n\n*"Is that the best you've got?"* you quip, sticking to the wall above.`
          : `You fire off a rapid sequence, but the target rolls behind a reinforced steel container just in the nick of time. Shrapnel ricochets across the avenue as the villain repositions for another strafing run!`);
    }

    if (lower.includes('look') || lower.includes('scan') || lower.includes('investigate') || lower.includes('search')) {
      return `🔍 **Sensory Scan:**\nYour heightened senses take in the chaos of Midtown. High above, the green vapor trails of an Oscorp prototype indicate the glider's trajectory heading towards Fisk Tower. Below, police sirens echo as officers establish a cordon around the shattered lobby.\n\nYou spot a damaged Oscorp data-slate sparking near the entrance, containing partial flight telemetry and shipment manifests!`;
    }

    return `🕸️ **The Multiverse Reacts:**\n${char.name} executes your maneuver with precision. The crowd below roars with encouragement as your heroics buy precious seconds for civilians to clear the danger zone.\n\nFrom the swirling smoke overhead, a menacing cackle reverberates across the street: *"You're too late, hero! The city is already ours!"*\n\nWhat is your next move?`;
  }
}

export const narratorEngine = new NarratorEngine();
