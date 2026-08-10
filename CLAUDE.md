# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Nature du dépôt

TextGen Hub est un **dépôt pédagogique** pour la formation Claude Code (équipe technique NEoXam). C'est un petit service de génération de texte (rapports, factures, notifications) calqué sur un produit de type DataHub : un cœur TypeScript/Express épaulé par un module batch Java.

**Contrainte essentielle : ce dépôt contient des bugs et défauts de conception plantés volontairement, chacun réservé à un module précis de la formation. NE PAS corriger un bug connu sauf si la tâche en cours le vise explicitement.** Les bugs sont documentés dans les en-têtes de fichiers et dans la table « carte des bugs » du `README.md`. Si une modification passe à côté de l'un d'eux, le laisser en place et le signaler plutôt que de le corriger en silence. Les vrais bugs hors périmètre (absents de la carte) peuvent, eux, être corrigés — voir le dernier commit, qui a corrigé un vrai problème de `rootDir`.

Les commentaires de code, messages de commit et docs sont en **français** ; conserver cette langue lors des modifications.

## Commandes

Cœur TypeScript (racine du dépôt) :
```bash
npm install
npm run dev                          # serveur de dev (ts-node) sur http://localhost:3000
npm run build                        # tsc -> dist/
npm start                            # exécute le dist/server.js compilé
npm test                             # suite Jest (tests/)
npm run test:coverage                # Jest avec couverture
npx jest tests/invoice.service.test.ts   # un seul fichier de test
npx jest -t "calculateTTC"           # un seul test par son nom
npm run test:e2e                     # Playwright (démarre le serveur dev ; tests attendus dans ./e2e)
```

Module batch Java :
```bash
cd java-batch
mvn test                             # suite JUnit 5
mvn -Dtest=BatchReportServiceTest#methodName test   # un seul test
```

## Configuration

Quatre fichiers de configuration seulement, un par outil. Il n'y a **ni fichier de config applicative, ni `.env` versionné, ni framework de configuration** : tous les réglages du service sont des constantes dans le code.

### `package.json`
- CommonJS (pas de `"type": "module"`) — utiliser `require`/`import` transpilé, pas d'ESM natif.
- Dépendances runtime volontairement minimales : `express` 4.x et `better-sqlite3` 11.x. Tout le reste est en `devDependencies`. Ne pas ajouter de dépendance sans nécessité : la petitesse de l'arbre fait partie du dispositif pédagogique.
- `better-sqlite3` est un **module natif** : il se recompile à l'installation. Sur Windows il exige un toolchain C++ (Build Tools / `windows-build-tools`), et il faut relancer `npm install` (ou `npm rebuild better-sqlite3`) après tout changement de version majeure de Node.
- `npm start` n'exécute que `dist/server.js` : sans `npm run build` préalable, il échoue. `npm run dev` passe par `ts-node` et ne produit aucun artefact dans `dist/`.

### `tsconfig.json`
- Cible `ES2020` / module `commonjs`, `lib` réduite à `ES2020` — **pas de `"DOM"`** : aucun type navigateur n'est disponible côté `src/` (le front est du HTML statique dans `public/`, hors compilation).
- `strict: true` : les nouvelles fonctions doivent être typées explicitement, `null`/`undefined` compris.
- `rootDir: "src"` + `outDir: "dist"` : la structure de `src/` est reproduite à plat dans `dist/` (`src/services/x.ts` → `dist/services/x.js`). **Conséquence importante : tout fichier compilé doit vivre sous `src/`** — ajouter un `.ts` à la racine ou dans `tests/` à l'`include` casse la correspondance `dist/server.js` attendue par `npm start`. C'est précisément le bug corrigé au dernier commit ; ne pas le réintroduire.
- `include: ["src/**/*"]`, `exclude` couvre `node_modules`, `dist`, `e2e`, `tests` : les tests ne sont **jamais** compilés par `tsc`, ils ne passent que par `ts-jest`. Une erreur de type dans un test ne fait donc pas échouer `npm run build`.
- `sourceMap: true` (traces d'erreurs lisibles depuis `dist/`), `declaration: false` (pas de `.d.ts` : le module n'est pas consommé comme bibliothèque), `resolveJsonModule` et `esModuleInterop` activés.

### `jest.config.js`
- Preset `ts-jest`, `testEnvironment: 'node'` — pas de jsdom, aucun test de DOM possible en l'état.
- `roots: ['<rootDir>/tests']` et `testMatch: ['**/*.test.ts']` : Jest ne regarde **que** `tests/`. Un test placé à côté de sa source est silencieusement ignoré (il ne « échoue » pas, il n'existe pas).
- `collectCoverageFrom: ['src/**/*.ts', '!src/server.ts']` : `server.ts` est exclu parce qu'il ouvre un listener. **Aucun `coverageThreshold` n'est défini** — la couverture est informative, elle ne fait pas échouer la CI. Rapport écrit dans `coverage/`.
- Pas de `setupFiles` ni de `setupFilesAfterEnv` : c'est à chaque test d'appeler lui-même les resets (`resetUsers()` pour l'auth, `initDb()` pour la base). Ne pas supposer d'état propre entre deux fichiers de test.

### `playwright.config.ts`
- `testDir: './e2e'` — **ce dossier n'existe pas encore** dans le dépôt ; `npm run test:e2e` sort donc sans rien exécuter tant qu'aucun spec n'y est ajouté. Le module de formation dédié le crée.
- `webServer` lance `npm run dev` sur le port 3000 avec `reuseExistingServer: true` : si un serveur de dev tourne déjà, Playwright le réutilise au lieu d'en démarrer un — pratique, mais cela veut dire que les tests peuvent frapper un serveur au code obsolète. Démarrage limité à 20 s, chaque test à 30 s.
- `baseURL: 'http://localhost:3000'` (URLs relatives dans les specs), `screenshot: 'only-on-failure'` → captures dans `test-results/`.
- Aucun bloc `projects` : un seul navigateur, Chromium par défaut. Prévoir `npx playwright install` au premier lancement sur une machine neuve.

### Réglages en dur dans le code (pas de config externe)
- **Port** : `src/server.ts` lit `process.env.PORT` avec 3000 en repli. C'est la **seule** variable d'environnement du projet. `.env` est dans le `.gitignore` mais rien ne le charge (pas de `dotenv`) — l'y écrire n'aurait aucun effet.
- **Base** : `src/db.ts` fige `DB_PATH = path.join(__dirname, '..', 'data.db')`, non configurable. Le `'..'` résout vers la racine du dépôt aussi bien depuis `src/` (dev, ts-node) que depuis `dist/` (prod) — les deux modes partagent donc le même fichier.
- **Statiques** : `src/app.ts` sert `path.join(__dirname, '..', 'public')`, selon la même logique. `public/` n'est pas copié dans `dist/` au build : c'est voulu, il est servi depuis la racine dans les deux modes.
- **Timeouts SQLite** : passés en argument à `getConnection(timeoutMs)` sur chaque appel, jamais lus depuis une config. Voir la note ci-dessous sur `batchTransferService.ts`.

### Non versionné
`.gitignore` couvre `node_modules/`, `dist/`, `coverage/`, `playwright-report/`, `test-results/`, `data.db`, `*.log`, `.env`. `data.db` étant à la fois ignoré et recréé à chaque démarrage, il ne faut ni le committer ni s'appuyer sur son contenu.

### Java (`java-batch/pom.xml`)
Module Maven **totalement séparé** : rien dans la config TypeScript ne le connaît, et vice-versa. `com.neoxam.textgenhub:textgen-hub-batch:1.0.0`, packaging `jar`, source/target Java 17, encodage UTF-8. Une seule dépendance : `junit-jupiter` 5.10.2 en scope `test` — donc **aucune bibliothèque tierce en runtime**, ni Spring, ni Lombok, ni logger : rester en Java standard. Surefire 3.2.5 est épinglé explicitement pour que JUnit 5 soit bien détecté.

## Architecture

Deux modules indépendants, sans couplage à l'exécution :

- **Cœur TypeScript (`src/`)** — API Express. `server.ts` est le point d'entrée (appelle `initDb()`, puis `createApp()`, puis `listen`). `app.ts` construit l'app Express et câble toutes les routes ; il ne dépend pas directement de la base. Les handlers de route sont minces et délèguent aux `services/`. Dans les tests, importer `createApp()` (et non `server.ts`) — `server.ts` est exclu de la couverture et démarre un listener.
- **Batch Java (`java-batch/`)** — projet Maven autonome (Java 17, JUnit 5, sans framework). Package `com.neoxam.batch`. Agrégation/rendu par lot de lignes de rapport, contrepartie « tâche de fond » du cœur TS.

Détails qui s'étendent sur plusieurs fichiers :

- **La persistance est éphémère par conception.** `db.ts` supprime `data.db` et recrée le schéma (table `accounts` initialisée avec Alice/Bob) à chaque `initDb()`, c.-à-d. à chaque démarrage du serveur. Ne pas compter sur la survie des données entre deux redémarrages.
- **`getConnection(timeoutMs)`** ouvre une nouvelle connexion `better-sqlite3` à chaque appel. Le timeout court dans `batchTransferService.ts` est délibéré (rend un bug de verrou observable) — ce n'est pas un oubli.
- **L'état d'authentification est en mémoire.** `auth.service.ts` conserve un tableau `users` au niveau module (pas de base). Il exporte `resetUsers()` justement pour que les tests réinitialisent l'état entre chaque exécution.
- **Le moteur de templates** (`template.service.ts`) est la vraie fonctionnalité cœur : substitution `{{variable}}` renvoyant `{ text, missingVariables }`. Les variables manquantes sont laissées telles quelles (`{{nom}}` littéral) dans la sortie et signalées, sans lever d'exception.

## Organisation des tests

- Le `roots` de Jest est `tests/` et son `testMatch` est `**/*.test.ts` — placer les tests unitaires dans `tests/`, pas à côté des sources. `tsconfig.json` exclut `tests/` et `e2e/` du build.
- La couverture est collectée sur `src/**/*.ts` sauf `server.ts`.
- Playwright lit depuis `./e2e` et démarre lui-même le serveur dev (`reuseExistingServer: true`). À noter : le compte de démo (`demo`/`password123`) échoue par conception tant que le module dédié au bug d'auth n'est pas traité — les scénarios E2E qui en dépendent échoueront volontairement.
