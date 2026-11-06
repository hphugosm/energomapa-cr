"""Fail closed if excluded artifacts accidentally enter a public build."""
from pathlib import Path


def validate_public_tree(public):
    public = Path(public)
    forbidden = [str(p.relative_to(public)) for p in public.rglob('*') if p.is_file() and
                 ((p.name.startswith('ote-') and p.suffix in ('.xlsx', '.csv', '.json')) or
                  p.name == 'flows-methodology.docx')]
    if forbidden:
        raise ValueError('Excluded material in public tree: ' + ', '.join(sorted(forbidden)))
