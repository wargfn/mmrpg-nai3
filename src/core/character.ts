/**
 * Character sheet and state tracking for Marvel Multiverse RPG.
 * Ported faithfully from marvel_mcp_narrator/core/character_state.py & character_creation.py
 */

export type AbilityName = 'melee' | 'agility' | 'resilience' | 'vigilance' | 'ego' | 'logic';
export const ABILITY_FIELDS: AbilityName[] = ['melee', 'agility', 'resilience', 'vigilance', 'ego', 'logic'];

export interface StatblockAbility {
  score: number;
  edge: number;
  defense_score: number;
  'non-combat_checks': number;
}

export interface StatblockFormat {
  name: string;
  alias: string;
  rank: string | number;
  tier: number;
  is_npc: boolean;
  background: string;
  traits: string[];
  abilities: {
    melee: StatblockAbility;
    agility: StatblockAbility;
    resilience: StatblockAbility;
    vigilance: StatblockAbility;
    ego: StatblockAbility;
    logic: StatblockAbility;
  };
  powers: (string | { name: string; [key: string]: any })[];
  health: { score: number; damage_reduction: number };
  focus: { score: number; damage_reduction: number };
  karma: number;
  speed: { run: number; climb: number; swim: number; jump: number };
  initiative_mod: number;
  tags: string[];
  equipment: (string | { name: string; [key: string]: any })[];
}

export const AVERAGE_PERSON_TEMPLATE: StatblockFormat = {
  name: "Average Citizen",
  alias: "",
  rank: "rookie",
  tier: 1,
  is_npc: true,
  background: "Average Civilian",
  traits: [],
  abilities: {
    melee:      { score: 0, edge: 0, defense_score: 10, "non-combat_checks": 0 },
    agility:    { score: 0, edge: 0, defense_score: 10, "non-combat_checks": 0 },
    resilience: { score: 0, edge: 0, defense_score: 10, "non-combat_checks": 0 },
    vigilance:  { score: 0, edge: 0, defense_score: 10, "non-combat_checks": 0 },
    ego:        { score: 0, edge: 0, defense_score: 10, "non-combat_checks": 0 },
    logic:      { score: 0, edge: 0, defense_score: 10, "non-combat_checks": 0 }
  },
  powers: [],
  health: { score: 10, damage_reduction: 0 },
  focus: { score: 10, damage_reduction: 0 },
  karma: 0,
  speed: { run: 5, climb: 3, swim: 3, jump: 3 },
  initiative_mod: 0,
  tags: ["average", "civilian"],
  equipment: []
};

export const NEW_HERO_TEMPLATE: StatblockFormat = {
  name: "New Hero",
  alias: "Secret Identity",
  rank: 1,
  tier: 1,
  is_npc: false,
  background: "Heroic Origin",
  traits: ["Heroic Will", "Quick Reflexes"],
  abilities: {
    melee:      { score: 2, edge: 0, defense_score: 12, "non-combat_checks": 0 },
    agility:    { score: 2, edge: 0, defense_score: 12, "non-combat_checks": 0 },
    resilience: { score: 2, edge: 0, defense_score: 12, "non-combat_checks": 0 },
    vigilance:  { score: 2, edge: 0, defense_score: 12, "non-combat_checks": 0 },
    ego:        { score: 2, edge: 0, defense_score: 12, "non-combat_checks": 0 },
    logic:      { score: 2, edge: 0, defense_score: 12, "non-combat_checks": 0 }
  },
  powers: ["Signature Power Set"],
  health: { score: 50, damage_reduction: 0 },
  focus: { score: 50, damage_reduction: 0 },
  karma: 1,
  speed: { run: 5, climb: 3, swim: 3, jump: 3 },
  initiative_mod: 2,
  tags: ["Heroic", "Adventurer"],
  equipment: ["Hero Gear"]
};

export interface CharacterSheet {
  name: string;
  alias?: string;
  archetype: string;
  rank: number;
  tier?: number;
  is_npc?: boolean;
  background?: string;
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
  powers?: (string | { name: string; [key: string]: any })[];
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
  speed?: { run: number; climb: number; swim: number; jump: number };
  equipment?: (string | { name: string; [key: string]: any })[];
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
  alias: string;
  archetype: string;
  rank: number;
  tier: number;
  is_npc: boolean;
  background: string;
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
  speed?: { run: number; climb: number; swim: number; jump: number };
  equipment?: (string | any)[];

  constructor(init: Partial<CharacterSheet> & { name: string; rank?: number; tier?: number; is_npc?: boolean; alias?: string; background?: string; speed?: any; equipment?: any[] }) {
    this.name = init.name.trim();
    this.alias = init.alias || '';
    this.archetype = init.archetype || 'Polymath';
    this.rank = Math.max(1, Math.min(6, init.rank || init.tier || 1));
    this.tier = init.tier || this.rank;
    this.is_npc = Boolean(init.is_npc);
    this.background = init.background || '';
    this.melee = Math.max(0, init.melee ?? 2);
    this.agility = Math.max(0, init.agility ?? 2);
    this.resilience = Math.max(1, init.resilience ?? 2);
    this.vigilance = Math.max(1, init.vigilance ?? 2);
    this.ego = Math.max(0, init.ego ?? 2);
    this.logic = Math.max(0, init.logic ?? 2);

    this.origin = init.origin || (this.background ? this.background.split('•')[0].trim() : 'Special Origin');
    this.occupation = init.occupation || (this.is_npc ? 'Civilian' : 'Hero');
    this.traits = Array.from(new Set(init.traits || []));
    this.tags = Array.from(new Set(init.tags || []));
    this.power_sets = init.power_sets || init.powers || [];
    this.speed = init.speed;
    this.equipment = init.equipment || [];

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
      alias: this.alias,
      archetype: this.archetype,
      rank: this.rank,
      tier: this.tier,
      is_npc: this.is_npc,
      background: this.background || `${this.origin} • ${this.occupation}`,
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
      powers: [...this.power_sets],
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
      speed: this.speed || { run: this.runningSpeed, climb: 3, swim: 3, jump: 3 },
      equipment: this.equipment ? [...this.equipment] : [],
    };
  }

  toStatblock(): StatblockFormat {
    return characterToStatblock(this);
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

  public getStatblock(name: string): StatblockFormat | undefined {
    const char = this.getCharacter(name);
    return char ? characterToStatblock(char) : undefined;
  }

  public getAllStatblocks(): StatblockFormat[] {
    return Array.from(this.roster.values()).map(c => characterToStatblock(c));
  }

  public importStatblock(raw: any): CharacterSheet {
    const char = statblockToCharacter(raw);
    return this.registerCharacter(char);
  }
}

export function characterToStatblock(char: Character | CharacterSheet): StatblockFormat {
  const sheet = typeof (char as any).toSheet === 'function' ? (char as Character).toSheet() : (char as CharacterSheet);

  const meleeScore = sheet.melee ?? 0;
  const agilityScore = sheet.agility ?? 0;
  const resilienceScore = sheet.resilience ?? 0;
  const vigilanceScore = sheet.vigilance ?? 0;
  const egoScore = sheet.ego ?? 0;
  const logicScore = sheet.logic ?? 0;

  const defenses = sheet.defenses || {
    melee_defense: 10 + meleeScore,
    agility_defense: 10 + agilityScore,
    resilience_defense: 10 + resilienceScore,
    vigilance_defense: 10 + vigilanceScore,
    ego_defense: 10 + egoScore,
    logic_defense: 10 + logicScore,
  };

  const speed = sheet.speed || {
    run: sheet.running_speed ?? (5 + Math.floor(agilityScore / 5)),
    climb: 3,
    swim: 3,
    jump: 3,
  };

  let rankVal: string | number = sheet.rank;
  if (sheet.rank === 1 && sheet.is_npc) {
    rankVal = 'rookie';
  }

  return {
    name: sheet.name,
    alias: sheet.alias || '',
    rank: rankVal,
    tier: sheet.tier ?? (typeof sheet.rank === 'number' ? sheet.rank : 1),
    is_npc: sheet.is_npc ?? false,
    background: sheet.background || `${sheet.origin || ''}${sheet.occupation ? ` • ${sheet.occupation}` : ''}`.trim() || 'Average Civilian',
    traits: Array.isArray(sheet.traits) ? [...sheet.traits] : [],
    abilities: {
      melee: {
        score: meleeScore,
        edge: 0,
        defense_score: defenses.melee_defense ?? (10 + meleeScore),
        'non-combat_checks': 0,
      },
      agility: {
        score: agilityScore,
        edge: 0,
        defense_score: defenses.agility_defense ?? (10 + agilityScore),
        'non-combat_checks': 0,
      },
      resilience: {
        score: resilienceScore,
        edge: 0,
        defense_score: defenses.resilience_defense ?? (10 + resilienceScore),
        'non-combat_checks': 0,
      },
      vigilance: {
        score: vigilanceScore,
        edge: 0,
        defense_score: defenses.vigilance_defense ?? (10 + vigilanceScore),
        'non-combat_checks': 0,
      },
      ego: {
        score: egoScore,
        edge: 0,
        defense_score: defenses.ego_defense ?? (10 + egoScore),
        'non-combat_checks': 0,
      },
      logic: {
        score: logicScore,
        edge: 0,
        defense_score: defenses.logic_defense ?? (10 + logicScore),
        'non-combat_checks': 0,
      },
    },
    powers: Array.isArray(sheet.powers) ? [...sheet.powers] : Array.isArray(sheet.power_sets) ? [...sheet.power_sets] : [],
    health: {
      score: sheet.max_health ?? (resilienceScore > 0 ? resilienceScore * 25 : 10),
      damage_reduction: 0,
    },
    focus: {
      score: sheet.max_focus ?? (vigilanceScore > 0 ? vigilanceScore * 25 : 10),
      damage_reduction: 0,
    },
    karma: sheet.karma ?? (typeof sheet.rank === 'number' ? sheet.rank : 0),
    speed,
    initiative_mod: sheet.initiative_modifier ?? sheet.vigilance ?? 0,
    tags: Array.isArray(sheet.tags) ? [...sheet.tags] : [],
    equipment: Array.isArray(sheet.equipment) ? [...sheet.equipment] : [],
  };
}

export function statblockToCharacter(raw: any): Character {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid statblock data: expected a JSON object.');
  }

  const name = String(raw.name || '').trim();
  if (!name) {
    throw new Error('Invalid statblock: missing character "name".');
  }

  // Parse Rank
  let rankNum = 1;
  if (typeof raw.rank === 'number') {
    rankNum = Math.max(1, Math.min(6, raw.rank));
  } else if (typeof raw.rank === 'string') {
    const lower = raw.rank.toLowerCase();
    if (lower === 'rookie') rankNum = 1;
    else if (lower === 'street' || lower === 'standard') rankNum = 2;
    else if (lower === 'veteran') rankNum = 3;
    else if (lower === 'champion' || lower === 'icon') rankNum = 4;
    else if (lower === 'legendary') rankNum = 5;
    else if (lower === 'cosmic') rankNum = 6;
    else {
      const parsed = parseInt(raw.rank, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 6) rankNum = parsed;
      else if (typeof raw.tier === 'number' && raw.tier >= 1 && raw.tier <= 6) rankNum = raw.tier;
    }
  } else if (typeof raw.tier === 'number' && raw.tier >= 1 && raw.tier <= 6) {
    rankNum = raw.tier;
  }

  // Extract ability scores
  const abilities = raw.abilities || {};
  const melee = Number(abilities.melee?.score ?? raw.melee ?? 0);
  const agility = Number(abilities.agility?.score ?? raw.agility ?? 0);
  const resilience = Number(abilities.resilience?.score ?? raw.resilience ?? 0);
  const vigilance = Number(abilities.vigilance?.score ?? raw.vigilance ?? 0);
  const ego = Number(abilities.ego?.score ?? raw.ego ?? 0);
  const logic = Number(abilities.logic?.score ?? raw.logic ?? 0);

  // Health and Focus
  const healthScore = Number(raw.health?.score ?? raw.max_health ?? (resilience > 0 ? resilience * 25 : 10));
  const focusScore = Number(raw.focus?.score ?? raw.max_focus ?? (vigilance > 0 ? vigilance * 25 : 10));

  // Background, origin & occupation
  const background = String(raw.background || '').trim();
  let origin = raw.origin || background || 'Civilian Origin';
  let occupation = raw.occupation || (raw.is_npc ? 'Civilian' : 'Hero');
  if (background && !raw.origin && !raw.occupation) {
    const parts = background.split('•').map((s: string) => s.trim());
    if (parts.length >= 2) {
      origin = parts[0];
      occupation = parts[1];
    }
  }

  // Archetype determination
  let archetype = raw.archetype;
  if (!archetype) {
    if (raw.is_npc) archetype = 'Civilian';
    else if (melee >= 5) archetype = 'Striker';
    else if (resilience >= 5) archetype = 'Brawler';
    else if (agility >= 5) archetype = 'Way-Watcher';
    else if (ego >= 5) archetype = 'Blaster';
    else archetype = 'Polymath';
  }

  const traits = Array.isArray(raw.traits) ? raw.traits : [];
  const tags = Array.isArray(raw.tags) ? raw.tags : [];
  const powers = Array.isArray(raw.powers) ? raw.powers : Array.isArray(raw.power_sets) ? raw.power_sets : [];
  const equipment = Array.isArray(raw.equipment) ? raw.equipment : [];
  const karma = typeof raw.karma === 'number' ? Math.max(0, raw.karma) : (rankNum || 1);

  return new Character({
    name,
    archetype,
    rank: rankNum,
    melee,
    agility,
    resilience,
    vigilance,
    ego,
    logic,
    origin,
    occupation,
    traits,
    tags,
    power_sets: powers,
    max_health: healthScore,
    current_health: healthScore,
    max_focus: focusScore,
    current_focus: focusScore,
    karma,
    alias: raw.alias || '',
    tier: typeof raw.tier === 'number' ? raw.tier : rankNum,
    is_npc: Boolean(raw.is_npc),
    background: background || `${origin} • ${occupation}`,
    speed: raw.speed,
    equipment,
  });
}

export const characterRoster = new CharacterRoster();
