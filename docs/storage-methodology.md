# Licencované ukládání elektřiny: snímek 1. 10. 2026

Zdroj: [ERÚ TEZ sk. 17](https://eru.gov.cz/datove-sady-technologickych-energetickych-zarizeni-ke-dni-01102026-vzor-2025), přímé XML `tez-sk-17-2026-10-01.xml`. Schéma odkazované samotným XML je [vzor-17-v1.xsd](https://code.gov.cz/energeticky-regulacni-urad/tezy/-/raw/main/vzor-17-v1.xsd). Oba originály jsou připnuté v `data/raw/storage/`, XML bezeztrátově gzip s `mtime=0`. Kontrolní součty a URL jsou v `data/sources/storage.json`. Číselník katastrů ČÚZK je rovněž připnutý, stejný snímek jako ostatní ERÚ vrstvy.

## Význam hodnot a jednotky

[Oficiální formulář ukládání elektřiny – seznam provozoven](https://eru.gov.cz/sites/default/files/obsah/prilohy/ukladani-elektriny-seznam-jednotlivych-provozoven.doc) (originál rovněž uložen) uvádí v části 10 celkový elektrický instalovaný výkon v MW a v části 11 elektrický výkon jednotlivých zařízení v MW. XML používá odpovídající `TechnicalData/OutputSum` a `StorageElecDevice/OutputElec`. Součet zařízení se přesně porovnává s celkem provozovny pomocí Decimal. Počet zařízení se kontroluje proti `NoOfResources`.

Formulář uvádí nominální napětí v kV a nabíjecí/vybíjecí proud v A. `CurrentElecCharge` tedy není kapacita v Ah ani kWh; součin napětí a proudu nevyjadřuje MWh. XML ani XSD nemá explicitní energetickou kapacitu. Metrika `battery_storage_capacity_mwh` se nevytváří. Zdroj také nerozlišuje technologii, a proto zobrazované názvy záměrně říkají „licencované ukládání elektřiny“, nikoli „všechny baterie“. API identifikátory `battery_storage_capacity_mw` a `battery_storage_count` zachovávají předem požadovaný slovník, metadata vždy obsahují toto omezení. Počet znamená provozovny, nikoli bateriové moduly.

## Filtrace, spojení a nuly

Zahrnují se jen udělené licence s aktivní verzí a platnou licencí, verzí a provozovnou ke dni snímku. Sentinel `1900-01-01` je otevřená hranice v existujícím ERÚ adaptéru. Shodné opakování `StorageElecId` se započte jednou; rozpor aktivních opakování build zastaví. Opakované identické moduly uvnitř provozovny se nededuplikují: nemají identifikátory a představují skutečná jednotlivá zařízení.

Spojení obce probíhá pouze přes přesné kódy katastru a oficiální číselník ČÚZK. Více katastrů jedné obce je bezpečné. Provozovna více obcí nebo chybějící kód se nerozděluje odhadem; dotčené známé obce mají `null`. Obec bez záznamu má `null`, nikoli nulu. Jediná přípustná nula výkonu je výslovně evidovaná nulová provozovna. Součty krajů a ČR zůstávají dílčími součty licencovaných přiřazených záznamů, nikoli úplnou inventurou všech domácích a nelicencovaných úložišť.

## Ověřený výsledek

- 39 aktivních unikátních provozoven v 33 obcích.
- Zdrojový způsobilý výkon: **162,514 MW**.
- Bezpečně přiřazený i publikovaný výkon: **162,514 MW**; nealokováno 0 MW.
- 6 225 obcí bez známé hodnoty (`null`), nikoli tvrzená absence úložišť.
- Všech 39 provozoven nemá v XML souřadnice; nevytvářejí se body z centroidů. Audit uchovává název, ID licence/provozovny a přiřazený kód obce; `lat`, `lon`, technologie zůstávají null.
- Jediný snímek 2026, bez interpolované historie.

`build_storage(territories, root)` vrací `(metrics, datasets, audit, [])`. Běžný build je výhradně offline a kontroluje všechny připnuté hashe. Explicitní síťová obnova: `python3 -c 'from pipeline.storage import download_storage; print(download_storage("."))'`; vrácené hashe je nutné zkontrolovat a vědomě aktualizovat metadata. Automatická náhrada schválených hashů neprobíhá.
