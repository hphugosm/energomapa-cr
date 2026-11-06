> Historický report původního PR #1; není popisem veřejné verze 0.6.1. Ta vynechává OTE i originál DOCX ČEPS a obsahuje 43 sad / 71 005 řádků. Viz [stav práv](data-permissions.md) a nápravný report.

# EnergoMapa 0.6.0 — databanka a přeshraniční elektřina

Implementace přidává 47 samostatných datových sad s 75 605 záznamy. Původní katalog zachovává 22 reálných metrik, výslovně nedostupnou energetickou kapacitu úložišť, dvě bodové vrstvy, 6 258 obcí a 14 krajů. Změny jsou připravené v [PR #1](https://github.com/hphugosm/energomapa-cr/pull/1); veřejný web se aktualizuje po začlenění do `main` a úspěšném deploymentu GitHub Pages.

## Funkce a data

| Oblast | Implementace a období |
|---|---|
| ČEPS | 16 176 skutečných hodinových intervalů od 1. 1. 2025 do 5. 11. 2026 v místním čase; fyzické a plánované obchodní výměny DE/PL/SK/AT, výrobní mix, zatížení, čerpání a provozní bilance |
| OTE | 92 původních denních workbooků, červenec–září 2025; 2 208 hodin cen EUR/MWh a obchodních objemů MWh, 12 zdrojových SN zachováno jako null |
| Eurostat | Roční energetické a elektrické bilance, dovozní závislost, podíly OZE; CZ/DE/PL/SK/AT/EU27, přesné období jednotlivě v katalogu |
| MPO / ČSÚ | Celková energetická bilance 2010–2024 v TJ s převody do kompatibilních jednotek |
| ENTSO-E přes Energy-Charts | Evropská výroba a zatížení CZ/DE/AT/PL/SK, výřez 1.–7. 7. 2025; vlastní čtvrthodinová či hodinová granularita, denní integrace a hodinové porovnání zatížení |
| PVGIS | Měsíční klimatologický profil výroby 1 kWp pro ČR a kraje, reference 2005–2023, vážení rozlohou; nejde o historické měření |
| EEA | Ohlášené průmyslové CO₂ a počet ohlašujících provozoven 2007–2022; CO₂ včetně biomasy, nikoli národní inventura |

Přeshraniční panel má směrové šipky, filtr hranic a období, přehrávání skutečných intervalů, graf, tabulku a export výběru. ČEPS plánovaná výměna zůstává oddělená od fyzického toku i realizovaných tržních objemů OTE. Kladné znaménko ČEPS znamená dovoz do ČR. Denní saldo hranice se neoznačuje jako hrubý dovoz/vývoz; hrubá integrovaná množství uvádí provozní bilance. Reziduum se nezamlčuje ani nevynuluje.

Databanka podporuje vyhledávání a filtr poskytovatele, časové a řadové filtry, evropská srovnání, grafy, minima/maxima a prosté aritmetické průměry. Převody MW/GW a MWh/GWh/TWh/TJ/PJ respektují rozdíl výkonu a energie. CSV/JSON export výběru zachovává metadata zdroje, jednotky a null. Každá publikovaná sada má samostatný CSV i JSON a deskriptor katalogu.

## Reprodukce a offline použití

Vstupní originály mají konkrétní URL, datum stažení a SHA-256 a jsou připnuté v globálním `data/sources/checksums.json`. Běžné `npm run build` nepoužívá síť. Obnova `python pipeline/build.py --download-databank` nejprve stáhne nové vstupy; při selhání používá předchozí snapshot se zachovaným datem. Výstupní archiv `public/data/databank/offline.zip` má 98 souborů včetně katalogu a metodik. Volitelná příprava offline aplikace ukládá přibližně 43 MB do prohlížeče. Data se automaticky nevydávají za živý stav.

## Ověření po implementaci

- `npm run build`: úspěšné sestavení a statický balíček.
- `npm test`: 97 úspěšných JavaScriptových testů.
- `python -m unittest discover -s tests -p 'test_*.py'`: 93 úspěšných Python testů.
- `python pipeline/check_determinism.py`: 201 identických datových výstupů při opakovaném offline buildu.
- Integrita ZIP a binární shoda všech CSV/JSON s publikovanými soubory: úspěšná.
- Prohlížeč desktop 1440 × 1000 a mobil 390 × 844: původní metriky a vyhledání Děčína, žádné načítání databanky při prvním otevření mapy, směrové šipky, přepínání fyzických/plánovaných/denních dat a bilance, přehrávání, filtry a CSV. Převod skutečné MPO řady TJ → GWh numericky odpovídá dělení 3,6; filtrovaný JSON zachovává zdroj a původní období. Bez chyb JavaScriptu/HTTP a bez horizontálního přetékání na mobilu.
- Offline prohlížečový průchod na kořeni i podsložce: po přípravě cache a úplném zastavení serveru fungují URL s parametry a `#databank`, katalog, historický interval obchodních toků a dodatečné načtení hranic Děčína. Nula chyb JavaScriptu a selhaných požadavků.

Jde o ověření implementovaných funkcí a regresí, nikoli nezávislý audit celkové úplnosti projektu.
