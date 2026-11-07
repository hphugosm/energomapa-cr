"""Private OTE exports: user-file import or explicitly requested download, never public."""
import csv
import hashlib
import io
import json
import math
import os
import tempfile
from concurrent.futures import ThreadPoolExecutor
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

import openpyxl
from csv_export import write_dataset_csv

FIRST = date(2025, 7, 1)
LAST = date(2025, 9, 30)
PRAGUE = ZoneInfo('Europe/Prague')
LANDING = 'https://www.ote-cr.cz/cs/kratkodobe-trhy/elektrina/denni-trh'


def dump(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')


def source_url(day):
    return f'https://www.ote-cr.cz/pubweb/attachments/01/{day.year}/month{day:%m}/day{day:%d}/DT_{day:%d_%m_%Y}_CZ.xlsx'


def parse_export(payload, day):
    """Only accept the documented hourly format; quarter-hour/DST needs a new adapter."""
    workbook = openpyxl.load_workbook(io.BytesIO(payload), read_only=True, data_only=True)
    try:
        rows = list(workbook.active.values)
    finally:
        workbook.close()
    if not any(row and row[0] == f'Výsledky denního trhu ČR - {day:%d.%m.%Y}' for row in rows):
        raise ValueError(f'OTE export date mismatch for {day}')
    header = next((i for i, row in enumerate(rows) if row[:6] == ('Hodina', 'Cena (EUR/MWh)', 'Množství\n(MWh)', 'Saldo DT', 'Export', 'Import')), None)
    if header is None:
        raise ValueError(f'OTE hourly schema changed for {day}')
    hourly = [row for row in rows[header + 1:] if row and isinstance(row[0], (float, int))]
    if len(hourly) != 24 or [r[0] for r in hourly] != list(range(1, 25)):
        raise ValueError(f'OTE requires 24 explicit hourly intervals for {day}; refusing DST/quarter-hour ambiguity')
    start = datetime.combine(day, datetime.min.time(), PRAGUE).astimezone(timezone.utc)
    next_day = datetime.combine(day + timedelta(days=1), datetime.min.time(), PRAGUE).astimezone(timezone.utc)
    if next_day - start != timedelta(hours=24):
        raise ValueError('DST date requires explicit interval mapping')
    result = []
    for i, row in enumerate(hourly):
        def value(v):
            if v is None or v == 'SN':
                return None
            if isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v):
                return float(v)
            raise ValueError(f'Unknown OTE value {day}/{i + 1}: {v!r}')
        price, volume, balance, exports, imports_signed = map(value, row[1:6])
        if (volume is not None and volume < 0) or (exports is not None and exports < 0) or (imports_signed is not None and imports_signed > 0) or (all(v is not None for v in (balance, exports, imports_signed)) and abs(balance - exports - imports_signed) > .21):
            raise ValueError(f'OTE market-volume sign or balance mismatch {day}/{i + 1}')
        result.append({'time': (start + timedelta(hours=i)).isoformat(timespec='seconds').replace('+00:00', 'Z'),
                       'price': price, 'traded_volume': volume, 'net_export': balance,
                       'export': exports, 'import': -imports_signed if imports_signed is not None else None})
    return result


def private_root(root):
    root = Path(root).resolve()
    repository = Path(__file__).resolve().parents[1]
    if root == repository or repository in root.parents:
        raise ValueError('OTE requires a private directory outside the repository; redistribution permission is not evidenced')
    return root


def snapshot_days():
    return [FIRST + timedelta(days=i) for i in range((LAST - FIRST).days + 1)]


def import_ote(root, input_dir):
    """Import user-supplied XLSX only. No network calls or fallback downloader."""
    root = private_root(root)
    input_dir = private_root(input_dir)
    selected = {}
    for day in snapshot_days():
        candidates = [input_dir / f'ote-{day.isoformat()}.xlsx', input_dir / f'DT_{day:%d_%m_%Y}_CZ.xlsx']
        matches = [path for path in candidates if path.is_file()]
        if len(matches) != 1:
            raise ValueError(f'OTE import requires exactly one user-supplied XLSX for {day}; found {len(matches)}')
        selected[day] = matches[0]

    def load(day):
        path = selected[day]
        return path.read_bytes(), {'day': day.isoformat(), 'url': source_url(day), 'publisher': 'OTE, a.s.',
                                   'inputMethod': 'user-file-import', 'originalFilename': path.name,
                                   'retrievedAt': None, 'importedAt': datetime.now(timezone.utc).isoformat(timespec='seconds')}

    return store_snapshot(root, load, 'user-file-import')


def download_ote(root):
    """Separate opt-in downloader for authorized private use; never an import fallback."""
    def load(day):
        url = source_url(day)
        with urlopen(Request(url, headers={'User-Agent': 'EnergoMapa authorized private data use'}), timeout=60) as response:
            payload = response.read()
        return payload, {'day': day.isoformat(), 'url': url, 'publisher': 'OTE, a.s.',
                         'inputMethod': 'explicit-download', 'retrievedAt': datetime.now(timezone.utc).isoformat(timespec='seconds')}

    return store_snapshot(root, load, 'explicit-download')


def store_snapshot(root, load, acquisition):
    """Validate a complete staging generation before the single manifest commit."""
    root = private_root(root)
    folder = root / 'data/raw/databank'
    snapshots = folder / 'ote-snapshots'
    snapshots.mkdir(parents=True, exist_ok=True)
    days = snapshot_days()
    with tempfile.TemporaryDirectory(prefix='.staging-', dir=snapshots) as temporary:
        staging = Path(temporary)

        def fetch(day):
            payload, metadata = load(day)
            parse_export(payload, day)
            name = f'ote-{day.isoformat()}.xlsx'
            (staging / name).write_bytes(payload)
            return name, metadata | {'sha256': hashlib.sha256(payload).hexdigest()}

        with ThreadPoolExecutor(max_workers=6) as executor:
            inputs = dict(executor.map(fetch, days))
        if len(inputs) != len(days):
            raise ValueError('Incomplete OTE snapshot')
        # Re-read every staged file before making anything reachable by the manifest.
        for name, meta in inputs.items():
            payload = (staging / name).read_bytes()
            if hashlib.sha256(payload).hexdigest() != meta['sha256']:
                raise ValueError('OTE staging checksum mismatch: ' + name)
            parse_export(payload, date.fromisoformat(meta['day']))
        revision = hashlib.sha256(json.dumps({name: m['sha256'] for name, m in sorted(inputs.items())}, sort_keys=True).encode()).hexdigest()
        destination = snapshots / revision
        if destination.exists():
            for name, meta in inputs.items():
                if hashlib.sha256((destination / name).read_bytes()).hexdigest() != meta['sha256']:
                    raise ValueError('OTE immutable snapshot was modified')
        else:
            os.replace(staging, destination)
        manifest = {'schemaVersion': 2, 'privateUseOnly': True, 'acquisition': acquisition,
                    'inputs': {f'ote-snapshots/{revision}/{name}': meta for name, meta in sorted(inputs.items())}}
        target = root / 'data/sources/ote-inputs.json'
        target.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(mode='w', encoding='utf-8', dir=target.parent, delete=False) as output:
            temporary_manifest = Path(output.name)
            json.dump(manifest, output, ensure_ascii=False, separators=(',', ':'), allow_nan=False)
            output.write('\n')
            output.flush()
            os.fsync(output.fileno())
        try:
            os.replace(temporary_manifest, target)  # Single commit point; old raw paths remain valid.
        finally:
            temporary_manifest.unlink(missing_ok=True)
    return len(inputs)


def publish(root, ident, title, kind, unit, frequency, source, columns, records):
    records = [{key: row[key] for key in ['time', *[c['key'] for c in columns]]} for row in records]
    dataset = {'schemaVersion': 1, 'id': ident, 'title': title, 'description': source['scopeNote'],
               'kind': kind, 'unit': unit, 'frequency': frequency,
               'timezone': 'UTC' if frequency == 'hour' else 'Europe/Prague',
               'period': {'start': records[0]['time'], 'end': records[-1]['time']},
               'source': source, 'columns': columns, 'records': records, 'status': 'snapshot',
               'coverage': {'available': sum(all(row[c['key']] is not None for c in columns) for row in records), 'expected': 2208 if frequency == 'hour' else 92},
               'intervalDurationSeconds': 3600 if frequency == 'hour' else 86400}
    folder = private_root(root) / 'exports'
    dump(folder / f'{ident}.json', dataset)
    write_dataset_csv(folder / f'{ident}.csv', dataset)
    return {key: dataset[key] for key in ('id', 'title', 'description', 'kind', 'unit', 'frequency', 'period', 'source', 'status', 'coverage')} | {
        'rowCount': len(records), 'path': ident + '.json', 'csv': ident + '.csv'}


def build_ote(root):
    root = private_root(root)
    inputs = json.loads((root / 'data/sources/ote-inputs.json').read_text())['inputs']
    rows, daily_prices, daily_volume = [], [], []
    for name, meta in sorted(inputs.items()):
        path = (root / 'data/raw/databank' / name).resolve()
        if root not in path.parents:
            raise ValueError('Unsafe OTE input path')
        payload = path.read_bytes()
        if hashlib.sha256(payload).hexdigest() != meta['sha256']:
            raise ValueError('OTE checksum mismatch: ' + name)
        day = date.fromisoformat(meta['day'])
        parsed = parse_export(payload, day)
        rows.extend(parsed)
        prices = [row['price'] for row in parsed]
        complete = all(v is not None for v in prices)
        daily_prices.append({'time': day.isoformat(), 'mean': sum(prices) / 24 if complete else None, 'min': min(prices) if complete else None, 'max': max(prices) if complete else None})
        daily_volume.append({'time': day.isoformat(), **{key: round(sum(row[key] for row in parsed), 6) if all(row[key] is not None for row in parsed) else None for key in ('traded_volume', 'net_export', 'export', 'import')}})
    if len(rows) != 2208 or len(daily_prices) != 92:
        raise ValueError('OTE July–September snapshot coverage is incomplete')
    source = {'publisher': 'OTE', 'url': LANDING + '?report_date=2025-09-30',
              'retrievedAt': max((meta['retrievedAt'] for meta in inputs.values() if meta.get('retrievedAt')), default=None),
              'importedAt': max((meta['importedAt'] for meta in inputs.values() if meta.get('importedAt')), default=None),
              'inputMethod': sorted({meta.get('inputMethod', 'explicit-download') for meta in inputs.values()}),
              'rawManifest': 'private:data/sources/ote-inputs.json',
              'license': 'Redistribution permission not evidenced; authorized private use only.',
              'termsUrl': 'https://www.ote-cr.cz/cs/dokumentace/zasady-pouzivani',
              'inputs': [{'path': 'data/raw/databank/' + name, **meta} for name, meta in sorted(inputs.items())],
              'methodology': 'Původní denní XLSX OTE; 1. 7.–30. 9. 2025, 24 hodinových intervalů za den. Čas označuje začátek intervalu v UTC (místní CEST = UTC+2). Cena EUR/MWh, množství MWh za interval; záporné ceny zachovány. Zdrojové SN nebo prázdná buňka = null, nikoli nula. Neúplný den má denní agregaci null. Žádné doplňování chybějících hodnot.',
              'scopeNote': 'Historický snapshot výsledků denního trhu ČR, nikoli aktuální ceny, konečná cena dodávky nebo fyzické přeshraniční toky.',
              'missingValueMarkers': ['SN', None],
              'limitations': ['Denní trh nepokrývá všechny obchody ani veškerou spotřebu ČR.', 'Není k dispozici rozdělení obchodního dovozu/vývozu podle sousedních států.', 'Převod na CZK ani maloobchodní cenu se neprovádí.', 'Tento adaptér odmítá dny se změnou času a čtvrthodinový formát; snapshot je plně hodinový.', 'Zdroj některé hodiny označuje SN; zachováno jako null, příslušné denní agregace nejsou úplné a zůstávají null.']}
    def columns(labels, unit):
        return [{'key': key, 'label': label, 'type': 'number', 'unit': unit} for key, label in labels.items()]
    volume_labels = {'traded_volume': 'Zobchodované množství', 'net_export': 'Saldo DT — čistý vývoz', 'export': 'Obchodní vývoz DT', 'import': 'Obchodní dovoz DT'}
    volume_source = source | {'methodology': source['methodology'] + ' Původní Import OTE je záporný; v exportu normalizován na kladné množství dovozu. net_export = export − import (tolerance zdrojového zaokrouhlení 0,21 MWh). Saldo není součtem fyzických toků.', 'signConvention': 'export a import jsou kladná množství; net_export je kladný čistý vývoz.'}
    return [
        publish(root, 'ote-prices', 'OTE — hodinové ceny denního trhu', 'electricity_price', 'EUR/MWh', 'hour', source, columns({'price': 'Cena DT'}, 'EUR/MWh'), rows),
        publish(root, 'ote-market-volume', 'OTE — hodinová množství a obchodní saldo DT', 'market_volume', 'MWh', 'hour', volume_source, columns(volume_labels, 'MWh'), rows),
        publish(root, 'ote-prices-daily', 'OTE — denní průměr, minimum a maximum ceny', 'electricity_price', 'EUR/MWh', 'day', source | {'methodology': source['methodology'] + ' Denní průměr je prostý aritmetický průměr 24 hodinových cen, nikoli vážení zobchodovaným množstvím. Den je vymezen v Europe/Prague.'}, columns({'mean': 'Průměrná hodinová cena', 'min': 'Minimální cena', 'max': 'Maximální cena'}, 'EUR/MWh'), daily_prices),
        publish(root, 'ote-market-volume-daily', 'OTE — denní zobchodovaná energie a obchodní saldo', 'market_volume', 'MWh', 'day', volume_source | {'methodology': volume_source['methodology'] + ' Denní energie = součet 24 hodinových energií v MWh. Den je vymezen v Europe/Prague.'}, columns(volume_labels, 'MWh'), daily_volume),
    ]


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    acquisition = parser.add_mutually_exclusive_group()
    acquisition.add_argument('--import-dir', type=Path, help='Import user-supplied daily XLSX from this directory, without network access')
    acquisition.add_argument('--download', action='store_true', help='Separate explicit network download; never used by --import-dir')
    parser.add_argument('--private-dir', type=Path, required=True)
    parser.add_argument('--i-have-permission', action='store_true', help='Confirm permission for your specific private use; this does not grant a license')
    args = parser.parse_args()
    if not args.i_have_permission:
        parser.error('Private OTE processing requires permission for your specific use (--i-have-permission)')
    root = private_root(args.private_dir)
    if args.import_dir:
        print('Imported user-supplied OTE files:', import_ote(root, args.import_dir))
    elif args.download:
        print('Downloaded OTE files:', download_ote(root))
    elif not (root / 'data/sources/ote-inputs.json').is_file():
        parser.error('No private snapshot. Supply your own XLSX with --import-dir; no files are downloaded implicitly.')
    print(json.dumps(build_ote(root), ensure_ascii=False, default=str)[:500])
