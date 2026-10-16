import React, { useState } from 'react';
import { Shield, Sparkles, User, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: { username: string; email: string; role: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please enter both username/email and password.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }
      onLogin(data.user);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please choose a username and password.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim() || `${username.trim()}@marvel.com`,
          password,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Signup failed');
      }
      setSuccessMsg('Account created successfully! You can now log in.');
      setTimeout(() => {
        setMode('login');
        setSuccessMsg(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 comic-dots relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md bg-slate-900 border-4 border-red-600 rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.25)] p-8 relative z-10 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 bg-red-600 border-2 border-white items-center justify-center rounded-xl shadow-[3px_3px_0px_#000] mb-1">
            <span className="font-comic text-3xl text-white tracking-wider">M</span>
          </div>
          <h1 className="font-comic text-3xl text-red-500 tracking-wide drop-shadow-[0_2px_4px_rgba(239,68,68,0.3)]">
            MARVEL MULTIVERSE
          </h1>
          <p className="text-xs text-slate-400 uppercase tracking-widest font-mono">
            Narrator AI • d616 Access Terminal
          </p>
        </div>

        {/* Mode Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
            className={`py-2 rounded-lg transition ${
              mode === 'login' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null); }}
            className={`py-2 rounded-lg transition ${
              mode === 'signup' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
          <button
            type="button"
            onClick={() => { setMode('reset'); setError(null); setSuccessMsg(null); }}
            className={`py-2 rounded-lg transition ${
              mode === 'reset' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Reset Password
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="bg-red-950/80 border border-red-600 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-950/80 border border-emerald-600 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Forms */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-500" /> Username or Email
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. spider-man or email@marvel.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-red-500" /> Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-comic text-lg py-3 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.5)] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isLoading ? 'AUTHENTICATING...' : 'ENTER MULTIVERSE'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <div className="text-center pt-2">
              <span className="text-[11px] text-slate-500 font-mono">
                Sign up for a player account or ask an administrator for access.
              </span>
            </div>
          </form>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-red-500" /> Choose Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. iron-man, thor"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-red-500" /> Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="hero@marvel.com"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-red-500" /> Choose Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                minLength={12}
                maxLength={1024}
                required
              />
              <p className="text-[10px] text-slate-500">Use at least 12 characters.</p>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-comic text-lg py-3 rounded-xl shadow-[0_0_20px_rgba(239,68,68,0.5)] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isLoading ? 'CREATING ACCOUNT...' : 'REGISTER HERO'}</span>
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </button>
          </form>
        )}

        {mode === 'reset' && (
          <div className="space-y-4">
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-sm text-slate-300 space-y-2">
              <p className="text-yellow-400 font-bold">Password Reset</p>
              <p>Self-service password reset is unavailable because this app does not send email. Contact an administrator to reset your password.</p>
              <p className="text-xs text-slate-400">Administrators can use <code>npx tsx manage-users.ts reset</code> on the server.</p>
            </div>
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold py-3 rounded-xl transition"
            >
              Back to Sign In
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
