# Jak vybrat a použít data

Autoritou je aktuální `public/data/manifest.json`, `public/data/databank/index.json`, zdrojové registry a metodiky v `docs/`. `DATA_CATALOG.md` je připravený přehled, obnovitelný příkazem `node tools/competition.mjs catalog --write`. Nevymýšlej ID vrstev ani období podle starého chatu.

## Téma → podklady → co z nich smíme vyvodit

| Téma | Připravený základ | Co chybí pro silnější závěr |
|---|---|---|
| FVE / energetika obce | PVGIS, licencované výkony ERÚ, byty a populace | střechy/pozemky, reálný profil spotřeby, kapacita připojení, cena realizace |
| Akumulace / flexibilita | přeshraniční toky, časové řady databanky, výkon ukládání ERÚ | MWh a technologie, ceny dostupné s oprávněním, ztráty, profil zátěže, síťová studie |
| Teplo | vytápění a obydlené byty ze Sčítání 2021 | kWh potřeby tepla, tepelná ztráta, SCOP, teplotní spád, ceny a technická proveditelnost |
| EV / logistika | body MPO, populace, isochrony, nearest | skutečné využití nabíječek, dopravní proudy, síť, smlouva k lokalitě |
| Průmysl / CO₂ | hlášené EEA provozovny × rok | kompletní emisní inventura, odpadní teplo, procesní profil, souhlas provozovatele |
| Přenos / zahraničí | fyzické toky ČEPS a oddělené plánované výměny | topologie a parametry sítě pro fyzikální výpočet, ne pouze toky na hranicích |
| AI / regulace | veřejné přehledy a doložené časové řady | definovaný uživatel, cílová proměnná, časově oddělený test, pravidla použití dat |
| Komunikace / energetická gramotnost | srozumitelné grafy, mapy, ukázka domácnosti | publikum, ověření pochopení, distribuční kanál; mapa sama není kampaň |

## Praktické návody pro Codex

**Graf na slide:** najdi metriku v manifestu → zachovej její roky a jednotku → nastav `metric`, `territory`, `normalization` v `deck.json` → nech stávající MetricEngine provést agregaci → ověř poslední hodnotu proti exportu → ulož zdroj a omezení do evidence.

**Mapa do pitch:** v atlasu vyber metriku, území a přepočet → použij jeho URL v `frames` → ponech datum/legendu → napiš jednu větu, co mapa ukazuje → pro záložní odevzdání ulož snímek. Dvě varianty mapy mají různá frame ID; návrat ke stejné mapě stejné ID.

**Výběr lokality:** filtruj jen podle dostupných polí → uveď vlastní váhy → testuj citlivost pořadí na váhy → označ podíl dostupných dat → výsledek nazývej předvýběr. Síťová kapacita, územní rozhodnutí a souhlas vlastníka nejsou odvozeny z počtu obyvatel ani CO₂.

**Časové řady:** otevři databanku → vyber kompatibilní řady, období a jednotku → ověř délku intervalu a znaménka → neinterpoluj mezery bez metodiky → při ML rozděl train/test podle času, ne náhodně. Celoroční předpověď nelze validovat jen na krátké letní ukázce.

**Nový údaj:** hledej nejdříve u původního poskytovatele, ulož URL a čas, licenci/rozsah oprávnění, jednotku a metodiku. Data bez oprávnění nesmějí do veřejného repa ani do public/. Neaktualizuj všechny raw zdroje těsně před prezentací; připni funkční snapshot.

## Nezaměňovat

- Absence záznamu ERÚ/MPO neznamená nulovou skutečnou infrastrukturu. Coverage obcí není pokrytí národního výkonu.
- ERÚ ukládání: výkon MW ano, kapacita MWh a bateriová technologie nejsou doložené.
- MPO stanice, body a konektory jsou různé pojmy. Nominální dobíjecí výkon není volná přípojná kapacita.
- CO₂ EEA má prahové ohlašování a může obsahovat biomasu. „Provozovna × rok“ není počet unikátních podniků.
- Průměr PVGIS v centroidu není reálná výroba konkrétní střechy. Agregovaný výnos se nesčítá.
- Fyzické a plánované přeshraniční toky nejsou stejné. Znaménko a agregace Německa jsou v metodice ČEPS; nepřepisovat je podle intuice.
- Isochrony jsou uložené pro konkrétní počátky 15/30/60 minut; jiná obec není nový routing. 120 minut vyžaduje zvlášť ověřené řešení.
- Ceny pro spotřebitele nejsou bez dalšího spotový trh; přičítané složky a daně vyžadují zdroj a datum.

## Soubory, které už existují

`public/js/engine.mjs` (metriky), `public/js/analysis/` (filtry/skóre/nearest), `public/js/points.mjs`, `public/js/profile.mjs`, `public/js/databank/`, `public/js/electricity.mjs`. Přesná exportovaná API přečti před použitím. Nenahrazuj existující výpočty souběžnou implementací.
