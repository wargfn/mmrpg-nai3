import React, { useEffect, useState } from 'react';

const sections = ['mechanics', 'powers', 'origins', 'occupations', 'traits', 'tags'] as const;
type Section = typeof sections[number];

export default function HomebrewRulesEditor({ onSaved }: { onSaved: () => Promise<void> }) {
  const [json, setJson] = useState('{}');
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [section, setSection] = useState<Section>('mechanics');
  const [editing, setEditing] = useState<string | null>(null);
  const [key, setKey] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/rules/homebrew');
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load homebrew.');
        if (!cancelled) {
          setJson(JSON.stringify(data, null, 2));
          setReady(true);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to load homebrew.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  function readDocument() {
    const document = JSON.parse(json);
    if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('Homebrew must be a JSON object.');
    return document;
  }

  let entries: [string, any][] = [];
  try {
    const document = readDocument();
    entries = section === 'mechanics'
      ? Object.entries(document.mechanics || {})
      : (document[section] || []).map((entry: any) => [entry.name, entry]);
  } catch {}

  function clearForm() {
    setEditing(null);
    setKey('');
    setTitle('');
    setDescription('');
  }

  function changeEntry(remove = false) {
    setError('');
    setMessage('');
    try {
      const document = readDocument();
      const identity = section === 'mechanics' ? key.trim() : title.trim();
      if (!identity || (!remove && (!title.trim() || !description.trim()))) {
        throw new Error('Enter a title, description, and (for mechanics) a unique rule key.');
      }
      const matches = (a: string, b: string) => section === 'mechanics' ? a === b : a.trim().toLowerCase() === b.trim().toLowerCase();
      if (!remove && entries.some(([id]) => matches(id, identity) && id !== editing)) {
        throw new Error('That rule already exists. Use Edit to change it.');
      }
      const previous = entries.find(([id]) => id === editing)?.[1] || {};
      if (section === 'mechanics') {
        document.mechanics = { ...document.mechanics };
        if (editing !== null) delete document.mechanics[editing];
        if (!remove) {
          if (['__proto__', 'constructor', 'prototype'].includes(identity)) throw new Error('Choose another rule key.');
          document.mechanics[identity] = { ...previous, title: title.trim(), description: description.trim() };
        }
      } else {
        document[section] = entries.filter(([id]) => id !== editing).map(([, entry]) => entry);
        if (!remove) document[section].push({ ...previous, name: title.trim(), description: description.trim() });
      }
      setJson(JSON.stringify(document, null, 2));
      clearForm();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to edit rule.');
    }
  }

  async function save() {
    setError('');
    setMessage('');
    try {
      const document = readDocument();
      setLoading(true);
      const response = await fetch('/api/rules/homebrew', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(document),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Unable to save homebrew.');
      await onSaved();
      setMessage('Homebrew saved. Rules lookup and narrator references now use these rules.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unable to save homebrew.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass = 'w-full rounded border border-slate-600 bg-slate-950 p-2 text-sm text-white';
  return (
    <details className="rounded-xl border border-slate-700 bg-slate-900 p-4">
      <summary className="cursor-pointer font-bold text-yellow-400">Manage homebrew rules</summary>
      <p className="my-3 text-sm text-slate-400">
        These are shared table-wide rules, not campaign-specific. Matching mechanic keys or names within a section
        override official entries. Official updates preserve homebrew. Changes apply only after Save homebrew.
      </p>
      {error && <p role="alert" className="my-2 text-red-400">{error}</p>}
      {message && <p role="status" className="my-2 text-emerald-400">{message}</p>}
      {loading && <p role="status" className="text-slate-400">Loading…</p>}
      <fieldset disabled={loading || !ready} className="space-y-3 disabled:opacity-50">
        <label className="block text-sm text-slate-300">
          Rule section
          <select className={inputClass} value={section} onChange={e => { setSection(e.target.value as Section); clearForm(); }}>
            {sections.map(item => <option key={item} value={item}>{item}</option>)}
          </select>
        </label>
        <ul className="max-h-48 space-y-1 overflow-y-auto">
          {entries.map(([id, entry]) => (
            <li key={id} className="flex items-center justify-between gap-2 text-sm text-slate-300">
              <span>{String(entry?.title || entry?.name || id)}</span>
              <button type="button" className="rounded border border-slate-600 px-3 py-1" onClick={() => {
                setEditing(id); setKey(id); setTitle(String(entry?.title || entry?.name || '')); setDescription(String(entry?.description || ''));
              }}>Edit</button>
            </li>
          ))}
        </ul>
        {section === 'mechanics' && (
          <label className="block text-sm text-slate-300">Rule key
            <input className={inputClass} value={key} onChange={e => setKey(e.target.value)} placeholder="my_house_rule" />
          </label>
        )}
        <label className="block text-sm text-slate-300">Title / name
          <input className={inputClass} value={title} onChange={e => setTitle(e.target.value)} />
        </label>
        <label className="block text-sm text-slate-300">Description
          <textarea className={inputClass} rows={3} value={description} onChange={e => setDescription(e.target.value)} />
        </label>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="rounded bg-slate-700 px-3 py-2 text-sm text-white" onClick={() => changeEntry()}>
            {editing === null ? 'Add to draft' : 'Update draft rule'}
          </button>
          {editing !== null && <>
            <button type="button" className="rounded bg-red-900 px-3 py-2 text-sm text-white" onClick={() => changeEntry(true)}>Remove from draft</button>
            <button type="button" className="px-3 py-2 text-sm text-slate-300" onClick={clearForm}>Cancel edit</button>
          </>}
        </div>
        <details>
          <summary className="cursor-pointer text-sm text-slate-300">Advanced JSON (all sections, power sets, and optional fields)</summary>
          <label className="block text-sm text-slate-400">Homebrew JSON
            <textarea className={`${inputClass} font-mono`} rows={16} spellCheck={false} value={json} onChange={e => { setJson(e.target.value); clearForm(); setMessage(''); }} />
          </label>
          <p className="text-xs text-slate-400">Remove entries to restore official defaults. An empty object clears all homebrew.</p>
        </details>
        {(key || title || description) && <p className="text-sm text-yellow-400">Add or update the draft rule before saving, or cancel the edit.</p>}
        <button type="button" disabled={!!(key || title || description)} onClick={save} className="rounded bg-red-600 px-4 py-2 font-bold text-white disabled:opacity-50">Save homebrew</button>
      </fieldset>
    </details>
  );
}
