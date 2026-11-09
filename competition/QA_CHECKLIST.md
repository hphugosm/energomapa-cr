# Kontrola před pitch a publikací

## Spolupráce s uživatelem
- Před první úpravou proběhla krátká diskuse o alternativách a uživatel výslovně schválil zvolený směr i zahájení práce.
- Větší obsahová, ekonomická a vizuální rozhodnutí byla průběžně probrána, nikoli mlčky vymyšlena; drobnosti nevyžadovaly zbytečné otázky.
- Projektový brief zachycuje schválený rozsah a změny, které uživatel později rozhodl.
- Před případným zveřejněním nebo sloučením proběhla odpovídající kontrola a schválení.

## Ambice, využití času a soutěžní síla
- Projekt má **výrazný vlastní mechanismus**, ne pouze výpočet úspor, přebarvení mapy nebo katalog dat.
- Existuje velká vize i funkční technicky silné jádro, které porota skutečně uvidí.
- Už v první třetině celkového času (T/3, do 100. minuty z 300 včetně diskuse) proběhl experiment proti **silné férové baseline i test nejcitlivějšího předpokladu** podle `REALITY_CHECK.md`. Uložené jsou vstupy, příkazy, srovnání za stejných omezení a rozpočtu i nepříznivé výsledky. Slabý důkaz vedl ke konzultaci s uživatelem, nikoli oslabení baseline.
- Ukazujeme absolutní přínos pro uživatele vedle procent a technická omezení; neslibujeme neimplementované funkce.
- Milníky, včasné škrtání a využití rezervy času jsou doložené; první verze prošla **kritikou a další iterací**, pokud to čas dovolil.
- Pětiminutová prezentace je argument pro hodnotu řešení, nikoliv seznam technologií nebo prohlídka UI.
- **Šipky a stopky** fungují. Ostatní design, dramaturgie a počet slidů nejsou předepsané; animační důkazy jsou promyšlené tam, kde přidávají hodnotu.
- Pokud existuje video, PDF nebo screenshoty, všechny odpovídají stejné finální verzi a neztratily animace kvůli režimu reduced motion.

## Obsah
- Zadání odpovídá oficiálně přidělenému tématu. Žádný ukázkový text nezůstal jako finální tvrzení.
- Je jasný uživatel, problém, baseline, mechanismus, výsledek a pilot. **Každá funkce** má v briefu skutečného uživatele/roli, rozhodnutí a proveditelnou akci: oprávnění, vybavení, čas, náklady a provozní limity; neověřené podmínky jsou přiznané.
- Každé významné číslo má zdroj nebo označený předpoklad a reprodukovatelný výpočet.
- Rok, jednotka, území a pokrytí se neztratily při převodu do slidu.
- Připravena odpověď na tři největší slabiny návrhu; souhlas mentora nevydávat za certifikaci.

## Výpočty
- MW versus MWh, Kč versus EUR, procenta versus procentní body, domácnosti versus byty.
- Žádné null → 0; žádná falešná historie; žádné sčítání klimatických výnosů.
- Stejná energetická funkce a hranice systému pro baseline a variantu.
- Návratnost versus NPV; ceny/účinnosti zdrojované; citlivost alespoň na hlavní nejistoty.
- ML má časově oddělený test a silnou férovou baseline, jednoduchou referenci případně navíc; mapa/scoring nejsou automaticky AI.

## Skutečný odevzdávací balíček
- Finální verze je zmrazená: release ID, zdrojová revize, datový snapshot, scénář a výsledky. Manifest obsahuje cesty a SHA-256 exportů; PDF/screenshoty byly otevřeny a video přehráno. Žádné staré výsledky ani testovací hlášky ve finálních exportech.
- Archiv obsahuje úplný zdrojový kód, potřebná povolená data, připnuté závislosti a návod se spuštěním i přepočtem. Statická záloha je výslovně odlišena od funkčního projektu.
- **Právě odevzdávaný archiv** byl rozbalen v čistém prostředí: nová prázdná složka, čisté závislosti a profil prohlížeče, bez původního checkoutu nebo zahřáté cache. Podle návodu prošla hlavní cesta i **nový přepočet po změně vstupu**. Ověřen je offline režim, pokud se slibuje, a chování při nedostupné službě.
- Report má hash archivu, prostředí, příkazy a skutečné **PASS / FAIL / NOT RUN**. Neprovedená kontrola neznamená úspěch. Po poslední změně byly obnoveny dotčené exporty, balíček a ověření; podrobně `REALITY_CHECK.md`.

## Aplikace a prezentace
- `node tools/competition.mjs check` a nové unit testy prošly.
- Existující JS/Python testy, determinismus a balení prošly, nebo report výslovně uvádí neprovedené kroky.
- Šipky, Esc, fullscreen, časovač; formuláře a mapové posuvníky si drží ovládání.
- Mapový iframe se při návratu nenačítá znovu; skryté přehrávání stojí.
- 1280×720 a 1440×900: žádné překrytí ovladačů, data a legenda čitelné.
- Prezentace funguje na lokálním HTTP serveru bez internetu. Nezaměňovat to s garancí cache GitHub Pages.
- Záloha: screenshots, zdroje a krátké video; print mapový slide nesmí zůstat prázdný.

## Publikace
- Pouze vlastní/schválená média; žádné klíče, osobní údaje ani neveřejná komunikace.
- Respektovat skutečné oprávnění každého zdroje; OTE automaticky nepublikovat.
- Žádné fontové soubory ani překreslené „originální“ logo.
- Pull request není deployment. Ověřit skutečný stav CI a Pages, než se označí nasazení za hotové.
