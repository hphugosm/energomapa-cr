import copy
import pathlib
import sys
import unittest
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / 'pipeline'))
from validation import validate_metrics


class ValidationTests(unittest.TestCase):
    def setUp(self):
        self.rows = [{'id':'CZ','level':'country'}, {'id':'R','level':'region'}, {'id':'S','level':'region'},
                     {'id':'A','level':'municipality','parentId':'R','areaKm2':2},
                     {'id':'B','level':'municipality','parentId':'R','areaKm2':8},
                     {'id':'C','level':'municipality','parentId':'S','areaKm2':10}]
        self.metric = {'id':'m','unit':'MW','years':[2026], 'timeType':'snapshot', 'status':'verified', 'aggregation':'sum', 'source':{'url':'https://example.invalid/source','asOf':'2026-10-01'}}
        self.data = {'schemaVersion':1,'metricId':'m','values':{'2026':{'A':0,'B':20,'C':None}}}
    def run_report(self, baseline=None):
        return validate_metrics([self.metric], {'m':self.data}, self.rows, baseline)['m']
    def test_additive_coverage_zero_and_no_inferred_empty_region(self):
        report = self.run_report()
        self.assertEqual(report['country_value'],20)
        self.assertEqual(report['regions'],{'R':20,'S':None})
        self.assertEqual(report['municipalities_with_data'],2)
        self.assertAlmostEqual(report['municipality_coverage_pct'],66.6667)
        self.assertEqual(report['min'],0)
        self.assertEqual(report['missing'],1)
        self.assertEqual(report['source_date'],'2026-10-01')
    def test_weighted_mean_is_not_intensity_sum_and_excludes_invalid_area(self):
        self.metric['aggregation']='area_weighted_mean'
        self.data['values']['2026']={'A':100,'B':200}
        self.assertEqual(self.run_report()['country_value'],180)
        self.assertEqual(self.run_report()['sum'],300)
        self.rows[4]['areaKm2']=0
        self.assertEqual(self.run_report()['country_value'],100)
    def test_statuses_separate_not_applicable_from_missing(self):
        self.data['statuses']={'2026':{'C':'not_applicable'}}
        self.assertEqual(self.run_report()['not_applicable'],1)
        self.assertEqual(self.run_report()['missing'],0)
        self.data['statuses']['2026']['A']='missing'
        with self.assertRaisesRegex(ValueError,'conflicting'):self.run_report()
    def test_pinned_coverage_floor_rejects_drop(self):
        self.run_report({'m':{'2026':2}})
        with self.assertRaisesRegex(ValueError,'coverage drop'):self.run_report({'m':{'2026':3}})
    def test_nonfinite_bool_negative_and_strings_fail(self):
        for value in [float('nan'),float('inf'),True,-1,'2']:
            self.data['values']['2026']['A']=value
            with self.subTest(value=value),self.assertRaises(ValueError):self.run_report()
        self.metric['nonNegative']=False
        self.data['values']['2026']['A']=-1
        self.assertEqual(self.run_report()['min'],-1)
    def test_unknown_year_code_and_metadata_fail(self):
        for mutate in [lambda:setattr(self,'data',{**self.data,'values':{'2025':{}}}),
                       lambda:self.data['values']['2026'].update(unknown=1),
                       lambda:self.metric.update(timeType='annual'),lambda:self.metric.update(unit=''),
                       lambda:self.metric.update(status='demo'),lambda:self.metric.update(source={'url':'file:///private'})]:
            with self.subTest(mutate=mutate):
                self.setUp();mutate()
                with self.assertRaises(ValueError):self.run_report()
    def test_duplicate_metric_and_territory_ids_fail(self):
        with self.assertRaisesRegex(ValueError,'duplicate metric'):
            validate_metrics([self.metric,copy.deepcopy(self.metric)],{'m':self.data},self.rows)
        with self.assertRaisesRegex(ValueError,'Duplicate territory'):
            validate_metrics([self.metric],{'m':self.data},self.rows+[self.rows[0]])
    def test_direct_region_has_no_municipal_coverage(self):
        self.data['values']['2026']={'R':12}
        report=self.run_report()
        self.assertEqual(report['regions_with_data'],1)
        self.assertEqual(report['municipalities_with_data'],0)
        self.assertEqual(report['regions']['R'],12)
        self.assertIsNone(report['country_value'])


class ExtendedValidationTests(unittest.TestCase):
    setUp = ValidationTests.setUp
    run_report = ValidationTests.run_report
    def test_source_date_fallback_and_explicit_date(self):
        self.metric['source']={'url':'https://example.invalid','retrievedAt':'2026-10-27'}
        self.assertEqual(self.run_report()['source_date'],'2026-10-27')
        self.metric['sourceDate']='2023-12-31'
        self.assertEqual(self.run_report()['source_date'],'2023-12-31')
    def test_expected_unit_and_physical_extremes(self):
        self.metric['expectedUnit']='MW'
        self.metric['expectedRange']={'min':0,'max':10}
        with self.assertRaisesRegex(ValueError,'expected range'):self.run_report()
        self.data['values']['2026']['B']=10
        self.run_report()
        self.metric['unit']='kW'
        with self.assertRaisesRegex(ValueError,'Unexpected unit'):self.run_report()
    def test_flat_points_contract_and_invalid_coordinates_region_duplicates(self):
        from validation import validate_points
        layer={'id':'plants','type':'arbitrary','source':{'name':'Fixture','url':'https://example.invalid'},'points':[{'id':'p','type':'arbitrary','name':'Point','lat':50,'lon':14,'municipalityCode':'A','regionCode':'R','properties':{}}]}
        self.assertIsNone(validate_points([layer],self.rows))
        for mutate in [lambda d:d['points'][0].update(lat=float('nan')),lambda d:d['points'][0].update(lat=True),lambda d:d['points'][0].update(lon=181),lambda d:d['points'][0].update(regionCode='S'),lambda d:d['points'].append(copy.deepcopy(d['points'][0]))]:
            data=copy.deepcopy(layer);mutate(data)
            with self.assertRaises(ValueError):validate_points([data],self.rows)

if __name__=='__main__':unittest.main()
