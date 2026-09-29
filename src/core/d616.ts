/**
 * d616 dice engine for Marvel Multiverse RPG.
 * Ported faithfully from marvel_mcp_narrator/core/d616_engine.py
 */

export interface RawDice {
  standard_1: number;
  marvel_die: number;
  standard_2: number;
}

export interface RollHistory {
  standard_1: number[];
  marvel_die: number[];
  standard_2: number[];
}

export interface D616RollResult {
  raw_dice: RawDice;
  dice_values: [number, number, number];
  ability_modifier: number;
  total_score: number;
  is_fantastic: boolean;
  is_ultimate: boolean;
  is_botch: boolean;
  target_number?: number | null;
  success?: boolean;
  net_modifiers: number;
  roll_history: RollHistory;
  edge?: boolean;
  trouble?: boolean;
}

export function rollSingleDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function marvelDieRank(value: number): number {
  return value === 1 ? 7 : value;
}

export function marvelDieTotal(value: number): number {
  return value === 1 ? 6 : value;
}

function selectLowStandardIndex(standards: [number, number]): number {
  return standards[0] <= standards[1] ? 0 : 1;
}

function selectHighStandardIndex(standards: [number, number]): number {
  return standards[0] >= standards[1] ? 0 : 1;
}

function applyEdgeToMarvel(currentValue: number, roller: () => number, marvelRolls: number[]): number {
  const reroll = roller();
  marvelRolls.push(reroll);
  return marvelDieRank(reroll) > marvelDieRank(currentValue) ? reroll : currentValue;
}

function applyTroubleToMarvel(currentValue: number, roller: () => number, marvelRolls: number[]): number {
  const reroll = roller();
  marvelRolls.push(reroll);
  return marvelDieRank(reroll) < marvelDieRank(currentValue) ? reroll : currentValue;
}

function applyEdgeToStandard(
  standards: [number, number],
  roller: () => number,
  standardRolls: { standard_1: number[]; standard_2: number[] }
): void {
  const index = selectLowStandardIndex(standards);
  const key = index === 0 ? "standard_1" : "standard_2";
  const reroll = roller();
  standardRolls[key].push(reroll);
  if (reroll > standards[index]) {
    standards[index] = reroll;
  }
}

function applyTroubleToStandard(
  standards: [number, number],
  roller: () => number,
  standardRolls: { standard_1: number[]; standard_2: number[] }
): void {
  const index = selectHighStandardIndex(standards);
  const key = index === 0 ? "standard_1" : "standard_2";
  const reroll = roller();
  standardRolls[key].push(reroll);
  if (reroll < standards[index]) {
    standards[index] = reroll;
  }
}

export function resolveDicePool(
  roller: () => number,
  netModifiers: number
): { rawDice: RawDice; standardRolls: { standard_1: number[]; standard_2: number[] }; marvelRolls: number[] } {
  const standard_1 = roller();
  let marvel_die = roller();
  const standard_2 = roller();

  const standards: [number, number] = [standard_1, standard_2];
  const marvelRolls: number[] = [marvel_die];
  const standardRolls: { standard_1: number[]; standard_2: number[] } = {
    standard_1: [standards[0]],
    standard_2: [standards[1]],
  };

  if (netModifiers > 0) {
    let remainingEdges = netModifiers;
    while (remainingEdges > 0 && marvel_die !== 1) {
      marvel_die = applyEdgeToMarvel(marvel_die, roller, marvelRolls);
      remainingEdges--;
    }
    while (remainingEdges > 0) {
      applyEdgeToStandard(standards, roller, standardRolls);
      remainingEdges--;
    }
  } else if (netModifiers < 0) {
    let remainingTroubles = Math.abs(netModifiers);
    while (remainingTroubles > 0 && marvel_die === 1) {
      marvel_die = applyTroubleToMarvel(marvel_die, roller, marvelRolls);
      remainingTroubles--;
    }
    while (remainingTroubles > 0) {
      applyTroubleToStandard(standards, roller, standardRolls);
      remainingTroubles--;
    }
  }

  return {
    rawDice: {
      standard_1: standards[0],
      marvel_die,
      standard_2: standards[1],
    },
    standardRolls,
    marvelRolls,
  };
}

export function resolveD616Roll(options: {
  ability_modifier?: number;
  target_number?: number | null;
  edges?: number;
  troubles?: number;
  roller?: () => number;
}): D616RollResult {
  const abilityModifier = options.ability_modifier || 0;
  const targetNumber = options.target_number ?? null;
  const edges = options.edges || 0;
  const troubles = options.troubles || 0;
  const netModifiers = edges - troubles;
  const roller = options.roller || rollSingleDie;

  if (targetNumber !== null && targetNumber <= 0) {
    throw new Error("Target number must be a positive integer.");
  }

  const { rawDice, standardRolls, marvelRolls } = resolveDicePool(roller, netModifiers);

  const is_botch = rawDice.standard_1 === 1 && rawDice.marvel_die === 1 && rawDice.standard_2 === 1;
  const is_ultimate = rawDice.standard_1 === 6 && rawDice.marvel_die === 1 && rawDice.standard_2 === 6;
  const is_fantastic = rawDice.marvel_die === 1 && !is_botch;
  const total = rawDice.standard_1 + marvelDieTotal(rawDice.marvel_die) + rawDice.standard_2 + abilityModifier;

  let success: boolean | undefined = undefined;
  if (targetNumber !== null) {
    if (is_botch) {
      success = false;
    } else if (is_ultimate) {
      success = true;
    } else {
      success = total >= targetNumber;
    }
  }

  return {
    raw_dice: rawDice,
    dice_values: [rawDice.standard_1, rawDice.marvel_die, rawDice.standard_2],
    ability_modifier: abilityModifier,
    total_score: total,
    is_fantastic,
    is_ultimate,
    is_botch,
    target_number: targetNumber,
    success,
    net_modifiers: netModifiers,
    roll_history: {
      standard_1: standardRolls.standard_1,
      marvel_die: marvelRolls,
      standard_2: standardRolls.standard_2,
    },
    edge: edges > 0 && troubles === 0,
    trouble: troubles > 0 && edges === 0,
  };
}

export function rollD616Simple(edge = false, trouble = false, target_number?: number | null): D616RollResult {
  return resolveD616Roll({
    edges: edge ? 1 : 0,
    troubles: trouble ? 1 : 0,
    target_number,
  });
}
