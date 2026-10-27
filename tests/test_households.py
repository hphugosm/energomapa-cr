import csv
import copy
import json
from pathlib import Path
import unittest
from pipeline.households import build_households,parse_households
from pipeline.census import REGIONS


def fixture():
    rows=[]
    for level,code,value in [('97','19',3),*[( '100',c,3 if c=='3018' else 0) for c in REGIONS],('43','123456',3)]:
        rows.append(dict(idhod=str(len(rows)),hodnota=str(value),ukaz_kod='2423',ukaz_txt='Počet hospodařících domácností',sldb_datum='2021-03-26',sldb_rok='2021',uzemi_cis=level,uzemi_kod=code,clenu_cis='',clenu_kod='',typ_cis='',typ_kod='',typ_struktura=''))
    return rows,[{'id':'123456','level':'municipality','regionId':'CZ010'}]


class HouseholdTests(unittest.TestCase):
    def test_totals_ignore_size_type_details_and_missing_is_null(self):
        rows,t=fixture();detail=copy.deepcopy(rows[-1]);detail.update(idhod='detail',typ_cis='3303',typ_kod='12',typ_struktura='1',hodnota='2');rows.append(detail)
        t.append({'id':'654321','level':'municipality','regionId':'CZ010'})
        values,a=parse_households(rows,t)
        self.assertEqual(values,{'123456':3,'654321':None})
        self.assertEqual(a['reconciliation']['households']['officialCountry'],3)
    def test_drift_duplicate_missing_total_and_wrong_region_rejected(self):
        for field,value in [('ukaz_kod','2607'),('sldb_datum','2022-03-26'),('hodnota','-1')]:
            rows,t=fixture();rows[-1][field]=value
            with self.subTest(field=field),self.assertRaises(ValueError):parse_households(rows,t)
        rows,t=fixture();rows.append(copy.deepcopy(rows[-1]))
        with self.assertRaises(ValueError):parse_households(rows,t)
        rows,t=fixture();rows.pop(0)
        with self.assertRaises(ValueError):parse_households(rows,t)
        rows,t=fixture();t[0]['regionId']='CZ020'
        with self.assertRaisesRegex(ValueError,'crosswalk'):parse_households(rows,t)
    def test_pinned_offline_source_and_official_aggregates(self):
        root=Path(__file__).resolve().parents[1]
        territories=json.loads((root/'public/data/territories.json').read_text())['territories']
        metrics,datasets,audit,points=build_households(territories,root)
        self.assertEqual(metrics[0]['id'],'households');self.assertEqual(metrics[0]['timeType'],'snapshot')
        self.assertEqual(audit['sourceRows'],177448)
        check=audit['reconciliation']['households'];self.assertEqual(check['officialCountry'],4813103)
        self.assertEqual(check['sourceMunicipalSum'],4813103);self.assertEqual(check['sourceRegionalSum'],4813103)
        self.assertEqual(len(check['regions']),14);self.assertTrue(all(x['difference']==0 for x in check['regions'].values()))
        self.assertEqual(audit['unmappedSourceMunicipalities'],[])
        self.assertEqual(audit['missingCurrentMunicipalities'],['503941','545422','555177','592935'])
        self.assertIsNone(datasets['households']['values']['2021']['592935']);self.assertEqual(points,{})

if __name__=='__main__': unittest.main()
