import React, { useState, useEffect } from 'react';
import {
  X,
  FolderOpen,
  Save,
  Upload,
  Download,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Skull,
  Shield,
  Clock,
  FileJson,
  Search,
  Check,
  RefreshCw,
  ArrowRight,
  HardDrive,
} from 'lucide-react';
import { CampaignPlan } from '../core/campaign.ts';

export interface SavedCampaignFile {
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

interface CampaignFileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlan: CampaignPlan | null;
  onCampaignLoaded: (data: {
    plan: CampaignPlan;
    context?: any;
    memories?: any[];
    eventLog?: string[];
  }) => void;
  initialTab?: 'load' | 'save' | 'import';
}

export function CampaignFileManagerModal({
  isOpen,
  onClose,
  activePlan,
  onCampaignLoaded,
  initialTab = 'load',
}: CampaignFileManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'load' | 'save' | 'import'>(initialTab);
  const [files, setFiles] = useState<SavedCampaignFile[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Save form state
  const [saveFilename, setSaveFilename] = useState('');
  const [includeMemories, setIncludeMemories] = useState(true);
  const [includeEventLog, setIncludeEventLog] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Import form state
  const [importedJsonText, setImportedJsonText] = useState('');
  const [importedParsedPlan, setImportedParsedPlan] = useState<CampaignPlan | null>(null);
  const [importLoadImmediately, setImportLoadImmediately] = useState(true);
  const [isImporting, setIsImporting] = useState(false);

  // Loading state for specific file
  const [loadingFilename, setLoadingFilename] = useState<string | null>(null);
  const [deletingFilename, setDeletingFilename] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
      setActionMessage(null);
      setActiveTab(initialTab);
      if (activePlan) {
        const cleanName = (activePlan.theme || 'campaign')
          .toLowerCase()
          .replace(/[^a-z0-9_-]+/g, '_')
          .replace(/^_+|_+$/g, '');
        setSaveFilename(`${cleanName}.json`);
      }
    }
  }, [isOpen, initialTab, activePlan]);

  if (!isOpen) return null;

  const fetchFiles = async () => {
    setIsLoadingFiles(true);
    try {
      const res = await fetch('/api/campaign/files');
      const data = await res.json();
      if (data.files) {
        setFiles(data.files);
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Failed to fetch saved campaigns from the server.' });
    } finally {
      setIsLoadingFiles(false);
    }
  };

  const handleLoadCampaign = async (filename: string) => {
    setLoadingFilename(filename);
    setActionMessage(null);
    try {
      const res = await fetch('/api/campaign/files/load', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load campaign from server');
      }

      onCampaignLoaded({
        plan: data.plan,
        context: data.context,
        memories: data.memories,
        eventLog: data.eventLog,
      });

      setActionMessage({
        type: 'success',
        text: `Loaded campaign "${data.plan.theme}" successfully! The Narrator AI is now following this storyline.`,
      });

      // Refresh files to update active flags
      fetchFiles();
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'An error occurred while loading campaign.' });
    } finally {
      setLoadingFilename(null);
    }
  };

  const handleSaveCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!saveFilename.trim()) {
      setActionMessage({ type: 'error', text: 'Please enter a target filename (e.g. my_campaign.json).' });
      return;
    }

    setIsSaving(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/campaign/files/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: saveFilename.trim(),
          includeMemories,
          includeEventLog,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save campaign to server');
      }

      setActionMessage({
        type: 'success',
        text: `Saved campaign to server file "${data.filename}" successfully!`,
      });
      setFiles(data.files || []);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to save campaign.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCampaign = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete server campaign file "${filename}"?`)) {
      return;
    }

    setDeletingFilename(filename);
    setActionMessage(null);
    try {
      const res = await fetch(`/api/campaign/files/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to delete campaign');
      }
      setFiles(data.files || []);
      setActionMessage({ type: 'success', text: `Deleted "${filename}" from server storage.` });
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Failed to delete file.' });
    } finally {
      setDeletingFilename(null);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setImportedJsonText(text);
      try {
        const parsed = JSON.parse(text);
        const plan = parsed.activePlan || parsed.plan || (parsed.theme ? parsed : null);
        if (plan && plan.theme) {
          setImportedParsedPlan(plan);
          setActionMessage(null);
        } else {
          setImportedParsedPlan(null);
          setActionMessage({
            type: 'error',
            text: 'Uploaded JSON is valid JSON, but does not match Marvel Multiverse campaign structure (missing theme/villain).',
          });
        }
      } catch {
        setImportedParsedPlan(null);
        setActionMessage({ type: 'error', text: 'Selected file is not valid JSON.' });
      }
    };
    reader.readAsText(file);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importedJsonText.trim()) return;

    setIsImporting(true);
    setActionMessage(null);
    try {
      const res = await fetch('/api/campaign/files/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonContent: importedJsonText,
          loadImmediately: importLoadImmediately,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to import campaign');
      }

      if (importLoadImmediately && data.plan) {
        onCampaignLoaded({
          plan: data.plan,
          context: data.context,
          memories: data.memories,
          eventLog: data.eventLog,
        });
      }

      setActionMessage({
        type: 'success',
        text: `Campaign imported and saved as "${data.filename}"!${importLoadImmediately ? ' Set as active campaign.' : ''}`,
      });
      setFiles(data.files || []);
      setImportedJsonText('');
      setImportedParsedPlan(null);
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Import failed.' });
    } finally {
      setIsImporting(false);
    }
  };

  const filteredFiles = files.filter((f) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      f.title.toLowerCase().includes(q) ||
      f.villain.toLowerCase().includes(q) ||
      f.filename.toLowerCase().includes(q) ||
      f.hero_team.some((h) => h.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-red-500 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <HardDrive className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-comic text-xl text-white tracking-wide">
                  SERVER CAMPAIGN VAULT
                </h3>
                <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-300 font-mono px-2 py-0.5 rounded">
                  JSON Data Files
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Save active campaigns or load structured Marvel Multiverse campaign files stored locally on the server.
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

        {/* Tab switcher */}
        <div className="bg-slate-950/70 border-b border-slate-800 px-5 pt-2 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('load');
                setActionMessage(null);
              }}
              className={`px-3.5 py-2 text-xs font-bold font-mono rounded-t-lg transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'load'
                  ? 'bg-slate-900 text-red-400 border-red-500'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <FolderOpen className="w-3.5 h-3.5" />
              <span>Load Campaign ({files.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('save');
                setActionMessage(null);
              }}
              className={`px-3.5 py-2 text-xs font-bold font-mono rounded-t-lg transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'save'
                  ? 'bg-slate-900 text-red-400 border-red-500'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Current Campaign</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('import');
                setActionMessage(null);
              }}
              className={`px-3.5 py-2 text-xs font-bold font-mono rounded-t-lg transition flex items-center gap-1.5 border-b-2 cursor-pointer ${
                activeTab === 'import'
                  ? 'bg-slate-900 text-red-400 border-red-500'
                  : 'text-slate-400 border-transparent hover:text-slate-200'
              }`}
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Upload / Import .JSON</span>
            </button>
          </div>

          <div className="text-[11px] font-mono text-yellow-400 font-semibold pb-1 hidden sm:flex items-center gap-1.5">
            <span className="text-slate-500">Active:</span>
            <span className="truncate max-w-[200px]">{activePlan?.theme || 'None'}</span>
          </div>
        </div>

        {/* Action feedback message */}
        {actionMessage && (
          <div
            className={`mx-5 mt-4 p-3 rounded-xl border text-xs flex items-center justify-between shrink-0 animate-in fade-in ${
              actionMessage.type === 'success'
                ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-200'
                : 'bg-red-950/80 border-red-600 text-red-200'
            }`}
          >
            <div className="flex items-center gap-2">
              {actionMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{actionMessage.text}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Tab 1: Load Campaign from Server */}
        {activeTab === 'load' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {/* Search & Refresh bar */}
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter campaigns by title, nemesis villain, hero, or filename..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 font-medium"
                />
              </div>
              <button
                onClick={fetchFiles}
                disabled={isLoadingFiles}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white px-3 py-2 rounded-lg text-xs font-mono flex items-center gap-1.5 transition cursor-pointer shrink-0"
                title="Refresh list of campaign files on server"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin text-red-400' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {/* Campaign Files Grid */}
            {isLoadingFiles ? (
              <div className="py-16 text-center text-slate-400 font-mono text-xs flex flex-col items-center gap-2">
                <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
                <span>Scanning server storage folder for JSON campaigns...</span>
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs bg-slate-950/50 rounded-xl border border-slate-800 p-6 space-y-2">
                <FileJson className="w-8 h-8 text-slate-600 mx-auto" />
                <p>No campaign JSON files matching your search were found.</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-red-400 hover:underline font-mono text-[11px]"
                >
                  Clear search filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {filteredFiles.map((file) => {
                  const isCurrentActive = file.isActive;
                  const isCurrentLoading = loadingFilename === file.filename;
                  const isCurrentDeleting = deletingFilename === file.filename;

                  return (
                    <div
                      key={file.filename}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        isCurrentActive
                          ? 'bg-red-950/30 border-red-500/80 shadow-lg shadow-red-950/50'
                          : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-2">
                        {/* Header & Badges */}
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <h4 className="font-comic text-base text-white leading-tight">
                                {file.title}
                              </h4>
                              {isCurrentActive && (
                                <span className="bg-yellow-400 text-slate-950 text-[9px] font-black uppercase px-1.5 py-0.2 rounded font-mono">
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                              <FileJson className="w-3 h-3 text-red-400" />
                              <span>{file.filename}</span>
                              <span>•</span>
                              <span>{(file.size_bytes / 1024).toFixed(1)} KB</span>
                            </div>
                          </div>

                          <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded shrink-0">
                            {file.session_count} Episodes
                          </span>
                        </div>

                        {/* Villain & Heroes */}
                        <div className="text-xs space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Skull className="w-3.5 h-3.5 text-red-400 shrink-0" />
                            <span className="text-slate-400 font-semibold text-[11px]">Nemesis:</span>
                            <span className="text-red-300 font-bold">{file.villain}</span>
                          </div>
                          {file.hero_team?.length > 0 && (
                            <div className="flex items-center gap-1.5 text-slate-300">
                              <Shield className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="text-slate-400 font-semibold text-[11px]">Heroes:</span>
                              <span className="text-slate-200 truncate">{file.hero_team.join(', ')}</span>
                            </div>
                          )}
                          {file.notes && (
                            <p className="text-[11px] text-slate-400 line-clamp-2 italic pt-0.5">
                              "{file.notes}"
                            </p>
                          )}
                        </div>

                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Updated: {new Date(file.updated_at).toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-3">
                        <div className="flex items-center gap-1.5">
                          <a
                            href={`/api/campaign/files/download/${encodeURIComponent(file.filename)}`}
                            download={file.filename}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white p-1.5 rounded-lg border border-slate-700 text-xs transition"
                            title="Download JSON file to your device"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>

                          <button
                            type="button"
                            onClick={() => handleDeleteCampaign(file.filename)}
                            disabled={isCurrentDeleting}
                            className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-900 transition"
                            title="Delete file from server"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleLoadCampaign(file.filename)}
                          disabled={isCurrentLoading || isCurrentActive}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono flex items-center gap-1.5 transition cursor-pointer ${
                            isCurrentActive
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-700/60 cursor-default'
                              : 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950 active:scale-95'
                          }`}
                        >
                          {isCurrentLoading ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Loading...</span>
                            </>
                          ) : isCurrentActive ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Currently Active</span>
                            </>
                          ) : (
                            <>
                              <ArrowRight className="w-3.5 h-3.5" />
                              <span>Load Campaign</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Save Current Campaign */}
        {activeTab === 'save' && (
          <form onSubmit={handleSaveCampaign} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {activePlan ? (
              <>
                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div className="flex items-center gap-1.5 font-bold text-yellow-400 uppercase tracking-wider text-[11px]">
                    <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                    <span>Current Active Campaign Snapshot</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <span className="text-slate-500 font-bold block">Campaign Theme / Title:</span>
                      <span className="text-white font-bold text-sm">{activePlan.theme}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Primary Nemesis:</span>
                      <span className="text-red-400 font-bold">{activePlan.villain}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Hero Team:</span>
                      <span className="text-slate-300">{activePlan.hero_team?.join(', ')}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold block">Episodes Roadmap:</span>
                      <span className="text-slate-300 font-mono">
                        {activePlan.sessions?.length || 0} episodes (Currently at Episode {activePlan.current_session})
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
                  <div>
                    <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                      <FileJson className="w-3.5 h-3.5 text-red-400" />
                      <span>Target JSON Filename (Stored in /saved_campaigns)</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={saveFilename}
                      onChange={(e) => setSaveFilename(e.target.value)}
                      placeholder="e.g. maximum_carnage_v2.json"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder:text-slate-500 focus:outline-none focus:border-red-500"
                    />
                    <span className="text-[10px] text-slate-500">
                      The file will be safely stored on the server's local filesystem and can be reloaded at any time.
                    </span>
                  </div>

                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={includeMemories}
                        onChange={(e) => setIncludeMemories(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                      />
                      <span>Include Campaign Lore, NPCs, and Entity Memories</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                      <input
                        type="checkbox"
                        checked={includeEventLog}
                        onChange={(e) => setIncludeEventLog(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                      />
                      <span>Include Chronological Plot Event History Log</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={isSaving || !saveFilename.trim()}
                    className="bg-gradient-to-r from-red-600 to-amber-600 hover:from-red-500 hover:to-amber-500 disabled:opacity-50 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-red-900/40 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSaving ? 'Saving to Server...' : 'Save Campaign to Server'}</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-slate-400">
                No active campaign plan is currently initialized.
              </div>
            )}
          </form>
        )}

        {/* Tab 3: Upload / Import .JSON */}
        {activeTab === 'import' && (
          <form onSubmit={handleImportSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
            {/* Blank Template Helper Box */}
            <div className="bg-blue-950/30 border border-blue-800/60 p-4 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-blue-300 font-bold">
                  <FileJson className="w-4 h-4 text-blue-400" />
                  <span>Blank Campaign JSON Template</span>
                </div>
                <span className="text-[10px] bg-blue-900 text-blue-200 px-2 py-0.5 rounded font-mono">External Planning</span>
              </div>
              <p className="text-slate-300 text-xs leading-relaxed">
                Planning your campaign in an external document, text editor, or AI planner? Download or copy our fully structured blank template to populate and import.
              </p>
              <div className="flex items-center gap-2.5 flex-wrap pt-1">
                <button
                  type="button"
                  onClick={() => window.open('/api/campaign/files/template', '_blank')}
                  className="bg-blue-900/80 hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition border border-blue-700 cursor-pointer"
                  title="Download blank template as .json file"
                >
                  <Download className="w-3.5 h-3.5 text-blue-200" />
                  <span>Download Template (.json)</span>
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/campaign/files/template');
                      const text = await res.text();
                      navigator.clipboard.writeText(text);
                      setImportedJsonText(text);
                      const parsed = JSON.parse(text);
                      if (parsed.activePlan) {
                        setImportedParsedPlan(parsed.activePlan);
                      }
                      setActionMessage({ type: 'success', text: 'Blank template copied to clipboard & loaded into import box!' });
                    } catch {
                      setActionMessage({ type: 'error', text: 'Failed to generate template.' });
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition border border-slate-700 cursor-pointer"
                  title="Copy blank template directly to editor"
                >
                  <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                  <span>Copy & Use Template</span>
                </button>
              </div>
            </div>

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-3">
              <label className="block text-slate-300 font-bold mb-1 flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5 text-yellow-400" />
                <span>Upload Campaign JSON File</span>
              </label>

              <input
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-red-600 file:text-white hover:file:bg-red-500 cursor-pointer bg-slate-900 p-2 rounded-lg border border-slate-700"
              />
              <span className="text-[10px] text-slate-500 block">
                Select any valid exported Marvel Multiverse campaign JSON file from your computer.
              </span>
            </div>

            {importedParsedPlan && (
              <div className="bg-emerald-950/30 border border-emerald-500/50 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Valid Campaign JSON Detected!</span>
                </div>
                <div className="text-white font-bold text-sm">{importedParsedPlan.theme}</div>
                <div className="text-slate-300 text-xs">
                  Nemesis: <span className="text-red-400 font-bold">{importedParsedPlan.villain}</span> •{' '}
                  {importedParsedPlan.sessions?.length || 0} Episodes
                </div>
              </div>
            )}

            <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
              <label className="block text-slate-400 font-semibold mb-1">
                Or Paste Raw Campaign JSON Content:
              </label>
              <textarea
                rows={5}
                value={importedJsonText}
                onChange={(e) => {
                  setImportedJsonText(e.target.value);
                  try {
                    const parsed = JSON.parse(e.target.value);
                    const plan = parsed.activePlan || parsed.plan || (parsed.theme ? parsed : null);
                    if (plan?.theme) {
                      setImportedParsedPlan(plan);
                      setActionMessage(null);
                    }
                  } catch {
                    setImportedParsedPlan(null);
                  }
                }}
                placeholder='{"activePlan": {"theme": "My Custom Arc", "villain": "Ultron", "sessions": [...]}}'
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={importLoadImmediately}
                  onChange={(e) => setImportLoadImmediately(e.target.checked)}
                  className="rounded bg-slate-900 border-slate-700 text-red-600 focus:ring-0"
                />
                <span>Set as active campaign immediately upon import</span>
              </label>

              <button
                type="submit"
                disabled={isImporting || !importedJsonText.trim()}
                className="bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold px-5 py-2 rounded-xl flex items-center gap-1.5 transition cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>{isImporting ? 'Importing...' : 'Save & Import to Server'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span className="font-mono">Local storage path: ./saved_campaigns/*.json</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
