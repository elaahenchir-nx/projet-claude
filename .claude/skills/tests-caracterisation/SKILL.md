---
name: tests-caracterisation
description: Génère des tests de caractérisation (characterization tests) qui capturent le comportement RÉEL et actuel d'un fichier existant — bugs connus inclus — avant de le modifier ou de le refactorer. Utiliser ce skill dès que l'utilisateur demande de "sécuriser" du code avant modification, de générer des tests avant un refactoring, mentionne "characterization test"/"golden master", ou s'apprête à toucher à un fichier legacy sans filet de tests (ex. avant de refactorer LegacyRenderer, avant de modifier batchTransferService.ts, jobQueue.ts, report.service.ts, ou tout fichier Java sous java-batch). Se déclenche aussi implicitement quand l'utilisateur dit "je vais modifier X, peux-tu d'abord écrire des tests" ou "ajoute de la couverture avant que je touche à ça" — même sans le mot "caractérisation".
---

# Tests de caractérisation

## Objectif

Un test de caractérisation ne vérifie pas que le code fait ce qu'il *devrait* faire — il documente ce qu'il *fait réellement*, aujourd'hui, y compris ses bugs. Son seul but est de donner un filet de sécurité avant une modification : si après le refactoring un test casse, on saura immédiatement qu'un comportement a changé, intentionnellement ou pas.

Ce dépôt (`textgen-hub`) est un dépôt pédagogique qui contient des bugs plantés volontairement (voir la table « Carte des bugs » dans `README.md`), chacun réservé à un module de formation précis. **Ce skill ne corrige jamais un bug** — il écrit un test qui prouve que le comportement actuel (bogué ou pas) est bien celui observé, laisse le code de production intact, et signale explicitement tout bug connu rencontré.

## Étapes

### 1. Identifier la cible

Demander (ou déduire du contexte) : quel fichier / quelle fonction / quelle classe l'utilisateur va modifier ? Le périmètre du test doit correspondre exactement à ce qui va changer — ni plus large (temps perdu), ni plus étroit (trous dans le filet).

### 2. Lire le code actuel en entier, sans a priori

Lire l'implémentation cible ligne à ligne. Ne pas se contenter de deviner le comportement à partir du nom des fonctions : les bugs plantés dans ce dépôt sont précisément le genre de choses qu'on ne voit qu'en lisant le code (ex. un arrondi en `double` qui cumule des erreurs, un regroupement par jour sensible au fuseau horaire, une race condition sur une file async).

Vérifier aussi les dépendances directes (une fonction qui appelle `getConnection()`, `resetUsers()`, un service voisin) : leur comportement fait partie de ce qu'il faut caractériser si la cible en dépend.

### 3. Confronter au code, pas à la carte des bugs

Consulter la table « Carte des bugs et défauts intentionnels » du `README.md` pour savoir si le fichier ciblé est concerné. **Mais la carte peut être obsolète** — des bugs listés sont corrigés au fil de la formation (voir l'historique git : le God Class de `LegacyRenderer.ts` de la carte a déjà été résolu par les derniers commits). Donc :
- si la carte mentionne un bug pour ce fichier, vérifier dans le code actuel qu'il est encore présent avant d'en tenir compte ;
- si le comportement observé diverge de ce que décrit la carte (corrigé, ou différent de la description), se fier à ce qu'on observe réellement, pas à la table.

### 4. Écrire les tests en capturant la valeur réelle, pas une valeur supposée

Technique du golden master : pour chaque cas (nominal, limites, erreurs), écrire l'assertion à partir de ce que le code fait *vraiment* — en le traçant à la main si c'est simple, ou en exécutant un test provisoire pour lire la valeur produite si le calcul est trop complexe pour être sûr à l'œil (arrondis flottants, dates, concaténations). Ne jamais copier une valeur qu'on n'a pas confirmée : un test de caractérisation qui encode une valeur fausse ne protège de rien.

Quand un cas touche un bug connu et confirmé à l'étape 3, l'assertion documente quand même le comportement bogué (jamais le comportement souhaité), avec :
- un nom de test explicite en français, dans le style déjà utilisé dans ce dépôt (voir `tests/legacyRenderer.test.ts`, dont le describe s'intitule directement *"caractérisation avant refactoring"*) ;
- un commentaire au-dessus de l'assertion citant le numéro de la carte des bugs : `// bug connu #4 de la carte des bugs (README.md) — ne pas corriger ici`.

Cas particuliers à ce dépôt :
- **Non-déterminisme** (salt aléatoire dans `auth.service.ts`, timing dans `jobQueue.ts`, retries dans `batchTransferService.ts`) : ne pas figer une valeur qui varie d'une exécution à l'autre. Tester l'invariant stable (ex. le hash correspond bien au salt généré, peu importe sa valeur) plutôt qu'une sortie exacte impossible à reproduire.
- **Sensibilité au fuseau horaire / à la date courante** (`report.service.ts`) : injecter des dates explicites plutôt que `new Date()` sans argument, pour que le test soit reproductible et que le bug de regroupement reste observable de façon stable.
- **État partagé entre modules** : ce dépôt n'a pas de `setupFiles` Jest — chaque fichier de test gère lui-même ses resets (`resetUsers()` pour l'auth, `initDb()` pour la base). Toujours réinitialiser explicitement en `beforeEach`, ne jamais supposer un état propre laissé par un autre fichier.

### 5. Respecter les conventions du dépôt

- **TypeScript** : fichier dans `tests/`, nommé `<cible>.test.ts` (Jest ne regarde que `tests/`, `testMatch: **/*.test.ts` — un test posé ailleurs est silencieusement ignoré). Importer depuis `../src/...`. S'inspirer de `tests/invoice.service.test.ts` (style `it.each` pour les cas de statut/limite) et `tests/legacyRenderer.test.ts` (style caractérisation explicite).
- **Java** : fichier dans `java-batch/src/test/java/com/neoxam/batch/`, nommé `<Cible>Test.java`, JUnit 5 (`@Test`, `assertEquals`, `assertThrows`). S'inspirer de `java-batch/src/test/java/com/neoxam/batch/SynthesisServiceTest.java`.
- Ne jamais modifier le code de production (`src/`, `java-batch/src/main/`) dans le cadre de ce skill — uniquement ajouter des fichiers de test.

### 6. Exécuter et itérer jusqu'au vert

Lancer la suite ciblée :
- TS : `npx jest tests/<fichier>.test.ts`
- Java : `mvn -Dtest=<Classe>Test test` (depuis `java-batch/`)

Si une assertion échoue, ce n'est pas le code de production qui a tort : c'est l'assertion qui ne correspond pas au comportement réel observé. Corriger l'assertion pour qu'elle reflète la valeur produite par le run — jamais l'inverse, et jamais en modifiant `src/` ou `java-batch/src/main/` pour faire passer le test.

### 7. Vérifier la couverture avant de produire le résultat

Avant de livrer quoi que ce soit à l'utilisateur, lancer `npm test -- --coverage` (équivalent à `npm run test:coverage`) et relever la couverture du fichier ciblé avant/après. Ce n'est pas une formalité : ça confirme que les nouveaux tests exercent vraiment les branches attendues (pas seulement qu'ils passent), et ça donne les chiffres exacts à citer dans le rapport de l'étape 8. Pas d'équivalent outillé côté Java dans ce dépôt (aucun plugin de couverture dans `pom.xml`) — se contenter de `mvn test`.

### 8. Rapport de fin

Terminer par un résumé court :
- fichiers de test créés,
- comportements capturés (liste brève),
- bugs connus rencontrés et documentés (numéro de la carte + fichier),
- couverture avant/après du fichier ciblé (issue de l'étape 7),
- angles morts éventuels (ex. dépendance externe non testable en l'état, non-déterminisme non caractérisable autrement que par un invariant).
