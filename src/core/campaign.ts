/**
 * Campaign planning and memory management for Marvel Multiverse RPG.
 * Ported faithfully from marvel_mcp_narrator/core/campaign_planner.py & campaign_db.py
 */

export interface CampaignSession {
  session_number: number;
  title: string;
  act: string;
  briefing: string;
  primary_objective: string;
  complications: string[];
  key_encounters: string[];
  status: 'planned' | 'active' | 'completed';
}

export interface CampaignPlan {
  campaign_id: string;
  theme: string;
  villain: string;
  hero_team: string[];
  sessions: CampaignSession[];
  current_session: number;
  created_at: string;
}

export interface MemoryEntry {
  id: string;
  category: 'entity' | 'event' | 'lore' | 'npc';
  key: string;
  title: string;
  details: string;
  timestamp: string;
}

export class CampaignManager {
  private activePlan: CampaignPlan | null = null;
  private memories: Map<string, MemoryEntry> = new Map();
  private eventLog: string[] = [];

  constructor() {
    this.seedDefaultCampaign();
  }

  private seedDefaultCampaign() {
    this.createPlan({
      theme: "The Midnight Syndicate Invasion",
      villain: "Green Goblin & Kingpin",
      hero_team: ["Spider-Man", "Wolverine", "Iron Man"],
      session_count: 3,
    });

    this.saveMemory('entity', 'daily_bugle', 'The Daily Bugle', 'Major NYC newspaper, J. Jonah Jameson running front-page accusations.');
    this.saveMemory('entity', 'fisk_tower', 'Fisk Tower', 'Fortified skyscraper in Midtown Manhattan loaded with high-tech defenses.');
    this.saveMemory('npc', 'norman_osborn', 'Norman Osborn', 'Unstable CEO of Oscorp, flying the Goblin Glider.');
    this.logEvent("Spider-Man intercepted a shipment of Stark-tech weaponry hijacked by Goblin's mercenaries in Queens.");
  }

  public createPlan(options: {
    theme: string;
    villain: string;
    hero_team: string[];
    session_count?: number;
  }): CampaignPlan {
    const sessionCount = Math.max(1, options.session_count || 3);
    const campaignId = `camp_${Date.now()}`;
    const sessions: CampaignSession[] = [];

    const acts = ['Act I: Inciting Incident', 'Act II: Rising Threat & Clash', 'Act III: Climax at the Stronghold', 'Act IV: The Final Reckoning'];

    for (let i = 1; i <= sessionCount; i++) {
      const actTitle = acts[Math.min(i - 1, acts.length - 1)];
      sessions.push({
        session_number: i,
        title: `Episode ${i}: Strike on ${options.villain}`,
        act: actTitle,
        briefing: `The team (${options.hero_team.join(', ')}) investigates the trail of ${options.villain} across New York City during ${options.theme}.`,
        primary_objective: i === sessionCount ? `Confront and neutralize ${options.villain} once and for all.` : `Uncover the mastermind's supply depot and secure innocent civilians.`,
        complications: [
          'Civilian collateral danger in crowded avenues',
          'Oscorp neural disruptor gas released in the subway',
        ],
        key_encounters: [
          'Mercenary ambush in warehouse district',
          `Direct skirmish with ${options.villain}'s elite enforcers`,
        ],
        status: i === 1 ? 'active' : 'planned',
      });
    }

    this.activePlan = {
      campaign_id: campaignId,
      theme: options.theme,
      villain: options.villain,
      hero_team: options.hero_team,
      sessions,
      current_session: 1,
      created_at: new Date().toISOString(),
    };

    return this.activePlan;
  }

  public getPlan(): CampaignPlan | null {
    return this.activePlan;
  }

  public getCurrentSessionContext(): { session: CampaignSession; plan: CampaignPlan } | null {
    if (!this.activePlan) return null;
    const session = this.activePlan.sessions.find(s => s.session_number === this.activePlan!.current_session) || this.activePlan.sessions[0];
    return { session, plan: this.activePlan };
  }

  public concludeSession(sessionNumber: number, logSummary: string) {
    if (!this.activePlan) throw new Error("No active campaign plan.");
    const session = this.activePlan.sessions.find(s => s.session_number === sessionNumber);
    if (session) {
      session.status = 'completed';
    }
    this.logEvent(`Session ${sessionNumber} concluded: ${logSummary}`);
    if (sessionNumber < this.activePlan.sessions.length) {
      this.activePlan.current_session = sessionNumber + 1;
      const nextSession = this.activePlan.sessions.find(s => s.session_number === this.activePlan!.current_session);
      if (nextSession) nextSession.status = 'active';
    }
    return {
      activePlan: this.activePlan,
      concludedSession: sessionNumber,
      logSummary,
    };
  }

  public saveMemory(category: MemoryEntry['category'], key: string, title: string, details: string): MemoryEntry {
    const entry: MemoryEntry = {
      id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      category,
      key: key.toLowerCase().trim(),
      title,
      details,
      timestamp: new Date().toISOString(),
    };
    this.memories.set(entry.key, entry);
    return entry;
  }

  public searchMemories(query: string): MemoryEntry[] {
    const q = query.toLowerCase().trim();
    if (!q) return Array.from(this.memories.values());
    return Array.from(this.memories.values()).filter(m =>
      m.title.toLowerCase().includes(q) ||
      m.details.toLowerCase().includes(q) ||
      m.key.toLowerCase().includes(q)
    );
  }

  public logEvent(eventText: string): void {
    this.eventLog.push(`[${new Date().toLocaleTimeString()}] ${eventText}`);
  }

  public getEventLog(): string[] {
    return [...this.eventLog];
  }
}

export const campaignManager = new CampaignManager();
