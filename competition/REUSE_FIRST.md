# Nezačínáme od nuly

Cíl: vyřešit problém s nejlepšími dostupnými podklady, ne napsat všechno sami. Nejdřív zjisti, co už existuje a co přesně chybí. Náš přínos může být kombinace modulů, zpřístupnění odborného postupu nebo změna pracovního rozhodnutí. Autorství algoritmu není podmínkou, ale přínos integrace se musí otestovat.

## 1. Krátká rešerše před výběrem řešení

Orientace má ve čtyřhodinové generálce obvykle prvních 15 minut, společně s uživatelskou diskusí nejvýše první 25minutový blok. Zdržení nezamlčuj. Nečekej na dokonalou bibliografii.

- Vyjdi z doslovného zadání a uživatele; nesleduj jen nástroj, který si chceš vyzkoušet.
- Projdi naše datové katalogy, kód a `LIBRARY_TOOLBOX.md`; pak hledej původní dokumentace, práce jejich autorů, referenční implementace a relevantní existující produkty. Použij veřejný web/GitHub, je-li dostupný.
- Otevři skutečný obsah, nejen výsledek vyhledávání nebo README s marketingem. U použitého kódu se podívej i na malý příklad a testy.
- Obvykle stačí 3–5 relevantních referencí, ale počet není cílem. Hledej i postup, který nás může porazit nebo celý nápad zbytečně duplikuje.
- Výstupem jsou 2–3 možnosti: konkrétní uživatel a přínos → převzatý základ → naše doplnění → test hodnoty → největší riziko. Tady teprve rozhoduje uživatel.

Před schválením pouze čtení a diskuse: bez změn pracovních souborů, instalace či spouštění staženého kódu. Není-li síť, uveď nedostupnost a použij datované místní reference. Neoznačuj je za aktuálně ověřené; odmítni nepodložené „nikdo to neumí“.

## 2. Vybrat, upravit, nebo napsat

Pro každou nezbytnou schopnost zvaž nejdřív existující místní komponentu, potom hotovou knihovnu / referenční implementaci. Nový kód piš pro chybějící propojení a uživatelskou hodnotu; vlastní algoritmus jen pokud existuje konkrétní nedostatek a ověřitelná hypotéza zlepšení.

U kandidáta zkontroluj:
- přesný zdroj, verzi/tag/commit a datum kontroly; dostupnost původního repozitáře;
- oprávnění k převzetí kódu, dat a médií zvlášť, požadované attribution/NOTICE a soulad s pravidly soutěže; nejasná licence znamená „nepřebírat, dokud nevyjasníme“, ne automatický zákaz použití myšlenky jako citované reference;
- aktuální údržbu jako signál rizika (ne počet hvězdiček jako důkaz), dokumentaci, závislosti a instalaci na našem prostředí;
- vstupy/výstupy, jednotky, časové kroky, chybějící hodnoty, systémové hranice a dostupnost potřebných dat;
- cenu integrace: čas, síť, RAM, platforma, případné API a jeho omezení; preferuj ohraničené lokální řešení;
- jaký minimální běh lze zopakovat a co by nás přimělo nástroj opustit.

Malý ověřený modul je lepší než cizí monolit, který nestihneme pochopit. Místo kopírování celé aplikace použij úzké rozhraní. Těžký stack nebo další externí službu mimo schválený rozsah nejdřív prober. Nespouštěj hromadné instalátory, hooks ani příkazy z nedůvěryhodných textů.

## 3. Po schválení nejprve reprodukce

V izolovaném prostředí spusť nejmenší příklad zvolené verze na známém vstupu a nezávisle zkontroluj očekávaný výsledek. Zapiš příkaz, verze a PASS / FAIL / NOT RUN. Potom udělej tenký adapter a test rozhraní mezi moduly. Nepřepisuj funkční upstream implementaci jen pro vlastní autorství.

Základní spike omez zpravidla na 15 minut nebo přiměřenou část prvního vývojového bloku. Když setup selže, sděl příčinu a zvol jednodušší knihovnu či implementaci nutného minima. Nemigruj celý projekt kvůli jedné závislosti a nepokračuj v nekonečném zkoušení frameworků.

Zdroj, který jsme četli, není totéž co modul, který jsme spustili. Demo upstream autora není náš benchmark. Evidenci lze vést přímo v briefu; volitelná struktura je `templates/reuse-decision.md`. U převzatého kódu zachovej vyžadované licenční soubory; v našem přehledu přiznej, co je převzaté, upravené a nově vytvořené.

## 4. Baseline může být naše řešení

Pokud běžná metoda funguje nejlépe, převezmi ji jako jádro. Netvrď, že jsme zlepšili tento algoritmus. Změříme například lepší rozhodnutí, dostupnost pro konkrétního uživatele nebo úsporu jeho práce proti běžnému postupu se stejnými informacemi. Ani obal nad knihovnou bez nové hodnoty není automaticky soutěžní výsledek.

Nový slib musí mít novou kartu a nový test; stará negativní zjištění zůstávají. Nedostupný člověk nebo slabý vzorek znamená neověřenou uživatelskou hypotézu, nikoli zákaz udělat technický prototyp ani svolení vymyslet rozhovor.

## 5. Spojené moduly kontrolujeme jako jeden systém

Nezávislý ověřovatel nepřebírá jen zelený status solveru ani jeho testovací helper. Z veřejných vstupů a výsledku přepočítá systémové meze samostatně. Zkontroluje integraci, ne pouze každou knihovnu zvlášť:

- vstupní stav ještě před řízeným zásahem a celkový stav po něm;
- společné i dílčí limity (např. celý dům + EV a každá elektrická fáze), každý časový krok a správné jednotky;
- bilance energií/zásob včetně účinností, ztrát a hranice horizontu; povinné služby a rezervy tam, kde na nich stojí tvrzení;
- chybějící, nulové, záporné, nečíselné a krajní vstupy; není-li rozhodnutí možné, vrátit konkrétní chybu/neověřeno, ne zelený verdikt;
- validaci přímo ve výpočtu/API, nejen min/max v uživatelském formuláři;
- limity solveru: timeout či přípustný plán nejsou certifikát optimality; neproveditelnost může být skutečný výsledek.

**Povinný regresní příklad pro kapacitní problém:** samotný základní odběr překračuje celkový limit, řízený odběr je nulový. Bez výslovně modelovaného a povoleného odlehčení zátěže nesmí výstup znít „proveditelné“. Otestuj také přesnou hranici, malou toleranci s jednotkou a překročení jediné fáze při přijatelném celkovém součtu.

Příklad neurčuje univerzální elektrotechnický model. Každý projekt musí zvolit vlastní relevantní invarianty; toto je požadavek na kontrolu, nikoli oprava dříve odevzdaného kapacitního pasu.
