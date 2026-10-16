import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import bundledRules from '../data/rules.json';

const listSections = ['powers', 'power_sets', 'origins', 'occupations', 'traits', 'tags'] as const;
export type RulesDocument = Record<string, any>;

export class RulesValidationError extends Error {}

function object(value: unknown): value is RulesDocument {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function validateRules(value: unknown, partial = false): RulesDocument {
  const fail = (message: string): never => { throw new RulesValidationError(message); };
  if (!object(value)) return fail('Rules must be a JSON object.');
  if (Buffer.byteLength(JSON.stringify(value)) > 1024 * 1024) return fail('Rules must be at most 1 MB.');
  const checkJson = (item: any, depth = 0) => {
    if (depth > 20) fail('Rules are nested too deeply.');
    if (item && typeof item === 'object') {
      for (const [key, child] of Object.entries(item)) {
        if (['__proto__', 'constructor', 'prototype'].includes(key)) fail(`Unsupported key: ${key}`);
        checkJson(child, depth + 1);
      }
    }
  };
  checkJson(value);
  const text = (item: any, key: string, required = false) => {
    if (item[key] === undefined && !required) return;
    if (typeof item[key] !== 'string' || (required && !item[key].trim())) fail(`${key} must be ${required ? 'a non-empty' : 'a'} string.`);
  };
  const entry = (item: any, mechanic = false) => {
    if (!object(item)) return fail('Each rule must be an object.');
    text(item, mechanic ? 'title' : 'name', true);
    for (const key of ['description', 'category', 'formula', 'summary', 'action', 'cost', 'range', 'duration']) text(item, key);
    if (mechanic) text(item, 'description', true);
    if (item.rank_required !== undefined && typeof item.rank_required !== 'string' &&
        (typeof item.rank_required !== 'number' || !Number.isFinite(item.rank_required))) fail('rank_required must be a number or string.');
    for (const key of ['examples', 'prerequisites', 'subcategories', 'aliases', 'traits', 'tags']) {
      if (item[key] !== undefined && (!Array.isArray(item[key]) || !item[key].every((v: any) => typeof v === 'string'))) {
        fail(`${key} must be an array of strings.`);
      }
    }
  };
  for (const key of Object.keys(value)) {
    if (!['mechanics', ...listSections, 'occupation_rules'].includes(key)) fail(`Unknown rules section: ${key}`);
  }
  if (!partial || value.mechanics !== undefined) {
    if (!object(value.mechanics)) fail('mechanics must be an object.');
    for (const [key, item] of Object.entries(value.mechanics)) {
      if (!key.trim()) fail('Mechanic keys must not be empty.');
      entry(item, true);
    }
  }
  const namedEntries = (items: any, section: string) => {
    if (!Array.isArray(items)) return fail(`${section} must be an array.`);
    const names = new Set<string>();
    for (const item of items) {
      entry(item);
      const name = item.name.trim().toLowerCase();
      if (names.has(name)) fail(`Duplicate name in ${section}: ${item.name}`);
      names.add(name);
    }
  };
  for (const section of listSections) {
    if (partial && value[section] === undefined) continue;
    namedEntries(value[section], section);
    if (section === 'power_sets') {
      for (const set of value[section]) {
        if (set.powers !== undefined) namedEntries(set.powers, `power_sets/${set.name}/powers`);
      }
    }
  }
  if (value.occupation_rules !== undefined && !object(value.occupation_rules)) fail('occupation_rules must be an object.');
  return structuredClone(value);
}

export function mergeRules(official: RulesDocument, homebrew: RulesDocument): RulesDocument {
  const mergeNamed = (base: any[] = [], overrides: any[] = [], sets = false): any[] => {
    const entries = new Map(base.map(item => [item.name.trim().toLowerCase(), { ...item, source: 'official' }]));
    for (const item of overrides) {
      const key = item.name.trim().toLowerCase();
      const previous = entries.get(key);
      entries.set(key, {
        ...previous, ...item, source: 'homebrew',
        ...(sets ? { powers: mergeNamed(previous?.powers, item.powers) } : {}),
      });
    }
    return [...entries.values()];
  };
  const result: RulesDocument = { ...official, ...homebrew, mechanics: { ...official.mechanics, ...homebrew.mechanics } };
  for (const section of listSections) {
    result[section] = mergeNamed(official[section], homebrew[section], section === 'power_sets');
  }
  return result;
}

export class RulesStore {
  private official: RulesDocument;
  private homebrew: RulesDocument;

  constructor(private readonly file = path.resolve('rules-state.json')) {
    const saved = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : null;
    this.official = validateRules(saved ? saved.official : bundledRules);
    this.homebrew = validateRules(saved ? saved.homebrew : {}, true);
  }

  get(layer: 'official' | 'homebrew'): RulesDocument {
    return structuredClone(this[layer]);
  }

  effective(): RulesDocument {
    return mergeRules(this.official, this.homebrew);
  }

  replace(layer: 'official' | 'homebrew', value: unknown) {
    const validated = validateRules(value, layer === 'homebrew');
    const next = { official: this.official, homebrew: this.homebrew, [layer]: validated };
    const temporary = `${this.file}.${randomUUID()}.tmp`;
    try {
      fs.writeFileSync(temporary, JSON.stringify(next, null, 2), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      fs.renameSync(temporary, this.file);
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
    this[layer] = validated;
  }
}
