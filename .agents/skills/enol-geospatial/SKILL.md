---
name: enol-geospatial
description: "Use only when explicitly selected for spatial joins, regional aggregation, coverage or distance analysis in ENOL. Check CRS, units, stable IDs, join multiplicity and licensing; not needed for merely displaying an existing map."
---

# ENOL · prostorová analýza bez falešné přesnosti

Authored ENOL adaptation informed by GeoPandas guidance. Read `AGENTS.md`, `competition/SKILLS.md`, the source methodologies and approved brief. GeoPandas itself is not installed by this skill. Prefer existing Shapely/pyproj/data pipeline where sufficient; isolate any approved extra dependencies and pin tested versions.

Before operating, identify input provenance/hash, stable municipality/facility IDs, observation date, CRS and missing/empty/invalid geometries. Do not infer CRS solely from numeric ranges. Assigning CRS metadata and transforming coordinates are different operations.

Choose a suitable projected CRS with explicit units for planar distance, area and buffers, or an appropriate geodesic calculation. Do not treat latitude/longitude degrees as metres or use a map display projection as an unquestioned measurement CRS. Document coordinate order and transformation assumptions.

Before a join, state the intended predicate and one-to-one/one-to-many cardinality. Count unmatched and multiplied records afterward. Resolve boundary and equal-distance cases explicitly; preserve original IDs. Compare sums before/after aggregation and do not turn unassigned infrastructure into measured zeros.

Use the actual represented geography and time. Regional data are not municipal measurements. A municipality centroid is not a building or plant; aerial proximity is not road access or grid connectability. For an isochrone preserve the true stored origin, travel mode and computed range. Never substitute a circle for a route-time polygon.

Keep original geometries and audit repairs, precision loss and simplification. Export only necessary attributes, retain license/attribution, and do not expose sensitive private coordinates. Reopen the output and check extents, IDs, units and counts. No automatic external geocoding, tiles or routing calls.

Deliver input/output contracts, audited counts, limitations and one useful map/decision, not a new GIS platform. Provenance: `competition/skills-registry.json`.
