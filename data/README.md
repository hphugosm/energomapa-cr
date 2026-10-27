# Data a reprodukce

`python -m pip install -r requirements.txt` a `python pipeline/build.py` spouští plně offline deterministický build z připnutých vstupů. SHA-256 každého souboru v `raw/` je v `sources/checksums.json`; neshoda build zastaví. `python pipeline/build.py --download` je explicitní síťové obnovení dat, které aktualizuje i kontrolní součty. Živá služba může v budoucnu vracet jiný stav: pro reprodukci verze používejte přibalené vstupy, nikoli nový download.

## Skutečná data

- `raw/geography/*.gml.gz`: nezměněné odpovědi oficiálního ČÚZK INSPIRE AU WFS, gzip komprese, staženo 27. 10. 2026. Stored query `GetUnitByNationalLevel`, `NAT_LEVEL=Obec`, parametry XMIN/YMIN/XMAX/YMAX v EPSG:5514. Dlaždice nad limit 250 prvků se rekurzivně rozdělují; do buildu vstupují pouze úplné odpovědi, obce se deduplikují podle `nationalCode`. Geometrie nezastupují historické hranice. Zdroj: https://services.cuzk.gov.cz/wfs/inspire-au-wfs.asp . Podmínky: https://www.cuzk.cz/Predpisy/Podminky-poskytovani-prostor-dat-a-sitovych-sluzeb.aspx . Licenci ČSÚ nelze automaticky vztáhnout na hranice ČÚZK.
- `raw/struktura_uzemi_cr.xlsx`: oficiální ČSÚ číselník 1. 1. 2026; šestimistný kód, název, status a kraj NUTS3. Obsahuje i čtyři vojenské újezdy; proto mapa pokrývá celé území. https://csu.gov.cz/statistika/csu_a_uzemne_analyticke_podklady .
- `raw/population_2018_2025.csv.gz`: nezměněný řádkový výřez populačního ukazatele `2406UAP891` z oficiálního otevřeného CSV REGUAP. Zachovává rok i zdrojovou hodnotu. Jde o stav **k 31. prosinci**. Build z číselníku vybere pouze obce; agregáty obsažené ve zdroji nezapočítává podruhé. https://data.csu.gov.cz/opendata/sady/REGUAP/distribuce/csv . ČSÚ: CC BY 4.0, odvozený normalizovaný výstup je upravenými daty. Metodická nespojitost: sčítání 2021 a zahrnutí dočasné ochrany od roku 2022.

Rozloha je výpočet plochy původního plného polygonu v EPSG:5514 dělený 1 000 000; není vydávána za statistickou rozlohu katastru ČSÚ. Kraje a ČR jsou sjednocením současných obecních polygonů. Obecní geometrie pro web se zjednodušují společně pomocí `shapely.coverage_simplify`, tolerance 100 m, pak transformují do EPSG:4326 a zaokrouhlí na sedm desetinných míst. Přesnost katastrální mapy není cílem. Web načte obce až po výběru kraje.

## Demo a nedostupná data

`raw/demo/` obsahuje tři zcela syntetické fixture datasety pro šest skutečných obcí. Nemají původ ve skutečných energetických měřeních. Manifest i datové soubory je označují `status: demo`; mezera Děčína v roce 2024 ověřuje chování missing data. Ostatní energetické metriky mají `status: unavailable`, žádné hodnoty a žádný datový soubor. Chybějící data nikdy nejsou nula.

Populační řada referenčního TT-Decin se záměrně nemíchá s REGUAP: reference používá stavy k 1. lednu, REGUAP k 31. prosinci. Metrika population tak má jednotné roční vymezení 2018–2025. Normalizace na obyvatele může používat populační řadu stejného roku; pro energetická demo data 2026 lze pouze výslovně označený poslední dostupný populační stav.

`processed/validation.json` obsahuje počty území, pokrytí populace a velikost browserových payloadů. `public/data/manifest.json` je kontrakt metrik; hodnota metriky je vždy u obce, vyšší jednotky agreguje generický frontend. Za neúplné pokrytí se nepovažují jednotlivé dostupné hodnoty za úplný součet území.
