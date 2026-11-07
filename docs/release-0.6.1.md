# Dokončení EnergoMapy 0.6.1 — R02–R05

Stav 7. 11. 2026; navazuje na [review 5806593379](https://github.com/hphugosm/energomapa-cr/pull/2#pullrequestreview-5806593379) commitu `ad15e5987c269939ef191218371cda0df3c9309f`. Opravy jsou ve stávající čisté větvi PR #2 `fix/audit-a01-a09-clean`. PR #1 nebyl měněn. Jde o implementaci a její regresní ověření, nikoli personálně nezávislé review.

| Připomínka | Oprava a konkrétní důkaz |
|---|---|
| R02 | Snapshot, state i runtime mají namespace z úplného `registration.scope`. Cleanup prochází pouze vlastní prefix a drží aktivní i předchozí úplnou generaci. Dvě registrace `/alpha/` a `/beta/` v jednom skutečném Chromium BrowserContext vracejí offline `2,2` a `10,10`; po třech dalších obnovách alpha `5,5` a beta stále `10,10`, včetně reloadu. HTTP 503 po zápisu nového prvního souboru i chybný hash ponechají oba staré soubory. V2 snapshot se při upgrade čte přes původní scope ukazatel; globální legacy cache se nemažou, protože je nelze bezpečně přisoudit jediné registraci. |
| R03 | Všech 20 Eurostat sad má `source.disclaimer`, `modifications` a atribuci s kódem a datem získání. Informace jsou viditelné v Databance i přeshraničním panelu a přítomné v katalogu, původních i výběrových CSV/JSON a kopiích v ZIP. Ověřeno skutečné stažení CZ 2010: **6 642 GWh → 6 642 000 MWh**. Quality flags se zachovávají a filtrují podle vybraných buněk; test zahrnuje skutečný příznak `p` EU27 2025 u tepla z OZE a prázdný výběr. |
| R04 | Oranžová `#bd6013` změněna na `#a34f0b`; ztmavena také zelená na `#207452`. Skutečné computed styles všech legend při vykreslení všech 43 sad se všemi řadami dávají minimálně **5,563 : 1**. Axe-core 4.14.0 kontroluje celý viditelný pracovní prostor plánovaných toků v normal/hover/focus/filtered stavu i na mobilu; žádné porušení color-contrast. Původní A09 kontroly karet zůstaly. |
| R05 | CLI `--import-dir` vyžaduje skutečné uživatelské XLSX mimo repozitář, zkontroluje všech 92 dnů a nikdy nevolá síť ani náhradní download. Přijaté názvy, postup a odlišný explicitní downloader jsou v [metodice OTE](ote-methodology.md). Test: 92 syntetických uživatelských souborů, síťové volání zakázané, soukromý build 2 208 hodin / 92 dnů; chybějící, duplicitní a chybný vstup odmítnut, starý manifest i soubory zachovány. Neznámé datum získání se nevymýšlí: `retrievedAt=null`, skutečný `importedAt` zvlášť. |

## Regrese A01–A09 a zachování dat

- **A01/A02:** katalog a ZIP bez OTE originálů i odvozených dat a bez omezeného DOCX. Ze 103 vyloučených blobů ve 14 commitech původního PR je v předcích HEAD i pracovním stromu dosažitelných **0**. Původní PR #1 není předkem nové větve. Odkaz/popisek/hash DOCX zůstaly.
- **A03/A04:** atomické cache, skutečné HTTP 503 a hash rollback, restart SW, čtení legacy snapshotu; soukromý OTE HTTP server se 92 syntetickými XLSX prokázal revidovaný první soubor ve stagingu před 503, všech 92 starých vstupů i manifest shodné, následný build funkční a další úspěšná obnova kompletní.
- **A05–A07:** kontrola všech CSV/JSON/ZIP, null, jednotek, provenance a flags; reálné UI exporty ročního 2010, 24 hodin × 3 hranice a MPO 2024 × 7 sloupců se skutečným period/coverage a zachovaným originalPeriod/originalCoverage.
- **A08/A09:** původní testy německého nettování, fyzických/plánovaných toků a denních integrálů zachovány; původní kontrast karet 6,10–6,79 : 1 dále prochází.
- **Kontinuita:** 43 veřejných sad, 71 005 řádků, 6 258 obcí a 22 dostupných metrik. Všech 68 původních datových souborů `main` mimo manifest a validační report je bajtově shodných (zahrnuje původních 41 mapových/územních/metrických/bodových souborů).

## Ověření

105 JS a 105 Python testů bez chyby. Úplný opakovaný offline build: **194 bajtově shodných výstupů**, balení **189 souborů** do `dist/`. Všech 19 skutečných Chromium scénářů prošlo: desktop, mobil 390×844, všech 43 sad, lazy-load obecní geometrie, offline příprava a studená navigace na `/` i `/energomapa-cr/`, offline mapa, export a přehrávání plánovaných toků, více scopes a přerušená obnova. Konzole bez JS chyb. [Strojové důkazy](release-evidence-0.6.1.json); GitHub Actions spouští stejné testy a ukládají browser artefakt. PR build neprovádí Pages deploy.

## Licence a podmínka zveřejnění

Uživatel výslovně potvrdil získané schválení/licenci a merge. Samotný dokument ČEPS/MPO se v dostupných podkladech nenašel a implementátor jej neověřil. Nevymýšlí se jeho znění, rozsah nebo URL. [Záznam oprávnění](data-permissions.md) rozlišuje toto potvrzení od vlastní kontroly dokumentu a explicitní následné potvrzení uživatele ze 7. 11. 2026, že oba souhlasy pokrývají veřejné raw, odvozené CSV/JSON a offline ZIP/cache. R01 je vyřešen na základě tohoto potvrzení; dokument nebyl implementátorem zkontrolován. Stav `user-confirmed`, přesný potvrzený rozsah a `licenseDocumentReviewed=false` se přenášejí do metadat ČEPS/MPO a všech jejich exportů. Ready/merge/deploy následují po úspěšném CI aktuálního commitu. OTE a omezený DOCX zůstávají mimo veřejnou větev.
