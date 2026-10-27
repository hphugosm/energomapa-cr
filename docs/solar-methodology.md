# Licencované FVE: metodika snímku ERÚ

EnergoMapa používá veřejný [dataset ERÚ ke dni 1. 10. 2026](https://eru.gov.cz/datove-sady-technologickych-energetickych-zarizeni-ke-dni-01102026-vzor-2025), [původní XML](https://eru.gov.cz/sites/default/files/obsah/prilohy/tez-sk-11-2026-10-01.xml), [schéma v5](https://eru.gov.cz/sites/default/files/obsah/prilohy/vzor-11-v5_1.zip) a autoritativní [číselník katastrálních území ČÚZK](https://services.cuzk.gov.cz/sestavy/cis/UI_KATASTRALNI_UZEMI.zip). Originální XML je uchováno bezeztrátově jako gzip, oba ZIP beze změn. SHA-256 všech vstupů je v `data/sources/solar_capacity.json`; offline sestavení je ověřuje.

**Jde výhradně o licencované zdroje ERÚ, nikoli o součet všech FVE včetně nelicencovaných domácích instalací.** Dostupný snímek neumožňuje vytvořit skutečnou historickou řadu. Rok 2026 v ovládání označuje pouze stav 1. října, nikoli celý rok. Data jsou licencovaný instalovaný elektrický výkon v MW, nikoli výroba ani odhad roční výroby.

## Výběr a výkon

XML obsahuje 29 611 `LicTable` a 38 040 `PremiseElec`. Vyžadujeme `ProcesStatus=Udělená licence`, `VersionStatusDes=Aktivní verze` a platnost licence, verze i provozovny ke dni snímku. Datum 1900-01-01 je sentinel neurčeného začátku/konce; datum konce jiné než sentinel musí být alespoň datum snímku. Názvy provozoven ani adresy se nepoužívají pro klasifikaci.

Z jednotlivých `PremiseElecOutput` se sčítá přesný desetinný `OutputElec`: `ElecPremiseTypeId=SLE` (solární); pokud typ chybí, přesné `FuelTypeId=O` (Sluneční energie). Ve snímku je 184 takových zdrojů s chybějícím typem. Dva rozporné řádky typu VE s palivem O o souhrnných 0,13936 MW jsou konzervativně vyloučeny a jejich obce označeny jako neúplné. Typ elektrárny na úrovni celé provozovny se pro součet nepoužívá: čtyři smíšené provozovny zahrnují jen výkony jednotlivých solárních zdrojů. Zdroj s jinou technologií nezvyšuje výkon FVE. Celkový výkon provozovny se nenásobí počtem zdrojů, katastrů ani parcel.

Identifikátor `ResourceElecId` je kontrolován globálně. Shodný opakovaný řádek téže provozovny se počítá jednou; konfliktní opakování zastaví build. Opakování aktivního ID provozovny build také zastaví. Šest provozoven s neplatným časovým intervalem je vyloučeno. Zůstává 34 512 provozoven a 36 784 jednotlivých solárních zdrojů s výkonem **3 563,06469 MW**.

## Přesné územní propojení a nejistota

ČÚZK CSV `UI_KATASTRALNI_UZEMI` se dekóduje cp1250. Použijí se platné řádky (`PLATI_DO` prázdné) a přesný vztah `KOD` → `OBEC_KOD`. Kódy `CadasterId` se propojují přesným porovnáním; nejsou to kódy obcí a nesmějí se za ně zaměnit. Číselník je aktuální ke stažení 27. 10. 2026; je uchován pro reprodukovatelnost. Nepoužívá se fuzzy shoda názvů, adresa držitele licence ani geokódování sídla firmy.

Více katastrálních řádků se nejprve redukuje na množinu kódů. Pokud všechny katastry provozovny ukazují na jedinou obec, její výkon se započítá právě jednou. V 60 případech provozovna zasahuje více obcí; čtyři další mají chybějící/nepropojitelný katastr. Výkon nelze rozdělit podle počtu parcel ani rovnoměrně: takové hodnoty by byly odhad. Těchto 64 provozoven a **152,20803 MW** zůstává geograficky nerozdělených. Jednoznačně umístěný výkon činí **3 410,85666 MW**.

Obce dotčené nejednoznačnou provozovnou nebo rozpornou klasifikací mají `null`, i když v nich existuje další přesně umístěný zdroj. Prázdné obce mají rovněž `null`: čtyři zcela neumístěné provozovny znemožňují bezpečně vyvozovat nulu. Pozitivní údaje označují doložený přiřazený výkon; územní pokrytí je `partial`. Ve 107 takto dotčených obcích je zadrženo dalších **267,95211 MW** jednoznačně umístěných zdrojů. Publikované obecní hodnoty se sčítají na **3 142,90455 MW**. Kraje i ČR zobrazují pouze tento neúplný součet publikovaných obecních hodnot, nikoli celkový výkon FVE. Součty obecních hodnot nejsou úplný celostátní výkon; autoritativní celkový součet evidovaných způsobilých řádků je uveden výše a v auditu. Aplikace musí u agregací zachovat příznak neúplnosti a nikdy přepsat chybějící hodnotu nulou.

## Reprodukce a audit

`pipeline/solar.py` nabízí `build_solar(territories, root)` vracející metadata metriky, obecní snapshot JSON a audit. Sestavení je bez sítě. Volitelné `download_solar(root)` obnoví původní soubory; po úspěšném stažení aktualizuje SHA-256 ve zdrojových metadatech i datum stažení; integrující download pipeline obnoví globální checksums. Vstupy se nesmějí tiše měnit.

`data/processed/solar-validation.json` obsahuje součty, počty, důvody nepřiřazení a technické identifikátory provozoven. Neobsahuje názvy fyzických osob, adresy ani držitele licencí. Raw XML je veřejný původní zdroj; veřejný web má publikovat pouze agregované metriky a metodiku, nikoli kopii zdrojového registru.
