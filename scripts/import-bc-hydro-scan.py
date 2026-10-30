#!/usr/bin/env python3
"""Prepare original BC Hydro manual references, without altering the supplied PDF.

    python3 scripts/import-bc-hydro-scan.py /path/to/manual.pdf

Requires PyMuPDF and Pillow. The 48 pages are rendered at 144 dpi by default.
Named template references use the same source: full pages, or explicitly documented crops.
No crop is stretched to fit a different aspect ratio; a white canvas pads any small mismatch.
"""
import argparse
import hashlib
import json
from pathlib import Path

import fitz
from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parent.parent
FOLDER = ROOT / 'brands' / 'bc-hydro-1983' / 'reference'
EXPECTED_SHA = 'ca5e1bc22d8908d69b7f56e75ff84bbfbe7e7e2a4f45260d44bc7372ff775b18'


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def render(page, width):
    scale = width / page.rect.width
    pix = page.get_pixmap(matrix=fitz.Matrix(scale, scale), alpha=False)
    return Image.frombytes('RGB', (pix.width, pix.height), pix.samples)


def save_webp(image, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    pending = path.with_suffix(path.suffix + '.tmp')
    image.save(pending, 'WEBP', quality=88, method=6)
    pending.replace(path)
    return {'file': str(path.relative_to(FOLDER.parent)), 'width': image.width,
            'height': image.height, 'sha256': sha256(path), 'bytes': path.stat().st_size}


def crop_in_points(image, page, box):
    x, y, width, height = box
    sx, sy = image.width / page.rect.width, image.height / page.rect.height
    return image.crop((round(x * sx), round(y * sy), round((x + width) * sx), round((y + height) * sy)))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pdf', type=Path)
    parser.add_argument('--width', type=int, default=1224, help='Full-page pixel width; default 1224 (144 dpi).')
    args = parser.parse_args()
    if args.width < 612:
        raise SystemExit('Use a full-page width of at least 612 pixels so the source remains readable.')
    actual_sha = sha256(args.pdf)
    if actual_sha != EXPECTED_SHA:
        raise SystemExit(f'Source PDF differs from the audited edition: SHA-256 {actual_sha}. Review the new source and its crop coordinates before importing.')
    document = fitz.open(args.pdf)
    if len(document) != 48:
        raise SystemExit('Expected the audited 48-page manual.')
    pages, images = [], {}
    for index, page in enumerate(document):
        ident = f'H{index + 1:02}'
        image = render(page, args.width)
        images[index + 1] = image
        item = save_webp(image, FOLDER / 'manual' / f'{ident}.webp')
        item.update({'id': ident, 'pdfPage': index + 1, 'printedPage': index if index else None,
                     'pagePoints': [page.rect.width, page.rect.height],
                     'registration': 'Full PDF page; no deskew, rescaling within the page, or feature fitting.'})
        pages.append(item)

    references = []
    for name, page_number, template_id, note in [
        ('report-cover-source.webp', 26, 'cover-report', 'Full source page, including the original dimensional annotations.'),
        ('cover-illustrated-source.webp', 27, 'cover-illustrated', 'Full source page, including the original example artwork and scan artifacts.'),
        ('bulletin-source.webp', 20, 'form-bulletin', 'Full source page. The historical sample text is retained.'),
    ]:
        item = save_webp(images[page_number], FOLDER / name)
        item.update({'template': template_id, 'pdfPage': page_number, 'printedPage': page_number - 1,
                     'sourceCropPoints': [0, 0, 612, 792], 'fit': 'full-page', 'note': note})
        references.append(item)

    for name, page_number, template_id, crop, size, note in [
        ('display-cover-source.webp', 28, 'cover-display', [243.2, 78, 290.7, 649.4], [816, 1836],
         'Only the framed 4 × 9 inch cover is extracted. Surrounding manual text is excluded; annotations extending inside the frame remain. Uniform scaling with white padding preserves the scanned geometry.'),
        ('rail-card-source.webp', 18, 'card-rail', [245.5, 580.5, 254, 144.5], [1050, 600],
         'Only the rail business-card frame is extracted. Surrounding dimension labels are excluded. Uniform scaling with white padding preserves the scanned geometry.'),
    ]:
        cropped = crop_in_points(images[page_number], document[page_number - 1], crop)
        fitted = ImageOps.contain(cropped, size, Image.Resampling.LANCZOS)
        canvas = Image.new('RGB', size, 'white')
        origin = [(size[0] - fitted.width) // 2, (size[1] - fitted.height) // 2]
        canvas.paste(fitted, tuple(origin))
        item = save_webp(canvas, FOLDER / name)
        item.update({'template': template_id, 'pdfPage': page_number, 'printedPage': page_number - 1,
                     'sourceCropPoints': crop, 'fit': 'contain', 'paddingPixels': origin,
                     'fittedPixels': [fitted.width, fitted.height], 'note': note})
        references.append(item)

    # The manual combines a letterhead header, an envelope and a card on one page. Only the
    # first 116 pt belong to this letterhead comparison. Keep its original page position and
    # replace the rest with blank paper; do not imply the remainder is a source letterhead.
    header_crop = [0, 0, 612, 116]
    original = images[18]
    canvas = Image.new('RGB', original.size, 'white')
    canvas.paste(crop_in_points(original, document[17], header_crop), (0, 0))
    item = save_webp(canvas, FOLDER / 'rail-letterhead-source.webp')
    item.update({'template': 'letterhead-rail', 'pdfPage': 18, 'printedPage': 17,
                 'sourceCropPoints': header_crop, 'fit': 'header-only-at-original-position',
                 'note': 'Header-only reference: the top 116 pt of PDF page 18 is retained at its original position on a white Letter canvas. The envelope and business card beneath it are deliberately excluded; the blank lower area is not source evidence.'})
    references.append(item)

    manifest = {
        'schema': 'brandkit/bc-hydro-source-references/1',
        'source': {'filename': args.pdf.name, 'sha256': actual_sha, 'pdfPages': len(document),
                   'printedPages': 'Cover, 1–47', 'edition': 'June 1983'},
        'rendering': {'fullPageWidth': args.width, 'dpi': args.width / 8.5, 'format': 'WebP',
                      'quality': 88, 'colour': 'RGB', 'script': 'scripts/import-bc-hydro-scan.py'},
        'limits': ['Reference images retain scan skew, paper texture and reproduction variation.',
                   'Written dimensions take precedence over a nominal full-page image overlay.',
                   'These are source references, not replacement vector artwork or production printing masters.'],
        'pages': pages, 'templateReferences': references,
    }
    for entry in pages + references:
        if sha256(FOLDER.parent / entry['file']) != entry['sha256']:
            raise SystemExit(f"Reference changed during import: {entry['file']}")
    pending_manifest = FOLDER / 'manual-source.json.tmp'
    pending_manifest.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    pending_manifest.replace(FOLDER / 'manual-source.json')
    print(json.dumps({'pages': len(pages), 'templateReferences': len(references),
                      'referenceBytes': sum(p['bytes'] for p in pages + references),
                      'manifest': str((FOLDER / 'manual-source.json').relative_to(ROOT))}))


if __name__ == '__main__':
    main()
