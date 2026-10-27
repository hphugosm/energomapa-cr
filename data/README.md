# Data EnergoMapy 0.4.0

Běžný `python pipeline/build.py` je offline deterministický build z připnutých vstupů. SHA-256 v `sources/checksums.json` a metadata jednotlivých adaptérů chrání proti nepozorované změně zdroje. Neshoda nebo nevalidní schéma zastaví build. `processed/` a `../public/data/` jsou generované výstupy, nikoli místa pro ruční opravy dat.

## Rodiny vstupů

| Umístění raw | Zdroj | Význam a omezení |
|---|---|---|
| `struktura_uzemi_cr.xlsx` | ČSÚ, 1. 1. 2026 | Přesné kódy obcí, krajů a vojenských újezdů |
| `geography/` | ČÚZK INSPIRE AU WFS | Současné hranice; nejsou rekonstrukcí historických hranic |
| `population_2018_2025.csv.gz` | ČSÚ REGUAP, ukazatel `2406UAP891` | Stav populace k 31. prosinci, výřez zdrojového CSV s uchovanými řádky |
| `solar/` | ERÚ TEZ sk. 11, 1. 10. 2026 a ČÚZK | Aktivní licencované zdroje, přesné katastry, dílčí přiřazené výkony |
| `storage/` | ERÚ TEZ sk. 17, 1. 10. 2026 | Výkon a počet provozoven; bez MWh a bez souřadnic |
| `census/` | ČSÚ Sčítání 2021 | Obydlené byty a způsoby vytápění; nejde o domácnosti či spotřebu |
| `households/` | ČSÚ Sčítání 2021 | Hospodařící domácnosti pro samostatnou metriku a referenční normalizaci |
| `charging/` | MPO, evidence veřejného dobíjení | Zdrojové stanice, dobíjecí body a skutečné souřadnice |
| `industry/` | EEA E-PRTR v16 | Česká hlášení zařízení 2007–2022, celkové CO₂ včetně biomasy |
| `pvgis/` | JRC PVGIS 5.3 / SARAH3 | Původní odpovědi modelu pro centroid každé obce, reference 2005–2023 |
| `demo/` | Syntetické fixtures | Pouze testovací/reference materiál; neaktivní v produkčním katalogu |

Přesná URL, datum stažení, časové vymezení a omezení jsou v rodinných souborech `sources/*.json`. Generovaný `sources/registry.json` je centrální seznam poskytovatelů a vazeb metrik; web načítá jeho kopii `public/data/sources.json`. Podmínky ČSÚ, ČÚZK, ERÚ, MPO, EEA a JRC se posuzují samostatně; licence jednoho poskytovatele se nepřenáší na ostatní.

## Území a souřadnice

Obce se propojují výhradně ověřenými kódy nebo zdokumentovaným prostorovým přiřazením; shoda názvu sama nestačí. ERÚ používá kódy katastrálních území a číselník ČÚZK. Nejednoznačné lokality se nerozdělují odhadem. Rozloha vzniká z plného polygonu v EPSG:5514 a není vydávána za statistickou rozlohu ČSÚ. Společné zjednodušení polygonů používá toleranci 100 m a transformaci do EPSG:4326; obce se pro web dělí po krajích.

`territories[].centroid` má podobu `{lat, lon}` a slouží pro model PVGIS nebo navigaci. Není souřadnicí elektrárny či baterie. Body zařízení smějí vycházet pouze z ověřených zdrojových souřadnic. Úložiště bez souřadnic zůstávají v auditu jako pojmenované záznamy, nevytvářejí body na středu obce.

## Čas, nuly a pokrytí

- `timeseries` je skutečná časová řada, `snapshot` jediný stav, `static` modelový referenční výsledek. PVGIS klíč 2023 označuje konec reference 2005–2023, nikoli měřenou výrobu roku 2023.
- Číselná nula je pouze ověřená zdrojová nula. Absence zařízení v neúplném registru je `null`; nelze z ní tvrdit nulovou hodnotu obce.
- `values` obsahuje čísla nebo `null`; volitelné `statuses` rozlišuje `missing`, `not_applicable` a `unavailable`. Dostupné číslo má ve výsledku enginu `valueStatus: available`.
- Součty vyšších území zachovávají dostupné/čekané obce a příznak neúplnosti. Modelové intenzity se agregují průměrem váženým rozlohou.
- Populační normalizace explicitně používá rok 2025; domácnosti rok 2021. Nepředstírá shodu roku jmenovatele s výkony 2026.

## Zdrojové zvláštnosti

ERÚ vykazuje pouze licencovanou přiřazenou část výkonu. Aktivní licence, verze a provozovny i opakované technické identifikátory se kontrolují; dílčí krajský součet není úplná inventura kraje. Skupina 17 uvádí MW, kV a A; proud nepřevádíme na MWh a typ technologie baterie není znám. `battery_storage_capacity_mwh` je nedostupná katalogová položka bez datasetu.

MPO workbook obsahuje 3 790 zdrojových záznamů stanic, zatímco titulní souhrn uvádí 3 783. Adaptér rozdíl otevřeně zaznamenává; metrika vychází z konkrétních evidenčních řádků, nezaměňuje stanice, dobíjecí body a konektory. E-PRTR pokrývá hlášené průmyslové provozy a prahová hlášení, nikoli všechny emise území; Vybraná veličina celkové CO₂ zahrnuje biomasu a nesmí být vydávána za samotné fosilní CO₂. Počet provozů se vztahuje k příslušnému roku, nikoli současné aktivitě všech bodů historické vrstvy.

PVGIS je model 1 kWp krystalického křemíku, volně stojící panely, 14 % systémových ztrát, jižní orientace, optimální sklon a horizont terénu. Nezjišťuje plochu střech, překážky budov, připojení ani celkový realizovatelný výkon obce.

## Obnova a kontrola

```sh
python pipeline/build.py                       # bez sítě
python pipeline/build.py --download-solar      # rodina ERÚ výroby
python pipeline/build.py --download-heating    # Sčítání – byty a vytápění
python pipeline/build.py --download-family storage
python pipeline/build.py --download-family charging
python pipeline/build.py --download-family industry
python pipeline/build.py --download-family households
python pipeline/build.py --download-family pvgis
```

Obnova je výslovná údržba a může přepsat raw vstupy či připnout nové hashe. Některé adaptéry záměrně odmítají změněný originál do metodické revize. `--download` obnovuje všechny rodiny; pro cílenou obnovu volte jednotlivé přepínače. Novější datum ERÚ vyžaduje vědomou změnu adaptéru. Pro reprodukci již vydané verze se nestahuje nový živý zdroj.

Kontroly zahrnují konečnost a nezápornost čísel, povolené kódy, roky, schémata, součty a pokrytí proti baseline. Rodinné audity jsou v `processed/*-validation.json` a publikovaných datech. `processed/validation.json` obsahuje celkovou validaci a velikost produkčních dat; `public/data/validation.json` zveřejňuje pokrytí. Před vydáním spusťte Python i JS testy, opakovaný build s porovnáním hashů a browser smoke test. Výsledek konkrétního vydání patří do [protokolu ověření](../docs/verification.md).
