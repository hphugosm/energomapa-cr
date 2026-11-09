# Název projektu

## Přesné zadání
[Doslovné zadání, původ, datum, povinné výstupy, limit prezentace a potvrzená pravidla.]

## Dohoda před implementací
- Diskutované směry (A/B/C), výhody a rizika:
- Zvolený směr a důvod:
- Potvrzení uživatele k zahájení implementace (přesné vyjádření, případně odkaz na chat):
- Hranice schváleného rozsahu:

## Průběžná rozhodnutí
| Otázka / změna | Doporučení Codexu | Rozhodnutí uživatele | Dopad do projektu |
|---|---|---|---|
| | | | |

## Ambiciózní vize a pětihodinové jádro
- **Velká vize:** Co by byl skutečný průlom, i kdyby celý systém zabral týdny?
- **Originální mechanismus:** Co nově umíme oproti současnému stavu / běžné kalkulačce?
- **Pracující důkaz:** Jakou technicky nejtěžší část musíme opravdu zprovoznit?
- **Silná férová baseline:** Nejlepší dostupný běžný postup / vyladěná heuristika, proč je poctivým soupeřem? Jednoduchá reference jen jako doplněk.
- **Závažná rizika:** Kritické neznámé, data, fyzika, ceny, legislativa.

## Milníky (reálný start a deadline)
- Start, skutečný deadline, čas zbývající:
- Do ~30 min schválení konceptu:
- Do T/3 (100. minuty z 300, včetně diskuse) experiment proti silné baseline, test nejcitlivějšího předpokladu a technický spike; uložený výsledek a rozhodnutí uživatele:
- Do ~210 min funkční end-to-end jádro:
- Do ~255 min stabilizace a odsouhlasené škrty:
- Do ~300 min prezentace, shodné finální exporty a rozbalení/spuštění skutečného archivu v čistém prostředí:
- **Pokud skončíme dříve:** co významného zlepšíme?

## Prioritizace
| MUST · jádro a důkaz | SHOULD · posílení | CUT FIRST · volitelné |
|---|---|---|
| | | |

## Kritika po první funkční verzi
- Není to jen kalkulačka nebo mapa? Co je opravdu nové?
- Která skutečně hotová funkce působí jako průlom?
- Kde by porota projekt rozebrala? Co opravíme v iteraci 2?
- Rozhodnutí uživatele a provedené zlepšení:

## Jedna věta
Pomáháme [komu] vyřešit [problém] pomocí [mechanismu]; úspěch měříme [ukazatelem].

## Co je fakt a co předpoklad
| Tvrzení / vstup | Typ: měření, model, předpoklad | Hodnota + jednotka | Rok/území | Zdroj/cesta | Nejistota |
|---|---|---|---|---|---|

## Baseline a varianta
- Výchozí postup:
- Navržená změna:
- Stejné případy, vstupy/informace, funkce, hranice systému, omezení a rozpočet včetně měření a provedení:
- Hlavní tvrzení, metrika, minimální užitečné zlepšení a kritérium vyvrácení stanovené před výsledkem:
- Oddělení ladění a testu, neúspěšné/nevyřešené případy:
- Nejcitlivější předpoklad: jak byl vybrán, zdroj rozsahu, nízká / základní / vysoká hodnota a bod ztráty výhody:
- Výsledek v první třetině, absolutní dopad vedle procent, příkaz a evidence; při slabém přínosu konzultace a schválená změna:

## Funkce → skutečný uživatel → rozhodnutí → proveditelnost
| Funkce | Skutečný uživatel / role | Vstup a rozhodnutí | Navazující akce | Oprávnění, vybavení, čas, náklady, limity | Důkaz / neověřená podmínka pilotu |
|---|---|---|---|---|---|
| | | | | | |

Podpůrnou funkci bez přímého rozhodnutí zdůvodni hlavní cestou. Nevymýšlej souhlas provozovatele. Kde je to relevantní, ověř povinné služby, rezervy a pokračování za plánovací horizont.

## Data a výpočet
- ID datasetů a připnuté verze:
- Relevantní známé mezery:
- Skript a příkaz pro reprodukci:
- Test / kontrolní součet:
- Soubor výstupů pro grafy a slidy:

## Ekonomika a dopady
- CAPEX, OPEX, horizont, měna, cenová báze, diskont (každý se zdrojem):
- Nízká / základní / vysoká varianta:
- Energie, emise, omezení sítě (jen co umíme doložit):

## Mentor
- Otázky: technická proveditelnost, největší chybějící vstup, ekonomická logika.
- Odpověď / datum / co jsme změnili:
- Nevyřešené námitky:

## Pilot
- Uživatel/provozovatel, místo, rozsah, postup ověření:
- Podmínky realizace a hlavní riziko:

## Pitch
- Jedna hlavní věta pro každý slide:
- Demo krok po kroku:
- Rozpočet do 300 sekund:
- Záložní screenshot/video:
- Tři otázky poroty a odpovědi:

## Ověření
[Příkazy a skutečné výsledky. Neprovedené testy a omezení. Commit, branch; deployment pouze po kontrole.]

## Finální verze, exporty a čisté odevzdání
- Release ID, zdrojový commit/otisk změn, datový snapshot, konfigurace a hlavní výsledky:
- Manifest cest a SHA-256 webu/PDF/screenshotů/videa; kontrola otevřených exportů, čísel a odstranění testovacích hlášek:
- Odevzdávaný archiv a jeho SHA-256; úplný projekt versus označená statická záloha:
- Přiložené zdroje, povolená data, připnuté závislosti/lockfile a přesný návod spuštění i přepočtu:
- Čisté prostředí po rozbalení skutečného archivu: nová složka, závislosti a profil, bez původního checkoutu a zahřáté cache:
- Hlavní cesta, změněný vstup a **nový přepočet**, referenční očekávání versus získaný výsledek; offline/služby podle slibu:
- Skutečné stavy PASS / FAIL / NOT RUN, prostředí, příkazy a evidence:
- Poslední úprava a opakované dotčené exporty, balení a kontroly podle `competition/REALITY_CHECK.md` od kořene repozitáře:
