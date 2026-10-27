# Sluneční potenciál: předpočítané modely PVGIS

Vrstva není evidence elektráren, výroba za konkrétní kalendářní rok ani součet možných střešních instalací. Ukazuje modelovou průměrnou roční výrobu jednotkové FVE v centroidu obce (kWh/kWp/rok). Každá z 6 258 obecních a vojenských územních jednotek má vlastní skutečný výpočet JRC. Hodnoty se nedopočítávají interpolací ani z krajského vzorku.

## Zdroj a model

Používáme explicitně verzovaný [PVGIS 5.3](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5_en), databázi PVGIS-SARAH3, dlouhodobé období 2005–2023. [Oficiální manuál](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/pvgis-5-user-manual_en) uvádí toto období pro SARAH3. Rok 2023 v datovém klíči znamená konec referenčního období; `modelled: true`, `timeType: static` a `referencePeriod` brání prezentaci jako historické časové řady. Novější samostatné API v6 má odlišný kontrakt a není skrytě zaměňováno za tento připnutý model.

Každý dotaz PVcalc má: `peakpower=1` kWp, `pvtechchoice=crystSi`, `loss=14` %, `mountingplace=free`, `optimalinclination=1`, `aspect=0` (jih), `usehorizon=1` (stínění terénním horizontem), `raddatabase=PVGIS-SARAH3`, `outputformat=json`. API odpověď musí potvrdit parametry, polohu a období; odchylka zastaví build.

Centroid je geometrický centroid původního polygonu ČÚZK v EPSG:5514, následně převedený do EPSG:4326 (`always_xy=True`), nikoli střed bounding boxu nebo centroid zjednodušeného webového polygonu. Dotazy používají sedm desetinných míst. Centroid konkávního polygonu může ležet mimo polygon; nejde o adresu existující elektrárny.

## Veličiny

- `solar_potential_kwh_kwp_year`: `outputs.totals.fixed.E_y` pro 1 kWp.
- `annual_irradiation_kwh_m2`: `outputs.totals.fixed.H(i)_y`, tedy ozáření optimálně nakloněné jižní roviny, **nikoli horizontální ozáření**.
- `optimal_slope_deg`: `inputs.mounting_system.fixed.slope.value`.

Kraje a ČR používají průměr vážený rozlohou obcí; výroby jednotkového systému se nesčítají. Váha nezpřesňuje klimatický model na celou obec: jde o přehled centroidových hodnot. Normalizace na obyvatele či km² nejsou přípustné. Model nezná plochu, statiku a sklon střech, lokální překážky, vlastnictví, připojení sítě, investiční limity ani využitelnou plochu. Čísla nejsou příslibem výnosu konkrétní instalace.

## Reprodukce a limity služby

`pipeline/potential.py` provádí explicitní síťové stažení; běžný build používá pouze lokální cache. [JRC API dokumentace](https://joint-research-centre.ec.europa.eu/photovoltaic-geographical-information-system-pvgis/using-pvgis-5/api-non-interactive-service_en) uvádí limit 30 dotazů/s na IP a zakazuje AJAX přístup. Downloader má nejvýše 10 dotazů/s, nejvýše 16 vláken, timeout 90 s, až sedm pokusů a exponenciální čekání pro 429/529/5xx a síťové chyby. Dokončené obce se z validované cache znovu nestahují. Chyby se hlásí; chybějící obec zastaví publikování kompletní vrstvy.

Každý `data/raw/pvgis/{id}.json.gz` zachovává bezeztrátově celou odpověď JRC, identifikátor obce, souřadnice a parametry dotazu, endpoint, čas stažení a referenční souřadnicový systém. Gzip má nulový mtime; SHA-256 jsou v `data/sources/pvgis.json` a globálním registru vstupů. Web nikdy nevolá PVGIS.

Ruční obnovení celé cache (připravený `territories.json` musí obsahovat centroidy):

```sh
.venv/bin/python pipeline/potential.py --download --territories public/data/territories.json
```

Při změně modelu nebo souřadnic se existující cache nezamění: kontrola přesných parametrů ji odmítne. Aktualizace modelu vyžaduje záměrné nové stažení a revizi metadat; samotný offline build data neobnovuje.
