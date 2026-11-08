# Prezentace: přesvědčit porotu, ne obcházet web

**Povinné převzaté funkce z Děčína jsou pouze:** šipky pro navigaci (klávesnice i viditelná tlačítka) a čitelný ručně ovladatelný časovač. **Všechno ostatní je volné**: vlastní vizuální styl, animace, interaktivní prototyp, 3D, diagramy, přechody, pořadí a počet snímků. Dodržuj přístupnost a identitu týmu. Snímky není nutné skládat ze šesti předem nadefinovaných typů.

## Hlavní otázka

Po pěti minutách musí porota přesně vědět:
1. **Jakou skutečnou bolest řešíme?** Kdo na ni doplácí a proč současný stav nestačí?
2. **V čem je náš vlastní technický průlom?** Jak mechanismus funguje a proč je lepší než jednoduchá baseline?
3. **Co jsme opravdu postavili a ověřili?** Živá demonstrace, čísla, ekonomická logika, hlavní rizika a podmínky pilotu.

Jestli prezentace jen ukazuje data, mapu, kalkulačku a použité knihovny, přepiš **příběh**, ne pouze CSS.

## Vlastní dramaturgie

Nejde o povinných šest slidů ani o pevný čas pro mapu. Připrav nejsilnější posloupnost podle vybraného nápadu, například:
- **Šok / konflikt:** konkrétní problém, překvapivé srovnání, přímý důsledek.
- **Proč dnes selhává řešení:** co neumí běžný postup.
- **Náš mechanismus:** nejtěžší technický nápad s názornou animací nebo interaktivním scénářem.
- **Důkaz:** funkční demo, validace proti baseline, přínos a ekonomika, i když výsledek není pozitivní.
- **Dopad / pilot:** co už funguje, co je předpoklad, co ověříme dál a proč má koncept cenu.

Každý slide/scéna má diváka posunout v argumentu. Vyhoď opakované KPI, dlouhé formuláře, generické „naše řešení“ a zbytečné podrobnosti. Promítací slidy mají být čitelné na dálku; pracovní formuláře patří do dema, nikoli na hlavní projekci.

## Animace jsou nástroj dokazování

Použij **více smysluplných vizuálních odhalení**, kdykoli pomáhají pochopit mechanismus nebo rozdíl: postupná stavba modelu, pohyb energie sítí, přiblížení mapy, změna jediné proměnné, průchod optimalizací, kumulovaný ekonomický dopad, hypotéza → naměřený výsledek. Nekopíruj konkrétní děčínské animační triky, převeď **jejich příběhovou funkci** do nového tématu.

- Animace musí fungovat v běžném režimu; **samostatně** ověř `prefers-reduced-motion`.
- Při rychlém přepínání, návratu a změně rozlišení nesmí vznikat rozbité stavy.
- Grafy nesmějí vizuálně přikrášlovat výsledky. Jednotky, období, baseline a zdroj jsou součástí důkazu.
- Nedělej slideshow plnou animací bez obsahu; náročnější animace mají tvořit přímo pochopení průlomu.

## Technické možnosti

Základ `public/prezentace/` funguje, ale je jen **startovní komponenta**. `deck.json`, `app.mjs`, `math.mjs` a CSS můžeš **zásadně rozšířit, nahradit nebo reorganizovat** podle příběhu. Dosavadní typy `title/chart/map/steps/economics/conclusion` nejsou seznam povinných ani maximálních typů. Pokud pro funkční simulaci potřebuješ vlastní renderer, přidej jej a změň testy odpovídajícím způsobem; nepodřizuj nápad jedné šabloně.

Živou EnergoMapu vlož jen tam, kde něco dokazuje; pokud potřebuješ samostatné interaktivní demo, udělej samostatnou scénu. S mapou a formulářem musí fungovat šipky (mimo aktivní textové vstupy a widgety), stopky musí zůstat přístupné. Ostatní volby, včetně rozcestníku a fullscreen, jsou volitelné.

## Povinné ověření před odevzdáním

- Je jasná vlastní technická novost, ne jen obecná výhoda technologie?
- Funguje klíčová demonstrace v živém prohlížeči a lze ji zopakovat? Existuje záložní video/screenshot?
- Rozumí divák grafu za 3 sekundy? Je definovaný zdroj, jednotka, rok a baseline?
- Prošel celý příběh nahlas do **300 sekund**, včetně animací a dema?
- Šipky a časovač fungují i na 1280×720. Test běžného pohybu a reduced-motion byl proveden **odděleně**.
- Poslední video, PDF a web vycházejí z **téže finální verze**. Nezaměňuj export bez animací za důkaz jejich absence v živé verzi.
- Před „hotovo“ proveď soutěžní kritiku: *čím přesvědčíme porotu, že jde o něco mimořádného?* Oprav největší slabinu, pokud čas zbývá.

Výchozí rozpočet 285 sekund + 15 sekund rezervy lze změnit podle obsahu; limit 5 minut ale platí pro celý pitch.