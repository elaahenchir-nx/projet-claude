import { extractVariables, generate, TemplateContext } from '../src/services/template.service';

/**
 * Caractérisation avant modification de template.service.ts (moteur de
 * templates, cœur métier de TextGen Hub — voir CLAUDE.md). Ce fichier n'est
 * pas mentionné dans la carte des bugs du README : les comportements
 * capturés ici ne sont pas des bugs connus, seulement des observations sur
 * le comportement réel, signalées quand elles surprennent.
 */

describe('extractVariables', () => {
  it('extrait une variable unique', () => {
    expect(extractVariables('Bonjour {{prenom}}')).toEqual(['prenom']);
  });

  it('extrait plusieurs variables distinctes, dans leur ordre de première apparition', () => {
    expect(extractVariables('{{b}} puis {{a}} puis {{c}}')).toEqual(['b', 'a', 'c']);
  });

  it('déduplique une variable répétée (une seule occurrence dans le résultat)', () => {
    expect(extractVariables('{{a}} {{b}} {{a}}')).toEqual(['a', 'b']);
  });

  it("renvoie un tableau vide quand le template ne contient aucune variable", () => {
    expect(extractVariables('Texte sans variable.')).toEqual([]);
  });

  it('tolère des espaces à l\'intérieur des accolades', () => {
    expect(extractVariables('{{  prenom  }}')).toEqual(['prenom']);
  });

  it('accepte un nom de variable purement numérique', () => {
    expect(extractVariables('{{123}}')).toEqual(['123']);
  });

  it("n'extrait rien pour un nom de variable contenant un caractère hors [a-zA-Z0-9_] (ex: tiret) — comportement observé, pas un bug connu", () => {
    // Le motif {{ prenom-nom }} ne matche pas du tout : ni remplacé, ni signalé comme manquant.
    expect(extractVariables('{{prenom-nom}}')).toEqual([]);
  });

  it('ignore les accolades vides (nom de variable requis, au moins 1 caractère)', () => {
    expect(extractVariables('{{}}')).toEqual([]);
  });

  it('appelée deux fois de suite sur le même template renvoie le même résultat (pas de fuite d\'état entre appels)', () => {
    const template = '{{a}} {{b}}';
    expect(extractVariables(template)).toEqual(extractVariables(template));
  });
});

describe('generate', () => {
  function ctx(overrides: TemplateContext = {}): TemplateContext {
    return overrides;
  }

  it('remplace une variable présente par sa valeur', () => {
    const result = generate('Bonjour {{prenom}}', ctx({ prenom: 'Alice' }));
    expect(result).toEqual({ text: 'Bonjour Alice', missingVariables: [] });
  });

  it('convertit une valeur numérique du contexte en chaîne', () => {
    const result = generate('Total: {{montant}} €', ctx({ montant: 42 }));
    expect(result).toEqual({ text: 'Total: 42 €', missingVariables: [] });
  });

  it('remplace correctement une valeur falsy (0) — la présence est testée avec `in`, pas la véracité', () => {
    const result = generate('{{n}}', ctx({ n: 0 }));
    expect(result).toEqual({ text: '0', missingVariables: [] });
  });

  it("laisse `{{variable}}` littéral dans le texte et la signale dans missingVariables quand elle est absente du contexte", () => {
    const result = generate('Bonjour {{prenom}}', ctx({}));
    expect(result).toEqual({ text: 'Bonjour {{prenom}}', missingVariables: ['prenom'] });
  });

  it("normalise les espaces d'une variable manquante : `{{ prenom }}` (avec espaces) devient `{{prenom}}` (sans espaces) dans la sortie — comportement observé, pas un bug connu", () => {
    const result = generate('Bonjour {{ prenom }}', ctx({}));
    expect(result).toEqual({ text: 'Bonjour {{prenom}}', missingVariables: ['prenom'] });
  });

  it("répète une variable manquante autant de fois qu'elle apparaît dans missingVariables (pas de déduplication, contrairement à extractVariables) — comportement observé, pas un bug connu", () => {
    const result = generate('{{a}} et encore {{a}}', ctx({}));
    expect(result).toEqual({ text: '{{a}} et encore {{a}}', missingVariables: ['a', 'a'] });
  });

  it('mélange variables présentes et manquantes dans le même template', () => {
    const result = generate('{{prenom}} doit {{montant}} € (réf {{ref}})', ctx({ prenom: 'Bob', montant: 10 }));
    expect(result).toEqual({
      text: 'Bob doit 10 € (réf {{ref}})',
      missingVariables: ['ref'],
    });
  });

  it('renvoie le template inchangé et aucune variable manquante quand il ne contient aucune variable', () => {
    const result = generate('Texte fixe, sans variable.', ctx({ inutile: 'jamais lu' }));
    expect(result).toEqual({ text: 'Texte fixe, sans variable.', missingVariables: [] });
  });

  it('remplace une valeur de contexte vide ("") par une chaîne vide, sans la considérer comme manquante', () => {
    const result = generate('[{{note}}]', ctx({ note: '' }));
    expect(result).toEqual({ text: '[]', missingVariables: [] });
  });

  it('insère une valeur de contexte contenant des motifs de remplacement spéciaux ($&, $1) de façon littérale — String.replace() avec une fonction de callback ne les interprète pas', () => {
    const result = generate('{{note}}', ctx({ note: 'Remise: $& sur $1' }));
    expect(result).toEqual({ text: 'Remise: $& sur $1', missingVariables: [] });
  });
});
