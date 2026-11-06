"""Interval energy accounting and timezone tests for republished European data."""
import pathlib, sys, unittest
from datetime import datetime,timedelta,timezone
sys.path.insert(0,str(pathlib.Path(__file__).resolve().parents[1]/'pipeline'))
from entsoe import daily_integrals, utc_stamp, validate

class EuropeanSeriesTests(unittest.TestCase):
    def test_timezone_conversion_keeps_interval_start(self):
        self.assertEqual(utc_stamp('2025-07-01T00:00:00+02:00'),'2025-06-30T22:00:00Z')

    def test_integrates_mw_by_duration_and_preserves_missing(self):
        start=datetime(2025,7,1,tzinfo=timezone.utc)
        rows=[{'timestamp':(start+timedelta(minutes=i*15)).isoformat(),'values':{'power':100,'missing':None if i==5 else 100}} for i in range(96)]
        records=daily_integrals({'interval_minutes':15,'data':rows},['power','missing'])
        self.assertEqual(records,[{'time':'2025-07-01','power':2400.0,'missing':None}])
        self.assertEqual(daily_integrals({'interval_minutes':15,'data':rows[:-1]},['power']),[])

    def test_hourly_native_interval_is_not_quarter_hour(self):
        start=datetime(2025,7,1,tzinfo=timezone.utc)
        rows=[{'timestamp':(start+timedelta(hours=i)).isoformat(),'values':{'power':100}} for i in range(24)]
        self.assertEqual(daily_integrals({'interval_minutes':60,'data':rows},['power'])[0]['power'],2400)

    def test_naive_timestamp_and_gaps_rejected(self):
        data={'country':'cz','unit':'MW','interval_minutes':15,'data':[{'timestamp':'2025-07-01T00:00:00'}]}
        with self.assertRaisesRegex(ValueError,'Naive'):validate(data,'CZ')
        data['data']=[{'timestamp':'2025-07-01T00:00:00Z'},{'timestamp':'2025-07-01T00:30:00Z'}]
        with self.assertRaisesRegex(ValueError,'gaps'):validate(data,'CZ')

if __name__=='__main__':unittest.main()
