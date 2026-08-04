# Feature : Rapport de synthèse (texte brut, réutilisable)

## Contexte métier

TextGen Hub a besoin d'une fonctionnalité transverse pour produire un **rapport de synthèse en texte brut** à partir d'une liste de lignes `{ label, amount }` (ventes, services, ou tout autre poste chiffré). Cette fonctionnalité doit être **réutilisable partout dans l'appli** — par n'importe quel service ou route existant(e) ou futur(e) — et pas seulement liée au sous-système de rapports actuel.

Le seul code proche existant est `src/legacy/LegacyRenderer.ts`, mais c'est une **God Class explicitement réservée au module de refactoring** (défaut #6 de la carte du `README.md`) : logique dupliquée, switch géant par type de rapport, couplage génération + formatage + envoi. Ce module ne doit ni être corrigé ni étendu ici. Le patron à suivre est plutôt celui de `src/services/template.service.ts` : une fonction pure, sans classe ni état, facilement importable depuis n'importe quel autre module TS du projet.

## Comportement attendu (Given / When / Then)

- **Given** une liste de lignes `[{ label: 'Ventes', amount: 1200.5 }, { label: 'Services', amount: 340.0 }]`
  **When** on génère la synthèse (titre par défaut)
  **Then** le texte produit est :
  ```
  === SYNTHÈSE ===
  Ventes: 1200.50 €
  Services: 340.00 €
  ---
  Nombre de lignes: 2
  Total: 1540.50 €
  Moyenne: 770.25 €
  ```

- **Given** une liste vide `[]`
  **When** on génère la synthèse
  **Then** le texte produit indique `Nombre de lignes: 0`, `Total: 0.00 €`, `Moyenne: 0.00 €`, sans lever d'exception.

- **Given** un titre personnalisé fourni en option (ex. `{ title: 'RAPPORT TEST' }`)
  **When** on génère la synthèse
  **Then** l'en-tête du texte est `=== RAPPORT TEST ===` au lieu de `=== SYNTHÈSE ===`.

- **Given** une requête `POST /api/synthesis` avec un corps JSON `{ lines: [...], title?: string }` valide
  **When** la requête est traitée
  **Then** la réponse a le content-type `text/plain` et contient le texte de synthèse généré par le service.

- **Given** une requête `POST /api/synthesis` avec un `lines` absent, non-tableau, ou contenant un élément dont `label` n'est pas une chaîne ou `amount` n'est pas un nombre
  **When** la requête est traitée
  **Then** la réponse est un `400` avec un corps JSON `{ error: '...' }` explicite, et aucune génération n'est tentée.

## Contraintes techniques (stack, perfs, compat)

- TypeScript strict (`strict: true`), pas de type implicite, cohérent avec le reste de `src/services/`.
- Fonction pure, sans effet de bord, sans dépendance à Express ni à `LegacyRenderer` — ne pas réutiliser ou étendre le type `ReportLine` de `LegacyRenderer` (couplage à éviter avec un module en attente de refactoring).
- Aucune nouvelle dépendance npm (le projet reste volontairement minimal : `express` + `better-sqlite3` en runtime).
- Formatage de sortie cohérent avec le style déjà utilisé ailleurs dans l'appli (`€`, montants via `.toFixed(2)`).
- Route HTTP mince : validation + délégation au service, sur le modèle de la route `POST /api/templates/render` déjà présente dans `src/app.ts`.
- Fichier du service sous `src/services/` (respecte `rootDir: "src"` et la correspondance avec `dist/`).
- Commentaires et messages en français, conformément à la convention du dépôt.

## Hors périmètre

- `src/legacy/LegacyRenderer.ts` et la route `GET /api/reports/:type` : défaut #6 (God Class), réservé au module refactoring — ne pas toucher.
- `src/services/report.service.ts` (défaut #2, fuseau horaire) : aucun lien avec cette fonctionnalité.
- Toute UI web (aucune page/composant de saisie de liste n'existe actuellement ; pas demandé ici).
- Export de fichier, copie presse-papier, ou toute autre forme de sortie que le texte brut renvoyé par la fonction/la route.
- Persistance du rapport généré (pas de sauvegarde en base).

## Critères d'acceptation (checklist testable)

- [ ] `generateSynthesis(lines, options?)` retourne le texte exact attendu pour une liste de plusieurs lignes (total et moyenne corrects, formatage `.toFixed(2)` + `€`).
- [ ] `generateSynthesis([])` ne lève pas d'exception et retourne `Nombre de lignes: 0`, `Total: 0.00 €`, `Moyenne: 0.00 €`.
- [ ] `generateSynthesis(lines, { title: '...' })` utilise le titre fourni dans l'en-tête `=== ... ===` au lieu de `SYNTHÈSE`.
- [ ] `POST /api/synthesis` avec un corps valide répond `200`, content-type `text/plain`, avec le texte généré par le service.
- [ ] `POST /api/synthesis` avec un corps invalide (`lines` manquant, non-tableau, ou éléments mal typés) répond `400` avec un message d'erreur explicite.
- [ ] `npm run build` compile sans erreur.
- [ ] `npm test` passe, y compris une nouvelle suite dédiée au service de synthèse.

## Fichiers concernés

- `src/services/synthesis.service.ts` (nouveau) — fonction pure `generateSynthesis(lines: SynthesisLine[], options?: SynthesisOptions): string`, types `SynthesisLine` et `SynthesisOptions`.
- `src/app.ts` — ajout de l'import du service et de la route `POST /api/synthesis` (handler mince : validation + délégation).
- `tests/synthesis.service.test.ts` (nouveau) — suite Jest couvrant les cas des critères d'acceptation ci-dessus.
