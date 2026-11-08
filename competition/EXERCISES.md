# Tři nácviky použití stavebnice

Vlastní tréninkové úlohy inspirované okruhy soutěže, NE přesná oficiální zadání minulých let. Nejsou zde předstírané vítězné výsledky. Smyslem je mít připravenou cestu od otázky ke kontrolovatelnému výstupu.

## 1. Má smysl obecní FVE?

**Úkol:** Pro Roudnici nad Labem prověř hypotetickou instalaci 100 kWp jako předstudii, ne doporučení konkrétní stavby.

**Hotové podklady:** PVGIS, populace, domácnosti, licencovaný přiřazený výkon FVE. `node tools/competition.mjs exercise` načte skutečný jednotkový výnos a spočte modelovanou roční výrobu 100kWp varianty. Vypíše zdroj i označení předpokladu.

**Doplň:** střechu/pozemek, připojení, orientaci, spotřební profil, investici a ceny vlastní spotřeby/exportu. Bez profilu nepočítej hodinovou soběstačnost.

**Výstup:** mapa zvolené obce, jeden graf PVGIS, energie varianty, tři ekonomické scénáře a seznam technických podmínek. Baseline = bez nové FVE. Pitch: problém rozpočtu → data → návrh → citlivost → pilot.

## 2. Kam připravit dobíjecí lokalitu?

**Úkol:** Vyber tři kandidátní obce, ne definitivní vítězný pozemek.

**Hotové podklady:** MPO body, počet evidovaných stanic/bodů, obyvatelé, nearest a uložené isochrony. Kombinované filtry a compare jsou v atlasu; jejich váhy jsou předpoklady.

**Doplň:** poptávku, dopravní proudy, vytížení, síť a nájem pozemku. Obec bez záznamu nesmí automaticky dostat 0 nabíječek. Nevydávej vzdušnou vzdálenost za jízdu po silnici.

**Výstup:** přehled tří lokalit, mapové body, citlivost pořadí na váhy a plán sběru chybějících dat. Baseline = současná známá infrastruktura, s přiznaným pokrytím.

## 3. Plyn versus tepelné čerpadlo

**Úkol:** Pro jednu obec připrav model přechodu vybraného počtu bytů, nikoli údaj o skutečné úspoře celé obce.

**Hotové podklady:** Sčítání 2021: obydlené byty a vytápění. Před porovnáním ověř jmenovatel. Kalkulačka `heatPump` propojí explicitní potřebu tepla, účinnost reference a SCOP.

**Doplň:** energii na byt, stav budov, teplotní spád, sezónní profil, ceny, připojení a investici. Počet bytů není energie a dnešní populace neopraví staré sčítání.

**Výstup:** srovnání paliva a elektřiny ve stejných hranicích, citlivost na SCOP/ceny, jedna mapová vrstva a pilot. Baseline = stávající zdroj se stejnou dodávkou tepla.

## Kontrola po každém nácviku

Dokáže druhý člen týmu zopakovat výpočet a vysvětlit všechny tři největší předpoklady? Funguje prezentace bez internetu? Lze změnit vstup, přepočítat výsledek a upravit slide bez přepisování čísel rukou? Pokud ne, oprav podklady, nepřidávej další efekty.
