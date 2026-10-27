# Bodové vrstvy 0.4.0

Produkce obsahuje dvě skutečné vrstvy: `charging_stations` (záznamy MPO s původními GPS) a `industrial_facilities` (provozovna × rok hlášení CO₂ EEA). Počet průmyslových bodů není počet unikátních fyzických závodů. XML ERÚ pro elektrárny a úložiště nedává bezpečné souřadnice zařízení; centroid obce za ně nevydáváme.

Manifestová položka má `id`, `name`, `type`, relativní `path`, `source` a počet záznamů. Soubor má `schemaVersion:1`, `layerId`, společný `source` a `points`. Každý bod obsahuje `id`, `type`, `name`, WGS84 `lat`/`lon`, `municipalityCode`, `regionCode` a `properties`; historické body mohou mít také `year`. Podrobnosti a veřejné schéma: [datový model](data-model.md), `public/data/points/schema.json`.

`PointLayerStore` validuje jednoznačná ID, typ, konečné souřadnice a vazbu obec → kraj. Uchovává cache a sdílí souběžná načtení. Podporuje i původní GeoJSON formát 0.3 a nabízí GeoJSON adapter. O datech umožňuje vybranou vrstvu explicitně načíst a zkontrolovat počet bodů; otevření aplikace ani přepnutí metriky body nestahuje. Současné kreslení všech vrstev není potřebné pro tuto iteraci.

MPO řádky bez stabilního ID mají ID odvozené ze zdrojového řádku; opakované identity jsou přiznané příznaky, nikoli automaticky deduplikované nebo sloučené fyzické lokality. EEA body zachovávají identifikátor provozovny, rok, sektor a CO₂. Podrobnosti: [MPO](charging-methodology.md), [EEA](industry-methodology.md).

Bodové hodnoty se k obecním součtům znovu nepřičítají; obecní data byla z těchto zdrojů již vytvořena v pipeline. Raw podklady nejsou součástí webu.
