import React, { useState } from 'react';
import { Shield, Sparkles, Key, User, Lock, Mail, ArrowRight, AlertCircle, CheckCircle2, Send, ExternalLink } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: { username: string; email: string; role: string }) => void;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Reset password flow states
  const [resetStep, setResetStep] = useState<'request' | 'verify'>('request');
  const [resetUsernameOrEmail, setResetUsernameOrEmail] = useState('');
  const [simulatedToken, setSimulatedToken] = useState<string | null>(null);
  const [simulatedEmail, setSimulatedEmail] = useState<string | null>(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [newPassword, setNewPassword] = useState('');

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

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsernameOrEmail.trim()) {
      setError('Please enter your username or email.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usernameOrEmail: resetUsernameOrEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password reset request failed');
      }
      setSimulatedEmail(data.email);
      setSimulatedToken(data.temporaryToken);
      setResetStep('verify');
      setVerificationToken(data.temporaryToken); // Auto-fill for convenience
      setSuccessMsg(`Reset email successfully sent to ${data.email}! Check your simulated inbox below.`);
    } catch (err: any) {
      setError(err.message || 'Password reset request failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verificationToken.trim() || !newPassword) {
      setError('Please provide the temporary token/password and your new password.');
      return;
    }
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: verificationToken.trim(),
          newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Password reset failed');
      }
      setSuccessMsg('Password successfully reset! You can now sign in with your new password.');
      setTimeout(() => {
        setMode('login');
        setResetStep('request');
        setSuccessMsg(null);
        setSimulatedToken(null);
        setNewPassword('');
        setVerificationToken('');
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Password reset failed');
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
            onClick={() => { setMode('login'); setError(null); setSuccessMsg(null); setResetStep('request'); }}
            className={`py-2 rounded-lg transition ${
              mode === 'login' ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setError(null); setSuccessMsg(null); setResetStep('request'); }}
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
                Default Account: <code className="text-yellow-400">admin / adminpassword123</code>
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
                required
              />
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
          <div>
            {resetStep === 'request' ? (
              <form onSubmit={handleRequestReset} className="space-y-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1">
                  <p className="text-yellow-400 font-bold">Secure Password Reset</p>
                  <p>Enter your username or registered email address. We will send a secure temporary reset link & token to your email account.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-red-500" /> Username or Email
                  </label>
                  <input
                    type="text"
                    value={resetUsernameOrEmail}
                    onChange={(e) => setResetUsernameOrEmail(e.target.value)}
                    placeholder="e.g. admin or admin@marvel.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-comic text-lg py-3 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.5)] transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>{isLoading ? 'SENDING EMAIL...' : 'SEND RESET EMAIL'}</span>
                  <Send className="w-4 h-4 text-yellow-200" />
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerifyAndReset} className="space-y-4">
                {/* Simulated Email Inbox Notification Banner */}
                {simulatedToken && (
                  <div className="bg-sky-950/95 border-2 border-sky-500/80 rounded-xl p-3.5 space-y-2 text-xs font-mono shadow-lg">
                    <div className="flex items-center justify-between text-sky-300 font-bold border-b border-sky-800 pb-1.5">
                      <span className="flex items-center gap-1.5">
                        <Mail className="w-4 h-4 text-sky-400" /> SIMULATED INBOX (Email to {simulatedEmail})
                      </span>
                      <span className="text-[10px] bg-sky-900 text-sky-200 px-1.5 py-0.5 rounded">
                        Just Now
                      </span>
                    </div>
                    <p className="text-slate-300 text-[11px]">
                      "Hello, a password reset was requested for your Marvel Multiverse account. Use the temporary reset code below to establish your new password:"
                    </p>
                    <div className="bg-slate-950 p-2 rounded border border-sky-700 flex items-center justify-between">
                      <code className="text-yellow-400 font-bold select-all text-xs">{simulatedToken}</code>
                      <button
                        type="button"
                        onClick={() => setVerificationToken(simulatedToken)}
                        className="bg-sky-600 hover:bg-sky-500 text-white text-[10px] px-2 py-1 rounded font-bold transition cursor-pointer"
                      >
                        Auto-fill Code
                      </button>
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-yellow-500" /> Temporary Reset Token / Password
                  </label>
                  <input
                    type="text"
                    value={verificationToken}
                    onChange={(e) => setVerificationToken(e.target.value)}
                    placeholder="Enter 15-minute temporary token from email"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-red-500" /> New Password
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500 font-mono"
                    required
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => { setResetStep('request'); setSimulatedToken(null); }}
                    className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold py-3 rounded-xl transition text-xs"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-2/3 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-comic text-base py-3 rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.5)] transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>{isLoading ? 'RESETTING...' : 'SET NEW PASSWORD'}</span>
                    <Key className="w-4 h-4 text-yellow-200" />
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
