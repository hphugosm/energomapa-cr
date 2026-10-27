# EnergoMapa 0.5.0

Analytika nad stabilním datovým základem 0.4.0. Původní zdrojové metriky se nerozšiřují ani nepřepisují; nové funkce používají stejný generický engine a lazy cache.

Funkční analytická verze nad 22 ověřenými zdrojovými metrikami; čtyři deklarativní poměry nevytvářejí nová zdrojová měření.

| Feature | Status | Notes |
|---|---|---|
| Nearest search | Ověřeno | Generic registry layer, haversine km, vlastní nejnovější rok, stabilní identity |
| Multi-layer filtr | Ověřeno | AND, porovnání, interval včetně hranic, přesné top/bottom X %, chybějící vyřazeny |
| Weighted location score | Ověřeno | Higher/lower/target, relativní 0–100, rozklad faktorů, TOP 10 |
| Coverage/confidence | Ověřeno | Dostupná váha / celková váha; není statistická jistota |
| Editovatelné presety | Ověřeno | FVE, baterie, dobíjení, teplárenství, průmysl; pouze konfigurace |
| Bodové vrstvy na mapě | Ověřeno | Zapínání vrstvy, clustering v prostoru obrazovky, tooltip a detail |
| Compare 2–3 území | Ověřeno | Vlastní nejnovější období a zdroj každé metriky |
| Derived metrics | Ověřeno | Omezené deklarativní poměry, lazy závislosti, přesně shodné pokrytí |
| Jednotný výsledkový panel | Ověřeno | Přechod na obec, faktorové hodnoty, výsledková tabulka |
| Export | Ověřeno | UTF-8 CSV, kopírovaný souhrn, prázdná chybějící hodnota |
| Režim pro snímek mapy | Ověřeno | Čistý pohled pro ruční screenshot |
| Isochrony | Ověřené statické MVP | 42 skutečných silničních polygonů pro 14 měst, 15/30/60 min; libovolný bod a 120 min přes vlastní volitelný Valhalla endpoint |
| Regrese 0.4.0 a statické Pages | Lokálně ověřeno; čeká CI | Původní mapa, profil, čas a lazy loading zachovány |

## Moduly

`public/js/analysis/nearest.mjs`, `filters.mjs`, `scoring.mjs`, `presets.mjs`, `derived.mjs`, `compare.mjs`, `clustering.mjs`, `export.mjs` a isochronový modul. UI je oddělené v `public/js/ui/`; renderer přijímá výsledky analýz, neprovádí jejich výpočty. Přesné vzorce a missing policy: [analytics.md](analytics.md). Routing a omezení: [isochrones.md](isochrones.md).

## Data a omezení

- Základ zůstává 22 reálných metrik a dvě stávající bodové vrstvy, bez nových zařízení: 3 790 řádků MPO, 1 100 historických záznamů provozovna × rok EEA (na mapě výchozích 64 provozoven za 2022). Odvozené metriky jsou výpočty, nikoli nová zdrojová měření.
- Nearest je vzdušná vzdálenost mezi skutečnými zdrojovými body, nikoli délka silniční trasy. Výchozí výběr používá poslední rok vrstvy, ne všechny historické záznamy najednou.
- Filtr vyřazuje obec s chybějícím kritériem. Scoring podporuje přísné vyřazení nebo přepočet podle dostupných vah; s druhou možností jsou vysoká skóre s nízkou úplností méně srovnatelná.
- Relativní skóre závisí na kandidátech, extrémech, vahách a metodice. Presety nejsou investiční ani technická doporučení.
- Úplnost kritérií není úplnost zdrojového registru: licencované výkony a hlášené průmyslové emise stále představují dílčí pokrytí.
- Každé kritérium a porovnávaná metrika má vlastní období. Model PVGIS není měřená výroba roku 2023; snapshoty nejsou umělou historií.
- Derived poměry vyžadují totožné územní pokrytí čitatele a metrického jmenovatele; jinak vracejí chybějící hodnotu.
- Aktuální scoring používá metriky; vzdálenostní nearest výsledek se automaticky nestává jeho kritériem. Nearest nyní nabízí dvě dostupné bodové vrstvy. Elektrárny a úložiště vyžadují doplnění ověřených souřadnic; body z centroidů nejsou vydávané za zařízení.
- Isochrony: 13 různých krajských sídel (Praha pokrývá dvě sídla) + Děčín, celkem 42 polygonů 15/30/60 minut. Veřejné demo odmítá 120 minut. Vlastní endpoint a lokální Docker jsou připravené adaptérem a dokumentací; vlastní server nebyl nasazen ani otestován v této iteraci. Další okresní města lze zpracovat batch nástrojem na vlastním serveru.

## Závěrečné ověření vydání

| Kontrola | Výsledek |
|---|---|
| JS tests | 85 / 85 prošlo |
| Python tests | 78 / 78 prošlo |
| Deterministic build | 105 identických offline datových výstupů |
| Browser smoke | Lokálně ověřeno: filtr 106 obcí, FVE preset 4 484 obcí, TOP clustery, detail bodu, ruční počátek, nulová nearest vzdálenost ke stejnému bodu, Praha/Brno/Ostrava s vlastními obdobími, CSV a kopírovaný souhrn, Děčín 30 min |
| Produkční data | 20 362 680 B dat; 20 537 258 B celý web / 91 souborů; ZIP 5 250 467 B |
| Commit | Pending – doplnit vytvořený commit |
| Branch | `main` – potvrdit při vydání |
| GitHub Pages deployment | Pending – potvrdit konkrétní publikovaný commit a běh Actions |
| Deployment URL | https://hphugosm.github.io/energomapa-cr/ – cílová adresa, zatím zde není potvrzená publikace 0.5.0 |
