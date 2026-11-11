# Prezentace: přínos a důkaz, ne prohlídka programu

**Povinné převzaté funkce z Děčína jsou pouze šipky a časovač** (viditelný, spuštění/pauza/reset). **Všechno ostatní je volné**: vzhled, animace, struktura, počet a typ scén. Zachovej čitelnost, přístupnost a dohodnutou identitu týmu, nikoli povinný starý layout.

## Co má porota pochopit

Kdo má problém, jak jej řeší dnes, co jsme zpřístupnili nebo zlepšili, jaký je důkaz a kde končí platnost výsledku. Není nutné mít nový algoritmus. Uveď převzatou metodu a náš příspěvek: propojení, data, rozhodovací postup, rozhraní nebo vlastní výpočet. Nepřisvojuj cizí práci a neskrývej, že baseline používá stejnou knihovnu.

Příběh postav kolem jedné skutečné situace: **stejné podmínky → jiné rozhodnutí / méně lidské práce → doložený důsledek**. Pokud se rozhodnutí nezmění, ukaž jiný skutečně změřený přínos; nevymýšlej jej. Nezaměňuj negativní výzkumný výsledek za ověřenou úsporu uživatele.

## Dramaturgie a animace

Problém a jeho náklad → dosavadní metoda a mezera → naše řešení → živý nebo označený záložní důkaz → dopad a další ověření. Není předepsaný počet slidů, čas pro mapu ani šest původních typů. Pracovní formulář není hlavní projekční slide.

Použij **více smysluplných vizuálních odhalení**, pokud pomáhají: nejprve předpověď, pak výsledek; změna jedné proměnné; tok energie; překročení limitu; přechod z nedostatečných dat k odůvodněnému rozhodnutí. Přílet všech karet sám příběh nevysvětluje. Zachovej jednotky, rok, zdroj, baseline a rozlišení modelu/měření.

Dynamika musí mít definované chování při návratu, opakování a rychlém přepnutí. Běžný pohyb otestuj samostatně od `prefers-reduced-motion`. Statické PDF neumí dokázat, že animace fungují; musí obsahovat čitelné konečné stavy, nikoli poloprůhlednou rozběhnutou scénu.

## Realizace

`public/prezentace/` je startovní komponenta. Renderer, CSS i `deck.json` lze přestavět nebo nahradit. Recykluj co pomáhá; nevynucuj framework, 3D ani živou mapu. Navigace nekrade klávesy aktivním vstupům/dialogům; stopky zůstávají dostupné i při demu.

Použij `templates/pitch-runbook.md`: kdo mluví, kdo kliká, předání slova a náhrada při výpadku. Chybějící měření nedoplňuj marketingovým tvrzením. Podrobné zdroje a metodiku dej do evidence, nejdůležitější omezení musí zaznít i v pitchi.

## Před odevzdáním

- Ukaž uživatelův výsledek, ne jen technické testy; odliš převzatý základ od naší práce.
- Projdi celé demo od vstupu po rozhodnutí, včetně změny vstupu a jednoho nepříznivého případu.
- Ověř šipky a časovač, normální i omezený pohyb, cílovou projekci a 1280×720. Základní funkce nesmějí zmizet při zmenšení.
- Nacvič celý příběh do skutečného limitu, pro generálku do 300 sekund včetně dema. 285 sekund + 15 sekund rezervy je doporučení, ne povinný formát.
- Otevři PDF/screenshoty a přehraj případné video ze stejné finální verze. Vypnutí sítě, potřeba serveru a statická záloha musí odpovídat skutečnosti.
- Kritická revize se ptá „Proč na tom uživateli záleží a co to dokazuje?“, nikoli „Je algoritmus dost nový?“.
