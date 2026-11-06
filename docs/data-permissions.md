# Podmínky dat ve veřejné verzi 0.6.1

Ověřeno 6. 11. 2026. Tento záznam rozlišuje odstranění neověřeně šířeného obsahu od získání licence. Licence zdrojového kódu neposkytuje práva ke zdrojovým datům.

## OTE — oprávnění nedoloženo, veřejná distribuce odstraněna (A01)

[Zásady používání OTE](https://www.ote-cr.cz/cs/dokumentace/zasady-pouzivani), část Autorská práva, podmiňují kopírování obsahu předchozím písemným souhlasem provozovatele nebo jinou dohodou. V projektu není souhlas pokrývající konkrétní denní XLSX, odvozené hodnoty ani veřejný offline archiv. Veřejné stažení není dokladem takového souhlasu. Nebyla zjištěna konkrétní alternativní licence pokrývající tento způsob distribuce.

Nová větev začíná na `main` (`9d2d3d751110106939bd859f76ce44cfaeed30f2`); neobsahuje předky PR #1. Nepřenáší 92 XLSX, manifest OTE ani čtyři odvozené JSON/CSV. Veřejný build a explicitní obnova databanky OTE vůbec nevolají. Katalog a offline ZIP mají 43 sad a 71 005 řádků. Žádné tržní ceny ani objemy OTE nejsou ve veřejné aplikaci dostupné. Testovací XLSX jsou syntetická.

Samostatný lokální adaptér je určen pouze pro uživatele, který má pro své konkrétní použití oprávnění. Vyžaduje adresář mimo repozitář, uchovává vstupy i výstupy soukromě a nezapojuje je do veřejného katalogu ani archivu. Přepínač potvrzuje odpovědnost uživatele; nevytváří ani nedokládá licenci. Veřejné publikování OTE zůstává podmíněno doloženým oprávněním.

Původní PR #1 a jeho historie zůstávají beze změny. Toto opatření odstraňuje obsah z nové publikační větve a jejích předků; neodstraňuje již zveřejněné objekty z GitHubu.

## Dokument ČEPS/Seyfor — originál vynechán (A02)

[Dokumentace rozhraní 3.2](https://www.ceps.cz/cs/ke-stazeni/webove-sluzby/dokumentace/cepsvip-popis-rozhrani-strukturovana-data-3-2.docx) obsahuje omezení oběhu a užití bez písemného souhlasu Seyfor. Souhlas není doložen. V nové větvi není dokument ani jeho textová kopie; `data/sources/flows.json` uchovává pouze URL, stručný vlastní popis a SHA-256. Obnova dokument pouze zahashuje v paměti. Originál není součástí ZIP.

## Číselná data ČEPS — samostatný nevyřešený požadavek

[Veřejné datové rozhraní ČEPS](https://www.ceps.cz/cs/webove-sluzby) a [datová stránka](https://www.ceps.cz/cs/data) umožňují přístup k číselným údajům. Nebyla doložena konkrétní licence veřejné redistribuce těchto dat. Dokumentační doložka není důkazem licence číselných dat ani důkazem jejich zákazu. Číselné snapshoty zůstávají v rozsahu opravy na výslovné zadání; metadata a UI jejich neurčené podmínky uvádějí. Získání oprávnění není tímto PR prohlášeno za vyřešené. Před vydáním musí být tento požadavek samostatně posouzen.
