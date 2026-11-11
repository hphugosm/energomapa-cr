# Odborná výbava podle zadání

Návody a odkazy, ne plošná instalace. Volbu knihovny schvaluje vedoucí v rámci dohodnutého projektu; závislosti drž odděleně od mapy a datového buildu. Žádný nový AI framework. Před použitím přečti aktuální primární dokumentaci a ověř licenci konkrétní verze.

| Potřeba | Zdroj | Nejmenší užitečný pokus | Důležitá hranice |
|---|---|---|---|
| Na čem stojí naše výhoda? | SALib | citlivost rozdílu kandidát vs. baseline | zvolená rozdělení nejsou znalost skutečných vstupů |
| Elektřina, teplo, akumulace | PyPSA | malý ostrov nebo TČ se zásobníkem | matematická proveditelnost není povolení připojení |
| Výroba FVE | pvlib-python | referenční výroba ze známého počasí | model výroby není ověření diagnostiky poruch |
| Plánování a omezené zdroje | OR-Tools | malá úloha s explicitními omezeními | rozliš FEASIBLE/OPTIMAL/INFEASIBLE a limit solveru |

Přesné zdroje a stav zapojení: `resources.json`. PyPSA, pvlib a OR-Tools nejsou tímto kitem nainstalované ani prakticky ověřené v našem projektu. Použij je místo zbytečného přepisování známých metod, ne jako záminku pro další funkce.

## Spustitelný základ citlivosti

Z kořene repa, bez dalších knihoven:

```sh
python competition/examples/sensitivity.py --method oat --output artifacts/value/screening.json
python -m unittest discover -s tests -p 'test_competition_sensitivity.py'
```

`one_at_a_time(baseline, candidate, base, ranges)` mění jeden vstup při ostatních fixních. Obě metody dostanou stejné podmínky, výstup obsahuje absolutní rozdíl a relativní změnu (pro nulovou baseline `null`). Chybějící/neplatné výstupy nejsou nula. Pořadí ukazuje lokální rozpětí přínosu, **ne globální důležitost**; interakce a nelinearity mezi třemi body mohou zůstat skryté.

Volitelný Sobolův příklad v izolovaném prostředí:

```sh
python -m venv .venv-sensitivity
.venv-sensitivity/bin/python -m pip install -r competition/examples/requirements-sensitivity.txt
.venv-sensitivity/bin/python competition/examples/sensitivity.py --method sobol --n 512 --seed 42 --output artifacts/value/sobol.json
ENOL_REQUIRE_SALIB=1 .venv-sensitivity/bin/python -m unittest discover -s tests -p 'test_competition_sensitivity.py'
```

Na Windows použij `.venv-sensitivity\Scripts\python.exe` a ekvivalent nastavení proměnné. Instalace potřebuje síť. Tento krok není automatický; nezapisuje do hlavních requirements. Před odevzdáním zaznamenej úplné závislosti a prostředí do projektu.

`sobol_benefit` používá kompatibilní SALib sampler a analyzér, pevný seed, stejný vzorek pro obě metody, S1/ST i intervalové odhady. Výchozí předpoklad jsou **nezávislé rovnoměrné vstupy**; pro korelované proměnné jej bez změny metodiky nepoužívej. Indexy nejsou procenta úspor. Konstantní výstup vrací stav `constant_output` bez smyšlených indexů. Žádné ořezávání nepříznivých výsledků nebo tiché mazání chybných případů.

**Vestavěné topenářské ceny, odběry a rozsahy jsou smyšlené testovací fixtures, nikoli česká tržní data nebo investiční doporučení.** Pro vlastní projekt nahraď modely a vstupy, doplň zdroje, jednotky, fyzikální meze a hlavní metriku. Neslibuj robustnost bez testu celé relevantní oblasti a nezávislého přepočtu.
