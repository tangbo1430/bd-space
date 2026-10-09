"""Rebuild the local typeface: pip install fonttools brotli, then run with source TTF.

Source: https://github.com/google/fonts/tree/main/ofl/notosanssc
The shipped font is OFL-1.1. Keep public/assets/fonts/OFL-NotoSansSC.txt.
No font tooling or external font request is needed to build or run the site.
"""
from pathlib import Path
import sys
from fontTools import subset
from fontTools.ttLib import TTFont

root = Path(__file__).resolve().parent.parent
source = Path(sys.argv[1])
# Include all authored content and UI strings; unknown future characters use the
# system fallback until this subset is regenerated. Latin is retained in full.
text = ''.join(p.read_text(encoding='utf-8') for p in (root / 'src').rglob('*')
               if p.suffix in {'.astro', '.ts', '.json', '.md', '.mdx'})
characters = set(map(ord, text)) | set(range(0x20, 0x100))
font = TTFont(source)
characters &= set(font.getBestCmap())
options = subset.Options()
options.flavor = 'woff2'
options.layout_features = ['*']
subsetter = subset.Subsetter(options=options)
subsetter.populate(unicodes=characters)
subsetter.subset(font)
font.flavor = 'woff2'
output = root / 'public/assets/fonts/noto-sans-sc-site.woff2'
font.save(output)
print(f'{len(characters)} characters; {output.stat().st_size:,} bytes')
