export function professionFrom(type: string, name?: string): string {
  const t = (type || "").toLowerCase();
  const n = (name || "").toLowerCase();

  const tests: Array<[RegExp, string]> = [
    [/formule.*enchant/i, "Enchantement"],
    [/dessin.*joaill/i, "Joaillerie"],
    [/patron.*coutur/i, "Couture"],
    [/\bplans?\b|plan\s|plans? de/i, "Forge"],
    [/(schéma|schema).*ingénier|ingenier/i, "Ingénierie"],
    [/travail du cuir|patron.*travail du cuir|armures? en cuir/i, "Travail du cuir"],
    [/recette.*alch|\balchim/i, "Alchimie"],
    [/(technique|glyphe|calligrap)/i, "Calligraphie"],
    [/cuisine|recette.*cuis/i, "Cuisine"],
    [/secourisme|bandage/i, "Secourisme"],
    [/pêche|canne à pêche/i, "Pêche"],
  ];

  for (const [rx, prof] of tests) {
    if (rx.test(t) || rx.test(n)) return prof;
  }
  return "Autres";
}
