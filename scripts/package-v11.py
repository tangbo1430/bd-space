"""Package the reviewed source and allowlisted static site, without raw client material."""
from pathlib import Path
import zipfile, tarfile, hashlib, json, sys
ROOT=Path(__file__).resolve().parents[1]
source_only='--source-only' in sys.argv
for kind in (['source'] if source_only else ['source','static']):
    target=ROOT/f'bd-space-v1.1-{kind}.zip'
    with zipfile.ZipFile(target,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as archive:
        if kind=='static':
            files=[p for p in (ROOT/'dist').rglob('*') if p.is_file()]
            base=ROOT/'dist'
        else:
            files=[p for directory in ['src','public','scripts','tests','docs','.github'] for p in (ROOT/directory).rglob('*') if p.is_file()]
            files += [p for p in ROOT.iterdir() if p.is_file() and p.name in ['README.md','package.json','pnpm-lock.yaml','pnpm-workspace.yaml','astro.config.mjs','tsconfig.json','eslint.config.mjs','.gitignore','.env.example','Dockerfile','Caddyfile','nginx.conf','.dockerignore']]
            base=ROOT
        for p in files: archive.write(p,p.relative_to(base))
    print(target.name,target.stat().st_size,hashlib.sha256(target.read_bytes()).hexdigest())
if source_only: sys.exit(0)
target=ROOT/'artifacts/v11-static.tar.gz'
with tarfile.open(target,'w:gz') as archive:
    for p in (ROOT/'dist').rglob('*'):
        if p.is_file(): archive.add(p,arcname=str(p.relative_to(ROOT/'dist')),recursive=False)
(ROOT/'artifacts/v11-package-evidence.json').write_text(json.dumps({'archive':target.name,'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size},indent=2),encoding='utf8')
