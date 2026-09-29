/**
 * Combat tracking and attack resolution for Marvel Multiverse RPG.
 * Ported faithfully from marvel_mcp_narrator/core/combat_tracker.py
 */

import { CharacterRoster, characterRoster, AbilityName, ABILITY_FIELDS } from './character.ts';
import { resolveD616Roll, D616RollResult } from './d616.ts';

export type CombatSide = 'player' | 'ally' | 'npc' | 'enemy';

export interface CombatantSnapshot {
  name: string;
  side: CombatSide;
  rank: number;
  current_health: number;
  max_health: number;
  current_focus: number;
  max_focus: number;
  conditions: string[];
  damage_application?: any;
}

export class CombatTracker {
  private roster: CharacterRoster;
  private combatants: Map<string, { name: string; side: CombatSide }> = new Map();

  constructor(roster = characterRoster) {
    this.roster = roster;
    // Default initial setup: Spider-Man vs Green Goblin
    this.trackCombatant("Spider-Man", "player");
    this.trackCombatant("Green Goblin", "enemy");
  }

  public clear(): void {
    this.combatants.clear();
  }

  public trackCombatant(name: string, side: CombatSide = 'player'): CombatantSnapshot {
    const sheet = this.roster.getSheet(name);
    if (!sheet) throw new Error(`Character '${name}' not found in roster.`);
    this.combatants.set(sheet.name.toLowerCase().trim(), {
      name: sheet.name,
      side,
    });
    return this.buildCombatantSnapshot(sheet.name, side);
  }

  public untrackCombatant(name: string): void {
    this.combatants.delete(name.toLowerCase().trim());
  }

  public buildCombatantSnapshot(name: string, sideOverride?: CombatSide): CombatantSnapshot {
    const sheet = this.roster.getSheet(name);
    if (!sheet) throw new Error(`Character '${name}' not found.`);
    const tracked = this.combatants.get(name.toLowerCase().trim());
    const side = sideOverride || tracked?.side || 'player';

    return {
      name: sheet.name,
      side,
      rank: sheet.rank,
      current_health: sheet.current_health,
      max_health: sheet.max_health,
      current_focus: sheet.current_focus,
      max_focus: sheet.max_focus,
      conditions: [...sheet.conditions],
    };
  }

  public getCombatState(): { combatants: CombatantSnapshot[] } {
    const list: CombatantSnapshot[] = [];
    for (const [_, entry] of this.combatants) {
      try {
        list.push(this.buildCombatantSnapshot(entry.name, entry.side));
      } catch {
        // Skip missing characters
      }
    }
    // Sort: players/allies first, then enemies/npcs
    list.sort((a, b) => {
      if (a.side === b.side) return a.name.localeCompare(b.name);
      return a.side.localeCompare(b.side);
    });
    return { combatants: list };
  }

  public applyDamage(targetName: string, healthDamage = 0, focusDamage = 0) {
    const entry = this.combatants.get(targetName.toLowerCase().trim());
    if (!entry) throw new Error(`Combatant '${targetName}' is not currently in combat.`);
    const damageResult = this.roster.applyDamage(targetName, healthDamage, focusDamage);
    const targetSnapshot = this.buildCombatantSnapshot(targetName, entry.side);
    return {
      target: targetSnapshot,
      applied: damageResult,
      combat_state: this.getCombatState(),
    };
  }

  public resolveManualRoll(options: {
    dice_values: [number, number, number];
    marvel_index?: number;
    ability_modifier?: number;
    target_number?: number | null;
  }) {
    const { dice_values, marvel_index = 1, ability_modifier = 0, target_number = null } = options;
    const marvelDie = dice_values[marvel_index];
    const standards = dice_values.filter((_, idx) => idx !== marvel_index);

    const is_botch = dice_values.every(v => v === 1);
    const is_ultimate = marvelDie === 1 && standards[0] === 6 && standards[1] === 6;
    const is_fantastic = marvelDie === 1 && !is_botch;
    const marvelContribution = marvelDie === 1 ? 6 : marvelDie;
    const totalScore = standards[0] + standards[1] + marvelContribution + ability_modifier;

    let success = !is_botch;
    if (target_number !== null) {
      if (is_ultimate) success = true;
      else if (is_botch) success = false;
      else success = totalScore >= target_number;
    }

    return {
      source: "manual",
      raw_dice: {
        standard_1: standards[0],
        marvel_die: marvelDie,
        standard_2: standards[1],
      },
      dice_values: [...dice_values],
      normalized_dice_values: [standards[0], marvelDie, standards[1]],
      marvel_index,
      ability_modifier,
      total_score: totalScore,
      is_fantastic,
      is_ultimate,
      is_botch,
      target_number,
      success,
    };
  }

  public resolveAttack(options: {
    attacker_name: string;
    target_name: string;
    ability: AbilityName;
    attacker_side: CombatSide;
    target_side: CombatSide;
    target_resource?: 'health' | 'focus';
    edges?: number;
    troubles?: number;
    manual_roll?: { dice_values: [number, number, number]; marvel_index?: number };
  }) {
    const attacker = this.roster.getCharacter(options.attacker_name);
    const target = this.roster.getCharacter(options.target_name);

    if (!attacker) throw new Error(`Attacker '${options.attacker_name}' not found.`);
    if (!target) throw new Error(`Target '${options.target_name}' not found.`);

    const ability = options.ability.toLowerCase() as AbilityName;
    if (!ABILITY_FIELDS.includes(ability)) {
      throw new Error(`Invalid ability '${options.ability}'. Must be one of ${ABILITY_FIELDS.join(', ')}`);
    }

    const resource = options.target_resource || 'health';
    const abilityModifier = attacker[ability];
    const targetDefenses = target.defenses;
    const defenseKey = `${ability}_defense` as keyof typeof targetDefenses;
    const targetNumber = targetDefenses[defenseKey];

    let rollResult: any;
    if (options.manual_roll) {
      rollResult = this.resolveManualRoll({
        dice_values: options.manual_roll.dice_values,
        marvel_index: options.manual_roll.marvel_index ?? 1,
        ability_modifier: abilityModifier,
        target_number: targetNumber,
      });
    } else {
      rollResult = resolveD616Roll({
        ability_modifier: abilityModifier,
        target_number: targetNumber,
        edges: options.edges || 0,
        troubles: options.troubles || 0,
      });
    }

    this.trackCombatant(attacker.name, options.attacker_side);
    this.trackCombatant(target.name, options.target_side);

    let damage: any = null;
    let targetState = this.buildCombatantSnapshot(target.name, options.target_side);

    if (rollResult.success) {
      const marvelDie = rollResult.raw_dice ? rollResult.raw_dice.marvel_die : rollResult.marvel_die;
      damage = attacker.calculateAttackDamage(ability, marvelDie, rollResult.is_fantastic);
      const damageAmount = damage.total_damage;

      let applied: any;
      if (resource === 'health') {
        applied = target.takeHealthDamage(damageAmount);
      } else {
        applied = target.takeFocusDamage(damageAmount);
      }

      targetState = this.buildCombatantSnapshot(target.name, options.target_side);
      targetState.damage_application = applied;
    }

    return {
      attacker: this.buildCombatantSnapshot(attacker.name, options.attacker_side),
      target: targetState,
      ability,
      target_number: targetNumber,
      target_resource: resource,
      roll: rollResult,
      damage,
    };
  }

  public resolvePlayerAttack(options: {
    attacker_name: string;
    target_name: string;
    ability: AbilityName;
    dice_values?: [number, number, number];
    marvel_index?: number;
    target_resource?: 'health' | 'focus';
    edges?: number;
    troubles?: number;
  }) {
    return this.resolveAttack({
      attacker_name: options.attacker_name,
      target_name: options.target_name,
      ability: options.ability,
      attacker_side: 'player',
      target_side: 'enemy',
      target_resource: options.target_resource,
      edges: options.edges,
      troubles: options.troubles,
      manual_roll: options.dice_values ? { dice_values: options.dice_values, marvel_index: options.marvel_index ?? 1 } : undefined,
    });
  }

  public resolveNpcAction(options: {
    attacker_name: string;
    target_name: string;
    ability: AbilityName;
    target_resource?: 'health' | 'focus';
    edges?: number;
    troubles?: number;
  }) {
    return this.resolveAttack({
      attacker_name: options.attacker_name,
      target_name: options.target_name,
      ability: options.ability,
      attacker_side: 'enemy',
      target_side: 'player',
      target_resource: options.target_resource,
      edges: options.edges,
      troubles: options.troubles,
    });
  }
}

export const combatTracker = new CombatTracker();
