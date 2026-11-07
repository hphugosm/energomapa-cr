"""Fail closed if excluded artifacts accidentally enter a public build."""
from pathlib import Path
import json


def confirmed_data_permission(root, provider):
    """Carry the user's explicit release permission without inventing license terms."""
    path = Path(root) / 'data/sources/publication-permissions.json'
    if not path.exists():
        return {}
    record = json.loads(path.read_text())
    if provider not in record['providers']:
        return {}
    if record['status'] != 'user-confirmed' or not all(record['scope'].get(key) is True for key in
            ('publicRawCopies', 'derivedCSVJSON', 'offlineZIP', 'browserCache')):
        raise ValueError('Incomplete confirmed publication scope for ' + provider)
    return {'license': record['notice'], 'redistributionPermission': {
        key: record[key] for key in ('status', 'confirmedOn', 'basis', 'release', 'scope', 'licenseDocumentReviewed')}}


def validate_public_tree(public):
    public = Path(public)
    forbidden = [str(p.relative_to(public)) for p in public.rglob('*') if p.is_file() and
                 ((p.name.startswith('ote-') and p.suffix in ('.xlsx', '.csv', '.json')) or
                  p.name == 'flows-methodology.docx')]
    if forbidden:
        raise ValueError('Excluded material in public tree: ' + ', '.join(sorted(forbidden)))
