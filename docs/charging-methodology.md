# Veřejné dobíjecí stanice MPO

Primární zdroj: Evidence MPO, XLSX `Seznam_verDS_2026_09_30_v00.xlsx`, zveřejněný 20. 10. 2026, stav k 30. 9. 2026. Původní soubor je připnutý SHA-256 a uložený deterministicky gzipem. `download_charging(root)` ověřuje nezměněný originál před zápisem.

Zpracovává se celý sešit včetně části pro těžká vozidla. Každý datový řádek je evidovaná stanice. Počet dobíjecích bodů přebíráme z explicitního sloupce; nesčítáme konektory (jejich souběh může být vyloučený). Výkon je nominální maximální výkon stanice v kW, není spotřeba, odběr sítě ani součet výkonů konektorů.

Zdroj neobsahuje stabilní ID stanice ani obecní kódy. GPS převádíme EPSG:4326 → EPSG:5514 a prostorově propojujeme s původními nezjednodušenými polygony obcí ČÚZK. Žádné dosazování souřadnic centroidem ani přiřazování podle podobnosti jmen. Nejednoznačné nebo neobsazené průniky zůstávají bez přiřazení.

## Zásadní omezení zdroje

Hlavička uvádí 3783 stanic / 6591 bodů, ale tělo obsahuje 3790 řádků / 6601 bodů včetně pěti těžkých stanic. Stanice také opakují kombinaci adresa, pozice, PSČ, obec a provozovatel; část je zcela totožná. Nemáme důkaz, zda jde o chybu nebo samostatná zařízení. Proto nepřidělujeme automaticky unikátní fyzickou identitu ani nededuplikujeme podle GPS. Více fyzických zařízení může oprávněně sdílet souřadnice, adresu i označení pozice; shoda není důkaz duplicity.

Všechny řádky jsou zachovány a sčítány jako evidované záznamy MPO. Metrika stanic není nezávisle ověřený počet unikátních fyzických míst. Body mají původní číslo řádku, příznak `ambiguousIdentity` a `duplicateGroup`. Neprovádíme spekulativní deduplikaci ani nevylučujeme celé obce podle podobnosti záznamů. Obec bez záznamu má null, nikoli nulu. Pouze prostorově nepřiřazené řádky se vyřazují z obecních součtů. Audit uvádí oficiální hlavičku, skutečné počty řádků, rozdíly, všechny skupiny nejednoznačnosti, dotčené obce a úplné rozdělení součtů na publikované a prostorově vyřazené. Součty jsou 3790 evidovaných stanic, 6601 bodů a 336558,9 kW. Rok 2026 je jediný snímek, ne historie.
