"""Synthetic offline cases for ERÚ photovoltaic classification and allocation."""
import gzip
import pathlib
import tempfile
import unittest
import xml.etree.ElementTree as ET

from pipeline.solar import parse_solar


def output(rid='r1', mw='2.5', kind='SLE', fuel='O'):
    return {'ResourceElecId':rid,'OutputElec':mw,'ElecPremiseTypeId':kind,'FuelTypeId':fuel}


def facility(fid='f1', outputs=None, cadastres=('k1',), **dates):
    p = ET.Element('PremiseElec')
    for key,value in {'PremiseElecId':fid,'DateBegin':'2020-01-01','DateEnd':'1900-01-01',**dates}.items():
        ET.SubElement(p,key).text=value
    group=ET.SubElement(p,'PremiseElecOutputsGroup')
    for row in outputs if outputs is not None else [output()]:
        o=ET.SubElement(group,'PremiseElecOutput')
        for key,value in row.items(): ET.SubElement(o,key).text=value
    group=ET.SubElement(p,'TEZCadasterGroup')
    for code in cadastres: ET.SubElement(ET.SubElement(group,'TEZCadaster'),'CadasterId').text=code
    return p


def licence(*facilities, **fields):
    lic=ET.Element('LicenceItem')
    for key,value in {'ProcesStatus':'Udělená licence','VersionStatusDes':'Aktivní verze',
                      'LicValidFrom':'2020-01-01','LicValidTo':'1900-01-01',
                      'VersionValidFrom':'2020-01-01','VersionValidTo':'1900-01-01',**fields}.items():
        ET.SubElement(lic,key).text=value
    group=ET.SubElement(lic,'TEZGroup')
    group.extend(facilities)
    return lic


class SolarParserTests(unittest.TestCase):
    def parse(self, *licences):
        root=ET.Element('Licence'); root.extend(licences)
        with tempfile.TemporaryDirectory() as folder:
            path=pathlib.Path(folder)/'snapshot.xml.gz'
            path.write_bytes(gzip.compress(ET.tostring(root,encoding='utf-8'),mtime=0))
            return parse_solar(path,{'k1':'A','k2':'A','k3':'B'},{'A','B','C'})

    def test_hybrid_counts_solar_resource_not_facility_total(self):
        values,audit=self.parse(licence(facility(outputs=[output(),output('wind','100','VE','V')],cadastres=('k1','k2'))))
        self.assertEqual(values,{'A':2.5,'B':None,'C':None})
        self.assertEqual(audit['totalEligibleSolarMW'],2.5)
        self.assertEqual(audit['multipleCadastreFacilities'],1)
        self.assertEqual(audit['mixedTechnologyFacilities'],1)

    def test_cross_municipality_facility_is_withheld_and_taints_known_values(self):
        values,audit=self.parse(licence(facility(),facility('f2',[output('r2','10')],('k1','k3'))))
        self.assertEqual(values,{'A':None,'B':None,'C':None})
        self.assertEqual(audit['unallocatedSolarMW'],10)
        self.assertEqual(audit['taintedMunicipalities'],['A','B'])
        self.assertEqual(audit['withheldLocatedMW'],2.5)

    def test_duplicate_identical_resource_counts_once(self):
        values,audit=self.parse(licence(facility(outputs=[output(),output()])))
        self.assertEqual(values['A'],2.5)
        self.assertEqual(audit['duplicateResourceRowsIgnored'],1)
        self.assertEqual(audit['solarResources'],1)

    def test_conflicting_resource_and_duplicate_active_facility_rejected(self):
        for facilities in [(facility(outputs=[output(),output(mw='3')] ),),
                           (facility(),facility('f2',[output()])),
                           (facility(),facility(outputs=[output('r2')]))]:
            with self.subTest(facilities=facilities), self.assertRaises(ValueError):
                self.parse(licence(*facilities))

    def test_inactive_licences_versions_and_facilities_are_excluded(self):
        cases=[({'ProcesStatus':'Zaniklá licence'},{}),({'VersionStatusDes':'Neaktivní verze'},{}),
               ({'LicValidFrom':'2027-01-01'},{}),({'LicValidTo':'2025-12-31'},{}),
               ({'VersionValidFrom':'2027-01-01'},{}),({'VersionValidTo':'2025-12-31'},{}),
               ({},{'DateBegin':'2027-01-01'}),({},{'DateEnd':'2025-12-31'})]
        for lic_fields,facility_fields in cases:
            with self.subTest(licence=lic_fields,facility=facility_fields):
                values,audit=self.parse(licence(facility(**facility_fields),**lic_fields))
                self.assertTrue(all(v is None for v in values.values()))
                self.assertEqual(audit['totalEligibleSolarMW'],0)
                self.assertEqual(audit['inactiveSolarFacilities'],1)

    def test_blank_type_solar_fuel_fallback_and_conflicting_type(self):
        values,audit=self.parse(licence(facility(outputs=[output(kind='')]),
                                      facility('f2',[output('r2','9','VE','O')],('k3',))))
        self.assertEqual(values['A'],2.5)
        self.assertIsNone(values['B'])
        self.assertEqual(audit['solarFuelFallbackResources'],1)
        self.assertEqual(audit['excludedConflictingTypeMW'],9)
        self.assertEqual(audit['totalEligibleSolarMW'],2.5)

    def test_unknown_or_missing_cadastre_never_becomes_zero(self):
        for codes in [(),('unknown',),('k1','unknown')]:
            with self.subTest(codes=codes):
                values,audit=self.parse(licence(facility(cadastres=codes)))
                self.assertEqual(values,{'A':None,'B':None,'C':None})
                self.assertEqual(audit['unallocatedSolarMW'],2.5)
                self.assertEqual(audit['missingOrUnmappedCadastreFacilities'],1)

    def test_expired_conflict_does_not_taint_current_municipality(self):
        values,audit=self.parse(licence(facility(),facility('old',[output('old-resource','9','VE','O')],DateEnd='2025-01-01')))
        self.assertEqual(values['A'],2.5)
        self.assertEqual(audit['excludedConflictingTypeMW'],0)
        for mw in ['NaN','Infinity','-1']:
            with self.subTest(mw=mw), self.assertRaises(ValueError):
                self.parse(licence(facility(outputs=[output(mw=mw,kind='VE',fuel='O')])))

    def test_missing_ids_and_malformed_dates_fail_closed(self):
        for f in [facility(fid=''),facility(outputs=[output(rid='')]),
                  facility(DateBegin='2026-99-01'),facility(DateEnd='20261001')]:
            with self.subTest(facility=ET.tostring(f)), self.assertRaises(ValueError):
                self.parse(licence(f))
        for fields in [{'LicValidFrom':''},{'VersionValidTo':'garbage'}]:
            with self.subTest(fields=fields), self.assertRaises(ValueError):
                self.parse(licence(facility(),**fields))

    def test_invalid_capacity_rejected_and_zero_is_conservatively_null(self):
        for mw in ['-0.1','NaN','Infinity']:
            with self.subTest(mw=mw), self.assertRaises(ValueError):
                self.parse(licence(facility(outputs=[output(mw=mw)])))
        values,audit=self.parse(licence(facility(outputs=[output(mw='0')])))
        self.assertTrue(all(v is None for v in values.values()))
        self.assertEqual(audit['totalEligibleSolarMW'],0)


if __name__ == '__main__':
    unittest.main()
