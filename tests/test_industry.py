"""Exact pollutant semantics, units, missingness and reconciliation."""
import unittest
from pipeline.industry import compile_industry

SOURCE={'name':'EEA test','url':'https://eea.europa.eu'}
TERRITORIES=[{'id':'A','level':'municipality','regionId':'R'},{'id':'B','level':'municipality','regionId':'R'}]
def row(fid='f1',year='2024',emissions='1000000',**changes):
    value={'countryCode':'CZ','facilityId':fid,'reportingYear':year,'emissions':emissions,'unit':'kg',
           'pollutantName':'Carbon dioxide (CO2)','pointGeometryLat':'50','pointGeometryLon':'14',
           'facilityName':'Plant','EPRTRSectorName':'Energy'}
    value.update(changes);return value

def compile(rows,locate=lambda lon,lat:'A'):
    return compile_industry(rows,TERRITORIES,locate,SOURCE)

class IndustryTests(unittest.TestCase):
    def test_total_including_biomass_not_excluding_biomass_or_other_pollutants(self):
        metrics,data,audit,points=compile([row(),row(pollutantName='Carbon dioxide (CO2) excluding biomass',emissions='500'),row(pollutantName='Nitrogen oxides (NOX)',emissions='100')])
        self.assertEqual(data['industrial_co2_tonnes']['values']['2024'],{'A':1000,'B':None})
        self.assertEqual(data['industrial_facility_count']['values']['2024']['A'],1)
        self.assertEqual(len(points['industrial_facilities']['points']),1)
        self.assertEqual(audit['years']['2024']['sourceCO2Tonnes'],1000)
    def test_missing_year_is_null_no_interpolation(self):
        metrics,data,_,_=compile([row(year='2022'),row(year='2024',emissions='0')])
        self.assertEqual(metrics[0]['years'],[2022,2024])
        self.assertEqual(data['industrial_co2_tonnes']['values']['2024']['A'],0)
        self.assertIsNone(data['industrial_co2_tonnes']['values']['2024']['B'])
    def test_duplicate_and_conflicting_release(self):
        _,data,audit,_=compile([row(),row()])
        self.assertEqual(audit['equivalentDuplicatesIgnored'],1)
        self.assertEqual(data['industrial_facility_count']['values']['2024']['A'],1)
        with self.assertRaises(ValueError):compile([row(),row(emissions='1')])
    def test_unlocated_reconciles_not_guessed(self):
        _,data,audit,points=compile([row()],lambda lon,lat:None)
        self.assertIsNone(data['industrial_co2_tonnes']['values']['2024']['A'])
        self.assertEqual(audit['years']['2024']['unallocatedCO2Tonnes'],1000)
        self.assertEqual(points['industrial_facilities']['points'],[])
    def test_invalid_values_and_unit_fail(self):
        for changes in [{'emissions':'NaN'},{'emissions':'-1'},{'unit':'tonnes'},{'countryCode':'DE'}]:
            with self.subTest(changes=changes),self.assertRaises(ValueError):compile([row(**changes)])
    def test_multiple_facilities_and_years_count_independently(self):
        _,data,_,_=compile([row(),row(fid='f2'),row(year='2023')])
        self.assertEqual(data['industrial_facility_count']['values']['2024']['A'],2)
        self.assertEqual(data['industrial_co2_tonnes']['values']['2024']['A'],2000)

    def test_unique_geometry_only_no_nearest_or_ambiguous_assignment(self):
        from shapely.geometry import box
        from pyproj import Transformer
        from pipeline.industry import locator
        x,y=Transformer.from_crs(4326,5514,always_xy=True).transform(14,50)
        polygon=box(x-100,y-100,x+100,y+100)
        self.assertEqual(locator({'A':polygon})(14,50),'A')
        self.assertIsNone(locator({'A':polygon,'B':polygon})(14,50))
        self.assertIsNone(locator({'A':polygon})(15,50))

    def test_pinned_full_czech_subset_offline(self):
        import csv,gzip,json,pathlib,hashlib
        root=pathlib.Path(__file__).resolve().parents[1]
        raw=root/'data/raw/industry/F1_4_Air_Releases_Facilities_CZ.csv.gz'
        source=json.loads((root/'data/sources/industry.json').read_text())
        self.assertEqual(hashlib.sha256(raw.read_bytes()).hexdigest(),source['rawSha256'][raw.name])
        with gzip.open(raw,'rt',encoding='utf-8-sig',newline='') as stream:rows=list(csv.DictReader(stream))
        self.assertEqual(len(rows),13445)
        metrics,data,audit,points=compile(rows)
        self.assertEqual(metrics[0]['years'],list(range(2007,2023)))
        self.assertEqual(audit['selectedCO2FacilityYearRecords'],1100)
        self.assertEqual(audit['years']['2022']['sourceCO2Facilities'],64)
        self.assertAlmostEqual(data['industrial_co2_tonnes']['values']['2022']['A'],57787024.10869017,places=5)
        self.assertEqual(len(points['industrial_facilities']['points']),1100)

if __name__=='__main__':unittest.main()
