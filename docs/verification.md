# Ověření aktuální verze

Aktuální protokol, úplné pokrytí metrik, zdroje a známá omezení jsou v [reportu EnergoMapa 0.4.0](report-0.4.0.md).

Průchod sleduje tok UI → relativní statický JSON → generický engine → mapa, graf a profil. Pro bodové vrstvy se ověřuje samostatné explicitní načtení a cache. Modelová a jednorázová data nepřehrávají fiktivní časovou řadu.
