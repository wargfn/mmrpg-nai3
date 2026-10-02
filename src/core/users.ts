import fs from 'fs';
import path from 'path';

export interface UserAccount {
  username: string;
  email: string;
  password: string;
  role: 'admin' | 'player';
  createdAt: string;
  resetToken?: string;
  resetTokenExpiry?: number;
}

const USERS_FILE = path.resolve('users.json');

export function loadUsers(): UserAccount[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      const users = JSON.parse(data);
      if (Array.isArray(users) && users.length > 0) {
        return users.map((u: any) => ({
          ...u,
          email: u.email || `${u.username}@marvel.com`,
        }));
      }
    }
  } catch (e) {
    console.error('Error loading users.json:', e);
  }

  // Default initial users
  const defaultUsers: UserAccount[] = [
    { username: 'admin', email: 'admin@marvel.com', password: 'adminpassword123', role: 'admin', createdAt: new Date().toISOString() },
    { username: 'spider-man', email: 'spiderman@marvel.com', password: 'marvel616', role: 'player', createdAt: new Date().toISOString() },
    { username: 'iron-man', email: 'ironman@stark.com', password: 'starkindustries', role: 'player', createdAt: new Date().toISOString() },
  ];
  saveUsers(defaultUsers);
  return defaultUsers;
}

export function saveUsers(users: UserAccount[]) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (e) {
    console.error('Error saving users.json:', e);
  }
}

export function findUser(usernameOrEmail: string): UserAccount | undefined {
  const users = loadUsers();
  const query = usernameOrEmail.toLowerCase().trim();
  return users.find(u => u.username.toLowerCase() === query || u.email.toLowerCase() === query);
}

export function createUser(username: string, email: string, password: string, role: 'admin' | 'player' = 'player'): UserAccount {
  const users = loadUsers();
  const existing = users.findIndex(u => u.username.toLowerCase() === username.toLowerCase());
  const newUser: UserAccount = {
    username: username.trim(),
    email: email.trim(),
    password: password,
    role,
    createdAt: new Date().toISOString(),
  };
  if (existing >= 0) {
    users[existing] = newUser;
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
  const users = loadUsers();
  const query = usernameOrEmail.toLowerCase().trim();
  const user = users.find(u => u.username.toLowerCase() === query || u.email.toLowerCase() === query);
  if (user) {
    user.password = newPassword;
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    saveUsers(users);
    return true;
  }
  return false;
}

export function generateResetToken(usernameOrEmail: string): { token: string; email: string; username: string } | null {
  const users = loadUsers();
  const query = usernameOrEmail.toLowerCase().trim();
  const user = users.find(u => u.username.toLowerCase() === query || u.email.toLowerCase() === query);
  if (!user) return null;

  // Generate temporary reset token
  const token = Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2, 8);
  user.resetToken = token;
  user.resetTokenExpiry = Date.now() + 15 * 60 * 1000; // 15 mins
  saveUsers(users);

  return { token, email: user.email, username: user.username };
}

export function resetPasswordWithToken(token: string, newPassword: string): boolean {
  const users = loadUsers();
  const user = users.find(u => u.resetToken === token);
  if (!user) return false;

  if (user.resetTokenExpiry && Date.now() > user.resetTokenExpiry) {
    return false; // Expired
  }

  user.password = newPassword;
  user.resetToken = undefined;
  user.resetTokenExpiry = undefined;
  saveUsers(users);
  return true;
}
