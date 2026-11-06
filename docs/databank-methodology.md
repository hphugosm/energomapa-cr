# Energetická databanka — původ, výběr a výpočty

Databanka je statická a strojově čitelná. Každá sada má JSON s metadaty a CSV (UTF-8 s BOM, čárka, desetinná tečka). `time` je rok nebo výslovně klimatologický měsíc; číselné sloupce mají vlastní jednotku. Chybějící pozorování zůstávají JSON `null` a prázdná CSV buňka, bez interpolace. Stav `snapshot` označuje poslední uložené historické vydání, nikoli živá data. Datum stažení není datem měření.

## Eurostat

Primární API: https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/
Dokumentace: https://ec.europa.eu/eurostat/web/user-guides/data-browser/api-data-access/api-getting-started/api

Původní odpovědi JSON-stat jsou uloženy beze změny obsahu v deterministickém gzip v `data/raw/databank/eurostat-*.json.gz`. Přesné URL, data stažení a SHA-256 jsou v `data/sources/databank-inputs.json`. Compiler dekóduje pořadí dimenzí a řídké indexy podle JSON-stat, ponechává příznaky `p`, `e` apod. v `qualityFlags`.

Výběr zemí: ČR, Německo, Polsko, Slovensko, Rakousko, EU27 v současném složení. Časová řada od roku 2000; skutečný konec vyplývá ze zdroje. EU27 se nesčítá s jednotlivými zeměmi.

- `nrg_bal_s`: zjednodušené energetické bilance, `freq=A`, `unit=GWH`, `siec=TOTAL` (všechna paliva). Primární produkce PPRD, dovoz IMP, vývoz EXP, hrubá dostupná energie GAE, hrubá domácí spotřeba GIC, konečná energetická spotřeba FC_E, průmysl FC_IND_E, doprava FC_TRA_E, domácnosti FC_OTH_HH_E, distribuční ztráty DL. GEP/TOTAL je hrubá výroba elektřiny souhrnně ze všech vstupních paliv.
- Samostatné elektřinové bilance vybírají `siec=E7000` pro dovoz, vývoz, konečnou spotřebu a ztráty. Jde o roční statistickou bilanci. Nejde o okamžité fyzické toky ani obchodní plány.
- `nrg_ind_id`: celková energetická dovozní závislost, procenta, TOTAL. Čistý dovoz dělený hrubou dostupnou energií; záporné hodnoty jsou přípustné.
- `nrg_ind_ren`: oficiální podíly OZE v procentech, REN (celkem), REN_ELC, REN_HEAT_CL, REN_TRA. Používají pravidla SHARES včetně normalizace vody a větru a zvláštních pravidel dopravy. Nejde o jednoduchý podíl skutečně vyrobené elektřiny.

## MPO / ČSÚ

Původní workbook: https://mpo.gov.cz/assets/cz/energetika/statistika/energeticke-bilance/2026/2/SEB_2010-2024.xlsx
Publikace: https://mpo.gov.cz/cz/energetika/statistika/energeticke-bilance/souhrnna-energeticka-bilance-statu-v-metodice-eurostatu-za-leta-2010_2024--290739/

MPO výslovně uvádí, že bilanci sestavilo z dat MPO a ČSÚ zasílaných Eurostatu. Archiv ČSÚ https://csu.gov.cz/produkty/ene_cr uvádí, že jeho předchozí řada přebírala zkrácené bilance Eurostatu; tři instituce proto nejsou tři nezávislá měření stejné veličiny.

Sada `mpo-czech-energy-balance` čte originální listy `2010-SB` až `2024-SB`, kódy bilance ve sloupci H a sloupec I `Celkem`. Kontroluje jednotku TJ v A5 a název celkového sloupce I2. Zachovává číselné hodnoty bez zaokrouhlení; nečíselné značky nejsou nahrazeny nulou. Údaje jsou národní bilance všech paliv, ne obecní spotřeba nebo elektrická síť. Vydání MPO a novější revize Eurostatu se mohou lišit; série se nespojují.

## PVGIS — model, nikoli skutečně naměřená časová řada

Zdroj a dokumentace: https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en

Používá existující ověřené snapshoty všech 6 258 obcí. PVGIS 5.3, SARAH3, klimatický průměr **2005–2023**, 1 kWp, krystalický křemík, volně stojící panel na jih, optimální sklon, ztráty 14 %, horizont terénu. Z každé odpovědi se vezme měsíční `E_m`. Kraj a ČR jsou průměry vážené rozlohou obcí, nikoli součty. `time=01…12` znamená měsíce modelového průměrného roku, nikoli rok 2023 nebo měření v roce stažení. Nejde o střechy, skutečnou instalovanou kapacitu nebo celkový technický potenciál území. Kontrolují se původní SHA-256 v `data/sources/pvgis.json`.

## EEA / E-PRTR

Zdroj: https://sdi.eea.europa.eu/catalogue/srv/api/records/657ac3cb-affa-4295-a4a9-27b4f539adab

Převzata původní česká část F1_4, vydání v16. Výběr `Carbon dioxide (CO2)` do ovzduší, pouze nezatajovaná hlášení, unikátní identifikátor provozovny a rok, kg / 1000 = tuny. Roční národní součet zahrnuje také hlášení bez bezpečného přiřazení k obci; proto se může lišit od součtu mapové vrstvy. Obsahuje biomasu. Nejde o EU ETS ani úplný český emisní inventář. Česká část má skutečně roky 2007–2022, přestože evropské vydání uvádí pokrytí do roku 2024. Novější roky se nevymýšlejí. Samostatná sada udává počet provozoven s tímto hlášením, ne počet všech průmyslových provozoven.

## Přepočty

- 1 GWh = 1000 MWh = 1 000 000 kWh = 3,6 TJ.
- 1 PJ = 1000 TJ; 1 TJ = 277,777… MWh.
- 1 tuna = 1000 kg.
- MW je výkon. Energii MWh lze odvodit jako průměrný výkon MW × délka doloženého intervalu v hodinách; ze samotného okamžitého MW se roční energie neurčuje.
- Procenta se převádějí na podíl dělením 100; samotná procenta států se nesčítají ani neváží bez příslušných jmenovatelů.

## Reprodukce a obnova

`python pipeline/energy_databank.py --download` explicitně obnoví čtyři síťové vstupy Eurostatu a MPO a jejich metadata. Běžný `build_energy_databank(root)` používá pouze místní soubory a kontroluje SHA-256; nevolá síť a neaktualizuje datum stažení. Neúspěšná obnova není novým pozorováním: používejte předchozí ověřený commit se snapshotem. Soubory PVGIS a EEA obnovuje stávající pipeline projektu.
