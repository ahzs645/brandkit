"""Bring ManualKit's rebuilt identity manuals into brandkit's BC manual pack.

ManualKit (a separate project) rebuilds historical British Columbia identity manuals page by page
as native vector drawings: live text in compatible open-licence faces, authored geometry, no
scanned underlay. This copies its rebuilt pages, and only those, into the site:

  * manuals/bc/pages/<book>/<id>.svg   each page, self-contained (its font subsets embedded)
  * manuals/bc/books.js                books and pages: titles, printed page numbers, notes

The reference scans and PDFs are not copied. Four pages of the 1982 policy memo carried cropped
pieces of the scan (two photographs, two handwritten signatures); those crops are replaced by a
labelled placeholder, so nothing on the site is a piece of the reference. Editor metadata
(data-* attributes other than data-role) is dropped.

Thumbnails are rendered separately from the copied pages: scripts/render-guide-thumbnails.mjs.

    python3 scripts/import_visual_guides.py /path/to/ManualKit-v2
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'manuals' / 'bc' / 'pages'
DATA = ROOT / 'manuals' / 'bc' / 'books.js'

# What each book is called here, and the prefix its page titles carry in ManualKit's catalogue.
BOOKS = {
    'general': {'title': 'General Manual', 'prefix': None},
    'reproduction': {'title': 'Reproduction Manual', 'prefix': None},
    'sign': {'title': 'Sign Manual', 'prefix': 'Sign Manual'},
    'vehicle': {'title': 'Vehicle Manual', 'prefix': 'Vehicle Manual'},
    'policy-1982': {'title': '1982 Policy Companion', 'prefix': 'B.C. Identity Program policy memo and guidelines'},
    'hydro': {'title': 'Graphic Standards Manual', 'prefix': 'Graphic Standards Manual'},
}

PLACEHOLDER = {
    'source-photograph': 'Photograph not reproduced',
    'source-signature-specimen': 'Signature not reproduced',
}


def no_em_dash(text):
    """The site's interface uses no em dashes: a dash between clauses becomes a colon or comma."""
    text = re.sub(r'\s*—\s*(?=[a-z])', ', ', text)
    return re.sub(r'\s*—\s*', ': ', text)


def page_title(book, raw):
    prefix = BOOKS[book]['prefix']
    title = raw
    if prefix:
        title = re.sub(rf'^{re.escape(prefix)}\s*[—-]\s*', '', title)
    if book == 'hydro':
        title = re.sub(r'^\d+:\s*', '', title)
    if book == 'policy-1982':
        title = re.sub(r'^scan (\d+)$', r'Page \1', title)
    title = re.sub(r'\s*—\s*', ': ', title)  # in a title the dash introduces a list
    return title[:1].upper() + title[1:]


def replace_crop(match):
    tag = match.group(0)
    role = re.search(r'data-role="([^"]+)"', tag).group(1)
    get = lambda name: float(re.search(rf'\b{name}="([^"]+)"', tag).group(1))
    x, y, w, h = get('x'), get('y'), get('width'), get('height')
    label = PLACEHOLDER[role]
    size = max(6.0, min(11.0, w / 14))
    return (
        f'<g data-role="omitted-{role}">'
        f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#f2f0ea" stroke="#b9b5aa" stroke-width="0.6" stroke-dasharray="3 2"/>'
        f'<text x="{x + w / 2}" y="{y + h / 2}" font-family="Helvetica, Arial, sans-serif" font-size="{size:.1f}" fill="#77736a" '
        f'text-anchor="middle" dominant-baseline="middle">{label}</text></g>'
    )


def clean_svg(svg):
    svg = re.sub(r'<image\b[^>]*data-role="(source-photograph|source-signature-specimen)"[^>]*/>', replace_crop, svg)
    if '<image' in svg:
        raise ValueError('a page still embeds an image after the source crops were replaced')
    svg = re.sub(r'\s+data-(?!role\b)[\w-]+="[^"]*"', '', svg)
    return svg


def clean_notes(notes, omitted):
    kept = [no_em_dash(n) for n in notes if not re.search(r'raster|specimen crop|source-media|photograph crop', n, re.I)]
    if omitted:
        kept.append('The original page’s ' + ' and '.join(omitted) + ' is not reproduced here; a placeholder marks where it was.')
    return kept


def main(manualkit):
    manualkit = Path(manualkit)
    catalogue = json.loads((manualkit / 'website' / 'dist' / 'catalogue.json').read_text())
    books = []
    for book in catalogue['books']:
        pages = [p for p in catalogue['pages'] if p['book'] == book['id']]
        (PUBLIC / book['id']).mkdir(parents=True, exist_ok=True)
        entries = []
        for page in pages:
            source = manualkit / 'project' / 'native' / 'svg' / f"{page['id']}.svg"
            raw = source.read_text(encoding='utf-8')
            roles = re.findall(r'<image\b[^>]*data-role="([^"]+)"', raw)
            omitted = sorted({'photograph' if r == 'source-photograph' else 'handwritten signature' for r in roles})
            svg = clean_svg(raw)
            (PUBLIC / book['id'] / f"{page['id']}.svg").write_text(svg, encoding='utf-8')
            view = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', svg)
            entries.append({
                'id': page['id'],
                'title': page_title(book['id'], page['title']),
                'printed': page.get('printed_page') or None,
                'width': float(view.group(1)),
                'height': float(view.group(2)),
                'notes': clean_notes(page.get('native_notes') or [], omitted),
            })
        books.append({
            'id': book['id'],
            'title': BOOKS[book['id']]['title'],
            'edition': no_em_dash(book.get('edition') or ''),
            'pages': entries,
        })
    DATA.parent.mkdir(parents=True, exist_ok=True)
    DATA.write_text(
        '// Generated by scripts/import_visual_guides.py from ManualKit\'s rebuilt pages. Do not edit by hand.\n'
        '// Titles and notes are ManualKit\'s, tidied: no book prefix, no em dashes.\n\n'
        f'export const GUIDE_BOOKS = {json.dumps(books, ensure_ascii=False, indent=1)}\n',
        encoding='utf-8',
    )
    total = sum(len(b['pages']) for b in books)
    size = sum(f.stat().st_size for f in PUBLIC.rglob('*.svg'))
    print(f'{len(books)} books, {total} pages, {size / 1e6:.1f} MB of pages')


if __name__ == '__main__':
    main(sys.argv[1])
