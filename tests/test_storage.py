import copy
import gzip
import json
import pathlib
import tempfile
import unittest
import xml.etree.ElementTree as ET
from decimal import Decimal
from pipeline.storage import build_storage, parse_storage

ROOT = pathlib.Path(__file__).resolve().parents[1]

class StorageTests(unittest.TestCase):
    def setUp(self):
        self.tree = ET.fromstring(gzip.decompress((ROOT/'data/raw/storage/tez-sk-17-2026-10-01.xml.gz').read_bytes()))
        # Minimal real official fixture: one licence, first four-device facility.
        self.tree[:] = [self.tree[0]]
        self.code = self.tree.findtext('.//CadasterId')

    def parse(self, mapping=None):
        with tempfile.TemporaryDirectory() as d:
            p = pathlib.Path(d)/'test.xml.gz'; p.write_bytes(gzip.compress(ET.tostring(self.tree)))
            return parse_storage(p, mapping if mapping is not None else {self.code:'100001'}, {'100001','100002'})

    def test_modules_are_not_deduplicated(self):
        values, counts, audit = self.parse()
        self.assertEqual(values['100001'],2)
        self.assertEqual(counts['100001'],1)
        self.assertIsNone(values['100002'])
        self.assertEqual(audit['totalEligibleMW'],2)

    def test_duplicate_equivalent_facility_once(self):
        self.tree.append(copy.deepcopy(self.tree[0]))
        values, counts, audit = self.parse()
        self.assertEqual(values['100001'],2)
        self.assertEqual(audit['duplicateEquivalentFacilitiesIgnored'],1)
        self.assertEqual(counts['100001'],1)

    def test_conflicting_active_facility_rejected(self):
        lic=copy.deepcopy(self.tree[0]);lic.find('.//CadasterId').text='different';self.tree.append(lic)
        with self.assertRaisesRegex(ValueError,'Conflicting'):self.parse()

    def test_unmapped_is_not_zero(self):
        values, counts, audit=self.parse({})
        self.assertEqual(values,{'100001':None,'100002':None})
        self.assertEqual(audit['unallocatedMW'],2)

    def test_cross_municipality_withholds_other_facilities(self):
        lic=copy.deepcopy(self.tree[0]);f=lic.find('.//StorageElec');f.find('StorageElecId').text='new'
        c=copy.deepcopy(f.find('.//TEZCadaster'));c.find('CadasterId').text='other';f.find('TEZCadasterGroup').append(c)
        self.tree.append(lic)
        values,counts,audit=self.parse({self.code:'100001','other':'100002'})
        self.assertIsNone(values['100001']);self.assertEqual(audit['withheldLocatedMW'],2)
        self.assertEqual(audit['totalEligibleMW'],4)

    def test_expired_and_inactive_excluded(self):
        self.tree[0].find('LicValidTo').text='2025-01-01'
        values,counts,audit=self.parse();self.assertTrue(all(v is None for v in values.values()))
        self.assertEqual(audit['inactiveFacilityRowsExcluded'],1)

    def test_mismatched_total_rejected(self):
        self.tree.find('.//OutputSum').text='3'
        with self.assertRaisesRegex(ValueError,'MW disagree'):self.parse()

    def test_nonfinite_negative_or_missing_rejected(self):
        for bad in ['NaN','-1','']:
            self.tree.find('.//OutputElec').text=bad
            with self.assertRaises(ValueError):self.parse()

    def test_actual_source_reconciles_without_fake_mwh_or_points(self):
        territories=json.loads((ROOT/'public/data/territories.json').read_text())['territories']
        metrics,datasets,audit,points=build_storage(territories,ROOT)
        self.assertEqual(len(metrics),2);self.assertEqual(points,[])
        self.assertEqual(audit['activeFacilities'],39)
        self.assertEqual(audit['publishedMunicipalMW'],162.514)
        self.assertEqual(audit['positiveMunicipalities'],33)
        self.assertIsNone(audit['energyCapacityMWh'])
        self.assertNotIn('battery_storage_capacity_mwh',datasets)
        vals=datasets['battery_storage_capacity_mw']['values']['2026']
        self.assertEqual(sum(Decimal(str(v)) for v in vals.values() if v is not None),Decimal('162.514'))

    def test_checksum_tamper_fails(self):
        with tempfile.TemporaryDirectory() as d:
            root=pathlib.Path(d);(root/'data/sources').mkdir(parents=True);(root/'data/raw/storage').mkdir(parents=True)
            meta=json.loads((ROOT/'data/sources/storage.json').read_text())
            meta['rawSha256']={'wrong.gz':'0'*64};(root/'data/sources/storage.json').write_text(json.dumps(meta))
            (root/'data/raw/storage/wrong.gz').write_bytes(b'broken')
            with self.assertRaisesRegex(ValueError,'checksum'):build_storage([],root)

if __name__=='__main__':unittest.main()
