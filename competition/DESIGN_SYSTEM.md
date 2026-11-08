# Design manuál

**Výchozí inspirace, ne závazná šablona.** Na soutěži má prezentace přesvědčivě odvyprávět silný nápad; Codex smí navrhnout úplně novou kompozici, scénu, grafický styl i animace, pokud zachová konzistentní identitu Týmu Trampolín, čitelnost a pravdivost dat. Z Děčína jsou pro prezentaci povinné **pouze šipky a časovač**. Referenční paleta vychází z https://github.com/hphugosm/TT-Decin/blob/main/BRAND_BIBLE.md; nevyžaduje stejný layout.

## Tokeny

Jediný implementovaný zdroj barev pro šablonu: `public/prezentace/tokens.css`.

| Role | Hodnota | Použití |
|---|---|---|
| Hlavní modrá | #173DA5 | ovládání, zvýraznění, hlavní datová řada |
| Text | #1D2940 | obsahové nadpisy a hodnoty |
| Vedlejší text | #596A82 | zdroje a čitelné popisky; tmavší než starší #65738A |
| Pozadí | #F7F9FC | stránka a snímek |
| Panel | #FFFFFF | grafy, karty |
| Linka | #DFE5EE | oddělení, mřížka |
| Srovnání | #DE7524 | odlišná varianta; ne automaticky „špatné“ |
| Úspěch / upozornění | #23715D / #A52B45 | vždy i slovní vysvětlení |

Font: Inter, pokud je už nainstalovaný; jinak systémový sans-serif. Nevázat prezentaci na síťové stahování písma. Žádné fonty nepřibalovat. Preferovat jednu rodinu napříč slidy; česká diakritika a české formátování čísel.

## Kompozice

**Volná dramaturgie:** každý snímek nebo animovaná scéna má jednu silnou hlavní myšlenku; polohu nadpisů, množství map, panelů, grafů i typografii lze změnit. Nepředepisuj formát obrázků ani počet scén. Navigace šipkami a časovač musí zůstat použitelné i nad živým demem.

16:9 je cílová projekce, rozhraní se přizpůsobí i 16:10. Nadpis 32–58 px, text přibližně 24–32 px, grafy alespoň 16 px; ověřit na projektoru. Zdroj a rok nesmí zmizet kvůli estetice. Rohy 14 px, rozestupy násobky 8, 12, 16 a 24 px. Bílé karty, jemné okraje, minimum stínů.

## Datová pravidla

- Choropleth: jedna metrika, jedna srozumitelná legenda, jednotka a období. Rozsah musí při animaci zůstat srovnatelný.
- Žádná duhová paleta pro jednu číselnou veličinu. Divergentní škála pouze s významovým středem.
- Barva neznamená automaticky „lepší“. CO₂ nebo instalovaný výkon potřebují kontext.
- Chybějící hodnoty odlišit textem/šrafou od nuly. Mezery v čase nepřeklenovat vymyšlenými daty.
- Děčínské barevné významy „migrace/přistěhovalí“ se do energetiky nepřenášejí. Existující energetická mapa má vlastní škály v manifestu; ty zachovat.
- Graf: viditelné jednotky, období a zdroj; sloupce od nuly. Tečky pro nesouvislé roční řady. Pro detailní časové křivky přerušit spojnice v mezerách.
- Srovnání dvou variant má stejný rozsah os. Porovnání obcí neznamená automaticky stejné období dat.
- Měření / model / předpoklad rozlišit slovně. Umělý příklad nesmí vypadat jako historické měření.

## Komponenty k opětovnému použití

`title-slide`, `cards`, `chart-panel`, `metric-value`, `source-note`, `econ-layout` a iframe živé mapy jsou hotové v `public/prezentace/`. Nový slide může být samostatná speciální scéna, animované srovnání nebo vlastní renderer. Stávající komponenty recykluj, pokud pomáhají; nepodřizuj jim příběh.

Pro diagrams použij tři čitelné bloky vstup → rozhodnutí → výstup; tok energie odliš od peněz. Pro video použij stejné tokeny, úvodní a závěrečný snímek. Nenavrhovat nové logo. Text „Tým Trampolín“ je označení týmu, nikoli náhrada schválené značky.

## Přístupnost a animace

Ovládání klávesnicí, viditelný focus, textové popisky a alternativa grafu v tabulce. `prefers-reduced-motion` vypíná přechody. Animace slouží vysvětlení, ne čekání; předchozí → další má fungovat i při rychlém mačkání. Nevracet do šablony rozsáhlé efekty specifické pro migraci.
