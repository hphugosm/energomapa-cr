# EnergoMapa · vstup pro Claude Code

Nejdřív přečti a dodrž `AGENTS.md`, zejména dohodu před implementací, stručné české zprávy a ochranu stávajících dat. Instrukce pro projekt jsou stejné jako pro Codex.

Lokální skills jsou v `.claude/skills/`; odkazy v nich vedou na společný zdroj `.agents/skills/`. Rozdělení podle rolí, volitelné moduly a omezení: `competition/SKILLS.md`. Načítej jen skill relevantní pro svěřený úkol, ne všech devět najednou.

Nejde o instalaci upstream pluginů ani nové oprávnění: žádné automatické hooky, stahování binárek, placené API či vypnutí sandboxu. Po novém checkoutu ověř nabídku lokálních skills v této relaci; dostupnost v jiných klientských/cloud režimech nepředpokládej.
