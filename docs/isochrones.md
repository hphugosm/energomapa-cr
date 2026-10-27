# Isochrony v EnergoMapě 0.5.0

Funkční statické MVP zobrazuje **skutečné silniční polygony jízdy autem pro 15/30/60 minut**, ne kruhy odvozené ze vzdálenosti. Obsahuje 14 počátků: 13 různých krajských sídel (Praha je sídlem Prahy i Středočeského kraje) a Děčín jako další okresní město. Počátek je geometrický centroid obce z katalogu, nikoli obecní úřad či vyhledaná adresa; Valhalla jej přichytí k síti.

Uživatel vybere konkrétní uložený počátek. Výběr jiné obce nebo bodu **nemění uložený počátek**. `nearest()` pouze doporučuje nejbližší dostupný počátek a vrací vzdušnou vzdálenost; `load()` vyžaduje jeho výslovné ID. Mapa i popis musí vždy uvést skutečný původ polygonu.

## Posouzení řešení

- **Valhalla** je open source a [oficiálně nabízí veřejný FOSSGIS demo endpoint](https://valhalla.github.io/valhalla/) s fair-use pravidly. Pro jednorázové MVP jsme provedli malý sériový batch 14 dotazů, minimálně pět sekund mezi dotazy, identifikace User-Agent a X-Client-Id, a archivovali kompletní odpovědi. Běžný web demo server vůbec nevolá. [API dokumentace](https://valhalla.github.io/valhalla/api/isochrone/api-reference/) popisuje síťové kontury a až čtyři intervaly. Při ověření demo endpoint **odmítl 120 minut** chybou `151 Exceeded max time: 60`. Proto 120 minut nezobrazujeme jako dostupný statický výsledek a nevyrábíme náhradní kruh.
- **OpenRouteService** má [veřejný limit jedné hodiny pro automobilové isochrony](https://openrouteservice.org/restrictions/). Pro dvě hodiny by také vyžadoval vlastní backend; veřejný hosted provoz obvykle vyžaduje API klíč. Do základního webu jsme jej nepřidali.
- **GraphHopper** podporuje [vlastní `/isochrone` server](https://github.com/graphhopper/graphhopper/blob/master/docs/web/api-doc.md) s `time_limit` v sekundách a `buckets`. Je alternativou pro vlastní infrastrukturu, ale potřeboval by jiný adaptér. MVP používá jeden ověřený kontrakt Valhalla.

## Reprodukce a aktualizace

```sh
# Explicitní omezená aktualizace z veřejného demo endpointu:
.venv/bin/python pipeline/isochrones.py --download
# Offline reprodukce pouze z připnutých odpovědí:
.venv/bin/python pipeline/isochrones.py
```

V `data/raw/isochrones/{originId}.json.gz` je kompletní odpověď poskytovatele, souřadnice, parametry, endpoint, čas stažení a původ dat. Hash cache je v `data/sources/isochrones.json` a globálním registru. `build_isochrones()` kontroluje SHA-256, parametry, přítomnost všech kontur a topologickou validitu polygonů přes Shapely. Zapisuje `public/data/isochrones/manifest.json` a samostatné GeoJSON po počátcích; frontend načítá pouze vybraný soubor a sdílí cache souběžných požadavků.

Provider nevrací přesnou verzi OSM grafu v polygonové odpovědi. **Přesně reprodukovatelný je offline build z archivovaných odpovědí; nové síťové přepočítání se může lišit.** Datum stažení není vydáváno za datum silničních dat. Při změně parametrů se stará cache odmítne, ne přepíše skrytě.

## Vlastní routing bez placeného API

GitHub Pages slouží statické soubory a nemůže provozovat routing engine. Pro libovolný bod a 120 minut doporučujeme lokální nebo vlastní Valhalla. [Oficiální Docker postup](https://github.com/valhalla/valhalla/blob/master/docker/README.md):

```sh
mkdir -p routing-data
# Před prvním buildem stáhněte a připněte OSM PBF + SHA-256 pro ČR A okolní země.
# Samotná ČR ořízne síťové cesty přes hranice, zvlášť u 120 min.
docker run -d --name energomapa-routing -p 127.0.0.1:8002:8002 \
  -v "$PWD/routing-data:/custom_files" \
  ghcr.io/valhalla/valhalla-scripted:latest
```

`latest` je pouze příklad spuštění z upstream dokumentace: pro opakovatelné soutěžní prostředí image připněte na konkrétní ověřený digest, zaznamenejte OSM PBF hash a výsledný graf a vypněte automatické aktualizace. V generovaném `routing-data/valhalla.json` nastavte `service_limits.isochrone.max_time_contour` alespoň `120`, ponechte čtyři kontury a restartujte službu. Zvýšení limitu může vyžadovat více RAM a času. Tento repozitář nepředstírá, že lokální Docker byl spuštěn nebo otestován.

Python `download_isochrones(root, endpoint, origin_list, minutes=[15,30,60,120])` umožňuje batch pro vlastní endpoint; omezení 14 měst a 60 minut platí pro veřejné demo. Pro větší dávky použijte vlastní server, ne demo. Arbitrární počátek lze do `origin_list` zadat s vlastním ID, názvem a EPSG:4326 souřadnicemi.

Frontend exportuje `requestExternalIsochrones({endpoint,lat,lon,minutes})`: bez **výslovně zadaného endpointu** neodešle žádný dotaz. Konfigurace serveru musí umožnit odpovídající CORS a hlavičku X-Client-Id; veřejný HTTPS web nemusí smět volat lokální HTTP server kvůli browser bezpečnostním pravidlům. Pro lokální použití spusťte lokálně také statický web, nebo použijte vlastní HTTPS proxy. Selhání volitelného routingu neblokuje statické městské polygony.

## Co polygon znamená

Směr je **z počátku ven**, režim `auto`; bez požadovaného času odjezdu a bez příslibu živé dopravy. Parametry `polygons=true`, `denoise=1`, `generalize=100` určují aproximaci kontur. Drobné oddělené ostrůvky se mohou odstranit a síť má chyby či neaktuální omezení. Jde o analytický odhad, nikoli navigaci nebo garantovaný dojezd. Kontury jsou vnořené plochy, ne disjunktní prstence; vykreslují se od nejdelšího času k nejkratšímu.

Povinná atribuce při zobrazení/exportu: **© OpenStreetMap contributors · Valhalla / FOSSGIS e.V.**
