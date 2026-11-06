"""Domain checks for sparse official series, missing values and source integrity."""
import importlib.util
import pathlib
import sys
import tempfile
import unittest

ROOT=pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'pipeline'))
from energy_databank import jsonstat_rows, number, publish, build_mpo

class DatabankTests(unittest.TestCase):
    def test_sparse_jsonstat_coordinates_status_and_explicit_zero(self):
        # Time is fastest-varying, geo order is category index order (not alphabetic).
        data={'id':['geo','time'],'size':[2,2], 'dimension':{
            'geo':{'category':{'index':{'CZ':1,'AT':0}}},
            'time':{'category':{'index':{'2021':1,'2020':0}}}},
            'value':{'0':0,'2':123},'status':{'2':'p'}}
        rows=list(jsonstat_rows(data))
        self.assertEqual(rows[0],({'geo':'AT','time':'2020'},0.0,None))
        self.assertEqual(rows[1],({'geo':'AT','time':'2021'},None,None))
        self.assertEqual(rows[2],({'geo':'CZ','time':'2020'},123.0,'p'))
        self.assertEqual(rows[3],({'geo':'CZ','time':'2021'},None,None))

    def test_missing_and_non_finite_are_never_zero(self):
        for value in (None,'Z','',False,float('nan'),float('inf')):self.assertIsNone(number(value))
        self.assertEqual(number(0),0)
        self.assertEqual(number(-5.5),-5.5)

    def test_published_csv_preserves_empty_cells_and_json_metadata(self):
        import json
        with tempfile.TemporaryDirectory() as directory:
            root=pathlib.Path(directory)
            descriptor=publish(root,'example','Test','energy_balance','GWh','year',{'publisher':'Test','url':'https://example.org','methodology':'Missing remains null'},[{'key':'CZ','type':'number','label':'Česko','unit':'GWh'}],[{'time':'2020','CZ':0},{'time':'2021','CZ':None}])
            data=json.loads((root/'public/data/databank/example.json').read_text())
            self.assertEqual(data['coverage']['missingCells'],1)
            self.assertEqual(data['records'][0]['CZ'],0)
            self.assertIsNone(data['records'][1]['CZ'])
            self.assertEqual(descriptor['unit'],'GWh')
            text=(root/'public/data/databank/example.csv').read_text(encoding='utf-8-sig')
            self.assertIn('2020,0',text)
            self.assertIn('2021,\n',text)

    def test_mpo_rejects_tampered_workbook_before_parsing(self):
        with tempfile.TemporaryDirectory() as directory:
            root=pathlib.Path(directory);path=root/'data/raw/databank/mpo-energy-balance.xlsx';path.parent.mkdir(parents=True);path.write_bytes(b'corrupt')
            with self.assertRaisesRegex(ValueError,'MPO checksum mismatch'):
                build_mpo(root,{'mpo-energy-balance.xlsx':{'sha256':'invalid'}})

if __name__=='__main__':unittest.main()
