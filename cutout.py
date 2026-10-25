"""rembg + OCR-inpaint + paper-cutout look (grayscale subject, jagged red scissor border).
usage: python scripts/cutout.py in.jpg out.png"""
import sys, random
import numpy as np, cv2
from PIL import Image
from rembg import remove

def clean_text(rgb, alpha):
    """Erase printed text/labels on the subject (optional: needs tesseract binary)."""
    try:
        import pytesseract
        d = pytesseract.image_to_data(rgb, output_type=pytesseract.Output.DICT)
    except Exception:
        return rgb
    mask = np.zeros(alpha.shape, np.uint8)
    for i, t in enumerate(d["text"]):
        if len(t.strip()) >= 2 and float(d["conf"][i]) > 60:
            x, y, w, h = d["left"][i], d["top"][i], d["width"][i], d["height"][i]
            cv2.rectangle(mask, (x - 4, y - 4), (x + w + 4, y + h + 4), 255, -1)
    mask = cv2.bitwise_and(mask, (alpha > 10).astype(np.uint8) * 255)
    return cv2.inpaint(rgb, mask, 5, cv2.INPAINT_TELEA) if mask.any() else rgb

def main(src, dst):
    random.seed(src)
    im = Image.open(src).convert("RGB"); im.thumbnail((1400, 1400))
    cut = np.array(remove(im))                      # RGBA, background removed
    rgb, a = cut[..., :3].copy(), cut[..., 3]
    rgb = clean_text(rgb, a)
    ys, xs = np.where(a > 20)
    if len(xs) == 0: raise SystemExit("empty cutout")
    pad = 36
    x0, x1, y0, y1 = max(0, xs.min() - pad), xs.max() + pad, max(0, ys.min() - pad), ys.max() + pad
    rgb, a = rgb[y0:y1, x0:x1], a[y0:y1, x0:x1]
    gray = cv2.createCLAHE(2.0, (8, 8)).apply(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY))
    gray = cv2.cvtColor(gray, cv2.COLOR_GRAY2RGB)
    # scissor border: dilate, simplify contour to straight cuts, misregister a few px
    m = (a > 20).astype(np.uint8) * 255
    r = max(10, int(min(m.shape) * 0.022))
    dil = cv2.dilate(m, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1)))
    cs, _ = cv2.findContours(dil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    red = np.zeros_like(m)
    for c in cs:
        poly = cv2.approxPolyDP(c, 0.006 * cv2.arcLength(c, True), True)
        cv2.fillPoly(red, [poly], 255)
    M = np.float32([[1, 0, random.randint(-7, 7)], [0, 1, random.randint(-7, 7)]])
    red = cv2.warpAffine(red, M, (red.shape[1], red.shape[0]))
    out = np.zeros((*m.shape, 4), np.uint8)
    out[..., 0], out[..., 1], out[..., 2], out[..., 3] = 232, 67, 42, red
    sub = np.dstack([gray, a])
    alpha = (sub[..., 3:4] / 255.0)
    out[..., :3] = (sub[..., :3] * alpha + out[..., :3] * (1 - alpha)).astype(np.uint8)
    out[..., 3] = np.maximum(red, a)
    Image.fromarray(out, "RGBA").save(dst)

if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
