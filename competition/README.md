# Soutěžní sada · EnergoMapa

Podklady pro OpenAI Codex. Žádný chatbot v aplikaci ani vlastní agentní orchestrátor. Začínáme skutečným problémem a existujícími řešeními, ne vynálezem nového algoritmu.

## Rozcestník (načítat podle úkolu)

| Potřeba | Podklad |
|---|---|
| Start a krátká dohoda | `../AGENTS.md`, `../README_CODEX.md`, `COLLABORATION.md` |
| Reference, moduly a bezpečné převzetí | `REUSE_FIRST.md`, `templates/reuse-decision.md` |
| Čas a dnešní čtyřhodinová generálka | `MOONSHOT_STRATEGY.md`, `REHEARSAL_4H.md`, `run-plan.json` |
| Praktický přínos a správnost | `PRACTICAL_VALUE.md`, `REALITY_CHECK.md`, `templates/value-test.md` |
| Kontakt s praxí | `templates/mentor-interview.md` |
| Role a dostupné skills | `SKILLS.md` |
| Data a odborné knihovny | `DATA_PLAYBOOK.md`, `DATA_CATALOG.md`, `LIBRARY_TOOLBOX.md`, `METHODS.md` |
| Vizuální návrh a prezentace | `DESIGN_SYSTEM.md`, `PRESENTATION_GUIDE.md`, `templates/pitch-runbook.md` |
| Ukázkové komponenty / Děčín | `../public/prezentace/`, `DECIN_PARITY.md` |
| Projekt a důkazy | `templates/project.md`, `templates/evidence.json` |
| Nácviky a záloha | `EXERCISES.md`, `VIDEO_GUIDE.md` |
| Odevzdání | `QA_CHECKLIST.md` |

## Spuštění výchozí šablony

Z kořene: `python -m http.server 4173 --directory public --bind 127.0.0.1`, potom `/prezentace/`. Přímé `file://` není podporováno. `node tools/competition.mjs check` kontroluje referenční prezentaci; `catalog --write` aktualizuje katalog a `exercise` vypíše výslovně hypotetický FVE příklad. Příkazy měnící soubory nepouštěj před schválením projektu.

## V den finále

„Nejprve se mnou stručně prober řešení“ znamená: nejdřív omezená rešerše a možnosti, potom výslovný souhlas. Při generálce T=240 minut použij milník T/3=80; při T=300 je to 100. V každém případě jsou rešerše a diskuse součást času. Skutečné oznámené termíny a pravidla pořadatele mají přednost, pět hodin není automaticky potvrzená délka finále.

Hlavní Codex řídí dostupné subagenty, nečeká na konec s integrací a nenechá prezentaci na poslední chvíli. Výsledkem může být nejlepší existující metoda v ověřeném novém použití. Musí být jasné, co je převzaté, co jsme dodali a zda jsme užitek skutečně změřili. Nepovinné kroky jako video nesmějí vytlačit funkční demo a kontrolu odevzdání.

## Co sada nezaručuje

Výchozí prezentace je šablona, ne řešení neznámého zadání. Kalkulačky nemají ověřené tržní předpoklady. Datum, čas práce, pravidla AI/převzatého kódu a povinné výstupy vždy ověř v aktuálních pokynech organizátorů; historický zdroj: https://www.energeticka-gramotnost.cz/olympi%C3%A1da . Tento dokument není nové ověření programu soutěže.

Povinné funkce prezentace jsou jen šipky a časovač. Počet a typ scén jsou volné. Print CSS není věrný export živé mapy; mapu a animace potřebuje statická záloha zachytit v doloženém konečném stavu. Finální video dosud není univerzální součástí sady. Nepřibalujeme fontové soubory ani odhadnuté logo.

Zápis do GitHubu neznamená načtení skills v konkrétním klientovi. PR není merge ani deployment. Strukturální testy jsou kontroly dokumentace, ne záruka chování Codexu. Počet skills se touto finalizací nezvyšuje.
