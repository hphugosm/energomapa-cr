"""Pinned EEA E-PRTR air releases: CO2 reporting facilities, never ETS/transfers."""
import csv
import gzip
import hashlib
import io
import json
import math
import pathlib
import zipfile
from collections import Counter
from decimal import Decimal

SOURCE_URL = 'https://sdi.eea.europa.eu/catalogue/srv/api/records/657ac3cb-affa-4295-a4a9-27b4f539adab'
RAW_NAME = 'F1_4_Air_Releases_Facilities_CZ.csv.gz'


def locator(geometries):
    """Use full-resolution RUIAN EPSG:5514 shapes; never nearest-centroid matching."""
    from shapely import STRtree
    from shapely.geometry import Point
    from pyproj import Transformer
    codes = sorted(geometries)
    shapes = [geometries[c] for c in codes]
    tree = STRtree(shapes)
    project = Transformer.from_crs(4326, 5514, always_xy=True).transform
    def locate(lon, lat):
        point = Point(*project(lon, lat))
        matches = [codes[int(i)] for i in tree.query(point) if shapes[int(i)].covers(point)]
        return matches[0] if len(matches) == 1 else None
    return locate


def build_industry(territories, root, geometries=None):
    root = pathlib.Path(root)
    config = json.loads((root/'data/sources/industry.json').read_text())
    raw = root/'data/raw/industry'/RAW_NAME
    for name,digest in config['rawSha256'].items():
        if hashlib.sha256((root/'data/raw/industry'/name).read_bytes()).hexdigest() != digest:
            raise ValueError('Industry raw checksum mismatch: '+name)
    if geometries is None:
        try:
            from .build import geometries as read_geometries
        except ImportError:
            from build import geometries as read_geometries
        geometries = read_geometries()
    with gzip.open(raw, 'rt', encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.DictReader(stream))
    return compile_industry(rows, territories, locator(geometries), config['source'])


def compile_industry(rows, territories, locate, source):
    """Canonical raw columns retain official names; select exact total-CO2 label."""
    municipalities = {t['id']:t for t in territories if t['level']=='municipality'}
    audit = Counter(); selected = {}; excluded = Counter()
    for original in rows:
        row = normalize_row(original)
        audit['sourceRows'] += 1
        if row['countryCode'] != 'CZ':
            raise ValueError('Czech-filtered raw contains foreign record')
        if row.get('medium', 'AIR') != 'AIR':
            raise ValueError('Non-air release in air source')
        excluded[row['pollutantName']] += 1
        if row['pollutantName'] != 'Carbon dioxide (CO2)':
            continue
        year = str(int(row['reportingYear']))
        fid = row['facilityId']
        key = (year, fid)
        if row.get('confidentialityReason'):
            audit['confidentialCO2RowsExcluded'] += 1
            continue
        amount = Decimal(row['emissions'])
        if not amount.is_finite() or amount < 0:
            raise ValueError('Invalid CO2 release')
        if row.get('unit') != 'kg':
            raise ValueError('Unexpected CO2 unit')
        if key in selected:
            if selected[key] != row:
                raise ValueError('Conflicting facility-year CO2 release')
            audit['equivalentDuplicatesIgnored'] += 1
            continue
        selected[key] = row
    if not selected:
        raise ValueError('No total CO2 air releases in pinned source')
    years = sorted({y for y,_ in selected}, key=int)
    values = {y:{c:None for c in sorted(municipalities)} for y in years}
    counts = {y:{c:None for c in sorted(municipalities)} for y in years}
    points = []; yearly = {}; unallocated = []
    for year in years:
        total = Decimal(0); located = Decimal(0); facilities = 0; mapped = 0
        for (y,fid),row in sorted(selected.items()):
            if y != year: continue
            tonnes = Decimal(row['emissions'])/1000
            total += tonnes; facilities += 1
            try:
                lat, lon = float(row['pointGeometryLat']),float(row['pointGeometryLon'])
            except (ValueError, TypeError):
                lat, lon = math.nan, math.nan
            valid = math.isfinite(lat) and math.isfinite(lon) and 48 <= lat <= 52 and 12 <= lon <= 19
            code = locate(lon,lat) if valid else None
            if code not in municipalities:
                unallocated.append({'facilityId':fid,'year':int(year),'tonnes':float(tonnes),'reason':'outsideOrAmbiguousGeometry'})
                continue
            mapped += 1; located += tonnes
            values[y][code] = float(Decimal(str(values[y][code] or 0))+tonnes)
            counts[y][code] = (counts[y][code] or 0)+1
            points.append({'id':f'eea-{fid}-{year}','type':'industry','name':row['facilityName'],'lat':lat,'lon':lon,
                           'municipalityCode':code,'regionCode':municipalities[code]['regionId'],'year':int(year),
                           'properties':{'facilityId':fid,'sector':row['EPRTRSectorName'],'co2Tonnes':float(tonnes),'pollutant':'Carbon dioxide (CO2)','rawUnit':'kg'},'source':{k:source[k] for k in ('name','url','updatedAt') if k in source}})
        yearly[year] = {'sourceCO2Facilities':facilities,'mappedCO2Facilities':mapped,'unallocatedCO2Facilities':facilities-mapped,
                        'sourceCO2Tonnes':float(total),'publishedCO2Tonnes':float(located),'unallocatedCO2Tonnes':float(total-located)}
    audit = dict(audit)
    audit.update({'pollutantRowCounts':dict(sorted(excluded.items())), 'years':yearly,'unallocated':unallocated,
                  'selectedCO2FacilityYearRecords':len(selected),'actualYears':list(map(int,years)),
                  'scope':'CO2 total (including biomass), air releases only. Count measures facilities reporting this pollutant, not all industrial facilities.',
                  'zeroPolicy':'Non-reporting and below-threshold absence remain null. Reported explicit zero is retained.',
                  'geographyMethod':'Unique point-in-polygon intersection of reported WGS84 coordinates with original full-resolution EPSG:5514 RUIAN polygons; ambiguous and outside points excluded.'})
    metrics = []; datasets = {}
    for ident,name,unit,vals in [('industrial_co2_tonnes','Průmysl – ohlášené emise CO₂ celkem','t CO₂/rok',values),
                                 ('industrial_facility_count','Průmysl – provozovny ohlašující CO₂','provozoven',counts)]:
        metrics.append({'id':ident,'name':name,'unit':unit,'category':'emissions','geography':['country','region','municipality'],
                        'years':list(map(int,years)),'timeType':'timeseries' if len(years)>1 else 'snapshot','colorScale':'co2',
                        'normalizations':['absolute','per_capita','per_km2'],'path':f'metrics/{ident}.json',
                        'status':'verified','source':dict(source),'aggregation':'sum','coverage':'partial','profile':True})
        datasets[ident] = {'schemaVersion':1,'metricId':ident,'status':'verified','values':vals}
    return metrics,datasets,audit,{'industrial_facilities':{'id':'industrial_facilities','name':'Průmyslové provozovny ohlašující CO₂','type':'industry','source':dict(source),'points':points}}

def normalize_row(row):
    if 'countryName' not in row:
        return row
    return {'countryCode':'CZ' if row['countryName'] == 'Czechia' else row['countryName'],
            'facilityId':row['FacilityInspireId'],'facilityName':row['facilityName'],'reportingYear':row['reportingYear'],
            'pollutantName':row['Pollutant'],'emissions':row['Releases'],'unit':'kg','medium':row['TargetRelease'],
            'pointGeometryLat':row['Latitude'],'pointGeometryLon':row['Longitude'],'EPRTRSectorName':row['EPRTR_SectorName'],
            'confidentialityReason':row['confidentialityReason']}


def extract_czech_archive(archive_path, destination, expected_archive_sha=None):
    """Retain every Czech F1_4 row, unmodified columns; stable gzip bytes."""
    archive_path = pathlib.Path(archive_path)
    digest = hashlib.sha256(archive_path.read_bytes()).hexdigest()
    if expected_archive_sha and digest != expected_archive_sha:
        raise ValueError('Official EEA archive checksum mismatch')
    with zipfile.ZipFile(archive_path) as archive:
        with io.TextIOWrapper(archive.open('F1_4_Air_Releases_Facilities.csv'),encoding='utf-8-sig',newline='') as stream:
            reader = csv.DictReader(stream); fields = reader.fieldnames
            rows = [r for r in reader if r['countryName']=='Czechia']
    output=io.StringIO(newline=''); writer=csv.DictWriter(output,fieldnames=fields,lineterminator='\n')
    writer.writeheader();writer.writerows(rows)
    destination=pathlib.Path(destination);destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_bytes(gzip.compress(output.getvalue().encode('utf-8'),mtime=0))
    return {'archiveSha256':digest,'czechAirRows':len(rows),'rawSha256':hashlib.sha256(destination.read_bytes()).hexdigest()}

if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--extract-archive',type=pathlib.Path,required=True,help='Official EEA User friendly .csv files.zip')
    parser.add_argument('--destination',type=pathlib.Path,default=pathlib.Path(__file__).resolve().parents[1]/'data/raw/industry'/RAW_NAME)
    parser.add_argument('--expected-archive-sha')
    args=parser.parse_args()
    print(json.dumps(extract_czech_archive(args.extract_archive,args.destination,args.expected_archive_sha),indent=2))


def download_industry(root):
    """Opt-in refresh of exactly the pinned official archive and Czech subset."""
    import base64
    import tempfile
    import urllib.request
    root = pathlib.Path(root)
    config = json.loads((root/'data/sources/industry.json').read_text())
    download = config['download']
    token = base64.b64encode((download['publicWebdavUser']+':').encode()).decode()
    request = urllib.request.Request(download['archiveUrl'],headers={'Authorization':'Basic '+token,'User-Agent':'EnergoMapa/0.4.0 official-data-build'})
    with tempfile.TemporaryDirectory(prefix='energomapa-industry-') as folder:
        archive = pathlib.Path(folder)/'eea-v16.zip'
        with urllib.request.urlopen(request,timeout=120) as response,archive.open('wb') as output:
            while True:
                chunk=response.read(1024*1024)
                if not chunk:break
                output.write(chunk)
        subset = pathlib.Path(folder)/RAW_NAME
        result = extract_czech_archive(archive,subset,download['archiveSha256'])
        if result['rawSha256'] != config['rawSha256'][RAW_NAME]:
            raise ValueError('Regenerated Czech industrial subset checksum mismatch')
        destination=root/'data/raw/industry'/RAW_NAME
        destination.parent.mkdir(parents=True,exist_ok=True)
        destination.write_bytes(subset.read_bytes())
    return result
