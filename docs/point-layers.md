# Bodové vrstvy zařízení

MVP obsahuje datový kontrakt a samostatný lazy store; skutečné body ani jejich UI zatím nejsou dodány. `manifest.points: []` znamená žádné dostupné zařízení. Souřadnice v testech jsou výhradně syntetické fixture a nesmějí vstoupit do produkčních dat.

## Kontrakt

Každá položka `manifest.points` obsahuje `id`, `name`, `kind`, `path` relativní k `public/data/` a `source` s povinnými `name` a `url`. Další provenance (`updatedAt`, `retrievedAt`, `methodology`, `asOf`) patří do téhož objektu. `kind` je jeden z `power_plant` (elektrárny včetně FVE), `battery`, `charger`, `industry`, `heating` (teplárny). Smíšené zdroje rozdělte do více vrstev.

Soubor vrstvy je standardní GeoJSON `FeatureCollection`. Každý `Feature` má stabilní řetězcový `id` – primární **pointid**, unikátní v rámci vrstvy. V UI použijte složený klíč `(layerId, pointid)`. `geometry.type` je `Point`; `coordinates` jsou přesně `[longitude, latitude]` v EPSG:4326, konečné hodnoty v rozsahu ±180° a ±90°.

`properties` obsahuje:

- `name`: název zařízení.
- `kind`: stejná hodnota jako u vrstvy.
- `municipalityId`: známé ID území s `level: municipality` z territories.json; kraj nestačí.
- `metrics`: objekt `{metricId: {"2025": number|null}}`. ID metrik je generické, jednotku a metodiku určuje manifest metrik. Nula je naměřená nula; null nebo chybějící rok znamená chybějící pozorování. Rok má čtyři číslice.
- `source`: nepovinná provenance konkrétního zařízení; pokud je uvedena, vyžaduje `name` i `url` a má přednost před zdrojem vrstvy.

Schéma `data/sources/point-layer.schema.json` popisuje GeoJSON a v `$defs.layer` i manifestovou položku; build jej publikuje jako `public/data/points/schema.json`, odkazovaný pomocí `manifest.pointsSchema`. JSON Schema samo nekontroluje unikátnost ID ani vazbu na číselník území – tyto kontroly provádí `PointLayerStore` při načtení. Před publikací ověřte zdrojová ID, obec a souřadnice v pipeline. Store neprovádí prostorový point-in-polygon join.

## Budoucí napojení UI

```js
import {PointLayerStore} from './js/points.mjs';
const points = new PointLayerStore(manifest, territories);
// Až uživatel explicitně zapne vrstvu:
const geojson = await points.load(chosenLayerId);
// Budoucí map adapter: renderPointLayer(chosenLayerId, geojson).
```

Konstruktor nic nestahuje. `load(id)` sdílí probíhající požadavek, validuje odpověď a ukládá úspěšná data do paměti. Další načtení téže vrstvy vrací cache; síťová i validační chyba cache nezaplní a následující `load` může požadavek zopakovat. Neznámé ID vyvolá chybu. Výsledný GeoJSON zacházejte jako s read-only daty cache.

Mapový adapter může body promítat stejnou EPSG:4326 projekcí a umístit do skupiny se stejným transformem kamery jako polygony. Ve vybraném kraji filtruje podle `municipalityId` a vztahů v territories; při změně roku vybírá `properties.metrics[metricId][year]`, missing hodnoty jasně odlišuje a ukazuje provenance. Bodové hodnoty automaticky nepřičítejte k obecním statistikám: mohlo by vzniknout dvojí započtení. Jednotku, barvy a časový rozsah přebírejte z generického manifestu metrik. Zapnutí jedné vrstvy nesmí spouštět načítání všech ostatních vrstev.

Ověření: `node --test tests/points.test.mjs`.
