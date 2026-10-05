import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  Plus,
  Trash2,
  MapPin,
  Sparkles,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Check,
  Shield,
  Skull,
  BookOpen,
  Layers,
  Flag,
} from 'lucide-react';
import { CampaignPlan, CampaignSession } from '../core/campaign.ts';

interface CampaignEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlan?: CampaignPlan | null;
  onSaveSuccess: (updatedPlan: CampaignPlan) => void;
  sourceScreen?: 'narrator' | 'campaign';
  initialEpisodeToEdit?: number;
}

export function CampaignEditModal({
  isOpen,
  onClose,
  initialPlan,
  onSaveSuccess,
  sourceScreen = 'campaign',
  initialEpisodeToEdit,
}: CampaignEditModalProps) {
  const [theme, setTheme] = useState(initialPlan?.theme || '');
  const [villain, setVillain] = useState(initialPlan?.villain || '');
  const [heroTeamStr, setHeroTeamStr] = useState((initialPlan?.hero_team || []).join(', '));
  const [currentSession, setCurrentSession] = useState(initialPlan?.current_session || 1);
  const [notes, setNotes] = useState(initialPlan?.notes || '');
  const [sessions, setSessions] = useState<CampaignSession[]>(initialPlan?.sessions || []);

  const [activeTab, setActiveTab] = useState<'overview' | 'sessions'>('overview');
  const [expandedSessionIndex, setExpandedSessionIndex] = useState<number | null>(
    initialPlan?.current_session ? initialPlan.current_session - 1 : 0
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sync state when initialPlan changes or modal opens
  useEffect(() => {
    if (initialPlan) {
      setTheme(initialPlan.theme || '');
      setVillain(initialPlan.villain || '');
      setHeroTeamStr((initialPlan.hero_team || []).join(', '));
      setCurrentSession(initialPlan.current_session || 1);
      setNotes(initialPlan.notes || '');
      setSessions(JSON.parse(JSON.stringify(initialPlan.sessions || [])));
      
      if (initialEpisodeToEdit !== undefined && initialEpisodeToEdit !== null) {
        setActiveTab('sessions');
        setExpandedSessionIndex(initialEpisodeToEdit - 1);
      } else {
        setExpandedSessionIndex(initialPlan.current_session ? initialPlan.current_session - 1 : 0);
      }
    }
    setErrorMessage(null);
  }, [initialPlan, isOpen, initialEpisodeToEdit]);

  if (!isOpen) return null;

  const handleUpdateSessionField = (index: number, field: keyof CampaignSession, value: any) => {
    setSessions(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      return updated;
    });
  };

  const handleAddSession = () => {
    const nextNum = sessions.length + 1;
    const newSess: CampaignSession = {
      session_number: nextNum,
      title: `Episode ${nextNum}: Climax & Escalation`,
      act: `Act ${nextNum}: Crucial Turn`,
      briefing: `The hero team confronts ${villain || 'the villain'} as stakes escalate across the city.`,
      primary_objective: `Prevent ${villain || 'the mastermind'} from completing their objective and protect civilians.`,
      complications: ['High collateral damage risk', 'Hostages in jeopardy'],
      key_encounters: [`Encounter with ${villain || 'the villain'}'s top lieutenants`],
      status: 'planned',
    };
    setSessions(prev => [...prev, newSess]);
    setExpandedSessionIndex(sessions.length);
  };

  const handleDeleteSession = (index: number) => {
    if (sessions.length <= 1) {
      alert('A campaign must have at least one episode.');
      return;
    }
    setSessions(prev => {
      const filtered = prev.filter((_, i) => i !== index);
      // Re-index session numbers
      return filtered.map((s, i) => ({
        ...s,
        session_number: i + 1,
      }));
    });
    if (currentSession > sessions.length - 1) {
      setCurrentSession(Math.max(1, sessions.length - 1));
    }
  };

  const handleSetActiveSession = (sessionNum: number) => {
    setCurrentSession(sessionNum);
    setSessions(prev =>
      prev.map(s => {
        if (s.session_number === sessionNum) {
          return { ...s, status: 'active' };
        } else if (s.session_number < sessionNum) {
          return { ...s, status: s.status === 'completed' ? 'completed' : 'completed' };
        } else {
          return { ...s, status: s.status === 'completed' ? 'completed' : 'planned' };
        }
      })
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) {
      setErrorMessage('Please enter a Campaign Theme / Title.');
      return;
    }
    if (!villain.trim()) {
      setErrorMessage('Please enter the Primary Villain / Nemesis.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    const parsedHeroes = heroTeamStr
      .split(',')
      .map(h => h.trim())
      .filter(h => h.length > 0);

    const payload = {
      theme: theme.trim(),
      villain: villain.trim(),
      hero_team: parsedHeroes.length > 0 ? parsedHeroes : ['Spider-Man'],
      current_session: currentSession,
      notes: notes.trim(),
      sessions: sessions.map((s, idx) => ({
        ...s,
        session_number: idx + 1,
        status: s.session_number === currentSession ? 'active' : s.status,
      })),
    };

    try {
      const res = await fetch('/api/campaign/plan', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to update campaign plan');
      }

      onSaveSuccess(data.plan);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while saving the campaign.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-red-500 rounded-2xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <MapPin className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-comic text-xl text-white tracking-wide">
                  EDIT CAMPAIGN PLAN
                </h3>
                {sourceScreen === 'narrator' && (
                  <span className="text-[10px] bg-yellow-400 text-slate-950 font-bold px-2 py-0.5 rounded font-mono uppercase tracking-wider">
                    From Narrator AI
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Update the campaign arc, villain, and mission objectives. The Narrator AI will strictly adhere to this storyline.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch bar */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-5 pt-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('overview')}
              className={`px-3.5 py-2 text-xs font-bold font-mono rounded-t-lg transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-slate-900 text-red-400 border-red-500'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>1. Arc & Mastermind</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('sessions')}
              className={`px-3.5 py-2 text-xs font-bold font-mono rounded-t-lg transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'sessions'
                  ? 'bg-slate-900 text-red-400 border-red-500'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>2. Episodes & Objectives ({sessions.length})</span>
            </button>
          </div>
          <div className="text-[11px] font-mono text-yellow-400 font-semibold pb-1 hidden sm:block">
            Active: Episode {currentSession}
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="bg-red-950/80 border border-red-600 rounded-xl p-3 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-1.5 font-bold text-yellow-400 uppercase tracking-wider text-[11px]">
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Main Campaign Premise</span>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1">
                    Campaign Theme / Story Arc Title
                  </label>
                  <input
                    type="text"
                    required
                    value={theme}
                    onChange={e => setTheme(e.target.value)}
                    placeholder="e.g. The Midnight Syndicate Invasion, Gang War Manhattan, Siege of Wakanda"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 font-medium"
                  />
                  <span className="text-[10px] text-slate-500">
                    The overarching comic saga title that frames every mission.
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <Skull className="w-3.5 h-3.5 text-red-400" /> Primary Arch-Villain / Nemesis
                    </label>
                    <input
                      type="text"
                      required
                      value={villain}
                      onChange={e => setVillain(e.target.value)}
                      placeholder="e.g. Green Goblin, Kingpin, Doctor Doom, Ultron"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-blue-400" /> Hero Team (Comma-separated)
                    </label>
                    <input
                      type="text"
                      value={heroTeamStr}
                      onChange={e => setHeroTeamStr(e.target.value)}
                      placeholder="Spider-Man, Wolverine, Iron Man, Captain America"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                    <Flag className="w-3.5 h-3.5 text-yellow-400" /> Active Episode
                  </label>
                  <select
                    value={currentSession}
                    onChange={e => handleSetActiveSession(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-red-500 cursor-pointer"
                  >
                    {sessions.map((s, idx) => (
                      <option key={idx} value={s.session_number}>
                        Episode {s.session_number}: {s.title} ({s.act})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-slate-500">
                    The Narrator AI will focus the scene narrative and obstacles on this active episode.
                  </span>
                </div>
              </div>

              {/* GM Notes & Directives */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <label className="block text-slate-300 font-bold flex items-center gap-1.5 text-xs">
                  <BookOpen className="w-3.5 h-3.5 text-purple-400" />
                  <span>GM Storyline Directives & Lore Notes (Injected into Narrator AI)</span>
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Kingpin is weaponizing Stark-tech disruptors in the subway tunnels. Keep civilian danger high and emphasize Spider-Man's guilt over collateral damage."
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 font-mono"
                />
                <p className="text-[10px] text-slate-400">
                  Any specific worldbuilding, secret motives, or tonal notes written here will be fed directly to the Narrator AI's system prompt!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'sessions' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs text-slate-400 font-mono">
                  Episodes in this Story Arc ({sessions.length})
                </span>
                <button
                  type="button"
                  onClick={handleAddSession}
                  className="bg-red-600/80 hover:bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Episode</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {sessions.map((sess, idx) => {
                  const isExpanded = expandedSessionIndex === idx;
                  const isActive = currentSession === sess.session_number;

                  return (
                    <div
                      key={idx}
                      className={`border rounded-xl overflow-hidden transition-all ${
                        isActive
                          ? 'border-yellow-500 bg-slate-950/80'
                          : 'border-slate-800 bg-slate-950/40'
                      }`}
                    >
                      {/* Session Header Bar */}
                      <div
                        onClick={() => setExpandedSessionIndex(isExpanded ? null : idx)}
                        className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-900/60 transition select-none"
                      >
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`w-6 h-6 rounded-md font-mono text-xs font-bold flex items-center justify-center ${
                              isActive
                                ? 'bg-yellow-400 text-slate-950 font-black'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            {sess.session_number}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-comic text-base text-white">{sess.title}</h4>
                              {isActive && (
                                <span className="bg-yellow-400 text-slate-950 text-[9px] font-black uppercase px-1.5 py-0.2 rounded font-mono">
                                  ACTIVE
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400 font-mono">({sess.act})</span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1">
                              Target: {sess.primary_objective}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                          {!isActive && (
                            <button
                              type="button"
                              onClick={() => handleSetActiveSession(sess.session_number)}
                              className="text-[10px] bg-slate-800 hover:bg-yellow-500 hover:text-slate-950 text-slate-300 px-2 py-1 rounded font-mono transition"
                              title="Set as the current active session for the Narrator"
                            >
                              Set Active
                            </button>
                          )}
                          {sessions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSession(idx)}
                              className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-slate-800 transition"
                              title="Delete episode"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <div className="text-slate-400 pl-1 cursor-pointer">
                            {isExpanded ? (
                              <ChevronDown className="w-4 h-4 text-yellow-400" />
                            ) : (
                              <ChevronRight className="w-4 h-4" />
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Session Form */}
                      {isExpanded && (
                        <div className="p-4 bg-slate-900/90 border-t border-slate-800 space-y-3 text-xs">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-400 font-bold mb-1">
                                Episode Title
                              </label>
                              <input
                                type="text"
                                value={sess.title}
                                onChange={e => handleUpdateSessionField(idx, 'title', e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 font-bold mb-1">
                                Act Label
                              </label>
                              <input
                                type="text"
                                value={sess.act}
                                onChange={e => handleUpdateSessionField(idx, 'act', e.target.value)}
                                placeholder="e.g. Act I: Inciting Incident"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-slate-400 font-bold mb-1">
                              Primary Mission Objective (Target for Narrator AI)
                            </label>
                            <input
                              type="text"
                              value={sess.primary_objective}
                              onChange={e => handleUpdateSessionField(idx, 'primary_objective', e.target.value)}
                              placeholder="e.g. Infiltrate Fisk Tower's sub-basement and disarm the seismic charges"
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-medium text-amber-200"
                            />
                          </div>

                          <div>
                            <label className="block text-slate-400 font-bold mb-1">
                              Episode Briefing & Narrative Hook
                            </label>
                            <textarea
                              rows={2}
                              value={sess.briefing}
                              onChange={e => handleUpdateSessionField(idx, 'briefing', e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-slate-400 font-bold mb-1">
                                Complications (Semicolon-separated)
                              </label>
                              <input
                                type="text"
                                value={(sess.complications || []).join('; ')}
                                onChange={e =>
                                  handleUpdateSessionField(
                                    idx,
                                    'complications',
                                    e.target.value
                                      .split(';')
                                      .map(c => c.trim())
                                      .filter(c => c.length > 0)
                                  )
                                }
                                placeholder="Civilian crossfire; Power grid blackout"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                              />
                            </div>
                            <div>
                              <label className="block text-slate-400 font-bold mb-1">
                                Key Encounters (Semicolon-separated)
                              </label>
                              <input
                                type="text"
                                value={(sess.key_encounters || []).join('; ')}
                                onChange={e =>
                                  handleUpdateSessionField(
                                    idx,
                                    'key_encounters',
                                    e.target.value
                                      .split(';')
                                      .map(c => c.trim())
                                      .filter(c => c.length > 0)
                                  )
                                }
                                placeholder="Ambush by Osborn drones; Duel with Rhino"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono text-[11px]"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-slate-400 uppercase font-mono">Status:</span>
                              {(['planned', 'active', 'completed'] as const).map(st => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => handleUpdateSessionField(idx, 'status', st)}
                                  className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase font-bold border transition ${
                                    sess.status === st
                                      ? st === 'active'
                                        ? 'bg-yellow-400 text-slate-950 border-yellow-300'
                                        : st === 'completed'
                                        ? 'bg-emerald-950 text-emerald-300 border-emerald-600'
                                        : 'bg-slate-800 text-slate-200 border-slate-600'
                                      : 'bg-slate-950 text-slate-500 border-slate-800'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Footer buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-50 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-red-600/30 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Campaign...' : 'Apply & Update Storyline'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
