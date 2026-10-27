# Ověření aktuální verze

Aktuální protokol, úplné pokrytí metrik, zdroje a známá omezení jsou v [reportu EnergoMapa 0.4.0](report-0.4.0.md).

Průchod sleduje tok UI → relativní statický JSON → generický engine → mapa, graf a profil. Pro bodové vrstvy se ověřuje samostatné explicitní načtení a cache. Modelová a jednorázová data nepřehrávají fiktivní časovou řadu.

## EnergoMapa 0.5.0

85 JS a 78 Python testů prošlo; deterministický build vytvořil 105 identických výstupů. Veřejné nasazení `54f1da2` prošlo [GitHub Actions](https://github.com/hphugosm/energomapa-cr/actions/runs/40485986739) i browser smoke. Podrobnosti funkcí, zdrojů, velikostí a omezení obsahuje [report 0.5.0](report-0.5.0.md).
