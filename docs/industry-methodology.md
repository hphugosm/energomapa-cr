# Průmyslové emise CO₂ a ohlašující provozovny

## Zdroj a skutečné časové pokrytí

Primární zdroj: [EEA Industrial Reporting, verze 16, publikováno 20. 2. 2026](https://sdi.eea.europa.eu/catalogue/srv/api/records/657ac3cb-affa-4295-a4a9-27b4f539adab), licence CC BY 4.0, staženo 27. 10. 2026. Původní metadata XML i metodický PDF soubor jsou uchovány v `data/raw/industry/` s SHA-256 v `data/sources/industry.json`.

Z oficiálního archivu `User friendly .csv files.zip` je zachována **úplná česká část** `F1_4_Air_Releases_Facilities.csv`: přesný filtr `countryName == 'Czechia'`, 13 445 řádků všech znečišťujících látek, původní sloupce a hodnoty. Vynechání ostatních zemí je jediný obsahový filtr při pořizování raw dat. Malý gzip lze používat zcela offline; celý evropský archiv 147 626 010 B se do repozitáře nekopíruje.

Celé evropské vydání uvádí roky 2007–2024. **Jeho česká tabulka F1_4 však obsahuje pouze 2007–2022.** Aplikace proto publikuje jen těchto 16 skutečných let. Údaje 2023–2024 pro Česko v tomto zdroji chybí; nejsou odhadnuty ani kopírovány z předchozího roku. Historická data nepředstavují dnešní stav.

## Výběr a jednotka

Používá se výhradně `TargetRelease == AIR` a přesná hodnota `Pollutant == Carbon dioxide (CO2)`. Jde o celkové CO₂ včetně biomasy. Samostatná položka `Carbon dioxide (CO2) excluding biomass` se nepřičítá, nenahrazuje celkovou položku a není zvolena podle přibližné textové shody. Jiné látky, emise do vody, přenosy odpadů ani emise ověřené v systému EU ETS nejsou součástí metriky.

`Releases` je původní množství v kg/rok podle metadat EEA (oddíl 3.4 popisuje F1_4 jako tabulku úniků na úrovni provozoven, původní `totalPollutantQuantityKg` v oddílu 3.2 má jednotku kg). Hodnota se přesně vydělí 1000 na tuny CO₂/rok. Náhodné úniky se znovu nepřičítají, protože celkový únik je již obsahuje. Utajené hodnoty jsou vyloučeny, případné záporné, nečíselné nebo konfliktní údaje způsobí chybu buildu.

Klíčem je `(reportingYear, FacilityInspireId)`. Shodné duplicity se ignorují a auditují; konfliktní duplicity zastaví build. Celkem je 1 100 záznamů provozovna–rok celkového CO₂. V roce 2022 jde o 64 provozoven s 57 787 024,10869017 t CO₂. Nejde o počet všech českých průmyslových provozoven: `industrial_facility_count` je výslovně **počet provozoven ohlašujících celkové CO₂ v daném roce**.

## Přiřazení a absence dat

Souřadnice `Longitude`, `Latitude` z EEA se transformují z WGS84 do EPSG:5514 a porovnají s původními nezjednodušenými polygony obcí ČÚZK použitými datovým buildem. Musí existovat právě jedna obec obsahující bod. Nikdy se nevybírá nejbližší centroid ani neodhaduje obec z textového názvu. Bod na více hranicích nebo mimo území je vyloučen a uveden v auditu. V připnutém zdroji je bezpečně přiřazeno všech 1 100 záznamů; každoroční zdrojové a přiřazené součty souhlasí.

Historie se přiřazuje ke stejným aktuálním hranicím, nikoli k historické geometrii. Bod reprezentuje ohlášenou polohu provozovny, ne celý její areál.

E-PRTR pokrývá vybrané velké provozovny a používá prahové hodnoty. Obec bez hlášení má **null**, nikoli nulu. Skutečná výslovně ohlášená nula se zachová. Regionální a celostátní součty představují součet dostupných hlášení a jsou označeny jako částečné; nelze je interpretovat jako úplný emisní inventář.

Bodová vrstva uchovává provozovnu, INSPIRE identifikátor, souřadnice, sektor (může ve zdroji chybět), rok, obec/kraj, zdroj a roční CO₂. Počet bodů v rámci celého souboru je počet provozovna–rok; zobrazení v konkrétním roce ho filtruje na tento rok.

## Reprodukce

Veřejné WebDAV uživatelské jméno níže je identifikátor veřejně sdíleného datasetu, nikoli soukromé přihlašovací údaje.

```sh
curl -L --fail -u 'sptXqwkQr5g7Bp5:' \
  'https://sdi.eea.europa.eu/datashare/public.php/webdav/eea_t_ied-eprtr_p_2007-2024_v16_r00/User%20friendly%20.csv%20files.zip' \
  -o /tmp/eea-industrial-v16.zip
python pipeline/industry.py --extract-archive /tmp/eea-industrial-v16.zip \
  --expected-archive-sha d0e0c1c14f7173ee19f283025ae1d5718b74b082512b8f7148ecf82d4a334a6b
python pipeline/build.py
```

Deterministický filtr zapisuje CSV se stejnými sloupci a pořadím, pouze s LF konci řádků a gzip `mtime=0`. Připnutý SHA-256 výsledku je `8fec0c5d7697e4f97bf4036934077cca6b799542ab230b518f94704a4fb1ce63`. Změna oficiálního archivu vyžaduje kontrolu zdroje a vědomou aktualizaci metadat, nikoli tiché přijetí nových dat.
