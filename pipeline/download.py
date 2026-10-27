"""Explicit network refresh; normal builds never use network."""
import concurrent.futures, gzip, hashlib, json, pathlib, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime
from zoneinfo import ZoneInfo
ROOT=pathlib.Path(__file__).resolve().parents[1]
RAW=ROOT/'data/raw'
BASE='https://services.cuzk.gov.cz/wfs/inspire-au-wfs.asp'
def fetch_tile(box):
    params=dict(service='WFS',version='2.0.0',request='GetFeature',storedquery_id='GetUnitByNationalLevel',NAT_LEVEL='Obec',XMIN=box[0],YMIN=box[1],XMAX=box[2],YMAX=box[3])
    url=BASE+'?'+urllib.parse.urlencode(params)
    path=RAW/'geography'/('_'.join(map(str,box))+'.gml.gz')
    if path.exists(): data=gzip.decompress(path.read_bytes())
    else:
        for retry in range(4):
            try:
                data=urllib.request.urlopen(url,timeout=120).read(); ET.fromstring(data); break
            except Exception:
                if retry==3:raise
        if b'<member>' not in data and b'numberReturned="0"' not in data:raise ValueError(data[:500])
        path.write_bytes(gzip.compress(data,mtime=0))
    root=ET.fromstring(data)
    if root.find('{http://www.opengis.net/wfs/2.0}truncatedResponse') is not None:
        x,y,X,Y=box; mx=(x+X)//2; my=(y+Y)//2
        return [(x,y,mx,my),(mx,y,X,my),(x,my,mx,Y),(mx,my,X,Y)]
    return []
def download_geography(refresh=False):
    (RAW/'geography').mkdir(parents=True,exist_ok=True)
    if refresh:
        for p in (RAW/'geography').glob('*.gml.gz'):p.unlink()
    boxes=[(-905000,-1228000,-431000,-935000)]
    with concurrent.futures.ThreadPoolExecutor(max_workers=8) as ex:
        while boxes:
            print('Fetching',len(boxes),'tiles',flush=True)
            boxes=[b for children in ex.map(fetch_tile,boxes) for b in children]
    for p in (RAW/'geography').glob('*.gml.gz'):
        root=ET.fromstring(gzip.decompress(p.read_bytes()))
        if root.find('{http://www.opengis.net/wfs/2.0}truncatedResponse') is not None:p.unlink()

def download_tables():
    import csv,io
    url='https://data.csu.gov.cz/opendata/sady/REGUAP/distribuce/csv'
    with urllib.request.urlopen(url,timeout=120) as response:
        reader=csv.DictReader(io.TextIOWrapper(response,encoding='utf8'))
        output=io.StringIO(newline='');writer=csv.DictWriter(output,fieldnames=reader.fieldnames);writer.writeheader()
        for row in reader:
            if row['IndicatorType']!='2406UAP891':break
            writer.writerow(row)
    (RAW/'population_2018_2025.csv.gz').write_bytes(gzip.compress(output.getvalue().encode(),mtime=0))
    url='https://csu.gov.cz/docs/107516/3f36d27f-7eb1-b14c-0029-af89997bf192/struktura_uzemi_cr.xlsx?version=1.2'
    (RAW/'struktura_uzemi_cr.xlsx').write_bytes(urllib.request.urlopen(url,timeout=120).read())

def refresh_source_metadata(now=None):
    """Record the successful refresh, never the time of an offline build.

    sha256 always hashes the archived gzip bytes (same convention as checksums.json).
    The additional decompressed digest identifies the CSV independently of compression.
    """
    instant=now or datetime.now(ZoneInfo('Europe/Prague'))
    if instant.tzinfo is None:
        raise ValueError('Refresh time must be timezone-aware')
    instant=instant.astimezone(ZoneInfo('Europe/Prague'))
    for name in ('geography','population','territories'):
        path=ROOT/f'data/sources/{name}.json'
        source=json.loads(path.read_text())
        source['retrievedAt']=instant.isoformat(timespec='seconds')
        if name=='geography':source['asOf']=instant.date().isoformat()
        if name=='population':
            data=(RAW/'population_2018_2025.csv.gz').read_bytes()
            source['sha256']=hashlib.sha256(data).hexdigest()
            source['sha256Scope']='compressed raw file bytes'
            source['sha256Decompressed']=hashlib.sha256(gzip.decompress(data)).hexdigest()
        path.write_text(json.dumps(source,ensure_ascii=False,indent=2)+'\n')

def pin_inputs():
    files={str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(RAW.rglob('*')) if p.is_file()}
    (ROOT/'data/sources/checksums.json').write_text(json.dumps(files,indent=2,sort_keys=True)+'\n')

if __name__=='__main__':
    download_geography(refresh=True)
    download_tables()
    refresh_source_metadata()
    pin_inputs()
