# EnergoMapa 0.4.0

| Metric | Source | Geographic resolution | Time coverage | Coverage | Status |
| --- | --- | --- | --- | --- | --- |
| households | ČSÚ | obec → kraj → ČR | 2021 (snapshot) | 6254/6258 (99.94 %) | verified |
| occupied_dwellings | ČSÚ | obec → kraj → ČR | 2021 (snapshot) | 6255/6258 (99.95 %) | verified |
| population | ČSÚ | obec → kraj → ČR | 2018–2025 (timeseries) | 6258/6258 (100.00 %) | verified |
| generation_capacity | ERÚ | obec → kraj → ČR | 2026 (snapshot) | 4635/6258 (74.07 %) | verified |
| hydro_capacity | ERÚ | obec → kraj → ČR | 2026 (snapshot) | 857/6258 (13.69 %) | verified |
| solar_capacity | ERÚ | obec → kraj → ČR | 2026 (snapshot) | 4484/6258 (71.65 %) | verified |
| wind_capacity | ERÚ | obec → kraj → ČR | 2026 (snapshot) | 83/6258 (1.33 %) | verified |
| battery_storage_capacity_mw | ERÚ | obec → kraj → ČR | 2026 (snapshot) | 33/6258 (0.53 %) | verified |
| battery_storage_capacity_mwh | ERÚ | obec → kraj → ČR | — (snapshot) | 0/6258 (0.00 %) | unavailable |
| battery_storage_count | ERÚ | obec → kraj → ČR | 2026 (snapshot) | 33/6258 (0.53 %) | verified |
| district_heating | ČSÚ | obec → kraj → ČR | 2021 (snapshot) | 6255/6258 (99.95 %) | verified |
| heating_electricity | ČSÚ | obec → kraj → ČR | 2021 (snapshot) | 6255/6258 (99.95 %) | verified |
| heating_gas | ČSÚ | obec → kraj → ČR | 2021 (snapshot) | 6255/6258 (99.95 %) | verified |
| heating_heat_pump | ČSÚ | obec → kraj → ČR | 2021 (snapshot) | 6255/6258 (99.95 %) | verified |
| heating_solid_fuels | ČSÚ | obec → kraj → ČR | 2021 (snapshot) | 6255/6258 (99.95 %) | verified |
| ev_charging_points | MPO | obec → kraj → ČR | 2026 (snapshot) | 530/6258 (8.47 %) | verified |
| ev_charging_power_kw | MPO | obec → kraj → ČR | 2026 (snapshot) | 530/6258 (8.47 %) | verified |
| ev_charging_stations | MPO | obec → kraj → ČR | 2026 (snapshot) | 530/6258 (8.47 %) | verified |
| industrial_facility_count | EEA | obec → kraj → ČR | 2007–2022 (timeseries) | 49/6258 (0.78 %) | verified |
| industrial_co2_tonnes | EEA | obec → kraj → ČR | 2007–2022 (timeseries) | 49/6258 (0.78 %) | verified |
| annual_irradiation_kwh_m2 | European Commission JRC | obec → kraj → ČR | 2005–2023 (static) | 6258/6258 (100.00 %) | verified |
| optimal_slope_deg | European Commission JRC | obec → kraj → ČR | 2005–2023 (static) | 6258/6258 (100.00 %) | verified |
| solar_potential_kwh_kwp_year | European Commission JRC | obec → kraj → ČR | 2005–2023 (static) | 6258/6258 (100.00 %) | verified |

22 reálných metrik; 1 nepřipojená veličina MWh; 0 aktivních demo metrik. Dvě bodové vrstvy: 3 790 řádků MPO a 1 100 záznamů provozovna × rok CO₂ EEA. Územní číselník má 6 258 obcí/vojenských újezdů a 14 krajů.

Produkční data: 19,308,733 bajtů (18.41 MiB), načítaná lazy. Raw data se na web nekopírují.

## Zbývající mezery a omezení

- ERÚ uvádí pouze licencované zdroje. Výkon elektráren/FVE/větru/vody je publikovaný přiřazený obecní součet, nikoli celý registr. Nejednoznačné lokality a absence jsou null.
- Skupina ukládání má 39 aktivních provozoven, 162,514 MW ve 33 obcích. Neuvádí MWh ani prokazatelné rozlišení bateriové technologie. XML nemá bezpečné souřadnice zařízení; body z centroidů obcí nejsou vytvářeny.
- MPO řádky 3 790 stanic / 6 601 bodů se liší od hlavičky 3 783 / 6 591. Jde o hlášené záznamy, ne nezávisle ověřené unikátní lokality. Nominální výkon 336 558,9 kW není dostupnou kapacitou sítě. Shodná adresa/GPS neprokazuje duplicitu zařízení.
- EEA: česká skutečná řada je 2007–2022. CO₂ celkem zahrnuje biomasu; jde o prahové ohlašování, nikoli celý průmysl či EU ETS. Provozovna v každém roce je samostatným bodovým záznamem.
- PVGIS je jednotkový model v centroidu pro 1 kWp, jižní optimální sklon, 14% ztráty a průměr 2005–2023. Není potenciálem střech ani skutečnou výrobou v roce 2023. Kraj/ČR jsou průměrem váženým plochou.
- Domácnosti a vytápění jsou Sčítání 2021; populace má baseline 2025. Přepočty označují referenční roky a chybějící jmenovatel nevytváří nulu.
- Pokrytí v tabulce je podíl obcí s hodnotou, nikoli procento pokryté kapacity, emisí nebo infrastruktury.

## Ověření

- 40 JS testů a 72 Python testů prošlo.
- Kompletní offline build a kontrola opakovaného buildu: 90 identických datových výstupů.
- Kontrola všech 72 kombinací ověřených metrik a normalizací přes skutečně exportované JSON prošla. Obě skutečné bodové vrstvy prošly generic loaderem i cache kontrolou.
- Browser smoke: start, modelové období, lazy profil se všemi zdroji a omezeními, MWh bez dat, přepočet na domácnost, skutečné body v O datech a konzole bez chyb.
- GitHub Pages workflow obsahuje datový build, Python/JS testy, determinismus, čisté statické balení a deployment. Výsledek veřejného nasazení je doplněn po pushi.
