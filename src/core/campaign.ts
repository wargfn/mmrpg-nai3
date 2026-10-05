/**
 * Campaign planning and memory management for Marvel Multiverse RPG.
 * Ported and enhanced from marvel_mcp_narrator/core/campaign_planner.py & campaign_db.py
 */

import fs from 'fs';
import path from 'path';

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
  notes?: string;
  created_at: string;
  updated_at?: string;
}

export interface MemoryEntry {
  id: string;
  category: 'entity' | 'event' | 'lore' | 'npc';
  key: string;
  title: string;
  details: string;
  timestamp: string;
}

export interface SavedCampaignMeta {
  filename: string;
  title: string;
  villain: string;
  hero_team: string[];
  session_count: number;
  current_session: number;
  updated_at: string;
  created_at: string;
  size_bytes: number;
  notes?: string;
  isActive?: boolean;
}

const CAMPAIGN_FILE = path.resolve('campaign.json');
const SAVED_CAMPAIGNS_DIR = path.resolve('saved_campaigns');

export class CampaignManager {
  private activePlan: CampaignPlan | null = null;
  private memories: Map<string, MemoryEntry> = new Map();
  private eventLog: string[] = [];

  constructor() {
    this.ensureSavedCampaignsDir();
    this.loadState();
    this.seedBundledCampaigns();
  }

  private ensureSavedCampaignsDir() {
    try {
      if (!fs.existsSync(SAVED_CAMPAIGNS_DIR)) {
        fs.mkdirSync(SAVED_CAMPAIGNS_DIR, { recursive: true });
      }
    } catch (e) {
      console.error('Failed to create saved_campaigns directory:', e);
    }
  }

  private loadState() {
    try {
      if (fs.existsSync(CAMPAIGN_FILE)) {
        const raw = fs.readFileSync(CAMPAIGN_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data.activePlan) {
          this.activePlan = data.activePlan;
        }
        if (Array.isArray(data.memories)) {
          this.memories = new Map(data.memories.map((m: MemoryEntry) => [m.key, m]));
        }
        if (Array.isArray(data.eventLog)) {
          this.eventLog = data.eventLog;
        }
        if (this.activePlan) {
          return;
        }
      }
    } catch (e) {
      console.warn('Could not load campaign.json, seeding default:', e);
    }

    this.seedDefaultCampaign();
  }

  public saveState() {
    try {
      const data = {
        activePlan: this.activePlan,
        memories: Array.from(this.memories.values()),
        eventLog: this.eventLog,
      };
      fs.writeFileSync(CAMPAIGN_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.error('Failed to save campaign.json:', e);
    }
  }

  private seedDefaultCampaign() {
    this.createPlan({
      theme: "The Midnight Syndicate Invasion",
      villain: "Green Goblin & Kingpin",
      hero_team: ["Spider-Man", "Wolverine", "Iron Man"],
      session_count: 3,
      notes: "Kingpin is supplying modified Stark Repulsor cannons to street gangs while Green Goblin strikes from above with neurotoxin bombs.",
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
    notes?: string;
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
      notes: options.notes || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    this.saveState();
    return this.activePlan;
  }

  public updatePlan(updates: Partial<CampaignPlan>): CampaignPlan {
    if (!this.activePlan) {
      throw new Error("No active campaign plan to update.");
    }

    if (updates.theme !== undefined) {
      this.activePlan.theme = updates.theme.trim();
    }
    if (updates.villain !== undefined) {
      this.activePlan.villain = updates.villain.trim();
    }
    if (updates.hero_team !== undefined) {
      this.activePlan.hero_team = updates.hero_team;
    }
    if (updates.notes !== undefined) {
      this.activePlan.notes = updates.notes;
    }
    if (updates.current_session !== undefined) {
      const sessNum = Math.max(1, Math.min(updates.current_session, this.activePlan.sessions.length));
      this.activePlan.current_session = sessNum;
      this.activePlan.sessions.forEach(s => {
        if (s.session_number === sessNum && s.status === 'planned') {
          s.status = 'active';
        }
      });
    }
    if (Array.isArray(updates.sessions)) {
      this.activePlan.sessions = updates.sessions.map((s, idx) => ({
        ...s,
        session_number: s.session_number || idx + 1,
        complications: Array.isArray(s.complications) ? s.complications : [],
        key_encounters: Array.isArray(s.key_encounters) ? s.key_encounters : [],
        status: s.status || (s.session_number === this.activePlan!.current_session ? 'active' : 'planned'),
      }));
    }

    this.activePlan.updated_at = new Date().toISOString();
    const curr = this.getCurrentSessionContext();
    this.logEvent(`Campaign plan updated: "${this.activePlan.theme}" vs ${this.activePlan.villain} (Episode ${this.activePlan.current_session}: ${curr?.session.title || ''})`);
    this.saveState();
    return this.activePlan;
  }

  public updateSession(sessionNumber: number, sessionUpdates: Partial<CampaignSession>): CampaignPlan {
    if (!this.activePlan) {
      throw new Error("No active campaign plan.");
    }

    const session = this.activePlan.sessions.find(s => s.session_number === sessionNumber);
    if (!session) {
      throw new Error(`Session ${sessionNumber} not found.`);
    }

    if (sessionUpdates.title !== undefined) session.title = sessionUpdates.title.trim();
    if (sessionUpdates.act !== undefined) session.act = sessionUpdates.act.trim();
    if (sessionUpdates.briefing !== undefined) session.briefing = sessionUpdates.briefing.trim();
    if (sessionUpdates.primary_objective !== undefined) session.primary_objective = sessionUpdates.primary_objective.trim();
    if (Array.isArray(sessionUpdates.complications)) session.complications = sessionUpdates.complications;
    if (Array.isArray(sessionUpdates.key_encounters)) session.key_encounters = sessionUpdates.key_encounters;
    if (sessionUpdates.status !== undefined) session.status = sessionUpdates.status;

    this.activePlan.updated_at = new Date().toISOString();
    this.logEvent(`Session ${sessionNumber} updated: "${session.title}" (Objective: ${session.primary_objective})`);
    this.saveState();
    return this.activePlan;
  }

  public addSession(newSession: Partial<CampaignSession>): CampaignPlan {
    if (!this.activePlan) {
      throw new Error("No active campaign plan.");
    }

    const nextNum = this.activePlan.sessions.length + 1;
    const session: CampaignSession = {
      session_number: nextNum,
      title: newSession.title || `Episode ${nextNum}: Follow-Up Strike`,
      act: newSession.act || `Act ${nextNum}: Escalation`,
      briefing: newSession.briefing || `The hero team continues the pursuit of ${this.activePlan.villain}.`,
      primary_objective: newSession.primary_objective || `Thwart ${this.activePlan.villain}'s secondary operation.`,
      complications: newSession.complications || ['Unexpected civilian presence'],
      key_encounters: newSession.key_encounters || [`Encounter with ${this.activePlan.villain}'s agents`],
      status: newSession.status || 'planned',
    };

    this.activePlan.sessions.push(session);
    this.activePlan.updated_at = new Date().toISOString();
    this.logEvent(`Added Episode ${nextNum} to campaign plan: "${session.title}"`);
    this.saveState();
    return this.activePlan;
  }

  public deleteSession(sessionNumber: number): CampaignPlan {
    if (!this.activePlan) throw new Error("No active campaign plan.");
    if (this.activePlan.sessions.length <= 1) {
      throw new Error("Cannot delete the only session in the campaign.");
    }

    this.activePlan.sessions = this.activePlan.sessions.filter(s => s.session_number !== sessionNumber);
    // Re-index sessions
    this.activePlan.sessions.forEach((s, idx) => {
      s.session_number = idx + 1;
    });

    if (this.activePlan.current_session > this.activePlan.sessions.length) {
      this.activePlan.current_session = this.activePlan.sessions.length;
    }

    this.activePlan.updated_at = new Date().toISOString();
    this.logEvent(`Deleted episode from campaign. Total episodes now: ${this.activePlan.sessions.length}`);
    this.saveState();
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
    this.saveState();
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
    this.saveState();
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
    this.saveState();
  }

  public getEventLog(): string[] {
    return [...this.eventLog];
  }

  // --------------------------------------------------------------------------
  // Server-Side Local Campaign File Storage & Retrieval
  // --------------------------------------------------------------------------

  public seedBundledCampaigns(): void {
    try {
      this.ensureSavedCampaignsDir();

      const bundled: Array<{ filename: string; plan: CampaignPlan; memories?: MemoryEntry[]; eventLog?: string[] }> = [
        {
          filename: 'midnight_syndicate_invasion.json',
          plan: {
            campaign_id: 'camp_midnight_syndicate',
            theme: 'The Midnight Syndicate Invasion',
            villain: 'Green Goblin & Kingpin',
            hero_team: ['Spider-Man', 'Wolverine', 'Iron Man'],
            current_session: 1,
            notes: 'Kingpin is supplying modified Stark Repulsor cannons to street gangs while Green Goblin strikes from above with neurotoxin bombs.',
            created_at: '2026-10-01T12:00:00.000Z',
            updated_at: '2026-10-01T12:00:00.000Z',
            sessions: [
              {
                session_number: 1,
                title: 'Episode 1: Ambush in the Concrete Canyons',
                act: 'Act I: Inciting Incident',
                briefing: 'The heroes investigate hijacked Stark weapon shipments flooding Midtown Manhattan warehouses.',
                primary_objective: 'Uncover the Syndicate distribution hub and neutralize the mercenary vanguard.',
                complications: ['High civilian collateral in Midtown crossfire', 'Oscorp nerve-gas canisters rigged to detonate'],
                key_encounters: ['Goblin Glider strafing run in Times Square', 'Kingpin Enforcer brute squad armed with disruptors'],
                status: 'active',
              },
              {
                session_number: 2,
                title: 'Episode 2: Subway Shakedown & Biohazard',
                act: 'Act II: Rising Threat & Clash',
                briefing: 'Osborn attempts to deploy airborne neurotoxin through the Grand Central subway ventilation system.',
                primary_objective: 'Halt the weaponized subway train and safely vent the hazardous chemicals.',
                complications: ['Subway power grid blackout', 'Hostage commuter train derailed'],
                key_encounters: ['Acrobatic duel on train rooftops', 'Ambush by Osborn Oscorp drone swarm'],
                status: 'planned',
              },
              {
                session_number: 3,
                title: 'Episode 3: Siege on Fisk Tower Penthouse',
                act: 'Act III: Climax at the Stronghold',
                briefing: 'The allied team assaults Fisk Tower to corner Kingpin and unmask the Green Goblin.',
                primary_objective: 'Confront and neutralize Green Goblin & Kingpin once and for all.',
                complications: ['Automated rooftop laser defenses', 'Fisk detonates structural charges to cover his escape'],
                key_encounters: ['Dual boss battle against Norman Osborn and Wilson Fisk'],
                status: 'planned',
              },
            ],
          },
          memories: [
            {
              id: 'mem_daily_bugle',
              category: 'entity',
              key: 'daily_bugle',
              title: 'The Daily Bugle',
              details: 'Major NYC newspaper, J. Jonah Jameson running front-page accusations.',
              timestamp: '2026-10-01T12:00:00.000Z',
            },
            {
              id: 'mem_fisk_tower',
              category: 'entity',
              key: 'fisk_tower',
              title: 'Fisk Tower',
              details: 'Fortified skyscraper in Midtown Manhattan loaded with high-tech defenses.',
              timestamp: '2026-10-01T12:00:00.000Z',
            },
          ],
          eventLog: [
            '[Day 1] Spider-Man intercepted initial shipment of Stark-tech weaponry in Queens.',
            '[Day 2] Wolverine tracked scent of Goblin formula to an abandoned warehouse in DUMBO.',
          ],
        },
        {
          filename: 'maximum_carnage_manhattan.json',
          plan: {
            campaign_id: 'camp_maximum_carnage',
            theme: 'Maximum Carnage: Red Mayhem',
            villain: 'Carnage & Shriek',
            hero_team: ['Spider-Man', 'Venom', 'Captain America', 'Black Cat'],
            current_session: 1,
            notes: 'Cletus Kasady has broken out of Ravencroft and joined forces with Shriek, broadcasting psychic and sonic pandemonium across NYC.',
            created_at: '2026-10-02T10:00:00.000Z',
            updated_at: '2026-10-02T10:00:00.000Z',
            sessions: [
              {
                session_number: 1,
                title: 'Episode 1: The Ravencroft Outbreak',
                act: 'Act I: The Blood Tide',
                briefing: 'Psychotic symbiote murderer Carnage orchestrates a mass breakout, transforming guards into thralls.',
                primary_objective: 'Contain the hospital breakout and rescue trapped medical personnel.',
                complications: ['Frenzied mob infected by Shriek psychic despair', 'Sonic alarms triggering symbiote berserk mode'],
                key_encounters: ['Skirmish with Doppelganger', 'First duel against Carnage on the asylum parapets'],
                status: 'active',
              },
              {
                session_number: 2,
                title: 'Episode 2: Riot in Greenwich Village',
                act: 'Act II: Escalation',
                briefing: 'Shriek amplifiers turned Washington Square Park into an all-out bloodbath.',
                primary_objective: 'Destroy the sonic broadcasting relays and subdue Shriek.',
                complications: ['Civilian rioters weaponized against their will', 'Narrow street alley choke points'],
                key_encounters: ['Clash with Demogoblin and Carrion', 'Protecting emergency EMS vehicles'],
                status: 'planned',
              },
              {
                session_number: 3,
                title: 'Episode 3: Central Park Symbiote Showdown',
                act: 'Act III: The Crimson Climax',
                briefing: 'Carnage gathers his grotesque family at Bethesda Terrace for a final blood ritual.',
                primary_objective: 'Overwhelm Carnage using high-frequency sonic disruptors and tactical fire.',
                complications: ['Massive tendril barricades trapping bystanders', 'Venom threatening lethal force'],
                key_encounters: ['Full team brawl against Carnage at maximum power'],
                status: 'planned',
              },
            ],
          },
          memories: [
            {
              id: 'mem_ravencroft',
              category: 'entity',
              key: 'ravencroft',
              title: 'Ravencroft Institute',
              details: 'Maximum security asylum for the criminally insane and superhumanly dangerous.',
              timestamp: '2026-10-02T10:00:00.000Z',
            },
          ],
          eventLog: ['[Alert] Carnage breached containment cell 14 at 0300 hours.'],
        },
        {
          filename: 'doom_latverian_incursion.json',
          plan: {
            campaign_id: 'camp_doom_incursion',
            theme: "Doctor Doom's Latverian Incursion",
            villain: 'Doctor Doom & Titanium Doombots',
            hero_team: ['Fantastic Four', 'Iron Man', 'Thor'],
            current_session: 1,
            notes: 'Victor Von Doom has deployed atmospheric siphon relays across the Atlantic seaboard, siphoning zero-point cosmic energy.',
            created_at: '2026-10-03T14:00:00.000Z',
            updated_at: '2026-10-03T14:00:00.000Z',
            sessions: [
              {
                session_number: 1,
                title: 'Episode 1: The Embassy Infiltration',
                act: 'Act I: Diplomatic Crisis',
                briefing: 'The Latverian Embassy in Manhattan exhibits massive sub-space radiation spikes guarded by diplomatic immunity.',
                primary_objective: 'Infiltrate the embassy sub-level without causing an international incident.',
                complications: ['Sovereign immunity diplomatic wards', 'Doombot stealth decoys mimicking dignitaries'],
                key_encounters: ['Stealth bypass of mystic rune tripwires', 'Titanium Doombot executioner squad'],
                status: 'active',
              },
              {
                session_number: 2,
                title: 'Episode 2: Quantum Siphon Overload',
                act: 'Act II: Science & Sorcery',
                briefing: 'Deep beneath the East River, Doom has constructed a tachyon particle funnel.',
                primary_objective: 'Overload the tachyon stabilization rings before the rift tears open.',
                complications: ['Dimensional anomalies altering local gravity', 'Mystic energy drain depleting Focus'],
                key_encounters: ['Duel with cybernetic Latverian shock-troops and arcane automatons'],
                status: 'planned',
              },
              {
                session_number: 3,
                title: 'Episode 3: The Monarch of Latveria',
                act: 'Act III: Sovereign Reckoning',
                briefing: 'Doom takes the field personally, cloaked in mystically enchanted vibranium armor.',
                primary_objective: 'Shatter Doom’s force field matrix and shut down his doomsday device.',
                complications: ['Doom’s force field mirrors damage back onto attackers', 'Orbital particle cannon targeting heroes'],
                key_encounters: ['Final showdown with the true Victor Von Doom'],
                status: 'planned',
              },
            ],
          },
          memories: [
            {
              id: 'mem_latverian_embassy',
              category: 'entity',
              key: 'latverian_embassy',
              title: 'Latverian Embassy (NYC)',
              details: 'Fortified sovereign territory protected by international treaty and mystic wards.',
              timestamp: '2026-10-03T14:00:00.000Z',
            },
          ],
          eventLog: ['[Briefing] Reed Richards detected sub-space cosmic resonance matching Latverian frequencies.'],
        },
        {
          filename: 'operation_zero_tolerance.json',
          plan: {
            campaign_id: 'camp_zero_tolerance',
            theme: 'Operation Zero Tolerance: Sentinel Protocols',
            villain: 'Bastion & Prime Sentinels',
            hero_team: ['Cyclops', 'Wolverine', 'Storm', 'Jean Grey'],
            current_session: 1,
            notes: 'Human sleep-agents cybernetically enhanced with nanotechnology are activating across the nation to hunt mutants.',
            created_at: '2026-10-04T09:00:00.000Z',
            updated_at: '2026-10-04T09:00:00.000Z',
            sessions: [
              {
                session_number: 1,
                title: 'Episode 1: Ambush at Xavier’s Academy',
                act: 'Act I: Hidden Hunters',
                briefing: 'Prime Sentinels pose as visiting federal inspectors before transforming into bio-mechanical executioners.',
                primary_objective: 'Neutralize the infiltrators and shield young mutant students from capture.',
                complications: ['Prime Sentinels look like ordinary humans until activated', 'School power and security grids disabled'],
                key_encounters: ['Combat in Danger Room with rogue subroutines', 'Battle across Xavier lawn against 4 Prime Sentinels'],
                status: 'active',
              },
              {
                session_number: 2,
                title: 'Episode 2: The Nanotech Foundry',
                act: 'Act II: Counter-Assault',
                briefing: 'The X-Men trace nanite telemetry to an underground manufacturing facility in New Mexico.',
                primary_objective: 'Sabotage the nanite distribution vats and download Bastion’s master command frequency.',
                complications: ['Airborne aerosolized nanites disabling mutant powers', 'Self-destruct timer counting down'],
                key_encounters: ['Reinforced Sentinel war-drones with adaptive energy shielding'],
                status: 'planned',
              },
              {
                session_number: 3,
                title: 'Episode 3: Strike on Master Mold Core',
                act: 'Act III: Future Terminated',
                briefing: 'Bastion merges with a reconstructed Master Mold supercomputer inside an abandoned missile silo.',
                primary_objective: 'Shatter Bastion’s cybernetic core and upload the shutdown virus.',
                complications: ['Continuous robotic manufacturing assembly', 'Kinetic repulsion fields'],
                key_encounters: ['Colossal clash with Bastion in his final hybrid form'],
                status: 'planned',
              },
            ],
          },
          memories: [
            {
              id: 'mem_prime_sentinels',
              category: 'entity',
              key: 'prime_sentinels',
              title: 'Prime Sentinels',
              details: 'Unwitting human sleeper agents augmented with cybernetic nanotech, unaware until activated.',
              timestamp: '2026-10-04T09:00:00.000Z',
            },
          ],
          eventLog: ['[Cerebro] Mutant signatures under assault in Westchester County.'],
        },
      ];

      for (const item of bundled) {
        const filePath = path.join(SAVED_CAMPAIGNS_DIR, item.filename);
        if (!fs.existsSync(filePath)) {
          const payload = {
            formatVersion: '1.0',
            savedAt: new Date().toISOString(),
            activePlan: item.plan,
            memories: item.memories || [],
            eventLog: item.eventLog || [],
          };
          fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf-8');
        }
      }
    } catch (e) {
      console.error('Failed to seed bundled campaigns:', e);
    }
  }

  public listSavedCampaigns(): SavedCampaignMeta[] {
    this.ensureSavedCampaignsDir();
    const result: SavedCampaignMeta[] = [];

    try {
      const files = fs.readdirSync(SAVED_CAMPAIGNS_DIR);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        const filePath = path.join(SAVED_CAMPAIGNS_DIR, file);
        try {
          const stats = fs.statSync(filePath);
          const raw = fs.readFileSync(filePath, 'utf-8');
          const data = JSON.parse(raw);
          const plan: CampaignPlan | undefined = data.activePlan || data.plan || (data.theme ? data : undefined);

          if (plan) {
            const isActive =
              this.activePlan?.theme === plan.theme && this.activePlan?.villain === plan.villain;

            result.push({
              filename: file,
              title: plan.theme || file.replace(/\.json$/, ''),
              villain: plan.villain || 'Unknown',
              hero_team: Array.isArray(plan.hero_team) ? plan.hero_team : [],
              session_count: plan.sessions?.length || 0,
              current_session: plan.current_session || 1,
              updated_at: plan.updated_at || stats.mtime.toISOString(),
              created_at: plan.created_at || stats.birthtime.toISOString(),
              size_bytes: stats.size,
              notes: plan.notes || '',
              isActive,
            });
          }
        } catch (fileErr) {
          console.warn(`Could not parse saved campaign file ${file}:`, fileErr);
        }
      }
    } catch (err) {
      console.error('Failed to read saved_campaigns directory:', err);
    }

    // Sort active first, then newest updated first
    result.sort((a, b) => {
      if (a.isActive && !b.isActive) return -1;
      if (!a.isActive && b.isActive) return 1;
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
    });

    return result;
  }

  public saveCampaignToFile(options?: {
    filename?: string;
    title?: string;
    plan?: CampaignPlan;
    includeMemories?: boolean;
    includeEventLog?: boolean;
  }): { filename: string; path: string; plan: CampaignPlan } {
    this.ensureSavedCampaignsDir();

    const planToSave = options?.plan || this.activePlan;
    if (!planToSave) {
      throw new Error('No campaign plan available to save.');
    }

    // Determine clean filename
    let rawName = options?.filename?.trim() || options?.title?.trim() || planToSave.theme;
    if (!rawName) rawName = `campaign_${Date.now()}`;
    rawName = rawName.replace(/\.json$/i, '');
    const cleanFilename =
      rawName
        .toLowerCase()
        .replace(/[^a-z0-9_-]+/g, '_')
        .replace(/^_+|_+$/g, '') || `campaign_${Date.now()}`;
    const filename = `${cleanFilename}.json`;
    const targetPath = path.join(SAVED_CAMPAIGNS_DIR, filename);

    const payload = {
      formatVersion: '1.0',
      savedAt: new Date().toISOString(),
      activePlan: {
        ...planToSave,
        updated_at: new Date().toISOString(),
      },
      memories: options?.includeMemories !== false ? Array.from(this.memories.values()) : [],
      eventLog: options?.includeEventLog !== false ? this.eventLog : [],
    };

    fs.writeFileSync(targetPath, JSON.stringify(payload, null, 2), 'utf-8');
    this.logEvent(`Campaign saved to server storage file: "${filename}"`);
    this.saveState();

    return {
      filename,
      path: targetPath,
      plan: payload.activePlan,
    };
  }

  public loadCampaignFromFile(filename: string): {
    plan: CampaignPlan;
    memoriesCount: number;
    eventCount: number;
    filename: string;
  } {
    this.ensureSavedCampaignsDir();

    // Prevent directory traversal
    const safeFilename = path.basename(filename);
    const targetPath = path.join(SAVED_CAMPAIGNS_DIR, safeFilename);

    if (!fs.existsSync(targetPath)) {
      throw new Error(`Campaign file "${safeFilename}" was not found on the server.`);
    }

    const raw = fs.readFileSync(targetPath, 'utf-8');
    const data = JSON.parse(raw);

    const loadedPlan: CampaignPlan | undefined =
      data.activePlan || data.plan || (data.theme ? data : undefined);

    if (!loadedPlan || !loadedPlan.theme) {
      throw new Error(`The file "${safeFilename}" does not contain a valid Marvel Multiverse campaign structure.`);
    }

    // Ensure session consistency
    if (!Array.isArray(loadedPlan.sessions) || loadedPlan.sessions.length === 0) {
      loadedPlan.sessions = [
        {
          session_number: 1,
          title: `Episode 1: Confronting ${loadedPlan.villain || 'the Threat'}`,
          act: 'Act I: Inciting Incident',
          briefing: `The team investigates the activities of ${loadedPlan.villain} during ${loadedPlan.theme}.`,
          primary_objective: `Neutralize the initial strike by ${loadedPlan.villain} and protect innocent bystanders.`,
          complications: ['Civilian collateral danger'],
          key_encounters: [`Skirmish with ${loadedPlan.villain}'s agents`],
          status: 'active',
        },
      ];
    }

    loadedPlan.current_session = Math.max(
      1,
      Math.min(loadedPlan.current_session || 1, loadedPlan.sessions.length)
    );

    this.activePlan = loadedPlan;

    // Load memories if available in the file
    if (Array.isArray(data.memories) && data.memories.length > 0) {
      this.memories.clear();
      for (const m of data.memories) {
        if (m.key && m.title) {
          this.memories.set(m.key, m);
        }
      }
    }

    // Load event log if available
    if (Array.isArray(data.eventLog) && data.eventLog.length > 0) {
      this.eventLog = [...data.eventLog];
    }

    this.logEvent(`Loaded campaign from server file: "${safeFilename}" ("${loadedPlan.theme}")`);
    this.saveState();

    return {
      plan: this.activePlan,
      memoriesCount: this.memories.size,
      eventCount: this.eventLog.length,
      filename: safeFilename,
    };
  }

  public deleteSavedCampaign(filename: string): boolean {
    this.ensureSavedCampaignsDir();
    const safeFilename = path.basename(filename);
    const targetPath = path.join(SAVED_CAMPAIGNS_DIR, safeFilename);

    if (fs.existsSync(targetPath)) {
      fs.unlinkSync(targetPath);
      this.logEvent(`Deleted saved campaign file: "${safeFilename}"`);
      return true;
    }
    return false;
  }

  public getSavedCampaignRaw(filename: string): string {
    this.ensureSavedCampaignsDir();
    const safeFilename = path.basename(filename);
    const targetPath = path.join(SAVED_CAMPAIGNS_DIR, safeFilename);

    if (!fs.existsSync(targetPath)) {
      throw new Error(`File "${safeFilename}" does not exist.`);
    }

    return fs.readFileSync(targetPath, 'utf-8');
  }

  public getBlankTemplateJSON(): string {
    const template = {
      formatVersion: "1.0",
      savedAt: new Date().toISOString(),
      activePlan: {
        campaign_id: "camp_template_custom",
        theme: "Your Custom Campaign Title / Arc",
        villain: "Name of Arch-Villain or Syndicate",
        hero_team: ["Hero Name 1", "Hero Name 2"],
        current_session: 1,
        notes: "Detailed background, lore, and overarching notes for Game Masters.",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        sessions: [
          {
            session_number: 1,
            title: "Episode 1: Title of First Adventure",
            act: "Act I: Inciting Incident",
            briefing: "Detailed briefing for the players regarding the crisis.",
            primary_objective: "Clear objective for the heroes in Episode 1.",
            complications: [
              "Civilian collateral danger",
              "Environmental hazard or ambush"
            ],
            key_encounters: [
              "Encounter 1 description",
              "Encounter 2 description"
            ],
            status: "active"
          },
          {
            session_number: 2,
            title: "Episode 2: Title of Second Adventure",
            act: "Act II: Rising Threat",
            briefing: "Detailed briefing for Episode 2.",
            primary_objective: "Primary objective for Episode 2.",
            complications: ["Complication 1"],
            key_encounters: ["Encounter 1"],
            status: "planned"
          }
        ]
      },
      memories: [
        {
          id: "mem_template_1",
          category: "entity",
          key: "example_location",
          title: "Example Location or NPC",
          details: "Description of lore entity or character.",
          timestamp: new Date().toISOString()
        }
      ],
      eventLog: [
        "[Start] Campaign template initialized from external plan."
      ]
    };
    return JSON.stringify(template, null, 2);
  }

  public importCampaignFromJSON(
    jsonContent: string,
    targetFilename?: string
  ): { plan: CampaignPlan; filename: string } {
    this.ensureSavedCampaignsDir();
    let data: any;
    try {
      data = JSON.parse(jsonContent);
    } catch {
      throw new Error('Invalid JSON format.');
    }

    const plan: CampaignPlan | undefined =
      data.activePlan || data.plan || (data.theme ? data : undefined);

    if (!plan || !plan.theme) {
      throw new Error('The imported JSON does not contain a valid campaign plan structure.');
    }

    const cleanFilename =
      (targetFilename || plan.theme)
        .toLowerCase()
        .replace(/\.json$/, '')
        .replace(/[^a-z0-9_-]+/g, '_') + '.json';

    const saveResult = this.saveCampaignToFile({
      filename: cleanFilename,
      plan,
      includeMemories: Array.isArray(data.memories),
      includeEventLog: Array.isArray(data.eventLog),
    });

    return {
      plan: saveResult.plan,
      filename: saveResult.filename,
    };
  }
}

export const campaignManager = new CampaignManager();

