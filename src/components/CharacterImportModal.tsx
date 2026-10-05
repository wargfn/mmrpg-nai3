import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Download,
  Copy,
  Check,
  Shield,
  Heart,
  Zap,
  Sparkles,
  ArrowRight,
  UserCheck,
  FileCode,
} from 'lucide-react';
import { AVERAGE_PERSON_TEMPLATE, NEW_HERO_TEMPLATE } from '../core/character.ts';

interface CharacterImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (imported: any[], setActive: boolean) => void;
}

export const CharacterImportModal: React.FC<CharacterImportModalProps> = ({
  isOpen,
  onClose,
  onImportSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'paste'>('paste');
  const [jsonText, setJsonText] = useState<string>(() => JSON.stringify(AVERAGE_PERSON_TEMPLATE, null, 2));
  const [parsedData, setParsedData] = useState<any>(AVERAGE_PERSON_TEMPLATE);
  const [parseError, setParseError] = useState<string | null>(null);
  const [validationWarnings, setValidationWarnings] = useState<string[]>([]);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [setActiveAfterImport, setSetActiveAfterImport] = useState<boolean>(true);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [copiedTemplate, setCopiedTemplate] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    validateAndParse(jsonText);
  }, [jsonText]);

  const validateAndParse = (text: string) => {
    if (!text.trim()) {
      setParsedData(null);
      setParseError('Please enter or upload a valid JSON character statblock.');
      setValidationWarnings([]);
      return;
    }

    try {
      const data = JSON.parse(text);
      const warnings: string[] = [];

      // Check if it's a single character or multiple
      const target = Array.isArray(data) ? data[0] : (data.statblock || data);

      if (!target || typeof target !== 'object') {
        throw new Error('JSON root must be a character object or array of characters.');
      }

      if (!target.name || typeof target.name !== 'string') {
        warnings.push('Missing "name" property (will default to "Unnamed Hero").');
      }

      if (!target.abilities || typeof target.abilities !== 'object') {
        warnings.push('Missing "abilities" object (abilities will default to 0).');
      } else {
        const requiredAbilities = ['melee', 'agility', 'resilience', 'vigilance', 'ego', 'logic'];
        for (const ab of requiredAbilities) {
          if (!target.abilities[ab]) {
            warnings.push(`Missing ability "${ab}" in abilities object.`);
          }
        }
      }

      if (!target.health) {
        warnings.push('Missing "health" score object.');
      }
      if (!target.focus) {
        warnings.push('Missing "focus" score object.');
      }

      setParsedData(target);
      setParseError(null);
      setValidationWarnings(warnings);
    } catch (err: any) {
      setParsedData(null);
      setParseError(err.message || 'Invalid JSON syntax');
      setValidationWarnings([]);
    }
  };

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setJsonText(content);
        setActiveTab('paste');
      }
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleLoadAverageTemplate = () => {
    setJsonText(JSON.stringify(AVERAGE_PERSON_TEMPLATE, null, 2));
    setActiveTab('paste');
  };

  const handleLoadHeroTemplate = () => {
    setJsonText(JSON.stringify(NEW_HERO_TEMPLATE, null, 2));
    setActiveTab('paste');
  };

  const handleDownloadTemplate = (templateType: 'average' | 'hero') => {
    const data = templateType === 'average' ? AVERAGE_PERSON_TEMPLATE : NEW_HERO_TEMPLATE;
    const filename = templateType === 'average' ? 'average_citizen_template.json' : 'hero_template.json';
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCurrentJson = () => {
    if (jsonText) {
      navigator.clipboard.writeText(jsonText);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    }
  };

  const handleExecuteImport = async () => {
    if (!parsedData) return;
    setIsImporting(true);
    setParseError(null);

    try {
      const parsedFull = JSON.parse(jsonText);
      const res = await fetch('/api/characters/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characters: Array.isArray(parsedFull) ? parsedFull : [parsedFull],
          setActive: setActiveAfterImport,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to import character');
      }

      onImportSuccess(result.characters || [result.imported], setActiveAfterImport);
      onClose();
    } catch (err: any) {
      setParseError(err.message || 'Import failed. Check JSON format.');
    } finally {
      setIsImporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-slate-900 border-2 border-red-500 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-950 border-b border-slate-800 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center shadow-lg border border-red-400">
              <Upload className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-comic text-2xl text-red-500 tracking-wide">IMPORT HERO STATBLOCK</h2>
              <p className="text-xs text-slate-400">
                Adheres strictly to the Marvel Multiverse RPG JSON Schema
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Templates Banner */}
        <div className="bg-slate-950/60 border-b border-slate-800 px-6 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-[11px] uppercase font-bold text-slate-400">Ready Templates:</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleLoadAverageTemplate}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition"
              title="Populate editor with Average Person JSON template"
            >
              <FileCode className="w-3.5 h-3.5 text-blue-400" />
              <span>Load Average Citizen</span>
            </button>
            <button
              onClick={handleLoadHeroTemplate}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition"
              title="Populate editor with Hero template"
            >
              <FileCode className="w-3.5 h-3.5 text-yellow-400" />
              <span>Load Hero Template</span>
            </button>
            <button
              onClick={() => handleDownloadTemplate('average')}
              className="bg-blue-950/80 hover:bg-blue-900 text-blue-300 border border-blue-700/80 px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition"
              title="Download average_citizen_template.json file"
            >
              <Download className="w-3.5 h-3.5 text-blue-300" />
              <span>Download Schema JSON</span>
            </button>
          </div>
        </div>

        {/* Content Body - Split View */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Input Form (Tabs: Paste JSON or File Upload) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            {/* Input Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => setActiveTab('paste')}
                  className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'paste'
                      ? 'bg-red-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <FileJson className="w-3.5 h-3.5" />
                  <span>Paste JSON</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('upload')}
                  className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1.5 ${
                    activeTab === 'upload'
                      ? 'bg-red-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload File</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCurrentJson}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2.5 py-1 rounded border border-slate-700 transition"
                  title="Copy current JSON content"
                >
                  {copiedTemplate ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedTemplate ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>
            </div>

            {/* Mode 1: Upload File Drag & Drop */}
            {activeTab === 'upload' && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
                  dragActive
                    ? 'border-red-500 bg-red-950/20'
                    : 'border-slate-700 hover:border-slate-500 bg-slate-950/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileUpload(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-red-400" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">Click to select or drag and drop character JSON</h4>
                <p className="text-xs text-slate-400 max-w-sm mb-3">
                  Supports standard character statblock files (*.json) adhering to the Average Citizen schema
                </p>
                <span className="text-[11px] font-mono text-red-400 bg-red-950/40 px-3 py-1 rounded-full border border-red-800/40">
                  Select .JSON file
                </span>
              </div>
            )}

            {/* Mode 2: JSON Text Editor */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5 text-red-400" />
                  <span>Statblock JSON Schema Code:</span>
                </label>
                <span className="text-[10px] text-slate-500 font-mono">
                  {jsonText.split('\n').length} lines
                </span>
              </div>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder="Paste character statblock JSON here..."
                rows={16}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-200 focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/50 resize-y scrollbar-thin"
                spellCheck={false}
              />
            </div>

            {/* Syntax or Schema Warnings/Errors */}
            {parseError && (
              <div className="bg-red-950/40 border border-red-500/50 rounded-lg p-3 text-xs text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Invalid JSON:</span> {parseError}
                </div>
              </div>
            )}

            {validationWarnings.length > 0 && !parseError && (
              <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-3 text-xs text-amber-300 space-y-1">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Schema Warnings (Auto-resolved with safe defaults):</span>
                </div>
                <ul className="list-disc pl-5 text-[11px] text-amber-400/90 space-y-0.5">
                  {validationWarnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column: Live Statblock Preview */}
          <div className="lg:col-span-5 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-yellow-400" />
                <span>Live Schema Preview:</span>
              </span>
              {parsedData && !parseError && (
                <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/60 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Schema Valid
                </span>
              )}
            </div>

            {parsedData ? (
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 space-y-4 shadow-inner flex-1 overflow-y-auto max-h-[500px]">
                {/* Header Card */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="bg-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase">
                      Rank {parsedData.rank ?? 1} • Tier {parsedData.tier ?? 1}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                      parsedData.is_npc ? 'bg-purple-950/70 text-purple-300 border border-purple-700/60' : 'bg-red-950/70 text-red-300 border border-red-700/60'
                    }`}>
                      {parsedData.is_npc ? 'NPC' : 'HERO'}
                    </span>
                  </div>
                  <h3 className="font-comic text-2xl text-white tracking-wide">
                    {parsedData.name || 'Unnamed Character'}
                  </h3>
                  {parsedData.alias && (
                    <p className="text-xs text-yellow-400/90 font-semibold italic">"{parsedData.alias}"</p>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    {parsedData.background || 'Standard Background'}
                  </p>
                </div>

                {/* Vitals & Karma */}
                <div className="grid grid-cols-3 gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 text-center font-mono text-xs">
                  <div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                      <Heart className="w-3 h-3 text-emerald-400" /> Health
                    </div>
                    <div className="font-bold text-emerald-400 text-sm">
                      {parsedData.health?.score ?? 10}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                      <Zap className="w-3 h-3 text-blue-400" /> Focus
                    </div>
                    <div className="font-bold text-blue-400 text-sm">
                      {parsedData.focus?.score ?? 10}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" /> Karma
                    </div>
                    <div className="font-bold text-amber-400 text-sm">
                      {parsedData.karma ?? 0}
                    </div>
                  </div>
                </div>

                {/* Ability Scores & Defenses Table */}
                <div>
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Abilities & Defenses
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                    {[
                      { key: 'melee', label: 'Melee' },
                      { key: 'agility', label: 'Agility' },
                      { key: 'resilience', label: 'Resilience' },
                      { key: 'vigilance', label: 'Vigilance' },
                      { key: 'ego', label: 'Ego' },
                      { key: 'logic', label: 'Logic' },
                    ].map(({ key, label }) => {
                      const ab = parsedData.abilities?.[key];
                      const score = ab?.score ?? 0;
                      const defense = ab?.defense_score ?? (10 + score);
                      return (
                        <div key={key} className="bg-slate-950/60 p-1.5 rounded border border-slate-800/80">
                          <div className="text-[10px] text-slate-400 font-bold uppercase">{label}</div>
                          <div className="text-white font-bold text-sm">{score}</div>
                          <div className="text-[9px] text-slate-500">Def: {defense}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Speed Details */}
                {parsedData.speed && (
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-[11px] flex items-center justify-between font-mono">
                    <span className="text-slate-400">Speeds:</span>
                    <span className="text-slate-200">
                      Run: {parsedData.speed.run ?? 5} • Climb: {parsedData.speed.climb ?? 3} • Swim: {parsedData.speed.swim ?? 3} • Jump: {parsedData.speed.jump ?? 3}
                    </span>
                  </div>
                )}

                {/* Traits & Powers */}
                <div className="space-y-2 text-xs">
                  {parsedData.traits && parsedData.traits.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-300">Traits: </span>
                      <span className="text-slate-400">{parsedData.traits.join(', ')}</span>
                    </div>
                  )}
                  {parsedData.powers && parsedData.powers.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-300">Powers: </span>
                      <span className="text-yellow-400/90 font-mono text-[11px]">
                        {parsedData.powers.map((p: any) => (typeof p === 'string' ? p : p.name)).join(', ')}
                      </span>
                    </div>
                  )}
                  {parsedData.tags && parsedData.tags.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-300">Tags: </span>
                      <span className="text-slate-400">{parsedData.tags.join(', ')}</span>
                    </div>
                  )}
                  {parsedData.equipment && parsedData.equipment.length > 0 && (
                    <div>
                      <span className="font-bold text-slate-300">Equipment: </span>
                      <span className="text-slate-400">
                        {parsedData.equipment.map((e: any) => (typeof e === 'string' ? e : e.name)).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-slate-950 rounded-xl p-8 border border-slate-800 flex flex-col items-center justify-center text-center text-slate-500 h-64">
                <FileJson className="w-10 h-10 mb-2 opacity-40" />
                <p className="text-xs">No valid statblock data to preview yet.</p>
                <p className="text-[11px] text-slate-600 mt-1">Paste or upload a character JSON file on the left.</p>
              </div>
            )}

            {/* Set as Active Checkbox */}
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs">
              <label htmlFor="set_active_char" className="flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  id="set_active_char"
                  type="checkbox"
                  checked={setActiveAfterImport}
                  onChange={(e) => setSetActiveAfterImport(e.target.checked)}
                  className="rounded border-slate-700 text-red-600 focus:ring-red-500 bg-slate-900"
                />
                <span className="font-semibold">Set as Active Character after import</span>
              </label>
              <UserCheck className="w-4 h-4 text-slate-500" />
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-950 border-t border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {parsedData?.name ? (
              <span>Ready to register <strong className="text-white">"{parsedData.name}"</strong> to the roster.</span>
            ) : (
              <span>Paste or upload a character statblock to proceed.</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-4 py-2 rounded-lg text-xs font-semibold transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecuteImport}
              disabled={!parsedData || Boolean(parseError) || isImporting}
              className="bg-red-600 hover:bg-red-500 disabled:opacity-40 disabled:hover:bg-red-600 text-white px-5 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-lg"
            >
              {isImporting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Importing...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Import Character to Roster</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
