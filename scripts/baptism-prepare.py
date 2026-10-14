"""
Preparación de los retratos de un botez — de la carpeta de la iglesia a
`<staging>/<fecha>/<id>.jpg`, lista para `import-baptism-photos.mjs` y
`baptism-studio.py`. Receta completa: docs/ai/34-baptisms.md.

Subcomandos (en el orden en que se usan):

  pptx    <carpeta del botez> <salida>
          Lee la presentación (.pptx) sin PowerPoint: por diapositiva, el texto
          («NUME PRENUME | 17 ANI - BISTRITA») y la imagen. Escribe
          `<salida>/slides.json` y `<salida>/sNN_<imagen>`. Con eso se rellenan
          los candidatos de `core/baptisms.config.ts`.

  stage   <manifiesto.json> <staging>
          Copia cada foto elegida a `<staging>/<fecha>/<id>.<ext>`. El
          manifiesto es una lista de
            {"date": "2025-05-25", "id": "nereea-marcu",
             "src": "C:/…/IMAGINI/WhatsApp Image ….jpeg"}       ← foto suelta
             "src": "C:/…/BOTEZ.pptx#3"}                         ← imagen de la diapositiva 3
          Regla: si hay foto original suelta de más resolución que la de la
          diapositiva, se usa la suelta (comparar en la hoja de contacto).

  faces   <staging> [--force]
          Detecta la cara de cada retrato (OpenCV, Haar) y guarda:
            scripts/assets-src/baptism-faces.json   [x, y, ancho, alto] en px
            scripts/assets-src/baptism-crops.json   recorte 4:5 normalizado
          Recorte: alto = 4,2 × cara, borde superior 0,85 × cara sobre la cara.
          No pisa entradas existentes salvo con --force. Las que fallen se
          listan: se corrigen a mano en baptism-faces.json (cara [x,y,w,h]) y
          se vuelve a ejecutar con --force para esa foto.

  detext  <imagen> x0,y0,x1,y1 [x0,y0,x1,y1 …]
          Borra texto impreso sobre la pared (nombre/edad que traían las fotos
          de 2021-11) dentro de los rectángulos (fracciones 0-1 de la foto):
          detecta trazos finos que se separan del fondo y los rellena
          (inpainting Telea). Guarda el original como `<imagen>.orig.jpg`.
          Mirar el resultado: si queda una letra pegada al pelo, añadir un
          rectángulo pequeño sólo sobre ella.

  sheet   <carpeta> <salida.jpg> [--crops]
          Hoja de contacto de todas las fotos (con --crops, ya recortadas a
          4:5 según baptism-crops.json). Es la revisión obligatoria antes de
          publicar: cabezas cortadas, caras mal detectadas, texto, fondos raros.

Requisitos: pip install opencv-python-headless pillow numpy
"""

import json
import os
import posixpath
import re
import shutil
import sys
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
FACES = os.path.join(ROOT, 'assets-src', 'baptism-faces.json')
CROPS = os.path.join(ROOT, 'assets-src', 'baptism-crops.json')
EXTS = ('.jpg', '.jpeg', '.png', '.webp')


def load_json(path):
    return json.load(open(path, encoding='utf-8')) if os.path.exists(path) else {}


def save_json(path, data):
    body = ',\n'.join(f'  "{k}": {json.dumps(v)}' for k, v in sorted(data.items()))
    open(path, 'w', encoding='utf-8').write('{\n' + body + '\n}\n')


def read_image(path):
    import cv2
    import numpy as np

    # imdecode aplica la orientación EXIF (igual que sharp .rotate()).
    return cv2.imdecode(np.fromfile(path, dtype=np.uint8), cv2.IMREAD_COLOR)


# ── pptx ───────────────────────────────────────────────────────────────
def slide_items(pptx):
    z = zipfile.ZipFile(pptx)
    names = sorted(
        (n for n in z.namelist() if re.match(r'ppt/slides/slide\d+\.xml$', n)),
        key=lambda n: int(re.findall(r'\d+', n)[0]),
    )
    for n in names:
        num = int(re.findall(r'\d+', n)[0])
        xml = z.read(n).decode('utf-8')
        paras = []
        for p in re.findall(r'<a:p[ >].*?</a:p>', xml, re.S):
            t = ''.join(re.findall(r'<a:t>([^<]*)</a:t>', p)).strip()
            if t:
                paras.append(t)
        rels = f'ppt/slides/_rels/slide{num}.xml.rels'
        media = []
        if rels in z.namelist():
            for tgt in re.findall(r'Target="([^"]+)"', z.read(rels).decode()):
                if 'media' in tgt:
                    media.append(posixpath.normpath(posixpath.join('ppt/slides', tgt)))
        yield num, paras, media, z


def cmd_pptx(folder, out):
    os.makedirs(out, exist_ok=True)
    pptx = [f for f in os.listdir(folder) if f.lower().endswith('.pptx')]
    if not pptx:
        sys.exit('No hay .pptx en ' + folder)
    slides = []
    for num, paras, media, z in slide_items(os.path.join(folder, pptx[0])):
        files = []
        for m in media:
            fn = f's{num:02d}_' + os.path.basename(m)
            open(os.path.join(out, fn), 'wb').write(z.read(m))
            files.append(fn)
        slides.append({'slide': num, 'text': paras, 'images': files})
        print(f'{num:2d}  {" | ".join(paras)}  {files}')
    json.dump(slides, open(os.path.join(out, 'slides.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)


# ── stage ──────────────────────────────────────────────────────────────
def cmd_stage(manifest, staging):
    for item in json.load(open(manifest, encoding='utf-8')):
        src = item['src']
        dst_dir = os.path.join(staging, item['date'])
        os.makedirs(dst_dir, exist_ok=True)
        if '#' in src and src.lower().split('#')[0].endswith('.pptx'):
            pptx, n = src.rsplit('#', 1)
            for num, _, media, z in slide_items(pptx):
                if num == int(n):
                    ext = os.path.splitext(media[0])[1].lower().replace('.jpeg', '.jpg')
                    open(os.path.join(dst_dir, item['id'] + ext), 'wb').write(z.read(media[0]))
                    break
        else:
            ext = os.path.splitext(src)[1].lower().replace('.jpeg', '.jpg')
            shutil.copyfile(src, os.path.join(dst_dir, item['id'] + ext))
        print('ok', item['date'], item['id'])


# ── faces ──────────────────────────────────────────────────────────────
def detect(img):
    import cv2

    g = cv2.equalizeHist(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY))
    mn = int(min(g.shape) * 0.05)
    for name, n in (('haarcascade_frontalface_default.xml', 6), ('haarcascade_frontalface_alt2.xml', 4), ('haarcascade_frontalface_alt.xml', 3)):
        faces = cv2.CascadeClassifier(cv2.data.haarcascades + name).detectMultiScale(g, 1.05, n, minSize=(mn, mn))
        if len(faces):
            return [int(v) for v in max(faces, key=lambda f: f[2] * f[3])]
    return None


def crop_box(face, W, H, k=4.2):
    x, y, w, h = face
    ch = k * h
    cw = 0.8 * ch
    if ch > H:
        ch, cw = H, 0.8 * H
    if cw > W:
        cw, ch = W, W / 0.8
    left = min(max(0, x + w / 2 - cw / 2), W - cw)
    top = min(max(0, y - 0.85 * h * (ch / (k * h))), H - ch)
    return [round(left / W, 4), round(top / H, 4), round(cw / W, 4), round(ch / H, 4)]


def cmd_faces(staging, force):
    faces, crops = load_json(FACES), load_json(CROPS)
    failed = []
    for date in sorted(os.listdir(staging)):
        d = os.path.join(staging, date)
        if not os.path.isdir(d):
            continue
        for f in sorted(os.listdir(d)):
            if not f.lower().endswith(EXTS):
                continue
            key = f'{date}/{os.path.splitext(f)[0]}'
            if key in crops and not force:
                continue
            img = read_image(os.path.join(d, f))
            H, W = img.shape[:2]
            face = faces.get(key) if force and key in faces else detect(img)
            if not face:
                failed.append(key)
                continue
            faces[key] = face
            crops[key] = crop_box(face, W, H)
            print('ok', key, face)
    save_json(FACES, faces)
    save_json(CROPS, crops)
    if failed:
        print('\nSin cara (poner [x,y,w,h] a mano en baptism-faces.json y repetir con --force):')
        for k in failed:
            print('  ', k)


# ── detext ─────────────────────────────────────────────────────────────
def cmd_detext(path, rects):
    import cv2
    import numpy as np

    orig = path + '.orig.jpg'
    if not os.path.exists(orig):
        shutil.copyfile(path, orig)
    im = read_image(orig)
    h, w = im.shape[:2]
    g = cv2.cvtColor(im, cv2.COLOR_BGR2GRAY)
    mask = np.zeros_like(g)
    for r in rects:
        x0, y0, x1, y1 = [float(v) for v in r.split(',')]
        X0, Y0, X1, Y1 = int(x0 * w), int(y0 * h), int(x1 * w), int(y1 * h)
        roi = g[Y0:Y1, X0:X1]
        bg = cv2.medianBlur(roi, 61)
        # Letras (oscuras) y su halo (claro): todo lo que se separa del fondo…
        m = (cv2.absdiff(roi, bg) > 12).astype(np.uint8)
        # …menos lo grande (pelo, hombros): las letras son piezas pequeñas.
        n, lab, st, _ = cv2.connectedComponentsWithStats(m, 8)
        keep = np.zeros(n, bool)
        for i in range(1, n):
            keep[i] = st[i][3] < (Y1 - Y0) * 0.45 and st[i][2] < (X1 - X0) * 0.7
        mask[Y0:Y1, X0:X1] |= cv2.dilate(keep[lab].astype(np.uint8) * 255, np.ones((3, 3), np.uint8), 3)
    res = cv2.inpaint(im, mask, 9, cv2.INPAINT_TELEA)
    cv2.imencode('.jpg', res, [cv2.IMWRITE_JPEG_QUALITY, 97])[1].tofile(path)
    print('ok', path)


# ── sheet ──────────────────────────────────────────────────────────────
def cmd_sheet(folder, out, with_crops):
    from PIL import Image, ImageDraw, ImageOps

    crops = load_json(CROPS) if with_crops else {}
    files = []
    for dp, _, fs in os.walk(folder):
        files += [os.path.join(dp, f) for f in fs if f.lower().endswith(EXTS) and '.orig.' not in f]
    files.sort()
    W, H, cols = 170, 236, 10
    sheet = Image.new('RGB', (W * cols, H * ((len(files) + cols - 1) // cols)), 'white')
    for i, f in enumerate(files):
        im = ImageOps.exif_transpose(Image.open(f)).convert('RGB')
        key = f'{os.path.basename(os.path.dirname(f))}/{os.path.splitext(os.path.basename(f))[0]}'
        if key in crops:
            l, t, w, h = crops[key]
            im = im.crop((int(l * im.width), int(t * im.height), int((l + w) * im.width), int((t + h) * im.height)))
        im.thumbnail((W - 4, H - 22))
        x, y = (i % cols) * W, (i // cols) * H
        sheet.paste(im, (x, y))
        ImageDraw.Draw(sheet).text((x + 2, y + H - 20), f'{i} {os.path.basename(f)[:24]}', fill='black')
    sheet.save(out, quality=85)
    print(out, len(files))


if __name__ == '__main__':
    a = sys.argv[1:]
    if a[:1] == ['pptx'] and len(a) == 3:
        cmd_pptx(a[1], a[2])
    elif a[:1] == ['stage'] and len(a) == 3:
        cmd_stage(a[1], a[2])
    elif a[:1] == ['faces'] and len(a) >= 2:
        cmd_faces(a[1], '--force' in a)
    elif a[:1] == ['detext'] and len(a) >= 3:
        cmd_detext(a[1], a[2:])
    elif a[:1] == ['sheet'] and len(a) >= 3:
        cmd_sheet(a[1], a[2], '--crops' in a)
    else:
        print(__doc__)
        sys.exit(1)
