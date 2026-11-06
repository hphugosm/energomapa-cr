import io
import pathlib
import sys
import unittest
from datetime import date

import openpyxl

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'pipeline'))
from ote import parse_export


def fixture(day=date(2025, 7, 1), missing=False):
    workbook = openpyxl.Workbook()
    sheet = workbook.active
    sheet.append([f'Výsledky denního trhu ČR - {day:%d.%m.%Y}'])
    sheet.append(['Hodina', 'Cena (EUR/MWh)', 'Množství\n(MWh)', 'Saldo DT', 'Export', 'Import'])
    for hour in range(1, 25):
        sheet.append([hour, *(['SN'] * 5 if missing and hour == 13 else [-10, 20, 5, 15, -10])])
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

    def test_real_pinned_ote_has_negative_prices_and_24_hours(self):
        payload = (ROOT / 'data/raw/databank/ote-2025-09-21.xlsx').read_bytes()
        rows = parse_export(payload, date(2025, 9, 21))
        self.assertEqual(len(rows), 24)
        self.assertEqual(rows[13]['price'], -10.73)
        self.assertEqual(rows[0]['price'], 3.45)


if __name__ == '__main__':
    unittest.main()
