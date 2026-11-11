# Ambiciózní přínos · velká vize → funkční jádro → řízené škrtání

**Cílem je mimořádně užitečný výsledek, ne povinný vynález algoritmu.** Neoptimalizuj na nejrychlejší dokončení ani na množství kódu. Najdi důležitý problém, opři se o existující práce a sestav nejlepší dosažitelné řešení. Náročná integrace, ověřené rozhodování i zpřístupnění odborné metody jsou legitimní vlastní přínos. Pouhé spojení modulů bez doložené hodnoty ale nestačí.

## Pořadí

Zadání → krátká rešerše (`REUSE_FIRST.md`) → 2–3 možnosti → uživatelův souhlas → reprodukce vybraného základu → důkaz přínosu → integrovaný produkt → kritika → obhajoba a čisté odevzdání. Před souhlasem žádné úpravy nebo instalace. Starší cvičení nejsou závazná architektura.

## Časový plán

Čtyřhodinová generálka má skutečných **240 minut** od startu včetně rešerše a diskuse. Pětihodinová varianta je alternativa, ne prodloužení čtyřhodinového deadlinu. Strojově kontrolovatelný rozpočet je v `run-plan.json` (pouze plán, žádný orchestrátor).

| Fáze | 4 hodiny | 5 hodin | Výstup |
|---|---|---|---|
| Reference a dohoda | 0–25 min | 0–30 min | omezená rešerše, možnosti, souhlas; orientačně prvních 15 min zdroje |
| Reprodukce a první důkaz | 25–80 min | 30–100 min | zvolený modul funguje na malém příkladu; férové srovnání a citlivost |
| Integrace a užitek | 80–165 min | 100–210 min | fungující celá cesta, relevantní uživatelský nebo provozní test |
| Kritika a škrty | 165–195 min | 210–255 min | druhá iterace, stabilizovaný produkt a příběh |
| Zmrazení a odevzdání | 195–240 min | 255–300 min | kontrola výstupů, čistý archiv, nácvik a záloha |

Příběh a exportní cesta vznikají průběžně, ne až v posledním bloku. První propojená ukázka má být do T/3; další ukázka nejpozději při konci integrace. Výzkumník, jádro a prezentátor se střídají s ověřovatelem tak, aby běželi nejvýše tři subagenti. Hlavní Codex sám řídí integraci a krátké konzultace.

## Rozhodnutí v T/3

Do 80. minuty ze 240 (nebo 100. minuty z 300) proveď první rozlišující test proti silné férové baseline a nejcitlivější předpoklad. Není to automaticky definitivní validace. Dolož stejná data, dostupné informace, omezení, rozpočet a všechny neúspěchy; podrobně `REALITY_CHECK.md` a `PRACTICAL_VALUE.md`.

- Přínos se potvrzuje: integruj a otestuj celý uživatelský průchod.
- Baseline je lepší: může se stát výpočetním základem produktu. Nehledej povinně nový algoritmus. Zachovej původní neúspěch a pro jiný slib navrhni nový test.
- Data nebo klíčový předpoklad nestačí: sděl přesně co chybí, navrhni uživateli zúžení nebo jiný směr. Nepokračuj slepě v drahé implementaci.
- Podstatný výsledek je modelový nebo negativní: poctivě jej ohranič. Negativní výsledek se bez dalšího důkazu nepřejmenuje na úspěšný produkt.

## Další iterace a konec

Když je **první verze hotová výrazně před koncem**, společně ji zkritizuj a využij rezervu k největšímu zlepšení. Nevytvářej zbytečné funkce ani nečekej nečinně do deadlinu. Pokud už není smysluplná práce, oznam stav; uživatel může test ukončit dřív.

Chraň užitek, správnost, ověřitelnost, srozumitelné demo a úplné odevzdání. Škrtej další scénáře, zbytečné obrazovky a dekorace dřív než nezávislou kontrolu mezí. Od začátku závěrečné fáze nepřidávej velké závislosti; změna nutná kvůli chybě zneplatní dotčené exporty a kontroly.

## Kvalita není jeden checkbox

1. **Funguje:** testovaná celá cesta a nový přepočet, ne jen sada jednotkových testů.
2. **Je proveditelné:** nezávisle sedí omezení celého systému, včetně vstupního stavu a hranic.
3. **Pomáhá:** odpovídající test energie/nákladů, rozhodnutí nebo lidské práce; druh důkazu nezaměňuj.
4. **Lze odevzdat:** finální archiv se spustil v čistém prostředí a exporty patří téže verzi.

Prezentace vysvětluje problém, převzatý základ, naši přidanou hodnotu a důkaz. Design je volný, povinné jsou pouze šipky a časovač. Animace vysvětlují mechanismus a rozdíl; neskrývají slabý výsledek. Převzaté práce označ včetně licencí a odliš je od práce během soutěže.

`QA_CHECKLIST.md` shrnuje závěr. Neprovedené kontroly jsou NOT RUN, nikoli PASS. Nepřidávej další agentní framework ani meta-evaluace během soutěžního zadání.
