import io
import pathlib
import sys
import unittest
import json
import hashlib
import tempfile
from unittest.mock import patch
from datetime import date

import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'pipeline'))
from ote import parse_export, download_ote, private_root


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


if __name__ == '__main__':
    unittest.main()
