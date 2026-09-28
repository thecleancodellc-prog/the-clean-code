"""Convert an image to a web-sized JPEG: python to_jpeg.py <src> <dest.jpg> [max_width] [quality]"""
import sys
from PIL import Image

src, dest = sys.argv[1], sys.argv[2]
max_width = int(sys.argv[3]) if len(sys.argv) > 3 else 1200
quality = int(sys.argv[4]) if len(sys.argv) > 4 else 82

image = Image.open(src).convert("RGB")
if image.width > max_width:
    image = image.resize((max_width, round(image.height * max_width / image.width)), Image.LANCZOS)
image.save(dest, "JPEG", quality=quality, optimize=True, progressive=True)
print(dest)
