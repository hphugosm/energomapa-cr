"""Create a self-contained review ZIP from repository files and explicit QA evidence."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]

def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', default=str(ROOT/'artifacts/energomapa-review-2026-10-27.zip'))
    parser.add_argument('--baseline', default='8c49ab1')
    args = parser.parse_args()
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    files = sorted(set(git('ls-files', '--cached', '--others', '--exclude-standard', '-z').decode().split('\0')) - {''})
    entries = {}
    for name in files:
        path = ROOT/name
        if not path.exists(): continue
        if path.is_symlink(): raise SystemExit(f'Refusing symlink: {name}')
        if path.is_file(): entries[name] = path.read_bytes()
    for path in sorted((ROOT/'artifacts/review').glob('*')):
        if path.is_file() and not path.is_symlink(): entries['review/'+path.name] = path.read_bytes()
    entries['review/revision.json'] = (json.dumps({
        'commit': git('rev-parse', 'HEAD').decode().strip(),
        'baseline': git('rev-parse', args.baseline).decode().strip(),
        'workingTree': git('status', '--porcelain').decode(),
        'site': 'https://hphugosm.github.io/energomapa-cr/',
    }, indent=2)+'\n').encode()
    entries['review/CHANGES.patch'] = git('diff', args.baseline, '--', '.', ':!data/raw', ':!public/data', ':!data/processed')
    entries['review/CHANGES.stat.txt'] = git('diff', '--stat', args.baseline)
    entries['MANIFEST.sha256'] = ''.join(f'{hashlib.sha256(data).hexdigest()}  {name}\n' for name,data in sorted(entries.items())).encode()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
        for name,data in sorted(entries.items()): archive.writestr('energomapa/'+name, data)
    with zipfile.ZipFile(output) as archive:
        assert archive.testzip() is None, 'ZIP integrity check failed'
        for name in ('REVIEW.md','pipeline/solar.py','data/raw/solar/tez-sk-11-2026-10-01.xml.gz','public/data/metrics/solar_capacity.json','.github/workflows/pages.yml'):
            assert 'energomapa/'+name in archive.namelist(), f'Missing required review file: {name}'
    print(json.dumps({'path':str(output),'files':len(entries),'bytes':output.stat().st_size,'sha256':hashlib.sha256(output.read_bytes()).hexdigest()}, indent=2))

if __name__ == '__main__': main()
