"""Publish only public/; never package source/reference material or follow symlinks."""
from pathlib import Path
import shutil
from publication import validate_public_tree

ROOT = Path(__file__).resolve().parents[1]

def main():
    source = ROOT / 'public'
    target = ROOT / 'dist'
    if source.is_symlink() or target.is_symlink():
        raise SystemExit('Refusing a symlink for public/ or dist/.')
    if not (source / 'index.html').is_file() or not (source / 'data/manifest.json').is_file():
        raise SystemExit('Missing public index or manifest; run pipeline/build.py first.')
    for path in source.rglob('*'):
        if path.is_symlink():
            raise SystemExit(f'Refusing publish symlink: {path}')
    validate_public_tree(source)
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(source, target)
    (target / '.nojekyll').touch()
    print(f'Packaged {sum(p.is_file() for p in target.rglob("*"))} files in {target}')

if __name__ == '__main__':
    main()
