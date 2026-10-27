# EnergoMapa Česka

Statický energetický atlas ČR: mapa ČR → kraje → obce, časový detail, porovnání území a manifestem řízené metriky. Frontend nemá npm runtime závislosti, CDN, API klíče ani serverovou databázi. Python připravuje data, prohlížeč počítá zobrazené agregace.

**Energetické hodnoty zatím nejsou produkční data.** Obyvatelstvo je skutečný zdroj ČSÚ, hranice skutečný ČÚZK/RÚIAN. FVE, baterie a dobíjení jsou výslovně syntetické demo šesti měst; ostatní nepřipojené metriky mají stav `unavailable`. Demo nevyjadřuje celkovou energetiku ČR. Chybějící data nejsou nuly.

## Lokální spuštění

Požadavky: Python 3.12, Node.js 22. Příkazy spouštějte z kořene tohoto samostatného projektu, kde leží `package.json`, `pipeline/` a `.github/`.

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python pipeline/build.py
npm test
python pipeline/package.py
python -m http.server 4173 --directory dist --bind 127.0.0.1
```

Otevřete `http://127.0.0.1:4173/`. `npm run serve` podává přímo pracovní `public/`. Neotvírejte `index.html` přes `file://`; ES moduly a JSON potřebují HTTP. Není nutné `npm install`. `npm run build` provede datový build a balení; testy spouštějte zvlášť před publikací.

## Data a reprodukovatelnost

`data/raw/` obsahuje uložené vstupy: číselník území ČSÚ, obyvatelstvo 2018–2025, komprimované GML hranice a malé oddělené demo fixtures. `data/sources/` popisuje zdroje. Výchozí build je offline, deterministický a nemění raw vstupy. `python pipeline/build.py --download` výslovně obnoví hranice, číselník a populační výřez REGUAP a připne nové vstupní hashe. Budoucí změny formátu či pokrytí zdroje mohou vyžadovat úpravu adaptéru; kontroly takový build zastaví.

`pipeline/build.py` čte XLSX/CSV/GML, propojuje údaje kódem obce, transformuje EPSG:5514 do EPSG:4326, společně zjednodušuje obecní hranice a vytváří menší GeoJSON po krajích. Rozloha pochází z plné geometrie v metrické projekci. Souhrn validace je v `data/processed/validation.json`. `pipeline/package.py` bezpečně nahradí pouze `dist/` kopií `public/`; symlinky odmítá. Raw data, reference, testy ani Python knihovny do webu nekopíruje.

## Architektura a výpočty

- `public/js/engine.mjs`: obecný engine načítání, agregací, normalizací a barev; dataset se načte až při použití a potom zůstává v cache, souběžné požadavky sdílejí jedno načtení.
- `public/js/app.mjs`: ovládání a vykreslování podle manifestu.
- `public/data/manifest.json`: katalog metrik, jednotky, status, zdroj, roky, škály, normalizace a cesty.
- `public/data/territories.json`: hierarchie a jmenovatele obcí. GeoJSON obsahuje mapové polygony; podrobné obce se načítají po krajích.
- `tests/engine.test.mjs`: Node native test runner, bez testovacích knihoven.

Aditivní veličiny se sčítají z obcí; míry jsou poměry součtů. Neúplný součet zachovává počet pokrytých a očekávaných obcí. Normalizace používá jmenovatel jen pro stejné pokryté obce; nulový nebo chybějící jmenovatel vrací chybějící výsledek. Meziroční změna vyžaduje bezprostředně předchozí kalendářní rok a shodné pokrytí. Barevná doména používá všechny roky zvolené metriky. Přímý souhrnný údaj pro kraj/stát nedokládá obecní pokrytí: zůstává dostupný absolutně, bez domyšlené normalizace a změny.

`per_capita` v základním manifestu používá územní populační baseline 2025, nikoli automaticky populaci každého historického roku. Pro časově odpovídající jmenovatel definujte normalizaci s `denominatorMetric: "population"`; engine ji načte a páruje stejný rok. Aktuální hranice nejsou historickou rekonstrukcí a srovnatelnost obyvatelstva mohou ovlivnit sčítání a změny území.

## Přidání metriky

1. Vytvořte vlastní zdrojový adaptér v Python pipeline a doložte licenci, jednotku, časovou definici a územní pokrytí.
2. Zapište JSON `{"schemaVersion":1,"metricId":"new_metric","values":{"2025":{"554782":12.5,"562335":null}}}` do `public/data/metrics/new_metric.json`. Klíče jsou kódy území, hodnoty konečná čísla nebo `null`; nepoužívejte NaN ani názvy místo kódů.
3. Přidejte položku do `metrics` v manifestu: unikátní `id`, `name`, `unit`, `category`, `geography`, celočíselné `years`, `normalizations`, `colorScale`, `path`, `status`, `source` a `aggregation`. Dostupné stavy jsou `verified`, `demo`, `unavailable`; nedostupná metrika má prázdné roky a žádná předstíraná data.
4. `normalizations` odkazují na globální definice; `absolute` zachovává původní jednotku. Jiná definice má `denominator` (pole území) nebo `denominatorMetric` (roční dataset), volitelný `factor` a `unitSuffix`. Škála odkazuje na pole minimálně dvou šestimístných HEX barev v `colorScales`.
5. `geography` povoluje `country`, `region`, `municipality`. `aggregation: "sum"` je vhodná jen pro aditivní veličinu; potenciály, sazby či indexy vyžadují vlastní ověřenou metodiku, jinak se nesčítají. Spusťte build a testy.

Engine nemá seznam energetických ID: novou validní metriku obslouží bez změny výpočtů nebo aplikačních větví. Generovaný manifest se při buildu obnovuje; trvalou novou metriku přidejte do katalogu `build_manifest()` v pipeline, nikoli jen ručně do výstupu. Globální manifest také obsahuje `schemaVersion`, `defaultMetric`, `geography`, `territories` a případné bodové vrstvy `points`. Pro zařízení je připraven samostatný lazy loader, JSON Schema a [datový kontrakt bodových vrstev](docs/point-layers.md); MVP žádná neověřená zařízení nevykresluje.

## Nasazení GitHub Pages

Obsah tohoto adresáře vložte do **kořene samostatného GitHub repozitáře**; `.github/workflows/pages.yml` musí být přímo v kořeni repozitáře. V Settings → Pages zvolte Source: GitHub Actions. Workflow na větvi `main` provede instalaci Python závislostí → datový build → Node testy → statické balení → upload → deployment do prostředí `github-pages`. Pull request provádí build a testy bez publikace. Cesty webu jsou relativní, tedy vhodné i pro `/nazev-repozitare/`.

Workflow má jen `contents: read` při buildu; deployment navíc `pages: write` a `id-token: write`. Produkční deploymenty se navzájem nepřeruší. Nasazení vyžaduje povolené Actions/Pages a případná schválení prostředí nastavená vlastníkem. Tento projekt lokálně nic neposílá na vzdálený repozitář.

Verze Actions byly ověřeny podle [oficiálního návodu Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [setup-node](https://github.com/actions/setup-node) a [setup-python](https://github.com/actions/setup-python). Posouzení referenčního projektu je v [docs/tt-decin-review.md](docs/tt-decin-review.md).
