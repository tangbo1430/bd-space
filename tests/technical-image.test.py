"""Regression: transparent black pixels must not become an opaque black sheet."""
import sys
import unittest
from pathlib import Path
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from technical_image import on_paper


class TechnicalImageTest(unittest.TestCase):
    def test_transparent_black_preserves_visible_ink(self):
        source = Image.new('RGBA', (3, 1))
        source.putdata([(0, 0, 0, 0), (0, 0, 0, 128), (0, 0, 0, 255)])
        self.assertEqual(list(on_paper(source).get_flattened_data()),
                         [(255, 255, 255), (127, 127, 127), (0, 0, 0)])

    def test_opaque_paper_is_unchanged(self):
        source = Image.new('RGB', (2, 1))
        source.putdata([(255, 255, 255), (29, 35, 40)])
        self.assertEqual(on_paper(source).tobytes(), source.tobytes())


if __name__ == '__main__':
    unittest.main()
