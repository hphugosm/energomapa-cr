# Analytika EnergoMapy 0.5.0

Analytický panel pracuje nad existujícím datovým modelem 0.4.0. Nepřidává měření ani automaticky nenačítá všechny metriky. Výběr kritéria určuje metriku, její vlastní rok a normalizaci; načtou se pouze potřebné datasety a případné jmenovatele. `MetricEngine` a `PointLayerStore` sdílejí cache a probíhající požadavky. Data a limity původních zdrojů zůstávají platné.

## Nejbližší zařízení

`analysis/nearest.mjs` poskytuje `NearestEngine.findNearest({lat, lon, layer, limit: 5, year})`. Načítá pouze zvolenou registrovanou bodovou vrstvu a vrací název, typ, souřadnice, properties, zdroj a vzdálenost v kilometrech. Haversinova formule používá střední poloměr Země 6 371,0088 km. Jde o **vzdušnou vzdálenost**, nikoli délku trasy či dojezdový čas; silniční dostupnost řeší samostatné isochrony.

Bez parametru roku vybere nejnovější rok dané bodové vrstvy. U snapshotu odvodí rok z data zdroje. Historické průmyslové záznamy se tak nemíchají napříč roky. Deduplicace pracuje pouze se stabilním `facilityId`, případně ID bodu; stejná adresa nebo souřadnice sama není důkaz duplicity. Shody vzdálenosti řadí deterministicky podle ID. Nová validní bodová vrstva nepotřebuje změnu nearest enginu. Elektrárny či baterie bez skutečných souřadnic nelze tímto způsobem vyhledávat.

## Filtr území

`filterTerritories({engine, conditions, territoryIds})` kombinuje podmínky logickým **AND**. Výchozí kandidáti jsou všechny obce; explicitní seznam může analýzu omezit. Kritéria používají pouze metriky známé enginu včetně registrovaných odvozených metrik. Každé má vlastní `year` a `normalization`; výchozí rok je poslední dostupný rok dané metriky, nikoli rok slideru jiné vrstvy.

Operátory jsou `>`, `>=`, `<`, `<=`, `between`, `top` a `bottom`. Interval `between` zahrnuje obě hranice. Pro `top X %` a `bottom X %` se mezi dostupnými kandidáty vybere přesně `ceil(X / 100 × počet dostupných)` hodnot. Shody se rozhodují podle kódu území: nejde o statistický percentil, který by zahrnoval všechny shodné hodnoty. Pořadí pro každý takový filtr vzniká z celého výchozího souboru kandidátů před kombinací ostatních podmínek.

Obec s chybějícím kritériem je vyřazena a počet vyřazených se vrací zvlášť. Chybění se nepřevádí na nulu. Panel ukazuje počet výsledků, umožní je seřadit a přejít na obec; mapa ztlumí nesplňující obce.

## Relativní skóre lokalit

`scoreLocations({engine, criteria, territoryIds, missingPolicy})` přijímá kladné či nulové váhy a směry `higher`, `lower` nebo `target`. Alespoň jedna váha musí být kladná. Každé kritérium používá vlastní rok a normalizaci stejně jako filtr. Doména `[a, b]` je minimum a maximum dostupných hodnot tohoto kritéria v aktuálním souboru kandidátů, počítaná před vyřazením obcí podle chybění jiných kritérií.

Pro dostupnou hodnotu `x` se dílčí skóre počítá:

- `higher`: `100 × (x − a) / (b − a)`.
- `lower`: `100 × (b − x) / (b − a)`.
- Je-li `a = b`, oba směry vrací neutrálních 50 bodů.
- `target` s intervalem `[L, U]`: 100 bodů uvnitř včetně hranic; pod intervalem `100 × (1 − (L − x) / (L − a))`, nad intervalem `100 × (1 − (x − U) / (b − U))`. Nulový jmenovatel nahrazuje implementace jedničkou; výsledek vždy omezí na 0–100.

Celkové skóre je `Σ(váha × dílčí skóre) / Σ(dostupné váhy)`. Výchozí UI používá přísnou politiku `exclude`: při chybění kteréhokoli kritéria s nenulovou vahou obec vyřadí. Volitelná politika `available` přepočítá skóre podle dostupných vah. Obec bez jediné dostupné kladné váhy se vyřadí vždy. Kritéria s nulovou vahou skóre ani úplnost neovlivňují.

**Úplnost = 100 × dostupné váhy / všechny váhy.** Není to statistická jistota ani ověření správnosti vah. Počet dostupných kritérií se uvádí zvlášť. Obec může mít 100% úplnost zvolených kritérií a přesto pracovat s dílčími zdrojovými součty; takový případ zachovává příznak `partial`.

Výsledky se řadí podle skóre sestupně a při shodě podle kódu obce. Panel ukazuje TOP 10, hodnoty faktorů, dílčí skóre, váhu, rok a úplnost. Mapa zvýrazní nejlepší lokality; CSV může obsahovat všechny hodnocené obce. Skóre závisí na doméně kandidátů: změna územního výběru může změnit pořadí i bez změny vah.

> Výsledek závisí na zvolených vahách a kritériích.

Ukázkové presety FVE, bateriového úložiště, nabíjecího hubu, teplárenství a průmyslové dekarbonizace jsou pouze editovatelné konfigurace v `analysis/presets.mjs`. Nejsou odborným doporučením vhodnosti pozemku. Neověřují připojení k síti, územní plán, dostupnou plochu ani ekonomiku investice. Aktuální scoring podporuje metrická kritéria; nearest výsledky samy o sobě nejsou automaticky vzdálenostním kritériem skóre.

## Porovnání 2–3 území

`compareTerritories({engine, territoryIds, metricIds})` požaduje 2–3 různá známá území a unikátní metriky. Každý řádek používá vlastní poslední rok či datum zdroje a zachovává jednotku, provenance, neúplnost a chybějící hodnoty. Odvozený poměr přidává období jednotlivých složek. Nejde o tabulku všech ukazatelů společně za rok 2026.

## Deklarativní odvozené metriky

`installDerivedMetrics(engine, declarations)` registruje pouze omezený tvar `numerator / denominator * positiveFactor`; faktor je volitelný a `areaKm2` je povolený územní jmenovatel. Text vzorce se nikdy nespouští jako JavaScript. Vnořené odvozené metriky nejsou podporovány. Výchozí konfigurace přidává:

```json
[
  {"id":"solar_capacity_per_1000","formula":"solar_capacity / population * 1000"},
  {"id":"generation_capacity_per_km2","formula":"generation_capacity / areaKm2"},
  {"id":"ev_charging_points_per_1000","formula":"ev_charging_points / population * 1000"},
  {"id":"industrial_co2_per_capita","formula":"industrial_co2_tonnes / population"}
]
```

Rok čitatele určuje výsledek; jmenovatel používá poslední dostupný rok **nejvýše rovný** roku čitatele. Například výkon 2026 dělený populací 2025 zůstává výslovně smíšeným obdobím, nikoli populací roku 2026. Chybějící, nulový či záporný jmenovatel nedá číselný výsledek.

Podíly se počítají z agregovaných veličin, nesčítají lokální podíly. Při metrickém jmenovateli musí čitatel i jmenovatel mít přesně stejné množiny pokrytých obcí. Při rozdílném pokrytí vrátí engine chybějící výsledek a `coverageMismatch`; nedělí například dílčí výkon celou populací kraje. To může omezit dostupnost odvozených poměrů ve vyšších územích. Rozloha se sčítá pouze za obce pokryté čitatelem.

## Body, výsledky a export

Vrstva zařízení se načítá až po zapnutí. `analysis/clustering.mjs` sdružuje body do buněk obrazovky po transformaci kamery a vyřazuje body mimo viewport. Cluster není nové fyzické zařízení; při přiblížení se rozdělí. Zdrojové souřadnice a záznamy zůstávají beze změny. Průmyslové body jsou datované záznamy zařízení a musí se zobrazovat podle příslušného roku vrstvy.

Jednotný výsledkový panel nabízí přechod na obec, CSV a kopírování stručného souhrnu. CSV zachovává chybění prázdnou buňkou, uvádí roky, jednotky a původ kritérií a escapuje textové buňky proti nechtěným tabulkovým formulím. Export souhrnu nezastupuje plný datový audit. Režim pro snímek mapy slouží k ručnímu pořízení obrázku, nejde o report generator.

Silniční dostupnost, omezené předpočítané isochrony a volitelný routing endpoint mají samostatnou dokumentaci v `docs/isochrones.md`. GitHub Pages sám routing engine neprovozuje. Nedostupnost routingu nesmí ovlivnit nearest, filtr, scoring ani původní mapu.
