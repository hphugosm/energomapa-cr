"""Self-contained CSV: one JSON metadata comment, then standard tabular CSV."""
import csv
import json
import re


def csv_metadata(dataset):
    source = dict(dataset.get('source') or {})
    source.setdefault('license', 'Oprávnění / konkrétní licence dalšího užití nebyly doloženy; viz podmínky zdroje.')
    source.setdefault('attribution', source.get('publisher', 'Neuvedeno'))
    return {key: value for key, value in dataset.items() if key != 'records'} | {
        'csvMetadataVersion': 1, 'source': source, 'qualityFlags': dataset.get('qualityFlags', [])}


def safe_cell(value):
    if isinstance(value, str) and re.match(r'^\s*[=+@-]', value):
        return "'" + value
    return value


def write_dataset_csv(path, dataset, fields=None):
    fields = fields or ['time'] + [c['key'] for c in dataset['columns'] if c['key'] != 'time']
    with path.open('w', encoding='utf-8-sig', newline='') as stream:
        stream.write('# metadata: ' + json.dumps(csv_metadata(dataset), ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\r\n')
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        for row in dataset['records']:
            writer.writerow({key: safe_cell(row.get(key)) for key in fields})
