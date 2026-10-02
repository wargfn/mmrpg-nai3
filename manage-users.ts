import { loadUsers, createUser, deleteUser, updatePassword } from './src/core/users.ts';

const args = process.argv.slice(2);
const command = args[0];

function printHelp() {
  console.log(`
=== MARVEL MULTIVERSE USER & ACCOUNT MANAGER (CLI) ===

Usage:
  npx tsx manage-users.ts <command> [arguments...]

Commands:
  list                                    List all registered user accounts (username, email, role, creation date).
  add <username> <email> <password> [role] Create or update a user account. [role] can be 'admin' or 'player' (default: player).
  remove <username>                       Delete a user account by username.
  reset <username-or-email> <new-password> Set or reset the password for a specific user account by username or email.
  help                                    Display this help message and command guide.

Examples:
  npx tsx manage-users.ts list
  npx tsx manage-users.ts add thor thor@marvel.com mjolnir616 player
  npx tsx manage-users.ts reset thor newPassword123
  npx tsx manage-users.ts remove thor
  npx tsx manage-users.ts help
`);
}

if (!command || command === 'help' || command === '-h' || command === '--help') {
  printHelp();
} else if (command === 'list') {
  const users = loadUsers();
  console.log(`=== REGISTERED USERS (${users.length}) ===`);
  users.forEach((u, i) => {
    console.log(`  [${i + 1}] Username: ${u.username} | Email: ${u.email} | Role: ${u.role} | Created: ${u.createdAt}`);
  });
} else if (command === 'add') {
  const username = args[1];
  const email = args[2];
  const password = args[3];
  const role = (args[4] === 'admin' ? 'admin' : 'player') as ('admin' | 'player');
  if (!username || !email || !password) {
    console.error('Error: Missing required arguments for "add".');
    printHelp();
    process.exit(1);
  }
  createUser(username, email, password, role);
  console.log(`Successfully created/updated user '${username}' (${email}) with role '${role}'.`);
} else if (command === 'remove' || command === 'delete') {
  const username = args[1];
  if (!username) {
    console.error('Error: Missing username for "remove".');
    printHelp();
    process.exit(1);
  }
  const success = deleteUser(username);
  if (success) {
    console.log(`Successfully deleted user '${username}'.`);
  } else {
    console.log(`User '${username}' not found.`);
  }
} else if (command === 'reset' || command === 'password' || command === 'set-password') {
  const identifier = args[1];
  const newPassword = args[2];
  if (!identifier || !newPassword) {
    console.error('Error: Missing username/email or new password for "reset".');
    printHelp();
    process.exit(1);
  }
  const success = updatePassword(identifier, newPassword);
  if (success) {
    console.log(`Successfully set new password for user/email '${identifier}'.`);
  } else {
    console.log(`User or email '${identifier}' not found.`);
  }
} else {
  console.error(`Error: Unknown command '${command}'.`);
  printHelp();
  process.exit(1);
}
