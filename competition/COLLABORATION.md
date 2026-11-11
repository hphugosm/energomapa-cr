# Spolupráce při ENOL

## Před implementací

Nejdřív čti zadání a udělej krátkou rešerši podle `REUSE_FIRST.md`: existující práce, reference, knihovny a naše podklady. Z nich vycházej při návrhu. Předchozí souhlas s úpravou kitu není souhlas se stavbou nového soutěžního projektu.

Piš česky, typicky **2–5 vět**, jednu skutečnou rozhodovací otázku najednou. Nabídni 2–3 směry (méně, pokud další nemají oporu): uživatel a problém, přínos, co převezmeme, co dodáme, jak ověříme výsledek a hlavní riziko. Doporuč nejlepší; nevyžaduj nový algoritmus ani konkrétní typ aplikace.

Po domluvě shrň rozsah a polož otázku: **„Souhlasíš s tímto směrem a mám začít implementovat?“**

**Před odpovědí ano nedělej změny v souborech**, neinstaluj balíčky, nespouštěj cizí kód, necommituj, nepushuj a nenasazuj. Čtení, vyhledávání a porovnání zdrojů jsou povolené. Výslovný pokyn k určité úpravě nebo aktualizaci PR už tuto konkrétní změnu schvaluje; nevyžaduj opakované potvrzení.

## Po schválení

**Ptej se často**, když je nutné obsahové rozhodnutí: jiný uživatel, chybějící data, zásadní předpoklad, změna hlavního slibu, externí závislost mimo dohodu, vizuální směr nebo škrtání. Zpráva má tvar „Zjistil jsem X. Doporučuji A kvůli Y; alternativa B. Kterou chceš?“ Rutinní vratné detaily a již schválené úkoly řeš samostatně.

**Neopakuj již zodpovězené otázky.** Subagenti posílají otázky vedoucímu, ne každý zvlášť uživateli. Předání a autorství souborů viz `SKILLS.md`. Bez odpovědi pokračuj jen na nezávislé schválené práci, ne v novém směru. Ticho ani blížící se deadline není souhlas.

Po první funkční ukázce ukaž největší slabinu a návrh další iterace. Jestli běžná metoda porazí náš návrh, doporuč její převzetí místo dalšího závodu ve složitosti. Převzetí není automatický důkaz nového produktového slibu: změnu cíle schválí uživatel a následuje nový test podle `PRACTICAL_VALUE.md`.

## Čas a stav

Aktuální limit řídí `MOONSHOT_STRATEGY.md`; čtyři hodiny mají plán v `REHEARSAL_4H.md`. Stopky běží od startu včetně rešerše a čekání, pokud uživatel výslovně nedomluví pauzu. Oznam dopad zdržení a navrhni škrty, neposouvej deadline potichu.

Krátké průběžné zprávy doplň skutečnou ukázkou a důkazem na milnících. Nepřeváděj je na desetistránkové reporty. Nevymýšlej práci na pozadí, dostupné modely, delegace ani výsledky nástrojů.

## Závěr

Odevzdej cestu/odkaz na skutečný výstup, jeden hlavní výsledek, jeho omezení a PASS / FAIL / NOT RUN. Zveřejnění nebo merge vyžaduje odpovídající oprávnění. Připravenost není totéž co otestování, commit nebo deployment. „100 %“ neslibuj; tvrzení musí odpovídat provedeným kontrolám.
