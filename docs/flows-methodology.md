# Přeshraniční toky a provozní bilance ČEPS

## Skutečný offline vstup

Primární zdroj je [webová služba ČEPS](https://www.ceps.cz/cs/webove-sluzby), endpoint `https://www.ceps.cz/_layouts/CepsData.asmx`. Metody `CrossborderPowerFlows`, `Generation` a `Load`, parametry `agregation=HR`, `function=AVG`, `version=RT` (`Generation`: `para1=all`). Zkratka RT označuje verzi dat zdroje, nikoli živé načítání v této aplikaci.

Snapshot pokrývá 1. 1. 2025 až 5. 11. 2026 v českém místním čase: **16 176 hodinových intervalů**. V UTC začíná 31. 12. 2024 v 23:00 a poslední interval začíná 5. 11. 2026 v 22:00. Poslední interval končí v 23:00 UTC. Nejde o aktuální telemetrii. Datum stažení, přesné parametry, SHA-256 gzip i rozbalené odpovědi jsou v `data/sources/flows.json`; originální SOAP odpovědi po měsících, oficiální dokumentace DOCX a oficiální stránka ověřující směry jsou v `data/raw/databank/flows-*`.

## Fyzické versus plánované obchodní toky

* `flows-physical`: série **Actual** z ČEPS, fyzické přeshraniční toky.
* `flows-commercial`: série **Planned**, plánované výměny mezi provozovateli soustav. Nejsou to fyzické toky ani zobchodované objemy z krátkodobých trhů OTE. Neoznačovat jako všechny skutečně realizované přeshraniční obchody.
* PL = PSE, SK = SEPS, AT = APG, DE = TenneT + 50HzT. Pokud kterákoli ze dvou německých sérií chybí, německý součet je `null`.
* **Kladně dovoz do ČR, záporně vývoz z ČR.** Znaménka se nepřevracejí. Konvenci potvrzuje kód [oficiálního grafu ČEPS](https://www.ceps.cz/cs/data/preshranicni-toky): větev `val < 0` vykresluje šipku `export`, jinak `import`. Původní HTML je archivováno.

Pro jednotlivé hranice jde o čisté směrové toky za hodinu. Dovoz a vývoz ČR v `flows-balance` vzniká rozdělením hodinových hodnot čtyř hraničních profilů na kladné a záporné části. U Německa je předtím proveden součet obou provozovatelů; souběžné opačné toky mezi německými profily se tím započtou proti sobě. Žádný nárok na hrubé toky po jednotlivých vedeních.

## Výroba a zatížení

`flows-generation` zachovává devět klasifikací zdroje: TPP, CCGT, NPP, HPP, PsPP, AltPP, ApPP, WPP a PVPP. Jde o provozní **brutto** výrobu, nikoli čistou dodávku do sítě; výroba přečerpávacích elektráren je kladná výroba, ne jejich čerpání. Kategorie se nepřevádějí na neznámá paliva.

`flows-balance` obsahuje součet těchto devíti výrobních sérií, zatížení včetně čerpání, zatížení bez čerpání, rozdíl těchto zatížení (čerpání) a přeshraniční toky. Sloupec `residual` = výroba brutto + dovoz − vývoz − zatížení včetně čerpání. **Rozdíl je zachován**, nikoli vynulován dopočtem. Provozní série nemusí mít totožné měřicí pokrytí; nejsou zaměnitelné s úplnou statistickou energetickou bilancí ERÚ/ČSÚ nebo bilancí všech paliv.

## Jednotky, čas, agregace a chybějící hodnoty

Hodinové hodnoty jsou **průměrné výkony MW**. Časy jsou začátky intervalů; explicitní offset v originálním XML je převeden do UTC. Iterace v UTC zachová obě hodiny při podzimním návratu času a nevyrobí neexistující hodinu na jaře. Úplná očekávaná časová osa vzniká z požadovaného intervalu v `Europe/Prague`; chybějící hodiny mají `null`. Neprovádí se interpolace.

Sady `*-daily` jsou energie **MWh** za kalendářní den **UTC**: každý hodinový průměr MW × 1 h, poté součet. Neúplný UTC den nebo chybějící hodnota daného profilu znamená `null` pro denní součet tohoto profilu, nikoli nulu ani přepočet na 24 hodin. První a poslední UTC den snapshotu jsou neúplné. Každý den uvádí `availableHours` a `expectedHours=24`. Denní hraniční hodnoty jsou čistá energie; hrubý denní dovoz/vývoz vychází z oddělených hodinových kladných/záporných hodnot v bilanční sadě, nelze jej určit z denního netta.

## Reprodukce

Standardní sestavení běží bez sítě: `build_power_flows(root)` ověří SHA-256 každého vstupu a vygeneruje JSON/CSV. Explicitní obnovení: `python3 pipeline/power_flows.py --download --start 2025-01-01 --end 2026-11-05`. Obnovení přepisuje pouze vlastní snapshoty; po něm je nutné znovu připnout globální kontrolní součty pipeline. Stahuje se do lokálních souborů, webová aplikace nepotřebuje přístup ke vzdálenému API ani přihlašovací klíč.

CSV používá UTF-8 s BOM, čárku jako oddělovač a desetinnou tečku. Prázdné pole reprezentuje `null`. Jednotky, klasifikace, metodika a původ jsou v odpovídajícím JSON a katalogu databanky. Licence pro další užití není deklarována webovým rozhraním; zachovávat citaci ČEPS a prověřit podmínky zdroje při dalším publikování.
