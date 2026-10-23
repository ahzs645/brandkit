"""Extract the outlined masthead from page 1 of OTE's September 2025 issue.

Usage: python scripts/import-overtheedge-cover.py /path/to/OTE-Issue-1-Sept-2025-.pdf
Requires PyMuPDF. The full issue and its photographs are not copied into the repository.
"""
import sys
from pathlib import Path
import fitz

page = fitz.open(sys.argv[1])[0]
area = fitz.Rect(36, 546, 304, 755)
drawings = [d for d in page.get_drawings() if area.contains(d['rect'])]
if len(drawings) != 33 or any(d['type'] != 'f' for d in drawings):
    raise ValueError('Expected the 33 filled masthead paths on the first page.')
box = fitz.Rect(drawings[0]['rect'])
for d in drawings[1:]:
    box |= d['rect']

def point(p):
    return f'{p.x-box.x0:.6f} {p.y-box.y0:.6f}'

def path(d):
    parts, previous = [], None
    for item in d['items']:
        kind, start, *rest = item
        if kind not in ('l', 'c'):
            raise ValueError(f'Unexpected masthead segment: {kind}')
        if previous != start:
            if previous is not None:
                parts.append('Z')
            parts.append('M'+point(start))
        parts.append(('L' if kind == 'l' else 'C')+' '.join(point(p) for p in rest))
        previous = rest[-1]
    parts.append('Z')
    rule = 'evenodd' if d['even_odd'] else 'nonzero'
    return f'    <path fill-rule="{rule}" d="{" ".join(parts)}"/>'

lines = [f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {box.width:.6f} {box.height:.6f}">',
         '  <title>Over the Edge — September 2025 cover masthead</title>']
for name, subset in [('over',drawings[:4]), ('the',drawings[4:7]), ('edge',drawings[7:11]), ('subtext',drawings[11:])]:
    lines.append(f'  <g data-name="{name}" fill="{"#262626" if name == "subtext" else "#155329"}">')
    lines.extend(path(d) for d in subset)
    lines.append('  </g>')
lines.append('</svg>')
target = Path(__file__).resolve().parents[1] / 'brands/overtheedge/reference/logo-cover-stacked.svg'
target.write_text('\n'.join(lines)+'\n')
print(f'{target}: {len(drawings)} paths, {box.width:.3f} × {box.height:.3f}')
