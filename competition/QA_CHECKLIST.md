# Kontrola před pitch a publikací

## Spolupráce s uživatelem
- Před první úpravou proběhla krátká diskuse o alternativách a uživatel výslovně schválil zvolený směr i zahájení práce.
- Větší obsahová, ekonomická a vizuální rozhodnutí byla průběžně probrána, nikoli mlčky vymyšlena; drobnosti nevyžadovaly zbytečné otázky.
- Projektový brief zachycuje schválený rozsah a změny, které uživatel později rozhodl.
- Před případným zveřejněním nebo sloučením proběhla odpovídající kontrola a schválení.

## Ambice, využití času a soutěžní síla
- Projekt má **výrazný vlastní mechanismus**, ne pouze výpočet úspor, přebarvení mapy nebo katalog dat.
- Existuje velká vize i funkční technicky silné jádro, které porota skutečně uvidí.
- Ukazujeme přínos proti baseline a technická omezení; neslibujeme neimplementované funkce.
- Milníky, včasné škrtání a využití rezervy času jsou doložené; první verze prošla **kritikou a další iterací**, pokud to čas dovolil.
- Pětiminutová prezentace je argument pro hodnotu řešení, nikoliv seznam technologií nebo prohlídka UI.
- **Šipky a stopky** fungují. Ostatní design, dramaturgie a počet slidů nejsou předepsané; animační důkazy jsou promyšlené tam, kde přidávají hodnotu.
- Pokud existuje video, PDF nebo screenshoty, všechny odpovídají stejné finální verzi a neztratily animace kvůli režimu reduced motion.

## Obsah
- Zadání odpovídá oficiálně přidělenému tématu. Žádný ukázkový text nezůstal jako finální tvrzení.
- Je jasný uživatel, problém, baseline, mechanismus, výsledek a pilot.
- Každé významné číslo má zdroj nebo označený předpoklad a reprodukovatelný výpočet.
- Rok, jednotka, území a pokrytí se neztratily při převodu do slidu.
- Připravena odpověď na tři největší slabiny návrhu; souhlas mentora nevydávat za certifikaci.

## Výpočty
- MW versus MWh, Kč versus EUR, procenta versus procentní body, domácnosti versus byty.
- Žádné null → 0; žádná falešná historie; žádné sčítání klimatických výnosů.
- Stejná energetická funkce a hranice systému pro baseline a variantu.
- Návratnost versus NPV; ceny/účinnosti zdrojované; citlivost alespoň na hlavní nejistoty.
- ML má časově oddělený test a jednoduchou baseline; mapa/scoring nejsou automaticky AI.

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
