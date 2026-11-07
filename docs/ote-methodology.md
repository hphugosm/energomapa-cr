# OTE — denní trh, hodinové ceny a zobchodovaná energie

**Veřejná verze data OTE neobsahuje.** Oprávnění k redistribuci nebylo doloženo; viz [stav práv](data-permissions.md). Adaptér zůstává pouze pro oprávněné soukromé použití července–září 2025. Potvrzení není licencí. Vstupy se ukládají do neměnných generací, manifest se přepíná atomicky, soukromé výstupy jsou v `exports/` adresáře mimo repozitář. Do veřejného katalogu, buildů ani ZIP nevstupují.

## Soukromý import vlastních souborů (R05)

Uživatel dodá 92 denních XLSX za 1. 7.–30. 9. 2025 do vlastního adresáře mimo repozitář. Přijaté názvy jsou `DT_01_07_2025_CZ.xlsx` (původní OTE) nebo `ote-2025-07-01.xlsx`; pro každý den musí existovat právě jeden soubor. Obsah musí odpovídat dni a hodinovému schématu. Příklad:

```sh
python pipeline/ote.py --private-dir /vlastni/soukromy/adresar --import-dir /vlastni/dodane-xlsx --i-have-permission
```

Tato cesta pouze čte dodané soubory a **nikdy nevolá síť ani náhradní downloader**. Prázdný, neúplný, duplicitní nebo neplatný vstup skončí chybou; poslední úplný soukromý snapshot zůstane zachován. Originály uživatele se nemění. Manifest uvádí `inputMethod=user-file-import`, původní název, skutečný čas importu a SHA-256. Neznámý čas získání původního souboru zůstává `retrievedAt=null`, nevydává se za čas importu.

Samostatný přepínač `--download` je výslovně vyžádaný soukromý downloader a s `--import-dir` se vylučuje. Nikdy se nespouští implicitně. Bez obou přepínačů se pouze sestaví existující soukromý snapshot; chybějící manifest vyvolá chybu. Síťový downloader i import používají stejné ověření stagingu a atomické přepnutí manifestu.

Hodina 1 odpovídá intervalu 00:00–01:00 místního času, uložen je začátek v UTC. V celém vybraném období platí CEST, UTC+2. První záznam tak má čas `2025-06-30T22:00:00Z`, poslední `2025-09-30T21:00:00Z`. Adaptér kontroluje datum v obsahu workbooku, přesnou hlavičku a pořadí 24 hodin. Změněný formát, dny se změnou času a čtvrthodinové intervaly odmítne; nemůže je tiše zaměnit za hodiny.

- Cena je v **EUR/MWh**. Záporné ceny jsou skutečné a zůstávají záporné. Nejde o maloobchodní cenu včetně regulovaných složek, daní a marže. Převod měny se neprovádí.
- Množství, saldo, vývoz a dovoz jsou **MWh za interval**, nikoli MW. Původní OTE sloupec Import používá záporné hodnoty; databanka jej normalizuje na kladné množství dovozu. `net_export = export − import`; zachovává se zdrojová přesnost a kontroluje tolerance 0,21 MWh.
- Obchodní saldo DT není fyzickým tokem. Výsledky nepokrývají ostatní trhy, všechny obchody či celou spotřebu ČR. Tato sada neposkytuje obchodní výměnu rozdělenou po hranicích.
- Denní ceny: prostý aritmetický průměr všech 24 hodin, minimum a maximum. Průměr není vážený zobchodovaným objemem. Denní energie: součet 24 zdrojových hodnot MWh. Denní hranice jsou místní `Europe/Prague`.
- Zdrojovou značku `SN` a prázdné buňky ukládáme jako `null`. Například 4. července 2025 od hodiny 13 zdroj uvádí `SN`, nikoli cenu nula. Neznámé textové značky nebo změna schématu zastaví sestavení. Je-li některá hodinová hodnota nedostupná, příslušná denní agregace zůstane `null`. Neprovádí se interpolace ani náhrada nulou. Historický snapshot se nepředstírá jako dnešní údaj.

Výstupy obsahují samostatně hodinové ceny, hodinové tržní objemy, denní ceny a denní tržní objemy, každý v JSON a CSV. CSV opakuje jednotku, časové pásmo, zdroj, čas stažení a metodiku. JSON navíc uchovává úplný seznam originálů a jejich hashů.
