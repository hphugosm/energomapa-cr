"""Rebuild offline and require identical exported data, file set and registries."""
import hashlib
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]

def hashes():
    files = [p for folder in ('public/data','data/processed') for p in (ROOT/folder).rglob('*') if p.is_file()]
    files.append(ROOT/'data/sources/registry.json')
    return {str(p.relative_to(ROOT)):hashlib.sha256(p.read_bytes()).hexdigest() for p in files}

def main():
    before = hashes()
    subprocess.run([sys.executable, str(ROOT/'pipeline/build.py')], cwd=ROOT, check=True)
    after = hashes()
    changed = sorted(key for key in before.keys() | after.keys() if before.get(key) != after.get(key))
    if changed:
        raise SystemExit('Non-deterministic outputs: '+', '.join(changed))
    print(f'Deterministic offline build: {len(after)} identical outputs.')

if __name__ == '__main__':
    main()
