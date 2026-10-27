"""Offline regression cases for the streamed ČSÚ population refresh."""
import csv
import gzip
import io
import pathlib
import tempfile
import unittest
from unittest.mock import patch

from pipeline import download


class PopulationDownloadTests(unittest.TestCase):
    def refresh(self, content, folder):
        with patch.object(download, 'RAW', pathlib.Path(folder)), patch.object(
            download.urllib.request, 'urlopen',
            side_effect=[io.BytesIO(content.encode('utf-8')), io.BytesIO(b'xlsx')],
        ) as fetch:
            download.download_tables()
        return fetch

    def test_filters_entire_stream_with_interleaved_indicators_and_bom(self):
        source='\ufeffIndicatorType,Value,Name\r\nother,9,first\r\n2406UAP891,10,"Town, A"\r\nother,8,middle\r\n2406UAP891,20,B\r\n'
        with tempfile.TemporaryDirectory() as folder:
            self.refresh(source, folder)
            raw=pathlib.Path(folder)/'population_2018_2025.csv.gz'
            rows=list(csv.DictReader(io.StringIO(gzip.decompress(raw.read_bytes()).decode())))
            self.assertEqual([row['Value'] for row in rows], ['10','20'])
            self.assertEqual(rows[0]['Name'], 'Town, A')
            first=raw.read_bytes()
            self.refresh(source, folder)
            self.assertEqual(raw.read_bytes(), first)

    def test_invalid_or_missing_target_preserves_existing_archive(self):
        for source in (
            'IndicatorType,Value\nother,1\n',
            'WrongColumn,Value\n2406UAP891,1\n',
            'IndicatorType,Value\n2406UAP891,1\n2406UAP891\n',
            'IndicatorType,Value\n2406UAP891,"unterminated\n',
        ):
            with self.subTest(source=source), tempfile.TemporaryDirectory() as folder:
                raw=pathlib.Path(folder)/'population_2018_2025.csv.gz'
                raw.write_bytes(b'existing archive')
                with self.assertRaises((ValueError,csv.Error)):
                    self.refresh(source, folder)
                self.assertEqual(raw.read_bytes(), b'existing archive')
                self.assertEqual(list(pathlib.Path(folder).iterdir()), [raw])


if __name__=='__main__':
    unittest.main()
