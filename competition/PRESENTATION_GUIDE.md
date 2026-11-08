# Prezentační šablona

Funkční základ v `public/prezentace/`, inspirovaný ovládáním TT-Decin. Čistý HTML/CSS/JS, žádné přihlašování, CDN nebo AI API.

## Obsah versus engine

Upravuj primárně `deck.json`. `app.mjs` řeší přepínání, grafy, mapové iframe a časovač; `tokens.css` design; `math.mjs` testovatelné výpočty. Změna projektu nesmí vyžadovat přepsání enginu.

Dostupné typy snímků:

| type | Smysl | Pole navíc |
|---|---|---|
| title | problém, cílový uživatel | lead |
| chart | skutečná časová řada z existujícího MetricEngine | metric, territory, normalization |
| map | živá EnergoMapa | frame |
| steps | mechanismus řešení | items: title/text |
| economics | transparentní kalkulačka | vstupy zadá uživatel |
| conclusion | pilot, výsledek, omezení | lead, items |

Každý snímek má unikátní `id`, `title`, rozpočet `seconds` a neveřejné při projekci `notes`. `template: true` ukazuje upozornění na pracovní šablonu; nastav `false` až po doplnění zadání, důkazů a kontroly. Výchozí příklad populace není argument pro konkrétní energetický návrh.

Příklad konfigurace grafu:

```json
{"id":"proof","type":"chart","title":"Konkrétní doložitelný závěr","metric":"population","territory":"CZ042","normalization":"absolute","seconds":45,"notes":"Co přesně z grafu plyne a co nikoli."}
```

Platná ID a jednotky zkontroluj přes `tools/competition.mjs check` a katalog. Graf používá existující agregace, nikoli vlastní sčítání. Má tabulkovou alternativu, rok, zdroj a omezení. Volbu metriky mění Codex v JSON, uživatel nepřepisuje data.

## Mapy

Konfigurace `frames` obsahuje ID a relativní URL. Například:

```json
{"energy-map":{"url":"../?metric=solar_capacity&territory=CZ&normalization=absolute","title":"Licencovaný přiřazený výkon FVE"}}
```

Více slidů se stejným `frame` sdílí jediný zachovaný iframe. Různá nastavení map musí mít různá ID. Iframe se nepřesouvá ani znovu nenačítá při návratu. Přednačítá se nejvýše další mapový slide. Bezpečnostně jsou povoleny jen URL stejného originu; nevkládej cizí stránky nebo tajné tokeny. Po přechodu z mapy se pozastaví její přehrávání a média. Aktuální implementace očekává mapu s prvkem `#map`, ne libovolný cizí dashboard.

Prezentace zachovává šipky i po kliknutí do mapy. Pole, posuvníky a otevřené dialogy mají přednost. Esc vrací do rozcestníku, F přepíná fullscreen. Časovač se spouští a pauzuje kliknutím; změna snímku ho neresetuje. Při opuštění prezentace nebo skrytí karty se pozastaví.

## Doporučený příběh na 5 minut

30 s problém → 45 s důkaz → 55 s lokalita/demo → 55 s mechanismus → 65 s výsledky a ekonomika → 35 s pilot a omezení. Zbývá 15 s rezerva. Je to šablona, ne povinné pořadí. U tématu komunikace nebo regulace nahradit mapový slide vhodným prototypem; není důvod mapu násilně použít.

Každé tvrzení formuluj jako výsledek, nikoli název kapitoly. Výsledek modelu doplň baseline a podmínkami. K prototypu řekni, co skutečně funguje a co je jen návrh. Při diskusi měj po ruce detail zdrojů a alternativní varianty.

## Ekonomika a export

Formulář vyžaduje explicitní investici, roční hrubý přínos, roční náklady, horizont a diskont. Zdroj parametrů ulož do projektové evidence. Pro finální vystoupení je lepší výsledky předem ověřit a prezentovat jako KPI a graf, ne ztrácet čas vyplňováním.

Rozcestník umožňuje stáhnout poznámky jako Markdown. Print CSS je záloha textů a již načtených grafů; není slíbený věrný PDF export živé mapy. Před tiskem navštiv grafové snímky, mapy nahraď ověřenými screenshoty a tisk vizuálně zkontroluj. Obdobně screenshot musí obsahovat legendu, zdroj, datum a jednotku.

## Prohlížečové testy

Ověř hlavní projektové URL i podcestu `/energomapa-cr/prezentace/`, šipky, Esc, fullscreen, časovač, mapový focus, zachování nastavení při návratu, rozměry 1440×900 a 1280×720, chybějící zdroj, reduced motion a lokální start bez internetu. Samotné otevření HTML není plný smoke test.
