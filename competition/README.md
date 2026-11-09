# Soutěžní sada · EnergoMapa

Podklady pro práci přes Codex. Žádný chatbot v aplikaci, serverový AI backend ani vlastní orchestrace.

## Co je připravené

| Potřeba | Kde začít |
|---|---|
| Dialog a velká soutěžní strategie | `COLLABORATION.md`, **`MOONSHOT_STRATEGY.md`**, `../AGENTS.md`, `../README_CODEX.md` |
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
| Přínos, skutečný uživatel a úplné odevzdání | **`REALITY_CHECK.md`** |

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

Vlož přesné znění zadání do Codexu a řekni: „Postupuj podle `AGENTS.md` a `competition/COLLABORATION.md`. Nejprve se mnou stručně prober řešení, nepouštěj se zatím do práce.“ Codex navrhne 2–3 **ambiciózní** směry, doporučí jeden a položí jednu otázku. Až spolu schválíte řešení a výslovně odsouhlasíš začátek implementace, má vytvořit **technicky náročné, ale funkční soutěžní jádro** a pak jej tvrdě zkritizovat. První hotová verze není konec práce. Během vývoje se ptá na podstatná rozhodnutí, s blížícím se deadlinem ořezává méně důležité funkce. `public/prezentace/` a `deck.json` lze svobodně změnit nebo nahradit: povinné jsou **jen šipky a časovač**. Pětiminutový pitch musí prodat hodnotu řešení, ne seznam funkcí.

Role lze rozdělit: jeden hlídá data, výpočty a demo, druhý problém, mentora, ekonomické vstupy a argumentaci. Nejde o pevné rozdělení jmen. Každý musí umět vysvětlit výsledek i jeho hranice.

## Co víme o formátu

Oficiální stránka ENOL uvádí finále 12.–13. 11. 2026, práci na tématech s mentory a pětiminutovou prezentaci. Přesný čas projektové práce, aktuální hodnoticí váhy a podmínky použití připraveného kódu/AI musí tým potvrdit podle letošních pokynů. Nepovažujte staré ročníky za současná pravidla.

Zdroj ověřený 7. 11. 2026: https://www.energeticka-gramotnost.cz/olympi%C3%A1da

Šablona plánuje 285 sekund řeči + 15 sekund rezervy, pouze jako výchozí příklad. Pro **modelový pětihodinový limit**: 0–30 min volba velké vize a odsouhlasení, 30–100 min experiment proti silné baseline a test nejcitlivějšího předpokladu, 100–210 min intenzivní stavba nejtěžšího jádra, 210–255 min stabilizace a škrty, 255–300 min pitch, shodné finální exporty a rozbalení/spuštění odevzdání v čistém prostředí. První třetina se počítá od startu včetně diskuse; milník nikdy nenahrazuje souhlas uživatele. **Když je první verze hotová dřív, navazuje kritika a další iterace.** Skutečný limit má vždy přednost. Podrobně `MOONSHOT_STRATEGY.md` a `REALITY_CHECK.md`.

## Vědomé hranice první sady

- Součástí není hotový projekt na neznámé zadání ani automatický generátor obsahu.
- Kalkulačky nemají fiktivní tržní ceny, emisní faktory ani garantovanou návratnost.
- Neobsahuje originální grafické logo týmu ani fontové soubory; používá textový název a místní fonty. Schválené logo přidejte pouze z originálu s ověřeným původem, ne překreslením.
- Video manuál a storyboard jsou připravené; žádné finální namluvené video zatím vytvořené není.
- Print CSS není plnohodnotný export interaktivní mapy. Mapový slide potřebuje ověřený screenshot pro statické odevzdání.
- GitHub Pages zpřístupní `/prezentace/` až po sloučení a úspěšném nasazení. Lokálně je dostupná ihned.

## Proč AGENTS.md

Je to krátký vstupní rozcestník pro Codex, nikoli nový agent. Oficiální dokumentace: https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex
