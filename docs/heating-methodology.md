# Obydlené byty a hlavní zdroj energie k vytápění

Zdroj: [ČSÚ – otevřená data Sčítání 2021](https://csu.gov.cz/produkty/vysledky-scitani-2021-otevrena-data), soubor `sldb2021_byty_energie.csv`, vydán 26. 10. 2022, stažen 27. 10. 2026. Přesný originální download a SHA-256 komprimovaného i původního souboru obsahuje `data/sources/heating.json`. Úplný CSV je bezeztrátově uložen v gzip s pevným časem komprese; offline build síť nepotřebuje.

Jedná se o stav k **26. 3. 2021** (`sldb_datum`), ne aktuální údaje. Ukazatel 2607 znamená počet obydlených bytů. Není to počet hospodařících domácností, spotřeba energie ani instalovaný výkon. Zdroj rozlišuje hlavní/převládající zdroj, ne všechny doplňkové zdroje.

Číselník energie 3063: 5 zemní plyn, 7 elektřina, 9 tepelné čerpadlo, 1 teplo z kotelny mimo dům. Prázdný kód je počet všech obydlených bytů. Metrika „teplo z kotelny mimo dům“ neurčuje palivo kotelny. Tepelná čerpadla jsou samostatná kategorie a nepřičítají se k elektřině.

Obce spojujeme výhradně číselným kódem (`uzemi_cis=43`). Krajská kontrola používá číselník 100 a pevné přiřazení 14 krajských kódů k NUTS3. Stát je číselník 97, kód 19. ČSÚ má 6 255 obcí, současná geometrie 6 258: vojenské újezdy Libavá (503941), Boletice (545422) a Hradiště (555177) v tomto snímku nemají údaje a zůstávají null. Žádný původní kód nezůstává nepřiřazen. Neděláme časovou ani územní interpolaci.

Nuly ze zdroje zachováváme. Jen při doloženém nulovém celkovém počtu bytů lze doplnit vynechané palivové kategorie nulou (Březina, vojenský újezd 592935). Chybějící nenulové kategorie, duplicitní řádky, změna klasifikace či data a nesoulad součtů vyvolají chybu. Audit porovnává celostátní a krajské údaje se součtem obecních řádků. Všech pět vrstev má přesné součty za současné krajské přiřazení dostupných obcí; chybějící vojenské újezdy se nevyplňují nulou.

Aplikace publikuje absolutní počty a hustotu bytů na současnou plochu km². Nenabízí přepočet na obyvatele roku 2025 ani odhad časové řady. [Oficiální procenta ČSÚ](https://scitani.gov.cz/scitani/vytapeni-bytu) se počítají z bytů se zjištěnou energií: celkem minus kategorie 99 „Nezjištěno“. Zde procenta nepublikujeme, aby se jmenovatel nezaměňoval s počtem domácností nebo všemi byty.

Příkaz pro explicitní obnovení stažení volá `download_census(root)`: původní bajty musí přesně odpovídat připnutému SHA-256. Změna obsahu zastaví aktualizaci před zápisem a vyžaduje ruční kontrolu. Platné stažení uloží deterministický gzip atomicky a obnoví datum stažení v pásmu Europe/Prague. Pokud všechny původní kódy obcí existují v současné mapě, jakýkoli nesoulad krajských součtů zastaví build a vyžaduje zkontrolované územní propojení.

## Pevná paliva

Vrstva `heating_solid_fuels` je přesný součet tří vzájemně disjunktních kategorií hlavního zdroje vytápění z téhož souboru: `2` uhlí, koks a uhelné brikety; `3` dřevo a dřevěné brikety; `11` dřevěné pelety. Není odhadovaná ani odvozená jako zbytek po odečtení ostatních paliv. Nepřičítá kategorii „jiný“ ani „nezjištěno“. Každý dílčí řádek nadále prochází kontrolou číselníku a celková hodnota se porovnává s publikovanými kraji a ČR.
