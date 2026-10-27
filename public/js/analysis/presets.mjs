/** Illustrative editable configurations. No suitability claim or hidden business rule. */
const criterion=(metric,weight,direction)=>({metric,weight,direction});
export const SCORING_PRESETS=[
  {id:'solar',name:'FVE',criteria:[criterion('solar_potential_kwh_kwp_year',50,'higher'),criterion('solar_capacity',25,'lower'),criterion('population',25,'higher')]},
  {id:'battery',name:'Bateriové úložiště',criteria:[criterion('generation_capacity',35,'higher'),criterion('solar_capacity',25,'higher'),criterion('industrial_facility_count',25,'higher'),criterion('ev_charging_power_kw',15,'higher')]},
  {id:'charging',name:'Nabíjecí hub',criteria:[criterion('population',50,'higher'),criterion('ev_charging_points',30,'lower'),criterion('industrial_facility_count',20,'higher')]},
  {id:'heating',name:'Příležitost pro teplárenství',criteria:[criterion('heating_solid_fuels',50,'higher'),criterion('population',30,'higher'),criterion('district_heating',20,'lower')]},
  {id:'industry',name:'Dekarbonizace průmyslu',criteria:[criterion('industrial_co2_tonnes',60,'higher'),criterion('industrial_facility_count',25,'higher'),criterion('generation_capacity',15,'higher')]}
];
export default SCORING_PRESETS;
