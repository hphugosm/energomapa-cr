# Kontrola před odevzdáním

Zaškrtnutí vyžaduje důkaz, ne pouhý výskyt pravidla. Záznam PASS / FAIL / NOT RUN a odkaz na výsledek ukládej do projektového ověření.

## Dohoda, reference a přínos
- Proběhla krátká rešerše před volbou architektury a uživatel výslovně schválil směr i práci. Zásadní změny a škrty jsou zaznamenané.
- Jsou otevřené relevantní původní zdroje; převzaté moduly mají konkrétní verzi, ověřená oprávnění, attribution a malý reprodukovaný příklad. Neověřená knihovna není prezentovaná jako funkční integrace.
- Projekt smí používat nejlepší běžnou metodu. Náš přínos je konkrétní a testovaný, ne automaticky nový algoritmus ani automaticky užitečný obal.
- Do T/3 proběhl test proti silné férové baseline i test nejcitlivějšího předpokladu: 80. minuta ze 240 / 100. minuta z 300 včetně diskuse. Stejné případy, data, dostupné informace, omezení a rozpočet; neúspěchy se neztratily.
- **Každá funkce** má uživatele/roli, rozhodnutí a proveditelnou akci: oprávnění, vybavení, čas, náklady a limity. Neověřený provoz či rozhovor zůstává neověřený.
- Druh důkazu odpovídá slibu (energie/náklady, rozhodnutí, lidská práce). Změna slibu má novou kartu a nový test; nulový výsledek není přejmenovaný úspěch.
- Milníky jsou doložené; první verze prošla **kritikou a další iterací**, pokud byl čas. Rezerva nevedla ke zbytečným funkcím.

## Správnost celého systému
- Nezávislý přepočet kontroluje vstupní stav i celkový výsledek, ne pouze řízený přírůstek. Nepřebírá jen boolean solveru nebo produkční validační helper.
- Kontrolovány společné i dílčí limity, každý časový krok, bilance, účinnosti, povinné služby, rezervy a konec horizontu podle konkrétního modelu.
- Výchozí stav už za limitem nesmí bez modelovaného a povoleného zásahu dostat verdikt „proveditelné“, ani když je řízený odběr nulový.
- Testy pokrývají přesnou hranici, překročení dílčího limitu, null, chybnou jednotku, záporný/NaN vstup a nedostupná data. Validace je i ve výpočtu/API, ne pouze ve formuláři.
- MW/MWh, Kč/EUR, procenta/procentní body, byty/domácnosti a časové základny jsou správně. Žádné null → 0 nebo vymyšlená historie.
- Baseline a varianta dodávají stejnou službu v týchž hranicích. ML nemá únik testovacích dat; solver timeout není optimalita. Citlivost nenahrazuje validaci vstupů.
- Hlavní výsledek má reprodukovatelný příkaz, zdroje, období, absolutní dopad vedle procent a jasné hranice platnosti.

## Aplikace a obhajoba
- **Šipky a stopky** fungují; design a počet scén jsou volné. Je-li použit fullscreen, Esc nebo iframe, zkontroluj je také; nejsou povinnými novými funkcemi.
- Celý průchod od problému k užitečnému výsledku je čitelný, připravená je odpověď na nejslabší místo. Nácvik včetně animací a dema se vešel do limitu.
- Normální pohyb a reduced-motion se ověřily zvlášť; rychlý návrat a cílové rozlišení neporuší ovládání. Během statického exportu se zachytily konečné stavy.
- Testy aplikace, dat a prohlížeče prošly nebo jsou přesně označeny jako NOT RUN. Test fráze v dokumentaci neprokazuje chování modelu.

## Skutečný odevzdávací balíček
- Zmrazená finální verze: release/commit, datový snapshot, konfigurace, výsledky a SHA-256 exportů. Video je volitelné, ale pokud existuje, patří téže verzi jako web/PDF/screenshoty.
- Otevřeny skutečné exporty a přehráno video: žádná stará čísla, testovací hlášky, placeholdery nebo prázdné demo. Nejde jen o kontrolu jejich existence.
- Archiv má zdroje, povolená data, licence/NOTICE, připnuté závislosti, návod na spuštění a nový přepočet; žádné klíče ani závislost na tajném autorově prostředí.
- **Právě odevzdávaný archiv** byl rozbalen v čistém prostředí bez původního checkoutu a zahřáté cache. Hlavní cesta i nový přepočet po změně vstupu fungují. Offline provoz ověřen jen, pokud se slibuje; potřebný server nebo služby jsou přiznané.
- Report uvádí hash archivu, prostředí, příkazy, očekávané/získané výsledky a PASS / FAIL / NOT RUN. Po poslední změně byly obnoveny dotčené exporty, balíček a kontroly podle `REALITY_CHECK.md`.

## Publikace
- Datová oprávnění, pravidla soutěže a cizí autorství jsou zachované; žádné osobní poznámky, klíče, neoprávněná média ani fontové soubory v kitu.
- Připraveno, commitnuto, sloučeno a nasazeno jsou různé stavy. Nasazení se tvrdí až po kontrole a merge se bez pokynu neprovádí. Žádná z kontrol nezaručuje stoprocentní výsledek soutěže.
