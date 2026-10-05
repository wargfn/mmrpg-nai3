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
  ArrowUp,
  ArrowDown,
  SkipForward,
  SkipBack,
  RotateCcw,
  Clock,
  X,
  Star,
  Sliders,
  Minus,
  Check,
  Download,
  FileText,
  Copy,
  Tag,
  Activity,
  Edit3,
  FolderOpen,
  FileJson,
  Save,
  Upload,
  HardDrive,
} from 'lucide-react';
import { STANDARD_CONDITIONS } from './core/combat.ts';
import { initializeDiscordSdk } from './utils/discord.ts';
import { LoginScreen } from './components/LoginScreen.tsx';
import { UsersManagementView } from './components/UsersManagementView.tsx';
import { CampaignEditModal } from './components/CampaignEditModal.tsx';
import { CampaignFileManagerModal } from './components/CampaignFileManagerModal.tsx';
import { CampaignPlan } from './core/campaign.ts';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  modelUsed?: string;
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
  initiative?: number | null;
  initiative_roll?: any;
  order?: number;
  is_active_turn?: boolean;
}

export default function App() {
  const [currentUser, setCurrentUser] = useState<{ username: string; role: string } | null>(() => {
    try {
      const saved = localStorage.getItem('marvel_multiverse_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<'narrator' | 'dice' | 'combat' | 'characters' | 'rules' | 'campaign' | 'users'>('narrator');

  // Narrator state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isNarrating, setIsNarrating] = useState(false);
  const [activeCharName, setActiveCharName] = useState('Spider-Man');
  const [characters, setCharacters] = useState<CharacterSheet[]>([]);
  const [showContext, setShowContext] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('gemini-3.5-flash');
  const [selectedRole, setSelectedRole] = useState<string>('stan_lee');
  const [narratorFontSize, setNarratorFontSize] = useState<'xs' | 'sm' | 'base' | 'lg'>('sm');
  const [narratorOnline, setNarratorOnline] = useState<boolean>(true);
  const [apiKeyStatus, setApiKeyStatus] = useState<any>(null);
  const [availableModels, setAvailableModels] = useState<any[]>([
    { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', badge: 'General Tasks', desc: 'Balanced & responsive' },
    { id: 'gemini-3.1-flash-lite', name: 'Gemini 3.1 Flash Lite', badge: 'Fast Tasks', desc: 'Ultra-fast reactions' },
    { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview', badge: 'Complex Tasks', desc: 'Deep lore & tactics' },
    { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash', badge: 'Omni Tasks', desc: 'Advanced multi-modal capabilities' },
  ]);
  const [availableRoles, setAvailableRoles] = useState<any[]>([
    { id: 'stan_lee', name: 'Stan Lee', icon: '🎙️', tagline: 'The True Believer GM' },
    { id: 'the_watcher', name: 'The Watcher', icon: '👁️', tagline: 'Cosmic Multiverse Observer' },
    { id: 'tactical_gm', name: 'Tactical Arbiter', icon: '⚔️', tagline: 'Grid & Mechanics Focus' },
    { id: 'gritty_street', name: 'Gritty Street GM', icon: '🏙️', tagline: 'Visceral Urban Action' },
  ]);
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
  const [damageHistory, setDamageHistory] = useState<any[]>([]);
  const [combatRound, setCombatRound] = useState<number>(1);
  const [currentTurnIndex, setCurrentTurnIndex] = useState<number>(0);
  const [activeCombatant, setActiveCombatant] = useState<string | null>('Spider-Man');
  const [editingInitCombatant, setEditingInitCombatant] = useState<string | null>(null);
  const [customInitValue, setCustomInitValue] = useState<string>('');
  const [attackAttacker, setAttackAttacker] = useState<string>('Spider-Man');
  const [attackTarget, setAttackTarget] = useState<string>('Green Goblin');
  const [attackAbility, setAttackAbility] = useState<string>('melee');
  const [lastAttackResult, setLastAttackResult] = useState<any>(null);
  const [activeConditionCombatant, setActiveConditionCombatant] = useState<string | null>(null);
  const [customConditionInput, setCustomConditionInput] = useState<string>('');

  // Rules state
  const [searchQuery, setSearchQuery] = useState('');
  const [ruleResults, setRuleResults] = useState<any>({ mechanicsMatches: [], powerMatches: [] });
  const [selectedRule, setSelectedRule] = useState<any>(null);
  const [rulesIndex, setRulesIndex] = useState<any>(null);
  const [rulesFilterCategory, setRulesFilterCategory] = useState<'all' | 'mechanics' | 'powers' | 'origins' | 'occupations' | 'traits'>('all');
  const [expandedPowerSets, setExpandedPowerSets] = useState<Record<string, boolean>>({});

  // Campaign state
  const [campaignData, setCampaignData] = useState<any>(null);
  const [newEventText, setNewEventText] = useState('');
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const [copiedLog, setCopiedLog] = useState(false);
  const [isDownloadingLog, setIsDownloadingLog] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [campaignModalSource, setCampaignModalSource] = useState<'narrator' | 'campaign'>('campaign');
  const [campaignModalEpisode, setCampaignModalEpisode] = useState<number | undefined>(undefined);

  // Server-side JSON Campaign Files Manager state
  const [isCampaignFileManagerOpen, setIsCampaignFileManagerOpen] = useState(false);
  const [campaignFileManagerInitialTab, setCampaignFileManagerInitialTab] = useState<'load' | 'save' | 'import'>('load');
  const [serverSavedCampaigns, setServerSavedCampaigns] = useState<any[]>([]);

  const handleOpenCampaignModal = (source: 'narrator' | 'campaign' = 'campaign', episodeNumber?: number) => {
    setCampaignModalSource(source);
    setCampaignModalEpisode(episodeNumber);
    setIsCampaignModalOpen(true);
  };

  const handleOpenCampaignFileManager = (tab: 'load' | 'save' | 'import' = 'load') => {
    setCampaignFileManagerInitialTab(tab);
    setIsCampaignFileManagerOpen(true);
  };

  const fetchServerCampaignFiles = async () => {
    try {
      const res = await fetch('/api/campaign/files');
      const data = await res.json();
      if (data.files) {
        setServerSavedCampaigns(data.files);
      }
    } catch {}
  };

  const handleCampaignLoadedFromFile = (data: {
    plan: CampaignPlan;
    context?: any;
    memories?: any[];
    eventLog?: string[];
  }) => {
    setCampaignData({
      plan: data.plan,
      context: data.context || {
        plan: data.plan,
        session: data.plan.sessions?.find(s => s.session_number === data.plan.current_session) || data.plan.sessions?.[0],
      },
      memories: data.memories || [],
      eventLog: data.eventLog || [],
    });
    fetchCampaign();
    fetchMessages();
    fetchServerCampaignFiles();
  };

  const handleSaveCampaignSuccess = (updatedPlan: CampaignPlan) => {
    setCampaignData((prev: any) => ({
      ...prev,
      plan: updatedPlan,
      context: {
        ...prev?.context,
        plan: updatedPlan,
        session: updatedPlan.sessions.find(s => s.session_number === updatedPlan.current_session) || updatedPlan.sessions[0],
      },
    }));
    fetchCampaign();
    fetchMessages();
    fetchServerCampaignFiles();
  };

  // Character creator state
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [newCharName, setNewCharName] = useState('');
  const [newCharArchetype, setNewCharArchetype] = useState('Striker');
  const [newCharRank, setNewCharRank] = useState(3);
  const [newCharOrigin, setNewCharOrigin] = useState('High-Tech');
  const [newCharOccupation, setNewCharOccupation] = useState('Adventurer');

  // Report Roll Modal & options state
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportAbility, setReportAbility] = useState<string>('melee');
  const [reportTN, setReportTN] = useState<string>('15');
  const [reportEdge, setReportEdge] = useState<number>(0);
  const [reportTrouble, setReportTrouble] = useState<number>(0);
  const [reportDescription, setReportDescription] = useState<string>('');

  // Dedicated Karma Tracker & Spending State
  const [lastKarmaFeedback, setLastKarmaFeedback] = useState<{
    action: string;
    description: string;
    timestamp: string;
    rollResult?: any;
  } | null>(null);
  const [customKarmaInput, setCustomKarmaInput] = useState<string>('');
  const [showKarmaSetPopover, setShowKarmaSetPopover] = useState(false);
  const [customOutcomeBonus, setCustomOutcomeBonus] = useState<number>(3);
  const [showKarmaRulesGuide, setShowKarmaRulesGuide] = useState(false);
  const [isKarmaExpanded, setIsKarmaExpanded] = useState(true);
  const [showMobileHeroModal, setShowMobileHeroModal] = useState(false);
  const [discordUser, setDiscordUser] = useState<any>(null);

  if (!currentUser) {
    return (
      <LoginScreen
        onLogin={(user) => {
          setCurrentUser(user);
          localStorage.setItem('marvel_multiverse_user', JSON.stringify(user));
        }}
      />
    );
  }

  // Load initial data
  useEffect(() => {
    initializeDiscordSdk().then(({ user }) => {
      if (user) {
        setDiscordUser(user);
      }
    });
    fetchMessages();
    fetchCharacters();
    fetchCombat();
    fetchCampaign();
    fetchRulesIndex();
    fetchServerCampaignFiles();
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
      if (data.activeModel) setSelectedModel(data.activeModel);
      if (data.activeRole?.id) setSelectedRole(data.activeRole.id);

      const cfgRes = await fetch('/api/narrator/config');
      const cfgData = await cfgRes.json();
      if (typeof cfgData.isOnline === 'boolean') setNarratorOnline(cfgData.isOnline);
      if (cfgData.apiKeyStatus) setApiKeyStatus(cfgData.apiKeyStatus);
    } catch (e) {
      console.error(e);
    }
  };

  const handleModelChange = async (modelId: string) => {
    setSelectedModel(modelId);
    try {
      await fetch('/api/narrator/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: modelId, role: selectedRole }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleRoleChange = async (roleId: string) => {
    setSelectedRole(roleId);
    try {
      await fetch('/api/narrator/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: selectedModel, role: roleId }),
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearMessages = async () => {
    try {
      const res = await fetch('/api/narrator/clear', { method: 'POST' });
      const data = await res.json();
      if (data.messages) setMessages(data.messages);
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

  const updateCombatState = (data: any) => {
    if (data.combatants) setCombatants(data.combatants);
    if (data.damage_history) setDamageHistory(data.damage_history);
    if (data.round !== undefined) setCombatRound(data.round);
    if (data.current_turn_index !== undefined) setCurrentTurnIndex(data.current_turn_index);
    if (data.active_combatant !== undefined) setActiveCombatant(data.active_combatant);
  };

  const fetchCombat = async () => {
    try {
      const res = await fetch('/api/combat');
      const data = await res.json();
      updateCombatState(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleClearDamageHistory = async () => {
    try {
      const res = await fetch('/api/combat/history/clear', { method: 'POST' });
      const data = await res.json();
      if (data.history) setDamageHistory(data.history);
    } catch (e) {
      console.error(e);
    }
  };

  const handleRollInitiative = async (name?: string) => {
    try {
      const res = await fetch('/api/combat/initiative/roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      updateCombatState(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetInitiative = async (name: string, val: number | null) => {
    try {
      const res = await fetch('/api/combat/initiative/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, initiative: val }),
      });
      const data = await res.json();
      updateCombatState(data);
      setEditingInitCombatant(null);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSortInitiative = async () => {
    try {
      const res = await fetch('/api/combat/initiative/sort', { method: 'POST' });
      const data = await res.json();
      updateCombatState(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleMoveCombatant = async (name: string, direction: 'up' | 'down') => {
    try {
      const res = await fetch('/api/combat/initiative/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, direction }),
      });
      const data = await res.json();
      updateCombatState(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleNextTurn = async () => {
    try {
      const res = await fetch('/api/combat/turn/next', { method: 'POST' });
      const data = await res.json();
      updateCombatState(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrevTurn = async () => {
    try {
      const res = await fetch('/api/combat/turn/prev', { method: 'POST' });
      const data = await res.json();
      updateCombatState(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSetTurn = async (target: number | string) => {
    try {
      const body = typeof target === 'number' ? { index: target } : { name: target };
      const res = await fetch('/api/combat/turn/set', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      updateCombatState(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleResetInitiative = async () => {
    try {
      const res = await fetch('/api/combat/initiative/reset', { method: 'POST' });
      const data = await res.json();
      updateCombatState(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleCondition = async (name: string, condition: string) => {
    try {
      const res = await fetch('/api/combat/condition/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, condition }),
      });
      const data = await res.json();
      updateCombatState(data);
      fetchCharacters();
    } catch (e) {
      console.error('Error toggling condition:', e);
    }
  };

  const handleAddCondition = async (name: string, condition: string) => {
    if (!condition.trim()) return;
    try {
      const res = await fetch('/api/combat/condition/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, condition: condition.trim() }),
      });
      const data = await res.json();
      updateCombatState(data);
      fetchCharacters();
    } catch (e) {
      console.error('Error adding condition:', e);
    }
  };

  const handleRemoveCondition = async (name: string, condition: string) => {
    try {
      const res = await fetch('/api/combat/condition/remove', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, condition }),
      });
      const data = await res.json();
      updateCombatState(data);
      fetchCharacters();
    } catch (e) {
      console.error('Error removing condition:', e);
    }
  };

  const handleClearConditions = async (name: string) => {
    try {
      const res = await fetch('/api/combat/condition/clear', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      updateCombatState(data);
      fetchCharacters();
    } catch (e) {
      console.error('Error clearing conditions:', e);
    }
  };

  const getConditionColor = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('stun')) return 'bg-amber-950/80 text-amber-300 border-amber-500/70';
    if (lower.includes('invis')) return 'bg-cyan-950/80 text-cyan-300 border-cyan-500/70';
    if (lower.includes('prone')) return 'bg-orange-950/80 text-orange-300 border-orange-500/70';
    if (lower.includes('blind')) return 'bg-purple-950/80 text-purple-300 border-purple-500/70';
    if (lower.includes('deaf')) return 'bg-slate-900 text-slate-300 border-slate-700';
    if (lower.includes('paralyz')) return 'bg-red-950/90 text-red-300 border-red-500/80';
    if (lower.includes('bleed')) return 'bg-rose-950/80 text-rose-300 border-rose-500/70';
    if (lower.includes('grab') || lower.includes('pin')) return 'bg-yellow-950/80 text-yellow-300 border-yellow-500/70';
    if (lower.includes('slow')) return 'bg-blue-950/80 text-blue-300 border-blue-500/70';
    if (lower.includes('phas')) return 'bg-indigo-950/80 text-indigo-300 border-indigo-500/70';
    if (lower.includes('fly')) return 'bg-sky-950/80 text-sky-300 border-sky-500/70';
    if (lower.includes('unconscious')) return 'bg-zinc-950 text-zinc-400 border-zinc-600';
    return 'bg-slate-900 text-slate-300 border-slate-700';
  };

  const getConditionIcon = (name: string) => {
    const match = STANDARD_CONDITIONS.find(c => c.name.toLowerCase() === name.toLowerCase());
    if (match) return match.icon;
    return '⚡';
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
        body: JSON.stringify({
          message: promptToSend,
          model: selectedModel,
          role: selectedRole,
        }),
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

  const handleReportRoll = async (options?: {
    ability?: string;
    ability_modifier?: number;
    target_number?: number | null;
    edges?: number;
    troubles?: number;
    actionDescription?: string;
    preRolledResult?: any;
    narrate_outcome?: boolean;
  }) => {
    if (isNarrating) return;
    setIsNarrating(true);

    try {
      const activeChar = characters.find(c => c.name === activeCharName);
      const chosenAbility = options?.ability || reportAbility || 'melee';
      let abilityMod = options?.ability_modifier;
      if (abilityMod === undefined && activeChar && (activeChar as any)[chosenAbility] !== undefined) {
        abilityMod = (activeChar as any)[chosenAbility];
      }

      // Check description from parameter or prompt input
      const description =
        options?.actionDescription !== undefined
          ? options.actionDescription
          : inputPrompt.trim()
          ? inputPrompt.trim()
          : reportDescription.trim()
          ? reportDescription.trim()
          : undefined;

      if (inputPrompt.trim() && !options?.actionDescription) {
        setInputPrompt('');
      }

      const tn =
        options?.target_number !== undefined
          ? options.target_number
          : reportTN
          ? parseInt(reportTN, 10)
          : null;

      const res = await fetch('/api/narrator/report-roll', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ability: chosenAbility,
          ability_modifier: abilityMod,
          target_number: tn,
          edges: options?.edges !== undefined ? options.edges : reportEdge,
          troubles: options?.troubles !== undefined ? options.troubles : reportTrouble,
          actionDescription: description,
          preRolledResult: options?.preRolledResult,
          narrate_outcome: options?.narrate_outcome ?? true,
          model: selectedModel,
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (data.messages) setMessages(data.messages);
      if (data.rollResult) setRollResult(data.rollResult);
      if (data.combatState?.combatants) setCombatants(data.combatState.combatants);
      fetchCharacters();
      setActiveTab('narrator');
    } catch (e) {
      console.error('Error reporting roll:', e);
    } finally {
      setIsNarrating(false);
      setShowReportModal(false);
      setReportDescription('');
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

  const fetchRulesIndex = async () => {
    try {
      const res = await fetch('/api/rules/index');
      const data = await res.json();
      setRulesIndex(data);
    } catch (e) {
      console.error('Error fetching rules index:', e);
    }
  };

  const togglePowerSet = (name: string) => {
    setExpandedPowerSets(prev => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  const handleSelectRule = (rule: any) => {
    setSelectedRule(rule);
  };

  const handleSendRuleToChat = (rule: any) => {
    const title = rule.title || rule.name;
    const desc = rule.description || rule.summary || '';
    const formulaPart = rule.formula ? ` | Formula: \`${rule.formula}\`` : '';
    const rankPart = rule.rank_required ? ` [Rank ${rule.rank_required}]` : '';
    const actionPart = rule.action ? ` (${rule.action})` : '';
    const text = `[Rule Citation] **${title}**${rankPart}${actionPart} - Category: *${rule.category || 'General'}*\n${desc}${formulaPart}`;
    handleSendMessage(text);
    setActiveTab('narrator');
  };

  const handleDownloadEventLog = async () => {
    setIsDownloadingLog(true);
    try {
      // 1. First attempt to fetch the formatted text file from the server
      const res = await fetch('/api/campaign/event-log/download');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const headerFilename = res.headers.get('content-disposition')?.split('filename=')?.[1]?.replace(/"/g, '');
        const filename = headerFilename || `marvel-campaign-event-log-${Date.now()}.txt`;
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        setDownloadSuccessMessage(`Downloaded ${filename} successfully!`);
        setTimeout(() => setDownloadSuccessMessage(null), 4000);
        setIsDownloadingLog(false);
        return;
      }
    } catch (e) {
      console.warn('Endpoint download failed, using client-side fallback:', e);
    }

    // 2. Client-side fallback text file generation
    try {
      const plan = campaignData?.plan;
      const eventLog: string[] = campaignData?.eventLog || [];
      const memories: any[] = campaignData?.memories || [];

      const lines: string[] = [
        '================================================================================',
        'MARVEL MULTIVERSE ROLE-PLAYING GAME - CAMPAIGN EVENT LOG & PLOT CHRONOLOGY',
        '================================================================================',
        `Campaign Title:   ${plan?.theme || 'Marvel Campaign'}`,
        `Supervillain:     ${plan?.villain || 'Unknown Villain'}`,
        `Hero Team:        ${plan?.hero_team?.join(', ') || 'Avengers & Allies'}`,
        `Current Session:  Episode ${plan?.current_session || 1} of ${plan?.sessions?.length || 1}`,
        `Generated On:     ${new Date().toLocaleString()}`,
        `Total Events:     ${eventLog.length} recorded event(s)`,
        '================================================================================',
        '',
        '--- SESSIONS ROADMAP ---',
      ];

      if (plan?.sessions?.length) {
        plan.sessions.forEach((s: any) => {
          lines.push(`[Session ${s.session_number}] ${s.title} (${s.status.toUpperCase()})`);
          lines.push(`  Act:           ${s.act}`);
          lines.push(`  Objective:     ${s.primary_objective}`);
          lines.push(`  Briefing:      ${s.briefing}`);
          if (s.complications?.length) {
            lines.push(`  Complications: ${s.complications.join('; ')}`);
          }
          if (s.key_encounters?.length) {
            lines.push(`  Encounters:    ${s.key_encounters.join('; ')}`);
          }
          lines.push('');
        });
      }

      if (memories.length > 0) {
        lines.push('--- CAMPAIGN LORE & MEMORIES ---');
        memories.forEach((m: any) => {
          lines.push(`• [${m.category?.toUpperCase()}] ${m.title}: ${m.details}`);
        });
        lines.push('');
      }

      lines.push('--- CHRONOLOGICAL EVENT LOG ---');
      if (eventLog.length > 0) {
        eventLog.forEach((ev: string, idx: number) => {
          lines.push(`[${idx + 1}] ${ev}`);
        });
      } else {
        lines.push('No events recorded yet.');
      }

      lines.push('');
      lines.push('================================================================================');
      lines.push('END OF CAMPAIGN RECORD');
      lines.push('================================================================================');

      const fileContent = lines.join('\n');
      const blob = new Blob([fileContent], { type: 'text/plain;charset=utf-8' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = (plan?.theme || 'marvel-campaign')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const filename = `${safeTitle}-event-log-${new Date().toISOString().slice(0, 10)}.txt`;
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setDownloadSuccessMessage(`Downloaded ${filename} successfully!`);
      setTimeout(() => setDownloadSuccessMessage(null), 4000);
    } catch (e) {
      console.error('Error generating event log download:', e);
    } finally {
      setIsDownloadingLog(false);
    }
  };

  const handleLogCustomEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventText.trim()) return;
    try {
      const res = await fetch('/api/campaign/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: newEventText.trim() }),
      });
      if (res.ok) {
        setNewEventText('');
        fetchCampaign();
      }
    } catch (err) {
      console.error('Error logging campaign event:', err);
    }
  };

  const handleCopyEventLog = () => {
    if (!campaignData?.eventLog?.length) return;
    const text = campaignData.eventLog.map((ev: string, idx: number) => `[${idx + 1}] ${ev}`).join('\n');
    navigator.clipboard.writeText(text);
    setCopiedLog(true);
    setTimeout(() => setCopiedLog(false), 2500);
  };

  const handleAdjustKarma = async (name: string, delta: number) => {
    try {
      const res = await fetch(`/api/characters/${encodeURIComponent(name)}/karma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta }),
      });
      const data = await res.json();
      if (data.character) {
        fetchCharacters();
        setLastKarmaFeedback({
          action: delta > 0 ? 'karma_awarded' : 'karma_deducted',
          description: delta > 0 ? `Awarded +${delta} Karma to ${name}` : `Deducted ${Math.abs(delta)} Karma from ${name}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (e) {
      console.error('Error adjusting karma:', e);
    }
  };

  const handleSetKarma = async (name: string, value: number) => {
    try {
      const res = await fetch(`/api/characters/${encodeURIComponent(name)}/karma`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ value: Math.max(0, value) }),
      });
      const data = await res.json();
      if (data.character) {
        fetchCharacters();
        setLastKarmaFeedback({
          action: 'karma_set',
          description: `Karma for ${name} set to ${Math.max(0, value)}`,
          timestamp: new Date().toLocaleTimeString(),
        });
      }
    } catch (e) {
      console.error('Error setting karma:', e);
    }
  };

  const handleSpendKarma = async (
    actionType: 'reroll_marvel' | 'reroll_lowest' | 'reroll_die_1' | 'reroll_die_2' | 'reroll_all' | 'adjust_score' | 'gain_edge',
    options?: { roll?: any; bonus?: number }
  ) => {
    if (!activeChar) return;
    if ((activeChar.karma ?? 0) <= 0) return;

    try {
      const rollToUse = options?.roll || rollResult || lastAttackResult?.roll;
      const res = await fetch(`/api/characters/${encodeURIComponent(activeChar.name)}/karma/spend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          actionType,
          amount: 1,
          currentRoll: rollToUse,
          bonus: options?.bonus !== undefined ? options.bonus : (customOutcomeBonus || activeChar.rank),
        }),
      });
      const data = await res.json();
      if (data.character) {
        fetchCharacters();
      }
      if (data.rollResult) {
        setRollResult(data.rollResult);
        if (lastAttackResult && lastAttackResult.roll) {
          setLastAttackResult({
            ...lastAttackResult,
            roll: data.rollResult,
          });
        }
      }
      if (data.actionDescription) {
        setLastKarmaFeedback({
          action: actionType,
          description: data.actionDescription,
          timestamp: new Date().toLocaleTimeString(),
          rollResult: data.rollResult,
        });
      }
      if (data.messages) {
        setMessages(data.messages);
      }
      if (actionType === 'gain_edge') {
        setEdges(1);
        setTroubles(0);
      }
    } catch (e) {
      console.error('Error spending karma:', e);
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

  const renderActiveHeroCard = (char: CharacterSheet) => {
    const isMaxKarma = (char.karma ?? 0) >= char.rank;
    const isZeroKarma = (char.karma ?? 0) <= 0;
    const totalStarSlots = Math.max(char.rank, (char.karma ?? 0) || 0);

    return (
      <div className="bg-slate-950 border-2 border-red-500/50 rounded-xl p-4 shadow-md space-y-4">
        {/* Active Hero Title & Rank */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest flex items-center gap-1">
              <Shield className="w-3 h-3 text-red-500" /> ACTIVE HERO
            </span>
            <span className="bg-red-600/30 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded border border-red-500/30">
              RANK {char.rank}
            </span>
          </div>
          <h3 className="font-comic text-2xl text-white">{char.name}</h3>
          <p className="text-xs text-slate-400">{char.archetype} • {char.origin}</p>
        </div>

        {/* Health Gauge */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Heart className="w-3.5 h-3.5 text-red-500 fill-red-500" /> Health
            </span>
            <span className="font-mono font-bold text-red-400">
              {char.current_health} / {char.max_health}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-red-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (char.current_health / char.max_health) * 100))}%` }}
            />
          </div>
        </div>

        {/* Focus Gauge */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="text-slate-400 flex items-center gap-1">
              <Zap className="w-3.5 h-3.5 text-blue-400 fill-blue-400" /> Focus
            </span>
            <span className="font-mono font-bold text-blue-400">
              {char.current_focus} / {char.max_focus}
            </span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.max(0, Math.min(100, (char.current_focus / char.max_focus) * 100))}%` }}
            />
          </div>
        </div>

        {/* Active Conditions on Active Hero Card */}
        {char.conditions && char.conditions.length > 0 && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1">
                <Tag className="w-3 h-3 text-yellow-400" /> Active Conditions ({char.conditions.length})
              </span>
              <button
                type="button"
                onClick={() => handleClearConditions(char.name)}
                className="text-red-400 hover:text-red-300 font-mono text-[9px] hover:underline cursor-pointer"
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {char.conditions.map((cond) => (
                <span
                  key={cond}
                  className={`text-[10px] px-1.5 py-0.5 rounded font-mono flex items-center gap-1 border shadow-xs ${getConditionColor(cond)}`}
                >
                  <span>{getConditionIcon(cond)}</span>
                  <span>{cond}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveCondition(char.name, cond)}
                    className="hover:text-red-400 text-slate-400 p-0.5 transition cursor-pointer"
                    title={`Remove ${cond}`}
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* DEDICATED KARMA TRACKER & SPENDING SECTION */}
        <div className="bg-slate-900/95 border-2 border-amber-500/60 rounded-xl p-3 shadow-[0_0_20px_rgba(245,158,11,0.18)] space-y-2.5">
          {/* Section Header: Title, Live Karma Count, Status Tag, and Expand/Collapse Toggle */}
          <div
            onClick={() => setIsKarmaExpanded(!isKarmaExpanded)}
            className="flex items-center justify-between cursor-pointer select-none group"
            title={isKarmaExpanded ? "Collapse to Karma Points only" : "Expand Karma spending & tactics"}
          >
            <div className="flex items-center gap-1.5">
              <span className="p-0.5 text-amber-400 group-hover:text-amber-300 transition">
                {isKarmaExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
              <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
              <span className="font-comic text-sm text-yellow-300 group-hover:text-yellow-200 tracking-wide uppercase transition">
                Karma Points
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isZeroKarma ? (
                <span className="text-[9px] bg-red-950/80 text-red-400 border border-red-800/80 px-1.5 py-0.5 rounded font-mono font-bold">
                  DEPLETED
                </span>
              ) : isMaxKarma ? (
                <span className="text-[9px] bg-amber-950/80 text-amber-300 border border-amber-800/80 px-1.5 py-0.5 rounded font-mono font-bold">
                  HEROIC READY
                </span>
              ) : (
                <span className="text-[9px] bg-slate-800 text-slate-300 border border-slate-700 px-1.5 py-0.5 rounded font-mono font-bold">
                  ACTIVE
                </span>
              )}
              <div className="flex items-baseline gap-1 font-mono">
                <span className="text-xl font-black text-amber-400">{char.karma ?? 0}</span>
                <span className="text-[10px] text-slate-400">/ {Math.max(char.rank, char.karma ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Interactive Karma Stars & Modify Controls */}
          <div className={`flex items-center justify-between gap-1 ${isKarmaExpanded ? 'pb-2 border-b border-slate-800/80' : ''}`}>
            {/* Interactive Stars */}
            <div className="flex items-center gap-1 flex-wrap" title="Click any star to directly modify Karma">
              {Array.from({ length: totalStarSlots }).map((_, idx) => {
                const isFilled = idx < (char.karma ?? 0);
                const targetVal = isFilled && (char.karma === idx + 1) ? idx : idx + 1;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSetKarma(char.name, targetVal);
                    }}
                    className={`text-lg select-none leading-none transition-all transform hover:scale-125 cursor-pointer ${
                      isFilled
                        ? 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]'
                        : 'text-slate-700 hover:text-slate-500'
                    }`}
                    title={isFilled ? `Karma #${idx + 1} (Click to set to ${targetVal})` : `Empty Slot #${idx + 1} (Click to set to ${targetVal})`}
                  >
                    ★
                  </button>
                );
              })}
            </div>

            {/* Modify Controls Toolbar */}
            <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => handleAdjustKarma(char.name, -1)}
                disabled={isZeroKarma}
                title="Deduct 1 Karma point"
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 text-xs flex items-center justify-center font-bold font-mono transition border border-slate-700"
              >
                -
              </button>
              <button
                onClick={() => handleAdjustKarma(char.name, 1)}
                title="Award 1 Karma point (Heroic deed or GM reward)"
                className="w-5 h-5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-xs flex items-center justify-center font-bold font-mono transition border border-amber-500/50"
              >
                +
              </button>
              <button
                onClick={() => handleSetKarma(char.name, char.rank)}
                title={`Reset Karma to base Rank (${char.rank})`}
                className="px-1.5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] flex items-center justify-center font-mono transition border border-slate-700"
              >
                Rank
              </button>
              <button
                onClick={() => {
                  setShowKarmaSetPopover(!showKarmaSetPopover);
                  if (!isKarmaExpanded) setIsKarmaExpanded(true);
                }}
                title="Quickly set exact Karma amount"
                className={`px-1.5 h-5 rounded text-[10px] flex items-center gap-0.5 font-mono transition border ${
                  showKarmaSetPopover
                    ? 'bg-amber-600 text-white border-amber-400'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Sliders className="w-2.5 h-2.5" />
                <span>Set</span>
              </button>
              <button
                type="button"
                onClick={() => setIsKarmaExpanded(!isKarmaExpanded)}
                title={isKarmaExpanded ? "Collapse to Karma Points only" : "Expand Karma spending & tactics"}
                className={`ml-0.5 px-1.5 h-5 rounded text-[10px] font-bold font-mono flex items-center gap-0.5 transition border cursor-pointer ${
                  isKarmaExpanded
                    ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 border-slate-700'
                    : 'bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border-amber-500/50'
                }`}
              >
                <span>{isKarmaExpanded ? 'Collapse' : 'Tactics'}</span>
                {isKarmaExpanded ? <ChevronDown className="w-2.5 h-2.5" /> : <ChevronRight className="w-2.5 h-2.5" />}
              </button>
            </div>
          </div>

          {/* EXPANDABLE SECTION: Spending Controls, Check Context, and Rules */}
          {isKarmaExpanded && (
            <div className="space-y-3 pt-1 animate-in fade-in">
              {/* Quick Set Popover / Inline Tray */}
          {showKarmaSetPopover && (
            <div className="bg-slate-950 p-2 rounded-lg border border-amber-500/40 space-y-2 text-xs">
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between">
                <span>Set Exact Karma Value:</span>
                <button onClick={() => setShowKarmaSetPopover(false)} className="text-slate-500 hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-1 flex-wrap">
                {[0, 1, 2, 3, 4, 5, 6].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      handleSetKarma(char.name, num);
                      setShowKarmaSetPopover(false);
                    }}
                    className={`w-6 h-6 rounded text-xs font-mono font-bold flex items-center justify-center transition border ${
                      (char.karma ?? 0) === num
                        ? 'bg-amber-500 text-slate-950 border-amber-300 font-black'
                        : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-1 pt-1">
                <input
                  type="number"
                  min="0"
                  max="30"
                  placeholder="Custom"
                  value={customKarmaInput}
                  onChange={(e) => setCustomKarmaInput(e.target.value)}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                />
                <button
                  onClick={() => {
                    const val = parseInt(customKarmaInput, 10);
                    if (!isNaN(val)) {
                      handleSetKarma(char.name, val);
                      setCustomKarmaInput('');
                      setShowKarmaSetPopover(false);
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-500 text-white font-bold text-[10px] px-2 py-0.5 rounded transition"
                >
                  Apply
                </button>
              </div>
            </div>
          )}

          {/* Active Check Context HUD (Shows what roll Karma will modify) */}
          <div className="bg-slate-950/90 border border-slate-800 rounded-lg p-2 text-xs space-y-1">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400">
              <span className="flex items-center gap-1">
                <Dices className="w-3 h-3 text-yellow-400" /> Target Action Check:
              </span>
              {rollResult?.target_number && (
                <span
                  className={`font-mono px-1 rounded ${
                    rollResult.success ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' : 'bg-red-950 text-red-400 border border-red-800'
                  }`}
                >
                  {rollResult.success ? '✓ SUCCESS' : `✗ FAILED (TN ${rollResult.target_number})`}
                </span>
              )}
            </div>
            {rollResult ? (
              <div className="font-mono text-[11px] flex items-center justify-between text-slate-200">
                <div>
                  <span>[</span>
                  <span className="text-white font-bold">{rollResult.raw_dice?.standard_1 ?? rollResult.dice_values?.[0] ?? 3}</span>
                  <span>, </span>
                  <span className={`font-black ${rollResult.raw_dice?.marvel_die === 1 || rollResult.dice_values?.[1] === 1 ? 'text-yellow-400 font-bold' : 'text-red-400'}`}>
                    {rollResult.raw_dice?.marvel_die === 1 || rollResult.dice_values?.[1] === 1 ? 'M(6)★' : (rollResult.raw_dice?.marvel_die ?? rollResult.dice_values?.[1] ?? 3)}
                  </span>
                  <span>, </span>
                  <span className="text-white font-bold">{rollResult.raw_dice?.standard_2 ?? rollResult.dice_values?.[2] ?? 3}</span>
                  <span>] + {rollResult.ability_modifier} = </span>
                  <span className="text-amber-400 font-bold text-xs">{rollResult.total_score}</span>
                </div>
                {rollResult.is_fantastic && (
                  <span className="text-[10px] font-comic text-yellow-300 font-bold animate-pulse">
                    FANTASTIC!
                  </span>
                )}
              </div>
            ) : (
              <div className="text-[10px] text-slate-500 italic">
                No recent roll — ready to spend Karma on Edge or prime next action.
              </div>
            )}
          </div>

          {/* Spend Karma Actions */}
          <div className="space-y-2">
            {/* Category: Dice Rerolls */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 text-amber-300">
                  <RotateCcw className="w-3 h-3 text-amber-400" /> Dice Rerolls (1 Karma)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  onClick={() => handleSpendKarma('reroll_marvel')}
                  disabled={isZeroKarma}
                  className="bg-slate-950 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/70 disabled:opacity-40 text-slate-300 hover:text-amber-300 p-1.5 rounded-lg flex items-center gap-1.5 transition text-left"
                  title="Reroll the Marvel Die to seek a Fantastic 1 ('M' counts as 6) or escape a bad roll"
                >
                  <Dices className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-[10px] truncate">Reroll Marvel Die</div>
                    <div className="text-[9px] text-slate-500 truncate">Hunt Fantastic 1</div>
                  </div>
                </button>

                <button
                  onClick={() => handleSpendKarma('reroll_lowest')}
                  disabled={isZeroKarma}
                  className="bg-slate-950 hover:bg-amber-950/40 border border-slate-800 hover:border-amber-500/70 disabled:opacity-40 text-slate-300 hover:text-amber-300 p-1.5 rounded-lg flex items-center gap-1.5 transition text-left"
                  title="Reroll the lowest standard die to raise total check score"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-[10px] truncate">Reroll Lowest Die</div>
                    <div className="text-[9px] text-slate-500 truncate">Boost Standard</div>
                  </div>
                </button>

                <button
                  onClick={() => handleSpendKarma('reroll_all')}
                  disabled={isZeroKarma}
                  className="bg-slate-950 hover:bg-orange-950/40 border border-slate-800 hover:border-orange-500/70 disabled:opacity-40 text-slate-300 hover:text-orange-300 p-1.5 rounded-lg flex items-center gap-1.5 transition text-left"
                  title="Reroll all three dice in the d616 pool for a fresh attempt"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-[10px] truncate">Reroll All 3 Dice</div>
                    <div className="text-[9px] text-slate-500 truncate">Full Pool Reroll</div>
                  </div>
                </button>

                <div className="flex gap-1">
                  <button
                    onClick={() => handleSpendKarma('reroll_die_1')}
                    disabled={isZeroKarma}
                    className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-slate-300 p-1.5 rounded-lg text-center transition"
                    title="Reroll specifically Standard Die 1"
                  >
                    <div className="font-bold text-[10px]">Die 1</div>
                    <div className="text-[8px] text-slate-500">Reroll</div>
                  </button>
                  <button
                    onClick={() => handleSpendKarma('reroll_die_2')}
                    disabled={isZeroKarma}
                    className="flex-1 bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 disabled:opacity-40 text-slate-300 p-1.5 rounded-lg text-center transition"
                    title="Reroll specifically Standard Die 2"
                  >
                    <div className="font-bold text-[10px]">Die 2</div>
                    <div className="text-[8px] text-slate-500">Reroll</div>
                  </button>
                </div>
              </div>
            </div>

            {/* Category: Outcome Adjustments */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1 text-emerald-400">
                  <Sparkles className="w-3 h-3 text-emerald-400" /> Outcome Adjustments (1 Karma)
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <button
                  onClick={() => handleSpendKarma('adjust_score', { bonus: char.rank })}
                  disabled={isZeroKarma}
                  className="bg-slate-950 hover:bg-emerald-950/40 border border-slate-800 hover:border-emerald-500/70 disabled:opacity-40 text-slate-300 hover:text-emerald-300 p-1.5 rounded-lg flex items-center gap-1.5 transition text-left shadow-sm"
                  title={`Add +${char.rank} Karma Bonus (Hero Rank) to check score to turn a failure into a success`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-[10px] truncate">+{char.rank} Rank Bonus</div>
                    <div className="text-[9px] text-emerald-400/90 truncate">Turn miss to hit</div>
                  </div>
                </button>

                {/* Custom Bonus Stepper */}
                <div className="bg-slate-950 border border-slate-800 rounded-lg p-1 flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    <button
                      onClick={() => setCustomOutcomeBonus(Math.max(1, customOutcomeBonus - 1))}
                      className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-bold"
                      title="Decrease custom bonus"
                    >
                      -
                    </button>
                    <span className="font-mono text-[10px] font-bold text-emerald-300 w-5 text-center">
                      +{customOutcomeBonus}
                    </span>
                    <button
                      onClick={() => setCustomOutcomeBonus(Math.min(10, customOutcomeBonus + 1))}
                      className="w-4 h-4 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] flex items-center justify-center font-bold"
                      title="Increase custom bonus"
                    >
                      +
                    </button>
                  </div>
                  <button
                    onClick={() => handleSpendKarma('adjust_score', { bonus: customOutcomeBonus })}
                    disabled={isZeroKarma}
                    className="bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 text-[9px] font-bold px-1.5 py-1 rounded transition disabled:opacity-40"
                    title={`Spend 1 Karma to apply +${customOutcomeBonus} custom bonus to total check`}
                  >
                    Apply
                  </button>
                </div>
              </div>
            </div>

            {/* Category: Tactical Advantage */}
            <div>
              <button
                onClick={() => handleSpendKarma('gain_edge')}
                disabled={isZeroKarma}
                className="w-full bg-slate-950 hover:bg-blue-950/40 border border-slate-800 hover:border-blue-500/70 disabled:opacity-40 text-slate-300 hover:text-blue-300 p-1.5 rounded-lg flex items-center justify-between transition text-left"
                title="Spend 1 Karma to gain +1 Edge on the next action check"
              >
                <div className="flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <div>
                    <div className="font-bold text-[10px]">Gain Tactical Edge (+1 Edge)</div>
                    <div className="text-[9px] text-slate-500">Spend 1 Karma for advantage on next check</div>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-bold bg-blue-950 text-blue-300 px-1.5 py-0.5 rounded border border-blue-800">
                  1 Karma
                </span>
              </button>
            </div>
          </div>

          {/* Live Karma Feedback Card */}
          {lastKarmaFeedback && (
            <div className="bg-amber-950/40 border border-amber-500/50 rounded-lg p-2 text-xs space-y-1 animate-fadeIn">
              <div className="flex items-center justify-between text-[10px] font-bold text-amber-300">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  Karma Action Completed ({lastKarmaFeedback.timestamp})
                </span>
                <button
                  onClick={() => setLastKarmaFeedback(null)}
                  className="text-slate-400 hover:text-white"
                  title="Dismiss feedback"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[11px] text-slate-200 leading-tight">
                {lastKarmaFeedback.description}
              </p>
              <div className="pt-1 flex items-center justify-end gap-1">
                <button
                  onClick={() => {
                    handleSendMessage(`⭐ [Karma Action] ${lastKarmaFeedback.description}`);
                    setActiveTab('narrator');
                  }}
                  className="bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 border border-amber-500/50 text-[10px] px-2 py-0.5 rounded flex items-center gap-1 transition"
                  title="Post karma event to story chat"
                >
                  <Send className="w-2.5 h-2.5" />
                  <span>Send to Story</span>
                </button>
              </div>
            </div>
          )}

          {/* Karma Rules Reference Accordion */}
          <div className="border-t border-slate-800 pt-1.5">
            <button
              onClick={() => setShowKarmaRulesGuide(!showKarmaRulesGuide)}
              className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 hover:text-slate-200 py-0.5"
            >
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3 text-slate-500" />
                <span>Karma Rules (Marvel Multiverse RPG)</span>
              </span>
              {showKarmaRulesGuide ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </button>
            {showKarmaRulesGuide && (
              <div className="mt-1.5 bg-slate-950 p-2 rounded text-[10px] text-slate-400 space-y-1 font-sans border border-slate-800 leading-relaxed">
                <p>
                  • <strong className="text-yellow-300">Base Pool:</strong> Heroes begin with Karma points equal to their <strong>Rank</strong>.
                </p>
                <p>
                  • <strong className="text-yellow-300">Dice Reroll:</strong> Spend 1 Karma to reroll <em>any single die</em> (Standard or Marvel) or your <em>entire dice pool</em>.
                </p>
                <p>
                  • <strong className="text-emerald-400">Outcome Adjustment:</strong> Spend 1 Karma to add a Karma bonus (equal to your Rank) to your action check total, turning a failure into a success!
                </p>
                <p>
                  • <strong className="text-blue-400">Tactical Edge:</strong> Spend 1 Karma to gain an Edge on an upcoming check.
                </p>
                <p>
                  • <strong className="text-slate-300">Earning Karma:</strong> The Narrator awards Karma for heroic roleplay, saving innocents, teamwork, or fulfilling character obligations.
                </p>
              </div>
            )}
          </div>
            </div>
          )}
        </div>

        {/* Ability Scores Grid */}
        <div className="grid grid-cols-3 gap-1.5 text-center font-mono">
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">MEL</div>
            <div className="text-sm font-bold text-white">{char.melee}</div>
          </div>
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">AGI</div>
            <div className="text-sm font-bold text-white">{char.agility}</div>
          </div>
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">RES</div>
            <div className="text-sm font-bold text-white">{char.resilience}</div>
          </div>
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">VIG</div>
            <div className="text-sm font-bold text-white">{char.vigilance}</div>
          </div>
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">EGO</div>
            <div className="text-sm font-bold text-white">{char.ego}</div>
          </div>
          <div className="bg-slate-900 p-1.5 rounded border border-slate-800">
            <div className="text-[10px] text-slate-400">LOG</div>
            <div className="text-sm font-bold text-white">{char.logic}</div>
          </div>
        </div>
      </div>
    );
  };

  const renderConditionManager = (c: CombatantSnapshot, mode: 'compact' | 'expanded', keyPrefix: string) => {
    const isOpen = activeConditionCombatant === `${keyPrefix}_${c.name}`;
    const conditions = c.conditions || [];

    return (
      <div className="mt-2 pt-2 border-t border-slate-800/80 space-y-1.5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 text-[10px]">
            <Tag className="w-3 h-3 text-yellow-400" />
            <span>Conditions</span>
            {conditions.length > 0 && (
              <span className="font-mono bg-yellow-500/20 text-yellow-300 border border-yellow-500/40 px-1.5 py-0.2 rounded text-[10px] font-bold">
                {conditions.length}
              </span>
            )}
          </span>
          <div className="flex items-center gap-1">
            {conditions.length > 0 && (
              <button
                type="button"
                onClick={() => handleClearConditions(c.name)}
                className="text-[10px] text-red-400 hover:text-red-300 px-1.5 py-0.5 rounded hover:bg-slate-800 transition font-mono"
                title={`Clear all conditions from ${c.name}`}
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => setActiveConditionCombatant(isOpen ? null : `${keyPrefix}_${c.name}`)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1 transition border cursor-pointer ${
                isOpen
                  ? 'bg-yellow-500 text-slate-950 border-yellow-400'
                  : 'bg-slate-800 hover:bg-slate-750 text-yellow-400 border-slate-700'
              }`}
              title="Add or toggle active conditions"
            >
              <Plus className="w-2.5 h-2.5" />
              <span>{isOpen ? 'Done' : '+ Condition'}</span>
            </button>
          </div>
        </div>

        {/* List of active condition pills */}
        <div className="flex flex-wrap gap-1 min-h-[22px]">
          {conditions.length > 0 ? (
            conditions.map((cond) => (
              <span
                key={cond}
                className={`text-[10px] px-2 py-0.5 rounded-md font-mono flex items-center gap-1 border shadow-xs transition-all ${getConditionColor(cond)}`}
              >
                <span>{getConditionIcon(cond)}</span>
                <span className="font-semibold">{cond}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCondition(c.name, cond)}
                  className="hover:text-red-400 text-slate-400 hover:bg-slate-900/60 p-0.5 rounded transition cursor-pointer"
                  title={`Remove ${cond} from ${c.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-[10px] text-slate-500 italic font-mono py-0.5">
              Normal (No active conditions)
            </span>
          )}
        </div>

        {/* Toggle Tray / Popover */}
        {isOpen && (
          <div className="mt-2 p-2.5 bg-slate-950 border-2 border-yellow-500/70 rounded-xl space-y-2 text-xs shadow-xl animate-in fade-in">
            <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="text-yellow-400">Toggle Standard Conditions:</span>
              <span className="text-slate-500 font-mono text-[9px]">Click to add/remove</span>
            </div>

            {/* Standard Conditions Toggle Grid */}
            <div className={mode === 'compact' ? 'flex flex-wrap gap-1' : 'grid grid-cols-2 sm:grid-cols-3 gap-1.5'}>
              {STANDARD_CONDITIONS.map((cond) => {
                const isActive = conditions.some(
                  (active) => active.toLowerCase() === cond.name.toLowerCase()
                );
                return (
                  <button
                    key={cond.name}
                    type="button"
                    onClick={() => handleToggleCondition(c.name, cond.name)}
                    title={`${cond.name}: ${cond.description}`}
                    className={`text-[10px] px-2 py-1 rounded-lg font-mono transition flex items-center justify-between gap-1.5 border text-left cursor-pointer ${
                      isActive
                        ? `${getConditionColor(cond.name)} ring-1 ring-yellow-400 font-bold shadow-[0_0_10px_rgba(250,204,21,0.2)]`
                        : 'bg-slate-900 hover:bg-slate-850 text-slate-400 hover:text-slate-200 border-slate-800'
                    }`}
                  >
                    <span className="flex items-center gap-1 truncate">
                      <span>{cond.icon}</span>
                      <span className="truncate">{cond.name}</span>
                    </span>
                    {isActive ? (
                      <Check className="w-3 h-3 text-yellow-400 shrink-0" />
                    ) : (
                      <span className="text-[9px] text-slate-600 opacity-60">+</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Custom Condition Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (customConditionInput.trim()) {
                  handleAddCondition(c.name, customConditionInput.trim());
                  setCustomConditionInput('');
                }
              }}
              className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800"
            >
              <input
                type="text"
                placeholder="Custom condition (e.g. Webbed, Burning)..."
                value={customConditionInput}
                onChange={(e) => setCustomConditionInput(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-yellow-400"
              />
              <button
                type="submit"
                disabled={!customConditionInput.trim()}
                className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-slate-950 font-bold px-2.5 py-1 rounded-lg text-xs font-mono shrink-0 transition"
              >
                Add
              </button>
            </form>
          </div>
        )}
      </div>
    );
  };

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

        {/* User Account Badge */}
        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-xs">
              <span className="text-slate-400">User:</span>
              <span className="text-yellow-400 font-bold font-mono">{currentUser.username}</span>
              <span className="text-[10px] bg-red-950 text-red-300 px-1.5 py-0.5 rounded font-mono uppercase">
                {currentUser.role}
              </span>
              {currentUser.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => setActiveTab('users')}
                  className={`px-2.5 py-1 rounded-md text-xs font-bold font-mono flex items-center gap-1 transition cursor-pointer ${
                    activeTab === 'users'
                      ? 'bg-red-600 text-white shadow'
                      : 'bg-red-950/80 text-red-200 hover:bg-red-900 border border-red-700'
                  }`}
                  title="Manage users, edit info, and reset passwords"
                >
                  <Users className="w-3.5 h-3.5" /> Users
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setCurrentUser(null);
                  localStorage.removeItem('marvel_multiverse_user');
                }}
                className="text-slate-400 hover:text-red-400 ml-1 font-mono text-[11px] underline cursor-pointer"
                title="Log out"
              >
                Logout
              </button>
            </div>
          )}
        </div>

        {/* Hero Quick Badge */}
        {activeChar && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowMobileHeroModal(true)}
              className="hidden md:flex items-center gap-3 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 hover:border-amber-500/50 px-3 py-1.5 rounded-lg shadow-sm transition text-left cursor-pointer"
              title="Click to view Active Hero Sheet & spend Karma"
            >
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
                <div className="flex items-center gap-1 text-xs pl-1">
                  <Sparkles className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  <span className="font-mono text-xs font-bold text-amber-300">
                    {activeChar.karma ?? 0}★
                  </span>
                </div>
              </div>
            </button>

            {/* Mobile Hero & Karma trigger */}
            <button
              onClick={() => setShowMobileHeroModal(true)}
              className="flex md:hidden items-center gap-1.5 bg-amber-950/40 hover:bg-amber-900/60 border border-amber-600/60 px-2 py-1 rounded-lg text-xs font-bold text-amber-300 transition"
              title="Open Hero Card & Karma Controls"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-mono">{activeChar.karma ?? 0}★</span>
            </button>
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
        {/* USERS MANAGEMENT VIEW (ADMIN ONLY) */}
        {activeTab === 'users' && currentUser.role === 'admin' && (
          <UsersManagementView currentUser={currentUser} onBack={() => setActiveTab('narrator')} />
        )}

        {/* TAB 1: NARRATOR CONSOLE */}
        {activeTab === 'narrator' && (
          <div className="flex h-full">
            {/* Left Chat Console */}
            <div className="flex-1 flex flex-col h-full bg-slate-950/80 border-r border-slate-800">
              {/* Context & Model/Role Control Bar */}
              <div className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                {/* Model & Persona Selection */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Model Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-2 py-1 rounded-lg">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span className="text-[10px] uppercase font-bold text-slate-400">Model:</span>
                    <select
                      value={selectedModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                    >
                      <option value="gemini-3.5-flash" className="bg-slate-900 text-slate-100">
                        Gemini 3.5 Flash (General)
                      </option>
                      <option value="gemini-3.1-flash-lite" className="bg-slate-900 text-slate-100">
                        Gemini 3.1 Flash Lite (Fastest)
                      </option>
                      <option value="gemini-3.1-pro-preview" className="bg-slate-900 text-slate-100">
                        Gemini 3.1 Pro Preview (Complex)
                      </option>
                      <option value="gemini-3.8-flash" className="bg-slate-900 text-slate-100">
                        Gemini 3.8 Flash (Omni)
                      </option>
                    </select>
                  </div>

                  {/* API / Online Status Badge */}
                  <div
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono font-medium ${
                      narratorOnline
                        ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                        : 'bg-amber-950/70 border-amber-500/60 text-amber-300'
                    }`}
                    title={apiKeyStatus?.message || (narratorOnline ? 'AI Narrator Online' : 'Simulation Fallback Mode')}
                  >
                    <span className={`w-2 h-2 rounded-full ${narratorOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                    <span>{narratorOnline ? 'AI Online' : 'Offline / Simulation Mode'}</span>
                  </div>

                  {/* GM Role / Persona Selector */}
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-2 py-1 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-slate-400">GM Persona:</span>
                    <select
                      value={selectedRole}
                      onChange={(e) => handleRoleChange(e.target.value)}
                      className="bg-transparent text-xs font-semibold text-white focus:outline-none cursor-pointer"
                    >
                      <option value="stan_lee" className="bg-slate-900 text-slate-100">
                        🎙️ Stan Lee (The True Believer)
                      </option>
                      <option value="the_watcher" className="bg-slate-900 text-slate-100">
                        👁️ The Watcher (Cosmic Observer)
                      </option>
                      <option value="tactical_gm" className="bg-slate-900 text-slate-100">
                        ⚔️ Tactical Combat Arbiter
                      </option>
                      <option value="gritty_street" className="bg-slate-900 text-slate-100">
                        🏙️ Gritty Street-Level Narrator
                      </option>
                    </select>
                  </div>
                </div>

                {/* Quick actions & Toggles */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Text Size Adjuster */}
                  <div className="flex items-center gap-1 bg-slate-950 border border-slate-700 px-2 py-1 rounded-lg">
                    <span className="text-[10px] uppercase font-bold text-slate-400">Text Size:</span>
                    <button
                      type="button"
                      onClick={() => setNarratorFontSize('xs')}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition ${narratorFontSize === 'xs' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Small Text (12px)"
                    >
                      S
                    </button>
                    <button
                      type="button"
                      onClick={() => setNarratorFontSize('sm')}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition ${narratorFontSize === 'sm' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Medium Text (14px)"
                    >
                      M
                    </button>
                    <button
                      type="button"
                      onClick={() => setNarratorFontSize('base')}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition ${narratorFontSize === 'base' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Large Text (16px)"
                    >
                      L
                    </button>
                    <button
                      type="button"
                      onClick={() => setNarratorFontSize('lg')}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-bold transition ${narratorFontSize === 'lg' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-white'}`}
                      title="Extra Large Text (18px)"
                    >
                      XL
                    </button>
                  </div>

                  <button
                    onClick={() => handleOpenCampaignModal('narrator')}
                    title="Edit Campaign Plan, Arch-Villain & Episode Directives"
                    className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-red-950/70 hover:bg-red-900/90 text-red-300 hover:text-white border border-red-700/80 hover:border-red-500 transition cursor-pointer font-bold shadow-sm"
                  >
                    <MapPin className="w-3.5 h-3.5 text-red-400" />
                    <span className="hidden sm:inline">Edit Campaign</span>
                  </button>

                  <button
                    onClick={handleDownloadEventLog}
                    disabled={isDownloadingLog}
                    title="Download Campaign Event Log (.txt)"
                    className="flex items-center gap-1 text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 hover:border-red-500/50 transition cursor-pointer"
                  >
                    {isDownloadingLog ? (
                      <RefreshCw className="w-3.5 h-3.5 text-red-400 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5 text-red-400" />
                    )}
                    <span className="hidden sm:inline">Export Log</span>
                  </button>

                  <button
                    onClick={() => setShowContext(!showContext)}
                    className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border transition ${
                      showContext
                        ? 'bg-yellow-950 text-yellow-300 border-yellow-600'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                  >
                    <Info className="w-3.5 h-3.5" />
                    <span>{showContext ? 'Hide Context' : 'AI Context'}</span>
                  </button>

                  <button
                    onClick={handleClearMessages}
                    title="Clear Conversation Thread"
                    className="flex items-center gap-1 text-slate-400 hover:text-red-400 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Reset</span>
                  </button>
                </div>
              </div>

              {/* Context Drawer (Collapsible) */}
              {showContext && (
                <div className="bg-slate-900/95 border-b border-yellow-500/40 p-3 text-xs font-mono text-slate-300 max-h-52 overflow-y-auto">
                  <div className="text-yellow-400 font-bold mb-1 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>Live Gemini System Instruction & Injected Context</span>
                    </div>
                    <span className="text-[10px] text-slate-400">Model: {selectedModel}</span>
                  </div>
                  <pre className="whitespace-pre-wrap text-[11px] text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800">
                    {`[ROLE: ${availableRoles.find(r => r.id === selectedRole)?.name || 'Stan Lee'}]
${availableRoles.find(r => r.id === selectedRole)?.tagline || ''}

[ACTIVE HERO] ${activeChar?.name || 'Spider-Man'} (Rank ${activeChar?.rank || 4} ${activeChar?.archetype || 'Striker'})
HP: ${activeChar?.current_health}/${activeChar?.max_health} | Focus: ${activeChar?.current_focus}/${activeChar?.max_focus} | Karma: ${activeChar?.karma || 0}
Defenses: Melee ${activeChar?.defenses.melee_defense}, Agility ${activeChar?.defenses.agility_defense}, Vigilance ${activeChar?.defenses.vigilance_defense}
Active Combatants: ${combatants.map(c => `${c.name} [${c.side.toUpperCase()}]`).join(', ')}
Campaign: ${campaignData?.plan?.theme || 'The Midnight Syndicate Invasion'} (Villain: ${campaignData?.plan?.villain || 'Green Goblin'})`}
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
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                        {msg.role === 'user' ? (
                          <>
                            <span className="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
                            <span>{activeChar?.name || 'Hero'}</span>
                          </>
                        ) : (
                          <>
                            <span>
                              {availableRoles.find(r => r.id === (msg.metadata?.roleUsed || selectedRole))?.icon || '🎙️'}
                            </span>
                            <span className="text-yellow-400">
                              {availableRoles.find(r => r.id === (msg.metadata?.roleUsed || selectedRole))?.name || 'Narrator AI'}
                            </span>
                            {msg.modelUsed && (
                              <span className="text-[9px] bg-slate-800 text-slate-400 border border-slate-700 px-1.5 py-0.2 rounded font-mono ml-1">
                                {msg.modelUsed}
                              </span>
                            )}
                          </>
                        )}
                      </span>
                      <span className="text-[10px] text-slate-500">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-xl p-4 shadow-lg leading-relaxed ${
                        narratorFontSize === 'xs'
                          ? 'text-xs'
                          : narratorFontSize === 'sm'
                          ? 'text-sm'
                          : narratorFontSize === 'base'
                          ? 'text-base'
                          : 'text-lg'
                      } ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-red-600 to-red-700 text-white rounded-br-none border-2 border-red-500'
                          : 'bg-slate-900 text-slate-200 rounded-bl-none border-2 border-slate-700/80'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Embedded Dice Roll Card */}
                      {(msg.metadata?.diceResult || msg.metadata?.rollResult) && (() => {
                        const rollData = msg.metadata.diceResult || msg.metadata.rollResult;
                        const isM1 = rollData.raw_dice?.marvel_die === 1;
                        return (
                          <div className="mt-3 p-3 bg-slate-950/80 rounded-lg border border-slate-700 font-mono text-xs">
                            <div className="flex items-center justify-between text-yellow-400 font-bold mb-2">
                              <span className="flex items-center gap-1.5">
                                <Dices className="w-3.5 h-3.5 text-red-500" />
                                <span>d616 Roll Breakdown</span>
                              </span>
                              {rollData.is_fantastic && (
                                <span className="bg-yellow-400 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black tracking-tight flex items-center gap-1">
                                  ⭐ FANTASTIC!
                                </span>
                              )}
                              {rollData.is_ultimate && (
                                <span className="bg-yellow-500 text-slate-950 px-1.5 py-0.5 rounded text-[10px] font-black tracking-tight">
                                  🌟 ULTIMATE 616!
                                </span>
                              )}
                              {rollData.is_botch && (
                                <span className="bg-red-600 text-white px-1.5 py-0.5 rounded text-[10px] font-black tracking-tight">
                                  💀 BOTCH!
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-2 text-slate-300">
                              <span className="bg-slate-800 px-2 py-1 rounded border border-slate-600">
                                S1: {rollData.raw_dice?.standard_1}
                              </span>
                              <span className="bg-gradient-to-r from-red-900 to-red-800 text-yellow-300 px-2.5 py-1 rounded border border-red-500 font-bold flex items-center gap-1 shadow-sm">
                                Marvel Die: {isM1 ? '1 [M = 6]' : rollData.raw_dice?.marvel_die}
                              </span>
                              <span className="bg-slate-800 px-2 py-1 rounded border border-slate-600">
                                S2: {rollData.raw_dice?.standard_2}
                              </span>
                              <span className="text-slate-400">
                                + Mod: {rollData.ability_modifier >= 0 ? `+${rollData.ability_modifier}` : rollData.ability_modifier}
                              </span>
                              <span className="text-yellow-400 font-bold ml-auto text-sm">
                                Total: {rollData.total_score}
                              </span>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}

                {isNarrating && (
                  <div className="flex items-center gap-2.5 text-yellow-400 text-xs py-3 px-2 bg-slate-900/60 rounded-lg border border-yellow-500/20 max-w-md animate-pulse">
                    <Sparkles className="w-4 h-4 animate-spin text-yellow-400" />
                    <span>
                      {selectedModel === 'gemini-3.1-pro-preview'
                        ? 'Gemini 3.1 Pro is calculating multiversal tactics & narrative...'
                        : selectedModel === 'gemini-3.1-flash-lite'
                        ? 'Gemini 3.1 Flash Lite is responding rapidly...'
                        : selectedModel === 'gemini-3.8-flash'
                        ? 'Gemini 3.8 Flash is spinning up the multiverse...'
                        : 'Gemini 3.5 Flash is resolving the scene narrative...'}
                    </span>
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
                  onClick={() => handleReportRoll({ ability: 'melee', actionDescription: 'Melee Strike Check' })}
                  disabled={isNarrating}
                  className="shrink-0 bg-yellow-950/60 hover:bg-yellow-900/80 text-yellow-300 border border-yellow-700/80 px-2.5 py-1 rounded-full transition flex items-center gap-1 font-mono font-bold"
                  title="Roll d616 dice and report into chat"
                >
                  <Dices className="w-3.5 h-3.5 text-yellow-400" /> Roll & Report (Melee)
                </button>
                <button
                  onClick={() => handleReportRoll({ ability: 'agility', actionDescription: 'Acrobatic / Agility Check' })}
                  disabled={isNarrating}
                  className="shrink-0 bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border border-amber-700/80 px-2.5 py-1 rounded-full transition flex items-center gap-1 font-mono font-bold"
                  title="Roll Agility check and report into chat"
                >
                  <Dices className="w-3.5 h-3.5 text-amber-400" /> Roll & Report (Agility)
                </button>
                <button
                  onClick={() => setShowReportModal(true)}
                  disabled={isNarrating}
                  className="shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 px-2.5 py-1 rounded-full transition flex items-center gap-1 font-semibold"
                  title="Configure custom ability, TN, or edge/trouble before reporting"
                >
                  ⚙️ Custom Roll & Report
                </button>
                <button
                  onClick={() => handleSendMessage('/rules index')}
                  className="shrink-0 bg-blue-950/50 hover:bg-blue-900/60 text-blue-300 border border-blue-800/80 px-2.5 py-1 rounded-full transition flex items-center gap-1 font-mono"
                  title="Ask Narrator AI for rules index summary"
                >
                  📖 /rules index
                </button>
                <button
                  onClick={() => handleOpenCampaignModal('narrator')}
                  className="shrink-0 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80 px-2.5 py-1 rounded-full transition flex items-center gap-1 font-semibold text-xs cursor-pointer"
                  title="Edit active campaign arc and mission objectives"
                >
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span>Arc: {campaignData?.plan?.theme || 'Edit Campaign'}</span>
                </button>
                <button
                  onClick={() => setActiveTab('rules')}
                  className="shrink-0 bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-800/80 px-2.5 py-1 rounded-full transition flex items-center gap-1 font-semibold"
                  title="Open full interactive Rules Index & Catalog"
                >
                  <BookOpen className="w-3.5 h-3.5 text-red-400" />
                  <span>Browse Rules Index</span>
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
                    placeholder="Describe your hero's action, use /roll, /report, /attack, or enter [3, 1, 4]..."
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                  />
                  <button
                    type="button"
                    onClick={() => handleReportRoll()}
                    disabled={isNarrating}
                    className="bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-1.5 shadow-[0_0_12px_rgba(245,158,11,0.4)] transition shrink-0"
                    title="Roll d616 dice for your current action and report directly into the chat window"
                  >
                    <Dices className="w-4 h-4 text-yellow-200" />
                    <span>Roll & Report</span>
                  </button>
                  <button
                    type="submit"
                    disabled={isNarrating || !inputPrompt.trim()}
                    className="bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-[0_0_12px_rgba(239,68,68,0.4)] transition shrink-0"
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
              {activeChar && renderActiveHeroCard(activeChar)}

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

              {/* Active Campaign Plan Card in Narrator View */}
              {campaignData?.plan && (
                <div className="bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-xl p-4 transition shadow-md">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-red-500" />
                      <h4 className="font-comic text-base text-yellow-400 uppercase tracking-wide">
                        Storyline Arc
                      </h4>
                    </div>
                    <span className="text-[10px] bg-red-950/80 text-red-300 border border-red-800 px-2 py-0.5 rounded font-mono font-bold">
                      Ep {campaignData.plan.current_session} of {campaignData.plan.sessions?.length || 1}
                    </span>
                  </div>

                  <div className="space-y-2 text-xs">
                    <div className="font-bold text-white text-sm line-clamp-1">
                      {campaignData.plan.theme}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                      <span className="text-red-400 font-bold uppercase text-[10px]">Nemesis:</span>
                      <span className="text-slate-200 font-medium">{campaignData.plan.villain}</span>
                    </div>

                    {campaignData.context?.session && (
                      <div className="bg-slate-900/90 rounded-lg p-2.5 border border-slate-800 mt-2 space-y-1">
                        <div className="text-[10px] uppercase font-bold text-yellow-400 flex items-center justify-between">
                          <span>Active Mission</span>
                          <span className="text-slate-400 font-mono">{campaignData.context.session.act}</span>
                        </div>
                        <div className="font-medium text-slate-200 text-xs">
                          {campaignData.context.session.title}
                        </div>
                        <div className="text-[11px] text-amber-200/90 leading-relaxed">
                          Target: {campaignData.context.session.primary_objective}
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-1.5 mt-2">
                      <button
                        onClick={() => handleOpenCampaignModal('narrator')}
                        className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white text-xs font-bold py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 shadow-md shadow-red-950 transition cursor-pointer"
                        title="Edit current campaign plan and objectives"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Edit Arc</span>
                      </button>

                      <button
                        onClick={() => handleOpenCampaignFileManager('load')}
                        className="bg-slate-900 hover:bg-slate-800 text-yellow-300 hover:text-white border border-slate-700 hover:border-yellow-500/70 text-xs font-bold py-2 px-2.5 rounded-lg flex items-center justify-center gap-1 transition cursor-pointer font-mono"
                        title="Open Server Campaign Vault to Save or Load JSON campaign files"
                      >
                        <FolderOpen className="w-3.5 h-3.5 text-yellow-400" />
                        <span>JSON Files</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
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

                  <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-center">
                    <button
                      onClick={() => handleReportRoll({ preRolledResult: rollResult })}
                      disabled={isNarrating}
                      className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-5 py-2 rounded-xl shadow-lg flex items-center gap-2 transition transform hover:scale-105 text-xs uppercase tracking-wider"
                    >
                      <Send className="w-4 h-4" />
                      <span>Report This Roll to Chat Window</span>
                    </button>
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

              {/* Roll Trigger Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={handleRollDice}
                  disabled={isRolling}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-comic text-xl py-3.5 rounded-xl border border-slate-700 transition tracking-wider flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  <Dices className="w-5 h-5 text-red-400" />
                  <span>{isRolling ? 'ROLLING d616...' : 'TEST ROLL LOCALLY'}</span>
                </button>
                <button
                  onClick={() =>
                    handleReportRoll({
                      ability_modifier: rollModifier,
                      target_number: targetNumber ? parseInt(targetNumber, 10) : null,
                      edges,
                      troubles,
                      actionDescription: `Action Check (Mod: +${rollModifier}${targetNumber ? `, TN: ${targetNumber}` : ''})`,
                    })
                  }
                  disabled={isNarrating || isRolling}
                  className="bg-gradient-to-r from-red-600 via-amber-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-white font-comic text-xl py-3.5 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition tracking-wider flex items-center justify-center gap-2.5 disabled:opacity-50"
                >
                  <Sparkles className="w-5 h-5 text-yellow-200" />
                  <span>ROLL & REPORT TO CHAT</span>
                </button>
              </div>
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

            {/* INITIATIVE TRACKER & TURN ORDER */}
            <div className="bg-slate-900/90 border-2 border-yellow-500/80 rounded-2xl p-5 shadow-2xl space-y-4">
              {/* Header row with Round badge, Turn indicator, and Action buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5 bg-yellow-500/20 text-yellow-300 border border-yellow-500/60 px-3 py-1 rounded-lg font-comic text-base tracking-wide">
                    <Clock className="w-4 h-4 text-yellow-400" />
                    <span>ROUND {combatRound}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-700 px-3 py-1 rounded-lg text-xs font-mono">
                    <span className="text-slate-400">TURN</span>
                    <span className="text-white font-bold">{combatants.length > 0 ? currentTurnIndex + 1 : 0}</span>
                    <span className="text-slate-500">/</span>
                    <span className="text-slate-400">{combatants.length}</span>
                  </div>
                  {activeCombatant && (
                    <div className="flex items-center gap-1.5 bg-gradient-to-r from-red-950/80 to-amber-950/80 border border-amber-500/80 px-3 py-1 rounded-lg text-xs">
                      <span className="text-yellow-400 font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> ACTIVE:
                      </span>
                      <span className="text-white font-bold font-comic text-sm">{activeCombatant}</span>
                    </div>
                  )}
                </div>

                {/* Turn Navigation & Global Initiative Actions */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={handlePrevTurn}
                    disabled={combatants.length === 0}
                    className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 transition"
                    title="Previous Turn in Initiative Order"
                  >
                    <SkipBack className="w-3.5 h-3.5" /> Prev Turn
                  </button>
                  <button
                    onClick={handleNextTurn}
                    disabled={combatants.length === 0}
                    className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 disabled:opacity-40 text-slate-950 text-xs font-bold px-3.5 py-1.5 rounded-lg shadow flex items-center gap-1.5 transition font-comic tracking-wide"
                    title="Advance to Next Turn"
                  >
                    <span>Next Turn</span> <SkipForward className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRollInitiative()}
                    className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow transition"
                    title="Roll d616 + Vigilance for all combatants and sort order"
                  >
                    <Dices className="w-3.5 h-3.5" /> Roll All Init
                  </button>
                  <button
                    onClick={handleSortInitiative}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-700 flex items-center gap-1 transition"
                    title="Sort combatants by initiative score (highest to lowest)"
                  >
                    <Zap className="w-3.5 h-3.5 text-yellow-400" /> Sort Order
                  </button>
                  <button
                    onClick={handleResetInitiative}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 text-xs p-1.5 rounded-lg border border-slate-700 transition"
                    title="Reset round counter and initiative values"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Initiative Reorder List / Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {combatants.map((c, idx) => {
                  const isTurn = c.is_active_turn;
                  return (
                    <div
                      key={c.name}
                      onClick={() => handleSetTurn(idx)}
                      className={`relative rounded-xl p-3 cursor-pointer transition-all border-2 ${
                        isTurn
                          ? 'bg-gradient-to-b from-yellow-950/70 via-slate-900 to-slate-950 border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.35)] scale-[1.02]'
                          : 'bg-slate-950/90 border-slate-800 hover:border-slate-700 opacity-90'
                      }`}
                    >
                      {/* Active turn badge */}
                      {isTurn && (
                        <div className="absolute -top-2.5 left-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded shadow tracking-wider uppercase flex items-center gap-1 animate-pulse">
                          <Sparkles className="w-3 h-3" /> ACTIVE TURN
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-2 mt-1 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono font-bold flex items-center justify-center">
                            #{idx + 1}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              c.side === 'player' || c.side === 'ally'
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/80'
                                : 'bg-red-950 text-red-300 border border-red-800/80'
                            }`}
                          >
                            {c.side}
                          </span>
                        </div>

                        {/* Reorder Buttons (Up / Down) */}
                        <div className="flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleMoveCombatant(c.name, 'up')}
                            disabled={idx === 0}
                            title="Move earlier in initiative order"
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-800 rounded transition"
                          >
                            <ArrowUp className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleMoveCombatant(c.name, 'down')}
                            disabled={idx === combatants.length - 1}
                            title="Move later in initiative order"
                            className="p-1 text-slate-400 hover:text-white disabled:opacity-20 hover:bg-slate-800 rounded transition"
                          >
                            <ArrowDown className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Character Name */}
                      <h4 className="font-comic text-lg text-white truncate mb-1">{c.name}</h4>

                      {/* Initiative Score / Roll section */}
                      <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-xs">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-400 uppercase font-mono">Init:</span>
                          {editingInitCombatant === c.name ? (
                            <form
                              onSubmit={(e) => {
                                e.preventDefault();
                                handleSetInitiative(c.name, customInitValue ? parseInt(customInitValue, 10) : null);
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1"
                            >
                              <input
                                type="number"
                                autoFocus
                                value={customInitValue}
                                onChange={(e) => setCustomInitValue(e.target.value)}
                                className="w-14 bg-slate-900 border border-yellow-400 rounded px-1.5 py-0.5 text-xs text-white font-mono"
                              />
                              <button
                                type="submit"
                                className="bg-yellow-500 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[10px]"
                              >
                                OK
                              </button>
                            </form>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingInitCombatant(c.name);
                                setCustomInitValue(c.initiative != null ? String(c.initiative) : '');
                              }}
                              title="Click to manually edit initiative score"
                              className="font-mono font-bold text-yellow-400 hover:underline flex items-center gap-1"
                            >
                              <span>{c.initiative != null ? c.initiative : '—'}</span>
                              {c.initiative_roll?.is_fantastic && (
                                <span className="text-[9px] bg-yellow-400 text-slate-950 px-1 rounded font-black">
                                  M
                                </span>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Individual Roll / Attack Quick Buttons */}
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleRollInitiative(c.name)}
                            title="Roll d616 + Vigilance for this combatant"
                            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] px-2 py-0.5 rounded font-mono border border-slate-700 flex items-center gap-0.5 transition"
                          >
                            <Dices className="w-3 h-3 text-red-400" />
                            <span>Roll</span>
                          </button>
                          <button
                            onClick={() => {
                              if (c.side === 'player' || c.side === 'ally') {
                                setAttackAttacker(c.name);
                              } else {
                                setAttackTarget(c.name);
                              }
                            }}
                            title="Select for attack controls"
                            className="bg-slate-800 hover:bg-red-950/80 text-slate-300 hover:text-red-300 text-[10px] px-1.5 py-0.5 rounded font-mono border border-slate-700 transition"
                          >
                            <Swords className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* Active Conditions on Initiative Card */}
                      {renderConditionManager(c, 'compact', 'init')}
                    </div>
                  );
                })}
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

                <div className="mt-3 pt-2 border-t border-slate-800 flex justify-end">
                  <button
                    onClick={() =>
                      handleReportRoll({
                        preRolledResult: lastAttackResult.roll,
                        actionDescription: `${lastAttackResult.attacker.name} strikes ${lastAttackResult.target.name} (${lastAttackResult.ability}) - ${lastAttackResult.roll.success ? 'HIT' : 'MISS'}${lastAttackResult.damage ? ` dealing ${lastAttackResult.damage.total_damage} damage` : ''}`,
                      })
                    }
                    disabled={isNarrating}
                    className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Report Attack to Chat Window</span>
                  </button>
                </div>
              </div>
            )}

            {/* Scrollable Damage History Log Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <h4 className="font-comic text-xl text-white">Recent Damage History & Log</h4>
                  <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
                    {damageHistory.length} events
                  </span>
                </div>
                {damageHistory.length > 0 && (
                  <button
                    onClick={handleClearDamageHistory}
                    className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 px-3 py-1 rounded-lg border border-slate-700 transition flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Clear Log
                  </button>
                )}
              </div>

              {damageHistory.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs italic font-mono">
                  No damage recorded yet in this combat session. Execute attacks or apply damage to populate the log.
                </div>
              ) : (
                <div className="max-h-56 overflow-y-auto space-y-2 pr-2 font-mono text-xs">
                  {damageHistory.map((item) => {
                    const isRecovery = item.details.toLowerCase().includes('recover');
                    return (
                      <div
                        key={item.id}
                        className="bg-slate-950/90 border border-slate-800 hover:border-slate-700 rounded-lg p-2.5 flex items-center justify-between gap-3 text-slate-300 transition"
                      >
                        <div className="space-y-1 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[10px] text-slate-500 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                              {item.timestamp}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded font-bold text-xs ${
                                isRecovery
                                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                  : item.resource === 'focus'
                                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                                  : 'bg-rose-950 text-rose-300 border border-rose-800'
                              }`}
                            >
                              {isRecovery ? `+${item.amount}` : `-${item.amount}`} {item.resource.toUpperCase()}
                            </span>
                            <span className="text-slate-500">→</span>
                            <span className="text-white font-bold font-comic text-sm tracking-wide">
                              {item.target}
                            </span>
                            <span className="text-[10px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800/80">
                              Source: <span className="text-slate-200 font-semibold">{item.source}</span>
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {item.details}
                          </div>
                        </div>

                        <button
                          onClick={() => handleSendMessage(`[Combat Event] ${item.details}`)}
                          disabled={isNarrating}
                          title="Report combat damage event to Narrator chat"
                          className="shrink-0 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-2 py-1 rounded text-[11px] flex items-center gap-1 transition disabled:opacity-40"
                        >
                          <Send className="w-3 h-3 text-yellow-400" />
                          <span className="hidden sm:inline">To Chat</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

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

                      {/* Active Conditions on Hero Card */}
                      {renderConditionManager(c, 'expanded', 'hero')}
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

                      {/* Active Conditions on Villain Card */}
                      {renderConditionManager(c, 'expanded', 'villain')}
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
                      <p className="text-xs text-slate-400 mb-3">{char.origin} • {char.occupation}</p>

                      {/* Karma Points Tracker in Roster */}
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-amber-500/40 mb-3 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          <span className="text-xs font-bold text-yellow-300 font-comic uppercase">Karma:</span>
                          <span className="font-mono text-sm font-black text-amber-400">{char.karma ?? 0}</span>
                          <span className="text-[10px] text-slate-500">/ {Math.max(char.rank, char.karma ?? 0)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleAdjustKarma(char.name, -1)}
                            disabled={(char.karma ?? 0) <= 0}
                            title="Deduct 1 Karma"
                            className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 disabled:opacity-20 text-slate-300 text-xs flex items-center justify-center font-bold font-mono transition border border-slate-700"
                          >
                            -
                          </button>
                          <button
                            onClick={() => handleAdjustKarma(char.name, 1)}
                            title="Award 1 Karma point"
                            className="w-5 h-5 rounded bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 text-xs flex items-center justify-center font-bold font-mono transition border border-amber-500/50"
                          >
                            +
                          </button>
                          <button
                            onClick={() => handleSetKarma(char.name, char.rank)}
                            title={`Reset to base Rank (${char.rank})`}
                            className="px-1.5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-[10px] flex items-center justify-center font-mono transition border border-slate-700"
                          >
                            Rank
                          </button>
                        </div>
                      </div>

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

        {/* TAB 5: RULES DATABASE & INDEX */}
        {activeTab === 'rules' && (
          <div className="p-6 max-w-6xl mx-auto h-full overflow-y-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
              {/* Header with Title and Stats Summary */}
              <div>
                <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center shadow-lg border border-red-400">
                      <BookOpen className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h2 className="font-comic text-3xl text-red-500 tracking-wide">
                        MARVEL MULTIVERSE RULEBOOK & INDEX
                      </h2>
                      <p className="text-xs text-slate-400">
                        Official system rules, core mechanics, powers, origins, and reference index for Marvel Multiverse RPG.
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSendMessage('/rules index')}
                    className="bg-slate-800 hover:bg-slate-700 text-yellow-400 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-mono flex items-center gap-1.5 transition"
                    title="Send Rules Index overview to Narrator Chat"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send Index to Chat</span>
                  </button>
                </div>

                {/* Rules Index Stats Chips */}
                {rulesIndex && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5 mt-4 pt-3 border-t border-slate-800">
                    <button
                      onClick={() => { setRulesFilterCategory('mechanics'); setSearchQuery(''); }}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        rulesFilterCategory === 'mechanics'
                          ? 'bg-red-950/70 border-red-500/80 text-white'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mechanics</span>
                        <Zap className="w-3.5 h-3.5 text-yellow-400" />
                      </div>
                      <div className="font-comic text-xl text-yellow-400 mt-0.5">{rulesIndex.stats.total_mechanics} Rules</div>
                      <div className="text-[10px] text-slate-400 truncate">d616, damage, checks</div>
                    </button>

                    <button
                      onClick={() => { setRulesFilterCategory('powers'); setSearchQuery(''); }}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        rulesFilterCategory === 'powers'
                          ? 'bg-red-950/70 border-red-500/80 text-white'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Superpowers</span>
                        <Sparkles className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <div className="font-comic text-xl text-red-400 mt-0.5">{rulesIndex.stats.total_powers} Powers</div>
                      <div className="text-[10px] text-slate-400 truncate">Across {rulesIndex.stats.total_power_sets} Power Sets</div>
                    </button>

                    <button
                      onClick={() => { setRulesFilterCategory('origins'); setSearchQuery(''); }}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        rulesFilterCategory === 'origins'
                          ? 'bg-red-950/70 border-red-500/80 text-white'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Origins</span>
                        <Shield className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <div className="font-comic text-xl text-emerald-400 mt-0.5">{rulesIndex.stats.total_origins} Origins</div>
                      <div className="text-[10px] text-slate-400 truncate">High-Tech, Alien, Mutant</div>
                    </button>

                    <button
                      onClick={() => { setRulesFilterCategory('occupations'); setSearchQuery(''); }}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        rulesFilterCategory === 'occupations'
                          ? 'bg-red-950/70 border-red-500/80 text-white'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Careers</span>
                        <Award className="w-3.5 h-3.5 text-blue-400" />
                      </div>
                      <div className="font-comic text-xl text-blue-400 mt-0.5">{rulesIndex.stats.total_occupations} Roles</div>
                      <div className="text-[10px] text-slate-400 truncate">Adventurer, Spy, Scientist</div>
                    </button>

                    <button
                      onClick={() => { setRulesFilterCategory('traits'); setSearchQuery(''); }}
                      className={`p-2.5 rounded-xl border text-left transition ${
                        rulesFilterCategory === 'traits'
                          ? 'bg-red-950/70 border-red-500/80 text-white'
                          : 'bg-slate-950 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Traits & Tags</span>
                        <Info className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <div className="font-comic text-xl text-purple-400 mt-0.5">{rulesIndex.stats.total_traits + rulesIndex.stats.total_tags} Tags</div>
                      <div className="text-[10px] text-slate-400 truncate">Battle Ready, Berserker</div>
                    </button>
                  </div>
                )}
              </div>

              {/* Search Bar & Quick Keyword Chips */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchRules(e.target.value)}
                    placeholder="Search index by rule keyword, power name, mechanic, formula, or origin (e.g. d616, melee, spider, running_speed)..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-11 pr-10 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 font-mono"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => handleSearchRules('')}
                      className="absolute right-3 top-3 text-slate-400 hover:text-white"
                      title="Clear search"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Quick Topic Chips */}
                <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono text-slate-400 pt-1">
                  <span className="text-slate-500 font-sans font-bold uppercase shrink-0">Popular:</span>
                  {['d616_basics', 'fantastic_roll', 'botch_ultimate_616', 'damage_formula', 'running_speed', 'spider-powers', 'telekinesis', 'regeneration'].map((keyword) => (
                    <button
                      key={keyword}
                      onClick={() => handleSearchRules(keyword)}
                      className="shrink-0 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white px-2 py-0.5 rounded-md border border-slate-800 transition"
                    >
                      {keyword}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category Filter Navigation Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto border-b border-slate-800 pb-2 text-xs font-semibold">
                <button
                  onClick={() => { setRulesFilterCategory('all'); setSearchQuery(''); }}
                  className={`px-3 py-1.5 rounded-lg transition shrink-0 ${
                    rulesFilterCategory === 'all' && !searchQuery
                      ? 'bg-red-600 text-white shadow'
                      : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-850'
                  }`}
                >
                  📚 All Index (Overview)
                </button>
                <button
                  onClick={() => { setRulesFilterCategory('mechanics'); setSearchQuery(''); }}
                  className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                    rulesFilterCategory === 'mechanics' && !searchQuery
                      ? 'bg-red-600 text-white shadow'
                      : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-850'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Core Mechanics (16)</span>
                </button>
                <button
                  onClick={() => { setRulesFilterCategory('powers'); setSearchQuery(''); }}
                  className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                    rulesFilterCategory === 'powers' && !searchQuery
                      ? 'bg-red-600 text-white shadow'
                      : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-850'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-red-400" />
                  <span>Power Sets & Powers (21 Sets • 156 Powers)</span>
                </button>
                <button
                  onClick={() => { setRulesFilterCategory('origins'); setSearchQuery(''); }}
                  className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                    rulesFilterCategory === 'origins' && !searchQuery
                      ? 'bg-red-600 text-white shadow'
                      : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-850'
                  }`}
                >
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Hero Origins (13)</span>
                </button>
                <button
                  onClick={() => { setRulesFilterCategory('occupations'); setSearchQuery(''); }}
                  className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                    rulesFilterCategory === 'occupations' && !searchQuery
                      ? 'bg-red-600 text-white shadow'
                      : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-850'
                  }`}
                >
                  <Award className="w-3.5 h-3.5 text-blue-400" />
                  <span>Hero Occupations (20)</span>
                </button>
                <button
                  onClick={() => { setRulesFilterCategory('traits'); setSearchQuery(''); }}
                  className={`px-3 py-1.5 rounded-lg transition shrink-0 flex items-center gap-1.5 ${
                    rulesFilterCategory === 'traits' && !searchQuery
                      ? 'bg-red-600 text-white shadow'
                      : 'text-slate-400 hover:text-white bg-slate-950 border border-slate-850'
                  }`}
                >
                  <Info className="w-3.5 h-3.5 text-purple-400" />
                  <span>Traits & Tags</span>
                </button>
              </div>

              {/* ACTIVE INSPECTOR / SELECTED RULE CITATION */}
              {(selectedRule || ruleResults.exactMatch) && (() => {
                const item = selectedRule || ruleResults.exactMatch;
                return (
                  <div className="bg-slate-950 border-2 border-yellow-500 rounded-2xl p-5 shadow-2xl relative">
                    <button
                      onClick={() => { setSelectedRule(null); }}
                      className="absolute top-4 right-4 text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 p-1.5 rounded-lg border border-slate-700 transition"
                      title="Close Citation Inspector"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-yellow-400" />
                        RULE CITATION & INSPECTOR
                      </span>
                      <span className="bg-yellow-400 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded uppercase">
                        {item.category || item.entry_type || 'General'}
                      </span>
                      {item.rank_required !== undefined && (
                        <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          Rank {item.rank_required}
                        </span>
                      )}
                    </div>

                    <h3 className="font-comic text-2xl text-white mb-2">{item.title || item.name}</h3>

                    <p className="text-sm text-slate-300 leading-relaxed mb-4">
                      {item.description || item.summary}
                    </p>

                    {item.formula && (
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 font-mono text-xs text-yellow-300 mb-3">
                        <span className="text-slate-500 uppercase font-sans font-bold block mb-1">Game Formula:</span>
                        {item.formula}
                      </div>
                    )}

                    {item.examples && item.examples.length > 0 && (
                      <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 text-xs text-slate-300 mb-3 font-mono">
                        <span className="text-slate-500 font-sans font-bold uppercase block mb-1">Examples:</span>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-400">
                          {item.examples.map((ex: string, idx: number) => (
                            <li key={idx}>{ex}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Power Specifications if applicable */}
                    {(item.action || item.cost || item.range || item.duration) && (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4 text-xs font-mono">
                        {item.action && (
                          <div className="bg-slate-900 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[10px] uppercase font-sans">Action</span>
                            <span className="text-white font-bold">{item.action}</span>
                          </div>
                        )}
                        {item.cost && (
                          <div className="bg-slate-900 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[10px] uppercase font-sans">Cost</span>
                            <span className="text-blue-400 font-bold">{item.cost}</span>
                          </div>
                        )}
                        {item.range && (
                          <div className="bg-slate-900 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[10px] uppercase font-sans">Range</span>
                            <span className="text-amber-400 font-bold">{item.range}</span>
                          </div>
                        )}
                        {item.duration && (
                          <div className="bg-slate-900 p-2 rounded border border-slate-800">
                            <span className="text-slate-500 block text-[10px] uppercase font-sans">Duration</span>
                            <span className="text-emerald-400 font-bold">{item.duration}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
                      <button
                        onClick={() => handleSendRuleToChat(item)}
                        className="bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-bold px-3 py-1.5 rounded-lg text-xs flex items-center gap-1.5 shadow transition"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send Citation to Narrator Chat</span>
                      </button>
                      <button
                        onClick={() => { setSelectedRule(null); }}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-lg text-xs transition"
                      >
                        Close Inspector
                      </button>
                    </div>
                  </div>
                );
              })()}

              {/* VIEW A: SEARCH RESULTS (When user is actively typing in search) */}
              {searchQuery.trim().length > 0 ? (
                <div className="space-y-6">
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>Search results for: <span className="text-yellow-400 font-mono">"{searchQuery}"</span></span>
                    <button
                      onClick={() => handleSearchRules('')}
                      className="text-red-400 hover:underline"
                    >
                      Clear search & return to index
                    </button>
                  </div>

                  {/* Matching Powers */}
                  {ruleResults.powerMatches.length > 0 && (
                    <div>
                      <h4 className="font-comic text-xl text-yellow-400 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-yellow-400" />
                        <span>Matching Powers ({ruleResults.powerMatches.length})</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ruleResults.powerMatches.map((p: any) => (
                          <div
                            key={p.name}
                            onClick={() => handleSelectRule(p)}
                            className="bg-slate-950 hover:bg-slate-900/90 border border-slate-800 hover:border-yellow-500/60 p-3.5 rounded-xl text-xs cursor-pointer transition"
                          >
                            <div className="flex items-center justify-between font-bold text-white mb-1.5">
                              <span className="text-sm font-comic tracking-wide text-white">{p.name}</span>
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.2 rounded font-mono">
                                  Rank {p.rank_required}
                                </span>
                                <span className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded font-mono">
                                  {p.category}
                                </span>
                              </div>
                            </div>
                            <p className="text-slate-400 line-clamp-2 leading-relaxed mb-2">{p.description}</p>
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                              <span>Click to inspect details</span>
                              <ChevronRight className="w-3.5 h-3.5 text-yellow-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Matching Mechanics */}
                  {ruleResults.mechanicsMatches.length > 0 && (
                    <div>
                      <h4 className="font-comic text-xl text-red-400 mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4 text-red-400" />
                        <span>Matching System Mechanics ({ruleResults.mechanicsMatches.length})</span>
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {ruleResults.mechanicsMatches.map((m: any) => (
                          <div
                            key={m.key}
                            onClick={() => handleSelectRule(m)}
                            className="bg-slate-950 hover:bg-slate-900/90 border border-slate-800 hover:border-red-500/60 p-3.5 rounded-xl text-xs cursor-pointer transition"
                          >
                            <div className="flex items-center justify-between font-bold text-white mb-1.5">
                              <span className="text-sm font-comic tracking-wide text-white">{m.title}</span>
                              <span className="text-[10px] bg-yellow-950 text-yellow-400 border border-yellow-800 px-1.5 py-0.2 rounded font-mono">
                                {m.category || 'Mechanics'}
                              </span>
                            </div>
                            <p className="text-slate-400 line-clamp-2 leading-relaxed mb-2">{m.description}</p>
                            {m.formula && (
                              <div className="bg-slate-900 p-1.5 rounded font-mono text-[10px] text-yellow-300 truncate mb-1">
                                Formula: {m.formula}
                              </div>
                            )}
                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono">
                              <span>Click to inspect</span>
                              <ChevronRight className="w-3.5 h-3.5 text-red-400" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {ruleResults.powerMatches.length === 0 &&
                    ruleResults.mechanicsMatches.length === 0 &&
                    !ruleResults.exactMatch && (
                      <div className="text-center py-12 bg-slate-950 rounded-xl border border-slate-800 text-slate-400 text-xs">
                        <p className="font-comic text-lg text-slate-300 mb-1">No direct rule or power matches found</p>
                        <p className="mb-3">Try searching for keywords like <span className="font-mono text-yellow-400">d616</span>, <span className="font-mono text-yellow-400">fantastic_roll</span>, <span className="font-mono text-yellow-400">claws</span>, or browse the complete categorized index below.</p>
                        <button
                          onClick={() => handleSearchRules('')}
                          className="bg-red-600 hover:bg-red-500 text-white font-bold px-4 py-1.5 rounded-lg text-xs"
                        >
                          View Full Rules Index
                        </button>
                      </div>
                    )}
                </div>
              ) : (
                /* VIEW B: COMPREHENSIVE CATEGORIZED RULES INDEX */
                <div className="space-y-8">
                  {/* 1. CORE MECHANICS SECTION */}
                  {(rulesFilterCategory === 'all' || rulesFilterCategory === 'mechanics') && rulesIndex?.mechanics && (
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Zap className="w-5 h-5 text-yellow-400" />
                          <h3 className="font-comic text-2xl text-yellow-400">
                            Core System Mechanics ({rulesIndex.mechanics.length})
                          </h3>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">d616 engine, attributes, combat formulas</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rulesIndex.mechanics.map((m: any) => (
                          <div
                            key={m.key}
                            onClick={() => handleSelectRule(m)}
                            className="bg-slate-950 hover:bg-slate-900 border border-slate-800/90 hover:border-yellow-500/60 p-3.5 rounded-xl cursor-pointer transition flex flex-col justify-between group shadow-sm"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <h4 className="font-comic text-base text-white group-hover:text-yellow-400 transition">
                                  {m.title}
                                </h4>
                                <span className="text-[9px] bg-slate-900 text-slate-400 border border-slate-800 px-1.5 py-0.5 rounded font-mono">
                                  {m.category}
                                </span>
                              </div>
                              <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-3">
                                {m.description}
                              </p>
                              {m.formula && (
                                <div className="bg-slate-900/90 p-1.5 rounded border border-slate-800 text-[10px] font-mono text-yellow-300 truncate mb-2">
                                  {m.formula}
                                </div>
                              )}
                            </div>
                            <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                              <span>Inspect citation</span>
                              <ChevronRight className="w-3 h-3 text-slate-500 group-hover:text-yellow-400 group-hover:translate-x-0.5 transition" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 2. POWER SETS & POWERS SECTION */}
                  {(rulesFilterCategory === 'all' || rulesFilterCategory === 'powers') && rulesIndex?.power_sets && (
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-red-500" />
                          <h3 className="font-comic text-2xl text-red-500">
                            Power Sets & Superpowers ({rulesIndex.power_sets.length} Sets • {rulesIndex.stats.total_powers} Powers)
                          </h3>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">Click any set to view powers</span>
                      </div>

                      <div className="space-y-3">
                        {rulesIndex.power_sets.map((ps: any) => {
                          const isExpanded = !!expandedPowerSets[ps.name];
                          return (
                            <div
                              key={ps.name}
                              className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden shadow-sm"
                            >
                              <div
                                onClick={() => togglePowerSet(ps.name)}
                                className="p-3.5 flex items-center justify-between cursor-pointer hover:bg-slate-900/70 transition"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-7 h-7 bg-red-950 text-red-400 border border-red-800/80 rounded-lg flex items-center justify-center font-comic text-xs font-bold">
                                    ⚡
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-comic text-lg text-white">{ps.name}</h4>
                                      <span className="text-[10px] bg-red-950 text-red-300 font-bold px-2 py-0.5 rounded-full border border-red-800">
                                        {ps.power_count} Powers
                                      </span>
                                    </div>
                                    {ps.description && (
                                      <p className="text-xs text-slate-400 line-clamp-1">{ps.description}</p>
                                    )}
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
                                  <span>{isExpanded ? 'Hide Powers' : 'Expand Powers'}</span>
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 text-yellow-400" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 text-slate-500" />
                                  )}
                                </div>
                              </div>

                              {/* Expanded Powers Table / Grid */}
                              {isExpanded && (
                                <div className="p-4 bg-slate-900/60 border-t border-slate-800 space-y-2">
                                  {ps.powers.length === 0 ? (
                                    <div className="text-xs text-slate-500 italic font-mono py-2">
                                      Specialized powers for this set are unlocked via archetype progression.
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                                      {ps.powers.map((p: any) => (
                                        <div
                                          key={p.name}
                                          onClick={() => handleSelectRule(p)}
                                          className="bg-slate-950 hover:bg-slate-900 p-3 rounded-lg border border-slate-800/90 hover:border-yellow-500/60 cursor-pointer transition text-xs"
                                        >
                                          <div className="flex items-center justify-between font-bold mb-1">
                                            <span className="text-white font-comic text-sm tracking-wide">{p.name}</span>
                                            <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-1.5 py-0.2 rounded font-mono">
                                              Rank {p.rank_required}
                                            </span>
                                          </div>
                                          <p className="text-slate-400 line-clamp-2 leading-relaxed mb-2">{p.description}</p>
                                          <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono pt-1 border-t border-slate-850">
                                            <div className="flex items-center gap-2">
                                              {p.action && <span>{p.action}</span>}
                                              {p.cost && <span>• {p.cost}</span>}
                                            </div>
                                            <span className="text-yellow-400 font-semibold">Inspect</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. HERO ORIGINS SECTION */}
                  {(rulesFilterCategory === 'all' || rulesFilterCategory === 'origins') && rulesIndex?.origins && (
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-emerald-400" />
                          <h3 className="font-comic text-2xl text-emerald-400">
                            Hero Origins & Lineages ({rulesIndex.origins.length})
                          </h3>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">Character backgrounds and sources of power</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rulesIndex.origins.map((o: any) => (
                          <div
                            key={o.name}
                            onClick={() => handleSelectRule({
                              title: `Origin: ${o.name}`,
                              category: 'Hero Origin',
                              description: o.description,
                              examples: o.subcategories,
                            })}
                            className="bg-slate-950 hover:bg-slate-900 border border-slate-800/90 hover:border-emerald-500/60 p-3.5 rounded-xl cursor-pointer transition text-xs group"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="font-comic text-base text-white group-hover:text-emerald-400 transition">
                                {o.name}
                              </h4>
                              <span className="text-[9px] bg-emerald-950 text-emerald-300 border border-emerald-800 px-1.5 py-0.5 rounded font-mono">
                                Origin
                              </span>
                            </div>
                            <p className="text-slate-400 leading-relaxed mb-3 line-clamp-2">{o.description}</p>
                            {o.subcategories && o.subcategories.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-auto">
                                {o.subcategories.map((sub: string) => (
                                  <span
                                    key={sub}
                                    className="text-[9px] bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-slate-800 font-mono"
                                  >
                                    {sub}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 4. HERO OCCUPATIONS SECTION */}
                  {(rulesFilterCategory === 'all' || rulesFilterCategory === 'occupations') && rulesIndex?.occupations && (
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-blue-400" />
                          <h3 className="font-comic text-2xl text-blue-400">
                            Hero Occupations & Careers ({rulesIndex.occupations.length})
                          </h3>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">Professional backgrounds, traits, and skills</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {rulesIndex.occupations.map((occ: any) => (
                          <div
                            key={occ.name}
                            onClick={() => handleSelectRule({
                              title: `Occupation: ${occ.name}`,
                              category: 'Hero Occupation',
                              description: occ.description,
                              examples: occ.examples,
                            })}
                            className="bg-slate-950 hover:bg-slate-900 border border-slate-800/90 hover:border-blue-500/60 p-3.5 rounded-xl cursor-pointer transition text-xs group"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <h4 className="font-comic text-base text-white group-hover:text-blue-400 transition">
                                {occ.name}
                              </h4>
                              <span className="text-[9px] bg-blue-950 text-blue-300 border border-blue-800 px-1.5 py-0.5 rounded font-mono">
                                Career
                              </span>
                            </div>
                            <p className="text-slate-400 leading-relaxed mb-2.5 line-clamp-2">{occ.description}</p>
                            {occ.examples && occ.examples.length > 0 && (
                              <div className="text-[10px] text-slate-400 font-mono mb-2">
                                <span className="text-slate-500">Examples:</span> {occ.examples.join(', ')}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. TRAITS & TAGS SECTION */}
                  {(rulesFilterCategory === 'all' || rulesFilterCategory === 'traits') && rulesIndex?.traits && (
                    <div>
                      <div className="flex items-center justify-between mb-3 border-b border-slate-800 pb-2">
                        <div className="flex items-center gap-2">
                          <Info className="w-5 h-5 text-purple-400" />
                          <h3 className="font-comic text-2xl text-purple-400">
                            Traits & Tags Glossary ({rulesIndex.traits.length} Traits • {rulesIndex.tags?.length || 0} Tags)
                          </h3>
                        </div>
                        <span className="text-xs text-slate-500 font-mono">Character modifiers and narrative cues</span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Traits List */}
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                          <h4 className="font-comic text-lg text-purple-300 mb-3 flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-purple-400" /> Character Traits
                          </h4>
                          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {rulesIndex.traits.map((t: any) => (
                              <div
                                key={t.name}
                                onClick={() => handleSelectRule({
                                  title: `Trait: ${t.name}`,
                                  category: 'Character Trait',
                                  description: t.description,
                                })}
                                className="p-2 rounded bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-purple-500/60 cursor-pointer text-xs transition"
                              >
                                <div className="font-bold text-white mb-0.5">{t.name}</div>
                                <div className="text-slate-400 text-[11px] leading-relaxed">{t.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tags List */}
                        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                          <h4 className="font-comic text-lg text-blue-300 mb-3 flex items-center gap-1.5">
                            <Info className="w-4 h-4 text-blue-400" /> Narrative Tags
                          </h4>
                          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                            {(rulesIndex.tags || []).map((tag: any) => (
                              <div
                                key={tag.name}
                                onClick={() => handleSelectRule({
                                  title: `Tag: ${tag.name}`,
                                  category: 'Narrative Tag',
                                  description: tag.description,
                                })}
                                className="p-2 rounded bg-slate-900/70 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/60 cursor-pointer text-xs transition"
                              >
                                <div className="font-bold text-white mb-0.5">{tag.name}</div>
                                <div className="text-slate-400 text-[11px] leading-relaxed">{tag.description}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 6: CAMPAIGN & JOURNAL */}
        {activeTab === 'campaign' && campaignData && (
          <div className="p-6 max-w-5xl mx-auto h-full overflow-y-auto space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-4 border-b border-slate-800 pb-4">
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
                <div className="flex items-center gap-2.5 flex-wrap">
                  <button
                    onClick={() => handleOpenCampaignModal('campaign')}
                    className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition shadow-lg shadow-red-600/30 border border-red-400 cursor-pointer active:scale-95"
                    title="Edit Campaign Plan, Arch-Villain, Episodes, and Directives"
                  >
                    <Edit3 className="w-4 h-4 text-white" />
                    <span>Edit Campaign Plan</span>
                  </button>

                  <button
                    onClick={() => handleOpenCampaignFileManager('save')}
                    className="bg-slate-950 hover:bg-slate-800 text-slate-200 hover:text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-slate-700 hover:border-amber-500/60 cursor-pointer active:scale-95 shadow-sm"
                    title="Save active campaign to a local server JSON data file"
                  >
                    <Save className="w-4 h-4 text-amber-400" />
                    <span>Save to JSON</span>
                  </button>

                  <button
                    onClick={() => handleOpenCampaignFileManager('load')}
                    className="bg-slate-950 hover:bg-slate-800 text-yellow-300 hover:text-yellow-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-yellow-700/70 hover:border-yellow-500 cursor-pointer active:scale-95 shadow-sm"
                    title="Browse and load stored campaign JSON data files from the server"
                  >
                    <FolderOpen className="w-4 h-4 text-yellow-400" />
                    <span>Load Campaign ({serverSavedCampaigns.length})</span>
                  </button>

                  <button
                    onClick={() => window.open('/api/campaign/files/template', '_blank')}
                    className="bg-slate-950 hover:bg-slate-800 text-blue-300 hover:text-blue-200 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border border-blue-800/70 hover:border-blue-500 cursor-pointer active:scale-95 shadow-sm"
                    title="Download blank campaign JSON template for external planning and importing"
                  >
                    <FileJson className="w-4 h-4 text-blue-400" />
                    <span>Blank Template</span>
                  </button>

                  <button
                    onClick={handleDownloadEventLog}
                    disabled={isDownloadingLog}
                    className="bg-slate-950 hover:bg-slate-800 disabled:opacity-50 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition border border-slate-700 hover:border-red-500/50 cursor-pointer active:scale-95"
                    title="Download campaign event log and storyline chronicle as a text file (.txt) for record keeping"
                  >
                    {isDownloadingLog ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Preparing Record...</span>
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4 text-white" />
                        <span>Event Log (.txt)</span>
                      </>
                    )}
                  </button>
                  <div className="bg-slate-950 px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
                    Session {campaignData.plan?.current_session} of {campaignData.plan?.sessions?.length || 1}
                  </div>
                </div>
              </div>

              {/* Download Success Notification */}
              {downloadSuccessMessage && (
                <div className="mb-4 bg-emerald-950/80 border border-emerald-500/80 rounded-xl p-3 text-xs text-emerald-200 flex items-center justify-between shadow-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span className="font-medium">{downloadSuccessMessage}</span>
                  </div>
                  <button
                    onClick={() => setDownloadSuccessMessage(null)}
                    className="text-emerald-400 hover:text-white p-1 rounded transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Server Saved Campaigns Quick Vault Bar */}
              {serverSavedCampaigns.length > 0 && (
                <div className="mb-6 p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5 text-slate-400 font-mono">
                      <HardDrive className="w-3.5 h-3.5 text-red-500" />
                      <span className="font-bold uppercase tracking-wider text-[10px] text-slate-300">
                        Server Local Campaign Files ({serverSavedCampaigns.length})
                      </span>
                    </div>
                    <button
                      onClick={() => handleOpenCampaignFileManager('load')}
                      className="text-xs text-yellow-400 hover:underline flex items-center gap-1 font-mono cursor-pointer"
                    >
                      <span>Manage Vault / Import .JSON</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs no-scrollbar">
                    {serverSavedCampaigns.map((file) => {
                      const isCurrent =
                        campaignData.plan?.theme === file.title ||
                        campaignData.plan?.villain === file.villain;

                      return (
                        <div
                          key={file.filename}
                          className={`shrink-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs transition ${
                            isCurrent
                              ? 'bg-red-950/60 border-red-500 text-white font-bold'
                              : 'bg-slate-900 border-slate-700/80 hover:border-slate-600 text-slate-300'
                          }`}
                        >
                          <FileJson className={`w-3.5 h-3.5 ${isCurrent ? 'text-red-400' : 'text-slate-500'}`} />
                          <div className="flex flex-col">
                            <span className="text-[11px] leading-tight font-medium max-w-[170px] truncate">
                              {file.title}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">
                              vs {file.villain}
                            </span>
                          </div>

                          {isCurrent ? (
                            <span className="bg-yellow-400 text-slate-950 text-[9px] font-black px-1.5 py-0.2 rounded font-mono ml-1">
                              ACTIVE
                            </span>
                          ) : (
                            <button
                              onClick={async () => {
                                try {
                                  const res = await fetch('/api/campaign/files/load', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ filename: file.filename }),
                                  });
                                  const data = await res.json();
                                  if (data.plan) {
                                    handleCampaignLoadedFromFile(data);
                                  }
                                } catch (e) {
                                  console.error(e);
                                }
                              }}
                              className="bg-slate-800 hover:bg-red-600 text-slate-200 hover:text-white px-2 py-0.5 rounded text-[10px] font-mono transition cursor-pointer ml-1"
                              title={`Load ${file.title}`}
                            >
                              Load
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-mono">{s.status}</span>
                        <button
                          type="button"
                          onClick={() => handleOpenCampaignModal('campaign', s.session_number)}
                          className="text-[10px] text-slate-400 hover:text-yellow-400 flex items-center gap-1 bg-slate-900/90 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-700/60 transition cursor-pointer"
                          title={`Edit Episode ${s.session_number}: ${s.title}`}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Edit</span>
                        </button>
                      </div>
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

                <div className="space-y-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <h4 className="font-comic text-xl text-red-400">Plot Chronology Log</h4>
                      <span className="text-[10px] bg-red-950 text-red-300 border border-red-800 px-2 py-0.5 rounded-full font-mono">
                        {campaignData.eventLog?.length || 0} events
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={handleCopyEventLog}
                        disabled={!campaignData.eventLog?.length}
                        className="bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-slate-300 hover:text-white border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
                        title="Copy all chronological events to clipboard"
                      >
                        {copiedLog ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-emerald-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleDownloadEventLog}
                        disabled={isDownloadingLog}
                        className="bg-slate-950 hover:bg-slate-800 disabled:opacity-40 text-yellow-400 hover:text-yellow-300 border border-slate-700 hover:border-yellow-500/50 px-2.5 py-1 rounded-lg text-xs font-mono flex items-center gap-1.5 transition cursor-pointer"
                        title="Download the campaign event log as a text file (.txt)"
                      >
                        {isDownloadingLog ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Download className="w-3.5 h-3.5" />
                        )}
                        <span>.TXT</span>
                      </button>
                    </div>
                  </div>

                  {/* Add Event Form */}
                  <form onSubmit={handleLogCustomEvent} className="flex gap-2">
                    <input
                      type="text"
                      value={newEventText}
                      onChange={(e) => setNewEventText(e.target.value)}
                      placeholder="Record plot milestone, battle aftermath, or note..."
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={!newEventText.trim()}
                      className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Log</span>
                    </button>
                  </form>

                  {/* Event Log items list */}
                  <div className="space-y-2 font-mono text-xs max-h-80 overflow-y-auto pr-1">
                    {campaignData.eventLog && campaignData.eventLog.length > 0 ? (
                      campaignData.eventLog.map((ev: string, idx: number) => (
                        <div
                          key={idx}
                          className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-slate-300 flex items-start gap-2 hover:border-slate-700 transition"
                        >
                          <span className="text-red-400 font-bold shrink-0 select-none">
                            #{idx + 1}
                          </span>
                          <span className="leading-relaxed">{ev}</span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-center text-slate-500 italic">
                        No events logged yet. Events will appear here as your campaign progresses.
                      </div>
                    )}
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

      {/* Custom Roll & Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border-2 border-yellow-500 rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-comic text-2xl text-yellow-400 flex items-center gap-2">
                <Dices className="w-6 h-6 text-red-500" />
                <span>ROLL & REPORT TO CHAT</span>
              </h3>
              <span className="text-[10px] bg-red-600 text-white font-bold px-2 py-0.5 rounded uppercase">
                {activeChar?.name || 'Hero'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Roll a d616 check and report the formatted result directly into the active Game Master chat window.
            </p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleReportRoll({
                  ability: reportAbility,
                  target_number: reportTN ? parseInt(reportTN, 10) : null,
                  edges: reportEdge,
                  troubles: reportTrouble,
                  actionDescription: reportDescription.trim() || undefined,
                });
              }}
              className="space-y-4 text-xs font-semibold"
            >
              <div>
                <label className="block text-slate-400 mb-1">Ability Check</label>
                <div className="grid grid-cols-3 gap-1.5 font-mono">
                  {[
                    { id: 'melee', label: 'Melee', val: activeChar?.melee ?? 5 },
                    { id: 'agility', label: 'Agility', val: activeChar?.agility ?? 4 },
                    { id: 'resilience', label: 'Resilience', val: activeChar?.resilience ?? 3 },
                    { id: 'vigilance', label: 'Vigilance', val: activeChar?.vigilance ?? 3 },
                    { id: 'ego', label: 'Ego', val: activeChar?.ego ?? 2 },
                    { id: 'logic', label: 'Logic', val: activeChar?.logic ?? 3 },
                  ].map((ab) => (
                    <button
                      key={ab.id}
                      type="button"
                      onClick={() => setReportAbility(ab.id)}
                      className={`p-2 rounded-lg border text-center transition ${
                        reportAbility === ab.id
                          ? 'bg-red-600 text-white border-yellow-400 font-bold shadow'
                          : 'bg-slate-950 text-slate-300 border-slate-700 hover:border-slate-500'
                      }`}
                    >
                      <div className="text-[10px] text-slate-300 uppercase">{ab.label}</div>
                      <div className="text-sm font-bold">+{ab.val}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-slate-400">Target Number (TN)</label>
                  <div className="flex gap-1">
                    {['10', '15', '20', '25'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setReportTN(preset)}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${
                          reportTN === preset
                            ? 'bg-yellow-500 text-slate-950 font-bold border-yellow-400'
                            : 'bg-slate-950 text-slate-400 border-slate-700'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="number"
                  value={reportTN}
                  onChange={(e) => setReportTN(e.target.value)}
                  placeholder="e.g. 15 (Moderate)"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Edge / Trouble Modifiers</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setReportEdge(0);
                      setReportTrouble(0);
                    }}
                    className={`flex-1 py-2 rounded-lg border transition ${
                      reportEdge === 0 && reportTrouble === 0
                        ? 'bg-slate-800 text-white border-slate-600'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Normal (0)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportEdge(reportEdge > 0 ? 0 : 1);
                      setReportTrouble(0);
                    }}
                    className={`flex-1 py-2 rounded-lg border transition ${
                      reportEdge > 0
                        ? 'bg-emerald-600 text-white border-emerald-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Edge (+1)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setReportTrouble(reportTrouble > 0 ? 0 : 1);
                      setReportEdge(0);
                    }}
                    className={`flex-1 py-2 rounded-lg border transition ${
                      reportTrouble > 0
                        ? 'bg-rose-600 text-white border-rose-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800'
                    }`}
                  >
                    Trouble (-1)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Hero Action Description (Optional)</label>
                <input
                  type="text"
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="e.g. Disarming the bomb, dodging a pumpkin bomb..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isNarrating}
                  className="flex-1 bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-slate-950 font-black py-2.5 rounded-lg shadow-lg flex items-center justify-center gap-1.5"
                >
                  <Dices className="w-4 h-4" />
                  <span>Roll & Report</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Active Hero & Karma Modal */}
      {showMobileHeroModal && activeChar && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border-2 border-amber-500/70 rounded-2xl max-w-md w-full p-4 max-h-[92vh] overflow-y-auto space-y-3 relative shadow-2xl">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <span className="font-comic text-lg text-amber-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Active Hero & Karma Controls
              </span>
              <button
                onClick={() => setShowMobileHeroModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {renderActiveHeroCard(activeChar)}
          </div>
        </div>
      )}

      {/* Campaign Plan Edit Modal (Accessible from Campaign Screen or Narrator AI Screen) */}
      <CampaignEditModal
        isOpen={isCampaignModalOpen}
        onClose={() => setIsCampaignModalOpen(false)}
        initialPlan={campaignData?.plan}
        onSaveSuccess={handleSaveCampaignSuccess}
        sourceScreen={campaignModalSource}
        initialEpisodeToEdit={campaignModalEpisode}
      />

      {/* Campaign File Manager Modal (Save / Load local JSON files on the server) */}
      <CampaignFileManagerModal
        isOpen={isCampaignFileManagerOpen}
        onClose={() => setIsCampaignFileManagerOpen(false)}
        activePlan={campaignData?.plan || null}
        onCampaignLoaded={handleCampaignLoadedFromFile}
        initialTab={campaignFileManagerInitialTab}
      />
    </div>
  );
}
