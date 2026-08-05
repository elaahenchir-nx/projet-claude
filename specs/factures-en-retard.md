# Feature : Tests d'intégration pour l'endpoint des factures en retard

## Contexte métier

L'endpoint `GET /api/invoices/overdue` a été ajouté au commit `b427da9` dans `src/app.ts` : il filtre un tableau de factures (actuellement mocké en dur dans la route) sur celles dont le statut n'est ni `paid` ni `cancelled` et dont `dueDate` est dépassée, en réutilisant `isOverdue()` de `src/services/invoice.service.ts`, puis ajoute le montant TTC de chaque facture via `calculateTTC()`.

Cet endpoint existe et fonctionne, mais **aucun test ne le couvre**. Le besoin ici est de combler ce manque par un test d'intégration HTTP sur la route elle-même — pas de recréer l'endpoint, qui existe déjà.

Point d'attention : `src/services/invoice.service.ts` porte le défaut **#7** de la carte du `README.md` (« Couverture de tests quasi nulle hors `calculateTTC` »), explicitement réservé au module « Revue de code & tests ». Le commentaire dans `tests/invoice.service.test.ts` le confirme :
> « Volontairement absent : tests pour isOverdue, applyLatePenalty, canBeCancelled, nextStatus -> couverture initiale < 20% (objectif du module de revue de code & tests dédié). »

Cette fonctionnalité teste la route `/api/invoices/overdue` de bout en bout (ce qui exerce `isOverdue`/`calculateTTC` indirectement) mais n'ajoute **pas** de tests unitaires directs pour `isOverdue`, `applyLatePenalty`, `canBeCancelled` ou `nextStatus` — ce périmètre reste celui du défaut #7, à traiter dans le module dédié.

## Comportement attendu (Given / When / Then)

- **Given** le serveur Express démarré (via `createApp()`, jamais `server.ts`)
  **When** on appelle `GET /api/invoices/overdue`
  **Then** la réponse a le statut `200` et le content-type `application/json`.

- **Given** les trois factures mock codées en dur dans la route (`INV-001` statut `sent` échue au 2026-06-01, `INV-002` statut `paid` échue au 2026-05-01, `INV-003` statut `draft` échue au 2026-07-01) et une date du jour postérieure à ces échéances
  **When** on appelle `GET /api/invoices/overdue`
  **Then** la réponse contient exactement `INV-001` et `INV-003` (en retard), et exclut `INV-002` (payée, donc jamais « en retard » quelle que soit sa date d'échéance).

- **Given** une facture retournée par l'endpoint
  **When** on inspecte l'objet JSON correspondant
  **Then** il contient tous les champs de la facture d'origine (`id`, `amountHT`, `vatRate`, `status`, `dueDate`) **plus** un champ `ttc` égal à `amountHT * (1 + vatRate)` arrondi à 2 décimales.

- **Given** la liste des factures en retard renvoyée
  **When** on compte les éléments du tableau `invoices`
  **Then** le nombre correspond exactement au nombre de factures mock dont le statut n'est pas `paid`/`cancelled` et dont `dueDate` est passée (ni plus, ni moins — aucune facture payée ou future incluse).

## Contraintes techniques (stack, perfs, compat)

- Aucune nouvelle dépendance npm : `supertest` n'est pas installé et CLAUDE.md interdit d'ajouter une dépendance sans nécessité (arbre minimal = dispositif pédagogique).
- Le test démarre l'app sur un port éphémère via `http.createServer(createApp()).listen(0)` et interroge la route avec `fetch` natif (disponible globalement en Node 18+), sans bibliothèque tierce.
- Fichier de test placé sous `tests/` (respecte `roots: ['<rootDir>/tests']` et `testMatch: ['**/*.test.ts']` de `jest.config.js`) — un test à côté de `src/` serait silencieusement ignoré par Jest.
- Import de `createApp` depuis `../src/app`, jamais depuis `src/server.ts` (qui ouvre un listener et est exclu de la couverture).
- Style cohérent avec `tests/invoice.service.test.ts` : `describe`/`it` en français, assertions `expect(...).toBe(...)`/`toEqual(...)` simples, pas de mocks additionnels.
- Ne pas modifier `src/services/invoice.service.ts` ni `src/app.ts` : la route et le service existants ne sont pas touchés, seul un test est ajouté.

## Hors périmètre

- Tests unitaires directs de `isOverdue`, `applyLatePenalty`, `canBeCancelled`, `nextStatus` dans `invoice.service.ts` : défaut #7 de la carte du README, réservé au module « Revue de code & tests ».
- Remplacement des données mock en dur de la route par une vraie source de données (DB ou service partagé) : non demandé, hors périmètre de cette fonctionnalité.
- Ajout de `supertest` ou de toute autre dépendance de test HTTP.
- Modification du comportement de la route `/api/invoices/overdue` ou de `isOverdue`/`calculateTTC`.

## Critères d'acceptation (checklist testable)

- [ ] `GET /api/invoices/overdue` répond `200` avec un content-type JSON.
- [ ] La réponse inclut `INV-001` et `INV-003`, exclut `INV-002`.
- [ ] Chaque facture retournée porte un champ `ttc` correct en plus des champs d'origine.
- [ ] Le nombre de factures retournées correspond exactement au nombre de factures en retard attendu.
- [ ] Le serveur de test est proprement fermé après la suite (`afterAll` / `server.close()`), sans handle ouvert qui bloquerait Jest.
- [ ] `npx jest tests/invoices.route.test.ts` passe seul.
- [ ] `npm test` passe sans régression sur la suite complète.

## Fichiers concernés

- `tests/invoices.route.test.ts` (nouveau) — suite Jest d'intégration HTTP pour la route `GET /api/invoices/overdue`, démarrant l'app via `http.createServer(createApp())` sur un port éphémère et interrogeant la route via `fetch` natif.
- Aucun autre fichier modifié : `src/app.ts` et `src/services/invoice.service.ts` restent inchangés.
