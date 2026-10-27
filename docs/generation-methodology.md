# Licencovaný elektrický výkon: celkem, vítr a voda

Zdroj je veřejný [snímek ERÚ k 1. 10. 2026](https://eru.gov.cz/datove-sady-technologickych-energetickych-zarizeni-ke-dni-01102026-vzor-2025), jeho [XML skupiny 11](https://eru.gov.cz/sites/default/files/obsah/prilohy/tez-sk-11-2026-10-01.xml), [XSD verze 2025](https://eru.gov.cz/sites/default/files/obsah/prilohy/vzor-11-v5_1.zip) a [číselník katastrů ČÚZK](https://services.cuzk.gov.cz/sestavy/cis/UI_KATASTRALNI_UZEMI.zip). Stejné nezměněné vstupy již používá solární adaptér; jejich SHA-256 ověřuje `build_generation` proti `data/sources/solar_capacity.json` a hlavní build navíc proti globálnímu seznamu. Nové adaptéry nevyžadují nový download.

Jde o **licencovaný instalovaný elektrický výkon v MW**, nikoli vyrobenou energii, celý trh včetně nelicencovaných zdrojů nebo roční výrobu. XSD stanovuje `OutputElec` jako decimal a obsahuje oddělený `OutputTherm`; jednotky XSD samo nedokládá. MW a význam potvrzuje [oficiální veřejný detail licence ERÚ 110605085](https://licence.eru.gov.cz/detail.php?lic-id=110605085&sequence=1&total=1): Větrná elektrárna Drahany má elektrický výkon 2 MW; odpovídající řádek XML `OutputElec=2.00000`, typ VTE a palivo R. [Další oficiální detail ERÚ](https://licence.eru.gov.cz/detail.php?lic-id=110100146) odděluje vodní a přečerpávací technologii. Výkon v registru není měření aktuálního provozu.

## Výběr a klasifikace

Licence musí mít `ProcesStatus=Udělená licence`, `VersionStatusDes=Aktivní verze` a platné intervaly licence, verze i provozovny ke dni snímku. Adaptér sdílí již ověřenou časovou funkci solárního adaptéru: `1900-01-01` je otevřená mez, ostatní datum se porovnává s 1. 10. 2026 a musí být validní ISO datum. Používá se přesný desetinný součet jednotlivých `PremiseElecOutput/OutputElec`; tepelný výkon se nezahrnuje.

- `generation_capacity`: všechny způsobilé elektrické zdroje bez rozlišení technologie, včetně PVE. Rozporná klasifikace technologie nebrání součtu doloženého elektrického výkonu.
- `wind_capacity`: přesný typ jednotlivého zdroje `VTE` (XML popis technologie větrná), prázdný typ lze nahradit přesným palivem `R` (Větrná). Typ VTE s jiným neprázdným palivem nebo palivo R s jiným typem se vyloučí a dotčené obce mají null.
- `hydro_capacity`: přesný typ `VE` (vodní), prázdný typ lze nahradit přesným palivem `Q` (Vodní). **PVE jsou vyloučeny**, včetně řádků s prázdným typem zdroje v provozovně typu PVE. Rozporný typ VE/palivo nebo jiné typy s Q se nezahrnují. Jde o vodní výkon bez přečerpávání; název metriky to výslovně uvádí.

Klasifikace pochází z přesných ID a jejich popisů ve zdrojovém XML; XSD žádný číselník těchto hodnot neobsahuje. Název provozovny a technologie celé provozovny nenahrazují typ jednotlivého zdroje ve smíšených elektrárnách. `solar_capacity` dál používá původní nezměněný adaptér a jeho samostatnou metodiku.

`ResourceElecId` se kontroluje globálně. Stejný řádek stejné provozovny se počítá jednou, konfliktní výkon/technologie/palivo nebo stejné ID v jiné provozovně zastaví sestavení. Ve snímku je BPS `02265_T11` pod dvěma aktivními licencemi: stejné zdroje `002872_Z11`, `002873_Z11`, každý 0,526 MW, stejný katastr `761451`. Provozovna se počítá jednou pouze při shodě množiny katastrů a úplného seznamu ID zdrojů, výkonů, typů a paliv; jiné opakování aktivního ID zastaví sestavení. Počet takto odstraněných opakování je v auditu. Sčítání se nenásobí počtem katastrů, parcel nebo licencí.

## Území, chybějící údaje a veřejné součty

Použije se přesný `CadasterId` → `KOD` → `OBEC_KOD` z platných řádků ČÚZK (`PLATI_DO` prázdné, cp1250). Všechny katastry musí patřit jediné známé obci. Provozovny přes více obcí, neznámé a chybějící katastry se nerozdělují odhadem. U dotčených známých obcí se zadrží i jinak jednoznačně přiřazený výkon, aby se nevydávala neúplná hodnota za úplný obecní údaj. Absence řádku je vždy null, nikdy nula. Pozitivní obecní hodnota představuje doložený přiřazený výkon, stále s celkovým omezením registru.

Kraje a ČR sčítají **jen publikované obecní hodnoty**, nikoli celý výkon registru. Manifest má `coverage=partial` a zdrojové metadata trvale vysvětlují neúplnost. Referenční součet registru je samostatně v auditu, není podstrčen do mapy jako součet obcí.

| Metrika | Způsobilý výkon registru MW | Jednoznačně umístěný MW | Publikovaný součet MW | Obce s pozitivní hodnotou |
|---|---:|---:|---:|---:|
| Všechny licencované zdroje | 22 060,41544 | 18 692,97637 | 14 673,70212 | 4 635 |
| Vítr | 387,41545 | 304,57545 | 290,67545 | 83 |
| Voda bez PVE | 1 140,64437 | 586,23533 | 552,57483 | 857 |

U celkového výkonu je 95 provozoven s 3 367,43907 MW geograficky nealokovaných, u větru 4 provozovny s 82,84 MW, u vody 21 s 554,40904 MW. Vodní klasifikace navíc vylučuje rozporné zdroje s 0,13936 MW. Přísné zacházení s víceobecními elektrárnami snižuje zejména vodní a celkový součet; není důvod tato omezení maskovat nulami nebo umělou alokací.

Audit `data/{metricId}-validation.json` obsahuje způsobilé, umístěné, nealokované, zadržené a publikované MW, technická ID nealokovaných provozoven, vyloučené rozpory a dotčené obce. Veřejné soubory neobsahují jména držitelů licencí nebo jejich adresy. Vstupní snímek ani aktuální katastrální číselník neumožňují odvodit historickou řadu; časová osa je pro tyto metriky jediný stav k datu snímku.
