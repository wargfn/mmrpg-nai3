import rulesData from '../data/rules.json';

export interface MechanicEntry {
  title: string;
  category?: string;
  description: string;
  formula?: string;
  examples?: string[];
  [key: string]: any;
}

export interface PowerEntry {
  name: string;
  category?: string;
  rank_required?: number | string;
  description?: string;
  summary?: string;
  action?: string;
  cost?: string;
  range?: string;
  duration?: string;
  prerequisites?: string[];
  [key: string]: any;
}

export interface RuleLookupResult {
  entry_type: 'mechanic' | 'power';
  rule_key: string;
  title?: string;
  name?: string;
  category?: string;
  description?: string;
  formula?: string;
  examples?: string[];
  rank_required?: number | string;
  [key: string]: any;
}

class RulesDatabaseService {
  private data: any;
  private powerEntries: PowerEntry[] = [];
  private lookupIndex: Map<string, RuleLookupResult> = new Map();

  constructor() {
    this.data = rulesData;
    this.initPowerEntries();
    this.buildLookupIndex();
  }

  private initPowerEntries() {
    const rawPowers: PowerEntry[] = this.data.powers || [];
    this.powerEntries.push(...rawPowers);

    for (const powerSet of this.data.power_sets || []) {
      const setName = (powerSet.name || 'Power Set').trim();
      for (const p of powerSet.powers || []) {
        if (typeof p === 'object' && p !== null) {
          const entry: PowerEntry = {
            ...p,
            category: setName,
            description: p.description || p.summary || '',
          };
          this.powerEntries.push(entry);
        }
      }
    }
  }

  private buildLookupIndex() {
    for (const [key, payload] of Object.entries<any>(this.data.mechanics || {})) {
      const title = String(payload.title || key);
      const aliases = new Set([
        key.toLowerCase().trim(),
        title.toLowerCase().trim(),
        title.toLowerCase().trim().replace(/\s+/g, '_'),
      ]);
      for (const alias of aliases) {
        if (alias) {
          this.lookupIndex.set(alias, {
            entry_type: 'mechanic',
            rule_key: key,
            ...payload,
          });
        }
      }
    }

    for (const payload of this.powerEntries) {
      const name = String(payload.name || '').trim();
      if (!name) continue;
      const ruleKey = name.toLowerCase().replace(/\s+/g, '_');
      const aliases = new Set([name.toLowerCase(), ruleKey]);
      for (const alias of aliases) {
        if (!this.lookupIndex.has(alias)) {
          this.lookupIndex.set(alias, {
            entry_type: 'power',
            rule_key: ruleKey,
            ...payload,
          });
        }
      }
    }
  }

  public lookupRule(query: string): RuleLookupResult | null {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return null;
    return this.lookupIndex.get(normalized) || null;
  }

  public queryRules(query: string): {
    exactMatch: RuleLookupResult | null;
    mechanicsMatches: any[];
    powerMatches: any[];
  } {
    const keyword = query.trim().toLowerCase();
    const exact = this.lookupRule(query);

    const mechanicsMatches: any[] = [];
    for (const [key, payload] of Object.entries<any>(this.data.mechanics || {})) {
      const title = String(payload.title || key);
      const category = String(payload.category || 'Mechanics');
      const description = String(payload.description || '');
      const formula = String(payload.formula || '');
      const examples = Array.isArray(payload.examples) ? payload.examples.join(' ') : '';
      const text = `${key} ${title} ${category} ${description} ${formula} ${examples}`.toLowerCase();

      if (keyword && text.includes(keyword)) {
        mechanicsMatches.push({
          key,
          title,
          category,
          description,
          formula,
          examples: payload.examples || [],
        });
      }
    }

    const powerMatches: any[] = [];
    for (const p of this.powerEntries) {
      const name = String(p.name || '');
      const category = String(p.category || 'Powers');
      const desc = String(p.description || p.summary || '');
      const text = `${name} ${category} ${desc}`.toLowerCase();

      if (keyword && text.includes(keyword)) {
        powerMatches.push({
          name,
          category,
          rank_required: p.rank_required ?? 1,
          description: desc,
          action: p.action,
          cost: p.cost,
          range: p.range,
        });
      }
    }

    return {
      exactMatch: exact,
      mechanicsMatches: mechanicsMatches.slice(0, 10),
      powerMatches: powerMatches.slice(0, 15),
    };
  }

  public getAllPowers(): PowerEntry[] {
    return this.powerEntries;
  }

  public getMechanics(): Record<string, MechanicEntry> {
    return this.data.mechanics || {};
  }

  public getRulesIndex() {
    const mechanics = Object.entries<any>(this.data.mechanics || {}).map(([key, item]) => ({
      key,
      title: String(item.title || key),
      category: String(item.category || 'Core Mechanics'),
      description: String(item.description || ''),
      formula: item.formula || null,
      examples: Array.isArray(item.examples) ? item.examples : [],
    }));

    const powerSets = (this.data.power_sets || []).map((ps: any) => ({
      name: String(ps.name || 'Power Set').trim(),
      description: String(ps.description || ''),
      power_count: (ps.powers || []).length,
      powers: (ps.powers || []).map((p: any) => ({
        name: String(p.name || ''),
        category: String(ps.name || 'Power Set').trim(),
        rank_required: p.rank_required ?? 1,
        description: String(p.description || p.summary || ''),
        action: p.action,
        cost: p.cost,
        range: p.range,
        duration: p.duration,
        prerequisites: p.prerequisites,
      })),
    }));

    const standalonePowers = (this.data.powers || []).map((p: any) => ({
      name: String(p.name || ''),
      category: String(p.category || 'General'),
      rank_required: p.rank_required ?? 1,
      description: String(p.description || p.summary || ''),
      action: p.action,
      cost: p.cost,
      range: p.range,
    }));

    const origins = (this.data.origins || []).map((o: any) => ({
      name: String(o.name || ''),
      description: String(o.description || ''),
      subcategories: Array.isArray(o.subcategories) ? o.subcategories : [],
      aliases: Array.isArray(o.aliases) ? o.aliases : [],
    }));

    const occupations = (this.data.occupations || []).map((occ: any) => ({
      name: String(occ.name || ''),
      description: String(occ.description || ''),
      examples: Array.isArray(occ.examples) ? occ.examples : [],
      traits: Array.isArray(occ.traits) ? occ.traits : [],
      tags: Array.isArray(occ.tags) ? occ.tags : [],
    }));

    const traits = (this.data.traits || []).map((t: any) => ({
      name: String(t.name || ''),
      description: String(t.description || ''),
    }));

    const tags = (this.data.tags || []).map((t: any) => ({
      name: String(t.name || ''),
      description: String(t.description || ''),
    }));

    return {
      stats: {
        total_mechanics: mechanics.length,
        total_power_sets: powerSets.length,
        total_powers: this.powerEntries.length,
        total_origins: origins.length,
        total_occupations: occupations.length,
        total_traits: traits.length,
        total_tags: tags.length,
      },
      mechanics,
      power_sets: powerSets,
      standalone_powers: standalonePowers,
      origins,
      occupations,
      traits,
      tags,
    };
  }
}

export const rulesDatabase = new RulesDatabaseService();
