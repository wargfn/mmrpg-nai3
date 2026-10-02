import React, { useState, useEffect } from 'react';
import { Users, Shield, User, Mail, Key, Edit2, Trash2, Check, X, AlertCircle, ArrowLeft, Lock, Unlock } from 'lucide-react';

interface UserItem {
  username: string;
  email: string;
  role: 'admin' | 'player';
  createdAt: string;
  disabled?: boolean;
}

interface UsersManagementViewProps {
  currentUser: { username: string; role: string };
  onBack: () => void;
}

export function UsersManagementView({ currentUser, onBack }: UsersManagementViewProps) {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit modal state
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'player'>('player');
  const [editPassword, setEditPassword] = useState('');
  const [editDisabled, setEditDisabled] = useState(false);

  const fetchUsers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch users');
      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleStartEdit = (user: UserItem) => {
    setEditingUser(user);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditPassword('');
    setEditDisabled(!!user.disabled);
    setError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(editingUser.username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: editEmail,
          role: editRole,
          disabled: editDisabled,
          password: editPassword.trim() ? editPassword : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      setSuccessMsg(`Successfully updated user '${editingUser.username}'.`);
      setEditingUser(null);
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update user');
    }
  };

  const handleToggleDisable = async (user: UserItem) => {
    if (user.username.toLowerCase() === 'admin') {
      alert('Cannot disable the default admin account.');
      return;
    }
    const newDisabled = !user.disabled;
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.username)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ disabled: newDisabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update user status');

      setSuccessMsg(`Successfully ${newDisabled ? 'disabled' : 'enabled'} user '${user.username}'.`);
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update user status');
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (username.toLowerCase() === 'admin') {
      alert('Cannot delete the default admin account.');
      return;
    }
    if (!confirm(`Are you sure you want to delete user '${username}'?`)) return;

    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(username)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete user');

      setSuccessMsg(`Successfully deleted user '${username}'.`);
      fetchUsers();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to delete user');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-6">
      {/* Top Navigation / Header */}
      <div className="max-w-6xl mx-auto flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Dashboard
          </button>
          <div>
            <h1 className="font-comic text-2xl text-red-500 tracking-wide flex items-center gap-2">
              <Users className="w-6 h-6 text-red-500" /> Admin Users Management
            </h1>
            <p className="text-xs text-slate-400">
              Manage accounts, edit profile info, disable/enable access, and reset passwords.
            </p>
          </div>
        </div>
        <div className="text-right text-xs font-mono text-slate-400">
          Logged in as <span className="text-red-400 font-bold">{currentUser.username}</span> (Admin)
        </div>
      </div>

      <div className="max-w-6xl mx-auto space-y-4">
        {error && (
          <div className="bg-red-950/80 border border-red-600 text-red-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {successMsg && (
          <div className="bg-emerald-950/80 border border-emerald-600 text-emerald-300 p-3 rounded-xl text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Users Table / Card List */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-6 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
            <span className="font-comic text-lg text-slate-200">Registered Accounts ({users.length})</span>
            <button
              onClick={fetchUsers}
              className="text-xs text-red-400 hover:text-red-300 font-mono underline cursor-pointer"
            >
              Refresh List
            </button>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-500 font-mono text-sm">Loading user accounts...</div>
          ) : users.length === 0 ? (
            <div className="p-12 text-center text-slate-500 font-mono text-sm">No user accounts found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] font-mono text-slate-400 uppercase bg-slate-950/60">
                    <th className="py-3 px-6">User / Hero ID</th>
                    <th className="py-3 px-6">Email Address</th>
                    <th className="py-3 px-6">Role</th>
                    <th className="py-3 px-6">Status</th>
                    <th className="py-3 px-6">Created Date</th>
                    <th className="py-3 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-xs font-mono">
                  {users.map((u) => (
                    <tr key={u.username} className="hover:bg-slate-850 transition">
                      <td className="py-4 px-6 font-bold text-white flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-red-600/20 border border-red-500/40 text-red-400 flex items-center justify-center font-comic text-sm">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <span>{u.username}</span>
                      </td>
                      <td className="py-4 px-6 text-slate-300">{u.email}</td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            u.role === 'admin'
                              ? 'bg-amber-950/80 text-amber-300 border-amber-600'
                              : 'bg-blue-950/80 text-blue-300 border-blue-600'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            u.disabled
                              ? 'bg-red-950 text-red-400 border-red-600'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                          }`}
                        >
                          {u.disabled ? 'Disabled' : 'Active'}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-6 text-right space-x-2">
                        <button
                          onClick={() => handleStartEdit(u)}
                          className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-yellow-400" /> Edit & Password
                        </button>
                        {u.username.toLowerCase() !== 'admin' && (
                          <>
                            <button
                              onClick={() => handleToggleDisable(u)}
                              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer ${
                                u.disabled
                                  ? 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-700'
                                  : 'bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-700'
                              }`}
                              title={u.disabled ? 'Enable user account' : 'Disable user account'}
                            >
                              {u.disabled ? <Unlock className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(u.username)}
                              className="bg-red-950/60 hover:bg-red-900 text-red-300 px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border-2 border-red-600 rounded-2xl p-6 space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-comic text-xl text-red-500">Edit User: {editingUser.username}</h3>
              <button
                onClick={() => setEditingUser(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-red-500" /> Email Address
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-red-500"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-red-500" /> Role
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as 'admin' | 'player')}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-red-500"
                >
                  <option value="player">Player</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {editingUser.username.toLowerCase() !== 'admin' && (
                <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-amber-400" /> Disable Account Access
                  </span>
                  <input
                    type="checkbox"
                    checked={editDisabled}
                    onChange={(e) => setEditDisabled(e.target.checked)}
                    className="w-4 h-4 accent-red-600 rounded cursor-pointer"
                  />
                </div>
              )}

              <div className="space-y-1.5">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-yellow-400" /> New Password (leave blank to keep current)
                </label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2.5 rounded-xl text-xs font-bold transition shadow"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
