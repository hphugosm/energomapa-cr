"""A01/A02/A05: the publication boundary and portable, truthful exports."""
import csv
import hashlib
import io
import json
from pathlib import Path
import sys
import tempfile
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'pipeline'))
from publication import validate_public_tree
from energy_databank import EUROSTAT_DISCLAIMER, EUROSTAT_MODIFICATIONS


class PublicRelease(unittest.TestCase):
    def test_excluded_ote_and_restricted_document_are_not_distributed(self):
        index = json.loads((ROOT / 'public/data/databank/index.json').read_text())
        self.assertEqual(len(index['datasets']), 43)
        self.assertEqual(sum(item['rowCount'] for item in index['datasets']), 71005)
        self.assertFalse(any(item['id'].startswith('ote-') for item in index['datasets']))
        self.assertEqual(index['excludedSources'][0]['status'], 'permission-not-evidenced')
        validate_public_tree(ROOT / 'public')
        self.assertFalse(list((ROOT / 'data/raw').rglob('ote-*.xlsx')))
        self.assertFalse((ROOT / 'data/raw/databank/flows-methodology.docx').exists())
        with zipfile.ZipFile(ROOT / 'public/data/databank/offline.zip') as archive:
            self.assertFalse(any(name.startswith('ote-') or name.endswith('.docx') for name in archive.namelist()))
            for item in index['datasets']:
                for key in ('csv', 'path'):
                    self.assertEqual(archive.read(item[key]), (ROOT / 'public/data/databank' / item[key]).read_bytes())

    def test_publication_guard_rejects_accidental_excluded_import(self):
        for name in ('ote-prices.json', 'ote-2025-07-01.xlsx', 'flows-methodology.docx'):
            with tempfile.TemporaryDirectory() as folder:
                (Path(folder) / name).write_text('synthetic')
                with self.assertRaisesRegex(ValueError, 'Excluded material'):
                    validate_public_tree(folder)

    def test_document_has_only_reference_and_independent_numeric_data_terms(self):
        meta = json.loads((ROOT / 'data/sources/flows.json').read_text())
        reference = meta['documentationReference']
        self.assertEqual(reference['url'], meta['documentation'])
        self.assertRegex(reference['sha256'], r'^[0-9a-f]{64}$')
        self.assertEqual(reference['redistributionPermission'], 'not evidenced')
        self.assertIn('nebylo doloženo', meta['license'])
        self.assertFalse(any(item['path'].endswith('.docx') for item in meta['files']))

    def test_every_csv_retains_metadata_quality_flags_and_exact_values(self):
        index = json.loads((ROOT / 'public/data/databank/index.json').read_text())
        for item in index['datasets']:
            with self.subTest(dataset=item['id']):
                folder = ROOT / 'public/data/databank'
                data = json.loads((folder / item['path']).read_text())
                text = (folder / item['csv']).read_text(encoding='utf-8-sig')
                first, body = text.split('\n', 1)
                self.assertTrue(first.startswith('# metadata: '))
                meta = json.loads(first.removeprefix('# metadata: '))
                self.assertEqual(meta['unit'], data['unit'])
                self.assertEqual(meta['columns'], data['columns'])
                self.assertEqual(meta['timezone'], data['timezone'])
                self.assertEqual(meta['period'], data['period'])
                self.assertEqual(meta['qualityFlags'], data.get('qualityFlags', []))
                for key in ('publisher', 'url', 'retrievedAt', 'methodology', 'license', 'attribution'):
                    self.assertTrue(meta['source'][key], key)
                rows = list(csv.DictReader(io.StringIO(body)))
                self.assertEqual(len(rows), len(data['records']))
                for actual, expected in zip(rows, data['records']):
                    self.assertEqual(actual['time'], expected['time'])
                    for col in data['columns']:
                        key = col['key']; value = expected.get(key)
                        if value is None:
                            self.assertEqual(actual[key], '')
                        elif isinstance(value, (int, float)):
                            self.assertEqual(float(actual[key]), value)
                        else:
                            self.assertEqual(actual[key], str(value))

    def test_offline_manifest_hashes_every_published_file(self):
        public = ROOT / 'public'
        manifest = json.loads((public / 'offline-files.json').read_text())
        self.assertEqual(manifest['schemaVersion'], 2)
        actual = {str(p.relative_to(public)) for p in public.rglob('*') if p.is_file() and p.name not in ('offline-files.json', '.DS_Store')}
        self.assertEqual({item['path'] for item in manifest['files']}, actual)
        for item in manifest['files']:
            payload = (public / item['path']).read_bytes()
            self.assertEqual(len(payload), item['bytes'])
            self.assertEqual(hashlib.sha256(payload).hexdigest(), item['sha256'])

    def test_all_twenty_eurostat_datasets_csv_json_catalog_and_zip_retain_notice_and_flags(self):
        folder = ROOT / 'public/data/databank'
        index = json.loads((folder / 'index.json').read_text())
        eurostat = [item for item in index['datasets'] if item['id'].startswith('eurostat-')]
        self.assertEqual(len(eurostat), 20)
        with zipfile.ZipFile(folder / 'offline.zip') as archive:
            for item in eurostat:
                data = json.loads((folder / item['path']).read_text())
                csv = (folder / item['csv']).read_text(encoding='utf-8-sig')
                metadata = json.loads(csv.splitlines()[0].removeprefix('# metadata: '))
                archived_csv = archive.read(item['csv']).decode('utf-8-sig')
                archived_metadata = json.loads(archived_csv.splitlines()[0].removeprefix('# metadata: '))
                for value in (item, data, metadata, json.loads(archive.read(item['path'])), archived_metadata):
                    with self.subTest(dataset=item['id']):
                        self.assertEqual(value['source']['disclaimer'], EUROSTAT_DISCLAIMER)
                        self.assertEqual(value['source']['modifications'], EUROSTAT_MODIFICATIONS)
                        self.assertIn('Eurostat', value['source']['attribution'])
                self.assertEqual(metadata['qualityFlags'], data['qualityFlags'])
                self.assertEqual(archived_metadata['qualityFlags'], data['qualityFlags'])


if __name__ == '__main__':
    unittest.main()
