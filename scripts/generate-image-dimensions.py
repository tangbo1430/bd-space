"""Regenerate intrinsic pixel dimensions used by the shared photo components."""
from pathlib import Path
import json
from PIL import Image
root = Path(__file__).resolve().parents[1]
result = {}
for file in sorted((root / 'public/assets').rglob('*')):
    if file.suffix.lower() in ('.jpg', '.jpeg', '.webp', '.png'):
        with Image.open(file) as image:
            result['/' + file.relative_to(root / 'public').as_posix()] = list(image.size)
(root / 'src/data/image-dimensions.json').write_text(json.dumps(result, indent=2) + '\n', encoding='utf8')
