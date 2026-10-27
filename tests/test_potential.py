import gzip
import hashlib
import json
import pathlib
import sys
import tempfile
import unittest
from unittest.mock import patch
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'pipeline'))
from potential import PARAMETERS, ENDPOINT, request_parameters, validate_response, build_potential, read_cache, download_potential

def response(params):
    return {'inputs':{'location':{'latitude':params['lat'],'longitude':params['lon']},'meteo_data':{'radiation_db':'PVGIS-SARAH3','year_min':2005,'year_max':2023,'use_horizon':True},'pv_module':{'technology':'c-Si','peak_power':1,'system_loss':14},'mounting_system':{'fixed':{'slope':{'value':39,'optimal':True},'azimuth':{'value':0},'type':'free-standing'}}},'outputs':{'totals':{'fixed':{'E_y':1100,'H(i)_y':1400}}}}

class PotentialTests(unittest.TestCase):
    def setUp(self):
        self.t={'id':'554804','level':'municipality','centroid':[14.4,50.1]}
        self.params=request_parameters(self.t)
    def test_fixed_model_parameters_and_coordinate_order(self):
        self.assertEqual(request_parameters(dict(self.t,centroid={'lat':50.1,'lon':14.4})),self.params)
        self.assertEqual(self.params['lat'],50.1); self.assertEqual(self.params['lon'],14.4)
        self.assertEqual(self.params['peakpower'],1); self.assertEqual(self.params['loss'],14)
        self.assertEqual(validate_response(response(self.params),self.params)['solar_potential_kwh_kwp_year'],1100)
    def test_rejects_coordinate_swap_and_source_drift(self):
        with self.assertRaises(ValueError): request_parameters(dict(self.t,centroid=[50.1,14.4]))
        for field,value in [('year_max',2024),('radiation_db','PVGIS-ERA5'),('use_horizon',False)]:
            data=response(self.params); data['inputs']['meteo_data'][field]=value
            with self.assertRaises(ValueError): validate_response(data,self.params)
        data=response(self.params); data['inputs']['location']['latitude']=49
        with self.assertRaises(ValueError): validate_response(data,self.params)
    def fixture(self,root):
        folder=root/'data/raw/pvgis';folder.mkdir(parents=True)
        envelope={'endpoint':ENDPOINT,'parameters':self.params,'municipalityId':self.t['id'],'response':response(self.params)}
        path=folder/'554804.json.gz';path.write_bytes(gzip.compress(json.dumps(envelope).encode(),mtime=0))
        metadata={'source':{'name':'JRC'},'rawSha256':{path.name:hashlib.sha256(path.read_bytes()).hexdigest()}}
        (root/'data/sources').mkdir();(root/'data/sources/pvgis.json').write_text(json.dumps(metadata))
        return path
    def test_offline_complete_modelled_outputs_no_normalizations_or_sums(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp);self.fixture(root)
            with patch('urllib.request.urlopen',side_effect=AssertionError('Offline')):
                metrics,sets,audit,points=build_potential([self.t],root)
            self.assertEqual(len(metrics),3);self.assertEqual(points,[])
            for m in metrics:
                self.assertTrue(m['modelled']); self.assertEqual(m['timeType'],'static');self.assertEqual(m['years'],[2023]);self.assertEqual(m['normalizations'],['absolute']);self.assertEqual(m['aggregation'],'area_weighted_mean')
            self.assertEqual(sets['optimal_slope_deg']['values']['2023']['554804'],39)
            self.assertEqual(audit['missingMunicipalities'],[])
    def test_missing_municipality_is_failure_not_partial_or_interpolation(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp);self.fixture(root)
            with self.assertRaisesRegex(ValueError,'incomplete municipal coverage'):
                build_potential([self.t,dict(self.t,id='500001')],root)
    def test_tamper_and_stale_parameters_fail(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp);path=self.fixture(root)
            with self.assertRaisesRegex(ValueError,'Stale'): read_cache(path,dict(self.params,loss=10))
            path.write_bytes(path.read_bytes()+b'x')
            with self.assertRaisesRegex(ValueError,'checksum'): build_potential([self.t],root)
    def test_resume_does_not_call_network(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=pathlib.Path(tmp);self.fixture(root)
            with patch('urllib.request.urlopen',side_effect=AssertionError('Cache should skip network')):
                hashes=download_potential([self.t],root)
            self.assertEqual(len(hashes),1)
    def test_nan_result_rejected(self):
        data=response(self.params);data['outputs']['totals']['fixed']['E_y']=float('nan')
        with self.assertRaises(ValueError): validate_response(data,self.params)

if __name__=='__main__': unittest.main()
