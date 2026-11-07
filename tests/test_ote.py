import io
import pathlib
import sys
import unittest
import json
import hashlib
import tempfile
import subprocess
from unittest.mock import patch
from datetime import date

import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'pipeline'))
from ote import parse_export, download_ote, import_ote, build_ote, private_root, snapshot_days


def fixture(day=date(2025, 7, 1), missing=False, price=-10):
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.append([f'Výsledky denního trhu ČR - {day:%d.%m.%Y}'])
    sheet.append(['Hodina', 'Cena (EUR/MWh)', 'Množství\n(MWh)', 'Saldo DT', 'Export', 'Import'])
    for hour in range(1, 25):
        sheet.append([hour, *(['SN'] * 5 if missing and hour == 13 else [price, 20, 5, 15, -10])])
    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


class OTEAdapterTests(unittest.TestCase):
    def test_hourly_utc_negative_price_and_import_sign(self):
        rows = parse_export(fixture(), date(2025, 7, 1))
        self.assertEqual(rows[0]['time'], '2025-06-30T22:00:00Z')
        self.assertEqual(rows[-1]['time'], '2025-07-01T21:00:00Z')
        self.assertEqual(rows[0]['price'], -10)
        self.assertEqual(rows[0]['import'], 10)
        self.assertEqual(rows[0]['net_export'], rows[0]['export'] - rows[0]['import'])

    def test_source_missing_marker_is_null_never_zero(self):
        rows = parse_export(fixture(missing=True), date(2025, 7, 1))
        self.assertIsNone(rows[12]['price'])
        self.assertIsNone(rows[12]['import'])
        self.assertIsNone(rows[12]['traded_volume'])
        self.assertEqual(len(rows), 24)

    def test_wrong_day_and_dst_are_rejected(self):
        with self.assertRaisesRegex(ValueError, 'date mismatch'):
            parse_export(fixture(), date(2025, 7, 2))
        with self.assertRaisesRegex(ValueError, 'DST'):
            parse_export(fixture(day=date(2025, 3, 30)), date(2025, 3, 30))

    def test_private_directory_cannot_be_repository_or_public_subfolder(self):
        for path in (ROOT, ROOT / 'public/private-ote'):
            with self.assertRaisesRegex(ValueError, 'outside the repository'):
                private_root(path)

    def test_revised_first_file_then_second_failure_keeps_entire_old_snapshot(self):
        first, second = date(2025, 7, 1), date(2025, 7, 2)
        def response(request, **kwargs):
            return io.BytesIO(fixture(first if 'day01' in request.full_url else second))
        with tempfile.TemporaryDirectory() as directory, patch('ote.FIRST', first), patch('ote.LAST', second):
            root = pathlib.Path(directory)
            with patch('ote.urlopen', response):
                self.assertEqual(download_ote(root), 2)
            manifest_path = root / 'data/sources/ote-inputs.json'
            original_manifest = manifest_path.read_bytes()
            inputs = json.loads(original_manifest)['inputs']
            original = {name: (root / 'data/raw/databank' / name).read_bytes() for name in inputs}
            def interrupted(request, **kwargs):
                if 'day02' in request.full_url:
                    raise OSError('HTTP 503 simulated second file')
                return io.BytesIO(fixture(first, price=123))
            with patch('ote.urlopen', interrupted), self.assertRaisesRegex(OSError, '503'):
                download_ote(root)
            self.assertEqual(manifest_path.read_bytes(), original_manifest)
            for name, payload in original.items():
                self.assertEqual((root / 'data/raw/databank' / name).read_bytes(), payload)
                self.assertEqual(hashlib.sha256(payload).hexdigest(), inputs[name]['sha256'])
                self.assertEqual(len(parse_export(payload, date.fromisoformat(inputs[name]['day']))), 24)
            self.assertFalse(list((root / 'data/raw/databank/ote-snapshots').glob('.staging-*')))
            # A subsequent successful revision switches all files through one manifest.
            with patch('ote.urlopen', lambda request, **kwargs: io.BytesIO(fixture(first if 'day01' in request.full_url else second, price=123))):
                download_ote(root)
            revised = json.loads(manifest_path.read_bytes())['inputs']
            self.assertNotEqual(revised.keys(), inputs.keys())
            for name, meta in revised.items():
                self.assertEqual(parse_export((root / 'data/raw/databank' / name).read_bytes(), date.fromisoformat(meta['day']))[0]['price'], 123)

    def test_user_file_import_of_full_snapshot_builds_privately_without_any_network(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory) / 'private'
            supplied = pathlib.Path(directory) / 'supplied'
            supplied.mkdir()
            for day in snapshot_days():
                (supplied / f'DT_{day:%d_%m_%Y}_CZ.xlsx').write_bytes(fixture(day))
            original = {p.name: p.read_bytes() for p in supplied.iterdir()}
            with patch('ote.urlopen', side_effect=AssertionError('Import must not use the network')) as network:
                self.assertEqual(import_ote(root, supplied), 92)
                datasets = build_ote(root)
                network.assert_not_called()
            self.assertEqual({p.name: p.read_bytes() for p in supplied.iterdir()}, original)
            self.assertEqual([item['rowCount'] for item in datasets], [2208, 2208, 92, 92])
            self.assertFalse((root / 'public').exists())
            self.assertEqual(len(list((root / 'exports').glob('*'))), 8)
            manifest = json.loads((root / 'data/sources/ote-inputs.json').read_text())
            self.assertEqual(manifest['acquisition'], 'user-file-import')
            for meta in manifest['inputs'].values():
                self.assertIsNone(meta['retrievedAt'])
                self.assertEqual(meta['inputMethod'], 'user-file-import')

    def test_empty_missing_duplicate_or_invalid_user_inputs_never_fall_back_to_download(self):
        first, second = date(2025, 7, 1), date(2025, 7, 2)
        with tempfile.TemporaryDirectory() as directory, patch('ote.FIRST', first), patch('ote.LAST', second), patch('ote.urlopen', side_effect=AssertionError('No download fallback')) as network:
            root = pathlib.Path(directory) / 'private'
            supplied = pathlib.Path(directory) / 'supplied';supplied.mkdir()
            with self.assertRaisesRegex(ValueError, 'user-supplied'):
                import_ote(root, supplied)
            self.assertFalse(root.exists())
            for day in (first, second):
                (supplied / f'ote-{day}.xlsx').write_bytes(fixture(day))
            import_ote(root, supplied)
            manifest = root / 'data/sources/ote-inputs.json';original = manifest.read_bytes()
            originals = {p: p.read_bytes() for p in (root / 'data/raw').rglob('*.xlsx')}
            (supplied / f'ote-{first}.xlsx').write_bytes(fixture(first, price=123))
            (supplied / f'ote-{second}.xlsx').write_bytes(fixture(first))
            with self.assertRaisesRegex(ValueError, 'date mismatch'):
                import_ote(root, supplied)
            self.assertEqual(manifest.read_bytes(), original)
            self.assertTrue(all(p.read_bytes() == payload for p, payload in originals.items()))
            self.assertFalse(list((root / 'data/raw/databank/ote-snapshots').glob('.staging-*')))
            (supplied / f'DT_{first:%d_%m_%Y}_CZ.xlsx').write_bytes(fixture(first))
            with self.assertRaisesRegex(ValueError, 'exactly one'):
                import_ote(root, supplied)
            network.assert_not_called()

    def test_cli_requires_supplied_inputs_and_distinguishes_import_from_download(self):
        with tempfile.TemporaryDirectory() as directory:
            command = [sys.executable, str(ROOT / 'pipeline/ote.py'), '--private-dir', str(pathlib.Path(directory) / 'private'), '--i-have-permission']
            result = subprocess.run(command, capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('no files are downloaded implicitly', result.stderr)
            result = subprocess.run(command + ['--import-dir', directory, '--download'], capture_output=True, text=True)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('not allowed with argument', result.stderr)


if __name__ == '__main__':
    unittest.main()
