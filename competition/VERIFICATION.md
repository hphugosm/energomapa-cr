# Ověření soutěžní sady

## Aktualizace instrukcí po třech nácvicích · 9. 11. 2026

- `npm test`: **141/141** testů prošlo, včetně pěti nových dokumentačních kontraktů v `tests/competition-workflow.test.mjs`.
- `node --test tests/competition-workflow.test.mjs tests/skills.test.mjs`: **16/16** kontrol prošlo (podmnožina celkové sady).
- `node tools/competition.mjs check`: platná výchozí prezentace, 6 snímků, 285/300 sekund a 22 metrik. Počet snímků není požadavek nových projektů.
- `git diff --check`: bez chyb. Mění se instrukce, šablona, checklist, metodika a kontrolní scénáře; aplikační kód, data a workflow zůstávají stejné.
- Čtyři nové behaviorální scénáře v `skills-evals.json` mají stav **`not_run`**. Tyto kontroly neprokazují chování modelu, zlepšení proti minulým nácvikům ani funkčnost odevzdání nového soutěžního projektu. Čisté rozbalení je povinnost pro jeho skutečný finální balíček, nikoli tvrzení o provedeném testu zde.
- Python pipeline ani prohlížečové testy se při této dokumentační změně lokálně znovu nespouštěly. Celý PR ověřuje konkrétní GitHub Actions běh; jeho výsledek je nutné zkontrolovat po aktualizaci větve. PR se nemerguje a main se nemění.

## Původní ověření první sady

Výchozí aplikace: EnergoMapa 0.6.1, commit `94d30a807f307c67afd1c1bcc3a3c5a56ea59545`. Testování podkladů 7. 11. 2026.

## Provedeno lokálně

- `node --test tests/competition-kit.test.mjs`: 20/20 testů prošlo.
- `node tools/competition.mjs check`: 6 platných snímků, rozpočet 285/300 sekund, 22 ověřených metrik, platné odkazy na data.
- `node tools/competition.mjs catalog --write`: katalog vytvořen z reálných veřejných manifestů, včetně 43 sad databanky a modelového období PVGIS 2005–2023.
- `node tools/competition.mjs exercise`: reálný PVGIS údaj pro Roudnici načten; výstup hypotetického 100kWp scénáře je výslovně modelový.
- Syntaktická kontrola nových JS modulů a browser testu prošla.
- Vizuální a DOM kontrola v Chromium s místními datovými fixtures: rozcestník, titulní snímek, reálný populační graf, formulář ekonomiky; bez JS chyb. Kontrolní vstupy 100 000 Kč investice, 30 000 Kč/rok hrubého přínosu, 5 000 Kč/rok nákladů, 10 let a 5 % diskontu dávají NPV přibližně 93 043 Kč a prostou návratnost 4 roky. Jde pouze o testovací předpoklady.

## Co lokální kontrola neprokazuje

Prohlížeč v pracovním prostředí blokoval URL navigaci zásadou správce (`ERR_BLOCKED_BY_ADMINISTRATOR`). Zásada nebyla vypínána. Vizuální kontrola proto používala in-memory dokument a místní již dostupné soubory, nikoli plný síťový/iframe smoke test. Neprokazuje živé načtení mapy, zachování stavu iframe ani fungování Pages.

Připravený `tests/browser-competition.mjs` ověřuje skutečný server, projektový prefix, mapový focus, přehrávání a zachování stavu, navigaci, časovač, kalkulačku a rozměry. Je přidaný do existujícího GitHub Actions workflow. Autoritou výsledku celého repozitáře je konkrétní běh CI na PR, nikoli tento statický dokument.

Existující Python pipeline, její testy a determinismus se lokálně znovu nespouštěly: podklad v pracovním prostředí byl veřejný distribuční artefakt, nikoli celý checkout. Workflow tyto kontroly zachovává a spouští je před novým browser testem.

## Publikace

Sada se přidává izolovanou větví/PR. Main, zdrojová data a dosavadní výpočty se tímto návrhem nemění. Sloučení ani nasazení nejsou potvrzené lokálním testem. Po merge je nutné ověřit úspěšný Pages deployment a `/prezentace/`.
