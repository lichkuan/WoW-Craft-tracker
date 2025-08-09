# Enrichissement en lot (ITEM -> SPELL et SPELL -> ITEM)

## API
- `POST /api/enrich-batch`
  Body: `{ rows: [{ ID, Name, Source, Type, URL, SPELL_ID, SPELL_URL }, ...] }`
  Retourne `rows` complétés avec `SPELL_URL`/`SPELL_ID` (et `URL` si seul le sort était connu).

## Script CLI (local)
```
node scripts/enrich-imports.mjs input.csv output.csv
```
Lit `input.csv` (entêtes attendues: `ID,Name,Source,Type,URL,SPELL_ID,SPELL_URL`) et écrit `output.csv` enrichi.

Notes:
- Heuristiques basées sur les redirections Wowhead : `#teaches-recipe` (ITEM -> SPELL) et premier lien `item=` sur la page du sort (SPELL -> ITEM).
- Locale forcée : Mop Classic FR.
