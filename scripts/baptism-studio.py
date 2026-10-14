"""
Retratos «de estudio» de los candidatos al bautismo.

Las fotos llegan de móviles distintos, con paredes, ladrillo, coches o playa
detrás y encuadres muy diferentes. Este script las iguala:

  1. `mask`    — separa a la persona del fondo (BiRefNet-portrait vía rembg)
                 y guarda la máscara en caché (`<cache>/<fecha>/<id>.png`).
                 Es lo lento (~80 s por foto en CPU); se hace una vez.
  2. `compose` — coloca a cada persona en un lienzo 4:5 con el MISMO
                 encuadre (la cara a la misma escala, aire fijo sobre la
                 cabeza) y sobre el MISMO fondo: gris azulado de estudio con
                 un degradado muy suave (a juego con el navy de la marca).
                 Sale `<out>/<fecha>/<id>.png`, listo para
                 `node scripts/import-baptism-photos.mjs --studio <out>`.

Reglas del encuadre (lo que evita «cosas raras»):
  · Escala por la cara (detectada con OpenCV o tomada de
    `scripts/assets-src/baptism-faces.json`): alto del lienzo = 4,2 × cara.
  · Arriba, 8 % de aire sobre el pelo.
  · Si la persona llega al borde de la foto original (hombros cortados,
    selfie), el lienzo no pasa de ese borde: nunca se ve un brazo «cortado
    en el aire». Si hace falta, se amplía el encuadre en vez de dejar hueco.
  · Nunca se amplía por encima del original.

Requisitos (sólo para quien regenere los retratos):
  pip install "rembg[cpu]" opencv-python-headless pillow numpy
Uso:
  python scripts/baptism-studio.py mask    <fotos> <cache>
  python scripts/baptism-studio.py compose <fotos> <cache> <out>
donde <fotos> tiene una subcarpeta por fecha con `<id>.<ext>` (como la que
recibe `import-baptism-photos.mjs`). Docs: docs/ai/34-baptisms.md.
"""

import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
FACES = os.path.join(ROOT, 'assets-src', 'baptism-faces.json')
EXTS = ('.jpg', '.jpeg', '.png', '.webp')

# Fondo de estudio: centro claro arriba, bordes algo más oscuros.
BG_CENTER = np.array([236, 240, 245], dtype=np.float32)
BG_EDGE = np.array([196, 206, 218], dtype=np.float32)

RATIO = 4 / 5
FACE_K = 4.2          # alto del lienzo / alto de la cara
HEAD_AIR = 0.08       # aire sobre la cabeza (fracción del alto)
MAX_W = 1080


def photos(src):
    for date in sorted(os.listdir(src)):
        d = os.path.join(src, date)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if f.lower().endswith(EXTS):
                yield date, os.path.splitext(f)[0], os.path.join(d, f)


def load(path):
    return ImageOps.exif_transpose(Image.open(path)).convert('RGB')


def cmd_mask(src, cache):
    from rembg import new_session, remove

    session = new_session('birefnet-portrait')
    for date, cid, path in photos(src):
        out = os.path.join(cache, date, cid + '.png')
        if os.path.exists(out):
            continue
        os.makedirs(os.path.dirname(out), exist_ok=True)
        im = load(path)
        work = im.copy()
        work.thumbnail((2048, 2048))
        mask = remove(work, session=session, only_mask=True).resize(im.size, Image.LANCZOS)
        mask.save(out)
        print('mask', date, cid, flush=True)


def detect_face(im):
    import cv2

    g = cv2.equalizeHist(cv2.cvtColor(np.asarray(im), cv2.COLOR_RGB2GRAY))
    mn = int(min(g.shape) * 0.05)
    for name, n in (('haarcascade_frontalface_default.xml', 6), ('haarcascade_frontalface_alt2.xml', 4)):
        faces = cv2.CascadeClassifier(cv2.data.haarcascades + name).detectMultiScale(g, 1.08, n, minSize=(mn, mn))
        if len(faces):
            return [int(v) for v in max(faces, key=lambda f: f[2] * f[3])]
    return None


def background(w, h):
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    d = np.sqrt(((xx - w * 0.5) / (w * 0.75)) ** 2 + ((yy - h * 0.32) / (h * 0.85)) ** 2)
    t = np.clip(d, 0, 1)[..., None] ** 1.6
    return BG_CENTER * (1 - t) + BG_EDGE * t


def compose_one(im, mask, face):
    W, H = im.size
    a = np.asarray(mask, dtype=np.float32) / 255.0
    fx, fy, fw, fh = face

    # Bordes de la foto que toca la persona: el lienzo no puede pasarlos.
    on = a > 0.5
    touch_l = on[:, :3].any()
    touch_r = on[:, -3:].any()
    touch_b = True  # el cuerpo siempre sigue por abajo
    touch_t = on[:3, :].any()

    cols = on[:, max(0, fx): min(W, fx + fw)]
    rows = np.where(cols.any(axis=1))[0]
    head_top = int(rows[0]) if len(rows) else fy

    # La cara manda: centrada en horizontal y la cabeza siempre a la misma
    # altura. Si la foto no llega (persona cortada por abajo o por un lado),
    # el encuadre se cierra —primer plano— en vez de dejar hueco de fondo.
    cx = fx + fw / 2
    ch = FACE_K * fh
    if touch_b:
        ch = min(ch, (H - head_top) / (1 - HEAD_AIR))
    if touch_l:
        ch = min(ch, 2 * cx / RATIO)
    if touch_r:
        ch = min(ch, 2 * (W - cx) / RATIO)
    cw = ch * RATIO
    top = head_top - HEAD_AIR * ch
    if touch_t:
        top = max(top, 0)

    out_w = int(min(MAX_W, round(cw)))
    out_h = int(round(out_w / RATIO))
    scale = out_w / cw
    left = cx - cw / 2

    # Persona (RGB + alfa) llevada al lienzo: recorte (lo que cae fuera de
    # la foto queda con alfa 0) y reducción Lanczos.
    box = (round(left), round(top), round(left + cw), round(top + ch))
    person = im.crop(box).resize((out_w, out_h), Image.LANCZOS)
    alpha = mask.crop(box).resize((out_w, out_h), Image.LANCZOS)
    # Borde un pelo más suave: quita el «recortado» sin halo.
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))

    bg = background(out_w, out_h)
    fg = np.asarray(person, dtype=np.float32)
    al = (np.asarray(alpha, dtype=np.float32) / 255.0)[..., None]
    # Sombra de contacto muy leve detrás de la persona (da volumen, no se ve como efecto).
    shadow = np.asarray(alpha.filter(ImageFilter.GaussianBlur(out_w * 0.03)), dtype=np.float32)[..., None] / 255.0
    bg = bg * (1 - 0.12 * shadow)
    comp = fg * al + bg * (1 - al)
    return Image.fromarray(np.clip(comp, 0, 255).astype(np.uint8))


def cmd_compose(src, cache, out):
    faces = json.load(open(FACES, encoding='utf-8')) if os.path.exists(FACES) else {}
    for date, cid, path in photos(src):
        mpath = os.path.join(cache, date, cid + '.png')
        if not os.path.exists(mpath):
            print('sin máscara', date, cid)
            continue
        im = load(path)
        mask = Image.open(mpath).convert('L')
        face = faces.get(f'{date}/{cid}') or detect_face(im)
        if not face:
            print('sin cara', date, cid)
            continue
        res = compose_one(im, mask, face)
        dst = os.path.join(out, date, cid + '.png')
        os.makedirs(os.path.dirname(dst), exist_ok=True)
        res.save(dst)
        print('ok', date, cid, res.size, flush=True)


if __name__ == '__main__':
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)
    if sys.argv[1] == 'mask':
        cmd_mask(sys.argv[2], sys.argv[3])
    elif sys.argv[1] == 'compose' and len(sys.argv) == 5:
        cmd_compose(sys.argv[2], sys.argv[3], sys.argv[4])
    else:
        print(__doc__)
        sys.exit(1)
