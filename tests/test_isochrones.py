import gzip
import hashlib
import json
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'pipeline'))
from isochrones import parameters,validate_geojson,build_isochrones,download_isochrones,DEMO

ORIGIN={'id':'a','name':'A','lat':50,'lon':14}
def collection():
 return {'type':'FeatureCollection','features':[{'type':'Feature','geometry':{'type':'Polygon','coordinates':[[[14,50],[14.1,50],[14.1,50.1],[14,50]]]},'properties':{'contour':t,'metric':'time'}} for t in [15,30,60]]}
class IsochroneTests(unittest.TestCase):
 def test_polygons_and_all_times_required(self):
  self.assertEqual(len(validate_geojson(collection(),[15,30,60])['features']),3)
  with self.assertRaisesRegex(ValueError,'Missing'):validate_geojson(collection(),[15,30,60,120])
  data=collection();data['features'][0]['geometry']={'type':'Point','coordinates':[14,50]}
  with self.assertRaisesRegex(ValueError,'polygon'):validate_geojson(data,[15,30,60])
 def test_parameter_validation_and_real_network_request(self):
  p=parameters(ORIGIN);self.assertTrue(p['polygons']);self.assertEqual(p['costing'],'auto');self.assertEqual([x['time'] for x in p['contours']],[15,30,60])
  with self.assertRaises(ValueError):parameters(ORIGIN,[0])
  with self.assertRaises(ValueError):parameters(dict(ORIGIN,lat=91))
 def fixture(self,root):
  raw=root/'data/raw/isochrones';raw.mkdir(parents=True);sources=root/'data/sources';sources.mkdir(parents=True)
  env={'origin':ORIGIN,'parameters':parameters(ORIGIN),'endpoint':DEMO,'retrievedAt':'2026-10-27T12:00:00Z','response':collection()}
  p=raw/'a.json.gz';p.write_bytes(gzip.compress(json.dumps(env).encode(),mtime=0))
  meta={'source':{'name':'Valhalla','retrievedAt':'2026-10-27'},'limitations':'Only actual origin','rawSha256':{'a.json.gz':hashlib.sha256(p.read_bytes()).hexdigest()}}
  (sources/'isochrones.json').write_text(json.dumps(meta));return p
 def test_offline_build_is_deterministic_and_preserves_origin(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);self.fixture(root)
   with patch('urllib.request.urlopen',side_effect=AssertionError('Offline')):m=build_isochrones(root)
   file=root/'public/data/isochrones/a.geojson';first=file.read_bytes();build_isochrones(root)
   self.assertEqual(first,file.read_bytes());self.assertEqual(m['origins'][0]['id'],'a');self.assertEqual(m['minutes'],[15,30,60]);self.assertEqual(json.loads(first)['features'][0]['properties']['minutes'],60)
 def test_cache_tamper_rejected(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);p=self.fixture(root);p.write_bytes(p.read_bytes()+b'x')
   with self.assertRaisesRegex(ValueError,'checksum'):build_isochrones(root)
 def test_demo_batch_rate_and_time_limits_enforced_before_network(self):
  with tempfile.TemporaryDirectory() as tmp:
   for kwargs in [{'minutes':[120]},{'interval':1},{'origin_list':[ORIGIN]*15}]:
    args={'root':tmp,'origin_list':[ORIGIN],**kwargs}
    with self.assertRaisesRegex(ValueError,'Demo'):download_isochrones(**args)
 def test_resume_skips_provider_call(self):
  with tempfile.TemporaryDirectory() as tmp:
   root=pathlib.Path(tmp);self.fixture(root)
   with patch('urllib.request.urlopen',side_effect=AssertionError('Resume must stay offline')):m=download_isochrones(root,origin_list=[ORIGIN])
   self.assertEqual(len(m['origins']),1)
if __name__=='__main__':unittest.main()
