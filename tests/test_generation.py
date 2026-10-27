"""Allocation, classification and accounting regressions for licensed metrics."""
import gzip
import pathlib
import tempfile
import unittest
import xml.etree.ElementTree as ET
from pipeline.generation import parse_generation
from test_solar import output, facility, licence

class GenerationTests(unittest.TestCase):
    def parse(self,*licences,metric='generation_capacity'):
        root=ET.Element('Licence'); root.extend(licences)
        with tempfile.TemporaryDirectory() as folder:
            path=pathlib.Path(folder)/'input.gz';path.write_bytes(gzip.compress(ET.tostring(root)))
            return parse_generation(path,{'k1':'A','k2':'A','k3':'B'},{'A','B','C'},metric)

    def test_total_counts_electrical_resources_once_not_thermal_or_cadastres(self):
        a=output(mw='2.5');a['OutputTherm']='100'
        vals,audit=self.parse(licence(facility(outputs=[a,a,output('r2','3','VTE','R')],cadastres=('k1','k2'))))
        self.assertEqual(vals,{'A':5.5,'B':None,'C':None})
        self.assertEqual(audit['eligibleResources'],2)
        self.assertEqual(audit['totalEligibleMW'],5.5)

    def test_wind_resource_in_mixed_facility_and_fuel_fallback(self):
        vals,audit=self.parse(licence(facility(outputs=[output(),output('wind','2','VTE','R'),output('wind2','1','','R')])),metric='wind_capacity')
        self.assertEqual(vals['A'],3)
        self.assertEqual(audit['fuelFallbackResources'],1)

    def test_hydro_excludes_pumped_and_conflicting_solar(self):
        vals,audit=self.parse(licence(facility(outputs=[output('h','1','VE','Q'),output('p','100','PVE','Q')]),facility('bad',[output('x','3','VE','O')],('k3',))),metric='hydro_capacity')
        self.assertEqual(vals['A'],1);self.assertIsNone(vals['B'])
        self.assertEqual(audit['excludedConflictingTypeMW'],3)
        self.assertEqual(audit['totalEligibleMW'],1)

    def test_missing_resource_type_does_not_turn_pumped_into_hydro(self):
        p=facility(outputs=[output('p','100','','Q')]); tech=ET.SubElement(p,'TechnicalData');ET.SubElement(tech,'ElecPremiseTypeId').text='PVE'
        vals,audit=self.parse(licence(p),metric='hydro_capacity')
        self.assertEqual(audit['totalEligibleMW'],0)
        self.assertTrue(all(v is None for v in vals.values()))

    def test_ambiguous_allocation_withholds_all_affected_values(self):
        vals,audit=self.parse(licence(facility(),facility('amb',[output('r2','10')],('k1','k3'))))
        self.assertEqual(vals,{'A':None,'B':None,'C':None})
        self.assertEqual(audit['totalEligibleMW'],12.5)
        self.assertEqual(audit['unallocatedMW'],10)
        self.assertEqual(audit['withheldLocatedMW'],2.5)
        self.assertEqual(audit['publishedMunicipalMW'],0)

    def test_inactive_and_unknown_locations_never_infer_zero(self):
        vals,audit=self.parse(licence(facility(DateEnd='2025-01-01')),licence(facility('unknown',[output('r2','3')],())))
        self.assertTrue(all(v is None for v in vals.values()));self.assertEqual(audit['totalEligibleMW'],3)
        self.assertEqual(audit['unallocatedMW'],3)

    def test_invalid_capacity_and_conflicting_duplicates_fail(self):
        for rows in [[output(mw='NaN')],[output(mw='-1')],[output(),output(mw='3')],[output(),output(kind='VTE',fuel='R')],[output(rid='')]]:
            with self.subTest(rows=rows),self.assertRaises(ValueError):self.parse(licence(facility(outputs=rows)))

    def test_equivalent_facility_across_licenses_counts_once(self):
        vals,audit=self.parse(licence(facility()),licence(facility()))
        self.assertEqual(vals['A'],2.5)
        self.assertEqual(audit['duplicateEquivalentFacilitiesIgnored'],1)
        with self.assertRaises(ValueError):self.parse(licence(facility()),licence(facility(cadastres=('k3',))))

    def test_pinned_drahany_unit_and_classification(self):
        path=pathlib.Path(__file__).resolve().parents[1]/'data/raw/solar/tez-sk-11-2026-10-01.xml.gz'
        root=ET.parse(gzip.open(path)).getroot()
        lic=next(l for l in root if l.findtext('LicId')=='110605085')
        p=lic.find('TEZGroup/PremiseElec')
        self.assertEqual(p.findtext('TEZCadasterGroup/TEZCadaster/CadasterId'),'631523')
        row=p.find('PremiseElecOutputsGroup/PremiseElecOutput')
        self.assertEqual(row.findtext('OutputElec'),'2.00000')
        self.assertEqual(row.findtext('ElecPremiseTypeId'),'VTE')
        self.assertEqual(row.findtext('FuelTypeId'),'R')
