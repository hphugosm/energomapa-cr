"""Assemble independently sourced, pinned offline datasets for the static app."""
import json
import pathlib
import zipfile

from energy_databank import build_energy_databank, download_energy_databank
from power_flows import build_power_flows, download_power_flows


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(',', ':'), allow_nan=False) + '\n')


def download_databank(root):
    from ote import download_ote
    from entsoe import download_entsoe
    for name, refresh in [('Eurostat/MPO', download_energy_databank), ('ČEPS', download_power_flows), ('OTE', download_ote), ('ENTSO-E/Energy-Charts', download_entsoe)]:
        try:
            refresh(root)
        except Exception as error:
            # Adapters stage network responses before committing a new snapshot.
            # The offline compiler still validates every retained input hash.
            print(f'{name}: obnova selhala; používám poslední uložený snapshot ({error}).', flush=True)


def build_databank(root):
    root = pathlib.Path(root)
    from ote import build_ote
    from entsoe import build_entsoe
    datasets = build_power_flows(root) + build_energy_databank(root) + build_ote(root) + build_entsoe(root)
    ids = [item['id'] for item in datasets]
    if len(ids) != len(set(ids)):
        raise ValueError('Duplicate databank dataset id')
    output = root / 'public/data/databank'
    index = {'schemaVersion': 1, 'version': '0.6.0', 'datasets': datasets,
             'snapshotNote': 'Lokálně uložené historické a modelové snapshoty, nikoli živá měření. Rozsah a datum každé sady jsou uvedeny samostatně.',
             'archive': 'offline.zip',
             'conventions': {'missing': 'null, nikdy automatická nula',
                             'power': 'MW = průměrný výkon ve zdrojovém intervalu',
                             'energy': 'MWh = energie; integrace výkonu pouze přes známé intervaly',
                             'flows': 'Fyzické měření a plánovaná obchodní výměna jsou samostatné veličiny.',
                             'aggregation': 'Součty směrových toků vyžadují všechny vybrané hranice. Dílčí dny nejsou úplnou denní energií.'}}
    dump(output / 'index.json', index)
    # Fixed zip timestamps and order keep the offline artifact reproducible.
    members = ['index.json'] + sorted({item[key] for item in datasets for key in ('path', 'csv')})
    with zipfile.ZipFile(output / 'offline.zip', 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in members:
            path = output / name
            if not path.is_file() or path.parent != output:
                raise ValueError('Missing or unsafe archive member: ' + name)
            info = zipfile.ZipInfo(name, (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            archive.writestr(info, path.read_bytes())
        for path in sorted((root / 'docs').glob('*methodology.md')):
            if path.stem in ('databank-methodology', 'flows-methodology', 'ote-methodology', 'entsoe-methodology'):
                info = zipfile.ZipInfo('methodology/' + path.name, (2026, 1, 1, 0, 0, 0))
                info.compress_type = zipfile.ZIP_DEFLATED
                archive.writestr(info, path.read_bytes())
    return index


def build_offline_manifest(root):
    root = pathlib.Path(root)
    public = root / 'public'
    files = [p for p in public.rglob('*') if p.is_file() and p.name not in ('offline-files.json', '.DS_Store')]
    dump(public / 'offline-files.json', {'version': '0.6.0', 'files': sorted(str(path.relative_to(public)) for path in files),
                                       'bytes': sum(path.stat().st_size for path in files)})
