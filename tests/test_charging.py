import importlib.util
import pathlib
import unittest
from shapely.geometry import box
from pyproj import Transformer

ROOT=pathlib.Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('charging',ROOT/'pipeline/charging.py');c=importlib.util.module_from_spec(spec);spec.loader.exec_module(c)

class ChargingTests(unittest.TestCase):
    def test_numeric_source_formats(self):
        self.assertEqual(c.number('50,1386864N'),50.1386864)
        self.assertEqual(c.number('400'),400)
        for value in ('NaN','inf',-2,True):
            with self.assertRaises(ValueError):c.number(value)
    def test_distinct_devices_at_same_location_are_preserved(self):
        x,y=Transformer.from_crs(4326,5514,always_xy=True).transform(14.4,50.1)
        territories=[{'id':'1','level':'municipality','regionId':'R'},{'id':'2','level':'municipality','regionId':'R'}]
        base={'address':'A','position':'001','postcode':'10000','municipalityName':'X','operator':'O','lat':50.1,'lon':14.4,'points':2,'powerKw':50,'stations':1}
        records=[dict(base,row=8),dict(base,row=9)]
        values,audit,points=c.allocate(records,territories,{'1':box(x-5,y-5,x+5,y+5),'2':box(x+10,y+10,x+20,y+20)})
        self.assertEqual(len(points),2)
        self.assertEqual(audit['ambiguousIdentityGroups'],[[8,9]])
        self.assertEqual(values['ev_charging_stations']['1'],2)
        self.assertIsNone(values['ev_charging_stations']['2'])
        self.assertEqual(audit['reconciliation']['ev_charging_points']['excludedRowSum'],0)
    def test_unique_and_unmapped_reconcile(self):
        x,y=Transformer.from_crs(4326,5514,always_xy=True).transform(14.4,50.1)
        territories=[{'id':'1','level':'municipality','regionId':'R'}]
        base={'address':'A','position':'001','postcode':'10000','municipalityName':'X','operator':'O','lat':50.1,'lon':14.4,'points':2,'powerKw':50,'stations':1}
        records=[dict(base,row=8),dict(base,row=9,address='B',lat=49.1)]
        values,audit,points=c.allocate(records,territories,{'1':box(x-5,y-5,x+5,y+5)})
        self.assertEqual(values['ev_charging_points']['1'],2)
        self.assertEqual(audit['unmappedRows'],[9])
        self.assertIsNone(points[1]['municipalityCode'])
    def test_real_snapshot_header_discrepancy_is_visible(self):
        import gzip,json
        meta=json.loads((ROOT/'data/sources/charging.json').read_text())
        records,header=c.parse_workbook(gzip.decompress((ROOT/'data/raw/charging'/meta['rawFile']).read_bytes()))
        self.assertEqual(len(records),3790)
        self.assertEqual(sum(r['points'] for r in records),6601)
        self.assertEqual(header,{'stations':3783,'points':6591})
        self.assertEqual(sum(r['powerKw'] for r in records),336558.9)

if __name__=='__main__':unittest.main()
