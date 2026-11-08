# Funkce převzaté z Děčína

Reference: https://github.com/hphugosm/TT-Decin/tree/main/prezentace

Prozkoumané podklady: `README.md`, `AGENTS.md`, kořenový `BRAND_BIBLE.md`. Nový engine je jednoduchá implementace stejného základního ovládání, nikoli kopie migračních výpočtů.

| Funkce | Nová šablona |
|---|---|
| Rozcestník Prezentace / Prohlídka dat | ano |
| ← / → a tlačítka pod snímkem | ano |
| Esc zpět do rozcestníku, F fullscreen | ano |
| Ručně spuštěný, pozastavitelný časovač | ano; cíl z deck.json |
| Navigace a časovač viditelné pod mapou | ano |
| Živé mapy ve snímcích | ano; existující EnergoMapa |
| Zachovat stav mapy při návratu | jeden trvalý iframe na frame ID |
| Samostatná nastavení více map | různé frame ID |
| Stejný iframe opakovaně v příběhu | stejný frame ID, bez přesunu DOM |
| Přednačtení o mapový snímek dopředu | ano |
| Klávesy uvnitř map, výjimky pro formuláře/dialogy | implementováno; ověřuje browser test |
| Pozastavit skrytou mapu a média | implementováno |
| Omezení pohybu | respektováno |
| Grafy se skutečnými zdroji | existující MetricEngine + tabulková alternativa |
| Přesun wordmarku, morph obcí a rozpad hypotézy | záměrně nepřevzato; specifické pro děčínský příběh |
| Přesně jedenáct slidů | ne; obsah a počet se řídí aktuálním zadáním |

Výsledek má být funkčně známý, obsahově energetický a snadno upravitelný. Nepřebírej z Děčína migrační barevné významy, neověřené kauzální závěry ani datové rozsahy.
