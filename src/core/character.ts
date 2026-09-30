/**
 * Character sheet and state tracking for Marvel Multiverse RPG.
 * Ported faithfully from marvel_mcp_narrator/core/character_state.py & character_creation.py
 */

export type AbilityName = 'melee' | 'agility' | 'resilience' | 'vigilance' | 'ego' | 'logic';
export const ABILITY_FIELDS: AbilityName[] = ['melee', 'agility', 'resilience', 'vigilance', 'ego', 'logic'];

export interface CharacterSheet {
  name: string;
  archetype: string;
  rank: number;
  melee: number;
  agility: number;
  resilience: number;
  vigilance: number;
  ego: number;
  logic: number;
  origin: string;
  occupation: string;
  traits: string[];
  tags: string[];
  power_sets: (string | { name: string; [key: string]: any })[];
  max_health: number;
  current_health: number;
  max_focus: number;
  current_focus: number;
  karma: number;
  conditions: string[];
  defenses: {
    melee_defense: number;
    agility_defense: number;
    resilience_defense: number;
    vigilance_defense: number;
    ego_defense: number;
    logic_defense: number;
  };
  initiative_modifier: number;
  running_speed: number;
  damage_multiplier: number;
}

export const BASE_ARCHETYPES: Record<string, { playstyle: string; base: [number, number, number, number, number, number] }> = {
  Striker: { playstyle: "High single-target melee offense.", base: [5, 4, 3, 2, 2, 2] },
  Blaster: { playstyle: "Ranged damage and pressure.", base: [2, 4, 3, 4, 5, 2] },
  Protector: { playstyle: "Frontline defense and ally protection.", base: [3, 2, 5, 4, 2, 2] },
  Brawler: { playstyle: "Durable close-range bruiser.", base: [4, 3, 5, 3, 2, 2] },
  "Way-Watcher": { playstyle: "Stealth, scouting, and awareness.", base: [2, 5, 3, 5, 3, 2] },
  Polymath: { playstyle: "Flexible specialist with broad utility.", base: [3, 3, 3, 4, 4, 4] },
};

export class Character {
  name: string;
  archetype: string;
  rank: number;
  melee: number;
  agility: number;
  resilience: number;
  vigilance: number;
  ego: number;
  logic: number;
  origin: string;
  occupation: string;
  traits: string[];
  tags: string[];
  power_sets: (string | any)[];
  max_health: number;
  current_health: number;
  max_focus: number;
  current_focus: number;
  karma: number;
  conditions: string[];

  constructor(init: Partial<CharacterSheet> & { name: string; rank: number }) {
    this.name = init.name.trim();
    this.archetype = init.archetype || 'Polymath';
    this.rank = Math.max(1, Math.min(6, init.rank || 1));
    this.melee = Math.max(0, init.melee ?? 2);
    this.agility = Math.max(0, init.agility ?? 2);
    this.resilience = Math.max(1, init.resilience ?? 2);
    this.vigilance = Math.max(1, init.vigilance ?? 2);
    this.ego = Math.max(0, init.ego ?? 2);
    this.logic = Math.max(0, init.logic ?? 2);

    this.origin = init.origin || 'Special Origin';
    this.occupation = init.occupation || 'Hero';
    this.traits = Array.from(new Set(init.traits || []));
    this.tags = Array.from(new Set(init.tags || []));
    this.power_sets = init.power_sets || [];

    this.max_health = init.max_health ?? Math.max(25, this.resilience * 25);
    this.max_focus = init.max_focus ?? Math.max(25, this.vigilance * 25);
    this.current_health = init.current_health ?? this.max_health;
    this.current_focus = init.current_focus ?? this.max_focus;
    this.karma = init.karma !== undefined ? Math.max(0, init.karma) : Math.max(1, this.rank);
    this.conditions = Array.from(new Set(init.conditions || []));
  }

  get defenses() {
    return {
      melee_defense: 10 + this.melee,
      agility_defense: 10 + this.agility,
      resilience_defense: 10 + this.resilience,
      vigilance_defense: 10 + this.vigilance,
      ego_defense: 10 + this.ego,
      logic_defense: 10 + this.logic,
    };
  }

  get initiativeModifier(): number {
    return this.vigilance;
  }

  get runningSpeed(): number {
    return 5 + Math.floor(this.agility / 5);
  }

  get damageMultiplier(): number {
    return this.rank;
  }

  calculateAttackDamage(ability: AbilityName, marvelDie: number, isFantastic = false, bonusMultiplier = 0) {
    const multiplier = this.damageMultiplier + bonusMultiplier;
    const effectiveMarvel = marvelDie === 1 ? 6 : marvelDie;
    const totalDamage = effectiveMarvel * multiplier;

    return {
      attacker: this.name,
      ability,
      marvel_die: marvelDie,
      effective_marvel_die: effectiveMarvel,
      damage_formula: "rank * effective_marvel_die",
      damage_multiplier: multiplier,
      ability_score: this[ability],
      is_fantastic: isFantastic,
      base_damage: totalDamage,
      total_damage: totalDamage,
    };
  }

  takeHealthDamage(amount: number) {
    const previous = this.current_health;
    this.current_health = Math.max(0, this.current_health - Math.max(0, amount));
    return {
      name: this.name,
      resource: "health",
      previous,
      damage: amount,
      current: this.current_health,
      max: this.max_health,
      is_unconscious: this.current_health <= 0,
    };
  }

  takeFocusDamage(amount: number) {
    const previous = this.current_focus;
    this.current_focus = Math.max(0, this.current_focus - Math.max(0, amount));
    return {
      name: this.name,
      resource: "focus",
      previous,
      damage: amount,
      current: this.current_focus,
      max: this.max_focus,
      is_shattered: this.current_focus <= 0,
    };
  }

  spendFocus(cost: number): boolean {
    if (cost < 0 || cost > this.current_focus) return false;
    this.current_focus -= cost;
    return true;
  }

  adjustKarma(delta: number): number {
    this.karma = Math.max(0, this.karma + delta);
    return this.karma;
  }

  setKarma(value: number): number {
    this.karma = Math.max(0, value);
    return this.karma;
  }

  spendKarma(amount = 1): boolean {
    if (this.karma < amount) return false;
    this.karma -= amount;
    return true;
  }

  heal(health = 0, focus = 0) {
    this.current_health = Math.min(this.max_health, this.current_health + health);
    this.current_focus = Math.min(this.max_focus, this.current_focus + focus);
    return {
      current_health: this.current_health,
      current_focus: this.current_focus,
    };
  }

  addCondition(condition: string): string[] {
    const trimmed = condition.trim();
    if (!trimmed) return [...this.conditions];
    const exists = this.conditions.some(c => c.toLowerCase() === trimmed.toLowerCase());
    if (!exists) {
      this.conditions.push(trimmed);
    }
    return [...this.conditions];
  }

  removeCondition(condition: string): string[] {
    const trimmed = condition.trim().toLowerCase();
    this.conditions = this.conditions.filter(c => c.toLowerCase() !== trimmed);
    return [...this.conditions];
  }

  toggleCondition(condition: string): { active: boolean; conditions: string[] } {
    const trimmed = condition.trim();
    if (!trimmed) return { active: false, conditions: [...this.conditions] };
    const idx = this.conditions.findIndex(c => c.toLowerCase() === trimmed.toLowerCase());
    if (idx >= 0) {
      this.conditions.splice(idx, 1);
      return { active: false, conditions: [...this.conditions] };
    } else {
      this.conditions.push(trimmed);
      return { active: true, conditions: [...this.conditions] };
    }
  }

  clearConditions(): string[] {
    this.conditions = [];
    return [];
  }

  toSheet(): CharacterSheet {
    return {
      name: this.name,
      archetype: this.archetype,
      rank: this.rank,
      melee: this.melee,
      agility: this.agility,
      resilience: this.resilience,
      vigilance: this.vigilance,
      ego: this.ego,
      logic: this.logic,
      origin: this.origin,
      occupation: this.occupation,
      traits: [...this.traits],
      tags: [...this.tags],
      power_sets: [...this.power_sets],
      max_health: this.max_health,
      current_health: this.current_health,
      max_focus: this.max_focus,
      current_focus: this.current_focus,
      karma: this.karma,
      conditions: [...this.conditions],
      defenses: this.defenses,
      initiative_modifier: this.initiativeModifier,
      running_speed: this.runningSpeed,
      damage_multiplier: this.damageMultiplier,
    };
  }
}

export class CharacterRoster {
  private roster: Map<string, Character> = new Map();

  constructor() {
    this.seedDefaultCharacters();
  }

  private seedDefaultCharacters() {
    // 1. Spider-Man (Peter Parker) - Rank 4 Striker
    this.registerCharacter(new Character({
      name: "Spider-Man",
      archetype: "Striker",
      rank: 4,
      melee: 5,
      agility: 6,
      resilience: 4,
      vigilance: 4,
      ego: 3,
      logic: 2,
      origin: "Radiation",
      occupation: "Photographer / Adventurer",
      traits: ["Spider-Sense", "Wall-Crawling", "Web-Slinger", "Witty banter"],
      tags: ["Heroic", "Secret Identity", "Avengers", "Web-Warrior"],
      power_sets: ["Spider-Powers", "Martial Arts", "Webcasting"],
    }));

    // 2. Wolverine (Logan) - Rank 4 Brawler
    this.registerCharacter(new Character({
      name: "Wolverine",
      archetype: "Brawler",
      rank: 4,
      melee: 6,
      agility: 4,
      resilience: 6,
      vigilance: 4,
      ego: 3,
      logic: 1,
      origin: "Mutant",
      occupation: "Soldier / X-Man",
      traits: ["Adamantium Skeleton", "Healing Factor", "Berserker Rage", "Enhanced Senses"],
      tags: ["Heroic", "X-Men", "Mutant", "Claws"],
      power_sets: ["Healing Factor", "Melee Weapons (Claws)", "Superhuman Senses"],
    }));

    // 3. Iron Man (Tony Stark) - Rank 4 Blaster
    this.registerCharacter(new Character({
      name: "Iron Man",
      archetype: "Blaster",
      rank: 4,
      melee: 2,
      agility: 4,
      resilience: 4,
      vigilance: 4,
      ego: 4,
      logic: 6,
      origin: "High-Tech",
      occupation: "Engineer / CEO",
      traits: ["Repulsor Tech", "Genius Intellect", "Armor Plating", "Flight System"],
      tags: ["Heroic", "Public Identity", "Avengers", "Armor"],
      power_sets: ["Armor Suit", "Repulsor Beams", "Flight", "Tactical Computing"],
    }));

    // 4. Captain America (Steve Rogers) - Rank 4 Protector
    this.registerCharacter(new Character({
      name: "Captain America",
      archetype: "Protector",
      rank: 4,
      melee: 5,
      agility: 4,
      resilience: 5,
      vigilance: 5,
      ego: 4,
      logic: 2,
      origin: "Super-Soldier Serum",
      occupation: "Commander",
      traits: ["Vibranium Shield", "Tactical Genius", "Indomitable Will", "Shield Throw"],
      tags: ["Heroic", "Public Identity", "Avengers", "Leader"],
      power_sets: ["Shield Mastery", "Tactical Leadership", "Superhuman Physicals"],
    }));

    // 5. Green Goblin (Norman Osborn) - Rank 4 Villain
    this.registerCharacter(new Character({
      name: "Green Goblin",
      archetype: "Blaster",
      rank: 4,
      melee: 4,
      agility: 5,
      resilience: 4,
      vigilance: 3,
      ego: 5,
      logic: 4,
      origin: "High-Tech / Chemical",
      occupation: "Supervillain / Industrialist",
      traits: ["Goblin Glider", "Pumpkin Bombs", "Insane Cunning"],
      tags: ["Villain", "Sinister Six", "Secret Identity"],
      power_sets: ["Goblin Arsenal", "Glider Flight", "Enhanced Strength"],
    }));
  }

  public registerCharacter(char: Character): CharacterSheet {
    this.roster.set(char.name.toLowerCase().trim(), char);
    return char.toSheet();
  }

  public getCharacter(name: string): Character | undefined {
    return this.roster.get(name.toLowerCase().trim());
  }

  public getSheet(name: string): CharacterSheet | undefined {
    const char = this.getCharacter(name);
    return char ? char.toSheet() : undefined;
  }

  public getAllSheets(): CharacterSheet[] {
    return Array.from(this.roster.values()).map(c => c.toSheet());
  }

  public createAssisted(options: {
    name: string;
    archetype: string;
    rank: number;
    origin?: string;
    occupation?: string;
    traits?: string[];
    tags?: string[];
  }): CharacterSheet {
    const archetypeKey = Object.keys(BASE_ARCHETYPES).find(
      k => k.toLowerCase() === options.archetype.toLowerCase()
    ) || 'Polymath';

    const info = BASE_ARCHETYPES[archetypeKey];
    const growth = Math.max(0, options.rank - 1);
    const base = info.base;

    const char = new Character({
      name: options.name,
      archetype: archetypeKey,
      rank: options.rank,
      melee: base[0] + growth,
      agility: base[1] + growth,
      resilience: base[2] + growth,
      vigilance: base[3] + growth,
      ego: base[4] + growth,
      logic: base[5] + growth,
      origin: options.origin || 'Heroic Experiment',
      occupation: options.occupation || 'Adventurer',
      traits: options.traits || [],
      tags: options.tags || ['Heroic'],
    });

    return this.registerCharacter(char);
  }

  public applyDamage(name: string, healthDamage = 0, focusDamage = 0) {
    const char = this.getCharacter(name);
    if (!char) throw new Error(`Character '${name}' not found.`);
    const healthResult = healthDamage > 0 ? char.takeHealthDamage(healthDamage) : null;
    const focusResult = focusDamage > 0 ? char.takeFocusDamage(focusDamage) : null;
    return {
      character: char.toSheet(),
      healthResult,
      focusResult,
    };
  }

  public adjustKarma(name: string, delta: number) {
    const char = this.getCharacter(name);
    if (!char) throw new Error(`Character '${name}' not found.`);
    char.adjustKarma(delta);
    return char.toSheet();
  }

  public setKarma(name: string, value: number) {
    const char = this.getCharacter(name);
    if (!char) throw new Error(`Character '${name}' not found.`);
    char.setKarma(value);
    return char.toSheet();
  }
}

export const characterRoster = new CharacterRoster();
