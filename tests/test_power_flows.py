"""Regression checks for unit/sign/time distinctions in the ČEPS snapshots."""
import json
from pathlib import Path
import sys
import unittest

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'pipeline'))
from power_flows import parse_xml,complete_sum

class PowerFlows(unittest.TestCase):
    def test_clock_change_preserves_two_distinct_hours_and_missing(self):
        xml=b'''<root><series><serie id="value1" name="PSE Actual [MW]"/></series><data><item date="2026-10-25T02:00:00+02:00" value1="0"/><item date="2026-10-25T02:00:00+01:00"/></data></root>'''
        _,rows=parse_xml(xml)
        self.assertEqual([r['time'] for r in rows],['2026-10-25T00:00:00Z','2026-10-25T01:00:00Z'])
        self.assertEqual(rows[0]['PSE Actual [MW]'],0)
        self.assertIsNone(rows[1]['PSE Actual [MW]'])
        self.assertIsNone(complete_sum([100,None]))

    def test_snapshot_flow_sign_and_separation(self):
        physical=json.loads((ROOT/'public/data/databank/flows-physical.json').read_text())
        planned=json.loads((ROOT/'public/data/databank/flows-commercial.json').read_text())
        self.assertEqual(physical['unit'],'MW')
        self.assertEqual(len(physical['records']),16176)
        self.assertEqual(physical['records'][0]['time'],'2024-12-31T23:00:00Z')
        self.assertEqual(physical['records'][-1]['time'],'2026-11-05T22:00:00Z')
        self.assertNotEqual(physical['records'][0],planned['records'][0])
        self.assertEqual(physical['kind'],'physical_flow')
        self.assertEqual(planned['kind'],'commercial_exchange')
        self.assertIn('Kladná hodnota je dovoz',physical['source']['signConvention'])

    def test_daily_energy_excludes_partial_days(self):
        daily=json.loads((ROOT/'public/data/databank/flows-physical-daily.json').read_text())
        hourly=json.loads((ROOT/'public/data/databank/flows-physical.json').read_text())
        self.assertEqual(daily['unit'],'MWh')
        self.assertEqual(daily['records'][0]['availableHours'],1)
        self.assertIsNone(daily['records'][0]['DE'])
        self.assertIsNone(daily['records'][-1]['DE'])
        self.assertEqual(daily['records'][1]['availableHours'],24)
        self.assertAlmostEqual(daily['records'][1]['DE'],sum(r['DE'] for r in hourly['records'] if r['time'].startswith('2025-01-01')),places=5)


class CountrySaldoLabels(unittest.TestCase):
    def test_a08_opposite_german_profiles_are_explicitly_country_saldos(self):
        folder=ROOT/'public/data/databank'
        physical=json.loads((folder/'flows-physical.json').read_text())
        balance=json.loads((folder/'flows-balance.json').read_text())
        time='2026-01-18T13:00:00Z'
        row=next(r for r in physical['records'] if r['time']==time)
        b=next(r for r in balance['records'] if r['time']==time)
        self.assertAlmostEqual(row['DE'],-97.801,places=3)
        self.assertAlmostEqual(b['import'],sum(max(row[k],0) for k in ('DE','PL','SK','AT')),places=5)
        self.assertAlmostEqual(b['export'],sum(max(-row[k],0) for k in ('DE','PL','SK','AT')),places=5)
        for key in ('import','export'):
            self.assertIn('hodinových sald zemí',next(c['label'] for c in balance['columns'] if c['key']==key))
        self.assertIn('TenneT + 50Hertz',balance['source']['aggregationScope'])
        self.assertIn('před rozdělením znamének',balance['source']['methodology'])
        self.assertIn('Nejde o hrubé toky všech TSO',balance['description'])

if __name__=='__main__':unittest.main()
