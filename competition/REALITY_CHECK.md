# Tři kontroly: přínos, použitelnost a odevzdání

Poučení ze tří nácviků: **Teplo** potřebovalo silnější vlastní mechanismus, **HELIOS** důkaz výhody a **OSTROV 72** ověření rozhodujících předpokladů, praktického provozu a úplnosti odevzdání. Jde o kvalitativní poučení, ne srovnatelné skóre ani důkaz účinnosti promptů.

Zachovej moonshot: velká vize → náročné funkční jádro → kritika → další iterace. Tyto kontroly pomáhají vybrat, kam investovat ambici. Nezakládají nový framework. Platí schválený rozsah, souhlas uživatele, nativní subagenti a výběr relevantních skills podle `SKILLS.md`.

## 1. Do první třetiny času: důkaz proti silné baseline a citlivost

Počítej od skutečného startu včetně diskuse: kontrola nejpozději v **T/3**, tedy **100. minutě z 300 minut**. Časový tlak nikdy nenahrazuje souhlas k implementaci. Před souhlasem pouze čti a navrhuj; pokud se dohoda protáhne, oznam dopad a dohodni úpravu rozsahu.

Po schválení zapiš do briefu a proveď nejmenší rozlišující experiment:

1. **Tvrzení před výsledkem:** konkrétní uživatel, rozhodnutí, hlavní metrika, minimální užitečné zlepšení a výsledek, který by tvrzení vyvrátil. Podle testu dodatečně neposouvej kritérium úspěchu.
2. **Silná férová baseline:** nejlepší dostupný běžný postup nebo rozumně vyladěná heuristika. Zdůvodni výběr; triviální „nedělat nic“ může být doplněk. Obě metody mají stejné vstupy, dostupné informace, případy, omezení a rozpočet zdrojů. Započti náklady měření, výpočtu i provedení. Nepomáhej vlastní metodě znalostí budoucnosti. Odděl ladění od testu a zahrň neúspěšné i nevyřešené případy.
3. **Nejcitlivější předpoklad přínosu:** krátce prověř hlavní nejisté vstupy a vyber ten, který nejvíce mění velikost výhody nebo doporučené rozhodnutí. Technicky nejtěžší součást nemusí být tento předpoklad. Dolož rozsah zdrojem, měřením nebo údajem konkrétního zařízení; otestuj nízkou / základní / vysokou hodnotu a pokud možno bod, kde výhoda mizí. Nedoložený rozsah označ za předpoklad a omez závěr na model.
4. **Výsledek k rozhodnutí:** ulož příkaz, vstupy, verzi, baseline i variantu a citlivost. Uveď absolutní dopad pro uživatele vedle procent, náklady a proveditelnost. Test kódu není důkaz užitku ani fyzické validace.

Při nulovém, slabém nebo nestabilním přínosu to ihned sděl uživateli: doporuč posílení důkazu, zúžení tvrzení nebo změnu metody a nech schválit zásadní změnu směru. Neoslabuj baseline, nevyměňuj potají metriku ani neskrývej nepříznivý scénář. Nedokončený experiment vykazuj jako neověřený; nepokračuj automaticky v drahé stavbě původního slibu. Nezávislou práci v dohodnutém rozsahu lze dokončovat.

## 2. U každé funkce: skutečný uživatel → rozhodnutí → proveditelná akce

V briefu udržuj krátkou tabulku funkcí. U každé musí být konkrétní role skutečného uživatele/provozovatele (bez vymyšleného potvrzení zájmu), vstup, rozhodnutí, navazující akce a důkaz, že ji lze provést: kdo má oprávnění, s jakým vybavením, za jaký čas a náklady, v jakých limitech. Pokud neznáme konkrétní provoz, označ typového uživatele a nepotvrzené podmínky pilotu.

Funkci bez této vazby obhaj jako nutnou podporu hlavní cesty, jinak ji navrhni vyškrtnout. Výzkumné demo smí ověřovat hypotézu, musí ale říct, jaké rozhodnutí má později umožnit. Provozní model kontroluje také povinné služby, rezervy a chování za hranicí plánovaného horizontu, pokud na nich závisí doporučení. Optimalizovaný plán, který nejde vykonat, není úspěch.

Pitch předvede jeden průchod: **stejné podmínky → jiné rozhodnutí proti baseline → konkrétní důsledek pro uživatele**, včetně hlavního omezení. Počet funkcí ani technologií jej nenahrazuje.

## 3. Závěr: zmrazit verzi → vytvořit exporty → rozbalit → spustit

Vyhraď závěrečnou část času na skutečné odevzdání, ne pouze zabalení pracovního adresáře:

1. **Zmraz finální verzi.** Zaznamenej release ID, zdrojový commit (případné necommitnuté změny přesně otiskni), datový snapshot, konfiguraci scénáře a hlavní výsledky. Ze stejných vstupů znovu vytvoř web, PDF, screenshoty i video, pokud se odevzdávají. Manifest uvede jejich cesty a SHA-256; manifest nemusí hashovat sám sebe.
2. **Prohlédni skutečné exporty.** Otevři každou stránku PDF/snímek a přehraj video. Porovnej klíčová čísla, popisky a scénář s finálním webem. Odstraň testovací hlášky typu „TESTOVANÝ VÝPADEK API“, staré výsledky a prázdné demo scény. Šipky a pozastavitelné stopky ověř v živé prezentaci; animace v běžném i reduced-motion režimu odděleně. Statický export není test animace.
3. **Zabal úplný projekt.** Přilož zdrojový kód, potřebná povolená data, připnuté závislosti/lockfile, návod a přesný příkaz spuštění i přepočtu. Uveď požadované prostředí, síť a externí služby. Žádná hesla nebo závislost na autorově účtu. Statická záloha má samostatné označení a omezení; není náhradou funkčního projektu, jestliže zadání vyžaduje nové výpočty.
4. **Otestuj právě odevzdávaný archiv v čistém prostředí.** Rozbal jej do nové prázdné složky, použij nový profil prohlížeče a čisté prostředí závislostí podle návodu (např. izolované prostředí nebo kontejner). Žádný přístup k původnímu checkoutu, zahřáté cache ani nedeklarovaným globálním balíčkům. Nainstaluj jen deklarované závislosti; offline provoz ověř, pokud jej slibujeme. Spusť od vstupní stránky hlavní cestu, změň vstup a ověř **nový přepočet**, nikoli jen přehrání uložených výsledků. Porovnej referenční výsledek s evidencí a otestuj deklarované chování při nedostupné službě.
5. **Zapiš skutečný stav.** Do projektového ověření ulož prostředí, příkazy, hash archivu, testovaný release, očekávaný a získaný výsledek a stavy **PASS / FAIL / NOT RUN** s příčinou. Blokované nebo neprovedené kontroly nejsou úspěch; nedoloženou úplnost neoznačuj jako „připraveno k odevzdání“. Po každé další úpravě zneplatni dotčené kontroly/exporty, znovu je vytvoř, zabal a ověř finální archiv.

Použij existující testy a jednoduché záznamy v projektovém adresáři. Dokumentační testy tohoto kitu hlídají přítomnost pravidel; behaviorální scénáře v `skills-evals.json` zůstávají `not_run`, dokud neproběhnou skutečné nezávislé běhy. Ani jedna kontrola sama neprokazuje kvalitu soutěžního projektu.
