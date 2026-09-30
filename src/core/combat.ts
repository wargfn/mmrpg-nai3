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
  initiative?: number | null;
  initiative_roll?: any;
  order: number;
  is_active_turn: boolean;
  damage_application?: any;
}

export interface DamageLogEntry {
  id: string;
  timestamp: string;
  source: string;
  target: string;
  amount: number;
  resource: 'health' | 'focus';
  details: string;
}

export interface CombatStateResponse {
  combatants: CombatantSnapshot[];
  damage_history: DamageLogEntry[];
  round: number;
  current_turn_index: number;
  active_combatant: string | null;
}

export interface ConditionDefinition {
  name: string;
  icon: string;
  category: 'impairment' | 'tactical' | 'mobility' | 'status';
  description: string;
}

export const STANDARD_CONDITIONS: ConditionDefinition[] = [
  { name: 'Stunned', icon: '💫', category: 'impairment', description: 'Cannot take standard or reaction actions; only movement.' },
  { name: 'Invisible', icon: '👁️‍🗨️', category: 'tactical', description: 'Unseen; attackers suffer trouble, attacks gain edge.' },
  { name: 'Prone', icon: '⬇️', category: 'mobility', description: 'Flat on ground; -1 move, melee attacks against have edge, ranged trouble.' },
  { name: 'Blinded', icon: '🕶️', category: 'impairment', description: 'Cannot see; all attacks suffer trouble, enemy attacks gain edge.' },
  { name: 'Deafened', icon: '🔇', category: 'impairment', description: 'Cannot hear; fails hearing vigilance checks.' },
  { name: 'Grabbed', icon: '✊', category: 'mobility', description: 'Speed is 0; must break free or be released.' },
  { name: 'Pinned', icon: '🔒', category: 'mobility', description: 'Immobilized; cannot move, attacks against have edge.' },
  { name: 'Paralyzed', icon: '⚡', category: 'impairment', description: 'Helpless; cannot take any actions, moves, or reactions.' },
  { name: 'Slowed', icon: '🐢', category: 'mobility', description: 'Running speed and movement are halved.' },
  { name: 'Bleeding', icon: '🩸', category: 'status', description: 'Takes ongoing health damage each round.' },
  { name: 'Phasing', icon: '👻', category: 'tactical', description: 'Intangible; passes through solid matter, immune to physical attacks.' },
  { name: 'Flying', icon: '🪽', category: 'mobility', description: 'Airborne flight active; height and vertical mobility.' },
  { name: 'Surprised', icon: '❗', category: 'impairment', description: 'Caught unaware; cannot take action or reaction until turn.' },
  { name: 'Unconscious', icon: '💤', category: 'status', description: '0 Health; completely incapacitated and helpless.' },
];

export class CombatTracker {
  private roster: CharacterRoster;
  private combatants: Map<
    string,
    {
      name: string;
      side: CombatSide;
      initiative?: number | null;
      initiative_roll?: any;
      order: number;
    }
  > = new Map();
  private damageHistory: DamageLogEntry[] = [];
  private round: number = 1;
  private currentTurnIndex: number = 0;

  constructor(roster = characterRoster) {
    this.roster = roster;
    // Default initial setup: Spider-Man vs Green Goblin
    this.trackCombatant("Spider-Man", "player");
    this.trackCombatant("Green Goblin", "enemy");
  }

  public clear(): void {
    this.combatants.clear();
    this.round = 1;
    this.currentTurnIndex = 0;
  }

  public getRound(): number {
    return this.round;
  }

  public getCurrentTurnIndex(): number {
    return this.currentTurnIndex;
  }

  public getDamageHistory(): DamageLogEntry[] {
    return [...this.damageHistory];
  }

  public clearDamageHistory(): void {
    this.damageHistory = [];
  }

  private logDamage(entry: Omit<DamageLogEntry, 'id' | 'timestamp'>) {
    const record: DamageLogEntry = {
      id: `dmg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      timestamp: new Date().toLocaleTimeString(),
      ...entry,
    };
    this.damageHistory.unshift(record);
    if (this.damageHistory.length > 50) {
      this.damageHistory.pop();
    }
  }

  public trackCombatant(name: string, side: CombatSide = 'player'): CombatantSnapshot {
    const sheet = this.roster.getSheet(name);
    if (!sheet) throw new Error(`Character '${name}' not found in roster.`);
    const key = sheet.name.toLowerCase().trim();
    const existing = this.combatants.get(key);
    const order = existing?.order ?? this.combatants.size;

    this.combatants.set(key, {
      name: sheet.name,
      side,
      initiative: existing?.initiative ?? null,
      initiative_roll: existing?.initiative_roll,
      order,
    });
    return this.buildCombatantSnapshot(sheet.name, side);
  }

  public untrackCombatant(name: string): void {
    this.combatants.delete(name.toLowerCase().trim());
    this.normalizeOrders();
    if (this.currentTurnIndex >= this.combatants.size && this.combatants.size > 0) {
      this.currentTurnIndex = this.combatants.size - 1;
    }
  }

  public buildCombatantSnapshot(name: string, sideOverride?: CombatSide): CombatantSnapshot {
    const sheet = this.roster.getSheet(name);
    if (!sheet) throw new Error(`Character '${name}' not found.`);
    const tracked = this.combatants.get(name.toLowerCase().trim());
    const side = sideOverride || tracked?.side || 'player';
    const order = tracked?.order ?? 0;

    return {
      name: sheet.name,
      side,
      rank: sheet.rank,
      current_health: sheet.current_health,
      max_health: sheet.max_health,
      current_focus: sheet.current_focus,
      max_focus: sheet.max_focus,
      conditions: [...sheet.conditions],
      initiative: tracked?.initiative ?? null,
      initiative_roll: tracked?.initiative_roll,
      order,
      is_active_turn: false,
    };
  }

  private normalizeOrders(): void {
    const sorted = Array.from(this.combatants.values()).sort((a, b) => a.order - b.order);
    sorted.forEach((entry, idx) => {
      entry.order = idx;
    });
  }

  public getCombatState(): CombatStateResponse {
    const list: CombatantSnapshot[] = [];
    for (const [_, entry] of this.combatants) {
      try {
        list.push(this.buildCombatantSnapshot(entry.name, entry.side));
      } catch {
        // Skip missing characters
      }
    }

    // Sort by order ascending
    list.sort((a, b) => a.order - b.order);

    if (list.length > 0) {
      if (this.currentTurnIndex >= list.length) {
        this.currentTurnIndex = 0;
      }
      list[this.currentTurnIndex].is_active_turn = true;
    }

    return {
      combatants: list,
      damage_history: this.getDamageHistory(),
      round: this.round,
      current_turn_index: this.currentTurnIndex,
      active_combatant: list[this.currentTurnIndex]?.name || null,
    };
  }

  /**
   * Roll initiative for a single combatant using d616 + Vigilance modifier
   */
  public rollInitiative(
    name: string,
    edges: number = 0,
    troubles: number = 0
  ): { roll: D616RollResult; initiative: number; snapshot: CombatantSnapshot } {
    const key = name.toLowerCase().trim();
    const entry = this.combatants.get(key);
    if (!entry) throw new Error(`Combatant '${name}' is not in combat.`);

    const sheet = this.roster.getSheet(entry.name);
    const vigilanceMod = sheet ? sheet.vigilance : 0;

    const roll = resolveD616Roll({
      ability_modifier: vigilanceMod,
      edges,
      troubles,
    });

    entry.initiative = roll.total_score;
    entry.initiative_roll = roll;

    return {
      roll,
      initiative: roll.total_score,
      snapshot: this.buildCombatantSnapshot(entry.name, entry.side),
    };
  }

  /**
   * Roll initiative for all combatants and automatically sort them in initiative order
   */
  public rollAllInitiatives(autoSort: boolean = true): CombatStateResponse {
    for (const [_, entry] of this.combatants) {
      const sheet = this.roster.getSheet(entry.name);
      const vigilanceMod = sheet ? sheet.vigilance : 0;
      const roll = resolveD616Roll({
        ability_modifier: vigilanceMod,
        edges: 0,
        troubles: 0,
      });
      entry.initiative = roll.total_score;
      entry.initiative_roll = roll;
    }

    if (autoSort) {
      this.sortByInitiative();
    }

    this.currentTurnIndex = 0;
    return this.getCombatState();
  }

  /**
   * Manually set initiative score for a character
   */
  public setInitiative(name: string, initiative: number | null): void {
    const key = name.toLowerCase().trim();
    const entry = this.combatants.get(key);
    if (!entry) throw new Error(`Combatant '${name}' is not in combat.`);
    entry.initiative = initiative;
  }

  /**
   * Sort combatants by initiative descending:
   * Higher score first; Fantastic roll / higher vigilance tiebreakers; then players before enemies
   */
  public sortByInitiative(): void {
    const entries = Array.from(this.combatants.values());

    entries.sort((a, b) => {
      const initA = a.initiative ?? -999;
      const initB = b.initiative ?? -999;

      if (initA !== initB) {
        return initB - initA;
      }

      // Tiebreaker 1: Fantastic roll (Marvel die 1)
      const fanA = a.initiative_roll?.is_fantastic ? 1 : 0;
      const fanB = b.initiative_roll?.is_fantastic ? 1 : 0;
      if (fanA !== fanB) {
        return fanB - fanA;
      }

      // Tiebreaker 2: Vigilance stat
      const sheetA = this.roster.getSheet(a.name);
      const sheetB = this.roster.getSheet(b.name);
      const vigA = sheetA?.vigilance ?? 0;
      const vigB = sheetB?.vigilance ?? 0;
      if (vigA !== vigB) {
        return vigB - vigA;
      }

      // Tiebreaker 3: Side (players/allies first)
      if (a.side !== b.side) {
        const sideWeight: Record<CombatSide, number> = { player: 0, ally: 1, npc: 2, enemy: 3 };
        return sideWeight[a.side] - sideWeight[b.side];
      }

      return a.name.localeCompare(b.name);
    });

    entries.forEach((entry, idx) => {
      entry.order = idx;
    });
  }

  /**
   * Explicitly reorder combatants by provided name sequence
   */
  public reorderCombatants(orderedNames: string[]): void {
    orderedNames.forEach((name, idx) => {
      const key = name.toLowerCase().trim();
      const entry = this.combatants.get(key);
      if (entry) {
        entry.order = idx;
      }
    });
    this.normalizeOrders();
  }

  /**
   * Shift combatant up or down in initiative order
   */
  public moveCombatant(name: string, direction: 'up' | 'down'): void {
    const sorted = Array.from(this.combatants.values()).sort((a, b) => a.order - b.order);
    const key = name.toLowerCase().trim();
    const idx = sorted.findIndex(e => e.name.toLowerCase().trim() === key);
    if (idx === -1) return;

    if (direction === 'up' && idx > 0) {
      const prev = sorted[idx - 1];
      const cur = sorted[idx];
      const tempOrder = prev.order;
      prev.order = cur.order;
      cur.order = tempOrder;
    } else if (direction === 'down' && idx < sorted.length - 1) {
      const next = sorted[idx + 1];
      const cur = sorted[idx];
      const tempOrder = next.order;
      next.order = cur.order;
      cur.order = tempOrder;
    }

    this.normalizeOrders();
  }

  /**
   * Advance to the next turn in initiative order
   */
  public nextTurn(): CombatStateResponse {
    const total = this.combatants.size;
    if (total === 0) return this.getCombatState();

    if (this.currentTurnIndex >= total - 1) {
      this.currentTurnIndex = 0;
      this.round += 1;
    } else {
      this.currentTurnIndex += 1;
    }

    return this.getCombatState();
  }

  /**
   * Rewind to the previous turn in initiative order
   */
  public prevTurn(): CombatStateResponse {
    const total = this.combatants.size;
    if (total === 0) return this.getCombatState();

    if (this.currentTurnIndex > 0) {
      this.currentTurnIndex -= 1;
    } else if (this.round > 1) {
      this.round -= 1;
      this.currentTurnIndex = total - 1;
    }

    return this.getCombatState();
  }

  /**
   * Set turn directly by combatant name or index
   */
  public setTurn(target: number | string): CombatStateResponse {
    const sorted = Array.from(this.combatants.values()).sort((a, b) => a.order - b.order);
    if (typeof target === 'number') {
      if (target >= 0 && target < sorted.length) {
        this.currentTurnIndex = target;
      }
    } else {
      const key = target.toLowerCase().trim();
      const idx = sorted.findIndex(e => e.name.toLowerCase().trim() === key);
      if (idx !== -1) {
        this.currentTurnIndex = idx;
      }
    }
    return this.getCombatState();
  }

  /**
   * Reset round counter, turn pointer, and initiative values
   */
  public resetInitiative(): CombatStateResponse {
    this.round = 1;
    this.currentTurnIndex = 0;
    for (const [_, entry] of this.combatants) {
      entry.initiative = null;
      entry.initiative_roll = undefined;
    }
    return this.getCombatState();
  }

  public applyDamage(targetName: string, healthDamage = 0, focusDamage = 0, source = 'Direct Modification') {
    const entry = this.combatants.get(targetName.toLowerCase().trim());
    if (!entry) throw new Error(`Combatant '${targetName}' is not currently in combat.`);
    const damageResult = this.roster.applyDamage(targetName, healthDamage, focusDamage);

    if (healthDamage > 0) {
      this.logDamage({
        source,
        target: entry.name,
        amount: healthDamage,
        resource: 'health',
        details: `${entry.name} took ${healthDamage} health damage from ${source}.`,
      });
    } else if (healthDamage < 0) {
      this.logDamage({
        source,
        target: entry.name,
        amount: Math.abs(healthDamage),
        resource: 'health',
        details: `${entry.name} recovered ${Math.abs(healthDamage)} health via ${source}.`,
      });
    }

    if (focusDamage > 0) {
      this.logDamage({
        source,
        target: entry.name,
        amount: focusDamage,
        resource: 'focus',
        details: `${entry.name} took ${focusDamage} focus damage from ${source}.`,
      });
    } else if (focusDamage < 0) {
      this.logDamage({
        source,
        target: entry.name,
        amount: Math.abs(focusDamage),
        resource: 'focus',
        details: `${entry.name} recovered ${Math.abs(focusDamage)} focus via ${source}.`,
      });
    }

    const targetSnapshot = this.buildCombatantSnapshot(targetName, entry.side);
    return {
      target: targetSnapshot,
      applied: damageResult,
      combat_state: this.getCombatState(),
      damage_history: this.getDamageHistory(),
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

      this.logDamage({
        source: `${attacker.name} (${ability.toUpperCase()} Attack)`,
        target: target.name,
        amount: damageAmount,
        resource,
        details: `${attacker.name} dealt ${damageAmount} ${resource} damage to ${target.name} via ${ability.toUpperCase()} attack (Total Roll: ${rollResult.total_score}).`,
      });

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

  public addCondition(name: string, condition: string): CombatStateResponse {
    const char = this.roster.getCharacter(name);
    if (!char) throw new Error(`Character '${name}' not found.`);
    char.addCondition(condition);
    return this.getCombatState();
  }

  public removeCondition(name: string, condition: string): CombatStateResponse {
    const char = this.roster.getCharacter(name);
    if (!char) throw new Error(`Character '${name}' not found.`);
    char.removeCondition(condition);
    return this.getCombatState();
  }

  public toggleCondition(name: string, condition: string): CombatStateResponse {
    const char = this.roster.getCharacter(name);
    if (!char) throw new Error(`Character '${name}' not found.`);
    char.toggleCondition(condition);
    return this.getCombatState();
  }

  public clearConditions(name: string): CombatStateResponse {
    const char = this.roster.getCharacter(name);
    if (!char) throw new Error(`Character '${name}' not found.`);
    char.clearConditions();
    return this.getCombatState();
  }
}

export const combatTracker = new CombatTracker();
