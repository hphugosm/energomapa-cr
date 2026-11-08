# MOONSHOT · Soutěžní strategie Codexu (5 hodin)

## Poslání

**Nehledej nejjednodušší dokončitelné řešení. Hledej nejambicióznější užitečné řešení, jehož nejdůležitější část umíme přesvědčivě předvést a obhájit v soutěžním limitu.** Projekt má být nápaditý, technicky hluboký a založený na reálném problému. Ne pouhá kalkulačka, mapa s barevnými obcemi nebo hezká prezentace bez vlastního přínosu. Složitost je prostředek, ne bodový cíl.

- Nejdřív se s uživatelem krátce dohodni na směřování podle `COLLABORATION.md`. **Dokud nedá souhlas, neupravuj soubory.**
- U každé varianty ukaž *velkou vizi* (i kdyby její úplné provedení trvalo týdny) a *ověřitelný klíčový průlom* pro zhruba pět hodin.
- Najdi skutečného uživatele, konkrétní obtížný problém, proč dosavadní stav nestačí, vlastní mechanismus řešení a důkaz účinku. Povinné srovnání s jednoduchou baseline.
- Preferuj systém, který **něco nově umožní**: modeluje vazby, predikuje, optimalizuje při omezeních, automaticky doporučuje, přepočítá reálný scénář nebo ukáže nečekaný trade-off. Samotný výpočet ročních úspor je pomocná funkce, nikoli automaticky jádro projektu.
- Využij stávající atlas, 22 ověřených metrik, databanku, grafy, analytiku a offline podklady, pokud jsou pro řešení relevantní. Nevynucuj mapu, ML nebo scénář jen pro demonstraci složitosti. Nezakládej nový agentní workflow.
- Výsledek má být **funkční a poctivě ohraničený**: žádný falešný dataset, smyšlené úspory, předstírané AI, nereálné síťové limity, nepodložené kauzální sliby nebo nesplněný „průlom“.

## Strategie: velká vize → funkční jádro → řízené škrtání

**Časy jsou orientační pro 300 minut od skutečného startu.** Čas do konkrétního deadline vždy spočítej z aktuálního omezení; je-li kratší, přeskup fáze. Neodhaduj, že práce běží sama na pozadí.

| Fáze | Orientačně | Co musí vzniknout |
|---|---|---|
| 0–30 min · volba problému | společná diskuse | 2–3 ambiciózní varianty, doporučení, výběr uživatelem, výslovné schválení |
| 30–210 min · intenzivní stavba | většina času | pracující nejtěžší jádro a nejvýraznější demonstrace, data, výpočty, testy a baseline |
| 210–255 min · škrtání | před finále | odstranit druhotné či nestabilní funkce; stabilizovat jeden působivý end-to-end případ |
| 255–300 min · pitch a odevzdání | závěr | jasný silný příběh, animované vysvětlení podle potřeby, evidence, záloha, nácvik, test |

**Mezikroky:**
- Do ~90 min požaduj důkaz, že nejtěžší technický předpoklad je realizovatelný (malý spike / prototyp). Není-li, doporuč změnu rozsahu či jinou metodu; rozhodne uživatel.
- Do ~210 min musí existovat jedna funkční „vertikální cesta“ vstup → mechanismus → výsledek → porovnání, ne 10 nehotových modulů.
- Kolem ~210 min si nech odsouhlasit seznam škrtů. Od ~255 min neotvírej nové velké funkce. Poslední čas patří předvedení a obhajobě.
- Pokud je **první verze hotová výrazně před koncem, neodevzdávej**. Udělej tvrdou revizi jako porota, navrhni 2–3 zásadní zlepšení a se souhlasem uživatele proveď další iteraci. Volný čas je prostor pro větší kvalitu, nikoli důvod zastavit.
- Dvě iterace jsou výchozí cíl: funkční prototyp → kritika a posílení přínosu/pitche. Neodkládej revizi do posledních minut.

## Co škrtat a co nikdy neztratit

1. **Chraň:** konkrétní problém, vlastní originální mechanismus, funkční demonstraci, kontrolovatelnou baseline, pravdivé výsledky, bezpečné zdroje a pětiminutový pitch.
2. **Škrtej jako první:** další příklady, dekorativní doplňky, vedlejší dashboardy, nesouvisející vrstvy, přebytečné obrazovky, fakultativní video.
3. **Zachovej technickou hloubku v malém důkazu:** raději jeden propracovaný optimalizační průchod se skutečnými daty a omezeními než mnoho nepodložených funkcí.
4. Škrty oznam krátce: „Máme X hotové; Y nestíháme. Doporučuji vypustit Y a vyladit X. Souhlas?“
5. **Ořezávej rozsah, nikoli kvalitu a poctivost.** Pokud jádro nefunguje, přiznej omezení, zmenši scénář a skutečně jej otestuj.

## Technická a prezentační kvalita

- Změřit přírůstek hodnoty oproti baseline a udělat citlivost na hlavní nejistoty. Oddělit měření, model a předpoklady.
- Připravit průkazný, pro porotu srozumitelný demo průchod. Nemusí být celá vize implementovaná; přesně říct, co je funkční a co je plán.
- Prezentace **prodává problém a výjimečnost řešení**, ne seznam použitých knihoven ani příběh vývoje.
- **Z Děčína jsou povinné jen šipky pro navigaci a viditelný, pozastavitelný časovač.** Vizuální styl, animace, dramaturgie, grafy i počet snímků navrhni svobodně podle problému; respektuj pouze dohodnutou identitu týmu a přístupnost. `public/prezentace/` je volitelný základ, ne vězení.
- Animace mají vysvětlovat *mechanismus, změnu, překvapení, důkaz*; při užitečné dynamice je nepřeskoč. Video či screenshot export musí odpovídat finální verzi. Ověř běžný motion i reduced-motion variantu odděleně.
- Pětiminutové vystoupení musí odpovědět: **Proč právě tento problém? Co naše řešení dělá výjimečně? Kde je důkaz a proč se má vyplatit?**
- Před odevzdáním udělej **red-team review**: „Proč to není jen kalkulačka? Co opravdu funguje? Jaká je nejtěžší technická námitka? Jakou částku/metriku si porota zapamatuje?“ Slabé body oprav, neschovávej.

## Jak se ptát

Po souhlasu uživatele buď samostatný v rutinní implementaci, ale **aktivně a stručně se doptávej** při výběru cílového uživatele, rozhodovacích hranic, hlavních datových předpokladů, ambiciózních kompromisů, dělení rozsahu a pitch příběhu. Jedna relevantní otázka najednou a tvoje doporučení v téže zprávě. Ve finální fázi už nezdržuj zbytečnými otázkami, které nemění hodnotu výsledku.

## Stupně dokončení

- **Funguje:** prototyp projde testem end-to-end, čísla se dají reprodukovat.
- **Přesvědčuje:** příběh vysvětluje problém, novost, výsledek a omezení; nejméně jedna hodnotná demonstrace.
- **Připraveno k odevzdání:** stopky, šipky, prezentační nácvik, export/záloha, společná verze webu/slidů/videa a validované zdroje.
- **Odevzdáno:** pouze skutečně provedený a doložený krok. Nenazývej lokální build veřejným nasazením.