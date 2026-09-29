import React, { useState, useEffect, useRef } from 'react';
import {
  Dices,
  Shield,
  Swords,
  Users,
  BookOpen,
  MapPin,
  Send,
  Sparkles,
  Zap,
  Heart,
  Flame,
  Search,
  Plus,
  Trash2,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertTriangle,
  Skull,
  Award,
  ChevronRight,
  ChevronDown,
  Terminal,
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: any;
}

interface CharacterSheet {
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
  power_sets: any[];
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

interface CombatantSnapshot {
  name: string;
  side: 'player' | 'ally' | 'npc' | 'enemy';
  rank: number;
  current_health: number;
  max_health: number;
  current_focus: number;
  max_focus: number;
  conditions: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'narrator' | 'dice' | 'combat' | 'characters' | 'rules' | 'campaign'>('narrator');

  // Narrator state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isNarrating, setIsNarrating] = useState(false);
  const [activeCharName, setActiveCharName] = useState('Spider-Man');
  const [characters, setCharacters] = useState<CharacterSheet[]>([]);
  const [showContext, setShowContext] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Dice engine state
  const [rollResult, setRollResult] = useState<any>(null);
  const [rollModifier, setRollModifier] = useState<number>(5);
  const [targetNumber, setTargetNumber] = useState<string>('15');
  const [edges, setEdges] = useState<number>(0);
  const [troubles, setTroubles] = useState<number>(0);
  const [isRolling, setIsRolling] = useState(false);
  const [selectedAbility, setSelectedAbility] = useState<string>('melee');

  // Combat state
  const [combatants, setCombatants] = useState<CombatantSnapshot[]>([]);
  const [attackAttacker, setAttackAttacker] = useState<string>('Spider-Man');
  const [attackTarget, setAttackTarget] = useState<string>('Green Goblin');
  const [attackAbility, setAttackAbility] = useState<string>('melee');
  const [lastAttackResult, setLastAttackResult] = useState<any>(null);

  // Rules state
  const [searchQuery, setSearchQuery] = useState('');
  const [ruleResults, setRuleResults] = useState<any>({ mechanicsMatches: [], powerMatches: [] });
  const [selectedRule, setSelectedRule] = useState<any>(null);

  // Campaign state
  const [campaignData, setCampaignData] = useState<any>(null);

  // Character creator state
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharArchetype, setNewCharArchetype] = useState('Striker');
  const [newCharRank, setNewCharRank] = useState(3);
  const [newCharOrigin, setNewCharOrigin] = useState('High-Tech');
  const [newCharOccupation, setNewCharOccupation] = useState('Adventurer');

  // Load initial data
  useEffect(() => {
    fetchMessages();
    fetchCharacters();
    fetchCombat();
    fetchCampaign();
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      const res = await fetch('/api/narrator/messages');
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
      if (data.activeCharacter) setActiveCharName(data.activeCharacter.name);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCharacters = async () => {
    try {
      const res = await fetch('/api/characters');
      const data = await res.json();
      if (data.characters) setCharacters(data.characters);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCombat = async () => {
    try {
      const res = await fetch('/api/combat');
      const data = await res.json();
      if (data.combatants) setCombatants(data.combatants);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchCampaign = async () => {
    try {
      const res = await fetch('/api/campaign');
      const data = await res.json();
      setCampaignData(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendMessage = async (text?: string) => {
    const promptToSend = text || inputPrompt;
    if (!promptToSend.trim() || isNarrating) return;

    setInputPrompt('');
    setIsNarrating(true);

    try {
      const res = await fetch('/api/narrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: promptToSend }),
      });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
      if (data.combatState?.combatants) setCombatants(data.combatState.combatants);
      fetchCharacters();
    } catch (e) {
      console.error(e);
    } finally {
      setIsNarrating(false);
    }
  };

  const handleRollDice = async () => {
    setIsRolling(true);
    try {
      const res = await fetch('/api/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ability_modifier: rollModifier,
          target_number: targetNumber ? parseInt(targetNumber, 10) : null,
          edges,
          troubles,
        }),
      });
      const data = await res.json();
      setTimeout(() => {
        setRollResult(data);
        setIsRolling(false);
      }, 400);
    } catch (e) {
      console.error(e);
      setIsRolling(false);
    }
  };

  const handleResolveAttack = async (isPlayer: boolean) => {
    try {
      const endpoint = isPlayer ? '/api/combat/attack' : '/api/combat/npc-attack';
      const body = isPlayer
        ? {
            attacker_name: attackAttacker,
            target_name: attackTarget,
            ability: attackAbility,
            edges,
            troubles,
          }
        : {
            attacker_name: attackTarget,
            target_name: attackAttacker,
            ability: 'agility',
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setLastAttackResult(data);
      fetchCombat();
      fetchCharacters();
    } catch (e) {
      console.error(e);
    }
  };

  const handleApplyDirectDamage = async (name: string, health: number, focus: number) => {
    try {
      await fetch(`/api/characters/${encodeURIComponent(name)}/damage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ health_damage: health, focus_damage: focus }),
      });
      fetchCombat();
      fetchCharacters();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSearchRules = async (q: string) => {
    setSearchQuery(q);
    if (!q.trim()) {
      setRuleResults({ mechanicsMatches: [], powerMatches: [] });
      return;
    }
    try {
      const res = await fetch(`/api/rules/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      setRuleResults(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCharName.trim()) return;

    try {
      const res = await fetch('/api/characters/assisted', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCharName.trim(),
          archetype: newCharArchetype,
          rank: newCharRank,
          origin: newCharOrigin,
          occupation: newCharOccupation,
        }),
      });
      if (res.ok) {
        setShowCreatorModal(false);
        setNewCharName('');
        fetchCharacters();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSelectActiveChar = async (name: string) => {
    try {
      const res = await fetch('/api/narrator/active-character', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.activeCharacter) {
        setActiveCharName(data.activeCharacter.name);
        setAttackAttacker(data.activeCharacter.name);
        setRollModifier(data.activeCharacter.melee);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const activeChar = characters.find(c => c.name.toLowerCase() === activeCharName.toLowerCase());

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 comic-dots">
      {/* Top Header */}
      <header className="border-b-4 border-red-600 bg-slate-900/95 backdrop-blur px-4 py-2.5 flex items-center justify-between shadow-xl z-20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-600 border-2 border-white flex items-center justify-center rounded shadow-[2px_2px_0px_#000]">
            <span className="font-comic text-2xl text-white tracking-wider">M</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-comic text-2xl text-red-500 tracking-wide drop-shadow-[0_2px_4px_rgba(239,68,68,0.3)]">
                MARVEL MULTIVERSE
              </h1>
              <span className="bg-yellow-400 text-slate-950 text-xs font-black px-1.5 py-0.5 rounded tracking-wider uppercase font-comic">
                NARRATOR AI
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1.5">
              <span>d616 Mechanics Engine</span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Ready
              </span>
            </p>
          </div>
        </div>

        {/* Hero Quick Badge */}
        {activeChar && (
          <div className="hidden md:flex items-center gap-3 bg-slate-800/90 border border-slate-700 px-3 py-1.5 rounded-lg shadow-sm">
            <div className="text-right">
              <div className="text-xs font-semibold text-slate-300">
                Active Hero: <span className="text-red-400 font-bold">{activeChar.name}</span>
              </div>
              <div className="text-[11px] text-slate-400">
                Rank {activeChar.rank} {activeChar.archetype}
              </div>
            </div>
            <div className="flex items-center gap-2 border-l border-slate-700 pl-3">
              <div className="flex items-center gap-1 text-xs">
                <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" />
                <span className="font-mono text-xs font-bold text-red-400">
                  {activeChar.current_health}/{activeChar.max_health}
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400" />
                <span className="font-mono text-xs font-bold text-blue-300">
                  {activeChar.current_focus}/{activeChar.max_focus}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Nav Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab('narrator')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeTab === 'narrator'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Narrator</span>
          </button>
          <button
            onClick={() => setActiveTab('dice')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeTab === 'dice'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Dices className="w-3.5 h-3.5" />
            <span>d616 Dice</span>
          </button>
          <button
            onClick={() => setActiveTab('combat')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeTab === 'combat'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Swords className="w-3.5 h-3.5" />
            <span>Combat</span>
          </button>
          <button
            onClick={() => setActiveTab('characters')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeTab === 'characters'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Roster</span>
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeTab === 'rules'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Rules</span>
          </button>
          <button
            onClick={() => setActiveTab('campaign')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-bold transition-all ${
              activeTab === 'campaign'
                ? 'bg-red-600 text-white shadow-[0_0_12px_rgba(239,68,68,0.5)]'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            <span>Campaign</span>
          </button>
        </nav>
      </header>

      {/* Main Body */}
      <main className="flex-1 overflow-hidden relative">
        {/* TAB 1: NARRATOR CONSOLE */}
        {activeTab === 'narrator' && (
          <div className="flex h-full">
            {/* Left Chat Console */}
            <div className="flex-1 flex flex-col h-full bg-slate-950/80 border-r border-slate-800">
              {/* Context bar */}
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Current Scene:</span>
                  <span className="font-semibold text-yellow-400">Midtown Manhattan Rooftops</span>
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-400">Villain:</span>
                  <span className="text-red-400 font-semibold">Green Goblin</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowContext(!showContext)}
                    className="flex items-center gap-1 text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
                  >
                    <Info className="w-3 h-3" />
                    <span>{showContext ? 'Hide Context' : 'AI Context'}</span>
                  </button>
                  <button
                    onClick={() => handleSendMessage('/combat')}
                    className="text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
                  >
                    /combat
                  </button>
                  <button
                    onClick={() => handleSendMessage('/roll')}
                    className="text-slate-400 hover:text-slate-200 px-2 py-0.5 rounded bg-slate-800 border border-slate-700"
                  >
                    /roll
                  </button>
                </div>
              </div>

              {/* Context Drawer (Collapsible) */}
              {showContext && (
                <div className="bg-slate-900/90 border-b border-yellow-500/30 p-3 text-xs font-mono text-slate-300 max-h-48 overflow-y-auto">
                  <div className="text-yellow-400 font-bold mb-1 flex items-center gap-1">
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Injected Prompt Context</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-[11px] text-slate-400">
                    {`[ACTIVE HERO] ${activeChar?.name || 'Spider-Man'} (Rank ${activeChar?.rank || 4} ${activeChar?.archetype || 'Striker'})
HP: ${activeChar?.current_health}/${activeChar?.max_health} | Focus: ${activeChar?.current_focus}/${activeChar?.max_focus}
Defenses: Melee ${activeChar?.defenses.melee_defense}, Agility ${activeChar?.defenses.agility_defense}
Active Combatants: ${combatants.map(c => `${c.name} (${c.side})`).join(', ')}
Campaign: The Midnight Syndicate Invasion`}
                  </pre>
                </div>
              )}

              {/* Chat Message Stream */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                        {msg.role === 'user' ? (activeChar?.name || 'Hero') : 'Narrator AI'}
                      </span>
                      <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-xl p-4 shadow-lg text-sm leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white rounded-br-none border-2 border-red-500'
                          : 'bg-slate-900 text-slate-200 rounded-bl-none border-2 border-slate-700/80'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Embedded Dice Roll Card */}
                      {msg.metadata?.diceResult && (
                        <div className="mt-3 p-3 bg-slate-950/80 rounded-lg border border-slate-700 font-mono text-xs">
                          <div className="flex items-center justify-between text-yellow-400 font-bold mb-2">
                            <span>d616 Roll Breakdown</span>
                            {msg.metadata.diceResult.is_fantastic && (
                              <span className="bg-yellow-400 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black">
                                FANTASTIC!
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-slate-300">
                            <span className="bg-slate-800 px-2 py-1 rounded border border-slate-600">
                              Standard: {msg.metadata.diceResult.raw_dice?.standard_1}
                            </span>
                            <span className="bg-red-900/60 text-red-200 px-2 py-1 rounded border border-red-500 font-bold">
                              Marvel Die: {msg.metadata.diceResult.raw_dice?.marvel_die}
                            </span>
                            <span className="bg-slate-800 px-2 py-1 rounded border border-slate-600">
                              Standard: {msg.metadata.diceResult.raw_dice?.standard_2}
                            </span>
                            <span className="text-yellow-400 font-bold ml-auto">
                              Total: {msg.metadata.diceResult.total_score}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {isNarrating && (
                  <div className="flex items-center gap-2 text-slate-400 text-xs py-2">
                    <Sparkles className="w-4 h-4 text-red-400 animate-spin" />
                    <span>The Marvel Narrator is resolving the multiversal timeline...</span>
                  </div>
                )}
                <div ref={chatBottomRef} />
              </div>

              {/* Quick Action Badges */}
              <div className="px-4 py-2 bg-slate-900/50 border-t border-slate-800 flex items-center gap-2 overflow-x-auto text-xs">
                <span className="text-[11px] text-slate-500 uppercase font-bold shrink-0">Quick Actions:</span>
                <button
                  onClick={() => handleSendMessage('/attack "Green Goblin" melee')}
                  className="shrink-0 bg-red-950/50 hover:bg-red-900/60 text-red-300 border border-red-800/80 px-2.5 py-1 rounded-full transition flex items-center gap-1 font-semibold"
                >
                  <Swords className="w-3 h-3" /> Melee Strike
                </button>
                <button
                  onClick={() => handleSendMessage('I leap across the roof, shoot a web-line at his glider, and yank hard!')}
                  className="shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-full transition flex items-center gap-1"
                >
                  🕸️ Web-Snag Glider
                </button>
                <button
                  onClick={() => handleSendMessage('[4, 1, 5] (Marvel)')}
                  className="shrink-0 bg-yellow-950/50 hover:bg-yellow-900/60 text-yellow-300 border border-yellow-800/80 px-2.5 py-1 rounded-full transition flex items-center gap-1 font-mono font-bold"
                >
                  🎲 Report [4, 1, 5]
                </button>
                <button
                  onClick={() => handleSendMessage('/rules "damage_multiplier"')}
                  className="shrink-0 bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-800/80 px-2.5 py-1 rounded-full transition flex items-center gap-1"
                >
                  📖 Check Rules
                </button>
              </div>

              {/* Prompt Input Form */}
              <div className="p-3 bg-slate-900 border-t border-slate-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputPrompt}
                    onChange={(e) => setInputPrompt(e.target.value)}
                    placeholder="Describe your hero's action, use /roll, /attack, or enter [3, 1, 4]..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="submit"
                    disabled={isNarrating || !inputPrompt.trim()}
                    className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-[0_0_12px_rgba(239,68,68,0.4)] transition"
                  >
                    <span>Act</span>
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Right Quick Status Sidebar */}
            <div className="w-80 bg-slate-900/70 border-l border-slate-800 hidden lg:flex flex-col p-4 overflow-y-auto space-y-4">
              {/* Active Hero Card */}
              {activeChar && (
                <div className="bg-slate-950 border-2 border-red-500/50 rounded-xl p-4 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest">
                      ACTIVE HERO
                    </span>
                    <span className="bg-red-600/30 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/30">
                      RANK {activeChar.rank}
                    </span>
                  </div>
                  <h3 className="font-comic text-2xl text-white">{activeChar.name}</h3>
                  <p className="text-xs text-slate-400 mb-3">{activeChar.archetype} • {activeChar.origin}</p>

                  {/* Health Gauge */}
                  <div className="space-y-1 mb-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> Health
                      </span>
                      <span className="font-mono font-bold text-red-400">
                        {activeChar.current_health} / {activeChar.max_health}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-red-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, (activeChar.current_health / activeChar.max_health) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Focus Gauge */}
                  <div className="space-y-1 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400" /> Focus
                      </span>
                      <span className="font-mono font-bold text-blue-400">
                        {activeChar.current_focus} / {activeChar.max_focus}
                      </span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.max(0, Math.min(100, (activeChar.current_focus / activeChar.max_focus) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Ability Scores Grid */}
                  <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">MEL</div>
                      <div className="text-sm font-bold text-white">{activeChar.melee}</div>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">AGI</div>
                      <div className="text-sm font-bold text-white">{activeChar.agility}</div>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">RES</div>
                      <div className="text-sm font-bold text-white">{activeChar.resilience}</div>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">VIG</div>
                      <div className="text-sm font-bold text-white">{activeChar.vigilance}</div>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">EGO</div>
                      <div className="text-sm font-bold text-white">{activeChar.ego}</div>
                    </div>
                    <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
                      <div className="text-[10px] text-slate-400">LOG</div>
                      <div className="text-sm font-bold text-white">{activeChar.logic}</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Combat Tracker Preview */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-comic text-lg text-yellow-400 flex items-center gap-1.5">
                    <Swords className="w-4 h-4" /> Combatants
                  </h4>
                  <span className="text-[11px] text-slate-500">{combatants.length} Active</span>
                </div>
                <div className="space-y-2">
                  {combatants.map((c) => (
                    <div
                      key={c.name}
                      className="bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <div className="font-bold text-slate-200 flex items-center gap-1.5">
                          <span>{c.name}</span>
                          <span
                            className={`text-[9px] px-1 py-0.2 rounded font-black uppercase ${
                              c.side === 'player' ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'
                            }`}
                          >
                            {c.side}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          HP: {c.current_health}/{c.max_health}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleApplyDirectDamage(c.name, 10, 0)}
                          className="bg-red-950 text-red-300 hover:bg-red-900 text-[10px] font-bold px-1.5 py-0.5 rounded border border-red-800"
                        >
                          -10 HP
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: d616 DICE ENGINE */}
        {activeTab === 'dice' && (
          <div className="p-6 max-w-4xl mx-auto h-full overflow-y-auto space-y-6">
            <div className="bg-slate-900/90 border-2 border-red-500 rounded-2xl p-6 shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-comic text-3xl text-red-500 tracking-wide">
                    MARVEL d616 DICE SIMULATOR
                  </h2>
                  <p className="text-xs text-slate-400">
                    Standard Die 1 + Marvel Die (1 = 6 & Fantastic) + Standard Die 2 + Ability Modifier
                  </p>
                </div>
                <div className="bg-red-950/80 border border-red-600 px-3 py-1.5 rounded-lg text-xs font-mono font-bold text-red-300">
                  d616 Core v2.0
                </div>
              </div>

              {/* 3D-styled Visual Dice Pool */}
              <div className="grid grid-cols-3 gap-6 my-8">
                {/* Standard Die 1 */}
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                    Standard Die 1
                  </span>
                  <div
                    className={`w-24 h-24 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center font-comic text-5xl shadow-[6px_6px_0px_#475569] border-4 border-slate-300 transition-all transform ${
                      isRolling ? 'animate-bounce' : ''
                    }`}
                  >
                    {rollResult ? rollResult.raw_dice.standard_1 : '4'}
                  </div>
                </div>

                {/* Marvel Die */}
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-red-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Marvel Die
                  </span>
                  <div
                    className={`w-28 h-28 bg-gradient-to-br from-red-600 via-red-700 to-red-900 text-white rounded-2xl flex items-center justify-center font-comic text-6xl shadow-[6px_6px_0px_#7f1d1d] border-4 border-yellow-400 transition-all transform ${
                      isRolling ? 'animate-spin' : ''
                    }`}
                  >
                    {rollResult ? (
                      rollResult.raw_dice.marvel_die === 1 ? (
                        <div className="flex flex-col items-center">
                          <span className="text-yellow-300 text-5xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">M</span>
                          <span className="text-[10px] font-mono font-black text-yellow-300 -mt-1 tracking-tighter">FANTASTIC</span>
                        </div>
                      ) : (
                        rollResult.raw_dice.marvel_die
                      )
                    ) : (
                      'M'
                    )}
                  </div>
                </div>

                {/* Standard Die 2 */}
                <div className="flex flex-col items-center">
                  <span className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">
                    Standard Die 2
                  </span>
                  <div
                    className={`w-24 h-24 bg-slate-100 text-slate-900 rounded-2xl flex items-center justify-center font-comic text-5xl shadow-[6px_6px_0px_#475569] border-4 border-slate-300 transition-all transform ${
                      isRolling ? 'animate-bounce' : ''
                    }`}
                  >
                    {rollResult ? rollResult.raw_dice.standard_2 : '5'}
                  </div>
                </div>
              </div>

              {/* Outcome Banner */}
              {rollResult && (
                <div
                  className={`p-4 rounded-xl border-2 mb-6 text-center shadow-lg ${
                    rollResult.is_ultimate
                      ? 'bg-yellow-500/20 border-yellow-400 text-yellow-300'
                      : rollResult.is_botch
                      ? 'bg-red-950/60 border-red-600 text-red-300'
                      : rollResult.is_fantastic
                      ? 'bg-amber-950/40 border-amber-500 text-amber-300'
                      : 'bg-slate-800/80 border-slate-700 text-slate-200'
                  }`}
                >
                  <div className="font-comic text-4xl mb-1">
                    TOTAL CHECK SCORE: <span className="text-white underline">{rollResult.total_score}</span>
                  </div>
                  <div className="text-xs font-semibold flex items-center justify-center gap-3">
                    {rollResult.is_ultimate && (
                      <span className="flex items-center gap-1 font-bold text-yellow-400">
                        <Award className="w-4 h-4" /> ULTIMATE 616 SUCCESS! (Triple 6/M/6)
                      </span>
                    )}
                    {rollResult.is_botch && (
                      <span className="flex items-center gap-1 font-bold text-red-400">
                        <Skull className="w-4 h-4" /> BOTCH! Critical Failure (1-1-1)
                      </span>
                    )}
                    {rollResult.is_fantastic && !rollResult.is_botch && (
                      <span className="flex items-center gap-1 font-bold text-amber-400">
                        <Sparkles className="w-4 h-4" /> FANTASTIC ROLL! (Marvel Die 1 counts as 6 + Fantastic Outcome)
                      </span>
                    )}
                    {rollResult.target_number && (
                      <span
                        className={`px-2 py-0.5 rounded font-bold ${
                          rollResult.success ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                        }`}
                      >
                        {rollResult.success ? `SUCCESS vs TN ${rollResult.target_number}` : `FAILED vs TN ${rollResult.target_number}`}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Controls and Modifiers */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Ability Modifier (+{rollModifier})
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={rollModifier}
                      onChange={(e) => setRollModifier(parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Target Number (TN)
                  </label>
                  <input
                    type="number"
                    value={targetNumber}
                    onChange={(e) => setTargetNumber(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase mb-1">
                    Edge / Trouble
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEdges(edges > 0 ? 0 : 1);
                        setTroubles(0);
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                        edges > 0
                          ? 'bg-emerald-600 text-white border-emerald-400'
                          : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      Edge (+1)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTroubles(troubles > 0 ? 0 : 1);
                        setEdges(0);
                      }}
                      className={`flex-1 py-2 rounded-lg text-xs font-bold border transition ${
                        troubles > 0
                          ? 'bg-rose-600 text-white border-rose-400'
                          : 'bg-slate-950 text-slate-400 border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      Trouble (-1)
                    </button>
                  </div>
                </div>
              </div>

              {/* Roll Trigger Button */}
              <button
                onClick={handleRollDice}
                disabled={isRolling}
                className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-600 text-white font-comic text-2xl py-4 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.5)] transition tracking-wider flex items-center justify-center gap-3 disabled:opacity-50"
              >
                <Dices className="w-6 h-6" />
                <span>{isRolling ? 'ROLLING d616...' : 'ROLL d616 CHECK'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: COMBAT TRACKER */}
        {activeTab === 'combat' && (
          <div className="p-6 max-w-6xl mx-auto h-full overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-comic text-3xl text-red-500">ACTIVE COMBAT ENCOUNTER</h2>
                <p className="text-xs text-slate-400">
                  Track Health, Focus, Damage Multiplier (Rank × Marvel Die), and Actions
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleResolveAttack(true)}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow"
                >
                  <Swords className="w-3.5 h-3.5" /> Resolve Player Attack
                </button>
                <button
                  onClick={() => handleResolveAttack(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 border border-slate-700"
                >
                  <Skull className="w-3.5 h-3.5 text-red-400" /> Enemy Strike
                </button>
              </div>
            </div>

            {/* Attack Resolution Dialog / Result */}
            {lastAttackResult && (
              <div className="bg-slate-900 border-2 border-yellow-500/80 rounded-xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-comic text-xl text-yellow-400 flex items-center gap-2">
                    <Flame className="w-5 h-5 text-red-500" /> Attack Resolution Result
                  </h4>
                  <span className="text-xs text-slate-400">
                    Ability: <span className="font-bold text-white uppercase">{lastAttackResult.ability}</span>
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-400 font-bold mb-1">Attacker: {lastAttackResult.attacker.name}</div>
                    <div>Roll Score: <span className="text-yellow-400 font-bold">{lastAttackResult.roll.total_score}</span></div>
                    <div>Marvel Die: {lastAttackResult.roll.raw_dice?.marvel_die}</div>
                    {lastAttackResult.roll.is_fantastic && <div className="text-amber-400 font-bold">⭐ FANTASTIC HIT!</div>}
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-400 font-bold mb-1">Target: {lastAttackResult.target.name}</div>
                    <div>Defense TN: <span className="text-white font-bold">{lastAttackResult.target_number}</span></div>
                    <div>
                      Outcome:{' '}
                      <span className={lastAttackResult.roll.success ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                        {lastAttackResult.roll.success ? 'HIT!' : 'MISS!'}
                      </span>
                    </div>
                  </div>
                  <div className="bg-slate-950 p-3 rounded-lg border border-slate-800">
                    <div className="text-slate-400 font-bold mb-1">Damage Multiplier</div>
                    {lastAttackResult.damage ? (
                      <div>
                        <div>Damage Formula: {lastAttackResult.damage.damage_formula}</div>
                        <div>Total Damage: <span className="text-red-400 font-bold text-sm">{lastAttackResult.damage.total_damage}</span></div>
                        <div>Target HP: {lastAttackResult.target.current_health} / {lastAttackResult.target.max_health}</div>
                      </div>
                    ) : (
                      <div className="text-slate-500 italic">No damage applied (Attack missed).</div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Combatant Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Heroes / Allies */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-emerald-500/40 pb-2">
                  <Shield className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-comic text-xl text-emerald-400">HEROES & ALLIES</h3>
                </div>
                {combatants
                  .filter((c) => c.side === 'player' || c.side === 'ally')
                  .map((c) => (
                    <div key={c.name} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-comic text-2xl text-white">{c.name}</span>
                          <span className="text-[10px] font-bold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                            Rank {c.rank}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleApplyDirectDamage(c.name, -10, 0)}
                            className="bg-emerald-950 text-emerald-300 hover:bg-emerald-900 text-xs px-2 py-1 rounded"
                          >
                            +10 HP
                          </button>
                          <button
                            onClick={() => handleApplyDirectDamage(c.name, 10, 0)}
                            className="bg-red-950 text-red-300 hover:bg-red-900 text-xs px-2 py-1 rounded"
                          >
                            -10 HP
                          </button>
                        </div>
                      </div>

                      {/* HP & Focus bars */}
                      <div className="space-y-2 mt-3 text-xs">
                        <div>
                          <div className="flex justify-between text-slate-400 mb-1">
                            <span>Health</span>
                            <span className="font-mono font-bold text-red-400">{c.current_health}/{c.max_health}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2">
                            <div
                              className="bg-red-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.max(0, Math.min(100, (c.current_health / c.max_health) * 100))}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-400 mb-1">
                            <span>Focus</span>
                            <span className="font-mono font-bold text-blue-400">{c.current_focus}/{c.max_focus}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2">
                            <div
                              className="bg-blue-500 h-full rounded-full transition-all"
                              style={{ width: `${Math.max(0, Math.min(100, (c.current_focus / c.max_focus) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {/* Villains / Adversaries */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-red-500/40 pb-2">
                  <Skull className="w-5 h-5 text-red-400" />
                  <h3 className="font-comic text-xl text-red-400">VILLAINS & ENEMIES</h3>
                </div>
                {combatants
                  .filter((c) => c.side === 'enemy' || c.side === 'npc')
                  .map((c) => (
                    <div key={c.name} className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="font-comic text-2xl text-white">{c.name}</span>
                          <span className="text-[10px] font-bold bg-red-950 text-red-400 px-2 py-0.5 rounded border border-red-800">
                            Rank {c.rank}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleApplyDirectDamage(c.name, 15, 0)}
                            className="bg-red-950 text-red-300 hover:bg-red-900 text-xs px-2 py-1 rounded border border-red-800"
                          >
                            -15 HP
                          </button>
                          <button
                            onClick={() => handleApplyDirectDamage(c.name, 30, 0)}
                            className="bg-red-950 text-red-300 hover:bg-red-900 text-xs px-2 py-1 rounded border border-red-800"
                          >
                            -30 HP
                          </button>
                        </div>
                      </div>

                      {/* HP & Focus bars */}
                      <div className="space-y-2 mt-3 text-xs">
                        <div>
                          <div className="flex justify-between text-slate-400 mb-1">
                            <span>Health</span>
                            <span className="font-mono font-bold text-red-400">{c.current_health}/{c.max_health}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2">
                            <div
                              className="bg-red-600 h-full rounded-full transition-all"
                              style={{ width: `${Math.max(0, Math.min(100, (c.current_health / c.max_health) * 100))}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-400 mb-1">
                            <span>Focus</span>
                            <span className="font-mono font-bold text-blue-400">{c.current_focus}/{c.max_focus}</span>
                          </div>
                          <div className="w-full bg-slate-800 rounded-full h-2">
                            <div
                              className="bg-blue-600 h-full rounded-full transition-all"
                              style={{ width: `${Math.max(0, Math.min(100, (c.current_focus / c.max_focus) * 100))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: CHARACTER ROSTER */}
        {activeTab === 'characters' && (
          <div className="p-6 max-w-6xl mx-auto h-full overflow-y-auto space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-comic text-3xl text-red-500">CHARACTER ROSTER</h2>
                <p className="text-xs text-slate-400">
                  Pre-configured Marvel Heroes & Custom Characters (with archetype templates)
                </p>
              </div>
              <button
                onClick={() => setShowCreatorModal(true)}
                className="bg-red-600 hover:bg-red-500 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 shadow"
              >
                <Plus className="w-4 h-4" /> Create Character
              </button>
            </div>

            {/* Character Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {characters.map((char) => {
                const isActive = activeCharName.toLowerCase() === char.name.toLowerCase();
                return (
                  <div
                    key={char.name}
                    className={`bg-slate-900 rounded-xl p-5 border-2 transition-all shadow-xl flex flex-col justify-between ${
                      isActive ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded font-bold">
                          RANK {char.rank} • {char.archetype}
                        </span>
                        {isActive && (
                          <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded font-comic tracking-wide">
                            ACTIVE
                          </span>
                        )}
                      </div>

                      <h3 className="font-comic text-2xl text-white mb-1">{char.name}</h3>
                      <p className="text-xs text-slate-400 mb-4">{char.origin} • {char.occupation}</p>

                      {/* Defenses table */}
                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono mb-4 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <div>
                          <div className="text-[10px] text-slate-500">Melee Def</div>
                          <div className="font-bold text-slate-200">{char.defenses.melee_defense}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Agility Def</div>
                          <div className="font-bold text-slate-200">{char.defenses.agility_defense}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Resil Def</div>
                          <div className="font-bold text-slate-200">{char.defenses.resilience_defense}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Vigil Def</div>
                          <div className="font-bold text-slate-200">{char.defenses.vigilance_defense}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Ego Def</div>
                          <div className="font-bold text-slate-200">{char.defenses.ego_defense}</div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-500">Logic Def</div>
                          <div className="font-bold text-slate-200">{char.defenses.logic_defense}</div>
                        </div>
                      </div>

                      {/* Traits & Tags */}
                      <div className="space-y-2 mb-4 text-xs">
                        <div className="text-slate-400">
                          <span className="font-bold text-slate-300">Traits:</span> {char.traits.join(', ')}
                        </div>
                        <div className="text-slate-400">
                          <span className="font-bold text-slate-300">Power Sets:</span>{' '}
                          {char.power_sets.map((p) => (typeof p === 'string' ? p : p.name)).join(', ')}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSelectActiveChar(char.name)}
                      className={`w-full py-2 rounded-lg text-xs font-bold transition ${
                        isActive
                          ? 'bg-slate-800 text-slate-400 cursor-default'
                          : 'bg-red-600 hover:bg-red-500 text-white'
                      }`}
                    >
                      {isActive ? 'Current Hero' : 'Select as Active Hero'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 5: RULES DATABASE */}
        {activeTab === 'rules' && (
          <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <h2 className="font-comic text-3xl text-red-500 mb-2">MARVEL MULTIVERSE RULEBOOK</h2>
              <p className="text-xs text-slate-400 mb-4">
                Instant search over mechanics, core attributes, powers, formulas, and citations.
              </p>

              {/* Search Bar */}
              <div className="relative mb-6">
                <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchRules(e.target.value)}
                  placeholder="Search powers or mechanics (e.g. d616, melee, claws, fantastic_roll, running_speed)..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Exact Match Citation */}
              {ruleResults.exactMatch && (
                <div className="bg-slate-950 border-2 border-yellow-500/80 rounded-xl p-4 mb-6 shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest">
                      EXACT RULE CITATION
                    </span>
                    <span className="bg-yellow-400 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded">
                      {ruleResults.exactMatch.category || 'General'}
                    </span>
                  </div>
                  <h3 className="font-comic text-2xl text-white mb-2">
                    {ruleResults.exactMatch.title || ruleResults.exactMatch.name}
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed mb-3">
                    {ruleResults.exactMatch.description || ruleResults.exactMatch.summary}
                  </p>
                  {ruleResults.exactMatch.formula && (
                    <div className="bg-slate-900 p-2 rounded border border-slate-800 font-mono text-xs text-yellow-300 mb-2">
                      Formula: {ruleResults.exactMatch.formula}
                    </div>
                  )}
                  {ruleResults.exactMatch.examples && (
                    <div className="text-xs text-slate-400">
                      Examples: {ruleResults.exactMatch.examples.join('; ')}
                    </div>
                  )}
                </div>
              )}

              {/* Results Lists */}
              <div className="space-y-4">
                {ruleResults.powerMatches.length > 0 && (
                  <div>
                    <h4 className="font-comic text-xl text-yellow-400 mb-3">Matching Powers</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ruleResults.powerMatches.map((p: any) => (
                        <div key={p.name} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs">
                          <div className="flex items-center justify-between font-bold text-white mb-1">
                            <span>{p.name}</span>
                            <span className="text-[10px] text-red-400">Rank {p.rank_required}</span>
                          </div>
                          <p className="text-slate-400 leading-relaxed">{p.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {ruleResults.mechanicsMatches.length > 0 && (
                  <div>
                    <h4 className="font-comic text-xl text-red-400 mb-3">Matching Mechanics</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {ruleResults.mechanicsMatches.map((m: any) => (
                        <div key={m.key} className="bg-slate-950 p-3.5 rounded-lg border border-slate-800 text-xs">
                          <div className="font-bold text-white mb-1">{m.title}</div>
                          <p className="text-slate-400 leading-relaxed mb-2">{m.description}</p>
                          {m.formula && (
                            <div className="font-mono text-[11px] text-yellow-300">Formula: {m.formula}</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: CAMPAIGN & JOURNAL */}
        {activeTab === 'campaign' && campaignData && (
          <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
                <div>
                  <div className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-1">
                    CURRENT CAMPAIGN
                  </div>
                  <h2 className="font-comic text-3xl text-white">{campaignData.plan?.theme}</h2>
                  <p className="text-xs text-slate-400">
                    Villain: <span className="text-red-400 font-bold">{campaignData.plan?.villain}</span> • Heroes:{' '}
                    {campaignData.plan?.hero_team.join(', ')}
                  </p>
                </div>
                <div className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-xs font-mono">
                  Session {campaignData.plan?.current_session} of {campaignData.plan?.sessions.length}
                </div>
              </div>

              {/* Sessions Roadmap */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {campaignData.plan?.sessions.map((s: any) => (
                  <div
                    key={s.session_number}
                    className={`p-4 rounded-xl border ${
                      s.status === 'active'
                        ? 'bg-red-950/40 border-red-500 shadow-md'
                        : s.status === 'completed'
                        ? 'bg-slate-950 border-emerald-500/50 opacity-80'
                        : 'bg-slate-950 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span className="text-yellow-400">{s.act}</span>
                      <span className="text-[10px] uppercase font-mono">{s.status}</span>
                    </div>
                    <h4 className="font-comic text-lg text-white mb-2">{s.title}</h4>
                    <p className="text-xs text-slate-400 leading-relaxed mb-3">{s.briefing}</p>
                    <div className="text-[11px] text-slate-300 font-semibold">
                      Objective: {s.primary_objective}
                    </div>
                  </div>
                ))}
              </div>

              {/* Memories & Event Logs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-800 pt-6">
                <div>
                  <h4 className="font-comic text-xl text-yellow-400 mb-3">Campaign Lore & Entities</h4>
                  <div className="space-y-2">
                    {campaignData.memories?.map((m: any) => (
                      <div key={m.id} className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs">
                        <div className="flex items-center justify-between font-bold text-white mb-1">
                          <span>{m.title}</span>
                          <span className="text-[10px] text-slate-500 uppercase">{m.category}</span>
                        </div>
                        <p className="text-slate-400">{m.details}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-comic text-xl text-red-400 mb-3">Plot Chronology Log</h4>
                  <div className="space-y-2 font-mono text-xs">
                    {campaignData.eventLog?.map((ev: string, idx: number) => (
                      <div key={idx} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-300">
                        {ev}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Assisted Character Creator Modal */}
      {showCreatorModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-2 border-red-500 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="font-comic text-2xl text-red-500 mb-2">ASSISTED HERO CREATOR</h3>
            <p className="text-xs text-slate-400 mb-4">
              Select an archetype and rank to automatically generate balanced ability scores and defenses.
            </p>

            <form onSubmit={handleCreateCharacter} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-slate-400 mb-1">Character Name</label>
                <input
                  type="text"
                  required
                  value={newCharName}
                  onChange={(e) => setNewCharName(e.target.value)}
                  placeholder="e.g. Moon Knight, Nova, Storm"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Archetype Template</label>
                <select
                  value={newCharArchetype}
                  onChange={(e) => setNewCharArchetype(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                >
                  <option value="Striker">Striker (High Melee offense)</option>
                  <option value="Blaster">Blaster (Ranged energy/projectiles)</option>
                  <option value="Protector">Protector (Defensive powerhouse)</option>
                  <option value="Brawler">Brawler (Durable close-combatant)</option>
                  <option value="Way-Watcher">Way-Watcher (Scout, agility & vigilance)</option>
                  <option value="Polymath">Polymath (Balanced multi-specialist)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Rank (1 to 6)</label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    value={newCharRank}
                    onChange={(e) => setNewCharRank(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Origin</label>
                  <input
                    type="text"
                    value={newCharOrigin}
                    onChange={(e) => setNewCharOrigin(e.target.value)}
                    placeholder="e.g. Mutant, High-Tech"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Occupation</label>
                <input
                  type="text"
                  value={newCharOccupation}
                  onChange={(e) => setNewCharOccupation(e.target.value)}
                  placeholder="e.g. Scientist, Military, Detective"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreatorModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2.5 rounded-lg shadow"
                >
                  Create Hero
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
