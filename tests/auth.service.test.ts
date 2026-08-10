import crypto from 'crypto';
import { hashPassword, registerUser, login, resetUsers } from '../src/services/auth.service';

describe('auth.service - caractérisation avant modification', () => {
  beforeEach(() => {
    resetUsers();
  });

  describe('hashPassword', () => {
    it('concatène le mot de passe et le salt puis hache en SHA-256 (hex)', () => {
      const expected = crypto.createHash('sha256').update('secret' + 'abc123').digest('hex');
      expect(hashPassword('secret', 'abc123')).toBe(expected);
    });

    it('est déterministe pour un même couple mot de passe/salt', () => {
      expect(hashPassword('secret', 'abc123')).toBe(hashPassword('secret', 'abc123'));
    });

    it('produit un hash différent si le salt change (toutes choses égales par ailleurs)', () => {
      expect(hashPassword('secret', 'abc123')).not.toBe(hashPassword('secret', 'xyz789'));
    });
  });

  describe('registerUser', () => {
    it('crée un utilisateur avec un salt hexadécimal de 16 caractères (8 octets)', () => {
      const user = registerUser('alice', 'motdepasse');
      expect(user.username).toBe('alice');
      expect(user.salt).toMatch(/^[0-9a-f]{16}$/);
    });

    it('stocke un passwordHash cohérent avec hashPassword(password, salt)', () => {
      const user = registerUser('alice', 'motdepasse');
      expect(user.passwordHash).toBe(hashPassword('motdepasse', user.salt));
    });

    // bug connu #1 de la carte des bugs (README.md) — ne pas corriger ici :
    // chaque appel à registerUser régénère un salt aléatoire, y compris pour un
    // nom d'utilisateur déjà enregistré. Il n'y a aucune vérification d'unicité :
    // deux entrées distinctes coexistent dans le tableau `users` pour le même
    // username, avec des salts (et donc des hash) différents.
    it("régénère un salt différent à chaque enregistrement, même pour le même utilisateur et le même mot de passe", () => {
      const first = registerUser('bob', 'motdepasse');
      const second = registerUser('bob', 'motdepasse');
      expect(first.salt).not.toBe(second.salt);
      expect(first.passwordHash).not.toBe(second.passwordHash);
    });

    // bug connu #1 (suite) : registerUser n'empêche pas les doublons de username,
    // et login() utilise Array.find, qui ne retient que la PREMIÈRE entrée
    // correspondante. Un ré-enregistrement ultérieur avec un nouveau mot de passe
    // est donc invisible pour login().
    it("login() n'authentifie qu'avec les identifiants du PREMIER enregistrement en cas de doublon de username", () => {
      registerUser('carol', 'ancien-mdp');
      registerUser('carol', 'nouveau-mdp');

      expect(login('carol', 'ancien-mdp').username).toBe('carol');
      expect(() => login('carol', 'nouveau-mdp')).toThrow('Mot de passe incorrect');
    });
  });

  describe('login', () => {
    it('renvoie l\'utilisateur quand le mot de passe est correct', () => {
      registerUser('alice', 'motdepasse');
      const user = login('alice', 'motdepasse');
      expect(user.username).toBe('alice');
    });

    it('lève une erreur explicite pour un utilisateur inconnu', () => {
      expect(() => login('inconnu', 'peu-importe')).toThrow('Utilisateur inconnu: inconnu');
    });

    it('lève une erreur générique pour un mot de passe incorrect', () => {
      registerUser('alice', 'motdepasse');
      expect(() => login('alice', 'mauvais-mdp')).toThrow('Mot de passe incorrect');
    });
  });

  describe('resetUsers', () => {
    it('vide la liste des utilisateurs enregistrés', () => {
      registerUser('alice', 'motdepasse');
      resetUsers();
      expect(() => login('alice', 'motdepasse')).toThrow('Utilisateur inconnu: alice');
    });
  });
});
