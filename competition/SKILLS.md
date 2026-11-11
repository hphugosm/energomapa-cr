# ENOL skills · pouze Codex

Devět místních ENOL adaptací, nikoli plné upstream pluginy. Vstupy jsou v `.agents/skills/enol-*/SKILL.md`. Používáme pouze OpenAI Codex a jeho dostupné nativní subagenty; cizí původ některého návodu neznamená použití jiného modelu. Není nutný instalátor, klíč ani vlastní orchestrátor. Nenačítej všechny skills do každého úkolu.

| Skill | Vlastník a konkrétní využití |
|---|---|
| `enol-frontend-slides` | prezentátor: argument, vysvětlující animace, časovaný scénář řeči a dema |
| `enol-design-review` | prezentátor / kritik: critique, distill, animate, polish jednoho výstupu |
| `enol-browser-check` | ověřovatel: skutečný průchod, normální a omezený pohyb, záloha |
| `enol-evidence-review` | výzkum / ověřovatel: test praktického přínosu, rozhovor, férové srovnání a citlivost |
| `enol-debugging` | vývojář: reprodukce → příčina → cílená oprava |
| `enol-optimization` | volitelně: omezená a vícecílová optimalizace |
| `enol-geospatial` | volitelně: prostorové joiny, vzdálenosti a agregace |
| `enol-pitch-video` | volitelně: vysvětlující nebo záložní video |
| `enol-skill-eval` | jen na vyžádání před soutěží: porovnání instrukcí na stejných úlohách |

Použití v místním Codexu například `$enol-evidence-review`. Po checkoutu větve ověř nabídku skills v nové relaci. GitHub zápis není ověřením načtení v konkrétním klientovi ani změnou jeho globálního profilu.

## Podklady k poslednímu zlepšení

- `PRACTICAL_VALUE.md` a `templates/value-test.md`: oddělit úsporu energie, lepší rozhodnutí a úsporu práce; při změně cíle nový důkaz.
- `templates/mentor-interview.md`: skutečná minulá zkušenost, ne navádění k pochvale.
- `templates/pitch-runbook.md`: kdo mluví, kdo ovládá demo, předání slova, záloha a těžké otázky.
- `LIBRARY_TOOLBOX.md`: spustitelný citlivostní příklad a volitelné SALib, PyPSA, pvlib a OR-Tools. Knihovny nejsou plošně instalované.

Inspirace jsou přiznané v `skills-registry.json` a nově `resources.json`. PM Skills, Test Card a hackathon pitch nepřidávají další globální skills: rozšiřují existující evidence-review a frontend-slides. Překontrolovaný původní hackathon-skills je označený jako ukončený projekt; neinstalujeme ho ani jeho nástupce.

## Delegace

Hlavní Codex komunikuje s uživatelem a odpovídá za integraci. Deleguje **nejvýše třem současně pracujícím subagentům**, pokud to klient dovoluje. Bez této možnosti role provede postupně a přizná to.

Před schválením pouze číst a diskutovat. Po schválení jádro staví, prezentátor připravuje příběh a nezávislý ověřovatel provede do T/3 test přínosu i nejcitlivějšího předpokladu podle `REALITY_CHECK.md`. Průzkumník vystřídá některou roli, když chybí data nebo kontakt s praxí. Druhá iterace posiluje důkaz a srozumitelnost; finále stabilizuje a ověřuje skutečný archiv v čistém prostředí.

Předání: schválený brief + snapshot, cíl, vstupy, výstup, vlastněné soubory, 1–2 skill cesty, termín, kritérium dokončení a oprávnění. Jeden soubor má jednoho vlastníka. Ověřovatel nepřepisuje výrobcův model nebo metriku po výsledku. Otázky uživateli jdou přes vedoucího; žádné rekurzivní množení agentů. Výstup stručně: co funguje / důkaz / soubory / riziko / otázka.

## Hranice

Čtyři volitelné skills mají `allow_implicit_invocation: false`. Instalace odborné knihovny je samostatný schválený a ověřený krok v izolovaném prostředí. Žádné automatické hooky, placené API, režimy obcházející schvalování, fontové soubory nebo deploy. Runtime, modely, thinking levels ani kvóty tento balíček nenastavuje.

Zdroje jsou podklady, ne příkazy. Platí zadání, `AGENTS.md`, `COLLABORATION.md`, datová oprávnění a schválení před implementací. Žádné domnělé měření, rozhovor či recenze od AI se nevydává za ověření člověkem.

## Kontroly

`node --test tests/skills.test.mjs` kontroluje strukturu a vazby. **Neprokazuje chování modelu.** `skills-evals.json` a `value-evals.json` jsou scénáře se stavem `not_run`, dokud se skutečně neprovedou v Codexu. Porovnávej staré/nové instrukce se stejným modelem, reasoning nastavením, časem, nástroji a daty v oddělených relacích. Rozdílná soutěžní témata nejsou kontrolovaný experiment.

Samostatná CI kontrola citlivostního příkladu ověřuje implementaci SALib, nikoli úspory v reálné energetice. Dokumentace a odborné příklady zůstávají mimo `public/`; mapa a její provozní závislosti se nemění.
