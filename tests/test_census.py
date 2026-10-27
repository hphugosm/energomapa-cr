import copy
import unittest
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from pipeline.census import CATEGORIES,REGIONS,parse_census,build_census,download_census

def fixture():
    rows=[]
    def territory(level,code,total):
        for category in ['',*CATEGORIES]:
            value=total if category in ('','5') else 0
            rows.append({'idhod':str(len(rows)),'hodnota':str(value),'ukaz_kod':'2607','energie_cis':'3063' if category else '', 'energie_kod':category,'energie_txt':CATEGORIES.get(category,''),'uzemi_cis':level,'uzemi_kod':code,'sldb_rok':'2021','sldb_datum':'2021-03-26'})
    territory('97','19',2)
    for code in REGIONS: territory('100',code,2 if code=='3018' else 0)
    territory('43','123456',2)
    return rows,[{'id':'123456','level':'municipality','regionId':'CZ010'}]

class CensusTests(unittest.TestCase):
    def test_balances_and_missing_current_municipality(self):
        rows,territories=fixture(); territories.append({'id':'654321','level':'municipality','regionId':'CZ010'})
        values,audit=parse_census(rows,territories)
        self.assertEqual(values['heating_gas'],{'123456':2,'654321':None})
        self.assertEqual(audit['missingCurrentMunicipalities'],['654321'])
        self.assertEqual(audit['reconciliation']['heating_gas']['officialCountry'],2)
    def test_solid_fuels_is_exact_category_sum(self):
        rows,t=fixture()
        for row in rows:
            if row['uzemi_kod'] in ('19','3018','123456'):
                row['hodnota']='2' if row['energie_kod'] in ('','2','3') else '0'
                if row['energie_kod'] in ('2','3'): row['hodnota']='1'
        values,audit=parse_census(rows,t)
        self.assertEqual(values['heating_solid_fuels']['123456'],2)
        self.assertEqual(audit['reconciliation']['heating_solid_fuels']['officialCountry'],2)

    def test_unmapped_source_code_audited(self):
        rows,_=fixture();values,audit=parse_census(rows,[])
        self.assertEqual(audit['unmappedSourceMunicipalities'],['123456'])
        self.assertEqual(values['heating_gas'],{})
    def test_zero_total_missing_categories(self):
        rows,territories=fixture(); zero=copy.deepcopy(rows[-13]);zero.update(idhod='zero',uzemi_kod='222222',hodnota='0')
        rows.append(zero);territories.append({'id':'222222','level':'municipality','regionId':'CZ010'})
        values,audit=parse_census(rows,territories)
        self.assertEqual(values['heating_gas']['222222'],0)
        self.assertEqual(len(audit['zeroTotalCategoryOmissions']),12)
    def test_invalid_classification_date_duplicate_and_balance_fail(self):
        for field,value in [('energie_kod','999'),('sldb_datum','2022-03-26'),('hodnota','3')]:
            rows,territories=fixture();rows[-9][field]=value
            with self.subTest(field=field),self.assertRaises(ValueError): parse_census(rows,territories)
        rows,territories=fixture();rows.append(copy.deepcopy(rows[-1]))
        with self.assertRaisesRegex(ValueError,'Duplicate'):parse_census(rows,territories)
    def test_wrong_current_region_requires_review(self):
        rows,territories=fixture();territories[0]['regionId']='CZ020'
        with self.assertRaisesRegex(ValueError,'crosswalk'):parse_census(rows,territories)

    def test_download_rejects_change_and_preserves_files(self):
        import gzip,hashlib,json,tempfile
        from unittest.mock import patch
        from io import BytesIO
        with tempfile.TemporaryDirectory() as directory:
            root=Path(directory);(root/'data/sources').mkdir(parents=True);(root/'data/raw/census').mkdir(parents=True)
            original=b'reviewed CSV snapshot';compressed=gzip.compress(original,mtime=0)
            raw=root/'data/raw/census/source.csv.gz';raw.write_bytes(compressed)
            metadata=root/'data/sources/heating.json'
            meta={'rawFile':'source.csv.gz','rawSha256':hashlib.sha256(compressed).hexdigest(),'uncompressedSha256':hashlib.sha256(original).hexdigest(),'downloadUrl':'https://csu.gov.cz/reviewed-snapshot','source':{'retrievedAt':'2020-01-01'}}
            metadata.write_text(json.dumps(meta));before=metadata.read_bytes()
            with patch('pipeline.census.urlopen',return_value=BytesIO(b'changed source')):
                with self.assertRaisesRegex(ValueError,'review content'):download_census(root)
            self.assertEqual(raw.read_bytes(),compressed);self.assertEqual(metadata.read_bytes(),before)
            with patch('pipeline.census.urlopen',return_value=BytesIO(original)):
                refreshed=download_census(root)
            self.assertEqual(raw.read_bytes(),compressed)
            self.assertNotEqual(refreshed['source']['retrievedAt'],'2020-01-01')
            self.assertEqual(json.loads(metadata.read_text()),refreshed)

    def test_pinned_offline_source(self):
        import json
        root=Path(__file__).resolve().parents[1]
        territories=json.loads((root/'public/data/territories.json').read_text())['territories']
        metrics,datasets,audit=build_census(territories,root)
        self.assertEqual(len(metrics),6)
        self.assertEqual(audit['reconciliation']['occupied_dwellings']['officialCountry'],4480139)
        self.assertEqual(audit['reconciliation']['heating_gas']['officialCountry'],1534547)
        for check in audit['reconciliation'].values():
            self.assertEqual(check['sourceMunicipalSum'],check['officialCountry'])
            self.assertTrue(all(r['difference']==0 for r in check['regions'].values()))
        self.assertTrue(all(m['years']==[2021] for m in metrics))

if __name__=='__main__':unittest.main()
