"""Decode technical line art onto paper before dropping its alpha channel."""
from PIL import Image


def on_paper(image):
    rgba = image.convert("RGBA")
    paper = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
    return Image.alpha_composite(paper, rgba).convert("RGB")
