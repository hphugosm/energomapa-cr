# OTE — denní trh, hodinové ceny a zobchodovaná energie

Snapshot tvoří původní denní XLSX zveřejněné přímo [OTE](https://www.ote-cr.cz/cs/kratkodobe-trhy/elektrina/denni-trh?report_date=2025-09-30) za **1. července až 30. září 2025**: 92 souborů, 2 208 hodinových intervalů. Soubory `data/raw/databank/ote-YYYY-MM-DD.xlsx` jsou archivované beze změny; `data/sources/ote-inputs.json` obsahuje konkrétní URL, čas stažení a SHA-256 každého originálu. Běžné sestavení je offline a ověřuje jejich hashe. Stažení je výslovné: `python pipeline/ote.py --download`.

Hodina 1 odpovídá intervalu 00:00–01:00 místního času, uložen je začátek v UTC. V celém vybraném období platí CEST, UTC+2. První záznam tak má čas `2025-06-30T22:00:00Z`, poslední `2025-09-30T21:00:00Z`. Adaptér kontroluje datum v obsahu workbooku, přesnou hlavičku a pořadí 24 hodin. Změněný formát, dny se změnou času a čtvrthodinové intervaly odmítne; nemůže je tiše zaměnit za hodiny.

- Cena je v **EUR/MWh**. Záporné ceny jsou skutečné a zůstávají záporné. Nejde o maloobchodní cenu včetně regulovaných složek, daní a marže. Převod měny se neprovádí.
- Množství, saldo, vývoz a dovoz jsou **MWh za interval**, nikoli MW. Původní OTE sloupec Import používá záporné hodnoty; databanka jej normalizuje na kladné množství dovozu. `net_export = export − import`; zachovává se zdrojová přesnost a kontroluje tolerance 0,21 MWh.
- Obchodní saldo DT není fyzickým tokem. Výsledky nepokrývají ostatní trhy, všechny obchody či celou spotřebu ČR. Tato sada neposkytuje obchodní výměnu rozdělenou po hranicích.
- Denní ceny: prostý aritmetický průměr všech 24 hodin, minimum a maximum. Průměr není vážený zobchodovaným objemem. Denní energie: součet 24 zdrojových hodnot MWh. Denní hranice jsou místní `Europe/Prague`.
- Zdrojovou značku `SN` a prázdné buňky ukládáme jako `null`. Například 4. července 2025 od hodiny 13 zdroj uvádí `SN`, nikoli cenu nula. Neznámé textové značky nebo změna schématu zastaví sestavení. Je-li některá hodinová hodnota nedostupná, příslušná denní agregace zůstane `null`. Neprovádí se interpolace ani náhrada nulou. Historický snapshot se nepředstírá jako dnešní údaj.

Výstupy obsahují samostatně hodinové ceny, hodinové tržní objemy, denní ceny a denní tržní objemy, každý v JSON a CSV. CSV opakuje jednotku, časové pásmo, zdroj, čas stažení a metodiku. JSON navíc uchovává úplný seznam originálů a jejich hashů.
