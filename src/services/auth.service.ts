import crypto from 'crypto';

/**
 * Service d'authentification.
 */

export interface User {
  username: string;
  passwordHash: string;
  salt: string;
}

const users: User[] = [];

export function hashPassword(password: string, salt: string): string {
  return crypto.createHash('sha256').update(password + salt).digest('hex');
}

export function registerUser(username: string, password: string): User {
  const salt = crypto.randomBytes(8).toString('hex');
  const passwordHash = hashPassword(password, salt);
  const user: User = { username, passwordHash, salt };
  users.push(user);
  return user;
}

export function login(username: string, password: string): User {
  const user = users.find((u) => u.username === username);
  if (!user) {
    throw new Error(`Utilisateur inconnu: ${username}`);
  }

  const candidateHash = hashPassword(password, user.salt);

  if (candidateHash !== user.passwordHash) {
    throw new Error('Mot de passe incorrect');
  }
  return user;
}

export function resetUsers(): void {
  users.length = 0;
}
