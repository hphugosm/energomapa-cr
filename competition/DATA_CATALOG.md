# Datový katalog pro soutěž

Generováno z veřejných manifestů verze 0.6.1; obnovit: `node tools/competition.mjs catalog --write`. Nikoli živá data. Zdrojové registry a metodiky mají přednost.

## Mapové metriky

| ID | Název | Jednotka | Období / typ | Stav | Zdroj |
|---|---|---|---|---|---|
| households | Hospodařící domácnosti | domácností | 2021 / snapshot | verified | ČSÚ |
| occupied_dwellings | Obydlené byty celkem | bytů | 2021 / snapshot | verified | ČSÚ |
| population | Počet obyvatel | obyv. | 2018–2025 / timeseries | verified | ČSÚ |
| generation_capacity | Licencované elektrárny – přiřazený výkon | MW | 2026 / snapshot | verified | ERÚ |
| hydro_capacity | Licencovaná voda bez PVE – přiřazený výkon | MW | 2026 / snapshot | verified | ERÚ |
| solar_capacity | Licencované FVE – přiřazený výkon | MW | 2026 / snapshot | verified | ERÚ |
| wind_capacity | Licencovaný vítr – přiřazený výkon | MW | 2026 / snapshot | verified | ERÚ |
| battery_storage_capacity_mw | Licencované ukládání elektřiny – přiřazený výkon | MW | 2026 / snapshot | verified | ERÚ |
| battery_storage_capacity_mwh | Ukládání elektřiny – energie v MWh (zdroj neuvádí) | MWh | — / snapshot | unavailable | ERÚ |
| battery_storage_count | Licencované ukládání elektřiny – počet provozoven | provozoven | 2026 / snapshot | verified | ERÚ |
| district_heating | Obydlené byty – teplo z kotelny mimo dům | bytů | 2021 / snapshot | verified | ČSÚ |
| heating_electricity | Obydlené byty – vytápění elektřinou | bytů | 2021 / snapshot | verified | ČSÚ |
| heating_gas | Obydlené byty – vytápění zemním plynem | bytů | 2021 / snapshot | verified | ČSÚ |
| heating_heat_pump | Obydlené byty – vytápění tepelným čerpadlem | bytů | 2021 / snapshot | verified | ČSÚ |
| heating_solid_fuels | Obydlené byty – vytápění pevnými palivy | bytů | 2021 / snapshot | verified | ČSÚ |
| ev_charging_points | Dobíjecí body – hlášené MPO | evidovaných bodů | 2026 / snapshot | verified | MPO |
| ev_charging_power_kw | Dobíjecí stanice – nominální max. výkon MPO | kW | 2026 / snapshot | verified | MPO |
| ev_charging_stations | Dobíjecí stanice – záznamy MPO | evidovaných stanic | 2026 / snapshot | verified | MPO |
| industrial_facility_count | Průmysl – provozovny ohlašující CO₂ | provozoven | 2007–2022 / timeseries | verified | EEA |
| industrial_co2_tonnes | Průmysl – ohlášené emise CO₂ celkem | t CO₂/rok | 2007–2022 / timeseries | verified | EEA |
| annual_irradiation_kwh_m2 | Roční ozáření optimálně nakloněné roviny | kWh/m²/rok | 2005–2023 / static | verified | European Commission JRC |
| optimal_slope_deg | Optimální sklon FVE k jihu | ° | 2005–2023 / static | verified | European Commission JRC |
| solar_potential_kwh_kwp_year | Modelová roční výroba FVE na 1 kWp | kWh/kWp/rok | 2005–2023 / static | verified | European Commission JRC |

Územní rozlišení, agregace, normalizace, licence a omezení jsou pro každou metriku v `public/data/manifest.json` a `public/data/sources.json`. Hodnoty: `public/data/<metric.path>`. Bodové vrstvy: `manifest.points`. Neupravovat generovaná data ručně.

## Časové řady databanky

| ID | Název | Jednotka | Období | Poskytovatel |
|---|---|---|---|---|
| flows-physical | Fyzické přeshraniční toky ČR | MW | 2024-12-31T23:00:00Z → 2026-11-05T22:00:00Z | ČEPS, a.s. |
| flows-commercial | Obchodní výměna ČR · plánované toky ČEPS | MW | 2024-12-31T23:00:00Z → 2026-11-05T22:00:00Z | ČEPS, a.s. |
| flows-balance | Bilance elektřiny ČR · provozní hodinové hodnoty | MW | 2024-12-31T23:00:00Z → 2026-11-05T22:00:00Z | ČEPS, a.s. |
| flows-generation | Výroba elektřiny ČR podle typu elektrárny | MW | 2024-12-31T23:00:00Z → 2026-11-05T22:00:00Z | ČEPS, a.s. |
| flows-physical-daily | Fyzické přeshraniční toky ČR · denní energie | MWh | 2024-12-31 → 2026-11-05 | ČEPS, a.s. |
| flows-commercial-daily | Obchodní výměna ČR · plánované toky ČEPS · denní energie | MWh | 2024-12-31 → 2026-11-05 | ČEPS, a.s. |
| flows-balance-daily | Bilance elektřiny ČR · provozní hodinové hodnoty · denní energie | MWh | 2024-12-31 → 2026-11-05 | ČEPS, a.s. |
| flows-generation-daily | Výroba elektřiny ČR podle typu elektrárny · denní energie | MWh | 2024-12-31 → 2026-11-05 | ČEPS, a.s. |
| eurostat-pprd | Primární produkce — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-imp | Dovoz — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-exp | Vývoz — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-gae | Hrubá dostupná energie — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-gic | Hrubá domácí spotřeba — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-fc_e | Konečná energetická spotřeba — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-fc_ind_e | Průmysl — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-fc_tra_e | Doprava — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-fc_oth_hh_e | Domácnosti — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-gep | Hrubá výroba elektřiny — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-dl | Distribuční ztráty — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-electricity-imp | Dovoz elektřiny — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-electricity-exp | Vývoz elektřiny — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-electricity-fc_e | Konečná spotřeba elektřiny — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-electricity-dl | Distribuční ztráty elektřiny — evropské srovnání | GWh | 2000 → 2024 | Eurostat |
| eurostat-import-dependency | Energetická dovozní závislost | % | 2000 → 2024 | Eurostat |
| eurostat-renewables | Podíl obnovitelných zdrojů — celkem | % | 2004 → 2025 | Eurostat |
| eurostat-renewable-electricity | Podíl OZE v hrubé konečné spotřebě elektřiny | % | 2004 → 2025 | Eurostat |
| eurostat-renewable-heat | Podíl OZE ve vytápění a chlazení | % | 2004 → 2025 | Eurostat |
| eurostat-renewable-transport | Podíl OZE v dopravě | % | 2004 → 2025 | Eurostat |
| mpo-czech-energy-balance | MPO / ČSÚ — celková energetická bilance ČR | TJ | 2010 → 2024 | MPO / ČSÚ |
| pvgis-monthly-potential | PVGIS — měsíční model výroby 1 kWp podle krajů | kWh/kWp | 01 → 12 | European Commission JRC |
| eea-emissions-tonnes | EEA — ohlášené průmyslové emise CO₂ v ČR | t CO₂ | 2007 → 2022 | EEA |
| eea-facilities | EEA — počet českých provozoven ohlašujících CO₂ | provozoven | 2007 → 2022 | EEA |
| entsoe-public-power-cz | Evropská elektřina — Česko: výroba a zatížení | MW | 2025-06-30T22:00:00Z → 2025-07-07T21:45:00Z | Fraunhofer ISE / Energy-Charts.info |
| entsoe-daily-energy-cz | Evropská elektřina — Česko: denní energie | MWh | 2025-07-01 → 2025-07-06 | Fraunhofer ISE / Energy-Charts.info |
| entsoe-public-power-de | Evropská elektřina — Německo: výroba a zatížení | MW | 2025-06-30T22:00:00Z → 2025-07-07T21:45:00Z | Fraunhofer ISE / Energy-Charts.info |
| entsoe-daily-energy-de | Evropská elektřina — Německo: denní energie | MWh | 2025-07-01 → 2025-07-06 | Fraunhofer ISE / Energy-Charts.info |
| entsoe-public-power-at | Evropská elektřina — Rakousko: výroba a zatížení | MW | 2025-06-30T22:00:00Z → 2025-07-07T21:45:00Z | Fraunhofer ISE / Energy-Charts.info |
| entsoe-daily-energy-at | Evropská elektřina — Rakousko: denní energie | MWh | 2025-07-01 → 2025-07-06 | Fraunhofer ISE / Energy-Charts.info |
| entsoe-public-power-pl | Evropská elektřina — Polsko: výroba a zatížení | MW | 2025-06-30T22:00:00Z → 2025-07-07T21:45:00Z | Fraunhofer ISE / Energy-Charts.info |
| entsoe-daily-energy-pl | Evropská elektřina — Polsko: denní energie | MWh | 2025-07-01 → 2025-07-06 | Fraunhofer ISE / Energy-Charts.info |
| entsoe-public-power-sk | Evropská elektřina — Slovensko: výroba a zatížení | MW | 2025-06-30T22:00:00Z → 2025-07-07T21:00:00Z | Fraunhofer ISE / Energy-Charts.info |
| entsoe-daily-energy-sk | Evropská elektřina — Slovensko: denní energie | MWh | 2025-07-01 → 2025-07-06 | Fraunhofer ISE / Energy-Charts.info |
| entsoe-load-comparison | Evropská elektřina — porovnání zatížení pěti zemí | MW | 2025-06-30T22:00:00Z → 2025-07-07T21:00:00Z | Fraunhofer ISE / Energy-Charts.info |

Podrobné frekvence, datové cesty a licence: `public/data/databank/index.json`. Vyloučené zdroje zůstávají v jeho `excludedSources`; katalog je nepřidává ani nepovoluje jejich publikaci. OTE není automaticky součástí této sady.

## Rychlé odkazy v místní aplikaci

- `/prezentace/`: soutěžní šablona
- `/`: mapa obcí
- `/#electricity`: přeshraniční toky
- `/#databank`: databanka a exporty

Na GitHub Pages zachovat prefix `/energomapa-cr/`; používat relativní odkazy.
