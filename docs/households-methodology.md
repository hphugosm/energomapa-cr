# Hospodařící domácnosti – Sčítání 2021

Zdroj: [ČSÚ, Výsledky sčítání 2021 – otevřená data](https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data), datová sada „Hospodařící domácnosti podle velikosti a typu domácnosti“, vydaná 2. 2. 2023. Oficiální rozhodné datum je ve zdroji `2021-03-26`.

Používáme ukazatel `2423`, „Počet hospodařících domácností“, pouze řádky bez členění podle počtu členů (`clenu_*`) i typu (`typ_*`, `typ_struktura`). Počet domácností není počet obydlených bytů. Zdroj ČSÚ uvádí 4 813 103 hospodařících domácností; všech 6 254 obecních součtů i 14 krajů dávají přesně tento počet. Každý kraj navíc přesně odpovídá součtu obcí v aktuální geometrii.

Přiřazujeme výhradně šestimístným kódem obce, nikdy názvem. Neexistují nepřiřazené zdrojové obce. Aktuální geometrie obsahuje čtyři kódy bez publikovaného celkového počtu: 503941, 545422, 555177, 592935. Jejich hodnota je `null`, nikoli nula nebo odhad. Žádný historický převod není potřeba k dosažení úplného oficiálního součtu; chybějícím územím nepřiřazujeme sousední data.

Původní kompletní CSV (177 448 řádků) je uložené beze změny obsahu v deterministickém gzip archivu. SHA-256 originálu i gzipu, adresa stažení, datum vydání a získání jsou v `data/sources/households.json`. Offline build ověřuje checksum, identifikátor ukazatele, datum, nezáporné celočíselné počty, duplicitní řádky a soulad obec → kraj → ČR. Je to snapshot 2021, nikoli současný stav. Přepočet jiné metriky na domácnost musí zřetelně uvést rok jmenovatele; pro neznámý nebo nulový jmenovatel se nepočítá.
