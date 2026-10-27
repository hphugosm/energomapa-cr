# Datový kontrakt 0.4.0

EnergoMapa má statický backend: Python vytvoří ověřené JSON a GeoJSON, GitHub Pages je poskytne prohlížeči. Živá API se při otevření mapy nevolají. Katalog vzniká v `pipeline/catalog.py`; adaptér řeší zdrojovou metodiku, společný engine řeší výběr, agregaci, normalizaci a čas bez větví pro konkrétní energetické ID.

## Manifest, území a zdroje

`public/data/manifest.json` obsahuje `schemaVersion`, `version`, `defaultMetric`, `metricAliases`, `categories`, `normalizations`, `colorScales`, `metrics`, cesty `territories`, `geography`, `sources`, `validation` a pole `points`. Cesty jsou relativní k datovému adresáři, takže fungují také pod podadresářem GitHub Pages.

Metrika má například následující kontrakt; vlastní názvy, zdroje a data musí dodat adaptér:

```json
{
  "id": "example_capacity",
  "name": "Příklad ověřeného výkonu",
  "unit": "MW",
  "category": "electricity",
  "geography": ["country", "region", "municipality"],
  "years": [2026],
  "timeType": "snapshot",
  "status": "verified",
  "coverage": "partial",
  "aggregation": "sum",
  "normalizations": ["absolute", "per_capita", "per_km2"],
  "colorScale": "electricity",
  "path": "metrics/example_capacity.json",
  "sourceId": "source_registry_id",
  "source": {
    "name": "Poskytovatel a dataset",
    "url": "https://example.org/dataset",
    "asOf": "2026-10-01",
    "methodology": "Definice hodnot a územního přiřazení"
  },
  "profile": true
}
```

Centrální registr `data/sources/registry.json` je generovaný ze zdrojových metadat a metrik. Publikovaná kopie `sources.json` uvádí poskytovatele, dataset, URL, datum stažení, licenci/podmínky, frekvenci aktualizace, časový rozsah a příslušná ID metrik. Každá karta a bod zachovává provenance svého zdroje; samotné číslo bez této vazby nestačí.

`territories.json` obsahuje pole `territories` s `id`, `level`, `parentId`, názvem a jmenovateli, například `population`, `areaKm2`. Hierarchie je ČR → kraj → obec; přesné šestimístné obecní kódy se nepřevádějí na názvy. `centroid` je objekt `{lat, lon}` v EPSG:4326. Je to modelový či navigační bod území, nikoli skutečná poloha zařízení.

Stabilní starší ID zůstávají zachována. Alias `installed_generation_capacity` odkazuje na `generation_capacity`, `solar_pv_capacity` na `solar_capacity`, `ev_charging` na `ev_charging_stations`, `industrial_co2` na `industrial_co2_tonnes` a `solar_potential` na `solar_potential_kwh_kwp_year`. Alias `battery_storage` vede na výslovně nedostupnou energetickou kapacitu MWh; nezaměňuje ji s výkonem MW. Skutečný seznam aliasů vždy určuje manifest.

## Dataset a stav hodnoty

```json
{
  "schemaVersion": 1,
  "metricId": "example_capacity",
  "status": "verified",
  "values": {
    "2026": {"554782": 12.5, "562335": null}
  },
  "statuses": {
    "2026": {"562335": "missing"}
  }
}
```

Klíče let jsou řetězce, hodnoty konečná čísla nebo `null`. NaN, záporné hodnoty u nezáporných veličin, neznámé kódy a rozpory schématu jsou validační chyby. Volitelné `statuses[rok][kód]` rozlišuje `missing` (chybí), `not_applicable` (nevztahuje se) a `unavailable` (nedostupné). Stav nesmí doprovázet dostupné číslo. Nula je skutečná ověřená nula, nikoli náhrada za chybějící řádek.

Stav metriky `verified` znamená ověřený zdroj a zpracování, nikoli automaticky úplné pokrytí či měřenou realitu. Model PVGIS je ověřený model. `unavailable` má prázdné roky a žádný dataset; produkční katalog 0.4.0 neaktivuje `demo`. Engine vrací `valueStatus: available` pro dostupné číslo nebo konkrétní stav chybění spolu s `coverage`, `expected`, `partial` a `coveredIds`.

## Čas a profil

`timeType` je `timeseries`, `snapshot` nebo `static`. Skutečná řada podporuje časové ovládání a graf. Snapshot vyjadřuje jedno datum `source.asOf`; neposkytuje dopočítanou historii. Statický model má referenční období, ne pozorovanou roční změnu. U PVGIS je rok 2023 technickým klíčem posledního roku reference 2005–2023.

Energetický profil vybírá ověřené metriky s `profile: true` a načítá je po otevření panelu. Pro každou volí poslední dostupný stav a vlastní datum/období; nepřepisuje datum podle slideru jiné metriky. Díky tomu je výslovně vidět rozdíl mezi Sčítáním 2021, licencovaným výkonem 2026 a klimatickou referencí PVGIS.

## Agregace a normalizace

`aggregation: sum` patří k aditivním počtům, výkonům nebo hlášeným tunám. Vyšší území sčítají dostupné obce a zachovávají neúplné pokrytí. Nepřiřazený výkon se nerozděluje do obcí odhadem. Přímý krajský údaj sám nedokládá pokrytí všech obcí.

`area_weighted_mean` slouží modelovým intenzitám PVGIS: součet obecních hodnot násobených rozlohou dělený součtem rozloh pokrytých obcí. Není to celková možná výroba ani potenciál střech. Chybějící váhy se nezaměňují za nulu.

| Normalizace | Výpočet a reference |
|---|---|
| `absolute` | Původní jednotka |
| `per_capita` | Hodnota / obyvatelstvo, faktor **1**, baseline 2025 |
| `per_1000_capita` | Hodnota / obyvatelstvo × **1000**, baseline 2025 |
| `per_km2` | Hodnota / rozloha v km² |
| `per_household` | Hodnota / hospodařící domácnosti, Sčítání 2021 |

Normalizace dělí pouze jmenovateli stejných pokrytých obcí. Chybějící či nulový jmenovatel vrací chybějící výsledek. `denominatorMetric` může lazy načíst jiný dataset; `denominatorYear: 2021` vyjadřuje pevnou referenci domácností. Označení reference je součástí ovládání, tedy například výkon 2026 dělený domácnostmi 2021 netvrdí současný stav domácností. Statické PVGIS metriky povolují pouze absolutní zobrazení. Meziroční změna vyžaduje bezprostředně předchozí kalendářní rok a stejné pokrytí.

## Bodové vrstvy

Vrstva v `manifest.points` obsahuje `id`, `name`, `type`, `path`, `source` a počet bodů. Jednotný produkční soubor má následující podobu:

```json
{
  "schemaVersion": 1,
  "layerId": "example_facilities",
  "source": {"name": "Oficiální evidence", "url": "https://example.org/dataset"},
  "points": [{
    "id": "stable-source-id",
    "type": "industry",
    "name": "Zdrojový název zařízení",
    "lat": 50.1,
    "lon": 14.4,
    "municipalityCode": "554782",
    "regionCode": "CZ010",
    "properties": {}
  }]
}
```

Příklad je pouze ilustrace kontraktu. Souřadnice produkčních bodů musejí pocházet ze skutečného zdroje; nikdy se nevytvářejí z centroidu obce. `properties` nese zdrojové identifikátory, technické vlastnosti nebo skutečné roky zařízení. Průmyslová vrstva může obsahovat historické provozy: aktivita v konkrétním roce se neurčuje pouhou přítomností bodu. Provenance je společná na vrstvě a nemusí se opakovat tisíckrát v jednotlivých bodech.

`PointLayerStore` načte vrstvu až při jejím zapnutí, ověří ID, konečné souřadnice a vazbu obec/kraj a převede plochý kontrakt na interní GeoJSON. Podporuje i starší GeoJSON kontrakt. Cache a probíhající požadavky se sdílejí; chyba umožní nové načtení. Bodové hodnoty se automaticky nepřičítají k obecním statistikám, což by vedlo k dvojímu započtení. ERÚ úložiště bez souřadnic zůstávají v auditu mimo bodovou vrstvu.

## Build a kontroly

Adaptér vrací metadata, datasety, audit a případně bodové vrstvy. Katalog sjednotí pole, doplní source ID a normalizace. Build ověří schémata, území, čas, nezápornost, součty a pokrytí, vytvoří výstupy, zdrojový registr a validační report. Běžný build nevolá síť. Obnova konkrétní rodiny je výslovná přes `--download-family`; všechny následné produkční výstupy vznikají z připnutých vstupů.

Testy pokrývají skutečné adaptační chyby, nulové/chybějící hodnoty, alokaci, duplicitní ID, jednotky, agregaci a lazy loading. Reprodukovatelnost se dokládá opakovaným buildem a shodou hashů; počet datových souborů, pokrytí a browser smoke test jsou uvedeny ve [výsledném protokolu](verification.md).
