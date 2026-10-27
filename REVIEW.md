# EnergoMapa ČR · kompletní balík pro review

Verze 0.2.0, připraveno 27. 10. 2026. [Veřejná aplikace](https://hphugosm.github.io/energomapa-cr/?metric=solar_capacity) · [repozitář](https://github.com/hphugosm/energomapa-cr).

## Co se změnilo

Demo `solar_capacity` nahradil skutečný snímek výroben ERÚ k 1. 10. 2026. Metrika se jmenuje **Licencované FVE – přiřazený výkon**. Obsahuje 4 484 pozitivních obecních hodnot a 1 774 chybějících; neobsahuje domyšlené nuly ani historickou řadu. Baterie a dobíjení zůstávají označenými demo metrikami.

**Podstatné omezení:** registr licencí nepokrývá všechny malé nelicencované FVE. 64 provozoven (152,20803 MW) nemá jednoznačné obecní přiřazení; dalších 267,95211 MW je zadrženo v dotčených obcích. Veřejné krajské a celostátní součty jsou označené jako neúplné. Úplný součet způsobilých řádků registru činí 3 563,06469 MW, publikovaný obecní součet 3 142,90455 MW. Tyto dva údaje se nesmějí zaměnit.

## Kde začít kontrolu

- `docs/solar-methodology.md`: primární zdroje, definice výkonu, platnost licence, přesné propojení katastru a obce, nejistota a bilance.
- `pipeline/solar.py`: klasifikace jednotlivých solárních zdrojů, desetinné součty, duplicity, datum snímku a konzervativní alokace.
- `data/raw/solar/`: úplné připnuté zdroje ERÚ a ČÚZK. `data/sources/solar_capacity.json` a `checksums.json`: URL, SHA-256, čas a metodika.
- `data/processed/solar-validation.json`: počty, výkonové bilance a důvody nepřiřazení. `public/data/`: skutečně načítané výstupy.
- `public/js/app.mjs`: generické zobrazení rozsahu a omezení z metadat. `engine.mjs`: poměry součtů i při známé nulové dílčí populaci.
- `tests/test_solar.py`: 10 syntetických regresních testů adaptéru. `tests/*.test.mjs`: 27 testů enginu a bodového modelu.
- `.github/workflows/pages.yml`: offline datový build, oba testovací běhy, balení a GitHub Pages deployment.
- `review/`: přehled commitu, změnový patch bez objemných dat, výpisy kontrol a případně snímek a potvrzení deploymentu. `MANIFEST.sha256`: kontrolní součty všech souborů v ZIPu.

## Spuštění a reprodukce

Rychlá kontrola hotového webu: `python3 -m http.server 4187 --directory public`, potom otevřít `http://localhost:4187/?metric=solar_capacity`.

Pro reprodukci dat vytvořte Python prostředí, instalujte `requirements.txt`, spusťte `python pipeline/build.py`, `python -m unittest discover -s tests -p 'test_*.py'`, `npm test` a `python pipeline/package.py`. Node.js nemá runtime npm závislosti. Vstupní data jsou přibalená a běžný build nevyžaduje síť.

ZIP zahrnuje celý projekt, raw podklady, veřejný web, metodiku, testy a konfiguraci CI. Neobsahuje pracovní Git databázi, virtuální prostředí, závislosti ani nesouvisející referenční clone TT-Decin.
