# EnergoMapa Česka 0.5.0

Statický energetický atlas ČR s navigací **ČR → kraj → obec**, vyhledáváním, časovým grafem, porovnáním území a kombinovaným Energy Profile. Rozložení mapy, pravého panelu a časové osy navazuje na TT-Decin. Metriky, zdroje, normalizace a bodové vrstvy řídí manifest; frontend nepotřebuje serverovou databázi, API klíče, CDN ani CSV upload.

[Repozitář](https://github.com/hphugosm/energomapa-cr) · [GitHub Pages](https://hphugosm.github.io/energomapa-cr/) · [Ověření a omezení](docs/verification.md) · [Datový model](docs/data-model.md)

Odkaz Pages je cílová adresa projektu; stav nasazení této verze dokládá až příslušný GitHub Actions deployment.

## Obsah MVP

| Rodina | Zdroj a čas | Co znamená |
|---|---|---|
| Obyvatelstvo | ČSÚ REGUAP, 2018–2025 | Stav k 31. prosinci; sčítání a změny hranic omezují srovnatelnost |
| Domácnosti, byty a vytápění | ČSÚ Sčítání 2021 | Hospodařící domácnosti a obydlené byty jsou různé jednotky; vytápění není spotřeba energie |
| Výkon elektráren | ERÚ TEZ, 1. 10. 2026 | Licencovaný přiřazený výkon celkem, FVE, větru a vody bez PVE; dílčí součty |
| Ukládání elektřiny | ERÚ TEZ sk. 17, 1. 10. 2026 | Výkon MW a počet provozoven; zdroj neuvádí MWh ani technologii baterie |
| Veřejné dobíjení | MPO, připnutý snímek | Počet evidovaných stanic a dobíjecích bodů; není počet konektorů ani spotřeba |
| Průmyslové CO₂ | EEA E-PRTR, 2007–2022 | Hlášené celkové CO₂ zařízení včetně biomasy; nejde o celkovou uhlíkovou stopu obce |
| Solární model | JRC PVGIS 5.3 SARAH3, reference 2005–2023 | Výroba na 1 kWp, ozáření a optimální sklon; klimatický model centroidu, nikoli inventura střech |

Produkční katalog nepoužívá syntetická demo data. Nedostupná energetická kapacita úložišť v MWh zůstává výslovně `unavailable`. Chybějící záznamy nejsou nuly. Přesné počty metrik, pokrytí a velikosti výstupů jsou v generované validaci a [protokolu ověření](docs/verification.md).

Energetický profil načítá ověřené vrstvy až po rozbalení. Každá karta zachovává vlastní datum nebo referenční období; profil používá poslední dostupný stav každé metriky a nepředstírá společný rok 2026. Snapshoty nepřehrává jako historii. Dobíjení a průmyslová zařízení mají samostatné volitelné bodové vrstvy; geometrie obcí se načítají po krajích.

## Analytika 0.5.0

Panel **Analýza území** přidává kombinované filtry, editovatelné vážené skóre lokalit, nejbližší zařízení, porovnání 2–3 území a export výsledků. Mapa zobrazuje zapnuté bodové vrstvy s clusteringem; výsledek analýzy umožňuje přejít na konkrétní obec. Odvozené poměry jsou deklarativní a počítají se z původních metrik bez nových datasetů. Načítají se pouze metriky a body skutečně zvolené funkce.

Každé kritérium zachovává vlastní rok a normalizaci. Chybějící údaje nejsou nuly: filtr je vyřadí, scoring nabízí vyřazení či výpočet z dostupných vah. Úplnost skóre je podíl dostupných vah, nikoli statistická jistota. **Výsledek závisí na zvolených vahách a kritériích.** Presety jsou upravitelné ukázky, nikoli objektivní doporučení vhodnosti lokality. Nearest uvádí vzdušnou vzdálenost; silniční dojezd poskytuje oddělená funkce isochron.

CSV i kopírovaný souhrn zachovávají kontext analýzy. Nové funkce používají původních 22 reálných metrik a dvě bodové vrstvy; nezvyšují původní pokrytí dat ani nezamlčují omezení zdrojů. [Vzorce a pravidla analytiky](docs/analytics.md) · [Report verze 0.5.0](docs/report-0.5.0.md)

## Lokální spuštění

Požadavky: Python 3.12 a Node.js 22. Příkazy spouštějte z kořene projektu s `pipeline/` a `package.json`.

```sh
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
python pipeline/build.py
npm test
python -m unittest discover -s tests -p 'test_*.py'
python pipeline/package.py
python -m http.server 4173 --directory dist --bind 127.0.0.1
```

Otevřete `http://127.0.0.1:4173/`. `npm run serve` podává pracovní `public/`. Není nutné `npm install`; `file://` kvůli modulům a JSON nepoužívejte. `npm run build` provede datový build a balení; testy se spouštějí zvlášť.

## Architektura

- `pipeline/catalog.py` sjednocuje adaptéry, zdroje, kategorie, aliasy a normalizace. `pipeline/build.py` validuje data, generuje manifest a odstraňuje vyřazené metriky z produkčního výstupu.
- `data/raw/` uchovává připnuté zdroje; `data/sources/` jejich metadata a SHA-256. `data/sources/registry.json` je generovaný centrální registr, publikovaný také jako `public/data/sources.json`.
- `public/js/engine.mjs` poskytuje obecné agregace, časové řady a normalizace. Data stahuje až při použití a sdílí cache i souběžné požadavky.
- `public/js/profile.mjs` používá metadata `profile`, `status` a `timeType`; `public/js/points.mjs` validuje a načítá volitelné bodové vrstvy.
- `public/data/manifest.json` obsahuje katalog a cesty. `territories.json` popisuje hierarchii a jmenovatele; přehledová geometrie je oddělená od obecních geometrií po krajích.
- `pipeline/package.py` balí pouze `public/` do `dist/`; raw data, testy a Python knihovny se na web nekopírují.

Aditivní veličiny se sčítají jen z dostupných obcí a vracejí pokrytí. Solární modely používají průměr vážený rozlohou obcí, nikoli součet. Normalizace dělí jen jmenovateli stejných pokrytých obcí. `per_capita` znamená jednu osobu; `per_1000_capita` tisíc osob. Populační baseline 2025 a domácnosti ze Sčítání 2021 jsou v ovládání označené, i když čitatel pochází z roku 2026. Bezprostřední meziroční změna vyžaduje srovnatelné pokrytí.

## Data a reprodukovatelnost

Výchozí build je offline a kontroluje připnuté SHA-256. Síťové stažení je výslovný údržbový krok, ne součást načtení webu. `--download-solar` a `--download-heating` obnovují příslušné rodiny; `--download-family storage|charging|industry|households|pvgis` volí další adaptér. `--download` obnovuje všechny rodiny; pro cílenou obnovu použijte příslušný přepínač. Obnova může změnit vstupy a kontrolní součty a vyžaduje kontrolu auditů a metodiky. Pro reprodukci existující verze používejte přibalené raw vstupy.

[Datová dokumentace](data/README.md) vysvětluje původ, stavy a kontrolní postup. Metodiky: [FVE](docs/solar-methodology.md), [výkon](docs/generation-methodology.md), [ukládání](docs/storage-methodology.md), [vytápění](docs/heating-methodology.md), [domácnosti](docs/households-methodology.md), [dobíjení](docs/charging-methodology.md), [průmysl](docs/industry-methodology.md), [PVGIS](docs/potential-methodology.md).

## Přidání vrstvy

Přidejte ověřený adaptér, připnutý vstup a zdrojová metadata; vraťte metriku a dataset v jednotném kontraktu a zapojte je do katalogu. Doložte jednotku, datum, pokrytí, licence/podmínky užití a způsob územního přiřazení. Zvolte vhodnou agregaci a povolené normalizace. Engine ani UI nevyžadují větev pro konkrétní energetické ID. Generované JSON neupravujte ručně. Podrobnosti jsou v [datovém modelu](docs/data-model.md).

## GitHub Pages

Projekt patří do kořene samostatného repozitáře; `.github/workflows/pages.yml` musí být v kořeni. V Settings → Pages zvolte GitHub Actions. Workflow na `main` provede instalaci Python závislostí, build, testy, balení a deployment do `github-pages`; pull request provádí kontrolu bez publikace. Relativní cesty podporují i `/nazev-repozitare/`. Publikaci mohou omezovat nastavení Actions/Pages a schválení prostředí. Lokální build sám žádné nasazení neprovádí.

Ověření analytické verze, stav isochron a omezení: [report EnergoMapa 0.5.0](docs/report-0.5.0.md). Zdrojové pokrytí původních metrik zůstává v [reportu 0.4.0](docs/report-0.4.0.md).
