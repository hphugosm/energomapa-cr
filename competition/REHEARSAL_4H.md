# Generálka · 4 hodiny

Nejde o nové zadání ani o automaticky běžící úlohu. Uživatel dodá téma a spustí relaci Codexu. Čtyřhodinový rozpočet je 240 minut od skutečného startu včetně diskuse a rešerše; přesný deadline zapiš v Europe/Prague. Pokud jej uživatel uvedl, použij jej bez opakované otázky. Plán a jeho hranice jsou v `run-plan.json` a `MOONSHOT_STRATEGY.md`.

## Vstupní kontrola

Ověř větev, commit, pracovní strom, skutečně dostupné skills/subagenty, model a prostředí pro hlavní experiment. Nesahej do cizí rozpracované práce; podle potřeby pracuj v oddělené větvi/worktree. Neinstaluj předem všechny knihovny. Nevyžaduj znovu informace, které už v zadání jsou.

## Milníky

- **0–25:** přečíst zadání; orientačně 15 minut rešerše; 2–3 koncepty opřené o existující práci; stručné rozhodnutí uživatele a souhlas.
- **25–80:** v izolaci zopakovat malý příklad vybraného modulu, první propojený průchod, férová baseline a citlivost hlavního předpokladu. V T/3 rozhodnutí pokračovat / převzít lepší metodu / změnit směr s uživatelem.
- **80–165:** integrovat produkt pro konkrétní rozhodnutí, měřit odpovídající praktický přínos. Nezávisle prověřit celý systém, ne jen řízenou část; připravovat pitch souběžně.
- **165–195:** ukázka, největší námitka, druhá iterace a škrty. Opravit kritické chyby před kosmetikou.
- **195–240:** zmrazit verzi, vytvořit shodné exporty, rozbalit archiv v čistém prostředí, ověřit nový přepočet, nacvičit pětiminutový pitch a zálohu.

## Co hodnotíme

Odděleně: praktický přínos a sílu důkazu; správnost a proveditelnost; reálné převzetí zdrojů a náš příspěvek; srozumitelnost dema/pitche; úplnost odevzdání. Nepočítáme jedno vymyšlené procento připravenosti ani počet testů jako hodnotu produktu.

Zaznamenej stručně skutečné milníky, použitý model/effort, delegace a změny směru, pokud jsou pozorovatelné. Bez záznamu nevymýšlej průběh. Uložené výsledky a příkazy mají větší váhu než report „vše hotovo“. `reuse-evals.json` jsou kandidátní behaviorální kontroly, ne předem dosažené výsledky.

## Prompt

> Zadání: [vložit]. Máme 4 hodiny od zahájení této relace na funkční projekt a pětiminutovou obhajobu. Ověř aktuální větev a řiď se AGENTS.md a competition/REHEARSAL_4H.md. Nejprve prozkoumej cizí práce, hotové moduly a naše podklady; navrhni 2–3 užitečné možnosti a řekni, co převezmeme a co přidáme. Doporuč jednu a polož mi jednu otázku. Do mého souhlasu nic neprogramuj. Pak využij nejlepší dostupné řešení, ověř užitek i omezení celého systému a odevzdej skutečně spustitelný balíček. Piš krátce česky; používej jen Codex a dostupné nativní subagenty.

Po generálce upravovat základní instrukce jen kvůli konkrétním závažným nálezům, ne přidávat obecná pravidla za každý drobný neúspěch. Tento plán nemůže zaručit výhru ani bezchybný produkt.
