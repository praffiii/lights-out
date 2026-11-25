import sys

import numpy as np
from PIL import Image

source, target, quality = sys.argv[1], sys.argv[2], int(sys.argv[3])
wing = Image.open(source)
w, h = wing.size
y, x = np.mgrid[0:h, 0:w]
far = np.sqrt(((x - w * 0.47) / (w * 0.56)) ** 2 + ((y - h * 0.30) / (h * 0.62)) ** 2)
glow = np.clip(1 - far, 0, 1)[..., None] ** 1.3
back = Image.fromarray((np.array([6, 8, 14]) * (1 - glow) + np.array([112, 122, 146]) * glow).astype("uint8"))
back.paste(wing, (0, 0), wing)
back.save(target, quality=quality, method=6)
