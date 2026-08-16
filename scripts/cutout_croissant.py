from rembg import remove
from PIL import Image
import os

src = r"C:\Users\n.svetlitskaya\.cursor\projects\c-Users-n-svetlitskaya-Desktop\assets\ac3b6489-310e-4981-8ea9-c25c6ce5d3ff.png"
out = r"c:\Users\n.svetlitskaya\Desktop\Просыпайся!\public\splash\croissant.png"

inp = Image.open(src).convert("RGBA")
result = remove(inp)
os.makedirs(os.path.dirname(out), exist_ok=True)
result.save(out, "PNG")
pixels = result.load()
w, h = result.size
opaque = sum(1 for y in range(h) for x in range(w) if pixels[x, y][3] > 20)
print("saved", out, result.size, "opaque_ratio", round(opaque / (w * h), 3))
