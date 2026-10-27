# Ověření MVP · 27. 10. 2026

## Data

Offline build prošel s připnutými vstupními SHA-256. Výstup zahrnuje 14 krajů a 6 258 obecních území včetně čtyř vojenských újezdů. Každý rok 2018–2025 obsahuje všech 6 258 populačních pozorování. Obecní součty souhlasí se zdrojovými krajskými a národními agregáty ČSÚ; ČR 2025 = 10 915 839 obyvatel.

Kontroluje se platnost původních i zjednodušených polygonů, společných hranic a výsledného zaokrouhleného GeoJSON, shoda kódů, roky a ID demo fixtures. Opakovaný offline build vytvořil stejné hashe výstupů. Podrobnosti: `data/processed/validation.json`.

## Engine a bodový model

`npm test`: 25 úspěšných testů. Kontrolují nulu proti chybějící hodnotě, agregaci, neúplné pokrytí, jmenovatele, kalendářní mezery, srovnatelnost meziroční změny, pevné domény, lazy cache a opakování chybných načtení. Neznámá nová metrika funguje přes stejný engine. Bodový model ověřuje ID, typ zařízení, geografický kód, souřadnice, pozorování a provenance.

## Průchod v prohlížeči

Ověřeno přes lokální HTTP server v integrovaném prohlížeči:

- Výchozí celá ČR, skutečná populace, 13 položek nabídky z manifestu.
- Kliknutí na kraj načte obecní hranice; kliknutí na Děčín ukáže jeho detail a ponechá obrys Ústeckého kraje.
- Vyhledání bez závislosti na diakritice, rozlišení Roudnice a Roudnice nad Labem, přechod na obec 565555.
- Návrat obec → kraj → ČR přes tlačítko a breadcrumb; nové kliknutí na kraj.
- Přepnutí na FVE demo, jasný banner DEMO, hodnota Roudnice 3,5 MW za rok 2025, přepočet na 1 000 obyvatel a km².
- Změna roku, Play a pauza; graf volí rok kliknutím. Chybějící Děčín 2024 zobrazuje pomlčku, nikoli nulu.
- Snapshot dobíjení ukazuje „Stav k 1. 10. 2026“ a vypíná slider, Play i meziroční změnu.
- Nepřipojená větrná metrika ukazuje nedostupnost a šrafování bez vymyšlených hodnot.
- Neúplné demo součty nesou pokrytí v detailu i popiscích mapy. Dialog O datech obsahuje metodiku a stav všech 13 metrik.
- Rozložení pro notebook 1280 × 720 i mobil 390 × 844; mobil nemá vodorovné přetékání. Pravý panel při nedostatku výšky samostatně scrolluje.

Statický balíček obsahuje pouze `public/`, bez Python runtime, raw podkladů, pracovního klonu, CDN a tajných klíčů. Všechny aplikační cesty jsou relativní pro GitHub Pages pod `/energomapa-cr/`.

## Veřejné nasazení

[GitHub Pages](https://hphugosm.github.io/energomapa-cr/) ověřeny v prohlížeči: ČR načetla 14 krajů a skutečný populační součet, hledání Roudnice stáhlo 354 obecních hranic Ústeckého kraje a přepnutí na FVE demo zobrazilo 3,5 MW. Konzole bez chyb a varování. [První Actions run](https://github.com/hphugosm/energomapa-cr/actions/runs/40468287939) provedl datový build, testy, balení i deployment úspěšně.
