# Praktický přínos před složitostí

Doplněk k `REALITY_CHECK.md`, ne nový proces ani další sada agentů. Hlavní cíl: velký **ověřitelný užitek** pro konkrétního člověka. Technická ambice jej podporuje; počet algoritmů, testů a efektů není cílová metrika.

## Jedna karta před stavbou

Po souhlasu s implementací vyplň `templates/value-test.md` (stačí několik minut). Před souhlasem návrh prober v chatu. Vyber jeden hlavní druh přínosu:

| Slib | Co skutečně měřit | Co jej neprokazuje |
|---|---|---|
| Méně energie / nákladů | Stejná služba a hranice systému; baseline, varianta, úplné náklady | Samotná účinnost komponenty |
| Lepší rozhodnutí / nižší riziko | Správnost rozhodnutí, cena chyby, nevyřešené případy | Počet zobrazených grafů nebo jistota modelu |
| Úspora práce | Dokončený úkol, čas a chyby včetně přípravy a oprav | Rychlost solveru nebo pochvala dema |

Karta obsahuje hypotézu, experiment, metriku a předem zvolenou hranici užitečného zlepšení. Doplní skutečného uživatele, baseline, zdroje, nejistoty a důvod hranice. Nevolíme univerzální povinných 20 %; hranici zdůvodníme významem rozhodnutí. Další metriky jsou doplňkové, ne náhradní vítězství po neúspěchu hlavní metriky.

## Krátký kontakt s praxí

Použij `templates/mentor-interview.md`. Nejdřív zjisti poslední skutečný případ, současný postup a náklad problému; teprve pak ukaž řešení. Pochvala, hypotetické „používal bych“ ani souhlas mentora nejsou měření přínosu. Rozhovor, ukázku a uživatelský test eviduj odděleně. Neodesílej zprávy ani nezveřejňuj poznámky bez povolení. Bez dostupného odborníka uveď typového uživatele a neověřenou hypotézu; nevyráběj rozhovor pomocí AI.

Pro test rozhodovacího nástroje použij několik předem připravených úkolů s ověřenou správnou odpovědí: stejná data, čas a možnosti pro oba postupy. Vystřídej pořadí nebo použij srovnatelné nové úlohy, aby znalost řešení nedala výhodu druhému pokusu. Započti neúspěchy i vlastní čas nastavení. Nácvik s Danem je pilot se spoluautorem, nikoli nezávislé potvrzení odborné použitelnosti. Malý vzorek reportuj po jednotlivých případech, ne jako důkaz dopadu v celém odvětví.

## Změna cíle znamená nový test

Při přechodu například z „šetří energii“ na „usnadňuje návrh“ zachovej původní výsledek i neúspěšnou hypotézu. Se souhlasem uživatele založ novou verzi karty, novou primární metriku a test nového slibu. Správný model neprokazuje úsporu práce. Jestli nový test nestihneme, prezentujeme **funkční prototyp s neověřeným praktickým přínosem**, nikoli skrytou změnu vítězného tvrzení.

## Čas a dělba práce

Hlavní Codex schvaluje kartu s uživatelem. Výzkumná role prověří skutečnou potřebu, ověřovatel nezávisle kontroluje výsledek, vývojář dodá reprodukovatelný výpočet. Platí stávající T/3 a nejvýše tři souběžní subagenti. Jeden experiment a nejdůležitější nejistota mají přednost před novou auditní platformou.

Na výpočty použij podle potřeby `LIBRARY_TOOLBOX.md`. Citlivost neprokazuje správnost vstupů: základní OAT skript nezachytí interakce, Sobolův rozklad závisí na zvolených rozděleních. Výsledek pořád potřebuje fyzikální a provozní kontrolu.

Pitch vychází z téže karty: **problém → stejné podmínky → jiné rozhodnutí → ověřený důsledek**. Pomocí `templates/pitch-runbook.md` rozděl řeč, ovládání dema a odpovědi mezi členy. Pravidla a váhy poroty nevymýšlej; když nejsou známy, uveď to.

## Původ a rozsah adaptace

Naše stručná aplikace myšlenek PM Skills, Strategyzer Test Card, Y Combinator, hackathon-skills a Devpost; nejde o kopii jejich šablon ani instalaci pluginů. Přesné odkazy, přečtené revize a rozdíly jsou v `resources.json`. Pětihodinové kontrolní body, bezpečnost a datové hranice jsou naše projektová pravidla, nikoli tvrzení převzatá ze zdrojů.
