# Soutěžní sada · EnergoMapa

Podklady pro práci přes Codex. Žádný chatbot v aplikaci, serverový AI backend ani vlastní orchestrace.

## Co je připravené

| Potřeba | Kde začít |
|---|---|
| Postup dialogu, schválení a průběžné otázky | `COLLABORATION.md`, `../AGENTS.md`, `../README_CODEX.md` |
| Barvy, typografie, grafy, slidy | `DESIGN_SYSTEM.md`, `../public/prezentace/tokens.css` |
| Funkční webová prezentace | `../public/prezentace/index.html`, obsah `deck.json` |
| Struktura a ovládání pitch | `PRESENTATION_GUIDE.md` |
| Výběr dat pro energetické téma | `DATA_PLAYBOOK.md`, `DATA_CATALOG.md` |
| Vzorce a bezpečné interpretace | `METHODS.md`, `../public/prezentace/math.mjs` |
| Rozpracování zadání a evidence | `templates/project.md`, `templates/evidence.json` |
| Nácvik tří různých témat | `EXERCISES.md` |
| Video a offline záloha | `VIDEO_GUIDE.md` |
| Co zachováváme z Děčína | `DECIN_PARITY.md` |
| Ověření před publikací | `QA_CHECKLIST.md` |

## Spuštění

Z kořene projektu:

```sh
python -m http.server 4173 --directory public --bind 127.0.0.1
# V prohlížeči: http://127.0.0.1:4173/prezentace/
node tools/competition.mjs check
node tools/competition.mjs catalog --write
node tools/competition.mjs exercise
node --test tests/competition-kit.test.mjs
```

Web nevyžaduje npm build ani CDN. Mapa, graf a katalog používají existující data. `file://` není podporované; spusť HTTP server. `catalog --write` pouze obnoví dokumentaci z veřejných manifestů. `exercise` vytiskne reálný PVGIS údaj a výsledek výslovně hypotetického 100kWp příkladu, nikoli investiční doporučení.

## V den finále

Vlož přesné znění zadání do Codexu a řekni: „Postupuj podle `AGENTS.md` a `competition/COLLABORATION.md`. Nejprve se mnou stručně prober řešení, nepouštěj se zatím do práce.“ Codex navrhne 2–3 směry, doporučí jeden a položí jednu otázku. Až spolu schválíte konkrétní řešení a výslovně odsouhlasíš začátek implementace, má vyplnit projektovou šablonu, spočítat varianty a upravit `public/prezentace/deck.json`. Během práce se znovu ptá, pokud vyvstane skutečná obsahová, ekonomická, datová nebo prezentační volba. Hotová prezentace nesmí zůstat pracovním příkladem.

Role lze rozdělit: jeden hlídá data, výpočty a demo, druhý problém, mentora, ekonomické vstupy a argumentaci. Nejde o pevné rozdělení jmen. Každý musí umět vysvětlit výsledek i jeho hranice.

## Co víme o formátu

Oficiální stránka ENOL uvádí finále 12.–13. 11. 2026, práci na tématech s mentory a pětiminutovou prezentaci. Přesný čas projektové práce, aktuální hodnoticí váhy a podmínky použití připraveného kódu/AI musí tým potvrdit podle letošních pokynů. Nepovažujte staré ročníky za současná pravidla.

Zdroj ověřený 7. 11. 2026: https://www.energeticka-gramotnost.cz/olympi%C3%A1da

Šablona plánuje 285 sekund řeči + 15 sekund rezervy. Je to náš návrh, ne pravidlo soutěže. Orientační pracovní rozpočet při 4 hodinách: 20 min problém a mentor, 80 min výpočet/demo, 45 min ekonomika a rizika, 45 min prezentace, 30 min nácvik a záloha. Přizpůsobte skutečně oznámenému času.

## Vědomé hranice první sady

- Součástí není hotový projekt na neznámé zadání ani automatický generátor obsahu.
- Kalkulačky nemají fiktivní tržní ceny, emisní faktory ani garantovanou návratnost.
- Neobsahuje originální grafické logo týmu ani fontové soubory; používá textový název a místní fonty. Schválené logo přidejte pouze z originálu s ověřeným původem, ne překreslením.
- Video manuál a storyboard jsou připravené; žádné finální namluvené video zatím vytvořené není.
- Print CSS není plnohodnotný export interaktivní mapy. Mapový slide potřebuje ověřený screenshot pro statické odevzdání.
- GitHub Pages zpřístupní `/prezentace/` až po sloučení a úspěšném nasazení. Lokálně je dostupná ihned.

## Proč AGENTS.md

Je to krátký vstupní rozcestník pro Codex, nikoli nový agent. Oficiální dokumentace: https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex
