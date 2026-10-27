# Posouzení TT-Decin pro energetický atlas

Posouzen byl [referenční snapshot TT-Decin](https://github.com/hphugosm/TT-Decin/tree/b765a69e0dafe012dbf181f16ddc790c41c3ae21/mapa), commit `b765a69e0dafe012dbf181f16ddc790c41c3ae21`. Pro tento projekt jsou užitečné zejména `RADAR_README.md`, `mapa/`, kořenové moduly `radar*.mjs`, `radar.css`, `prepare_radar.py` a `data/radar-provenance.md`. Pracovní clone v `reference/TT-Decin/` se do nového repozitáře nezahrnuje. Reference není energetický dataset a její migrační hodnoty se nepřebírají.

| Konkrétní vlastnost reference | Rozhodnutí v Energomapě | Důvod |
| --- | --- | --- |
| Statické ES moduly, místní JSON, provoz bez CDN a dlaždic | Zachovat tento architektonický princip, vytvořit samostatné `public/js/engine.mjs` a frontend | Malý přenos, offline po načtení, snadné GitHub Pages |
| Výběr obce přepíná mapu a časový detail; návrat tlačítkem vrací kraj | Převzít propojení výběru a detailu; rozšířit hierarchii na ČR → kraj → obec | Energetická data nemají jen ústecký rozsah |
| Obec × rok jako jednoznačný klíč; prázdná buňka není nula | V JSON použít rok → kód území → číslo/null | Kódy jsou stabilnější než názvy; chybějící údaj nesmí předstírat nulovou výrobu |
| Krajská míra je poměr součtů, nikoli průměr obecních měr | Normalizovat součet hodnot společným jmenovatelem stejných pokrytých obcí | Zamezuje zkreslení malými obcemi a neúplným importem |
| Časově pevné barevné rozsahy; meziroční změna = bezprostřední kalendářní rok | Engine počítá doménu přes všechny roky zvolené metriky a vyžaduje stejný seznam pokrytých obcí | Barvy a změny jsou v čase srovnatelné |
| Provenance, licence, snapshot současných hranic, kontrola geometrie | Zachovat přísný popis zdroje a omezení, vlastní datový manifest | Současná hranice není historickou rekonstrukcí |
| Shrinkage, migrační saldo, migrační klastry | Nepřebírat výpočty ani specializované ovládání | Jde o migrační metodiku bez obecné platnosti pro energetiku |
| Ústecký číselník 354 obcí a předem dané migrační kategorie | Nahradit celostátní geometrií a manifestem metrik | Nová veličina nesmí vyžadovat změnu výpočetního kódu |

Převzetí je koncepční; aplikace používá nově napsaný obecný engine. Nejde o přejmenování migračních polí. Samostatné energetické zdroje vyžadují vlastní ověření jednotek, prostorového pokrytí, roku a práv k užití. Souhrny s neúplnými obcemi jsou označené; přímý krajský údaj nedokládá dostupnost jednotlivých obcí a engine pro něj nevymýšlí pokrytí, normalizaci ani meziroční srovnání.

Regresní testy `tests/engine.test.mjs` nezávisle ověřují chybějící hodnoty, nuly, hierarchické součty, shodné pokrytí jmenovatele, kalendářní mezery a stálé domény. Audit odhalil dvě skutečné chyby a opravil je: prázdná doména uložená před načtením dat zůstávala v cache a přímý regionální součet předstíral úplné obecní pokrytí.
