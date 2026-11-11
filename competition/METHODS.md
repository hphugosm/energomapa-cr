# Výpočty, baseline a předpoklady

Připravené čisté funkce: `public/prezentace/math.mjs`. Nemají tržní ceník ani skryté výchozí účinnosti. Vstupy musí být konečná čísla v uvedených jednotkách; `null`, NaN a záporné nepřípustné veličiny se odmítají.

## Energie a výkon

E [kWh] = součet P_i [kW] × délka intervalu_i [h]. 1 MWh = 1 000 kWh, 1 MW = 1 000 kW. MW nepřeváděj na MWh bez intervalu. Integrace průměrného intervalu není to samé jako integrace jednotlivého okamžitého měření. Čas drž v UTC, uživateli ukaž místní čas a pozor na změnu letního času.

## FVE

`annualPV({capacityKwp, specificYield})` vrací kWh/rok = kWp × kWh/kWp/rok. Pokud PVGIS už zahrnuje zadané ztráty, neodečítej je podruhé. Přepočet podle instalovaného výkonu je zjednodušení pro shodnou technologii/orientaci; nevypovídá o hodinové soběstačnosti. Pro ekonomiku odděl vlastní využití a export; neoceňuj veškerou výrobu cenou nákupu.

## Teplo

`heatPump({heatKwh, scop, referenceEfficiency})`: elektřina = potřeba tepla / sezónní SCOP; referenční energie paliva = potřeba tepla / účinnost reference. Stejná hranice systému a energetická báze. Počet vytápěných bytů nelze bez doloženého modelu zaměnit za kWh. SCOP není jediný katalogový COP v jednom bodě.

## Úložiště

`batteryStep(...)` řeší jeden interval s explicitními kWh, kW a hodinami. Stav = původní stav + nabíjení × η_nab × čas − vybíjení / η_vyb × čas. Výkon se omezí maximem a dostupnou energií/místem. Současné nabíjení a vybíjení funkce odmítá. Nejde o optimalizátor ani model stárnutí. Kulatá účinnost cyklu odpovídá součinu obou dílčích účinností, ne každé z nich zvlášť.

## Ekonomika

`economics({capex, annualBenefit, annualOpex, years, discountRate})` používá investici v roce 0 a stálý čistý roční cashflow na konci let 1…N. `discountRate` je podíl (0,05 znamená 5 %); UI přijímá procenta a dělí 100.

Čistý roční přínos = hrubý přínos − roční provozní náklady. Prostá návratnost = CAPEX / kladný čistý přínos; při nekladném přínosu a kladném CAPEX se nevrací. NPV = součet CF_t / (1+r)^t včetně záporné investice v roce 0. Pro nestálé cashflow použij `npv(cashflows, rate)` a samostatně dolož každý rok.

Model automaticky nezahrnuje daň, DPH, financování, dotaci, degradaci, náhrady zařízení, zůstatkovou hodnotu ani změny cen. Zvol shodnou cenovou bázi a měnu. Prostá návratnost není NPV ani garantovaný výnos. Vždy uveď nízkou/základní/vysokou variantu alespoň pro cenu, využití a investici. Jde o soutěžní model, ne investiční nabídku.

## Emise

Změna emisí = emise referenční varianty − emise návrhu, při stejné funkci a hranici systému. Například energie × doložený emisní faktor, ale faktor musí mít zdroj, rok, území a definici průměrný/marginální/provozní/životní cyklus. Žádná implicitní „česká konstanta“. Z ročního průměru nelze vyvozovat přesné hodinové odvrácené emise.

## AI / ML bez vlastního workflow

Pracuj v běžném skriptu přes Codex. První model má být baseline: poslední hodnota, stejná hodina minulého týdne nebo jednoduché pravidlo řízení. Cílovou proměnnou, dostupnost prediktorů v okamžiku predikce, train/test období a MAE/RMSE předem zapiš. Zamez úniku budoucích dat. Model bez zlepšení proti baseline nezachraňuj efektním názvem. Ranking a vážené skóre není strojové učení. V kit není předtrénovaný model ani slib přesnosti.

## Evidence každého čísla

Použij `templates/evidence.json`: typ (měření/model/předpoklad), jednotka, období, území, zdroj, cesta výpočtu, omezení. Výsledek bez těchto údajů ještě není číslo do finální prezentace. Fyzikální vztahy výše jsou definice/modelové předpoklady, nikoli získané provozní parametry. Konkrétní datová metodika je v existujících `docs/*-methodology.md`.
