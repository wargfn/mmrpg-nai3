import fs from 'fs';
import path from 'path';
import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export type UserRole = 'admin' | 'narrator' | 'player';

export interface UserAccount {
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  createdAt: string;
  disabled?: boolean;
}

const USERS_FILE = path.resolve('users.json');

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function validatePassword(password: string) {
  if (password.length < 12 || password.length > 1024) {
    throw new Error('Passwords must be between 12 and 1024 characters.');
  }
}

export function verifyPassword(password: string, encodedHash: string): boolean {
  const [algorithm, saltHex, hashHex] = encodedHash.split('$');
  if (algorithm !== 'scrypt' || !saltHex || !hashHex || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(hashHex)) {
    return false;
  }
  const salt = Buffer.from(saltHex, 'hex');
  const expected = Buffer.from(hashHex, 'hex');
  if (expected.length !== 64) return false;
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(actual, expected);
}

const DUMMY_PASSWORD_HASH = hashPassword(randomBytes(32).toString('hex'));
const DEFAULT_CREDENTIALS = new Map([
  ['admin', 'adminpassword123'],
  ['spider-man', 'marvel616'],
  ['iron-man', 'starkindustries'],
]);

export function loadUsers(): UserAccount[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const storedUsers = JSON.parse(data);
      if (Array.isArray(storedUsers)) {
        let changed = false;
        const users = storedUsers.flatMap((stored: any): UserAccount[] => {
          const defaultPassword = DEFAULT_CREDENTIALS.get(String(stored.username).toLowerCase());
          if (typeof stored.password === 'string' && stored.password === defaultPassword) {
            changed = true;
            return [];
          }

          const passwordHash = typeof stored.passwordHash === 'string'
            ? stored.passwordHash
            : typeof stored.password === 'string'
              ? hashPassword(stored.password)
              : '';
          if (!stored.passwordHash || stored.password !== undefined || stored.resetToken !== undefined || stored.resetTokenExpiry !== undefined) {
            changed = true;
          }
          const { password: _password, resetToken: _resetToken, resetTokenExpiry: _resetTokenExpiry, ...account } = stored;
          return [{
            ...account,
            username: String(stored.username || ''),
            email: stored.email || `${stored.username}@marvel.com`,
            passwordHash,
            disabled: !!stored.disabled,
          }];
        });
        if (changed) saveUsers(users);
        return users;
      }
    }
  } catch (e) {
    console.error('Error loading users.json:', e);
  }

  return [];
}

export function saveUsers(users: UserAccount[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), { encoding: 'utf-8', mode: 0o600 });
    fs.chmodSync(USERS_FILE, 0o600);
  } catch (e) {
    console.error('Error saving users.json:', e);
  }
}

export function findUser(usernameOrEmail: string): UserAccount | undefined {
  const users = loadUsers();
  const query = usernameOrEmail.toLowerCase().trim();
  return users.find(u => u.username.toLowerCase() === query || u.email.toLowerCase() === query);
}

function validateRole(role: string) {
  if (!['admin', 'narrator', 'player'].includes(role)) throw new Error('Invalid user role.');
}

export function createUser(username: string, email: string, password: string, role: UserRole = 'player'): UserAccount {
  validateRole(role);
  validatePassword(password);
  const users = loadUsers();
  const existing = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
  const newUser: UserAccount = {
    username: username.trim(),
    email: email.trim(),
    passwordHash: hashPassword(password),
    role,
    createdAt: new Date().toISOString(),
    disabled: false,
  };
  if (existing >= 0) {
    users[existing] = { ...users[existing], ...newUser, disabled: users[existing].disabled };
  } else {
    users.push(newUser);
  }
  saveUsers(users);
  return newUser;
}

export function deleteUser(username: string): boolean {
  let users = loadUsers();
  const initialLen = users.length;
  users = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
  if (users.length < initialLen) {
    saveUsers(users);
    return true;
  }
  return false;
}

export function updatePassword(usernameOrEmail: string, newPassword: string): boolean {
  validatePassword(newPassword);
  const users = loadUsers();
  const query = usernameOrEmail.toLowerCase().trim();
  const user = users.find(u => u.username.toLowerCase() === query || u.email.toLowerCase() === query);
  if (user) {
    if (user.disabled) return false;
    user.passwordHash = hashPassword(newPassword);
    saveUsers(users);
    return true;
  }
  return false;
}

export function updateUser(username: string, updates: { email?: string; role?: UserRole; password?: string; disabled?: boolean }): boolean {
  if (updates.role !== undefined) validateRole(updates.role);
  if (updates.password !== undefined && updates.password.trim() !== '') validatePassword(updates.password);
  const users = loadUsers();
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return false;
  if (updates.email !== undefined) user.email = updates.email.trim();
  if (updates.role !== undefined) user.role = updates.role;
  if (updates.disabled !== undefined) user.disabled = updates.disabled;
  if (updates.password !== undefined && updates.password.trim() !== '') {
    user.passwordHash = hashPassword(updates.password);
  }
  saveUsers(users);
  return true;
}

export function passwordMatches(password: string, user?: UserAccount): boolean {
  return verifyPassword(password, user?.passwordHash || DUMMY_PASSWORD_HASH) && !!user;
}
